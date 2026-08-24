"use server";

import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import {
  calcularEconomia,
  type ParametrosEnergia,
  type PlanoCota,
  type FioBItem,
  type TipoLigacao,
} from "@/lib/simulador";

export interface EntradaProposta {
  leadId: string;
  nomeCliente?: string;
  modo: "kwh" | "reais";
  entrada: number;
  tipoLigacao: TipoLigacao;
  ano: number;
  planoCodigo?: string;
}

/**
 * Salva uma simulação do CRM vinculada ao lead. Recalcula no servidor (mesma
 * função calcularEconomia) para o valor gravado ser autoritativo, e usa o
 * cliente do admin (RLS admin) — a policy admin permite o insert.
 */
export async function salvarSimulacaoCrm(input: EntradaProposta): Promise<{ ok: boolean; mensagem: string }> {
  const sessao = await getSessao();
  if (sessao?.profile?.role !== "admin") return { ok: false, mensagem: "Acesso negado." };

  const db = createClient();
  const [{ data: parametros }, { data: planos }, { data: cronograma }] = await Promise.all([
    db.from("parametros_energia").select("*").order("vigente_desde", { ascending: false }).limit(1).maybeSingle(),
    db.from("planos_cota").select("*").eq("ativo", true).order("kwh", { ascending: true }),
    db.from("fio_b_cronograma").select("*"),
  ]);
  if (!parametros) return { ok: false, mensagem: "Parâmetros de energia não configurados." };

  const r = calcularEconomia(
    { modo: input.modo, entrada: input.entrada, tipoLigacao: input.tipoLigacao, ano: input.ano, planoCodigo: input.planoCodigo },
    parametros as ParametrosEnergia,
    (planos ?? []) as PlanoCota[],
    (cronograma ?? []) as FioBItem[]
  );
  if (!r.ok) return { ok: false, mensagem: r.mensagem || "Não foi possível simular com esses dados." };

  const { error } = await db.from("simulacoes").insert({
    origem: "crm",
    lead_id: input.leadId,
    nome_cliente: input.nomeCliente?.trim() || null,
    modo: input.modo,
    entrada: input.entrada,
    consumo_kwh: r.consumoKwh,
    tipo_ligacao: input.tipoLigacao,
    disponibilidade_kwh: r.disponibilidadeKwh,
    ano_referencia: input.ano,
    fio_b_percentual: r.fioBPercentual,
    plano_codigo: r.plano?.codigo ?? null,
    plano_kwh: r.plano?.kwh ?? null,
    plano_mensalidade: r.mensalidade,
    conta_atual: r.contaAtual,
    conta_lorenergia: r.contaLorenergia,
    economia_mensal: r.economiaMensal,
    economia_percentual: r.economiaPercentual,
    parametros_snapshot: { tarifa: r.tarifa, fioB: r.fioB, cip: r.cip, fioBPercentual: r.fioBPercentual },
  });
  if (error) return { ok: false, mensagem: "Erro ao salvar: " + error.message };

  return { ok: true, mensagem: `Simulação salva no lead · economia de ${Math.round(r.economiaMensal)} R$/mês.` };
}
