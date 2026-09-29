"use client";

import { useState } from "react";
import { formatKwh } from "@/lib/format";
import EconomiaChart from "@/components/EconomiaChart";

interface Ponto { label: string; valor: number; referencia: string }
interface ClienteHist { clienteId: string; nome: string; unidade: string | null; pontos: Ponto[] }

export default function SaldoHistoricoCliente({
  clientes,
  destaqueRef,
}: {
  clientes: ClienteHist[];
  destaqueRef?: string;
}) {
  const [sel, setSel] = useState<string>(clientes[0]?.clienteId ?? "");
  const cliente = clientes.find((c) => c.clienteId === sel) ?? clientes[0];
  const pontos = cliente?.pontos ?? [];
  const saldoAtual = pontos.length > 0 ? pontos[pontos.length - 1].valor : 0;

  if (clientes.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">Nenhum morador ativo.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <label htmlFor="saldo_cliente" className="label">Morador</label>
          <select
            id="saldo_cliente"
            value={sel}
            onChange={(e) => setSel(e.target.value)}
            className="input w-full sm:w-72"
          >
            {clientes.map((c) => (
              <option key={c.clienteId} value={c.clienteId}>
                {c.nome}{c.unidade ? ` — ${c.unidade}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Saldo atual</p>
          <p className="text-xl font-bold text-eco-300">{formatKwh(saldoAtual)}</p>
        </div>
      </div>

      <EconomiaChart
        dados={pontos}
        destaqueRef={destaqueRef}
        cor="#34d399"
        formato="kwh"
        variante="escuro"
        ariaLabel={`Histórico de saldo de créditos de ${cliente?.nome ?? ""}`}
        textoVazio="Sem histórico de saldo para este morador."
      />
    </div>
  );
}
