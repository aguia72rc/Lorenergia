"use client";

import { useState, useTransition } from "react";
import { simularPublico, type ResultadoPublico } from "@/app/simulador/actions";

const LIGACOES = [
  { v: "monofasica", t: "Monofásica" },
  { v: "bifasica", t: "Bifásica" },
  { v: "trifasica", t: "Trifásica" },
] as const;

const brl = (n: number) => "R$ " + Math.round(n).toLocaleString("pt-BR");

export default function SimuladorPublico() {
  const [pendente, startTransition] = useTransition();
  const [modo, setModo] = useState<"kwh" | "reais">("kwh");
  const [entrada, setEntrada] = useState(230);
  const [tipoLigacao, setTipoLigacao] = useState<"monofasica" | "bifasica" | "trifasica">("monofasica");
  const [ano, setAno] = useState(2026);
  const [res, setRes] = useState<ResultadoPublico | null>(null);

  function simular() {
    setRes(null);
    startTransition(async () => {
      const r = await simularPublico({ modo, entrada, tipoLigacao, ano });
      setRes(r);
    });
  }

  return (
    <div className="space-y-5">
      <div className="card">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="entrada">
              {modo === "kwh" ? "Consumo médio (kWh/mês)" : "Valor da conta (R$/mês)"}
            </label>
            <div className="flex gap-2">
              <input
                id="entrada"
                type="number"
                min={0}
                step={modo === "kwh" ? 1 : 10}
                inputMode="decimal"
                className="input flex-1"
                value={entrada}
                onChange={(e) => setEntrada(Number(e.target.value))}
              />
              <div className="flex overflow-hidden rounded-xl border border-white/10">
                {(["kwh", "reais"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setModo(m);
                      setEntrada(m === "kwh" ? 230 : 240);
                    }}
                    className={`px-3 text-sm font-medium ${modo === m ? "bg-brand-500 text-brand-950" : "text-slate-300 hover:bg-white/5"}`}
                  >
                    {m === "kwh" ? "kWh" : "R$"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="ligacao">Tipo de ligação</label>
            <select id="ligacao" className="input" value={tipoLigacao} onChange={(e) => setTipoLigacao(e.target.value as typeof tipoLigacao)}>
              {LIGACOES.map((l) => <option key={l.v} value={l.v}>{l.t}</option>)}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="ano">Ano de referência</label>
            <select id="ano" className="input" value={ano} onChange={(e) => setAno(Number(e.target.value))}>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
              <option value={2028}>2028</option>
              <option value={2029}>2029 em diante</option>
            </select>
          </div>

          <div className="flex items-end">
            <button onClick={simular} className="btn-primary w-full" disabled={pendente}>
              {pendente ? "Calculando…" : "Ver minha economia"}
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Estimativa gratuita e sem compromisso, com base na tarifa vigente. A economia real varia com o clima e com os reajustes da distribuidora.
        </p>
      </div>

      {res && !res.ok && (
        <div className="card">
          <p className="text-sm text-amber-300">
            {res.motivo === "consumo_invalido"
              ? "Informe o consumo para simular."
              : "Simulador indisponível no momento. Tente novamente em instantes."}
          </p>
        </div>
      )}

      {res && res.ok && (
        <div className="relative overflow-hidden rounded-2xl border border-eco-500/30 p-6"
          style={{ background: "linear-gradient(120deg, rgba(16,185,129,0.20), rgba(255,176,32,0.10))" }}>
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-eco-500/20 blur-3xl" />
          <p className="relative text-sm text-eco-200">Você pode economizar a partir de</p>
          <p className="relative mt-1 text-4xl font-extrabold text-white" style={{ fontFamily: "var(--font-display)" }}>
            {brl(res.faixaMin)}
            <span className="text-lg font-semibold text-eco-200"> a {brl(res.faixaMax)} por mês</span>
          </p>
          <p className="relative mt-2 text-sm text-eco-200">
            São pelo menos <strong className="text-white">{brl(res.anualMin)} por ano</strong> no seu bolso — sem obra e sem mudar nada na sua instalação.
          </p>
          <div className="relative mt-4 flex flex-wrap gap-3">
            <a href="https://wa.me/5581995592624?text=Ol%C3%A1!%20Fiz%20a%20simula%C3%A7%C3%A3o%20no%20site%20e%20quero%20saber%20mais." target="_blank" rel="noopener noreferrer" className="btn-eco">
              Quero economizar
            </a>
            <span className="self-center text-xs text-slate-400">Um consultor confirma os números com você.</span>
          </div>
        </div>
      )}
    </div>
  );
}
