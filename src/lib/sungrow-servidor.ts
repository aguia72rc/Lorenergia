/**
 * Sungrow iSolarCloud — parte do SERVIDOR (rede, tokens e cache).
 * Usa a chave de serviço do Supabase: nunca importe em componentes de cliente.
 *
 * Variáveis de ambiente (Vercel):
 *   SUNGROW_APPKEY      AppKey do aplicativo no portal de desenvolvedor
 *   SUNGROW_SECRET_KEY  Secret Key (vai no cabeçalho x-access-key)
 *   SUNGROW_APP_ID      Application Id (número do applicationId=)
 *   SUNGROW_SERVER      opcional: international (padrão), europe, china, australia, india
 *   SUNGROW_REDIRECT_URI opcional: padrão {SITE_URL}/api/sungrow/callback
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site";
import { dataNoRecife, hojeISO } from "@/lib/format";
import {
  CAMINHOS,
  PONTOS,
  PONTOS_TEMPO_REAL,
  erroDaResposta,
  erroDeAutorizacao,
  geracaoDoMes,
  interpretarCurva,
  interpretarTempoReal,
  interpretarToken,
  interpretarUsinas,
  janelasDoDia,
  servidorSungrow,
  statusUsina,
  type CodigoStatus,
  type PontoCurva,
  type TokenSungrow,
} from "@/lib/sungrow";

/** iSolarCloud atualiza os dados a cada 5 minutos: não adianta consultar antes. */
const CACHE_MS = 5 * 60 * 1000;
const CURVA_MS = 15 * 60 * 1000;
const TIMEOUT_MS = 8000;

export class ErroSungrow extends Error {
  constructor(message: string, public autorizacao = false) {
    super(message);
  }
}

function config() {
  const appKey = process.env.SUNGROW_APPKEY?.trim() ?? "";
  const secretKey = process.env.SUNGROW_SECRET_KEY?.trim() ?? "";
  const appId = process.env.SUNGROW_APP_ID?.trim() ?? "";
  return { appKey, secretKey, appId, servidor: servidorSungrow(process.env.SUNGROW_SERVER), ok: !!(appKey && secretKey && appId) };
}

export function sungrowConfigurado(): boolean {
  return config().ok;
}

export function sungrowRedirectUri(): string {
  return process.env.SUNGROW_REDIRECT_URI?.trim() || `${SITE_URL}/api/sungrow/callback`;
}

export function sungrowServidor() {
  return config().servidor;
}

export function sungrowAppId() {
  return config().appId;
}

async function postar(caminho: string, corpo: Record<string, unknown>, token?: string): Promise<unknown> {
  const c = config();
  if (!c.ok) throw new ErroSungrow("Integração Sungrow não configurada.");
  let res: Response;
  try {
    res = await fetch(`${c.servidor.api}${caminho}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-access-key": c.secretKey,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ...corpo, appkey: c.appKey, lang: "_pt_BR" }),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new ErroSungrow("Não foi possível falar com a Sungrow agora. Tente novamente em alguns minutos.");
  }
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // corpo vazio ou não-JSON
  }
  if (res.status === 401) throw new ErroSungrow("A Sungrow recusou o acesso. Reconecte a conta.", true);
  if (!res.ok) throw new ErroSungrow(`A Sungrow respondeu com erro (HTTP ${res.status}).`);
  return json;
}

async function chamarApi(caminho: string, corpo: Record<string, unknown>, token: string) {
  const json = await postar(caminho, corpo, token);
  const erro = erroDaResposta(json);
  if (erro) throw new ErroSungrow(`Sungrow: ${erro}`, erroDeAutorizacao(erro));
  return (json as { result_data: unknown }).result_data;
}

type Db = ReturnType<typeof createAdminClient>;

async function salvarToken(db: Db, t: TokenSungrow, autor?: string | null) {
  const linha: Record<string, unknown> = {
    id: 1,
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    expira_em: t.expira_em,
    atualizado_em: new Date().toISOString(),
  };
  if (autor !== undefined) {
    linha.conectado_em = new Date().toISOString();
    linha.conectado_por = autor;
  }
  const { error } = await db.from("sungrow_conexao").upsert(linha);
  if (error) throw new ErroSungrow("Não foi possível guardar a autorização. A migração 0034 foi rodada?");
}

/** Troca o código da volta do OAuth por tokens e guarda. */
export async function conectarComCodigo(code: string, autor: string | null) {
  const json = await postar(CAMINHOS.token, { code, grant_type: "authorization_code", redirect_uri: sungrowRedirectUri() });
  const t = interpretarToken(json, Date.now());
  if (!t) throw new ErroSungrow(`A Sungrow não autorizou: ${erroDaResposta(json) ?? "sem token na resposta"}`);
  const db = createAdminClient();
  await salvarToken(db, t, autor);
  // Força uma leitura na próxima visita.
  await db.from("usinas").update({ lido_em: new Date(0).toISOString() }).neq("ps_id", "");
}

export async function desconectarSungrow() {
  const db = createAdminClient();
  await db.from("sungrow_conexao").delete().eq("id", 1);
}

/** Token válido (renova quando falta pouco para expirar). null = não conectado. */
async function tokenValido(db: Db): Promise<string | null> {
  const { data, error } = await db.from("sungrow_conexao").select("access_token, refresh_token, expira_em").eq("id", 1).maybeSingle();
  if (error || !data) return null;
  if (Date.parse(data.expira_em as string) - Date.now() > 2 * 60 * 1000) return data.access_token as string;
  if (!data.refresh_token) throw new ErroSungrow("A autorização da Sungrow expirou. Reconecte a conta.", true);
  const json = await postar(CAMINHOS.renovar, { refresh_token: data.refresh_token });
  const t = interpretarToken(json, Date.now());
  if (!t) throw new ErroSungrow("A autorização da Sungrow expirou. Reconecte a conta.", true);
  if (!t.refresh_token) t.refresh_token = data.refresh_token as string;
  await salvarToken(db, t);
  return t.access_token;
}

export interface UsinaPainel {
  psId: string;
  nome: string;
  capacidadeKwp: number | null;
  potenciaW: number | null;
  hojeKwh: number | null;
  totalKwh: number | null;
  mesKwh: number;
  mesDesde: string | null;
  status: { codigo: CodigoStatus; rotulo: string };
  curva: PontoCurva[];
  lidoEm: string;
  dados: unknown;
}

export interface EstadoSungrow {
  configurado: boolean;
  conectado: boolean;
  usinas: UsinaPainel[];
  erro: string | null;
  /** O erro pede para reconectar a conta. */
  reconectar: boolean;
  lidoEm: string | null;
  totais: { potenciaW: number; hojeKwh: number; mesKwh: number; totalKwh: number; capacidadeKwp: number };
}

interface LinhaUsina {
  ps_id: string;
  nome: string;
  capacidade_kwp: number | null;
  potencia_w: number | null;
  geracao_hoje_kwh: number | null;
  geracao_total_kwh: number | null;
  online: boolean | null;
  falha: string | null;
  curva_hoje: PontoCurva[] | null;
  curva_lida_em: string | null;
  dados: unknown;
  lido_em: string;
}

async function buscarCurva(token: string, psId: string): Promise<PontoCurva[]> {
  // Janelas de 3 horas em paralelo (a API limita o período de cada consulta).
  const partes = await Promise.all(
    janelasDoDia(new Date()).map(async (j) =>
      interpretarCurva(
        await chamarApi(
          CAMINHOS.minutos,
          {
            ps_id_list: [psId],
            points: `p${PONTOS.potencia[0]}`,
            start_time_stamp: j.inicio,
            end_time_stamp: j.fim,
            minute_interval: "15",
            is_get_point_dict: "1",
          },
          token
        ),
        psId
      )
    )
  );
  const pontos = partes.flat().sort((a, b) => a.hora.localeCompare(b.hora));
  return pontos.filter((p, i) => i === 0 || p.hora !== pontos[i - 1].hora);
}

/** Consulta a Sungrow e grava o resultado (usinas + geração do dia). */
async function atualizarDaApi(db: Db, token: string, anteriores: LinhaUsina[]) {
  const usinas = interpretarUsinas(await chamarApi(CAMINHOS.usinas, { page: 1, size: 100 }, token)).slice(0, 20);
  if (usinas.length === 0) throw new ErroSungrow("Nenhuma usina autorizada na conta. Reconecte e marque a usina na página da iSolarCloud.");
  const tempoReal = interpretarTempoReal(
    await chamarApi(CAMINHOS.tempoReal, { ps_id_list: usinas.map((u) => u.psId), point_id_list: PONTOS_TEMPO_REAL, is_get_point_dict: "1" }, token)
  );

  const agora = new Date().toISOString();
  const hoje = hojeISO();
  const linhas: LinhaUsina[] = [];
  for (const u of usinas) {
    const r = tempoReal[u.psId] ?? { potenciaW: null, hojeKwh: null, totalKwh: null };
    const anterior = anteriores.find((a) => a.ps_id === u.psId);
    // Curva do dia: a cada 15 minutos; se falhar, mantém a anterior (do mesmo dia).
    let curva = anterior?.curva_lida_em && dataNoRecife(new Date(anterior.curva_lida_em)) === hoje ? anterior.curva_hoje : null;
    let curvaLida = curva ? anterior!.curva_lida_em : null;
    if (!curvaLida || Date.now() - Date.parse(curvaLida) > CURVA_MS) {
      try {
        curva = await buscarCurva(token, u.psId);
        curvaLida = agora;
      } catch {
        // gráfico é opcional
      }
    }
    linhas.push({
      ps_id: u.psId,
      nome: u.nome,
      capacidade_kwp: u.capacidadeKwp,
      potencia_w: r.potenciaW,
      geracao_hoje_kwh: r.hojeKwh,
      geracao_total_kwh: r.totalKwh,
      online: u.online,
      falha: u.falha,
      curva_hoje: curva ?? null,
      curva_lida_em: curvaLida,
      dados: { usina: u, tempo_real: r },
      lido_em: agora,
    });
  }

  const { error } = await db.from("usinas").upsert(linhas);
  if (error) throw new ErroSungrow("Não foi possível gravar as usinas. A migração 0034 foi rodada?");
  const dias = linhas
    .filter((l) => l.geracao_hoje_kwh !== null)
    .map((l) => ({ ps_id: l.ps_id, dia: hoje, geracao_kwh: l.geracao_hoje_kwh, total_kwh: l.geracao_total_kwh, atualizado_em: agora }));
  if (dias.length) await db.from("usina_geracao_diaria").upsert(dias);
  return linhas;
}

const vazio = (parcial: Partial<EstadoSungrow>): EstadoSungrow => ({
  configurado: sungrowConfigurado(),
  conectado: false,
  usinas: [],
  erro: null,
  reconectar: false,
  lidoEm: null,
  totais: { potenciaW: 0, hojeKwh: 0, mesKwh: 0, totalKwh: 0, capacidadeKwp: 0 },
  ...parcial,
});

/**
 * Estado das usinas para as telas. Usa o que está gravado se tiver menos de
 * 5 minutos; senão consulta a Sungrow. Nunca lança: erros vêm em `erro`.
 */
export async function lerUsinas(opcoes: { forcar?: boolean } = {}): Promise<EstadoSungrow> {
  if (!sungrowConfigurado()) return vazio({});
  let db: Db;
  try {
    db = createAdminClient();
  } catch {
    return vazio({ erro: "Supabase indisponível." });
  }

  const { data: conexao, error: erroConexao } = await db.from("sungrow_conexao").select("id").eq("id", 1).maybeSingle();
  if (erroConexao) return vazio({ erro: "Rode a migração 0034 (Sungrow) no Supabase." });
  if (!conexao) return vazio({});

  const { data: gravadas } = await db.from("usinas").select("*").order("nome");
  let linhas = (gravadas ?? []) as LinhaUsina[];
  let erro: string | null = null;
  let reconectar = false;

  const maisRecente = linhas.reduce((m, l) => Math.max(m, Date.parse(l.lido_em) || 0), 0);
  if (opcoes.forcar || linhas.length === 0 || Date.now() - maisRecente > CACHE_MS) {
    try {
      const token = await tokenValido(db);
      if (!token) return vazio({});
      linhas = await atualizarDaApi(db, token, linhas);
    } catch (e) {
      erro = e instanceof Error ? e.message : "Erro ao consultar a Sungrow.";
      reconectar = e instanceof ErroSungrow && e.autorizacao;
    }
  }

  const mes = hojeISO().slice(0, 7);
  const { data: diasMes } = await db.from("usina_geracao_diaria").select("ps_id, dia, geracao_kwh").gte("dia", `${mes}-01`);
  const hoje = hojeISO();
  const agoraMs = Date.now();

  const usinas: UsinaPainel[] = linhas.map((l) => {
    const m = geracaoDoMes((diasMes ?? []).filter((d) => d.ps_id === l.ps_id) as { dia: string; geracao_kwh: number }[], hoje);
    const lidaHoje = dataNoRecife(new Date(l.lido_em)) === hoje;
    return {
      psId: l.ps_id,
      nome: l.nome,
      capacidadeKwp: l.capacidade_kwp === null ? null : Number(l.capacidade_kwp),
      potenciaW: l.potencia_w === null ? null : Number(l.potencia_w),
      hojeKwh: lidaHoje && l.geracao_hoje_kwh !== null ? Number(l.geracao_hoje_kwh) : lidaHoje ? null : 0,
      totalKwh: l.geracao_total_kwh === null ? null : Number(l.geracao_total_kwh),
      mesKwh: m.totalKwh,
      mesDesde: m.desde,
      status: statusUsina({ online: l.online, falha: l.falha, potenciaW: l.potencia_w === null ? null : Number(l.potencia_w), lidoEm: l.lido_em }, agoraMs),
      curva: l.curva_lida_em && dataNoRecife(new Date(l.curva_lida_em)) === hoje ? l.curva_hoje ?? [] : [],
      lidoEm: l.lido_em,
      dados: l.dados,
    };
  });

  const soma = (f: (u: UsinaPainel) => number | null) => usinas.reduce((s, u) => s + (f(u) ?? 0), 0);
  return vazio({
    conectado: true,
    usinas,
    erro,
    reconectar,
    lidoEm: usinas.length ? new Date(usinas.reduce((m, u) => Math.max(m, Date.parse(u.lidoEm) || 0), 0)).toISOString() : null,
    totais: {
      potenciaW: soma((u) => u.potenciaW),
      hojeKwh: soma((u) => u.hojeKwh),
      mesKwh: soma((u) => u.mesKwh),
      totalKwh: soma((u) => u.totalKwh),
      capacidadeKwp: soma((u) => u.capacidadeKwp),
    },
  });
}
