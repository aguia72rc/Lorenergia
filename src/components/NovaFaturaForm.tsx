"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { calcularFaturaDetalhada, consumoDeLeituras } from "@/lib/calc";
import { formatBRL, formatKwh } from "@/lib/format";
import { gerarFatura } from "@/app/admin/faturas/actions";

interface ClienteOpcao {
  id: string;
  nome: string;
  unidade: string | null;
  desconto_percentual: number;
}

export interface TarifasPadrao {
  tusd: number;
  te: number;
  bandeira: number; // R$
  taxaSolar: number; // R$
  iluminacao: number; // R$
}

export default function NovaFaturaForm({
  clientes,
  ultimaLeitura,
  tarifas,
  referenciaPadrao,
}: {
  clientes: ClienteOpcao[];
  ultimaLeitura: Record<string, number>;
  tarifas: TarifasPadrao;
  referenciaPadrao: string; // YYYY-MM
}) {
  const primeiro = clientes[0];
  const [clienteId, setClienteId] = useState(primeiro?.id ?? "");
  const [leituraAnterior, setLeituraAnterior] = useState(
    primeiro && ultimaLeitura[primeiro.id] != null ? String(ultimaLeitura[primeiro.id]) : ""
  );
  const [leituraAtual, setLeituraAtual] = useState("");
  const [fator, setFator] = useState("1");
  const [tusd, setTusd] = useState(String(tarifas.tusd));
  const [te, setTe] = useState(String(tarifas.te));
  const [bandeira, setBandeira] = useState(String(tarifas.bandeira));
  const [taxaSolar, setTaxaSolar] = useState(String(tarifas.taxaSolar));
  const [iluminacao, setIluminacao] = useState(String(tarifas.iluminacao));
  const [multa, setMulta] = useState("0");
  const [desconto, setDesconto] = useState(String(primeiro?.desconto_percentual ?? 20));

  const consumo = consumoDeLeituras(Number(leituraAnterior), Number(leituraAtual), Number(fator));

  const r = useMemo(
    () =>
      calcularFaturaDetalhada({
        consumoKwh: consumo,
        tarifaTusd: Number(tusd),
        tarifaTe: Number(te),
        adicionalBandeira: Number(bandeira),
        taxaEnergiaSolar: Number(taxaSolar),
        taxaIluminacao: Number(iluminacao),
        multaJuros: Number(multa),
        descontoPercentual: Number(desconto),
      }),
    [consumo, tusd, te, bandeira, taxaSolar, iluminacao, multa, desconto]
  );

  function onSelecionarCliente(id: string) {
    setClienteId(id);
    const c = clientes.find((x) => x.id === id);
    if (c) setDesconto(String(c.desconto_percentual));
    setLeituraAnterior(ultimaLeitura[id] != null ? String(ultimaLeitura[id]) : "");
  }

  return (
    <form action={gerarFatura} className="grid gap-6 lg:grid-cols-3">
      <div className="card space-y-4 lg:col-span-2">
        <div>
          <label className="label" htmlFor="cliente_id">Morador *</label>
          <select id="cliente_id" name="cliente_id" className="input" value={clienteId} onChange={(e) => onSelecionarCliente(e.target.value)} required>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.nome} {c.unidade ? `— ${c.unidade}` : ""}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="referencia">Mês de referência *</label>
            <input id="referencia" name="referencia" type="month" className="input" defaultValue={referenciaPadrao} required />
          </div>
          <div>
            <label className="label" htmlFor="vencimento">Vencimento</label>
            <input id="vencimento" name="vencimento" type="date" className="input" />
          </div>
        </div>

        <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Medição</p>
        <div className="grid gap-4 sm:grid-cols-4">
          <Campo label="Leitura anterior" name="leitura_anterior" value={leituraAnterior} onChange={setLeituraAnterior} step={0.01} />
          <Campo label="Leitura atual *" name="leitura_atual" value={leituraAtual} onChange={setLeituraAtual} step={0.01} required />
          <Campo label="Fator mult." name="fator_multiplicador" value={fator} onChange={setFator} step={0.0001} />
          <div>
            <label className="label">Consumo</label>
            <div className="flex h-[38px] items-center rounded-lg bg-slate-100 px-3 text-sm font-semibold text-slate-700">{formatKwh(consumo)}</div>
          </div>
        </div>

        <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Tarifas de energia (R$/kWh)</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Consumo — TUSD" name="tarifa_tusd" value={tusd} onChange={setTusd} step={0.00001} />
          <Campo label="Consumo — TE" name="tarifa_te" value={te} onChange={setTe} step={0.00001} />
        </div>

        <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Valores fixos (R$)</p>
        <div className="grid gap-4 sm:grid-cols-4">
          <Campo label="Taxa energia solar" name="taxa_energia_solar" value={taxaSolar} onChange={setTaxaSolar} step={0.01} />
          <Campo label="Adic. bandeira" name="adicional_bandeira" value={bandeira} onChange={setBandeira} step={0.01} />
          <Campo label="Ilum. pública" name="taxa_iluminacao" value={iluminacao} onChange={setIluminacao} step={0.01} />
          <Campo label="Multa / juros" name="multa_juros" value={multa} onChange={setMulta} step={0.01} />
        </div>

        <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Tributos (informativo) · Situação</p>
        <div className="grid gap-4 sm:grid-cols-4">
          <NumInput label="ICMS (R$)" name="icms" step={0.01} />
          <NumInput label="PIS (R$)" name="pis" step={0.01} />
          <NumInput label="COFINS (R$)" name="cofins" step={0.01} />
          <div>
            <label className="label" htmlFor="desconto_percentual">Desconto (%)</label>
            <input id="desconto_percentual" name="desconto_percentual" type="number" min={0} max={100} step={0.5} className="input" value={desconto} onChange={(e) => setDesconto(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="status">Situação</label>
            <select id="status" name="status" className="input" defaultValue="pendente">
              <option value="pendente">Pendente</option>
              <option value="paga">Paga</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="observacoes">Observações</label>
            <input id="observacoes" name="observacoes" className="input" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card bg-slate-900 text-white">
          <p className="text-sm text-slate-300">Prévia do cálculo</p>
          <div className="mt-3 space-y-1.5 text-sm">
            <Linha rotulo="Consumo — TUSD" valor={formatBRL(r.energiaTusd)} />
            <Linha rotulo="Consumo — TE" valor={formatBRL(r.energiaTe)} />
            {r.taxaSolar > 0 && <Linha rotulo="Taxa energia solar" valor={formatBRL(r.taxaSolar)} />}
            {r.bandeira > 0 && <Linha rotulo="Adicional bandeira" valor={formatBRL(r.bandeira)} />}
            <Linha rotulo={`Desconto (${desconto || 0}%)`} valor={`- ${formatBRL(r.valorDesconto)}`} classe="text-eco-400" />
            {r.iluminacao > 0 && <Linha rotulo="Iluminação pública" valor={formatBRL(r.iluminacao)} />}
            {r.multaJuros > 0 && <Linha rotulo="Multa / juros" valor={formatBRL(r.multaJuros)} />}
            <div className="my-2 border-t border-slate-700" />
            <div className="flex items-center justify-between">
              <span className="font-semibold">A pagar</span>
              <span className="text-2xl font-bold text-brand-400">{formatBRL(r.valorLiquido)}</span>
            </div>
            <div className="mt-2 rounded-lg bg-eco-600/20 px-3 py-2 text-eco-300">🌱 Economia: <strong>{formatBRL(r.economia)}</strong></div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button type="submit" className="btn-primary w-full">Gerar fatura</button>
          <Link href="/admin/faturas" className="btn-outline w-full">Cancelar</Link>
        </div>
      </div>
    </form>
  );
}

function Campo({ label, name, value, onChange, step, required }: { label: string; name: string; value: string; onChange: (v: string) => void; step: number; required?: boolean }) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} type="number" min={0} step={step} className="input" value={value} onChange={(e) => onChange(e.target.value)} required={required} />
    </div>
  );
}

function NumInput({ label, name, step }: { label: string; name: string; step: number }) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} type="number" min={0} step={step} className="input" defaultValue={0} />
    </div>
  );
}

function Linha({ rotulo, valor, classe }: { rotulo: string; valor: string; classe?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-300">{rotulo}</span>
      <span className={classe ?? ""}>{valor}</span>
    </div>
  );
}
