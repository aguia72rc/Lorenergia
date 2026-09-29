"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Scale, Percent, Save, Wand2, RotateCcw } from "lucide-react";
import { formatKwh } from "@/lib/format";
import { salvarRateio } from "@/app/admin/usina/actions";

interface Linha {
  clienteId: string;
  nome: string;
  unidade: string | null;
  percentual: number;
  consumo: number;
  saldoAnterior: number;
}

// Paleta das faixas (baseada no protótipo MegaBrain).
const CORES = ["#E2601C", "#F2A516", "#2F6690", "#7A5CA8", "#3DB38C", "#C6538C", "#4C8DBF", "#D98324"];
const cor = (i: number) => CORES[i % CORES.length];
const escuroTexto = (hex: string) => hex.toUpperCase() === "#F2A516"; // amarelo pede texto escuro

interface Situacao { st: "ok" | "warn" | "bad" | "muted"; txt: string }
function balanco(pct: number, aloc: number, consumo: number, saldo: number): Situacao {
  if (pct <= 0) return { st: "muted", txt: "Fora do rateio" };
  const bal = aloc - consumo;
  const k = (n: number, d = 0) => n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
  if (bal >= 0) {
    const meses = consumo > 0 ? saldo / consumo : Infinity;
    if (meses > 3) return { st: "warn", txt: `Sobra ${k(bal)} kWh e o saldo cobre ${isFinite(meses) ? k(meses, 1) : "∞"} meses` };
    return { st: "ok", txt: `Cobertura total, sobra ${k(bal)} kWh` };
  }
  const meses = saldo / -bal;
  if (saldo <= 0) return { st: "bad", txt: `Faltam ${k(-bal)} kWh/mês, sem saldo` };
  if (meses < 3) return { st: "bad", txt: `Saldo acaba em ${k(meses, 1)} meses` };
  return { st: "ok", txt: `Usa ${k(-bal)} kWh do saldo/mês (${k(meses)} meses)` };
}

const PILL: Record<Situacao["st"], string> = {
  ok: "bg-eco-500/15 text-eco-300",
  warn: "bg-amber-500/15 text-amber-300",
  bad: "bg-red-500/15 text-red-300",
  muted: "bg-white/5 text-slate-400",
};

export default function RateioEditor({
  referencia,
  geracaoInicial,
  consumoPredio = 0,
  linhas,
  desabilitado = false,
}: {
  referencia: string;
  geracaoInicial: number;
  consumoPredio?: number;
  linhas: Linha[];
  totais?: unknown;
  desabilitado?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [geracao, setGeracao] = useState<string>(String(geracaoInicial ?? 0));
  const [pcts, setPcts] = useState<number[]>(linhas.map((l) => Number(l.percentual) || 0));

  const geracaoNum = Math.max(0, Number(geracao) || 0);
  // Base do rateio = excedente (geração − consumo do prédio).
  const base = Math.max(0, geracaoNum - consumoPredio);

  const calc = useMemo(
    () =>
      linhas.map((l, i) => {
        const pct = Math.max(0, pcts[i] || 0);
        const aloc = (base * pct) / 100;
        const sit = balanco(pct, aloc, l.consumo, l.saldoAnterior);
        return { pct, aloc, sit };
      }),
    [linhas, pcts, base]
  );

  const somaPct = calc.reduce((s, c) => s + c.pct, 0);
  const livre = Math.round((100 - somaPct) * 100) / 100;
  const totalConsumo = linhas.reduce((s, l) => s + l.consumo, 0);

  function setPct(i: number, v: number) {
    setPcts((arr) => arr.map((x, idx) => (idx === i ? v : x)));
  }

  function distribuirIgual() {
    if (!linhas.length) return;
    setPcts(linhas.map(() => Math.round((100 / linhas.length) * 100) / 100));
  }

  function distribuirPorConsumo() {
    if (totalConsumo <= 0) { setMsg("Sem consumo no mês para distribuir."); return; }
    setPcts(linhas.map((l) => Math.round((l.consumo / totalConsumo) * 10000) / 100));
  }

  // "Sugerir rateio" (water-filling): cobre o consumo de cada UC descontando
  // 1/12 do saldo acumulado, e nivela a geração entre elas.
  function sugerir() {
    if (base <= 0) { setMsg("Informe a geração base para sugerir o rateio."); return; }
    const need = linhas.map((l, i) => ({ i, n: Math.max(0, l.consumo - l.saldoAnterior / 12), g: 0 }));
    let rem = base;
    let left = need.length;
    need.sort((a, b) => a.n - b.n).forEach((x) => {
      const share = left > 0 ? rem / left : 0;
      x.g = Math.min(x.n, share);
      rem -= x.g;
      left--;
    });
    const novo = new Array(linhas.length).fill(0);
    need.forEach((x) => { novo[x.i] = Math.floor((x.g / base) * 10000) / 100; });
    setPcts(novo);
  }

  function reverter() {
    setPcts(linhas.map((l) => Number(l.percentual) || 0));
    setGeracao(String(geracaoInicial ?? 0));
  }

  function salvar() {
    setMsg(null);
    startTransition(async () => {
      const r = await salvarRateio({
        referencia,
        kwh_injetado: base,
        itens: linhas.map((l, i) => ({ cliente_id: l.clienteId, percentual: pcts[i] || 0 })),
      });
      setMsg(r.mensagem);
      if (r.ok) router.refresh();
    });
  }

  const pct1 = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

  // Ribbon: segmentos por cliente + faixa livre / excedente.
  const segAtivos = linhas.map((l, i) => ({ l, i, pct: calc[i].pct })).filter((s) => s.pct > 0);

  return (
    <div className="space-y-5">
      {/* ---- Faixa de rateio (ribbon) ---- */}
      <div className="card">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold text-white">Faixa de rateio</h2>
          <span className={`text-sm font-medium ${livre < 0 ? "text-red-400" : livre === 0 ? "text-eco-300" : "text-slate-400"}`}>
            {somaPct.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% alocado{livre > 0 ? ` · ${pct1(livre)} livre` : livre < 0 ? ` · excede ${pct1(-livre)}` : ""}
          </span>
        </div>
        <p className="mb-3 text-sm text-slate-400">Base de {formatKwh(base)}/mês. Cada faixa é a fatia de um associado.</p>

        <div className="flex h-16 w-full overflow-hidden rounded-xl bg-white/5" role="img" aria-label="Faixa de rateio">
          {segAtivos.map(({ l, i, pct }) => {
            const c = cor(i);
            const mostra = pct >= 9;
            return (
              <div
                key={l.clienteId}
                className="flex min-w-0 flex-col justify-end p-2 transition-all"
                style={{ flexBasis: `${Math.max(pct, 0)}%`, background: c, color: escuroTexto(c) ? "#2A1B00" : "#fff" }}
                title={`${l.nome}: ${pct1(pct)} (${formatKwh((pct / 100) * base)})`}
              >
                {mostra && (
                  <>
                    <b className="text-lg font-extrabold leading-none tabular-nums">{pct1(pct)}</b>
                    <small className="truncate text-xs opacity-90">{l.nome}</small>
                  </>
                )}
              </div>
            );
          })}
          {livre > 0 && (
            <div
              className="flex flex-col justify-end p-2 text-slate-400"
              style={{ flexBasis: `${livre}%`, background: "repeating-linear-gradient(135deg,transparent 0 7px,rgba(255,255,255,.12) 7px 8.5px)" }}
              title={`Livre: ${pct1(livre)}`}
            >
              {livre >= 9 && (<><b className="text-lg font-extrabold leading-none tabular-nums">{pct1(livre)}</b><small className="text-xs">Livre</small></>)}
            </div>
          )}
          {livre < 0 && (
            <div className="flex flex-col justify-end bg-red-500 p-2 text-white" style={{ flexBasis: "12%" }} title="Excedente">
              <b className="text-lg font-extrabold leading-none tabular-nums">+{pct1(-livre)}</b><small className="text-xs">Excede</small>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
          {segAtivos.map(({ l, i, pct }) => (
            <span key={l.clienteId} className="inline-flex items-center gap-1.5">
              <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: cor(i) }} />
              {l.nome} {pct1(pct)}, {formatKwh((pct / 100) * base)}
            </span>
          ))}
          {livre > 0 && <span className="inline-flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm bg-white/20" />Livre {pct1(livre)}, {formatKwh((livre / 100) * base)}</span>}
        </div>
      </div>

      {/* ---- Sliders + base ---- */}
      <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
        <div className="card space-y-3">
          <h2 className="font-semibold text-white">Percentual por associado</h2>
          {linhas.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">Nenhum morador ativo.</p>
          ) : linhas.map((l, i) => (
            <div key={l.clienteId} className="grid grid-cols-[minmax(120px,180px)_1fr_auto] items-center gap-3">
              <label htmlFor={`r-${l.clienteId}`} className="flex items-center gap-2 text-sm font-medium text-white">
                <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: cor(i) }} />
                <span className="truncate">{l.nome}</span>
              </label>
              <input
                id={`r-${l.clienteId}`}
                type="range" min={0} max={100} step={0.5}
                value={pcts[i]}
                onChange={(e) => setPct(i, Number(e.target.value))}
                disabled={desabilitado}
                style={{ accentColor: cor(i) }}
              />
              <input
                type="number" min={0} max={100} step={0.01}
                value={pcts[i]}
                onChange={(e) => setPct(i, Number(e.target.value))}
                disabled={desabilitado}
                className="input w-20 text-right tabular-nums"
                aria-label={`Percentual de ${l.nome}`}
              />
            </div>
          ))}
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" onClick={sugerir} disabled={desabilitado} className="btn-outline"><Wand2 className="h-4 w-4" /> Sugerir rateio</button>
            <button type="button" onClick={distribuirIgual} disabled={desabilitado} className="btn-outline"><Scale className="h-4 w-4" /> Igualmente</button>
            <button type="button" onClick={distribuirPorConsumo} disabled={desabilitado} className="btn-outline"><Percent className="h-4 w-4" /> Por consumo</button>
            <button type="button" onClick={reverter} disabled={desabilitado} className="btn-outline"><RotateCcw className="h-4 w-4" /> Reverter</button>
          </div>
        </div>

        <div className="card space-y-4">
          <div>
            <h2 className="font-semibold text-white">Base do mês</h2>
            <p className="text-sm text-slate-400">O excedente (geração − consumo do prédio) é o que se rateia.</p>
          </div>
          <div>
            <label className="label" htmlFor="geracao">Geração da usina no mês (kWh)</label>
            <input id="geracao" type="number" min={0} step={0.01} value={geracao} onChange={(e) => setGeracao(e.target.value)} disabled={desabilitado} className="input w-full" />
          </div>
          <div className="space-y-1 rounded-lg bg-white/5 p-3 text-sm">
            <div className="flex justify-between text-slate-400"><span>Geração</span><span className="tabular-nums">{formatKwh(geracaoNum)}</span></div>
            <div className="flex justify-between text-slate-400"><span>− Consumo do prédio</span><span className="tabular-nums">{formatKwh(consumoPredio)}</span></div>
            <div className="flex justify-between border-t border-white/10 pt-1 font-semibold text-eco-300"><span>= Excedente p/ rateio</span><span className="tabular-nums">{formatKwh(base)}</span></div>
          </div>
          <div className="rounded-lg bg-white/5 p-3 text-xs text-slate-400">
            “Sugerir rateio” cobre o consumo de cada morador descontando 1/12 do saldo acumulado por mês e nivela o excedente (water-filling). A soma ideal é 100%.
          </div>
          <div className="flex items-center justify-end gap-3">
            {msg && <span className="text-sm text-slate-400">{msg}</span>}
            <button type="button" onClick={salvar} disabled={pending || desabilitado} className="btn-primary"><Save className="h-4 w-4" /> {pending ? "Salvando…" : "Salvar rateio"}</button>
          </div>
        </div>
      </div>

      {/* ---- Resultado: recebe × consome ---- */}
      <div className="card">
        <h2 className="mb-3 font-semibold text-white">Recebe × consome</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-slate-400">
                <th className="pb-2 font-medium">Associado</th>
                <th className="pb-2 text-right font-medium">Recebe</th>
                <th className="pb-2 text-right font-medium">Consome</th>
                <th className="pb-2 font-medium">Recebe × consome</th>
                <th className="pb-2 text-right font-medium">Saldo</th>
                <th className="pb-2 font-medium">Situação</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l, i) => {
                const c = calc[i];
                const mx = Math.max(c.aloc, l.consumo, 1) * 1.1;
                return (
                  <tr key={l.clienteId} className="border-b border-white/5 last:border-0">
                    <td className="py-2.5 font-medium text-white">
                      <span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: cor(i) }} />
                      {l.nome}{l.unidade && <span className="ml-1 text-xs text-slate-500">{l.unidade}</span>}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-slate-200">{formatKwh(c.aloc)}</td>
                    <td className="py-2.5 text-right tabular-nums text-slate-300">{formatKwh(l.consumo)}</td>
                    <td className="py-2.5">
                      <div className="relative h-2 min-w-[120px] rounded bg-white/10" title="Barra: recebido · marca: consumo">
                        <span className="absolute left-0 top-0 bottom-0 rounded" style={{ width: `${(c.aloc / mx) * 100}%`, background: cor(i) }} />
                        <em className="absolute -top-1 -bottom-1 w-0.5 bg-white" style={{ left: `${(l.consumo / mx) * 100}%` }} />
                      </div>
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-slate-400">{formatKwh(l.saldoAnterior)}</td>
                    <td className="py-2.5"><span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${PILL[c.sit.st]}`}>{c.sit.txt}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-500">A barra mostra o que o associado recebe; a marca vertical é o consumo médio (das faturas). O saldo é o acumulado de créditos entrando no mês.</p>
      </div>
    </div>
  );
}
