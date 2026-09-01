"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { FLOW } from "@/lib/leads";
import type { Lead, StatusLead } from "@/lib/types";

async function exigirAdmin() {
  const sessao = await getSessao();
  if (sessao?.profile?.role !== "admin") throw new Error("Acesso negado.");
}

const soDigitos = (v: string) => v.replace(/\D/g, "");

async function logEvento(lead_id: string, evento: string, detalhes?: Record<string, unknown>) {
  const supabase = await createClient();
  await supabase.from("lead_eventos").insert({ lead_id, evento, detalhes: detalhes ?? null });
}

/** Cria um lead manualmente. */
export async function criarLead(formData: FormData) {
  await exigirAdmin();
  const supabase = await createClient();

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) throw new Error("Informe o nome do lead.");

  const registro = {
    nome,
    segmento: String(formData.get("segmento") ?? "COMERCIAL"),
    subsegmento: String(formData.get("subsegmento") ?? "").trim() || null,
    cidade: String(formData.get("cidade") ?? "Recife").trim() || "Recife",
    estado: String(formData.get("estado") ?? "PE").trim() || "PE",
    bairro: String(formData.get("bairro") ?? "").trim() || null,
    endereco: String(formData.get("endereco") ?? "").trim() || null,
    cep: String(formData.get("cep") ?? "").trim() || null,
    telefone: String(formData.get("telefone") ?? "").trim() || null,
    whatsapp: soDigitos(String(formData.get("whatsapp") ?? "")) || null,
    email: String(formData.get("email") ?? "").trim() || null,
    website: String(formData.get("website") ?? "").trim() || null,
    latitude: formData.get("latitude") ? Number(formData.get("latitude")) : null,
    longitude: formData.get("longitude") ? Number(formData.get("longitude")) : null,
    consumo_estimado_kwh: Number(formData.get("consumo_estimado_kwh") ?? 0) || 0,
    lead_score: Math.max(0, Math.min(100, Number(formData.get("lead_score") ?? 50) || 50)),
    prioridade_operacional: Math.max(0, Math.min(100, Number(formData.get("prioridade_operacional") ?? 50) || 50)),
    observacoes: String(formData.get("observacoes") ?? "").trim() || null,
    fonte_dados: "MANUAL",
  };

  const { data, error } = await supabase.from("leads").insert(registro).select("id").single();
  if (error) throw new Error(error.message);
  await logEvento(data!.id, "LEAD_CRIADO", { fonte: "MANUAL" });

  revalidatePath("/admin/leads");
  redirect(`/admin/leads/${data!.id}`);
}

/** Avança/muda o status do lead, validando a transição pela máquina de estados. */
export async function avancarStatus(id: string, novo: StatusLead) {
  await exigirAdmin();
  const supabase = await createClient();

  const { data: lead, error: e0 } = await supabase.from("leads").select("status_lead").eq("id", id).single();
  if (e0 || !lead) throw new Error("Lead não encontrado.");
  const atual = lead.status_lead as StatusLead;
  if (!FLOW[atual]?.includes(novo)) {
    throw new Error(`Transição inválida: ${atual} → ${novo}.`);
  }
  const { error } = await supabase.from("leads").update({ status_lead: novo }).eq("id", id);
  if (error) throw new Error(error.message);
  await logEvento(id, "STATUS_ALTERADO", { de: atual, para: novo });

  revalidatePath("/admin/leads");
  revalidatePath("/admin/leads/pipeline");
  revalidatePath(`/admin/leads/${id}`);
}

/** Registra uma tentativa de contato. */
export async function registrarContato(id: string) {
  await exigirAdmin();
  const supabase = await createClient();

  const { data: lead, error: e0 } = await supabase
    .from("leads")
    .select("tentativas_contato, max_tentativas_contato, status_lead")
    .eq("id", id)
    .single();
  if (e0 || !lead) throw new Error("Lead não encontrado.");

  const tentativas = Number(lead.tentativas_contato ?? 0) + 1;
  const max = Number(lead.max_tentativas_contato ?? 2);
  const agora = new Date();
  const proximo = new Date(agora.getTime() + 48 * 3600 * 1000);

  const patch: Record<string, unknown> = {
    tentativas_contato: tentativas,
    ultimo_contato_data: agora.toISOString(),
    proximo_contato_data: proximo.toISOString(),
    status_contato: tentativas >= max ? "SEGUNDO_CONTATO_NECESSARIO" : "AGUARDANDO_RESPOSTA",
  };
  // Move o lead para "Em contato" se ainda estava nas fases iniciais.
  if (["NOVO", "QUALIFICADO", "PRIORIZADO"].includes(lead.status_lead)) {
    patch.status_lead = "EM_CONTATO";
  }

  const { error } = await supabase.from("leads").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  await logEvento(id, "CONTATO_REGISTRADO", { tentativa: tentativas });

  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${id}`);
}

export async function salvarObservacaoLead(id: string, formData: FormData) {
  await exigirAdmin();
  const supabase = await createClient();
  const observacoes = String(formData.get("observacoes") ?? "").trim() || null;
  const { error } = await supabase.from("leads").update({ observacoes }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/leads/${id}`);
}

/**
 * PONTE: converte um lead fechado em cliente da Lorenergia.
 * Cria o cadastro em `clientes`, vincula, marca a venda e registra o evento.
 */
export async function converterEmCliente(id: string) {
  await exigirAdmin();
  const supabase = await createClient();

  const { data, error: e0 } = await supabase.from("leads").select("*").eq("id", id).single();
  if (e0 || !data) throw new Error("Lead não encontrado.");
  const lead = data as Lead;

  if (lead.cliente_id) {
    // Já convertido — vai direto para o cliente existente.
    redirect(`/admin/clientes/${lead.cliente_id}`);
  }

  const novoCliente = {
    nome: lead.nome,
    email: lead.email,
    telefone: lead.whatsapp || (lead.telefone ? soDigitos(lead.telefone) : null),
    endereco: lead.endereco,
    cep: lead.cep,
    cidade_uf: [lead.cidade, lead.estado].filter(Boolean).join("/"),
    desconto_percentual: 20,
    ativo: true,
    observacoes: `Convertido do lead ${lead.nome}${lead.bairro ? ` (${lead.bairro})` : ""}.`,
  };

  const { data: cli, error } = await supabase.from("clientes").insert(novoCliente).select("id").single();
  if (error) throw new Error(error.message);

  await supabase.from("leads").update({ cliente_id: cli!.id, status_lead: "VENDA_REALIZADA" }).eq("id", id);
  await logEvento(id, "CONVERTIDO_EM_CLIENTE", { cliente_id: cli!.id });

  revalidatePath("/admin/leads");
  revalidatePath("/admin/clientes");
  redirect(`/admin/clientes/${cli!.id}`);
}

export async function excluirLead(id: string) {
  await exigirAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/leads");
  redirect("/admin/leads");
}
