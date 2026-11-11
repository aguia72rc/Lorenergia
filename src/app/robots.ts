import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** O Google pode ler as páginas públicas; as áreas com login ficam de fora. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/portal", "/fatura", "/proposta", "/login", "/auth"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
