"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { PREDIO_ID } from "@/lib/rateio";

async function exigirAdmin() {
  const sessao = await getSessao();
  if (sessao?.profile?.role !== "admin") {
    throw new Error("Acesso negado.");
  }
}

/** Normaliza "YYYY-MM" ou "YYYY-MM-DD" para o 1º dia do mês. */
function normalizarReferencia(valor: string): string {
  const [ano, mes] = valor.split("-");
  return `${ano}-${(mes ?? "01").padStart(2, "0")}-01`;
}

export interface SalvarRateioParams {
  referencia: string; // YYYY-MM ou YYYY-MM-DD
  kwh_injetado: number; // geração do mês
  consumo_predio?: number | null; // override manual do consumo do prédio (null = soma das faturas)
  predio_percentual?: number; // % do rateio destinado ao Consumo do Prédio
  itens: { cliente_id: string; percentual: number }[];
}

/**
 * Salva a geração da usina e o percentual de rateio de cada cliente no mês.
 * Grava a geração em geracao_mensal e os percentuais em rateio_mensal.
 */
export async function salvarRateio(
  params: SalvarRateioParams
): Promise<{ ok: boolean; mensagem: string }> {
  await exigirAdmin();
  const supabase = await createClient();

  if (!params.referencia) return { ok: false, mensagem: "Informe o mês de referência." };
  const referencia = normalizarReferencia(params.referencia);
  const kwh_injetado = Math.max(0, Number(params.kwh_injetado) || 0);
  const consumo_predio =
    params.consumo_predio == null || Number.isNaN(Number(params.consumo_predio))
      ? null
      : Math.max(0, Number(params.consumo_predio));
  const predio_percentual = Math.min(100, Math.max(0, Number(params.predio_percentual) || 0));

  // 1) Geração do mês (+ consumo do prédio manual e % do prédio, se informados).
  const registroGer = { referencia, kwh_injetado, consumo_predio, predio_percentual, updated_at: new Date().toISOString() };
  let eGer = (await supabase.from("geracao_mensal").upsert(registroGer, { onConflict: "referencia" })).error;
  // Migrações 0022/0023 ainda não aplicadas: grava sem as colunas novas.
  if (eGer && /consumo_predio|predio_percentual/.test(eGer.message)) {
    const { consumo_predio: _cp, predio_percentual: _pp, ...semNovas } = registroGer;
    void _cp; void _pp;
    eGer = (await supabase.from("geracao_mensal").upsert(semNovas, { onConflict: "referencia" })).error;
  }
  if (eGer) return { ok: false, mensagem: eGer.message };

  // 2) Percentuais de rateio dos moradores (o Consumo do Prédio não entra aqui).
  const registros = params.itens
    .filter((it) => it.cliente_id && it.cliente_id !== PREDIO_ID)
    .map((it) => ({
      referencia,
      cliente_id: it.cliente_id,
      percentual: Math.min(100, Math.max(0, Number(it.percentual) || 0)),
    }));

  if (registros.length > 0) {
    const { error: eRat } = await supabase
      .from("rateio_mensal")
      .upsert(registros, { onConflict: "referencia,cliente_id" });
    if (eRat) {
      if (/rateio_mensal|relation .* does not exist|schema cache/.test(eRat.message)) {
        return { ok: false, mensagem: "Rode a migração 0019_rateio_mensal.sql no Supabase para ativar o rateio." };
      }
      return { ok: false, mensagem: eRat.message };
    }
  }

  revalidatePath("/admin/usina");
  revalidatePath("/admin/relatorios");
  return { ok: true, mensagem: "Rateio salvo." };
}
