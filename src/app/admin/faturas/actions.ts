"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { calcularFaturaDetalhada, consumoDeLeituras } from "@/lib/calc";
import type { StatusFatura } from "@/lib/types";

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
    valor_bruto: r.valorBruto,
    valor_desconto: r.valorDesconto,
    valor_liquido: r.valorLiquido,
    economia: r.economia,
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

  // Migração 0007 ainda não aplicada: grava sem a data de emissão.
  if (erroColunaEmissaoAusente(error)) {
    ({ data, error } = await supabase
      .from("faturas")
      .upsert(semDataEmissao(registro), { onConflict: "cliente_id,referencia" })
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

  const registros = params.itens
    .filter((it) => it.cliente_id && it.leitura_atual !== null && !Number.isNaN(it.leitura_atual))
    .map((it) => {
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
        valor_bruto: r.valorBruto,
        valor_desconto: r.valorDesconto,
        valor_liquido: r.valorLiquido,
        economia: r.economia,
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

  // Migração 0007 ainda não aplicada: grava sem a data de emissão.
  if (erroColunaEmissaoAusente(error)) {
    ({ error } = await supabase
      .from("faturas")
      .upsert(registros.map(semDataEmissao), { onConflict: "cliente_id,referencia" }));
  }

  if (error) return { ok: false, geradas: 0, mensagem: error.message };

  revalidatePath("/admin/faturas");
  revalidatePath("/admin");
  return { ok: true, geradas: registros.length, mensagem: `${registros.length} fatura(s) gerada(s).` };
}
