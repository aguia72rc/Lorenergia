"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Trash2, Save, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { validarPlanos, type PlanoDesconto } from "@/lib/simulador";
import { salvarPlanos, type LinhaPlano } from "@/app/admin/planos/actions";

let seq = 0;
const novaChave = () => `n${seq++}`;

interface Linha extends LinhaPlano {
  _k: string;
}

export default function PlanosEditor({ iniciais }: { iniciais: LinhaPlano[] }) {
  const [linhas, setLinhas] = useState<Linha[]>(iniciais.map((l) => ({ ...l, _k: novaChave() })));
  const [salvando, startSalvar] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  const validacao = useMemo(
    () => validarPlanos(linhas.map((l) => ({ codigo: l.codigo, nome: l.nome, desconto_percentual: l.desconto_percentual, fidelidade: l.fidelidade, ativo: l.ativo })) as PlanoDesconto[]),
    [linhas]
  );

  function set(k: string, campo: keyof LinhaPlano, valor: string | number | boolean) {
    setLinhas((ls) => ls.map((l) => (l._k === k ? { ...l, [campo]: valor } : l)));
  }
  function adicionar() {
    setLinhas((ls) => [...ls, { _k: novaChave(), codigo: "", nome: "", desconto_percentual: 0, fidelidade: false, ativo: true }]);
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

  const erros = validacao.problemas.filter((p) => p.nivel === "erro");
  const avisos = validacao.problemas.filter((p) => p.nivel === "aviso");
  const temErro = erros.length > 0;

  return (
    <div className="space-y-4">
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-slate-400">
              <th className="pb-2 font-medium">Código</th>
              <th className="pb-2 font-medium">Nome</th>
              <th className="pb-2 font-medium">Desconto (%)</th>
              <th className="pb-2 text-center font-medium">Fidelidade</th>
              <th className="pb-2 text-center font-medium">Ativo</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l._k} className="border-b border-white/5 last:border-0">
                <td className="py-2 pr-2">
                  <input className="input w-24 uppercase" value={l.codigo} maxLength={6}
                    onChange={(e) => set(l._k, "codigo", e.target.value.toUpperCase())} />
                </td>
                <td className="py-2 pr-2">
                  <input className="input w-40" value={l.nome} placeholder="Com fidelidade"
                    onChange={(e) => set(l._k, "nome", e.target.value)} />
                </td>
                <td className="py-2 pr-2">
                  <input className="input w-24 tabular-nums" type="number" min={0} max={100} step={1} value={l.desconto_percentual}
                    onChange={(e) => set(l._k, "desconto_percentual", Number(e.target.value))} />
                </td>
                <td className="py-2 text-center">
                  <input type="checkbox" checked={l.fidelidade} onChange={(e) => set(l._k, "fidelidade", e.target.checked)} className="h-4 w-4 accent-brand-500" />
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
            ))}
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

      <div className="card">
        <div className="mb-2 flex items-center gap-2">
          {temErro ? <XCircle className="h-5 w-5 text-red-400" /> : avisos.length > 0 ? <AlertTriangle className="h-5 w-5 text-amber-300" /> : <CheckCircle2 className="h-5 w-5 text-eco-300" />}
          <h2 className="font-semibold text-white">Validação dos planos</h2>
        </div>
        {erros.length === 0 && avisos.length === 0 ? (
          <p className="text-sm text-eco-300">Tudo certo: códigos únicos e descontos entre 0% e 100%.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {erros.map((p, i) => (
              <li key={`e${i}`} className="flex items-start gap-2 text-red-300"><XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {p.mensagem}</li>
            ))}
            {avisos.map((p, i) => (
              <li key={`a${i}`} className="flex items-start gap-2 text-amber-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {p.mensagem}</li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-slate-500">
          Marque <strong>Fidelidade</strong> no plano que exige contrato. O desconto vale sobre o valor da energia (kWh × tarifa); a iluminação pública não entra.
        </p>
      </div>
    </div>
  );
}
