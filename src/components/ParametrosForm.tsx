"use client";

import { useMemo, useState, useTransition } from "react";
import { Save } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { salvarParametros, type EntradaParametros } from "@/app/admin/parametros/actions";

export default function ParametrosForm({ iniciais }: { iniciais: EntradaParametros }) {
  const [v, setV] = useState<EntradaParametros>(iniciais);
  const [salvando, startSalvar] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  const set = (campo: keyof EntradaParametros, valor: number) => setV((s) => ({ ...s, [campo]: valor }));

  // Prévia: valor do kWh com tributos (o que o cliente paga por kWh).
  const kwhComTributos = useMemo(() => {
    const div = 1 - v.icmsPct / 100 - v.pisCofinsPct / 100;
    return div > 0 ? (v.tusd + v.te) / div : 0;
  }, [v]);

  function salvar() {
    setMsg(null);
    startSalvar(async () => {
      const res = await salvarParametros(v);
      setMsg({ ok: res.ok, texto: res.mensagem });
    });
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Tarifa de energia (sem tributos)</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="TUSD (R$/kWh)" step={0.00001} value={v.tusd} onChange={(n) => set("tusd", n)} hint="Uso do sistema de distribuição" />
          <Campo label="TE (R$/kWh)" step={0.00001} value={v.te} onChange={(n) => set("te", n)} hint="Tarifa de energia" />
        </div>
        <p className="mt-2 text-xs text-slate-500">Tarifa TUSD + TE = <strong className="text-slate-300">{(v.tusd + v.te).toLocaleString("pt-BR", { minimumFractionDigits: 5 })}</strong> R$/kWh (sem tributos).</p>
      </div>

      <div className="card">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Tributos e encargos</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo label="ICMS (%)" step={0.01} value={v.icmsPct} onChange={(n) => set("icmsPct", n)} />
          <Campo label="PIS/COFINS (%)" step={0.01} value={v.pisCofinsPct} onChange={(n) => set("pisCofinsPct", n)} />
          <Campo label="Iluminação pública (R$/mês)" step={0.01} value={v.cip} onChange={(n) => set("cip", n)} hint="Municipal, sem desconto" />
        </div>
      </div>

      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-300">
          Valor do kWh <strong>com</strong> tributos ≈ <strong className="text-white">{formatBRL(kwhComTributos)}</strong>/kWh
          <span className="text-slate-500"> — é o que o cliente paga por kWh hoje.</span>
        </div>
        <button onClick={salvar} className="btn-primary" disabled={salvando}>
          <Save className="h-4 w-4" /> {salvando ? "Salvando…" : "Salvar parâmetros"}
        </button>
      </div>
      {msg && <p className={`text-sm ${msg.ok ? "text-eco-300" : "text-red-400"}`}>{msg.texto}</p>}
    </div>
  );
}

function Campo({ label, value, onChange, step, hint }: { label: string; value: number; onChange: (n: number) => void; step: number; hint?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input tabular-nums" type="number" min={0} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}
