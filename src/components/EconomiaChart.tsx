import { formatBRL, formatKwh } from "@/lib/format";

export interface PontoEconomia {
  label: string; // ex.: "ago/26"
  valor: number; // economia em R$ (ou kWh, conforme "formato")
  referencia?: string; // YYYY-MM-DD (para destacar)
}

/**
 * Gráfico de barras da economia/consumo mensal (série única).
 * SVG inline, sem dependências — renderiza também na impressão/PDF.
 *
 * Design (guia dataviz): uma única série usa um só tom (verde eco), sem
 * legenda (o título já nomeia a série); barras com topo arredondado e leve
 * gradiente, ancoradas na base; linhas de grade sutis para leitura; o mês em
 * foco ganha o âmbar da marca. A `variante` adapta as tintas ao fundo (claro
 * na fatura em papel branco, escuro no portal).
 */
export default function EconomiaChart({
  dados,
  destaqueRef,
  altura = 200,
  cor = "#34d399",
  formato = "brl",
  variante = "escuro",
  ariaLabel = "Gráfico de economia mensal com energia solar",
  textoVazio = "Ainda não há dados de economia para exibir.",
}: {
  dados: PontoEconomia[];
  destaqueRef?: string;
  altura?: number;
  cor?: string;
  formato?: "brl" | "kwh";
  variante?: "claro" | "escuro";
  ariaLabel?: string;
  textoVazio?: string;
}) {
  const formatarValor = (v: number) => (formato === "kwh" ? formatKwh(v) : formatBRL(v));
  if (!dados || dados.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">{textoVazio}</p>;
  }

  // Área de desenho (coordenadas internas; o SVG escala via viewBox).
  const W = 640;
  const H = altura;
  const padTop = 26; // espaço para os rótulos de valor
  const padBottom = 30; // espaço para os rótulos de mês
  const padX = 14;
  const areaAltura = H - padTop - padBottom;
  const baseY = H - padBottom;

  const maxValor = Math.max(...dados.map((d) => d.valor), 1);
  const passo = (W - padX * 2) / dados.length;
  const larguraBarra = Math.min(46, passo * 0.56);

  // Tintas por variante (fundo claro = fatura; escuro = portal).
  const claro = variante === "claro";
  const corTinta = claro ? "#64748b" : "#94a3b8"; // rótulos de mês
  const corValor = claro ? "#334155" : "#cbd5e1"; // rótulos de valor
  const corBase = claro ? "#cbd5e1" : "rgba(255,255,255,0.20)"; // linha de base
  const corGrade = claro ? "#eef2f7" : "rgba(255,255,255,0.06)"; // grade
  const corDestaqueValor = claro ? "#b45309" : "#fcd34d"; // valor do mês em foco

  // Ids únicos para os gradientes (evita colisão entre gráficos na página).
  const uid = `ec-${variante}-${formato}-${cor.replace(/[^a-z0-9]/gi, "")}-${dados.length}-${(dados[0]?.label ?? "").replace(/[^a-z0-9]/gi, "")}`;
  const gradSerie = `${uid}-s`;
  const gradFoco = `${uid}-f`;

  // Caminho de retângulo com o topo arredondado (base reta, na linha de base).
  const barra = (x: number, y: number, w: number, h: number, r: number) => {
    const rr = Math.min(r, w / 2, h);
    return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`;
  };

  const rotulo = (v: number) =>
    v >= 1000 ? `${(v / 1000).toFixed(1).replace(".", ",")}k` : `${Math.round(v)}`;

  // Linhas de grade horizontais (4 divisões, sem contar a base).
  const divisoes = [0.25, 0.5, 0.75, 1];

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={ariaLabel}
        style={{ minWidth: dados.length > 8 ? 640 : undefined }}
      >
        <defs>
          <linearGradient id={gradSerie} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={cor} stopOpacity={1} />
            <stop offset="100%" stopColor={cor} stopOpacity={0.55} />
          </linearGradient>
          <linearGradient id={gradFoco} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffd166" stopOpacity={1} />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.85} />
          </linearGradient>
        </defs>

        {/* Grade horizontal */}
        {divisoes.map((frac, i) => {
          const y = baseY - areaAltura * frac;
          return <line key={`g${i}`} x1={padX} y1={y} x2={W - padX} y2={y} stroke={corGrade} strokeWidth={1} />;
        })}

        {/* Linha de base */}
        <line x1={padX} y1={baseY} x2={W - padX} y2={baseY} stroke={corBase} strokeWidth={2} />

        {dados.map((d, i) => {
          const h = Math.max(3, (d.valor / maxValor) * areaAltura);
          const x = padX + i * passo + (passo - larguraBarra) / 2;
          const y = baseY - h;
          const emFoco = Boolean(destaqueRef && d.referencia === destaqueRef);
          const cx = x + larguraBarra / 2;
          return (
            <g key={i}>
              <title>{`${d.label}: ${formatarValor(d.valor)}`}</title>
              <path d={barra(x, y, larguraBarra, h, 6)} fill={`url(#${emFoco ? gradFoco : gradSerie})`} />
              {/* Valor acima da barra */}
              <text
                x={cx}
                y={y - 7}
                textAnchor="middle"
                fontSize={11}
                fontWeight={emFoco ? 700 : 600}
                fill={emFoco ? corDestaqueValor : corValor}
              >
                {rotulo(d.valor)}
              </text>
              {/* Rótulo do mês */}
              <text
                x={cx}
                y={baseY + 17}
                textAnchor="middle"
                fontSize={11}
                fontWeight={emFoco ? 700 : 400}
                fill={emFoco ? corDestaqueValor : corTinta}
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
