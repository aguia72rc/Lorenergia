import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lorenergia — Energia Solar",
  description:
    "Sistema de gestão e distribuição de energia solar: cadastro de moradores, cálculo de consumo, faturas e economia.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {/* Fundo animado global (aurora + grid) */}
        <div className="aurora" aria-hidden>
          <div className="grid-lines" />
        </div>
        {children}
      </body>
    </html>
  );
}
