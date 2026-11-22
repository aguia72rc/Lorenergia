/**
 * Sungrow iSolarCloud (Open API oficial) — funções puras, sem rede.
 *
 * A autorização é OAuth 2.0: o admin entra na página da própria iSolarCloud e
 * autoriza o aplicativo da Lorenergia; a senha da conta nunca passa por aqui.
 * Endereços, caminhos e pontos de medição seguem a biblioteca aberta
 * pysolarcloud (MIT), que usa a mesma API oficial.
 */

export type NomeServidor = "international" | "europe" | "china" | "australia" | "india";

export interface ServidorSungrow {
  nome: NomeServidor;
  /** Gateway da API (todas as chamadas são POST JSON). */
  api: string;
  /** Página de login/autorização (aplicação de página única). */
  web: string;
  cloudId: number;
}

export const SERVIDORES: Record<NomeServidor, ServidorSungrow> = {
  international: { nome: "international", api: "https://gateway.isolarcloud.com.hk", web: "https://web3.isolarcloud.com.hk", cloudId: 2 },
  europe: { nome: "europe", api: "https://gateway.isolarcloud.eu", web: "https://web3.isolarcloud.eu", cloudId: 3 },
  china: { nome: "china", api: "https://gateway.isolarcloud.com", web: "https://web3.isolarcloud.com", cloudId: 1 },
  australia: { nome: "australia", api: "https://augateway.isolarcloud.com", web: "https://auweb3.isolarcloud.com", cloudId: 7 },
  india: { nome: "india", api: "https://gateway.isolarcloud.in", web: "https://web3.isolarcloud.in", cloudId: 9 },
};

/** Servidor pelo nome (variável SUNGROW_SERVER). Contas do Brasil ficam no "international". */
export function servidorSungrow(nome?: string | null): ServidorSungrow {
  const n = (nome ?? "").trim().toLowerCase();
  const apelidos: Record<string, NomeServidor> = { eu: "europe", hk: "international", intl: "international", br: "international", au: "australia", cn: "china", in: "india" };
  const chave = (n in SERVIDORES ? n : apelidos[n]) as NomeServidor | undefined;
  return SERVIDORES[chave ?? "international"];
}

export const CAMINHOS = {
  token: "/openapi/apiManage/token",
  renovar: "/openapi/apiManage/refreshToken",
  usinas: "/openapi/platform/queryPowerStationList",
  tempoReal: "/openapi/platform/getPowerStationRealTimeData",
  minutos: "/openapi/platform/getPowerStationPointMinuteDataList",
} as const;

/** Pontos de medição da usina (ids da Sungrow). */
export const PONTOS = {
  potencia: ["83033", "83067", "83002"], // W — o primeiro presente vale
  hoje: ["83022", "83009"], // Wh
  total: ["83024", "83004"], // Wh
} as const;
export const PONTOS_TEMPO_REAL = [...new Set([...PONTOS.potencia, ...PONTOS.hoje, ...PONTOS.total])];

/** Endereço de retorno cadastrado no aplicativo da Sungrow (produção). */
export const REDIRECT_PADRAO = "https://lorenergia.com.br/api/sungrow/callback";

/**
 * Endereço de autorização, no mesmo formato do link que o portal da Sungrow
 * mostra (redirectUrl sem codificação). A página é uma SPA: o `state` vai na
 * query ANTES do `#`; app, nuvem e endereço de retorno vão no fragmento.
 */
export function urlAutorizacao(s: ServidorSungrow, appId: string, redirectUri: string, state: string): string {
  // Só codifica se o endereço tiver caracteres que quebrariam o fragmento.
  const retorno = /[&#?\s]/.test(redirectUri) ? encodeURIComponent(redirectUri) : redirectUri;
  return (
    `${s.web}/?state=${encodeURIComponent(state)}#/authorized-app?cloudId=${s.cloudId}` +
    `&applicationId=${encodeURIComponent(appId)}&redirectUrl=${retorno}`
  );
}

export interface TokenSungrow {
  access_token: string;
  refresh_token: string | null;
  /** ISO; já com folga de 1 minuto. */
  expira_em: string;
}

type Obj = Record<string, unknown>;
const ehObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const texto = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);

/** Resposta do token (no topo ou em `result_data`) → token, ou null se não veio. */
export function interpretarToken(data: unknown, agoraMs: number): TokenSungrow | null {
  if (!ehObj(data)) return null;
  const fonte = texto(data.access_token) ? data : ehObj(data.result_data) ? data.result_data : null;
  if (!fonte) return null;
  const access = texto(fonte.access_token);
  if (!access) return null;
  const segundos = Number(fonte.expires_in);
  const vida = Number.isFinite(segundos) && segundos > 0 ? segundos * 1000 : 60 * 60 * 1000;
  return {
    access_token: access,
    refresh_token: texto(fonte.refresh_token),
    expira_em: new Date(agoraMs + Math.max(vida - 60_000, 30_000)).toISOString(),
  };
}

/** Mensagem de erro da resposta da API, ou null quando deu certo (result_code "1"). */
export function erroDaResposta(data: unknown): string | null {
  if (!ehObj(data)) return "Resposta vazia da Sungrow.";
  const codigo = data.result_code;
  if ((codigo === "1" || codigo === 1) && data.error === undefined) return null;
  const partes = [data.result_msg, data.error_description, data.error, codigo]
    .filter((v) => typeof v === "string" || typeof v === "number")
    .map((v) => String(v).slice(0, 200));
  return partes.length ? [...new Set(partes)].join(" · ") : "Erro desconhecido da Sungrow.";
}

/** Token recusado/expirado? (pede para reconectar). */
export function erroDeAutorizacao(msg: string | null): boolean {
  return !!msg && /token|unauthori[sz]ed|invalid_grant|expired|er_token|authoriz/i.test(msg);
}

const numero = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "" || v === "--") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

/** Energia → kWh, conforme a unidade informada (Wh quando não vem). */
export function paraKwh(valor: unknown, unidade?: string | null): number | null {
  const n = numero(valor);
  if (n === null) return null;
  const u = (unidade ?? "Wh").trim().toLowerCase();
  if (u === "kwh") return n;
  if (u === "mwh") return n * 1000;
  if (u === "gwh") return n * 1_000_000;
  return n / 1000;
}

/** Potência → W, conforme a unidade (W quando não vem). */
export function paraW(valor: unknown, unidade?: string | null): number | null {
  const n = numero(valor);
  if (n === null) return null;
  const u = (unidade ?? "W").trim().toLowerCase();
  if (u === "kw") return n * 1000;
  if (u === "mw") return n * 1_000_000;
  return n;
}

/** Unidades por ponto, a partir de `point_dict`. */
function unidades(resultData: Obj): Map<string, string> {
  const m = new Map<string, string>();
  const lista = Array.isArray(resultData.point_dict) ? resultData.point_dict : [];
  for (const p of lista) {
    if (ehObj(p) && p.point_id !== undefined) {
      const u = texto(p.point_unit);
      if (u) m.set(String(p.point_id), u);
    }
  }
  return m;
}

function primeiro(item: Obj, ids: readonly string[], conv: (v: unknown, u?: string | null) => number | null, u: Map<string, string>) {
  for (const id of ids) {
    const v = conv(item[`p${id}`], u.get(id));
    if (v !== null) return v;
  }
  return null;
}

export interface LeituraTempoReal {
  potenciaW: number | null;
  hojeKwh: number | null;
  totalKwh: number | null;
}

/** `result_data` de getPowerStationRealTimeData → leitura por ps_id. */
export function interpretarTempoReal(resultData: unknown): Record<string, LeituraTempoReal> {
  const saida: Record<string, LeituraTempoReal> = {};
  if (!ehObj(resultData)) return saida;
  const u = unidades(resultData);
  const lista = Array.isArray(resultData.device_point_list) ? resultData.device_point_list : [];
  for (const bruto of lista) {
    const item = ehObj(bruto) && ehObj(bruto.device_point) ? bruto.device_point : bruto;
    if (!ehObj(item) || item.ps_id === undefined || item.ps_id === null) continue;
    saida[String(item.ps_id)] = {
      potenciaW: primeiro(item, PONTOS.potencia, paraW, u),
      hojeKwh: primeiro(item, PONTOS.hoje, paraKwh, u),
      totalKwh: primeiro(item, PONTOS.total, paraKwh, u),
    };
  }
  return saida;
}

export interface UsinaSungrow {
  psId: string;
  nome: string;
  capacidadeKwp: number | null;
  /** true online, false offline, null sem informação. */
  online: boolean | null;
  falha: "falha" | "alarme" | null;
}

/** Capacidade instalada em kWp, aceitando {value, unit} ou número. */
function capacidade(v: unknown): number | null {
  if (ehObj(v)) {
    const n = numero(v.value);
    if (n === null) return null;
    const u = (texto(v.unit) ?? "kWp").toLowerCase();
    if (u.startsWith("mw")) return n * 1000;
    if (u === "w" || u === "wp") return n / 1000;
    return n;
  }
  return numero(v);
}

/** `result_data` de queryPowerStationList → usinas. */
export function interpretarUsinas(resultData: unknown): UsinaSungrow[] {
  if (!ehObj(resultData)) return [];
  const lista = Array.isArray(resultData.pageList) ? resultData.pageList : [];
  const usinas: UsinaSungrow[] = [];
  for (const p of lista) {
    if (!ehObj(p) || p.ps_id === undefined || p.ps_id === null) continue;
    const online = numero(p.online_status);
    const falha = numero(p.ps_fault_status);
    usinas.push({
      psId: String(p.ps_id),
      nome: texto(p.ps_name) ?? `Usina ${p.ps_id}`,
      capacidadeKwp: capacidade(p.total_capcity ?? p.total_capacity ?? p.design_capacity),
      online: online === null ? null : online !== 0,
      falha: falha === 1 ? "falha" : falha === 2 ? "alarme" : null,
    });
  }
  return usinas;
}

export type CodigoStatus = "gerando" | "sem_sol" | "offline" | "falha" | "alarme" | "desatualizada";

/** Status para exibir (falha e comunicação têm prioridade sobre a potência). */
export function statusUsina(
  u: { online: boolean | null; falha: string | null; potenciaW: number | null; lidoEm: string | null },
  agoraMs: number
): { codigo: CodigoStatus; rotulo: string } {
  if (u.falha === "falha") return { codigo: "falha", rotulo: "Com falha" };
  if (u.online === false) return { codigo: "offline", rotulo: "Sem comunicação" };
  if (u.falha === "alarme") return { codigo: "alarme", rotulo: "Com alarme" };
  if (u.lidoEm && agoraMs - Date.parse(u.lidoEm) > 2 * 60 * 60 * 1000) return { codigo: "desatualizada", rotulo: "Sem dados recentes" };
  if ((u.potenciaW ?? 0) >= 10) return { codigo: "gerando", rotulo: "Gerando" };
  return { codigo: "sem_sol", rotulo: "Sem geração agora" };
}

export interface PontoCurva {
  /** "HH:MM" no horário da usina. */
  hora: string;
  kw: number;
}

/**
 * `result_data` de getPowerStationPointMinuteDataList → curva de potência de
 * uma usina. Formato: { "<ps_id>": [{ time_stamp: "yyyyMMddHHmmss", p83033: "…" }], point_dict }.
 */
export function interpretarCurva(resultData: unknown, psId: string, ponto: string = PONTOS.potencia[0]): PontoCurva[] {
  if (!ehObj(resultData)) return [];
  const u = unidades(resultData).get(ponto);
  const quadros = resultData[psId];
  if (!Array.isArray(quadros)) return [];
  const pontos: PontoCurva[] = [];
  for (const q of quadros) {
    if (!ehObj(q)) continue;
    const ts = texto(q.time_stamp);
    const w = paraW(q[`p${ponto}`], u);
    if (!ts || ts.length < 12 || w === null) continue;
    pontos.push({ hora: `${ts.slice(8, 10)}:${ts.slice(10, 12)}`, kw: Math.max(0, w / 1000) });
  }
  pontos.sort((a, b) => a.hora.localeCompare(b.hora));
  // Remove horários repetidos (janelas que se sobrepõem).
  return pontos.filter((p, i) => i === 0 || p.hora !== pontos[i - 1].hora);
}

/** Data/hora no fuso do Recife no formato da Sungrow (yyyyMMddHHmmss). */
export function carimboRecife(instante: Date): string {
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Recife", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(instante);
  const p = (t: string) => partes.find((x) => x.type === t)?.value ?? "00";
  return `${p("year")}${p("month")}${p("day")}${p("hour")}${p("minute")}${p("second")}`;
}

/**
 * Janelas de até 3 horas, das 5h até agora (horário do Recife), para buscar a
 * curva do dia sem esbarrar no limite de período da API.
 */
export function janelasDoDia(agora: Date, inicioHora = 5, horasPorJanela = 3): { inicio: string; fim: string }[] {
  const agoraTs = carimboRecife(agora);
  const dia = agoraTs.slice(0, 8);
  const horaAgora = Number(agoraTs.slice(8, 10));
  const janelas: { inicio: string; fim: string }[] = [];
  for (let h = inicioHora; h <= horaAgora && h < 24; h += horasPorJanela) {
    const fimH = Math.min(h + horasPorJanela, 24);
    const inicio = `${dia}${String(h).padStart(2, "0")}0000`;
    const fimJanela = fimH >= 24 ? `${dia}235959` : `${dia}${String(fimH).padStart(2, "0")}0000`;
    janelas.push({ inicio, fim: fimJanela < agoraTs ? fimJanela : agoraTs });
  }
  return janelas;
}

/** Geração do mês somando os dias gravados; informa desde quando há dados. */
export function geracaoDoMes(dias: { dia: string; geracao_kwh: number | string | null }[], mesISO: string) {
  const doMes = dias.filter((d) => d.dia.startsWith(mesISO.slice(0, 7)));
  const total = doMes.reduce((s, d) => s + (Number(d.geracao_kwh) || 0), 0);
  const primeiroDia = doMes.map((d) => d.dia).sort()[0] ?? null;
  return { totalKwh: total, desde: primeiroDia && !primeiroDia.endsWith("-01") ? primeiroDia : null };
}
