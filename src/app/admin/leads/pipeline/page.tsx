import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatBRL, formatKwh } from "@/lib/format";
import {
  COLUNAS_PIPELINE, STATUS_LEAD_LABEL, STATUS_LEAD_COR, SEGMENTO_LABEL,
  consumoLead, comissaoLead, proximoStatus,
} from "@/lib/leads";
import { avancarStatus } from "../actions";
import type { Lead } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const supabase = createClient();
  const { data } = await supabase.from("leads").select("*").order("lead_score", { ascending: false });
  const leads = (data ?? []) as Lead[];

  return (
    <div className="space-y-4">
      <Link href="/admin/leads" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Central de Leads
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>Pipeline comercial</h1>
        <p className="text-sm text-slate-400">Avance os leads pelo funil. O botão ▶ leva ao próximo estágio válido.</p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUNAS_PIPELINE.map((col) => {
          const doCol = leads.filter((l) => l.status_lead === col);
          const cor = STATUS_LEAD_COR[col];
          return (
            <div key={col} className="w-56 shrink-0">
              <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: cor }}>
                {STATUS_LEAD_LABEL[col]}
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-300">{doCol.length}</span>
              </h4>
              <div className="space-y-2">
                {doCol.map((l) => {
                  const prox = proximoStatus(l.status_lead);
                  return (
                    <div key={l.id} className="card !p-3">
                      <Link href={`/admin/leads/${l.id}`} className="block">
                        <p className="text-sm font-semibold text-white">{l.nome}</p>
                        <p className="mt-0.5 flex justify-between text-[11px] text-slate-400">
                          <span>{SEGMENTO_LABEL[l.segmento]}</span>
                          <span>{l.bairro || ""}</span>
                        </p>
                        <p className="mt-1 text-[11px] font-semibold text-eco-300">{formatKwh(consumoLead(l))} · {formatBRL(comissaoLead(l))}</p>
                      </Link>
                      {prox && (
                        <form action={avancarStatus.bind(null, l.id, prox)} className="mt-2">
                          <button type="submit" className="w-full rounded-lg border border-white/10 bg-white/5 py-1 text-[11px] text-slate-200 hover:bg-white/10">
                            ▶ {STATUS_LEAD_LABEL[prox]}
                          </button>
                        </form>
                      )}
                    </div>
                  );
                })}
                {doCol.length === 0 && <p className="px-1 text-[11px] text-slate-600">—</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
