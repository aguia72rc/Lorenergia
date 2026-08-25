"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Trash2, Save, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { validarPlanos, type PlanoCota } from "@/lib/simulador";
import { salvarPlanos, type LinhaPlano } from "@/app/admin/planos/actions";

let seq = 0;
const novaChave = () => `n${seq++}`;

interface Linha extends LinhaPlano {
  _k: string; // chave estável de UI
}

export default function PlanosEditor({ iniciais }: { iniciais: LinhaPlano[] }) {
  const [linhas, setLinhas] = useState<Linha[]>(iniciais.map((l) => ({ ...l, _k: novaChave() })));
  const [salvando, startSalvar] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  // Validação AO VIVO (não linearidade), sobre as linhas ativas.
  const validacao = useMemo(
    () => validarPlanos(linhas.map((l) => ({ codigo: l.codigo, kwh_min: l.kwh_min, kwh_max: l.kwh_max, ativo: l.ativo })) as PlanoCota[]),
    [linhas]
  );
  const problemasPorCodigo = useMemo(() => {
    const m = new Map<string, "erro" | "aviso">();
    for (const p of validacao.problemas) {
      const atual = m.get(p.codigo);
      if (p.nivel === "erro" || atual !== "erro") m.set(p.codigo, p.nivel);
    }
    return m;
  }, [validacao]);

  function set(k: string, campo: keyof LinhaPlano, valor: string | number | boolean) {
    setLinhas((ls) => ls.map((l) => (l._k === k ? { ...l, [campo]: valor } : l)));
  }
  function adicionar() {
    setLinhas((ls) => [...ls, { _k: novaChave(), codigo: "", kwh_min: 0, kwh_max: 0, ativo: true }]);
  }
  function remover(k: string) {
    setLinhas((ls) => ls.filter((l) => l._k !== k));
  }

  function salvar() {
    setMsg(null);
    startSalvar(async () => {
      const res = await salvarPlanos(linhas.map(({ _k, ...l }) => l)); // eslint-disable-line @typescript-eslint/no-unused-vars
      setMsg({ ok: res.ok, texto: res.mensagem });
    });
  }

  const temErro = !validacao.ok;
  const avisos = validacao.problemas.filter((p) => p.nivel === "aviso");
  const erros = validacao.problemas.filter((p) => p.nivel === "erro");

  return (
    <div className="space-y-4">
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-slate-400">
              <th className="pb-2 font-medium">Código</th>
              <th className="pb-2 font-medium">Faixa de consumo (kWh)</th>
              <th className="pb-2 text-center font-medium">Ativo</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => {
              const nivel = problemasPorCodigo.get(l.codigo.trim().toUpperCase());
              return (
                <tr key={l._k} className="border-b border-white/5 last:border-0">
                  <td className="py-2 pr-2">
                    <input className="input w-20 uppercase" value={l.codigo} maxLength={4}
                      onChange={(e) => set(l._k, "codigo", e.target.value.toUpperCase())} />
                  </td>
                  <td className="py-2 pr-2">
                    <div className="flex items-center gap-1">
                      <input className="input w-24 tabular-nums" type="number" min={0} step={10} value={l.kwh_min} aria-label="Piso da faixa (kWh)"
                        onChange={(e) => set(l._k, "kwh_min", Number(e.target.value))} />
                      <span className="text-slate-500">até</span>
                      <input className="input w-24 tabular-nums" type="number" min={0} step={10} value={l.kwh_max} aria-label="Teto da faixa (kWh)"
                        onChange={(e) => set(l._k, "kwh_max", Number(e.target.value))} />
                      {nivel && <AlertTriangle className={`ml-1 h-4 w-4 ${nivel === "erro" ? "text-red-400" : "text-amber-300"}`} />}
                    </div>
                  </td>
                  <td className="py-2 text-center">
                    <input type="checkbox" checked={l.ativo} onChange={(e) => set(l._k, "ativo", e.target.checked)} className="h-4 w-4 accent-brand-500" />
                  </td>
                  <td className="py-2 text-right">
                    <button onClick={() => remover(l._k)} className="text-slate-500 hover:text-red-400" aria-label="Remover plano">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button onClick={adicionar} className="btn-outline"><Plus className="h-4 w-4" /> Adicionar plano</button>
          <button onClick={salvar} className="btn-primary" disabled={salvando || temErro}>
            <Save className="h-4 w-4" /> {salvando ? "Salvando…" : "Salvar planos"}
          </button>
          {msg && <span className={`text-sm ${msg.ok ? "text-eco-300" : "text-red-400"}`}>{msg.texto}</span>}
        </div>
      </div>

      {/* Painel de validação de não linearidade */}
      <div className="card">
        <div className="mb-2 flex items-center gap-2">
          {temErro ? <XCircle className="h-5 w-5 text-red-400" /> : avisos.length > 0 ? <AlertTriangle className="h-5 w-5 text-amber-300" /> : <CheckCircle2 className="h-5 w-5 text-eco-300" />}
          <h2 className="font-semibold text-white">Validação das faixas</h2>
        </div>
        {erros.length === 0 && avisos.length === 0 ? (
          <p className="text-sm text-eco-300">Tudo certo: faixas contíguas e crescentes, sem sobreposição nem buracos.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {erros.map((p, i) => (
              <li key={`e${i}`} className="flex items-start gap-2 text-red-300">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {p.mensagem}
              </li>
            ))}
            {avisos.map((p, i) => (
              <li key={`a${i}`} className="flex items-start gap-2 text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {p.mensagem}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-slate-500">
          <strong className="text-red-300">Erros</strong> impedem salvar (teto ≤ piso, ou faixas sobrepostas).
          <strong className="text-amber-200"> Avisos</strong> não bloqueiam: buraco entre faixas (consumos que ficam sem plano).
        </p>
      </div>
    </div>
  );
}
