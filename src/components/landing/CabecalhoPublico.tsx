import Link from "next/link";
import { AR } from "@/content/landing";

/**
 * Topo escuro das páginas públicas fora da landing (simulador, privacidade):
 * mesma marca e mesmo visual da página inicial, com título e subtítulo.
 */
export default function CabecalhoPublico({ titulo, subtitulo }: { titulo: string; subtitulo?: string }) {
  return (
    <section style={{ position: "relative", overflow: "hidden", background: "radial-gradient(120% 90% at 85% 0%, #1D2942 0%, #0B1017 58%)", color: "#FFF6E3" }}>
      <div className="lp-sec" style={{ position: "relative", maxWidth: "860px", margin: "0 auto", padding: "26px 28px 56px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "40px" }}>
          <Link href="/" aria-label="Lorenergia — página inicial" className="lp-marca" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ width: "34px", height: "34px", borderRadius: "9px", background: "linear-gradient(140deg,#FFB21A,#FF8A00)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: AR, fontWeight: "900", color: "#0B1017", fontSize: "19px" }}>L</span>
            <span style={{ fontFamily: AR, fontWeight: "800", fontSize: "20px", letterSpacing: "-.02em" }}>Lorenergia</span>
          </Link>
          <Link href="/" className="lp-enter" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 18px", borderRadius: "11px", fontFamily: AR, fontWeight: "700", fontSize: "15px" }}>← Voltar ao site</Link>
        </div>
        <h1 className="lp-h1" style={{ fontFamily: AR, fontWeight: "900", fontSize: "46px", lineHeight: "1.05", letterSpacing: "-.035em", margin: "0", textWrap: "balance" }}>{titulo}</h1>
        {subtitulo && (
          <p style={{ fontSize: "18px", lineHeight: "1.55", color: "rgba(255,246,227,.78)", margin: "18px 0 0", maxWidth: "640px", textWrap: "pretty" }}>{subtitulo}</p>
        )}
      </div>
    </section>
  );
}
