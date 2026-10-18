/** Cabeçalhos de segurança aplicados a todas as rotas. */
const securityHeaders = [
  // Só HTTPS por 1 ano (sem includeSubDomains/preload: não afeta outros subdomínios).
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  // Impede que o site seja aberto dentro de outro (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // O navegador não "adivinha" o tipo de arquivo.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Links externos recebem só o domínio de origem, sem o caminho (ex.: /fatura/<id>).
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // O site não usa câmera, microfone, localização nem pagamento do navegador.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Não anuncia "X-Powered-By: Next.js".
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

module.exports = nextConfig;
