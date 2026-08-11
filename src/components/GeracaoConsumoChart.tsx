import { formatKwh } from "@/lib/format";

export interface PontoEnergia {
  label: string; // ex.: "ago/26"
  injetado: number; // kWh injetado na rede
  consumido: number; // kWh consumido
}

const COR_INJETADO = "#ffca3a"; // brand (sol)
const COR_CONSUMIDO = "#38bdf8"; // sky-400 (consumo)
const COR_TINTA = "#94a3b8"; // slate-400 (rótulos)
const COR_BASE = "rgba(255,255,255,0.14)"; // linha de base

/**
 * Gráfico de barras agrupadas: energia injetada vs. consumida por mês.
 * SVG inline, sem dependências. Duas séries ⇒ legenda para nomeá-las.
 */
export default function GeracaoConsumoChart({
  dados,
  altura = 220,
  textoVazio = "Ainda não há dados de geração e consumo para exibir.",
}: {
  dados: PontoEnergia[];
  altura?: number;
  textoVazio?: string;
}) {
  if (!dados || dados.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">{textoVazio}</p>;
  }

  const W = 640;
  const H = altura;
  const padTop = 24;
  const padBottom = 28;
  const padX = 12;
  const areaAltura = H - padTop - padBottom;
  const baseY = H - padBottom;

  const maxValor = Math.max(...dados.map((d) => Math.max(d.injetado, d.consumido)), 1);
  const passo = (W - padX * 2) / dados.length;
  const larguraBarra = Math.min(20, passo * 0.28);
  const gap = Math.min(4, passo * 0.06);

  const rotuloTopo = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v));

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-slate-300">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: COR_INJETADO }} /> Injetado
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: COR_CONSUMIDO }} /> Consumido
        </span>
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          role="img"
          aria-label="Gráfico de energia injetada e consumida por mês"
          style={{ minWidth: dados.length > 8 ? 640 : undefined }}
        >
          <line x1={padX} y1={baseY} x2={W - padX} y2={baseY} stroke={COR_BASE} strokeWidth={2} />

          {dados.map((d, i) => {
            const centro = padX + i * passo + passo / 2;
            const xInj = centro - larguraBarra - gap / 2;
            const xCon = centro + gap / 2;
            const hInj = Math.max(2, (d.injetado / maxValor) * areaAltura);
            const hCon = Math.max(2, (d.consumido / maxValor) * areaAltura);
            return (
              <g key={i}>
                <g>
                  <title>{`${d.label} · Injetado: ${formatKwh(d.injetado)}`}</title>
                  <rect x={xInj} y={baseY - hInj} width={larguraBarra} height={hInj} rx={3} fill={COR_INJETADO} />
                  <text x={xInj + larguraBarra / 2} y={baseY - hInj - 6} textAnchor="middle" fontSize={10} fontWeight={600} fill={COR_TINTA}>
                    {rotuloTopo(d.injetado)}
                  </text>
                </g>
                <g>
                  <title>{`${d.label} · Consumido: ${formatKwh(d.consumido)}`}</title>
                  <rect x={xCon} y={baseY - hCon} width={larguraBarra} height={hCon} rx={3} fill={COR_CONSUMIDO} />
                  <text x={xCon + larguraBarra / 2} y={baseY - hCon - 6} textAnchor="middle" fontSize={10} fontWeight={600} fill={COR_TINTA}>
                    {rotuloTopo(d.consumido)}
                  </text>
                </g>
                <text x={centro} y={baseY + 16} textAnchor="middle" fontSize={11} fill={COR_TINTA}>
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
