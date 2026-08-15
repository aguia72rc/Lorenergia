import Link from "next/link";
import { Target, Zap, Coins, Trophy, PiggyBank, Plus, KanbanSquare, BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatBRL, formatKwh } from "@/lib/format";
import { consumoLead, comissaoLead, economiaLead } from "@/lib/leads";
import LeadsCentral from "@/components/LeadsCentral";
import type { Lead } from "@/lib/types";

export const dynamic = "force-dynamic";

const QUALIFICADO = ["QUALIFICADO", "PRIORIZADO", "EM_CONTATO", "AGUARDANDO_RESPOSTA", "RESPONDEU", "INTERESSADO", "DOCUMENTACAO", "ENVIADO_FINDER"];

export default async function LeadsPage() {
  const supabase = createClient();
  const { data } = await supabase.from("leads").select("*").order("lead_score", { ascending: false });
  const leads = (data ?? []) as Lead[];

  const total = leads.length;
  const qualificados = leads.filter((l) => QUALIFICADO.includes(l.status_lead)).length;
  const consumoTotal = leads.reduce((s, l) => s + consumoLead(l), 0);
  const comissaoPotencial = leads
    .filter((l) => l.status_lead !== "DESCARTADO" && l.status_lead !== "SEM_INTERESSE")
    .reduce((s, l) => s + comissaoLead(l), 0);
  const economiaClientes = leads.reduce((s, l) => s + economiaLead(l), 0);
  const maior = leads.reduce<Lead | null>((m, l) => (!m || comissaoLead(l) > comissaoLead(m) ? l : m), null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>Central de Leads</h1>
          <p className="text-sm text-slate-400">Prospecção Lorenergia — {total} lead(s) no funil</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/leads/pipeline" className="btn-outline"><KanbanSquare className="h-4 w-4" /> Pipeline</Link>
          <Link href="/admin/leads/relatorios" className="btn-outline"><BarChart3 className="h-4 w-4" /> Relatórios</Link>
          <Link href="/admin/leads/novo" className="btn-primary"><Plus className="h-4 w-4" /> Novo lead</Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi icon={<Target />} titulo="Leads qualificados" valor={String(qualificados)} sub={`de ${total} leads`} cor="bg-blue-500/15 text-blue-300" />
        <Kpi icon={<Zap />} titulo="Consumo potencial" valor={formatKwh(consumoTotal)} sub="soma kWh/mês (est.)" cor="bg-amber-500/15 text-amber-300" />
        <Kpi icon={<Coins />} titulo="Comissão potencial" valor={formatBRL(comissaoPotencial)} sub="kWh × R$ 0,50" cor="bg-eco-500/15 text-eco-300" destaque />
        <Kpi icon={<Trophy />} titulo="Maior oportunidade" valor={maior ? formatBRL(comissaoLead(maior)) : "—"} sub={maior?.nome || "sem leads"} cor="bg-purple-500/15 text-purple-300" />
        <Kpi icon={<PiggyBank />} titulo="Economia p/ clientes" valor={formatBRL(economiaClientes)} sub="~20% de desconto est." cor="bg-eco-500/15 text-eco-300" />
      </div>

      <LeadsCentral leads={leads} />
    </div>
  );
}

function Kpi({ icon, titulo, valor, sub, cor, destaque }: { icon: React.ReactNode; titulo: string; valor: string; sub: string; cor: string; destaque?: boolean }) {
  return (
    <div className={`card ${destaque ? "ring-1 ring-eco-400/40" : ""}`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-slate-400">{titulo}</span>
        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${cor}`}>{icon}</span>
      </div>
      <p className="text-xl font-bold text-white">{valor}</p>
      <p className="mt-0.5 text-xs text-slate-500">{sub}</p>
    </div>
  );
}
