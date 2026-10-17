"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { calcularFaturaDetalhada, consumoDeLeituras, valorTusdGd2, distribuirTusdGd2, tarifaGd2Valida, MSG_TARIFA_GD2, type ModoGd2 } from "@/lib/calc";
import type { ResultadoCalculoDetalhado } from "@/lib/calc";
import type { StatusFatura, ModalidadeBeneficio } from "@/lib/types";

/**
 * Ajusta os valores monetários conforme a modalidade do morador.
 *   - desconto: o benefício é abatido na fatura (comportamento padrão).
 *   - cashback: a fatura sai cheia e o mesmo valor vira saldo de cashback.
 */
interface ValoresModalidade {
  valor_bruto: number;
  valor_desconto: number;
  valor_liquido: number;
  economia: number;
  modalidade_beneficio: ModalidadeBeneficio;
  cashback_valor: number;
  cashback_pago: boolean;
}

function aplicarModalidade(r: ResultadoCalculoDetalhado, modalidade: ModalidadeBeneficio): ValoresModalidade {
  if (modalidade === "cashback") {
    return {
      valor_bruto: r.valorBruto,
      valor_desconto: 0,
      valor_liquido: r.valorBruto, // paga cheia
      economia: 0, // não há economia imediata na fatura
      modalidade_beneficio: "cashback",
      cashback_valor: r.valorDesconto, // o que seria o desconto vira cashback
      cashback_pago: false,
    };
  }
  return {
    valor_bruto: r.valorBruto,
    valor_desconto: r.valorDesconto,
    valor_liquido: r.valorLiquido,
    economia: r.economia,
    modalidade_beneficio: "desconto",
    cashback_valor: 0,
    cashback_pago: false,
  };
}

async function exigirAdmin() {
  const sessao = await getSessao();
  if (sessao?.profile?.role !== "admin") {
    throw new Error("Acesso negado.");
  }
}

/** Normaliza a referência recebida ("YYYY-MM" ou "YYYY-MM-DD") para o 1º dia do mês. */
function normalizarReferencia(valor: string): string {
  const partes = valor.split("-");
  const ano = partes[0];
  const mes = (partes[1] ?? "01").padStart(2, "0");
  return `${ano}-${mes}-01`;
}

/**
 * Colunas "opcionais": existem só depois de certas migrações. Se o banco ainda
 * não as tem, gravamos sem elas (em vez de falhar) até a migração ser rodada.
 */
const COLUNAS_OPCIONAIS: { teste: RegExp; colunas: string[] }[] = [
  { teste: /tarifa_gd2/, colunas: ["tarifa_gd2"] }, // migração 0026
  { teste: /publicada/, colunas: ["publicada"] }, // migração 0025
  { teste: /modalidade_beneficio|cashback_valor|cashback_pago/, colunas: ["modalidade_beneficio", "cashback_valor", "cashback_pago"] }, // 0018
  { teste: /data_emissao/, colunas: ["data_emissao"] }, // 0007
];

function semColunas(registro: Record<string, unknown>, colunas: string[]): Record<string, unknown> {
  const copia = { ...registro };
  for (const c of colunas) delete copia[c];
  return copia;
}

/**
 * Faz o upsert das faturas (chave cliente+referência). Se o erro indicar uma
 * coluna opcional ausente, tenta de novo sem ela.
 */
async function gravarFaturas(
  supabase: Awaited<ReturnType<typeof createClient>>,
  registros: Record<string, unknown>[]
): Promise<{ ids: string[]; error: { message: string } | null }> {
  let atuais = registros;
  for (let tentativa = 0; tentativa <= COLUNAS_OPCIONAIS.length; tentativa++) {
    const { data, error } = await supabase
      .from("faturas")
      .upsert(atuais, { onConflict: "cliente_id,referencia" })
      .select("id");
    if (!error) return { ids: ((data ?? []) as { id: string }[]).map((x) => x.id), error: null };

    const grupo = COLUNAS_OPCIONAIS.find(
      (g) => g.teste.test(error.message ?? "") && g.colunas.some((c) => c in (atuais[0] ?? {}))
    );
    if (!grupo) return { ids: [], error };
    atuais = atuais.map((r) => semColunas(r, grupo.colunas));
  }
  return { ids: [], error: { message: "Não foi possível gravar a fatura." } };
}

/**
 * Faturas que já existem mantêm o estado de publicação (regerar/editar não
 * despublica nem publica sozinho). Só as NOVAS usam `publicarNovas`.
 * Retorna cliente_id -> publicada.
 */
async function publicacaoExistente(
  supabase: Awaited<ReturnType<typeof createClient>>,
  referencia: string,
  clienteIds: string[]
): Promise<Map<string, boolean>> {
  const mapa = new Map<string, boolean>();
  if (clienteIds.length === 0) return mapa;
  const { data, error } = await supabase
    .from("faturas")
    .select("cliente_id, publicada")
    .eq("referencia", referencia)
    .in("cliente_id", clienteIds);
  if (error) return mapa; // coluna ainda não existe (0025 não aplicada)
  for (const l of (data ?? []) as { cliente_id: string; publicada: boolean | null }[]) {
    mapa.set(l.cliente_id, l.publicada !== false);
  }
  return mapa;
}

/** Lê a modalidade de benefício de um morador (default: desconto). */
async function modalidadeDoCliente(
  supabase: Awaited<ReturnType<typeof createClient>>,
  clienteId: string
): Promise<ModalidadeBeneficio> {
  const { data } = await supabase.from("clientes").select("modalidade_beneficio").eq("id", clienteId).single();
  return (data?.modalidade_beneficio as ModalidadeBeneficio) === "cashback" ? "cashback" : "desconto";
}

export async function gerarFatura(formData: FormData) {
  await exigirAdmin();
  const supabase = await createClient();

  const cliente_id = String(formData.get("cliente_id") ?? "");
  const referenciaRaw = String(formData.get("referencia") ?? "");
  const leituraAnteriorRaw = String(formData.get("leitura_anterior") ?? "");
  const leituraAtualRaw = String(formData.get("leitura_atual") ?? "");
  const fator_multiplicador = Number(formData.get("fator_multiplicador") ?? 1) || 1;
  const tarifa_tusd = Number(formData.get("tarifa_tusd") ?? 0);
  const tarifa_te = Number(formData.get("tarifa_te") ?? 0);
  const adicional_bandeira = Number(formData.get("adicional_bandeira") ?? 0);
  // TUSD GD II proporcional ao consumo: o formulário envia a tarifa (R$/kWh).
  const tarifa_gd2 = Math.max(0, Number(formData.get("tarifa_gd2") ?? 0) || 0);
  if (!tarifaGd2Valida(tarifa_gd2)) throw new Error(MSG_TARIFA_GD2);
  const taxa_iluminacao = Number(formData.get("taxa_iluminacao") ?? 0);
  const multa_juros = Number(formData.get("multa_juros") ?? 0);
  const icms = Number(formData.get("icms") ?? 0);
  const pis = Number(formData.get("pis") ?? 0);
  const cofins = Number(formData.get("cofins") ?? 0);
  const desconto_percentual = Number(formData.get("desconto_percentual") ?? 0);
  const data_emissao = String(formData.get("data_emissao") ?? "") || new Date().toISOString().slice(0, 10);
  const vencimento = String(formData.get("vencimento") ?? "") || null;
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;
  const status = (String(formData.get("status") ?? "pendente") as StatusFatura);
  // Novas faturas nascem como rascunho quando o checkbox vem marcado.
  const publicarNovas = formData.get("rascunho") !== "on";

  if (!cliente_id) throw new Error("Selecione o morador.");
  if (!referenciaRaw) throw new Error("Informe o mês de referência.");

  const leitura_anterior = leituraAnteriorRaw === "" ? null : Number(leituraAnteriorRaw);
  const leitura_atual = leituraAtualRaw === "" ? null : Number(leituraAtualRaw);

  const consumo_kwh =
    leitura_atual !== null
      ? consumoDeLeituras(leitura_anterior, leitura_atual, fator_multiplicador)
      : Number(formData.get("consumo_kwh") ?? 0);

  const referencia = normalizarReferencia(referenciaRaw);
  // O formulário envia o valor da GD II mostrado na prévia (preserva o centavo exato
  // de um rateio ao editar); sem ele, calcula tarifa × consumo.
  const gd2Enviado = formData.get("taxa_energia_solar");
  const gd2Num = gd2Enviado === null || String(gd2Enviado).trim() === "" ? NaN : Number(gd2Enviado);
  const taxa_energia_solar = Number.isFinite(gd2Num) && gd2Num >= 0 ? Math.round(gd2Num * 100) / 100 : valorTusdGd2(consumo_kwh, tarifa_gd2);
  const r = calcularFaturaDetalhada({
    consumoKwh: consumo_kwh,
    tarifaTusd: tarifa_tusd,
    tarifaTe: tarifa_te,
    adicionalBandeira: adicional_bandeira,
    taxaEnergiaSolar: taxa_energia_solar,
    taxaIluminacao: taxa_iluminacao,
    multaJuros: multa_juros,
    descontoPercentual: desconto_percentual,
  });

  const modalidade = await modalidadeDoCliente(supabase, cliente_id);
  const valores = aplicarModalidade(r, modalidade);
  const jaPublicada = (await publicacaoExistente(supabase, referencia, [cliente_id])).get(cliente_id);

  const registro = {
    cliente_id,
    referencia,
    leitura_anterior,
    leitura_atual,
    fator_multiplicador,
    consumo_kwh,
    tarifa_kwh: tarifa_tusd + tarifa_te, // compatibilidade (tarifa total)
    tarifa_tusd,
    tarifa_te,
    adicional_bandeira,
    taxa_energia_solar,
    tarifa_gd2,
    taxa_iluminacao,
    multa_juros,
    icms,
    pis,
    cofins,
    desconto_percentual,
    ...valores,
    publicada: jaPublicada ?? publicarNovas,
    data_emissao,
    vencimento,
    status,
    observacoes,
  };

  // Regenerar a mesma referência sobrescreve os valores.
  const { ids, error } = await gravarFaturas(supabase, [registro]);
  if (error || ids.length === 0) throw new Error(error?.message ?? "Não foi possível gravar a fatura.");

  revalidatePath("/admin/faturas");
  revalidatePath("/admin");
  redirect(`/fatura/${ids[0]}`);
}

export async function atualizarStatusFatura(id: string, status: StatusFatura) {
  await exigirAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("faturas").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/faturas");
  revalidatePath("/admin");
}

export async function marcarWhatsappEnviado(id: string) {
  await exigirAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("faturas")
    .update({ whatsapp_enviado_em: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/faturas");
  revalidatePath("/admin/faturas/enviar");
}

export async function excluirFatura(id: string) {
  await exigirAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("faturas").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/faturas");
  revalidatePath("/admin");
}

export interface ItemLote {
  cliente_id: string;
  leitura_anterior: number | null;
  leitura_atual: number | null;
  desconto_percentual: number;
  /** Vencimento deste morador; se vazio, usa o vencimento geral do lote. */
  vencimento?: string | null;
}

export interface ParametrosLote {
  referencia: string; // YYYY-MM
  fator_multiplicador: number;
  tarifa_tusd: number;
  tarifa_te: number;
  adicional_bandeira: number;
  /**
   * TUSD GD II (Fio B). "total": `gd2_total` é o Fio B da conta (R$), rateado pelo consumo
   * de cada morador. "tarifa": `tarifa_gd2` (R$/kWh) × o consumo de cada um.
   */
  gd2_modo: ModoGd2;
  gd2_total: number;
  tarifa_gd2: number;
  taxa_iluminacao: number;
  /** Multa/juros (R$) e tributos informativos (R$): valem para todos os moradores do lote. */
  multa_juros?: number;
  icms?: number;
  pis?: number;
  cofins?: number;
  data_emissao: string | null;
  vencimento: string | null;
  status: StatusFatura;
  /** true = as faturas NOVAS nascem como rascunho (só o admin vê). */
  rascunho: boolean;
  itens: ItemLote[];
}

/**
 * Gera (ou atualiza) várias faturas do mês de uma só vez, a partir das
 * leituras anterior e atual de cada morador. Ignora linhas sem leitura atual.
 */
export async function gerarFaturasLote(
  params: ParametrosLote
): Promise<{ ok: boolean; geradas: number; mensagem: string }> {
  await exigirAdmin();
  const supabase = await createClient();

  if (!params.referencia) return { ok: false, geradas: 0, mensagem: "Informe o mês de referência." };

  const referencia = normalizarReferencia(params.referencia);
  const data_emissao = params.data_emissao || new Date().toISOString().slice(0, 10);

  const itensValidos = params.itens.filter(
    (it) => it.cliente_id && it.leitura_atual !== null && !Number.isNaN(it.leitura_atual)
  );

  // Modalidade (desconto/cashback) de cada morador envolvido no lote.
  const { data: clientesMod } = await supabase
    .from("clientes")
    .select("id, modalidade_beneficio")
    .in("id", itensValidos.map((it) => it.cliente_id));
  const modalidadePorCliente = new Map<string, ModalidadeBeneficio>();
  for (const c of (clientesMod ?? []) as { id: string; modalidade_beneficio: string }[]) {
    modalidadePorCliente.set(c.id, c.modalidade_beneficio === "cashback" ? "cashback" : "desconto");
  }

  // Faturas já existentes mantêm o estado de publicação; as novas seguem o lote.
  const publicacaoPorCliente = await publicacaoExistente(
    supabase,
    referencia,
    itensValidos.map((it) => it.cliente_id)
  );

  // TUSD GD II: calculada para o lote inteiro (o rateio depende do consumo de todos).
  const consumos = itensValidos.map((it) =>
    consumoDeLeituras(it.leitura_anterior, it.leitura_atual, params.fator_multiplicador)
  );
  const gd2 = distribuirTusdGd2(
    params.gd2_modo === "total" ? "total" : "tarifa",
    params.gd2_modo === "total" ? params.gd2_total : params.tarifa_gd2,
    consumos
  );

  // Trava: tarifa equivalente alta demais = total/valor fixo digitado no campo errado.
  if (!tarifaGd2Valida(gd2.tarifa)) {
    const eq = gd2.tarifa.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
    return {
      ok: false,
      geradas: 0,
      mensagem:
        params.gd2_modo === "total"
          ? `TUSD GD II equivale a R$ ${eq} por kWh — alto demais. Confira o Fio B informado e as leituras do lote.`
          : `${MSG_TARIFA_GD2} (você informou ${eq}).`,
    };
  }

  const registros = itensValidos.map((it, idx) => {
    const consumo_kwh = consumos[idx];
    const taxa_energia_solar = gd2.valores[idx];
    const r = calcularFaturaDetalhada({
      consumoKwh: consumo_kwh,
      tarifaTusd: params.tarifa_tusd,
      tarifaTe: params.tarifa_te,
      adicionalBandeira: params.adicional_bandeira,
      taxaEnergiaSolar: taxa_energia_solar,
      taxaIluminacao: params.taxa_iluminacao,
      multaJuros: params.multa_juros ?? 0,
      descontoPercentual: it.desconto_percentual,
    });
    const valores = aplicarModalidade(r, modalidadePorCliente.get(it.cliente_id) ?? "desconto");
    return {
      cliente_id: it.cliente_id,
      referencia,
      leitura_anterior: it.leitura_anterior,
      leitura_atual: it.leitura_atual,
      fator_multiplicador: params.fator_multiplicador,
      consumo_kwh,
      tarifa_kwh: params.tarifa_tusd + params.tarifa_te,
      tarifa_tusd: params.tarifa_tusd,
      tarifa_te: params.tarifa_te,
      adicional_bandeira: params.adicional_bandeira,
      taxa_energia_solar,
      tarifa_gd2: gd2.tarifa,
      taxa_iluminacao: params.taxa_iluminacao,
      multa_juros: params.multa_juros ?? 0,
      icms: params.icms ?? 0,
      pis: params.pis ?? 0,
      cofins: params.cofins ?? 0,
      desconto_percentual: it.desconto_percentual,
      ...valores,
      publicada: publicacaoPorCliente.get(it.cliente_id) ?? !params.rascunho,
      data_emissao,
      vencimento: it.vencimento || params.vencimento,
      status: params.status,
    };
  });

  if (registros.length === 0) {
    return { ok: false, geradas: 0, mensagem: "Nenhuma leitura atual informada." };
  }

  const { error } = await gravarFaturas(supabase, registros);

  if (error) return { ok: false, geradas: 0, mensagem: error.message };

  revalidatePath("/admin/faturas");
  revalidatePath("/admin");
  const novas = registros.filter((r) => !publicacaoPorCliente.has(r.cliente_id)).length;
  const rascunhos = registros.filter((r) => r.publicada === false).length;
  const detalhe =
    rascunhos > 0
      ? ` ${rascunhos} em rascunho — só você vê até publicar.`
      : novas > 0
        ? " Publicadas para os clientes."
        : "";
  return { ok: true, geradas: registros.length, mensagem: `${registros.length} fatura(s) salva(s).${detalhe}` };
}

/** Publica um rascunho: a partir daqui o cliente passa a ver a fatura. */
export async function publicarFatura(id: string) {
  await exigirAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("faturas").update({ publicada: true }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidarFaturas(id);
}

/** Volta uma fatura publicada para rascunho: o cliente deixa de vê-la. */
export async function despublicarFatura(id: string) {
  await exigirAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("faturas").update({ publicada: false }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidarFaturas(id);
}

/** Publica de uma vez todos os rascunhos (não cancelados) de um mês. */
export async function publicarMes(
  referencia: string
): Promise<{ ok: boolean; publicadas: number; mensagem: string }> {
  await exigirAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("faturas")
    .update({ publicada: true })
    .eq("referencia", normalizarReferencia(referencia))
    .eq("publicada", false)
    .neq("status", "cancelada")
    .select("id");
  if (error) return { ok: false, publicadas: 0, mensagem: error.message };
  revalidarFaturas();
  const n = (data ?? []).length;
  return { ok: true, publicadas: n, mensagem: n === 1 ? "1 fatura publicada." : `${n} faturas publicadas.` };
}

function revalidarFaturas(id?: string) {
  revalidatePath("/admin/faturas");
  revalidatePath("/admin/faturas/enviar");
  revalidatePath("/admin");
  revalidatePath("/admin/relatorios");
  revalidatePath("/admin/cashback");
  revalidatePath("/portal");
  if (id) revalidatePath(`/fatura/${id}`);
}
