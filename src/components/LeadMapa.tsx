"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef } from "react";
import { SEGMENTO_COR } from "@/lib/leads";
import type { SegmentoLead } from "@/lib/types";

export interface PontoMapa {
  nome: string;
  lat: number;
  lng: number;
  segmento: SegmentoLead;
  comissao: number;
  bairro?: string | null;
}

declare global {
  interface Window { L?: any }
}

/** Carrega o Leaflet (CSS + JS) sob demanda, uma única vez. */
function carregarLeaflet(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("no window"));
    if (window.L) return resolve(window.L);
    if (!document.querySelector("link[data-leaflet]")) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.setAttribute("data-leaflet", "1");
      document.head.appendChild(link);
    }
    const existente = document.querySelector("script[data-leaflet]") as HTMLScriptElement | null;
    if (existente) {
      existente.addEventListener("load", () => resolve(window.L));
      if (window.L) resolve(window.L);
      return;
    }
    const s = document.createElement("script");
    s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.setAttribute("data-leaflet", "1");
    s.onload = () => resolve(window.L);
    s.onerror = () => reject(new Error("Falha ao carregar o mapa"));
    document.head.appendChild(s);
  });
}

/** Mapa de leads (Leaflet). Renderiza só os leads com coordenadas. */
export default function LeadMapa({ pontos }: { pontos: PontoMapa[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    let cancelado = false;
    carregarLeaflet()
      .then((L) => {
        if (cancelado || !ref.current) return;
        if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
        const m = L.map(ref.current, { center: [-8.055, -34.9], zoom: 12 });
        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(m);
        pontos.forEach((p) => {
          const cor = SEGMENTO_COR[p.segmento] || "#34d399";
          L.circleMarker([p.lat, p.lng], {
            radius: Math.max(5, Math.min(12, p.comissao / 1000)),
            color: cor, fillColor: cor, fillOpacity: 0.8, weight: 2,
          }).bindPopup(`<b>${p.nome}</b>${p.bairro ? "<br>" + p.bairro : ""}`).addTo(m);
        });
        mapRef.current = m;
      })
      .catch(() => {});
    return () => { cancelado = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [pontos]);

  return <div ref={ref} style={{ width: "100%", height: 420, borderRadius: 12, border: "1px solid rgba(255,255,255,.1)", overflow: "hidden" }} />;
}
