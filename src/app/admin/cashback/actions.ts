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

/**
 * Quita (marca como pago) todo o cashback pendente de um morador.
 * Marca as faturas de cashback ainda não pagas como pagas, com a data de hoje.
 */
export async function quitarCashback(clienteId: string): Promise<{ ok: boolean; mensagem: string }> {
  await exigirAdmin();
  const supabase = await createClient();

  const hoje = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("faturas")
    .update({ cashback_pago: true, cashback_pago_em: hoje })
    .eq("cliente_id", clienteId)
    .eq("modalidade_beneficio", "cashback")
    .eq("cashback_pago", false)
    .select("id");

  if (error) return { ok: false, mensagem: error.message };

  revalidatePath("/admin/cashback");
  revalidatePath("/admin");
  return { ok: true, mensagem: `Cashback quitado (${(data ?? []).length} fatura(s)).` };
}
