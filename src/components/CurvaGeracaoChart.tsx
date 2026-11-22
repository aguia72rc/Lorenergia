"use client";

import { useEffect, useRef, useState } from "react";

export interface PontoCurva {
  hora: string; // "HH:MM"
  kw: number;
}

const COR = "#ffca3a"; // brand (sol)
const COR_TINTA = "#94a3b8";
const COR_GRADE = "rgba(148,163,184,0.18)";
const COR_BASE = "rgba(148,163,184,0.4)";

const minutos = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
const fmtKw = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: n < 10 ? 2 : 1 })} kW`;

/** Curva de potência do dia (área, uma série). Passe o mouse/dedo para ver cada horário. */
export default function CurvaGeracaoChart({ pontos, altura = 200 }: { pontos: PontoCurva[]; altura?: number }) {
  const [ativo, setAtivo] = useState<number | null>(null);
  const caixa = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(640);
  // Desenha na largura real (texto sempre em 11px, no celular e no computador).
  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setLargura(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  if (!pontos || pontos.length < 2) {
    return <p className="py-6 text-center text-sm text-slate-400">A curva do dia aparece assim que a usina enviar as primeiras leituras.</p>;
  }

  const W = largura;
  const H = altura;
  const padL = 36;
  const padR = 12;
  const padT = 14;
  const padB = 26;
  const ini = 5 * 60;
  const fim = 19 * 60;
  const max = Math.max(...pontos.map((p) => p.kw), 0.1);
  const topo = max <= 1 ? Math.ceil(max * 10) / 10 : max <= 10 ? Math.ceil(max) : Math.ceil(max / 5) * 5;
  const x = (h: string) => padL + ((Math.min(Math.max(minutos(h), ini), fim) - ini) / (fim - ini)) * (W - padL - padR);
  const y = (kw: number) => padT + (1 - kw / topo) * (H - padT - padB);
  const base = H - padB;

  const linha = pontos.map((p, i) => `${i ? "L" : "M"}${x(p.hora).toFixed(1)},${y(p.kw).toFixed(1)}`).join(" ");
  const area = `${linha} L${x(pontos[pontos.length - 1].hora).toFixed(1)},${base} L${x(pontos[0].hora).toFixed(1)},${base} Z`;
  const horas = W < 420 ? [6, 12, 18] : [6, 9, 12, 15, 18];
  const grades = [0.5, 1].map((f) => topo * f);

  function aoMover(e: React.PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let melhor = 0;
    pontos.forEach((p, i) => {
      if (Math.abs(x(p.hora) - px) < Math.abs(x(pontos[melhor].hora) - px)) melhor = i;
    });
    setAtivo(melhor);
  }

  const p = ativo !== null ? pontos[ativo] : null;

  return (
    <div className="relative" ref={caixa}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="block max-w-full"
        role="img"
        aria-label={`Curva de potência de hoje; pico de ${fmtKw(max)}`}
        onPointerMove={aoMover}
        onPointerDown={aoMover}
        onPointerLeave={() => setAtivo(null)}
        style={{ touchAction: "pan-y" }}
      >
        <defs>
          <linearGradient id="curvaSol" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COR} stopOpacity={0.35} />
            <stop offset="100%" stopColor={COR} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {grades.map((g) => (
          <g key={g}>
            <line x1={padL} x2={W - padR} y1={y(g)} y2={y(g)} stroke={COR_GRADE} />
            <text x={padL - 6} y={y(g) + 4} textAnchor="end" fontSize={11} fill={COR_TINTA}>
              {g.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
            </text>
          </g>
        ))}
        <text x={padL - 6} y={base + 4} textAnchor="end" fontSize={11} fill={COR_TINTA}>0</text>
        <line x1={padL} x2={W - padR} y1={base} y2={base} stroke={COR_BASE} strokeWidth={2} />
        {horas.map((h) => {
          const hh = `${String(h).padStart(2, "0")}:00`;
          return (
            <text key={h} x={x(hh)} y={H - 8} textAnchor="middle" fontSize={11} fill={COR_TINTA}>
              {h}h
            </text>
          );
        })}
        <path d={area} fill="url(#curvaSol)" />
        <path d={linha} fill="none" stroke={COR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {p && (
          <g pointerEvents="none">
            <line x1={x(p.hora)} x2={x(p.hora)} y1={padT} y2={base} stroke={COR_BASE} />
            <circle cx={x(p.hora)} cy={y(p.kw)} r={5} fill={COR} stroke="#0b1017" strokeWidth={2} />
          </g>
        )}
      </svg>
      {p && (
        <div
          className="pointer-events-none absolute top-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs shadow-lg"
          style={{ left: x(p.hora), transform: `translateX(${x(p.hora) > W * 0.65 ? "calc(-100% - 8px)" : "8px"})`, background: "#0f172a", color: "#cbd5e1", border: "1px solid rgba(148,163,184,0.3)" }}
        >
          {p.hora} · <strong style={{ color: "#ffffff" }}>{fmtKw(p.kw)}</strong>
        </div>
      )}
    </div>
  );
}
