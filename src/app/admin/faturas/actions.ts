"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { calcularFatura } from "@/lib/calc";
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

export async function gerarFatura(formData: FormData) {
  await exigirAdmin();
  const supabase = createClient();

  const cliente_id = String(formData.get("cliente_id") ?? "");
  const referenciaRaw = String(formData.get("referencia") ?? "");
  const consumo_kwh = Number(formData.get("consumo_kwh") ?? 0);
  const tarifa_kwh = Number(formData.get("tarifa_kwh") ?? 0);
  const taxa_iluminacao = Number(formData.get("taxa_iluminacao") ?? 0);
  const desconto_percentual = Number(formData.get("desconto_percentual") ?? 0);
  const vencimento = String(formData.get("vencimento") ?? "") || null;
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;
  const status = (String(formData.get("status") ?? "pendente") as StatusFatura);

  if (!cliente_id) throw new Error("Selecione o morador.");
  if (!referenciaRaw) throw new Error("Informe o mês de referência.");

  const referencia = normalizarReferencia(referenciaRaw);
  const r = calcularFatura({ consumoKwh: consumo_kwh, tarifaKwh: tarifa_kwh, descontoPercentual: desconto_percentual, taxaIluminacao: taxa_iluminacao });

  const registro = {
    cliente_id,
    referencia,
    consumo_kwh,
    tarifa_kwh,
    taxa_iluminacao,
    desconto_percentual,
    valor_bruto: r.valorBruto,
    valor_desconto: r.valorDesconto,
    valor_liquido: r.valorLiquido,
    economia: r.economia,
    vencimento,
    status,
    observacoes,
  };

  // Regenerar a mesma referência sobrescreve os valores.
  const { data, error } = await supabase
    .from("faturas")
    .upsert(registro, { onConflict: "cliente_id,referencia" })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/admin/faturas");
  revalidatePath("/admin");
  redirect(`/fatura/${data!.id}`);
}

export async function atualizarStatusFatura(id: string, status: StatusFatura) {
  await exigirAdmin();
  const supabase = createClient();
  const { error } = await supabase.from("faturas").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/faturas");
  revalidatePath("/admin");
}

export async function excluirFatura(id: string) {
  await exigirAdmin();
  const supabase = createClient();
  const { error } = await supabase.from("faturas").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/faturas");
  revalidatePath("/admin");
}
