"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import {
  CIDADES_PE, construirQueryOverpass, classificarSegmento, subsegmentoDe,
  estimarConsumo, calcularScore, type OsmElement,
} from "@/lib/scanner";
import type { SegmentoLead } from "@/lib/types";

export interface LeadResumo {
  nome: string;
  segmento: string;
  bairro: string | null;
  consumo: number;
  score: number;
  whatsapp: string | null;
}
export interface ResultadoScan {
  ok: boolean;
  mensagem: string;
  analisados: number;
  novos: number;
  duplicados: number;
  consumoTotal: number;
  comissaoTotal: number;
  leads: LeadResumo[];
}

interface LeadInsert {
  nome: string; segmento: SegmentoLead; subsegmento: string; cidade: string; estado: string;
  bairro: string | null; endereco: string | null; numero: string | null; cep: string | null;
  telefone: string | null; whatsapp: string | null; email: string | null; website: string | null;
  latitude: number; longitude: number; consumo_estimado_kwh: number; lead_score: number;
  prioridade_operacional: number; fonte_dados: string; fonte_id_externo: string;
}

const vazio = (ok: boolean, mensagem: string): ResultadoScan =>
  ({ ok, mensagem, analisados: 0, novos: 0, duplicados: 0, consumoTotal: 0, comissaoTotal: 0, leads: [] });

/**
 * Scanner de estabelecimentos REAIS via OpenStreetMap (Overpass API).
 * Estima consumo, pontua, faz dedupe (fonte_id_externo) e salva na tabela leads.
 */
export async function escanear(input: { cidade: string; raioKm: number; segmento: string; consumoMin: number }): Promise<ResultadoScan> {
  const sessao = await getSessao();
  if (sessao?.profile?.role !== "admin") return vazio(false, "Acesso negado.");

  const centro = CIDADES_PE[input.cidade] ?? CIDADES_PE["Recife"];
  const raioM = Math.max(1000, Math.min(50000, (Number(input.raioKm) || 25) * 1000));
  const query = construirQueryOverpass(centro[0], centro[1], raioM, 200);

  // A Overpass é exigente: corpo como formulário (data=), com User-Agent e
  // Accept. Tenta a instância principal e cai para um espelho se recusar.
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ];
  const corpo = new URLSearchParams({ data: query }).toString();
  let elements: OsmElement[] | null = null;
  let ultimoErro = "";
  for (const url of endpoints) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);
    try {
      const resp = await fetch(url, {
        method: "POST",
        body: corpo,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          "User-Agent": "Lorenergia/1.0 (prospeccao; +https://lorenergia.vercel.app)",
        },
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (!resp.ok) { ultimoErro = `HTTP ${resp.status}`; continue; }
      const j = (await resp.json()) as { elements?: OsmElement[] };
      elements = j.elements ?? [];
      break;
    } catch {
      clearTimeout(timer);
      ultimoErro = "rede ou tempo esgotado";
    }
  }
  if (elements === null) {
    return vazio(false, `Não consegui acessar o OpenStreetMap agora (${ultimoErro}). Tente novamente em alguns segundos.`);
  }

  const soDig = (v: string) => v.replace(/\D/g, "");
  const rows: LeadInsert[] = [];
  const segAlvo = input.segmento && input.segmento !== "Todos" ? input.segmento : null;
  const consumoMin = Number(input.consumoMin) || 0;

  for (const el of elements) {
    const tags = el.tags ?? {};
    const nome = (tags.name ?? "").trim();
    if (!nome) continue;
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat == null || lng == null) continue;

    const segmento = classificarSegmento(tags);
    if (segAlvo && segmento !== segAlvo) continue;
    const consumo = estimarConsumo(tags, segmento);
    if (consumo < consumoMin) continue;

    const whatsapp = soDig(tags["contact:whatsapp"] ?? "") || null;
    const telefone = tags["contact:phone"] ?? tags["phone"] ?? null;
    const website = tags["contact:website"] ?? tags["website"] ?? null;
    const bairro = tags["addr:suburb"] ?? tags["addr:neighbourhood"] ?? null;
    const endereco = tags["addr:street"] ?? null;
    const temContato = !!(whatsapp || telefone);
    const score = calcularScore({ consumo, temContato, segmento, temSite: !!website, temEndereco: !!endereco });

    rows.push({
      nome, segmento, subsegmento: subsegmentoDe(tags), cidade: input.cidade, estado: "PE",
      bairro, endereco, numero: tags["addr:housenumber"] ?? null, cep: tags["addr:postcode"] ?? null,
      telefone, whatsapp, email: null, website,
      latitude: Number(lat), longitude: Number(lng),
      consumo_estimado_kwh: consumo, lead_score: score,
      prioridade_operacional: Math.min(100, score + (temContato ? 5 : 0)),
      fonte_dados: "OpenStreetMap", fonte_id_externo: `osm/${el.type}/${el.id}`,
    });
  }

  const analisados = rows.length;
  if (analisados === 0) {
    return vazio(true, `Varredura concluída: ${elements.length} elementos no mapa, mas nenhum lead qualificado (sem nome, abaixo do consumo mínimo ou fora do segmento).`);
  }

  const supabase = createClient();

  // Dedupe em código: consulta os que já existem (por fonte_id_externo) e
  // insere só os novos. Evita depender do ON CONFLICT (o índice é parcial).
  const ids = rows.map((r) => r.fonte_id_externo);
  const { data: existentes } = await supabase.from("leads").select("fonte_id_externo").in("fonte_id_externo", ids);
  const jaExiste = new Set((existentes ?? []).map((e: { fonte_id_externo: string | null }) => e.fonte_id_externo));
  const novosRows = rows.filter((r) => !jaExiste.has(r.fonte_id_externo));

  if (novosRows.length === 0) {
    return {
      ok: true,
      mensagem: `✅ ${analisados} estabelecimentos analisados · 0 novos (todos já estavam no banco).`,
      analisados, novos: 0, duplicados: analisados, consumoTotal: 0, comissaoTotal: 0, leads: [],
    };
  }

  const { data, error } = await supabase
    .from("leads")
    .insert(novosRows)
    .select("nome,segmento,bairro,consumo_estimado_kwh,lead_score,whatsapp");
  if (error) return vazio(false, "Erro ao salvar os leads: " + error.message);

  const salvos = (data ?? []) as { nome: string; segmento: string; bairro: string | null; consumo_estimado_kwh: number; lead_score: number; whatsapp: string | null }[];
  const novos = salvos.length;
  const consumoTotal = salvos.reduce((s, l) => s + Number(l.consumo_estimado_kwh), 0);

  revalidatePath("/admin/leads");
  return {
    ok: true,
    mensagem: `✅ ${analisados} estabelecimentos analisados · ${novos} novos leads salvos · ${analisados - novos} já existiam.`,
    analisados,
    novos,
    duplicados: analisados - novos,
    consumoTotal,
    comissaoTotal: consumoTotal * 0.5,
    leads: salvos.map((l) => ({ nome: l.nome, segmento: l.segmento, bairro: l.bairro, consumo: Number(l.consumo_estimado_kwh), score: l.lead_score, whatsapp: l.whatsapp })),
  };
}
