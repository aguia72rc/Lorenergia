"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Scale, Percent, Save } from "lucide-react";
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

export default function RateioEditor({
  referencia,
  geracaoInicial,
  linhas,
  desabilitado = false,
}: {
  referencia: string;
  geracaoInicial: number;
  linhas: Linha[];
  totais?: unknown;
  desabilitado?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [geracao, setGeracao] = useState<string>(String(geracaoInicial ?? 0));
  const [pcts, setPcts] = useState<string[]>(linhas.map((l) => String(l.percentual ?? 0)));

  const g = Math.max(0, Number(geracao) || 0);

  const calc = useMemo(() => {
    return linhas.map((l, i) => {
      const pct = Math.max(0, Number(pcts[i]) || 0);
      const creditos = (g * pct) / 100;
      const disponivel = l.saldoAnterior + creditos;
      const compensado = Math.min(l.consumo, disponivel);
      const saldoFinal = disponivel - compensado;
      const cobertura = l.consumo > 0 ? (compensado / l.consumo) * 100 : 100;
      return { creditos, disponivel, compensado, saldoFinal, cobertura, pct };
    });
  }, [linhas, pcts, g]);

  const somaPct = calc.reduce((s, c) => s + c.pct, 0);
  const totalCreditos = calc.reduce((s, c) => s + c.creditos, 0);
  const totalConsumo = linhas.reduce((s, l) => s + l.consumo, 0);
  const totalCompensado = calc.reduce((s, c) => s + c.compensado, 0);
  const totalSaldo = calc.reduce((s, c) => s + c.saldoFinal, 0);
  const somaOk = Math.abs(somaPct - 100) < 0.01;

  function setPct(i: number, v: string) {
    setPcts((arr) => arr.map((x, idx) => (idx === i ? v : x)));
  }

  function distribuirIgual() {
    if (linhas.length === 0) return;
    const v = (100 / linhas.length).toFixed(4);
    setPcts(linhas.map(() => v));
  }

  function distribuirPorConsumo() {
    if (totalConsumo <= 0) {
      setMsg("Sem consumo no mês para distribuir proporcionalmente.");
      return;
    }
    setPcts(linhas.map((l) => ((l.consumo / totalConsumo) * 100).toFixed(4)));
  }

  function salvar() {
    setMsg(null);
    startTransition(async () => {
      const r = await salvarRateio({
        referencia,
        kwh_injetado: g,
        itens: linhas.map((l, i) => ({ cliente_id: l.clienteId, percentual: Number(pcts[i]) || 0 })),
      });
      setMsg(r.mensagem);
      if (r.ok) router.refresh();
    });
  }

  const pct1 = (v: number) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`;

  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <label className="label" htmlFor="geracao">Geração da usina no mês (kWh)</label>
          <input
            id="geracao"
            type="number"
            min={0}
            step={0.01}
            value={geracao}
            onChange={(e) => setGeracao(e.target.value)}
            disabled={desabilitado}
            className="input w-48"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={distribuirIgual} disabled={desabilitado} className="btn-outline">
            <Scale className="h-4 w-4" /> Distribuir igualmente
          </button>
          <button type="button" onClick={distribuirPorConsumo} disabled={desabilitado} className="btn-outline">
            <Percent className="h-4 w-4" /> Proporcional ao consumo
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-slate-400">
              <th className="pb-2 font-medium">Cliente</th>
              <th className="pb-2 text-right font-medium">Rateio %</th>
              <th className="pb-2 text-right font-medium">Créditos (kWh)</th>
              <th className="pb-2 text-right font-medium">Consumo (kWh)</th>
              <th className="pb-2 text-right font-medium">Saldo ant.</th>
              <th className="pb-2 text-right font-medium">Compensado</th>
              <th className="pb-2 text-right font-medium">Saldo final</th>
              <th className="pb-2 text-right font-medium">Cobertura</th>
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 ? (
              <tr><td colSpan={8} className="py-6 text-center text-slate-400">Nenhum morador ativo.</td></tr>
            ) : linhas.map((l, i) => {
              const c = calc[i];
              const sub = c.cobertura < 99.5 && l.consumo > 0;
              return (
                <tr key={l.clienteId} className="border-b border-white/5 last:border-0">
                  <td className="py-2.5 font-medium text-white">
                    {l.nome}
                    {l.unidade && <span className="ml-1 text-xs text-slate-500">{l.unidade}</span>}
                  </td>
                  <td className="py-2.5 text-right">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={pcts[i]}
                      onChange={(e) => setPct(i, e.target.value)}
                      disabled={desabilitado}
                      className="input w-24 text-right tabular-nums"
                    />
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-blue-300">{formatKwh(c.creditos)}</td>
                  <td className="py-2.5 text-right tabular-nums text-slate-300">{formatKwh(l.consumo)}</td>
                  <td className="py-2.5 text-right tabular-nums text-slate-400">{formatKwh(l.saldoAnterior)}</td>
                  <td className="py-2.5 text-right tabular-nums text-amber-300">{formatKwh(c.compensado)}</td>
                  <td className="py-2.5 text-right tabular-nums text-eco-300">{formatKwh(c.saldoFinal)}</td>
                  <td className={`py-2.5 text-right tabular-nums ${sub ? "text-red-400" : "text-slate-300"}`}>{pct1(c.cobertura)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-white/10 font-semibold text-white">
              <td className="pt-3">Total</td>
              <td className={`pt-3 text-right tabular-nums ${somaOk ? "text-eco-300" : "text-red-400"}`}>{pct1(somaPct)}</td>
              <td className="pt-3 text-right tabular-nums text-blue-300">{formatKwh(totalCreditos)}</td>
              <td className="pt-3 text-right tabular-nums">{formatKwh(totalConsumo)}</td>
              <td></td>
              <td className="pt-3 text-right tabular-nums text-amber-300">{formatKwh(totalCompensado)}</td>
              <td className="pt-3 text-right tabular-nums text-eco-300">{formatKwh(totalSaldo)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {!somaOk && linhas.length > 0 && (
        <p className="text-xs text-amber-300">
          A soma dos percentuais é {pct1(somaPct)} — o ideal é 100%. Ajuste ou use “Distribuir igualmente”.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        {msg && <span className="text-sm text-slate-400">{msg}</span>}
        <button type="button" onClick={salvar} disabled={pending || desabilitado} className="btn-primary">
          <Save className="h-4 w-4" /> {pending ? "Salvando…" : "Salvar rateio do mês"}
        </button>
      </div>
    </div>
  );
}
