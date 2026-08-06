"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { calcularFatura, consumoDeLeituras } from "@/lib/calc";
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
  const leituraAnteriorRaw = String(formData.get("leitura_anterior") ?? "");
  const leituraAtualRaw = String(formData.get("leitura_atual") ?? "");
  const tarifa_kwh = Number(formData.get("tarifa_kwh") ?? 0);
  const taxa_iluminacao = Number(formData.get("taxa_iluminacao") ?? 0);
  const desconto_percentual = Number(formData.get("desconto_percentual") ?? 0);
  const vencimento = String(formData.get("vencimento") ?? "") || null;
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;
  const status = (String(formData.get("status") ?? "pendente") as StatusFatura);

  if (!cliente_id) throw new Error("Selecione o morador.");
  if (!referenciaRaw) throw new Error("Informe o mês de referência.");

  const leitura_anterior = leituraAnteriorRaw === "" ? null : Number(leituraAnteriorRaw);
  const leitura_atual = leituraAtualRaw === "" ? null : Number(leituraAtualRaw);

  // Consumo vem das leituras quando informadas; senão do campo consumo_kwh.
  const consumo_kwh =
    leitura_atual !== null
      ? consumoDeLeituras(leitura_anterior, leitura_atual)
      : Number(formData.get("consumo_kwh") ?? 0);

  const referencia = normalizarReferencia(referenciaRaw);
  const r = calcularFatura({ consumoKwh: consumo_kwh, tarifaKwh: tarifa_kwh, descontoPercentual: desconto_percentual, taxaIluminacao: taxa_iluminacao });

  const registro = {
    cliente_id,
    referencia,
    leitura_anterior,
    leitura_atual,
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

export interface ItemLote {
  cliente_id: string;
  leitura_anterior: number | null;
  leitura_atual: number | null;
  desconto_percentual: number;
}

export interface ParametrosLote {
  referencia: string; // YYYY-MM
  tarifa_kwh: number;
  taxa_iluminacao: number;
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
  const supabase = createClient();

  if (!params.referencia) return { ok: false, geradas: 0, mensagem: "Informe o mês de referência." };

  const referencia = normalizarReferencia(params.referencia);

  const registros = params.itens
    .filter((it) => it.cliente_id && it.leitura_atual !== null && !Number.isNaN(it.leitura_atual))
    .map((it) => {
      const consumo_kwh = consumoDeLeituras(it.leitura_anterior, it.leitura_atual);
      const r = calcularFatura({
        consumoKwh: consumo_kwh,
        tarifaKwh: params.tarifa_kwh,
        descontoPercentual: it.desconto_percentual,
        taxaIluminacao: params.taxa_iluminacao,
      });
      return {
        cliente_id: it.cliente_id,
        referencia,
        leitura_anterior: it.leitura_anterior,
        leitura_atual: it.leitura_atual,
        consumo_kwh,
        tarifa_kwh: params.tarifa_kwh,
        taxa_iluminacao: params.taxa_iluminacao,
        desconto_percentual: it.desconto_percentual,
        valor_bruto: r.valorBruto,
        valor_desconto: r.valorDesconto,
        valor_liquido: r.valorLiquido,
        economia: r.economia,
        vencimento: params.vencimento,
        status: params.status,
      };
    });

  if (registros.length === 0) {
    return { ok: false, geradas: 0, mensagem: "Nenhuma leitura atual informada." };
  }

  const { error } = await supabase
    .from("faturas")
    .upsert(registros, { onConflict: "cliente_id,referencia" });

  if (error) return { ok: false, geradas: 0, mensagem: error.message };

  revalidatePath("/admin/faturas");
  revalidatePath("/admin");
  return { ok: true, geradas: registros.length, mensagem: `${registros.length} fatura(s) gerada(s).` };
}
