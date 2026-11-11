import CalculadoraEconomia from "@/components/CalculadoraEconomia";
import FaqLista from "@/components/FaqLista";
import { getResumoPublico } from "@/lib/resumo-publico";
import { FAMILIAS_PADRAO, faqs } from "@/content/landing";
import {
  FaixaTopo,
  Hero,
  Dores,
  ComoFunciona,
  Beneficios,
  Oferta,
  Objecoes,
  Garantia,
  Capacidade,
  ChamadaFinal,
  Rodape,
} from "@/components/landing/Secoes";

// Página em cache, refeita no máximo a cada hora (os números de economia e de famílias
// mudam só quando faturas são publicadas). Quem está logado é desviado antes, no proxy.
export const revalidate = 3600;

// Perguntas frequentes em formato que o Google entende (pode exibir as respostas na busca).
const faqJsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
}).replace(/</g, "\\u003c");

export default async function HomePage() {
  const resumo = await getResumoPublico();

  return (
    <main className="lp" style={{ fontFamily: "'IBM Plex Sans',system-ui,sans-serif", color: "#0B1017", background: "#FBF7F0" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd }} />
      <FaixaTopo />
      <Hero familias={resumo?.familias ?? FAMILIAS_PADRAO} resumo={resumo} />
      <Dores />
      <ComoFunciona />
      <CalculadoraEconomia />
      <Beneficios />
      <Oferta />
      <Objecoes />
      <Garantia />
      <Capacidade />
      <FaqLista faqs={faqs} />
      <ChamadaFinal />
      <Rodape />
    </main>
  );
}
