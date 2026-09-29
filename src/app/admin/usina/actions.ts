"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";

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

  // 1) Geração do mês (+ consumo do prédio manual, se informado).
  const registroGer = { referencia, kwh_injetado, consumo_predio, updated_at: new Date().toISOString() };
  let { error: eGer } = await supabase
    .from("geracao_mensal")
    .upsert(registroGer, { onConflict: "referencia" });
  // Migração 0022 ainda não aplicada: grava sem o consumo do prédio.
  if (eGer && /consumo_predio/.test(eGer.message)) {
    const { consumo_predio: _cp, ...semCp } = registroGer;
    void _cp;
    ({ error: eGer } = await supabase.from("geracao_mensal").upsert(semCp, { onConflict: "referencia" }));
  }
  if (eGer) return { ok: false, mensagem: eGer.message };

  // 2) Percentuais de rateio (um registro por cliente).
  const registros = params.itens
    .filter((it) => it.cliente_id)
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
