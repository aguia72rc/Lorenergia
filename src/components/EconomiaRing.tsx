/**
 * Anel circular de progresso (SVG inline, sem dependências).
 * Mostra a porcentagem de economia no centro. Renderiza igual na impressão.
 */
export default function EconomiaRing({
  percent,
  tamanho = 168,
  espessura = 14,
  legenda = "de economia",
}: {
  percent: number;
  tamanho?: number;
  espessura?: number;
  legenda?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  const r = (tamanho - espessura) / 2;
  const c = 2 * Math.PI * r;
  const preenchido = (pct / 100) * c;
  const centro = tamanho / 2;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: tamanho, height: tamanho }}>
      <svg width={tamanho} height={tamanho} role="img" aria-label={`${pct}% ${legenda}`}>
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <circle cx={centro} cy={centro} r={r} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={espessura} />
        <circle
          cx={centro}
          cy={centro}
          r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={espessura}
          strokeLinecap="round"
          strokeDasharray={`${preenchido} ${c - preenchido}`}
          transform={`rotate(-90 ${centro} ${centro})`}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-extrabold text-white" style={{ fontFamily: "var(--font-display)" }}>{pct}%</span>
        <span className="text-xs text-slate-400">{legenda}</span>
      </div>
    </div>
  );
}
