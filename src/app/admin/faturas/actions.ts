"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { calcularFaturaDetalhada, consumoDeLeituras } from "@/lib/calc";
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
 * Detecta o erro do PostgREST/Postgres quando a coluna `data_emissao` ainda
 * não existe (migração 0007 não aplicada). Permite gerar a fatura mesmo assim,
 * sem o campo, até que a migração seja rodada.
 */
function erroColunaEmissaoAusente(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "PGRST204" || error.code === "42703") return true;
  return /data_emissao/.test(error.message ?? "");
}

function semDataEmissao<T extends { data_emissao?: unknown }>(registro: T): Omit<T, "data_emissao"> {
  const { data_emissao: _omitido, ...resto } = registro;
  void _omitido;
  return resto;
}

/** Detecta erro de coluna de cashback ausente (migração 0018 não aplicada). */
function erroCashbackAusente(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return /modalidade_beneficio|cashback_valor|cashback_pago/.test(error.message ?? "");
}

/** Remove os campos de cashback (para gravar antes da migração 0018). */
function semCashback<T extends Record<string, unknown>>(registro: T) {
  const { modalidade_beneficio: _m, cashback_valor: _v, cashback_pago: _p, ...resto } = registro;
  void _m;
  void _v;
  void _p;
  return resto;
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
  const taxa_energia_solar = Number(formData.get("taxa_energia_solar") ?? 0);
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

  if (!cliente_id) throw new Error("Selecione o morador.");
  if (!referenciaRaw) throw new Error("Informe o mês de referência.");

  const leitura_anterior = leituraAnteriorRaw === "" ? null : Number(leituraAnteriorRaw);
  const leitura_atual = leituraAtualRaw === "" ? null : Number(leituraAtualRaw);

  const consumo_kwh =
    leitura_atual !== null
      ? consumoDeLeituras(leitura_anterior, leitura_atual, fator_multiplicador)
      : Number(formData.get("consumo_kwh") ?? 0);

  const referencia = normalizarReferencia(referenciaRaw);
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
    taxa_iluminacao,
    multa_juros,
    icms,
    pis,
    cofins,
    desconto_percentual,
    ...valores,
    data_emissao,
    vencimento,
    status,
    observacoes,
  };

  // Regenerar a mesma referência sobrescreve os valores.
  let { data, error } = await supabase
    .from("faturas")
    .upsert(registro, { onConflict: "cliente_id,referencia" })
    .select("id")
    .single();

  // Migração 0018 ainda não aplicada: grava sem os campos de cashback.
  if (erroCashbackAusente(error)) {
    ({ data, error } = await supabase
      .from("faturas")
      .upsert(semCashback(registro), { onConflict: "cliente_id,referencia" })
      .select("id")
      .single());
  }

  // Migração 0007 ainda não aplicada: grava sem a data de emissão.
  if (erroColunaEmissaoAusente(error)) {
    ({ data, error } = await supabase
      .from("faturas")
      .upsert(semDataEmissao(semCashback(registro)), { onConflict: "cliente_id,referencia" })
      .select("id")
      .single());
  }

  if (error) throw new Error(error.message);

  revalidatePath("/admin/faturas");
  revalidatePath("/admin");
  redirect(`/fatura/${data!.id}`);
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
}

export interface ParametrosLote {
  referencia: string; // YYYY-MM
  fator_multiplicador: number;
  tarifa_tusd: number;
  tarifa_te: number;
  adicional_bandeira: number;
  taxa_energia_solar: number;
  taxa_iluminacao: number;
  data_emissao: string | null;
  vencimento: string | null;
  status: StatusFatura;
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

  const registros = itensValidos.map((it) => {
    const consumo_kwh = consumoDeLeituras(it.leitura_anterior, it.leitura_atual, params.fator_multiplicador);
    const r = calcularFaturaDetalhada({
      consumoKwh: consumo_kwh,
      tarifaTusd: params.tarifa_tusd,
      tarifaTe: params.tarifa_te,
      adicionalBandeira: params.adicional_bandeira,
      taxaEnergiaSolar: params.taxa_energia_solar,
      taxaIluminacao: params.taxa_iluminacao,
      multaJuros: 0,
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
      taxa_energia_solar: params.taxa_energia_solar,
      taxa_iluminacao: params.taxa_iluminacao,
      multa_juros: 0,
      desconto_percentual: it.desconto_percentual,
      ...valores,
      data_emissao,
      vencimento: params.vencimento,
      status: params.status,
    };
  });

  if (registros.length === 0) {
    return { ok: false, geradas: 0, mensagem: "Nenhuma leitura atual informada." };
  }

  let { error } = await supabase
    .from("faturas")
    .upsert(registros, { onConflict: "cliente_id,referencia" });

  // Migração 0018 ainda não aplicada: grava sem os campos de cashback.
  if (erroCashbackAusente(error)) {
    ({ error } = await supabase
      .from("faturas")
      .upsert(registros.map(semCashback), { onConflict: "cliente_id,referencia" }));
  }

  // Migração 0007 ainda não aplicada: grava sem a data de emissão.
  if (erroColunaEmissaoAusente(error)) {
    ({ error } = await supabase
      .from("faturas")
      .upsert(registros.map((reg) => semDataEmissao(semCashback(reg))), { onConflict: "cliente_id,referencia" }));
  }

  if (error) return { ok: false, geradas: 0, mensagem: error.message };

  revalidatePath("/admin/faturas");
  revalidatePath("/admin");
  return { ok: true, geradas: registros.length, mensagem: `${registros.length} fatura(s) gerada(s).` };
}
