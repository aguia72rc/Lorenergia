"use client";

import { useState } from "react";

const ARCHIVO = "'Archivo', sans-serif";

/** Lista de perguntas frequentes com accordion (uma aberta por vez). */
export default function FaqLista({ faqs }: { faqs: { q: string; a: string }[] }) {
  const [aberta, setAberta] = useState(0);

  return (
    <section className="lp-sec" style={{ maxWidth: 900, margin: "0 auto", padding: "96px 28px 0" }}>
      <h2 className="lp-h2" style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 40, letterSpacing: "-.03em", margin: "0 0 32px", textAlign: "center" }}>
        Perguntas frequentes
      </h2>
      <div style={{ display: "grid", gap: 10 }}>
        {faqs.map((f, i) => {
          const open = aberta === i;
          return (
            <div key={i} style={{ background: "#FFFFFF", border: "1px solid #EAE2D4", borderRadius: 14, overflow: "hidden" }}>
              <button
                type="button"
                onClick={() => setAberta(open ? -1 : i)}
                aria-expanded={open}
                style={{
                  width: "100%",
                  textAlign: "left",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 20,
                  padding: "22px 26px",
                  cursor: "pointer",
                  fontFamily: ARCHIVO,
                  fontWeight: 600,
                  fontSize: 18,
                  letterSpacing: "-.01em",
                  color: "#0B1017",
                  background: open ? "#FFFBF2" : "#FFFFFF",
                  border: "none",
                }}
              >
                <span>{f.q}</span>
                <span style={{ flex: "none", width: 26, height: 26, borderRadius: 99, background: "#FFF0D2", color: "#B8801A", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {open ? "−" : "+"}
                </span>
              </button>
              {open && (
                <div style={{ padding: "0 26px 24px", fontSize: 16.5, lineHeight: 1.6, color: "#4A5361" }}>{f.a}</div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
