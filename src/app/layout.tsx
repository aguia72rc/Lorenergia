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

// Aplica o tema salvo (ou a preferência do sistema) antes da primeira pintura,
// evitando "flash" do tema errado ao carregar a página.
const SCRIPT_TEMA = `(function(){try{var t=localStorage.getItem('tema');if(t!=='light'&&t!=='dark'){t=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches)?'light':'dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800;900&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
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
