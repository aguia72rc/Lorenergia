import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = "https://lorenergia.vercel.app";
const DESCRICAO =
  "Energia solar compartilhada no seu prédio: até 20% de desconto na conta de luz, faturas transparentes e acompanhamento da sua economia em tempo real.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Lorenergia — Energia solar mais barata",
    template: "%s · Lorenergia",
  },
  description: DESCRICAO,
  keywords: [
    "energia solar",
    "geração compartilhada",
    "Lei 14.300",
    "desconto na conta de luz",
    "energia limpa",
    "Lorenergia",
  ],
  applicationName: "Lorenergia",
  authors: [{ name: "Lorenergia" }],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE_URL,
    siteName: "Lorenergia",
    title: "Lorenergia — Energia solar mais barata",
    description: DESCRICAO,
  },
  twitter: {
    card: "summary_large_image",
    title: "Lorenergia — Energia solar mais barata",
    description: DESCRICAO,
  },
};

export const viewport: Viewport = {
  themeColor: "#05070d",
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
