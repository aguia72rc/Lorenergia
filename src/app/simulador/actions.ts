"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  calcularEconomia,
  faixaEconomia,
  type ParametrosEnergia,
  type PlanoDesconto,
} from "@/lib/simulador";
import {
  comparativo,
  entradaValida,
  normalizarNome,
  normalizarWhatsapp,
  LIMITE_GLOBAL_HORA,
  LIMITE_POR_IP_HORA,
  LIMITE_POR_WHATSAPP_HORA,
} from "@/lib/simulador-publico";

export interface EntradaPublica {
  modo: "kwh" | "reais";
  entrada: number;
  planoCodigo?: string;
  nome?: string;
  whatsapp?: string;
  /** Isca anti-robô: campo escondido que pessoas não preenchem. */
  site?: string;
}

/**
 * Resultado PÚBLICO — de propósito enxuto: só a faixa arredondada para baixo e o
 * comparativo aproximado, nunca o percentual de desconto nem o detalhamento
 * (isso fica no simulador interno).
 */
export interface ResultadoPublico {
  ok: boolean;
  motivo?: "consumo_invalido" | "sem_plano" | "config" | "contato_invalido" | "muitas_tentativas";
  mensagem?: string;
  consumoKwh: number;
  faixaMin: number; // R$/mês, arredondado para baixo
  faixaMax: number; // R$/mês
  anualMin: number; // R$/ano (faixaMin × 12)
  contaHoje: number; // R$/mês aproximado, hoje
  contaComLorenergia: number; // R$/mês, "até" (conta de hoje − faixaMin)
}

const PASSO_FAIXA = 20;

/** IP de quem chamou (atrás da Vercel), só para limitar abuso; guardado apenas como hash. */
async function hashDoIp(): Promise<string | null> {
  try {
    const h = await headers();
    const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "";
    return ip ? createHash("sha256").update(`lorenergia:${ip}`).digest("hex").slice(0, 32) : null;
  } catch {
    return null;
  }
}

/**
 * Simulação pública. Exige nome e WhatsApp (viram um lead no CRM), limita o uso por
 * hora (IP, WhatsApp e total) e lê tarifa/planos no servidor via service role (as
 * tabelas têm RLS admin-only). Grava a simulação (origem = 'publico').
 */
export async function simularPublico(input: EntradaPublica): Promise<ResultadoPublico> {
  const vazio = (motivo: ResultadoPublico["motivo"], mensagem: string, consumoKwh = 0): ResultadoPublico => ({
    ok: false, motivo, mensagem, consumoKwh, faixaMin: 0, faixaMax: 0, anualMin: 0, contaHoje: 0, contaComLorenergia: 0,
  });

  // Robôs preenchem a isca escondida; respondemos como se estivesse ocupado, sem gravar nada.
  if (input.site && input.site.trim() !== "") {
    return vazio("muitas_tentativas", "Muitas simulações em pouco tempo. Tente novamente em alguns minutos.");
  }

  const nome = normalizarNome(input.nome ?? "");
  const whatsapp = normalizarWhatsapp(input.whatsapp ?? "");
  if (!nome) return vazio("contato_invalido", "Informe seu nome.");
  if (!whatsapp) return vazio("contato_invalido", "Informe um WhatsApp válido, com DDD. Ex.: (81) 99999-9999.");
  if (input.modo !== "kwh" && input.modo !== "reais") return vazio("consumo_invalido", "Informe o consumo para simular.");
  if (!entradaValida(input.modo, input.entrada)) return vazio("consumo_invalido", "Informe um consumo válido para simular.");

  const db = createAdminClient();
  const ipHash = await hashDoIp();

  // Limites por hora: total, por IP e por WhatsApp. Se a checagem falhar, não bloqueia.
  const desde = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const contar = async (filtro?: (q: ReturnType<typeof base>) => ReturnType<typeof base>) => {
    const q = filtro ? filtro(base()) : base();
    const { count } = await q;
    return count ?? 0;
  };
  function base() {
    return db.from("simulacoes").select("id", { count: "exact", head: true }).eq("origem", "publico").gte("created_at", desde);
  }
  try {
    const { data: leadExistente } = await db.from("leads").select("id").eq("whatsapp", whatsapp).limit(1).maybeSingle();
    const [global, porIp, porWhats] = await Promise.all([
      contar(),
      ipHash ? contar((q) => q.eq("parametros_snapshot->>ip_hash", ipHash)) : Promise.resolve(0),
      leadExistente ? contar((q) => q.eq("lead_id", leadExistente.id)) : Promise.resolve(0),
    ]);
    if (global >= LIMITE_GLOBAL_HORA || porIp >= LIMITE_POR_IP_HORA || porWhats >= LIMITE_POR_WHATSAPP_HORA) {
      return vazio("muitas_tentativas", "Muitas simulações em pouco tempo. Tente novamente em alguns minutos.");
    }
  } catch {
    // Sem a checagem, segue: melhor atender do que derrubar o simulador.
  }

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

  // Lead no CRM + simulação gravada. Se algo falhar, o visitante ainda vê o resultado.
  try {
    let leadId: string | null = null;
    const { data: existente } = await db.from("leads").select("id").eq("whatsapp", whatsapp).limit(1).maybeSingle();
    if (existente) {
      leadId = existente.id as string;
    } else {
      const { data: novo } = await db
        .from("leads")
        .insert({
          nome,
          segmento: "RESIDENCIAL",
          whatsapp,
          consumo_estimado_kwh: r.consumoKwh,
          lead_score: 70, // pediu a simulação por conta própria
          fonte_dados: "SIMULADOR",
          observacoes: `Simulação no site: economia de R$ ${fx.min} a R$ ${fx.max} por mês.`,
        })
        .select("id")
        .single();
      leadId = (novo?.id as string | undefined) ?? null;
    }

    if (leadId) {
      await db.from("lead_eventos").insert({
        lead_id: leadId,
        evento: "SIMULACAO_SITE",
        detalhes: { consumo_kwh: r.consumoKwh, faixa_min: fx.min, faixa_max: fx.max, ja_existia: !!existente },
      });
    }

    await db.from("simulacoes").insert({
      origem: "publico",
      lead_id: leadId,
      nome_cliente: nome,
      modo: input.modo,
      entrada: input.entrada,
      consumo_kwh: r.consumoKwh,
      plano_codigo: r.plano?.codigo ?? null,
      desconto_percentual: r.descontoPercentual * 100,
      conta_atual: r.contaAtual,
      conta_lorenergia: r.contaLorenergia,
      economia_mensal: r.economiaMensal,
      economia_percentual: r.economiaPercentual,
      parametros_snapshot: { tarifa: r.tarifa, cip: r.cip, ip_hash: ipHash },
    });
  } catch {
    // Simulação é lead-magnet; se a gravação falhar, ainda mostramos a faixa.
  }

  const cmp = comparativo(r.contaAtual, fx.min);
  return {
    ok: true,
    consumoKwh: r.consumoKwh,
    faixaMin: fx.min,
    faixaMax: fx.max,
    anualMin: fx.min * 12,
    contaHoje: cmp.hoje,
    contaComLorenergia: cmp.com,
  };
}
