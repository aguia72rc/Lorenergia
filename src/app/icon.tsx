import { ImageResponse } from "next/og";

// Favicon gerado: sol dourado sobre fundo escuro (identidade Lorenergia).
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#05070d",
          borderRadius: 8,
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: "radial-gradient(circle at 35% 30%, #ffd24a, #f59e0b 60%, #b45309)",
            boxShadow: "0 0 10px 2px rgba(255,176,32,0.8)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
