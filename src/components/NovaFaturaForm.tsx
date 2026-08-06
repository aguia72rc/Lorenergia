"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { calcularFatura } from "@/lib/calc";
import { formatBRL } from "@/lib/format";
import { gerarFatura } from "@/app/admin/faturas/actions";

interface ClienteOpcao {
  id: string;
  nome: string;
  unidade: string | null;
  desconto_percentual: number;
}

export default function NovaFaturaForm({
  clientes,
  tarifaPadrao,
  taxaPadrao,
  referenciaPadrao,
}: {
  clientes: ClienteOpcao[];
  tarifaPadrao: number;
  taxaPadrao: number;
  referenciaPadrao: string; // YYYY-MM
}) {
  const [clienteId, setClienteId] = useState(clientes[0]?.id ?? "");
  const [consumo, setConsumo] = useState("");
  const [tarifa, setTarifa] = useState(String(tarifaPadrao));
  const [taxa, setTaxa] = useState(String(taxaPadrao));
  const [desconto, setDesconto] = useState(String(clientes[0]?.desconto_percentual ?? 20));

  const preview = useMemo(
    () =>
      calcularFatura({
        consumoKwh: Number(consumo),
        tarifaKwh: Number(tarifa),
        descontoPercentual: Number(desconto),
        taxaIluminacao: Number(taxa),
      }),
    [consumo, tarifa, desconto, taxa]
  );

  function onSelecionarCliente(id: string) {
    setClienteId(id);
    const c = clientes.find((x) => x.id === id);
    if (c) setDesconto(String(c.desconto_percentual));
  }

  return (
    <form action={gerarFatura} className="grid gap-6 lg:grid-cols-3">
      <div className="card space-y-4 lg:col-span-2">
        <div>
          <label className="label" htmlFor="cliente_id">Morador *</label>
          <select
            id="cliente_id"
            name="cliente_id"
            className="input"
            value={clienteId}
            onChange={(e) => onSelecionarCliente(e.target.value)}
            required
          >
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
            <label className="label" htmlFor="consumo_kwh">Consumo (kWh) *</label>
            <input
              id="consumo_kwh"
              name="consumo_kwh"
              type="number"
              min={0}
              step={0.01}
              className="input"
              value={consumo}
              onChange={(e) => setConsumo(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="tarifa_kwh">Tarifa (R$/kWh)</label>
            <input
              id="tarifa_kwh"
              name="tarifa_kwh"
              type="number"
              min={0}
              step={0.00001}
              className="input"
              value={tarifa}
              onChange={(e) => setTarifa(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="desconto_percentual">Desconto (%)</label>
            <input
              id="desconto_percentual"
              name="desconto_percentual"
              type="number"
              min={0}
              max={100}
              step={0.5}
              className="input"
              value={desconto}
              onChange={(e) => setDesconto(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="taxa_iluminacao">Iluminação pública (R$)</label>
            <input
              id="taxa_iluminacao"
              name="taxa_iluminacao"
              type="number"
              min={0}
              step={0.01}
              className="input"
              value={taxa}
              onChange={(e) => setTaxa(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="status">Situação</label>
            <select id="status" name="status" className="input" defaultValue="pendente">
              <option value="pendente">Pendente</option>
              <option value="paga">Paga</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="observacoes">Observações</label>
          <textarea id="observacoes" name="observacoes" rows={2} className="input" />
        </div>
      </div>

      <div className="space-y-4">
        <div className="card bg-slate-900 text-white">
          <p className="text-sm text-slate-300">Prévia do cálculo</p>
          <div className="mt-3 space-y-2 text-sm">
            <Linha rotulo="Valor cheio (distribuidora)" valor={formatBRL(preview.valorBruto)} />
            <Linha rotulo={`Desconto (${desconto || 0}%)`} valor={`- ${formatBRL(preview.valorDesconto)}`} classe="text-eco-400" />
            <div className="my-2 border-t border-slate-700" />
            <div className="flex items-center justify-between">
              <span className="font-semibold">A pagar</span>
              <span className="text-2xl font-bold text-brand-400">{formatBRL(preview.valorLiquido)}</span>
            </div>
            <div className="mt-2 rounded-lg bg-eco-600/20 px-3 py-2 text-eco-300">
              🌱 Economia do morador: <strong>{formatBRL(preview.economia)}</strong>
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

function Linha({ rotulo, valor, classe }: { rotulo: string; valor: string; classe?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-300">{rotulo}</span>
      <span className={classe ?? ""}>{valor}</span>
    </div>
  );
}
