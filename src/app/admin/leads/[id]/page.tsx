import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calculator } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatBRL, formatKwh } from "@/lib/format";
import {
  STATUS_LEAD_LABEL, STATUS_LEAD_COR, STATUS_CONTATO_LABEL, SEGMENTO_LABEL, SEGMENTO_COR,
  consumoLead, comissaoLead, economiaLead, proximoStatus,
} from "@/lib/leads";
import { avancarStatus, registrarContato, converterEmCliente, salvarObservacaoLead, excluirLead } from "../actions";
import type { Lead, LeadEvento } from "@/lib/types";

export const dynamic = "force-dynamic";

function Badge({ texto, cor }: { texto: string; cor: string }) {
  return <span className="badge" style={{ background: `${cor}22`, color: cor, border: `1px solid ${cor}33` }}>{texto}</span>;
}
function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-sm text-slate-200">{children}</div>
    </div>
  );
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data }, { data: evs }] = await Promise.all([
    supabase.from("leads").select("*").eq("id", id).single(),
    supabase.from("lead_eventos").select("*").eq("lead_id", id).order("created_at", { ascending: false }).limit(12),
  ]);
  if (!data) notFound();
  const l = data as Lead;
  const eventos = (evs ?? []) as LeadEvento[];
  const prox = proximoStatus(l.status_lead);
  const geo = l.latitude != null && l.longitude != null;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link href="/admin/leads" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Central de Leads
        </Link>
        <Link href={`/proposta/${l.id}`} className="btn-primary">
          <Calculator className="h-4 w-4" /> Simular / Proposta
        </Link>
      </div>

      <div className="card">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Badge texto={SEGMENTO_LABEL[l.segmento]} cor={SEGMENTO_COR[l.segmento]} />
          <Badge texto={STATUS_LEAD_LABEL[l.status_lead]} cor={STATUS_LEAD_COR[l.status_lead]} />
          {l.cliente_id && <span className="badge bg-eco-500/15 text-eco-300">✓ Já é cliente</span>}
        </div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>{l.nome}</h1>
        <p className="text-sm text-slate-400">{[l.subsegmento, l.bairro, `${l.cidade}/${l.estado}`].filter(Boolean).join(" · ")}</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Info label="Endereço">{l.endereco ? `${l.endereco}${l.numero ? ", " + l.numero : ""}${l.cep ? " — " + l.cep : ""}` : "—"}</Info>
          <Info label="WhatsApp / Telefone">
            {l.whatsapp ? <a href={`https://wa.me/${l.whatsapp}`} target="_blank" rel="noopener" className="text-brand-300">📱 {l.whatsapp}</a> : (l.telefone || "—")}
          </Info>
          <Info label="E-mail">{l.email ? <a href={`mailto:${l.email}`} className="text-brand-300">{l.email}</a> : "—"}</Info>
          <Info label="Consumo (est.)">{formatKwh(consumoLead(l))}</Info>
          <Info label="Comissão potencial"><span className="font-semibold text-eco-300">{formatBRL(comissaoLead(l))}</span> <span className="text-[10px] text-slate-500">(kWh × R$ 0,50)</span></Info>
          <Info label="Economia estimada">{formatBRL(economiaLead(l))}</Info>
          <Info label="Score">{l.lead_score}/100</Info>
          <Info label="Prioridade">{l.prioridade_operacional}/100</Info>
          <Info label="Status contato">{STATUS_CONTATO_LABEL[l.status_contato]} · {l.tentativas_contato} tent.</Info>
          <Info label="Fonte">{l.fonte_dados}</Info>
          <Info label="Website">{l.website ? <a href={l.website} target="_blank" rel="noopener" className="text-brand-300">site</a> : "—"}</Info>
          <Info label="Criado em">{new Date(l.created_at).toLocaleDateString("pt-BR")}</Info>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {prox && (
            <form action={avancarStatus.bind(null, l.id, prox)}>
              <button className="btn-primary">▶ {STATUS_LEAD_LABEL[prox]}</button>
            </form>
          )}
          <form action={registrarContato.bind(null, l.id)}>
            <button className="btn-outline">📞 Registrar contato</button>
          </form>
          {!l.cliente_id ? (
            <form action={converterEmCliente.bind(null, l.id)}>
              <button className="btn-eco">✅ Converter em cliente</button>
            </form>
          ) : (
            <Link href={`/admin/clientes/${l.cliente_id}`} className="btn-eco">Abrir cliente →</Link>
          )}
          {geo && <a href={`https://www.google.com/maps/dir/?api=1&destination=${l.latitude},${l.longitude}`} target="_blank" rel="noopener" className="btn-outline">🧭 Navegar</a>}
          {geo && <a href={`https://waze.com/ul?ll=${l.latitude},${l.longitude}&navigate=yes`} target="_blank" rel="noopener" className="btn-outline">🚗 Waze</a>}
        </div>
      </div>

      <div className="card">
        <h3 className="mb-3 font-semibold text-white">Observações</h3>
        <form action={salvarObservacaoLead.bind(null, l.id)} className="flex gap-2">
          <input name="observacoes" className="input" defaultValue={l.observacoes ?? ""} placeholder="Anotação sobre o lead..." />
          <button className="btn-outline shrink-0">Salvar</button>
        </form>
      </div>

      <div className="card">
        <h3 className="mb-3 font-semibold text-white">🕓 Histórico</h3>
        {eventos.length === 0 ? (
          <p className="text-sm text-slate-400">Sem eventos registrados ainda.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {eventos.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 py-2 text-xs">
                <span className="text-slate-300">{e.evento}</span>
                <span className="text-slate-500">{new Date(e.created_at).toLocaleString("pt-BR")}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <form action={excluirLead.bind(null, l.id)} className="text-right">
        <button className="btn-danger !py-1.5 text-xs">🗑️ Excluir lead</button>
      </form>
    </div>
  );
}
