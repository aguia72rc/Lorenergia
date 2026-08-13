import { ImageResponse } from "next/og";

// Poster do vídeo da home (16:9), gerado sem asset externo.
// Referenciado em <video poster="/video-poster">. O ImageResponse já
// devolve o content-type image/png.
export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a0f1e 0%, #05070d 60%, #071019 100%)",
          color: "#e8edf6",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "radial-gradient(circle at 35% 30%, #ffd24a, #f59e0b 60%, #b45309)",
            boxShadow: "0 0 80px 12px rgba(255,176,32,0.5)",
            fontSize: 52,
          }}
        >
          ▶
        </div>
        <div style={{ marginTop: 28, fontSize: 40, fontWeight: 800 }}>Conheça a Lorenergia</div>
        <div style={{ marginTop: 8, fontSize: 22, color: "#93a1bd" }}>Energia solar mais barata ☀️</div>
      </div>
    ),
    { width: 1280, height: 720 }
  );
}
