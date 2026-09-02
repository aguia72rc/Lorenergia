import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { consumoLead } from "@/lib/leads";
import PropostaInterna, { type LeadResumido, type ParamsIniciais } from "@/components/PropostaInterna";
import type { Lead, Configuracoes } from "@/lib/types";
import type { PlanoDesconto } from "@/lib/simulador";

export const dynamic = "force-dynamic";

/** Mapeia a linha do banco para os campos editáveis da proposta. */
function paramsIniciais(p: Record<string, number | null>): ParamsIniciais {
  return {
    tusd: Number(p.tusd ?? p.tarifa_tusd_te ?? 0),
    te: Number(p.te ?? 0),
    bandeira: 0,
    iluminacao: Number(p.cip ?? 0),
    icmsPct: Number(p.icms ?? 0) * 100,
    pisPct: 0,
    cofinsPct: Number(p.pis_cofins ?? 0) * 100,
  };
}

export default async function PropostaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessao = await getSessao();
  if (!sessao) redirect(`/login?redirect=/proposta/${id}`);
  if (sessao.profile?.role !== "admin") redirect("/portal");

  const db = await createClient();
  const [{ data: lead }, { data: parametros }, { data: planos }, { data: cfg }] = await Promise.all([
    db.from("leads").select("*").eq("id", id).single(),
    db.from("parametros_energia").select("*").order("vigente_desde", { ascending: false }).limit(1).maybeSingle(),
    db.from("planos_cota").select("*").eq("ativo", true).order("desconto_percentual", { ascending: false }),
    db.from("configuracoes").select("nome_usina").eq("id", 1).single(),
  ]);

  if (!lead) notFound();
  const l = lead as Lead;

  const leadResumido: LeadResumido = {
    id: l.id,
    nome: l.nome,
    endereco: l.endereco ? `${l.endereco}${l.numero ? ", " + l.numero : ""}` : null,
    bairro: l.bairro,
    cidade: l.cidade,
    estado: l.estado,
    consumo: consumoLead(l),
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="no-print mb-5">
        <Link href={`/admin/leads/${l.id}`} className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Voltar ao lead
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>Simulador de proposta</h1>
        <p className="text-sm text-slate-400">Detalhamento completo e proposta em PDF para <strong className="text-slate-200">{l.nome}</strong>.</p>
      </div>

      {!parametros ? (
        <div className="card"><p className="text-sm text-amber-300">Parâmetros de energia ainda não configurados. Rode a migração do simulador e cadastre as premissas.</p></div>
      ) : (
        <PropostaInterna
          lead={leadResumido}
          paramsIniciais={paramsIniciais(parametros as Record<string, number | null>)}
          planos={(planos ?? []) as PlanoDesconto[]}
          nomeUsina={(cfg as Configuracoes | null)?.nome_usina ?? "Lorenergia"}
        />
      )}
    </div>
  );
}
