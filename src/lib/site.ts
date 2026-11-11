// Endereço público do site (prévias de link, canonical, sitemap, imagem de compartilhamento).
// Segue NEXT_PUBLIC_SITE_URL (ex.: https://lorenergia.com.br); sem ela, usa o endereço da Vercel.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://lorenergia.vercel.app").replace(/\/+$/, "");
