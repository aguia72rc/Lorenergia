import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Páginas públicas, para o Google encontrar. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/simulador`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/privacidade`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
