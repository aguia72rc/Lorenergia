import { formatBRL } from "@/lib/format";

export interface PontoFaturamento {
  label: string; // ex.: "ago/26"
  faturado: number; // R$ emitido no mês (exceto canceladas)
  recebido: number; // R$ recebido no mês (faturas pagas)
}

const COR_FATURADO = "#ffca3a"; // brand (faturado/emitido)
const COR_RECEBIDO = "#4ade80"; // eco-400 (recebido/pago)
const COR_TINTA = "#94a3b8"; // slate-400 (rótulos)
const COR_BASE = "rgba(255,255,255,0.14)"; // linha de base

/**
 * Gráfico de barras agrupadas: faturamento emitido vs. recebido por mês (R$).
 * SVG inline, sem dependências. Duas séries ⇒ legenda para nomeá-las.
 */
export default function FaturamentoChart({
  dados,
  altura = 220,
  textoVazio = "Ainda não há faturamento para exibir.",
}: {
  dados: PontoFaturamento[];
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

  const maxValor = Math.max(...dados.map((d) => Math.max(d.faturado, d.recebido)), 1);
  const passo = (W - padX * 2) / dados.length;
  const larguraBarra = Math.min(20, passo * 0.28);
  const gap = Math.min(4, passo * 0.06);

  const rotuloTopo = (v: number) =>
    v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v).toString();

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-slate-300">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: COR_FATURADO }} /> Faturado
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: COR_RECEBIDO }} /> Recebido
        </span>
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          role="img"
          aria-label="Gráfico de faturamento emitido e recebido por mês"
          style={{ minWidth: dados.length > 8 ? 640 : undefined }}
        >
          <line x1={padX} y1={baseY} x2={W - padX} y2={baseY} stroke={COR_BASE} strokeWidth={2} />

          {dados.map((d, i) => {
            const centro = padX + i * passo + passo / 2;
            const xFat = centro - larguraBarra - gap / 2;
            const xRec = centro + gap / 2;
            const hFat = Math.max(2, (d.faturado / maxValor) * areaAltura);
            const hRec = Math.max(2, (d.recebido / maxValor) * areaAltura);
            return (
              <g key={i}>
                <g>
                  <title>{`${d.label} · Faturado: ${formatBRL(d.faturado)}`}</title>
                  <rect x={xFat} y={baseY - hFat} width={larguraBarra} height={hFat} rx={3} fill={COR_FATURADO} />
                  <text x={xFat + larguraBarra / 2} y={baseY - hFat - 6} textAnchor="middle" fontSize={10} fontWeight={600} fill={COR_TINTA}>
                    {rotuloTopo(d.faturado)}
                  </text>
                </g>
                <g>
                  <title>{`${d.label} · Recebido: ${formatBRL(d.recebido)}`}</title>
                  <rect x={xRec} y={baseY - hRec} width={larguraBarra} height={hRec} rx={3} fill={COR_RECEBIDO} />
                  <text x={xRec + larguraBarra / 2} y={baseY - hRec - 6} textAnchor="middle" fontSize={10} fontWeight={600} fill={COR_TINTA}>
                    {rotuloTopo(d.recebido)}
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
