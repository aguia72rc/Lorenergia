"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";

export interface EntradaParametros {
  tusd: number; // R$/kWh
  te: number; // R$/kWh
  icmsPct: number; // em % (ex.: 20.5)
  pisCofinsPct: number; // em % (ex.: 4.65)
  cip: number; // R$/mês
}

/**
 * Salva as premissas de energia (tarifa, tributos, iluminação). Atualiza a
 * linha vigente mais recente; cria uma se não houver.
 */
export async function salvarParametros(input: EntradaParametros): Promise<{ ok: boolean; mensagem: string }> {
  const sessao = await getSessao();
  if (sessao?.profile?.role !== "admin") return { ok: false, mensagem: "Acesso negado." };

  const tusd = Math.max(0, Number(input.tusd) || 0);
  const te = Math.max(0, Number(input.te) || 0);
  const icms = Math.min(1, Math.max(0, (Number(input.icmsPct) || 0) / 100));
  const pis_cofins = Math.min(1, Math.max(0, (Number(input.pisCofinsPct) || 0) / 100));
  const cip = Math.max(0, Number(input.cip) || 0);

  const registro = {
    tusd,
    te,
    tarifa_tusd_te: tusd + te,
    icms,
    pis_cofins,
    cip,
    vigente_desde: new Date().toISOString().slice(0, 10),
  };

  const db = createClient();
  const { data: atual } = await db
    .from("parametros_energia")
    .select("id")
    .order("vigente_desde", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = atual?.id
    ? await db.from("parametros_energia").update(registro).eq("id", atual.id)
    : await db.from("parametros_energia").insert(registro);
  if (error) return { ok: false, mensagem: "Erro ao salvar: " + error.message };

  revalidatePath("/admin/parametros");
  return { ok: true, mensagem: `Parâmetros salvos · tarifa ${(tusd + te).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} R$/kWh (sem tributos).` };
}
