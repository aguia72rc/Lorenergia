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

/** Salva (ou atualiza) a energia injetada na rede no mês de referência. */
export async function salvarGeracaoMensal(formData: FormData) {
  await exigirAdmin();
  const supabase = createClient();

  const referenciaRaw = String(formData.get("referencia") ?? "");
  if (!referenciaRaw) throw new Error("Informe o mês de referência.");
  const referencia = normalizarReferencia(referenciaRaw);

  const kwh_injetado = Number(formData.get("kwh_injetado") ?? 0) || 0;

  const { error } = await supabase
    .from("geracao_mensal")
    .upsert(
      { referencia, kwh_injetado, updated_at: new Date().toISOString() },
      { onConflict: "referencia" }
    );

  if (error) throw new Error(error.message);

  revalidatePath("/admin/relatorios");
}
