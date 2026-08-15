"use client";

import { useState } from "react";

const ARCHIVO = "'Archivo', sans-serif";
function brl(n: number) {
  return "R$ " + Math.round(n).toLocaleString("pt-BR");
}

/** Calculadora interativa: arraste a fatura e veja a economia (20%). */
export default function CalculadoraEconomia() {
  const [fatura, setFatura] = useState(350);
  const mes = fatura * 0.2;

  return (
    <section className="lp-sec" style={{ maxWidth: 1180, margin: "0 auto", padding: "96px 28px 0" }}>
      <div
        className="lp-grid lp-pad"
        style={{
          background: "#0B1017",
          borderRadius: 26,
          padding: 56,
          color: "#FFF6E3",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 56,
          alignItems: "center",
        }}
      >
        <div>
          <h2 className="lp-h2" style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 38, lineHeight: 1.08, letterSpacing: "-.03em", margin: "0 0 14px" }}>
            Quanto sobra no seu bolso?
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: "rgba(255,246,227,.65)", margin: "0 0 34px" }}>
            Arraste até o valor médio da sua fatura da Neoenergia.
          </p>
          <div style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 46, letterSpacing: "-.03em", marginBottom: 18 }}>
            {brl(fatura)}
            <span style={{ fontSize: 20, fontWeight: 600, color: "rgba(255,246,227,.5)" }}> /mês hoje</span>
          </div>
          <input
            type="range"
            min={150}
            max={800}
            step={10}
            value={fatura}
            onChange={(e) => setFatura(Number(e.target.value))}
            style={{ width: "100%", height: 30 }}
            aria-label="Valor médio da sua fatura"
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "rgba(255,246,227,.45)", marginTop: 2 }}>
            <span>R$150</span>
            <span>R$800</span>
          </div>
        </div>
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ background: "rgba(255,178,26,.14)", border: "1px solid rgba(255,178,26,.35)", borderRadius: 16, padding: "24px 26px" }}>
            <div style={{ fontSize: 14, color: "#FFD98A", marginBottom: 6 }}>Economia por mês</div>
            <div style={{ fontFamily: ARCHIVO, fontWeight: 900, fontSize: 44, color: "#FFB21A", letterSpacing: "-.03em" }}>{brl(mes)}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ background: "rgba(255,246,227,.06)", borderRadius: 16, padding: "22px 24px" }}>
              <div style={{ fontSize: 14, color: "rgba(255,246,227,.6)", marginBottom: 6 }}>Por ano</div>
              <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 28 }}>{brl(mes * 12)}</div>
            </div>
            <div style={{ background: "rgba(255,246,227,.06)", borderRadius: 16, padding: "22px 24px" }}>
              <div style={{ fontSize: 14, color: "rgba(255,246,227,.6)", marginBottom: 6 }}>Em 5 anos</div>
              <div style={{ fontFamily: ARCHIVO, fontWeight: 800, fontSize: 28 }}>{brl(mes * 60)}</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,246,227,.45)", lineHeight: 1.5 }}>
            Estimativa com desconto de 20% sobre o consumo em kWh. O valor exato depende do seu perfil de consumo.
          </div>
        </div>
      </div>
    </section>
  );
}
