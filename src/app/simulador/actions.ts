"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  calcularEconomia,
  faixaEconomia,
  type ParametrosEnergia,
  type PlanoDesconto,
} from "@/lib/simulador";

export interface EntradaPublica {
  modo: "kwh" | "reais";
  entrada: number;
  planoCodigo?: string;
  nome?: string;
}

/**
 * Resultado PÚBLICO — de propósito enxuto: só a faixa arredondada para baixo,
 * nunca o valor cheio nem o detalhamento (isso fica no simulador interno).
 */
export interface ResultadoPublico {
  ok: boolean;
  motivo?: "consumo_invalido" | "sem_plano" | "config";
  mensagem?: string;
  consumoKwh: number;
  faixaMin: number; // R$/mês, arredondado para baixo
  faixaMax: number; // R$/mês
  anualMin: number; // R$/ano (faixaMin × 12)
}

const PASSO_FAIXA = 20;

/**
 * Simulação pública. Lê tarifa/planos no servidor via service role (as
 * tabelas têm RLS admin-only) e grava a simulação (origem = 'publico').
 */
export async function simularPublico(input: EntradaPublica): Promise<ResultadoPublico> {
  const vazio = (motivo: ResultadoPublico["motivo"], mensagem: string, consumoKwh = 0): ResultadoPublico => ({
    ok: false, motivo, mensagem, consumoKwh, faixaMin: 0, faixaMax: 0, anualMin: 0,
  });

  const db = createAdminClient();
  const [{ data: parametros }, { data: planos }] = await Promise.all([
    db.from("parametros_energia").select("*").order("vigente_desde", { ascending: false }).limit(1).maybeSingle(),
    db.from("planos_cota").select("*").eq("ativo", true).order("desconto_percentual", { ascending: false }),
  ]);

  if (!parametros) return vazio("config", "Simulador indisponível no momento. Tente novamente em instantes.");

  const r = calcularEconomia(
    { modo: input.modo, entrada: input.entrada, planoCodigo: input.planoCodigo },
    parametros as ParametrosEnergia,
    (planos ?? []) as PlanoDesconto[]
  );

  if (!r.ok) return vazio(r.motivo === "sem_plano" ? "sem_plano" : "consumo_invalido", r.mensagem ?? "", r.consumoKwh);

  const fx = faixaEconomia(r.economiaMensal, PASSO_FAIXA);

  // Grava a simulação (não bloqueia o resultado se falhar).
  try {
    await db.from("simulacoes").insert({
      origem: "publico",
      nome_cliente: input.nome?.trim() || null,
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
  } catch {
    // Simulação é lead-magnet; se a gravação falhar, ainda mostramos a faixa.
  }

  return { ok: true, consumoKwh: r.consumoKwh, faixaMin: fx.min, faixaMax: fx.max, anualMin: fx.min * 12 };
}
