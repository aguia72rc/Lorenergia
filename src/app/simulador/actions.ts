"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  calcularEconomia,
  faixaEconomia,
  type ParametrosEnergia,
  type PlanoCota,
  type FioBItem,
  type TipoLigacao,
} from "@/lib/simulador";

export interface EntradaPublica {
  modo: "kwh" | "reais";
  entrada: number;
  tipoLigacao: TipoLigacao;
  ano: number;
  nome?: string;
}

/**
 * Resultado PÚBLICO — de propósito enxuto: só a faixa arredondada para baixo,
 * nunca o valor cheio nem o detalhamento (isso fica no simulador interno).
 */
export interface ResultadoPublico {
  ok: boolean;
  motivo?: "consumo_invalido" | "sem_margem" | "config";
  mensagem?: string;
  consumoKwh: number;
  faixaMin: number; // R$/mês, arredondado para baixo
  faixaMax: number; // R$/mês
  anualMin: number; // R$/ano (faixaMin × 12)
}

const PASSO_FAIXA = 20;

/**
 * Simulação pública. Lê tarifa/planos/Fio B no servidor via service role
 * (as tabelas têm RLS admin-only) e grava a simulação (origem = 'publico').
 */
export async function simularPublico(input: EntradaPublica): Promise<ResultadoPublico> {
  const vazio = (motivo: ResultadoPublico["motivo"], mensagem: string, consumoKwh = 0): ResultadoPublico => ({
    ok: false, motivo, mensagem, consumoKwh, faixaMin: 0, faixaMax: 0, anualMin: 0,
  });

  const db = createAdminClient();
  const [{ data: parametros }, { data: planos }, { data: cronograma }] = await Promise.all([
    db.from("parametros_energia").select("*").order("vigente_desde", { ascending: false }).limit(1).maybeSingle(),
    db.from("planos_cota").select("*").eq("ativo", true).order("kwh", { ascending: true }),
    db.from("fio_b_cronograma").select("*"),
  ]);

  if (!parametros) return vazio("config", "Simulador indisponível no momento. Tente novamente em instantes.");

  const r = calcularEconomia(
    { modo: input.modo, entrada: input.entrada, tipoLigacao: input.tipoLigacao, ano: input.ano },
    parametros as ParametrosEnergia,
    (planos ?? []) as PlanoCota[],
    (cronograma ?? []) as FioBItem[]
  );

  if (!r.ok) return vazio(r.motivo === "sem_margem" ? "sem_margem" : "consumo_invalido", r.mensagem ?? "", r.consumoKwh);

  const fx = faixaEconomia(r.economiaMensal, PASSO_FAIXA);

  // Grava a simulação (não bloqueia o resultado se falhar).
  try {
    await db.from("simulacoes").insert({
      origem: "publico",
      nome_cliente: input.nome?.trim() || null,
      modo: input.modo,
      entrada: input.entrada,
      consumo_kwh: r.consumoKwh,
      tipo_ligacao: input.tipoLigacao,
      disponibilidade_kwh: r.disponibilidadeKwh,
      ano_referencia: input.ano,
      fio_b_percentual: r.fioBPercentual,
      plano_codigo: r.plano?.codigo ?? null,
      plano_kwh: r.energiaCompensadaKwh || null,
      plano_mensalidade: r.mensalidade,
      conta_atual: r.contaAtual,
      conta_lorenergia: r.contaLorenergia,
      economia_mensal: r.economiaMensal,
      economia_percentual: r.economiaPercentual,
      parametros_snapshot: { tarifa: r.tarifa, fioB: r.fioB, cip: r.cip, fioBPercentual: r.fioBPercentual },
    });
  } catch {
    // Simulação é lead-magnet; se a gravação falhar, ainda mostramos a faixa.
  }

  return { ok: true, consumoKwh: r.consumoKwh, faixaMin: fx.min, faixaMax: fx.max, anualMin: fx.min * 12 };
}
