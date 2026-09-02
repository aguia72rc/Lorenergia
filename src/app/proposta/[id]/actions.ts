"use server";

import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import {
  calcularEconomia,
  type ParametrosEnergia,
  type PlanoDesconto,
} from "@/lib/simulador";

export interface EntradaProposta {
  leadId: string;
  nomeCliente?: string;
  modo: "kwh" | "reais";
  entrada: number;
  planoCodigo?: string;
  /** Composição da conta editada na proposta (sobrepõe os parâmetros do banco). */
  parametros: ParametrosEnergia;
}

/**
 * Salva uma simulação do CRM vinculada ao lead. Recalcula no servidor (mesma
 * função calcularEconomia) para o valor gravado ser autoritativo.
 */
export async function salvarSimulacaoCrm(input: EntradaProposta): Promise<{ ok: boolean; mensagem: string }> {
  const sessao = await getSessao();
  if (sessao?.profile?.role !== "admin") return { ok: false, mensagem: "Acesso negado." };

  const db = await createClient();
  const { data: planos } = await db.from("planos_cota").select("*").eq("ativo", true).order("desconto_percentual", { ascending: false });

  // Usa os parâmetros editados na proposta (não os do banco) — é uma simulação
  // pontual para aquele lead.
  const r = calcularEconomia(
    { modo: input.modo, entrada: input.entrada, planoCodigo: input.planoCodigo },
    input.parametros,
    (planos ?? []) as PlanoDesconto[]
  );
  if (!r.ok) return { ok: false, mensagem: r.mensagem || "Não foi possível simular com esses dados." };

  const { error } = await db.from("simulacoes").insert({
    origem: "crm",
    lead_id: input.leadId,
    nome_cliente: input.nomeCliente?.trim() || null,
    modo: input.modo,
    entrada: input.entrada,
    consumo_kwh: r.consumoKwh,
    plano_codigo: r.plano?.codigo ?? null,
    desconto_percentual: r.descontoPercentual * 100,
    conta_atual: r.contaAtual,
    conta_lorenergia: r.contaLorenergia,
    economia_mensal: r.economiaMensal,
    economia_percentual: r.economiaPercentual,
    parametros_snapshot: { tarifa: r.tarifa, cip: r.cip },
  });
  if (error) return { ok: false, mensagem: "Erro ao salvar: " + error.message };

  return { ok: true, mensagem: `Simulação salva no lead · economia de ${Math.round(r.economiaMensal)} R$/mês.` };
}
