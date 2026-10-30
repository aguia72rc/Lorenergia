import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Sun } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import SimuladorPublico from "@/components/SimuladorPublico";
import { getResumoPublico } from "@/lib/resumo-publico";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Simulador de economia",
  description: "Descubra em segundos quanto você pode economizar na conta de luz com o rateio de créditos de energia solar da Lorenergia.",
};

interface PlanoRow { codigo: string; nome: string; desconto_percentual: number }

export default async function SimuladorPage() {
  // Planos são RLS admin-only; o simulador público lê via service role.
  const { data } = await createAdminClient()
    .from("planos_cota").select("codigo, nome, desconto_percentual").eq("ativo", true)
    .order("desconto_percentual", { ascending: false });
  const planos = ((data ?? []) as PlanoRow[]).map((p) => ({ codigo: p.codigo, nome: p.nome, desconto: Number(p.desconto_percentual) }));

  const resumo = await getResumoPublico();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Voltar ao site
        </Link>
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
          <Sun className="h-5 w-5 text-brand-400" /> Lorenergia
        </span>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
          Quanto da sua conta de luz pode voltar para o seu bolso?
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Em segundos você descobre o valor que deixa de pagar todo mês, sem obra, sem instalar nada e sem mensalidade. Basta informar o seu consumo. É grátis e sem compromisso.
        </p>
      </div>

      <SimuladorPublico planos={planos} prova={resumo ? { economiaTotal: resumo.economiaTotal, familias: resumo.familias } : null} />

      <p className="mt-8 text-center text-xs text-slate-500">
        A economia mostrada é uma estimativa com base no consumo informado e na tarifa vigente, e não uma garantia de desconto.
      </p>
    </main>
  );
}
