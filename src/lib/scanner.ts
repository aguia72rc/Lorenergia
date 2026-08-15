import type { SegmentoLead } from "@/lib/types";

/** Coordenadas (centro) das cidades de PE atendidas pelo scanner. */
export const CIDADES_PE: Record<string, [number, number]> = {
  "Recife": [-8.0476, -34.877],
  "Olinda": [-8.0089, -34.8553],
  "Paulista": [-7.9407, -34.8728],
  "Jaboatão dos Guararapes": [-8.1121, -35.0148],
  "Camaragibe": [-8.0233, -34.9817],
  "Cabo de Santo Agostinho": [-8.2116, -35.0347],
  "Ipojuca": [-8.3996, -35.0637],
  "Igarassu": [-7.8342, -34.9064],
  "Abreu e Lima": [-7.9019, -34.899],
  "São Lourenço da Mata": [-8.0025, -35.0178],
  "Carpina": [-7.851, -35.254],
  "Limoeiro": [-7.8747, -35.4472],
  "Goiana": [-7.5601, -35.0025],
  "Vitória de Santo Antão": [-8.1188, -35.2911],
  "Caruaru": [-8.2837, -35.9759],
  "Gravatá": [-8.2011, -35.5644],
  "Belo Jardim": [-8.3357, -36.4247],
  "Santa Cruz do Capibaribe": [-7.9575, -36.205],
  "Garanhuns": [-8.8828, -36.4966],
  "Arcoverde": [-8.4186, -37.0538],
  "Serra Talhada": [-7.9925, -38.2983],
  "Salgueiro": [-8.0744, -39.1296],
  "Petrolina": [-9.3891, -40.5027],
};
export const CIDADES_LISTA = Object.keys(CIDADES_PE);

export interface OsmElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/** Consumo médio estimado (kWh/mês) por categoria — modelo simplificado. */
const CONSUMO_CATEGORIA: Record<string, number> = {
  mall: 8000, supermarket: 6000, department_store: 5000, wholesale: 5000,
  hospital: 5000, clinic: 2500, hotel: 3500, motel: 2500,
  restaurant: 2200, fast_food: 2000, food_court: 2500, bar: 1500, pub: 1600, cafe: 1500, ice_cream: 1200,
  bakery: 1800, butcher: 1600, greengrocer: 1400, convenience: 1400, marketplace: 2500,
  pharmacy: 1300, chemist: 1300, bank: 1400, fuel: 1600, car_repair: 1500, car_wash: 1400,
  car: 1800, hardware: 1600, furniture: 1500, doityourself: 1800, electronics: 1500,
  clothes: 1000, shoes: 900, jewelry: 900, optician: 900, hairdresser: 800, beauty: 900,
  laundry: 1400, gym: 2500, fitness_centre: 2500,
  industrial: 8000, works: 9000, factory: 9000, warehouse: 4000, craft: 1500,
  office: 1200, shop: 900,
};

/** Classifica o segmento a partir das tags do OSM. */
export function classificarSegmento(tags: Record<string, string>): SegmentoLead {
  if (
    tags.landuse === "industrial" ||
    tags.building === "industrial" ||
    tags.building === "warehouse" ||
    tags.man_made === "works" ||
    tags.industrial ||
    tags.craft
  ) return "INDUSTRIAL";
  return "COMERCIAL";
}

export function subsegmentoDe(tags: Record<string, string>): string {
  return (
    tags.shop || tags.amenity || tags.office || tags.craft ||
    (tags.landuse === "industrial" ? "industrial" : "") ||
    (tags.building === "industrial" ? "industrial" : "") ||
    (tags.man_made === "works" ? "fábrica" : "") ||
    "estabelecimento"
  );
}

/** Estima o consumo (kWh/mês) pela categoria da tag. */
export function estimarConsumo(tags: Record<string, string>, segmento: SegmentoLead): number {
  const chave =
    tags.shop || tags.amenity || tags.office || tags.craft ||
    (tags.landuse === "industrial" ? "industrial" : "") ||
    (tags.building === "industrial" ? "industrial" : "") ||
    (tags.building === "warehouse" ? "warehouse" : "") ||
    (tags.man_made === "works" ? "works" : "");
  return CONSUMO_CATEGORIA[chave] ?? (segmento === "INDUSTRIAL" ? 7000 : 700);
}

/** Score determinístico (0–100) a partir de consumo, contato e segmento. */
export function calcularScore(opts: { consumo: number; temContato: boolean; segmento: SegmentoLead; temSite: boolean; temEndereco: boolean }): number {
  let s = Math.min(60, Math.round(opts.consumo / 130));
  if (opts.temContato) s += 15;
  if (opts.segmento === "INDUSTRIAL") s += 10;
  if (opts.temSite) s += 5;
  if (opts.temEndereco) s += 5;
  return Math.max(0, Math.min(100, s));
}

/** Monta a query Overpass QL para comércio/indústria num raio ao redor do centro. */
export function construirQueryOverpass(lat: number, lng: number, raioM: number, limite = 200): string {
  const a = `(around:${Math.round(raioM)},${lat},${lng})`;
  return `[out:json][timeout:20];
(
  node["shop"]${a};
  node["office"]${a};
  node["craft"]${a};
  node["amenity"~"^(restaurant|cafe|fast_food|food_court|bar|pub|ice_cream|bakery|pharmacy|bank|fuel|marketplace|clinic|hospital|hotel|motel|car_wash|car_repair|gym|fitness_centre)$"]${a};
  node["man_made"="works"]${a};
  way["shop"]${a};
  way["man_made"="works"]${a};
  way["building"="industrial"]${a};
  way["building"="warehouse"]${a};
  way["landuse"="industrial"]${a};
);
out center tags ${limite};`;
}
