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
  bandeira: number;
  fioB: number;
  iluminacao: number;
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
  const [tusd, setTusd] = useState(String(tarifas.tusd));
  const [te, setTe] = useState(String(tarifas.te));
  const [bandeira, setBandeira] = useState(String(tarifas.bandeira));
  const [fioB, setFioB] = useState(String(tarifas.fioB));
  const [iluminacao, setIluminacao] = useState(String(tarifas.iluminacao));
  const [multa, setMulta] = useState("0");
  const [desconto, setDesconto] = useState(String(primeiro?.desconto_percentual ?? 20));

  const consumo = consumoDeLeituras(Number(leituraAnterior), Number(leituraAtual));

  const r = useMemo(
    () =>
      calcularFaturaDetalhada({
        consumoKwh: consumo,
        tarifaTusd: Number(tusd),
        tarifaTe: Number(te),
        adicionalBandeira: Number(bandeira),
        fioB: Number(fioB),
        taxaIluminacao: Number(iluminacao),
        multaJuros: Number(multa),
        descontoPercentual: Number(desconto),
      }),
    [consumo, tusd, te, bandeira, fioB, iluminacao, multa, desconto]
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
              <option key={c.id} value={c.id}>
                {c.nome} {c.unidade ? `— ${c.unidade}` : ""}
              </option>
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

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="leitura_anterior">Leitura anterior</label>
            <input id="leitura_anterior" name="leitura_anterior" type="number" min={0} step={0.01} className="input" value={leituraAnterior} onChange={(e) => setLeituraAnterior(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="leitura_atual">Leitura atual *</label>
            <input id="leitura_atual" name="leitura_atual" type="number" min={0} step={0.01} className="input" value={leituraAtual} onChange={(e) => setLeituraAtual(e.target.value)} required />
          </div>
          <div>
            <label className="label">Consumo</label>
            <div className="flex h-[38px] items-center rounded-lg bg-slate-100 px-3 text-sm font-semibold text-slate-700">{formatKwh(consumo)}</div>
          </div>
        </div>

        <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Tarifas (R$/kWh)</p>
        <div className="grid gap-4 sm:grid-cols-4">
          <Campo label="TUSD" name="tarifa_tusd" value={tusd} onChange={setTusd} step={0.00001} />
          <Campo label="TE" name="tarifa_te" value={te} onChange={setTe} step={0.00001} />
          <Campo label="Adic. bandeira" name="adicional_bandeira" value={bandeira} onChange={setBandeira} step={0.00001} />
          <Campo label="Fio-B TUSD GII" name="fio_b" value={fioB} onChange={setFioB} step={0.00001} />
        </div>

        <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Valores (R$)</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo label="Ilum. pública" name="taxa_iluminacao" value={iluminacao} onChange={setIluminacao} step={0.01} />
          <Campo label="Multa / juros" name="multa_juros" value={multa} onChange={setMulta} step={0.01} />
          <div>
            <label className="label" htmlFor="desconto_percentual">Desconto (%)</label>
            <input id="desconto_percentual" name="desconto_percentual" type="number" min={0} max={100} step={0.5} className="input" value={desconto} onChange={(e) => setDesconto(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="status">Situação</label>
          <select id="status" name="status" className="input" defaultValue="pendente">
            <option value="pendente">Pendente</option>
            <option value="paga">Paga</option>
          </select>
        </div>

        <div>
          <label className="label" htmlFor="observacoes">Observações</label>
          <textarea id="observacoes" name="observacoes" rows={2} className="input" />
        </div>
      </div>

      <div className="space-y-4">
        <div className="card bg-slate-900 text-white">
          <p className="text-sm text-slate-300">Prévia do cálculo</p>
          <div className="mt-3 space-y-1.5 text-sm">
            <Linha rotulo="Consumo" valor={formatKwh(consumo)} />
            <Linha rotulo="Energia (TUSD+TE)" valor={formatBRL(r.energia)} />
            {r.bandeira > 0 && <Linha rotulo="Adicional bandeira" valor={formatBRL(r.bandeira)} />}
            <Linha rotulo={`Desconto (${desconto || 0}%)`} valor={`- ${formatBRL(r.valorDesconto)}`} classe="text-eco-400" />
            {r.fioB > 0 && <Linha rotulo="Fio-B TUSD GII" valor={formatBRL(r.fioB)} />}
            {r.iluminacao > 0 && <Linha rotulo="Iluminação pública" valor={formatBRL(r.iluminacao)} />}
            {r.multaJuros > 0 && <Linha rotulo="Multa / juros" valor={formatBRL(r.multaJuros)} />}
            <div className="my-2 border-t border-slate-700" />
            <div className="flex items-center justify-between">
              <span className="font-semibold">A pagar</span>
              <span className="text-2xl font-bold text-brand-400">{formatBRL(r.valorLiquido)}</span>
            </div>
            <div className="mt-2 rounded-lg bg-eco-600/20 px-3 py-2 text-eco-300">
              🌱 Economia do morador: <strong>{formatBRL(r.economia)}</strong>
            </div>
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

function Campo({ label, name, value, onChange, step }: { label: string; name: string; value: string; onChange: (v: string) => void; step: number }) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} type="number" min={0} step={step} className="input" value={value} onChange={(e) => onChange(e.target.value)} />
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
