import { ImageResponse } from "next/og";

// Imagem de compartilhamento (WhatsApp, redes): card escuro com o sol,
// o nome e a proposta de valor. Gerada dinamicamente, sem asset externo.
export const alt = "Lorenergia — Energia solar mais barata";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px 80px",
          background: "linear-gradient(135deg, #0a0f1e 0%, #05070d 55%, #071019 100%)",
          color: "#e8edf6",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -160,
            left: -120,
            width: 460,
            height: 460,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,176,32,0.35), transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -180,
            right: -120,
            width: 460,
            height: 460,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(34,211,238,0.28), transparent 70%)",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "radial-gradient(circle at 35% 30%, #ffd24a, #f59e0b 60%, #b45309)",
              boxShadow: "0 0 60px 8px rgba(255,176,32,0.55)",
            }}
          />
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>Lorenergia</div>
        </div>

        <div
          style={{
            marginTop: 48,
            display: "flex",
            flexDirection: "column",
            fontSize: 76,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: -2,
            maxWidth: 900,
          }}
        >
          <span>Sua usina solar,</span>
          <span style={{ color: "#ffca3a" }}>no controle total.</span>
        </div>

        <div style={{ marginTop: 28, fontSize: 34, color: "#93a1bd", maxWidth: 900 }}>
          Até 20% de desconto na conta de luz, faturas transparentes e sua economia em tempo real.
        </div>

        <div style={{ marginTop: "auto", display: "flex", gap: 14, fontSize: 24, color: "#34d399" }}>
          <span>☀️ Energia limpa</span>
          <span style={{ color: "#6b7896" }}>•</span>
          <span>⚡ Lei 14.300/2022</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
