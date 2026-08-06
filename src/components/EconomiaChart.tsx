import { formatBRL } from "@/lib/format";

export interface PontoEconomia {
  label: string; // ex.: "ago/26"
  valor: number; // economia em R$
  referencia?: string; // YYYY-MM-DD (para destacar)
}

/**
 * Gráfico de barras da economia mensal (série única).
 * SVG inline, sem dependências — renderiza também na impressão/PDF.
 *
 * Design (guia dataviz): uma única série usa um só tom (verde eco), sem
 * legenda (o título já nomeia a série); rótulos e eixos em tinta neutra;
 * barras finas com topo arredondado ancoradas na linha de base.
 */
export default function EconomiaChart({
  dados,
  destaqueRef,
  altura = 200,
  cor = "#16a34a",
  ariaLabel = "Gráfico de economia mensal com energia solar",
  textoVazio = "Ainda não há dados de economia para exibir.",
}: {
  dados: PontoEconomia[];
  destaqueRef?: string;
  altura?: number;
  cor?: string;
  ariaLabel?: string;
  textoVazio?: string;
}) {
  if (!dados || dados.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">{textoVazio}</p>;
  }

  // Área de desenho (coordenadas internas; o SVG escala via viewBox).
  const W = 640;
  const H = altura;
  const padTop = 24; // espaço para os rótulos de valor
  const padBottom = 28; // espaço para os rótulos de mês
  const padX = 12;
  const areaAltura = H - padTop - padBottom;
  const baseY = H - padBottom;

  const maxValor = Math.max(...dados.map((d) => d.valor), 1);
  const passo = (W - padX * 2) / dados.length;
  const larguraBarra = Math.min(46, passo * 0.6);

  const corBarra = cor; // série única (verde por padrão)
  const corDestaque = "#eab308"; // brand-500 (mês em foco)
  const corTinta = "#64748b"; // slate-500 (rótulos)
  const corBase = "#e2e8f0"; // slate-200 (linha de base)

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={ariaLabel}
        style={{ minWidth: dados.length > 8 ? 640 : undefined }}
      >
        {/* Linha de base */}
        <line x1={padX} y1={baseY} x2={W - padX} y2={baseY} stroke={corBase} strokeWidth={2} />

        {dados.map((d, i) => {
          const h = Math.max(2, (d.valor / maxValor) * areaAltura);
          const x = padX + i * passo + (passo - larguraBarra) / 2;
          const y = baseY - h;
          const emFoco = destaqueRef && d.referencia === destaqueRef;
          return (
            <g key={i}>
              <title>{`${d.label}: ${formatBRL(d.valor)}`}</title>
              <rect x={x} y={y} width={larguraBarra} height={h} rx={4} fill={emFoco ? corDestaque : corBarra} />
              {/* Valor acima da barra */}
              <text
                x={x + larguraBarra / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize={11}
                fontWeight={600}
                fill={corTinta}
              >
                {d.valor >= 1000 ? `${(d.valor / 1000).toFixed(1)}k` : Math.round(d.valor)}
              </text>
              {/* Rótulo do mês */}
              <text x={x + larguraBarra / 2} y={baseY + 16} textAnchor="middle" fontSize={11} fill={corTinta}>
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
