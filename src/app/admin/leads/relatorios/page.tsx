import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SEGMENTO_LABEL, SEGMENTO_COR, comissaoLead } from "@/lib/leads";
import LeadMapa, { type PontoMapa } from "@/components/LeadMapa";
import type { Lead, SegmentoLead } from "@/lib/types";

export const dynamic = "force-dynamic";

const QUALIF = ["QUALIFICADO", "PRIORIZADO", "EM_CONTATO", "AGUARDANDO_RESPOSTA", "RESPONDEU", "INTERESSADO", "DOCUMENTACAO", "ENVIADO_FINDER", "VENDA_REALIZADA"];
const INTERESSADOS = ["INTERESSADO", "DOCUMENTACAO", "ENVIADO_FINDER", "VENDA_REALIZADA"];

export default async function RelatoriosLeadsPage() {
  const supabase = createClient();
  const { data } = await supabase.from("leads").select("*");
  const leads = (data ?? []) as Lead[];

  // Funil (contagens reais)
  const funil = [
    { label: "Total", n: leads.filter((l) => !["DESCARTADO", "SEM_INTERESSE"].includes(l.status_lead)).length, cor: "#71717a" },
    { label: "Qualificados", n: leads.filter((l) => QUALIF.includes(l.status_lead)).length, cor: "#3b82f6" },
    { label: "Contatados", n: leads.filter((l) => Number(l.tentativas_contato) > 0).length, cor: "#a855f7" },
    { label: "Responderam", n: leads.filter((l) => l.status_contato === "RESPONDEU").length, cor: "#34d399" },
    { label: "Interessados", n: leads.filter((l) => INTERESSADOS.includes(l.status_lead)).length, cor: "#fbbf24" },
    { label: "Vendas", n: leads.filter((l) => l.status_lead === "VENDA_REALIZADA").length, cor: "#059669" },
  ];
  const funilMax = Math.max(...funil.map((f) => f.n), 1);

  // Segmentos
  const segs: SegmentoLead[] = ["COMERCIAL", "INDUSTRIAL", "RESIDENCIAL"];
  const porSeg = segs.map((s) => ({
    seg: s,
    total: leads.filter((l) => l.segmento === s).length,
    vendas: leads.filter((l) => l.segmento === s && l.status_lead === "VENDA_REALIZADA").length,
  }));
  const segMax = Math.max(...porSeg.map((s) => s.total), 1);

  // Mapa
  const pontos: PontoMapa[] = leads
    .filter((l) => l.latitude != null && l.longitude != null)
    .map((l) => ({ nome: l.nome, lat: Number(l.latitude), lng: Number(l.longitude), segmento: l.segmento, comissao: comissaoLead(l), bairro: l.bairro }));

  return (
    <div className="space-y-6">
      <Link href="/admin/leads" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Central de Leads
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>Relatórios de prospecção</h1>
        <p className="text-sm text-slate-400">Funil, segmentos e mapa dos leads da Lorenergia</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-4 font-semibold text-white">Funil de conversão</h3>
          <div className="space-y-3">
            {funil.map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <span className="w-28 text-sm text-slate-300">{f.label}</span>
                <div className="h-6 flex-1 overflow-hidden rounded-md bg-white/5">
                  <div className="flex h-full items-center justify-end rounded-md px-2 text-xs font-semibold text-white" style={{ width: `${Math.max(6, (f.n / funilMax) * 100)}%`, background: f.cor }}>
                    {f.n}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="mb-4 font-semibold text-white">Leads por segmento</h3>
          <div className="space-y-3">
            {porSeg.map((s) => (
              <div key={s.seg} className="flex items-center gap-3">
                <span className="w-24 text-sm text-slate-300">{SEGMENTO_LABEL[s.seg]}</span>
                <div className="h-6 flex-1 overflow-hidden rounded-md bg-white/5">
                  <div className="flex h-full items-center justify-end rounded-md px-2 text-xs font-semibold text-white" style={{ width: `${Math.max(6, (s.total / segMax) * 100)}%`, background: SEGMENTO_COR[s.seg] }}>
                    {s.total}
                  </div>
                </div>
                <span className="w-16 text-right text-xs text-eco-300">{s.vendas} venda(s)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-white">Mapa de leads</h3>
          <span className="text-xs text-slate-400">{pontos.length} com coordenadas · 🔵 Comercial · 🟢 Industrial · 🟡 Residencial</span>
        </div>
        {pontos.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Nenhum lead com coordenadas ainda. Informe latitude/longitude ao cadastrar o lead.</p>
        ) : (
          <LeadMapa pontos={pontos} />
        )}
      </div>
    </div>
  );
}
