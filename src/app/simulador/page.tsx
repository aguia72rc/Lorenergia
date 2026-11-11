import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import SimuladorPublico from "@/components/SimuladorPublico";
import CabecalhoPublico from "@/components/landing/CabecalhoPublico";
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
    <main className="lp" style={{ fontFamily: "'IBM Plex Sans',system-ui,sans-serif", color: "#0B1017", background: "#FBF7F0", minHeight: "100vh" }}>
      <CabecalhoPublico
        titulo="Quanto da sua conta de luz pode voltar para o seu bolso?"
        subtitulo="Em segundos você descobre o valor que deixa de pagar todo mês, sem obra, sem instalar nada e sem mensalidade. Basta informar o seu consumo. É grátis e sem compromisso."
      />
      <div className="lp-sec" style={{ maxWidth: "860px", margin: "0 auto", padding: "36px 28px 72px" }}>
        <SimuladorPublico planos={planos} prova={resumo ? { economiaTotal: resumo.economiaTotal, familias: resumo.familias } : null} />
        <p style={{ margin: "28px 0 0", textAlign: "center", fontSize: "13px", color: "#7A8493" }}>
          A economia mostrada é uma estimativa com base no consumo informado e na tarifa vigente, e não uma garantia de desconto.
        </p>
      </div>
    </main>
  );
}
