"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { calcularFatura, consumoDeLeituras } from "@/lib/calc";
import { formatBRL, formatKwh } from "@/lib/format";
import { gerarFaturasLote, type ItemLote } from "@/app/admin/faturas/actions";
import type { StatusFatura } from "@/lib/types";

interface ClienteLote {
  id: string;
  nome: string;
  unidade: string | null;
  desconto_percentual: number;
}

interface LinhaEstado {
  leituraAnterior: string;
  leituraAtual: string;
}

export default function FaturasLoteForm({
  clientes,
  ultimaLeitura,
  tarifaPadrao,
  taxaPadrao,
  referenciaPadrao,
}: {
  clientes: ClienteLote[];
  ultimaLeitura: Record<string, number>;
  tarifaPadrao: number;
  taxaPadrao: number;
  referenciaPadrao: string; // YYYY-MM
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mensagem, setMensagem] = useState<string | null>(null);

  const [referencia, setReferencia] = useState(referenciaPadrao);
  const [tarifa, setTarifa] = useState(String(tarifaPadrao));
  const [taxa, setTaxa] = useState(String(taxaPadrao));
  const [vencimento, setVencimento] = useState("");
  const [status, setStatus] = useState<StatusFatura>("pendente");

  const [linhas, setLinhas] = useState<Record<string, LinhaEstado>>(() =>
    Object.fromEntries(
      clientes.map((c) => [
        c.id,
        { leituraAnterior: ultimaLeitura[c.id] != null ? String(ultimaLeitura[c.id]) : "", leituraAtual: "" },
      ])
    )
  );

  function atualizar(id: string, campo: keyof LinhaEstado, valor: string) {
    setLinhas((prev) => ({ ...prev, [id]: { ...prev[id], [campo]: valor } }));
  }

  const calculados = useMemo(() => {
    const tarifaN = Number(tarifa);
    const taxaN = Number(taxa);
    return clientes.map((c) => {
      const l = linhas[c.id];
      const preenchida = l.leituraAtual !== "";
      const consumo = consumoDeLeituras(Number(l.leituraAnterior), Number(l.leituraAtual));
      const r = calcularFatura({
        consumoKwh: consumo,
        tarifaKwh: tarifaN,
        descontoPercentual: c.desconto_percentual,
        taxaIluminacao: taxaN,
      });
      return { cliente: c, consumo, preenchida, ...r };
    });
  }, [clientes, linhas, tarifa, taxa]);

  const preenchidas = calculados.filter((x) => x.preenchida);
  const totalPagar = preenchidas.reduce((s, x) => s + x.valorLiquido, 0);
  const totalEconomia = preenchidas.reduce((s, x) => s + x.economia, 0);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMensagem(null);
    const itens: ItemLote[] = clientes.map((c) => {
      const l = linhas[c.id];
      return {
        cliente_id: c.id,
        leitura_anterior: l.leituraAnterior === "" ? null : Number(l.leituraAnterior),
        leitura_atual: l.leituraAtual === "" ? null : Number(l.leituraAtual),
        desconto_percentual: c.desconto_percentual,
      };
    });

    startTransition(async () => {
      const r = await gerarFaturasLote({
        referencia,
        tarifa_kwh: Number(tarifa),
        taxa_iluminacao: Number(taxa),
        vencimento: vencimento || null,
        status,
        itens,
      });
      setMensagem(r.mensagem);
      if (r.ok) router.push("/admin/faturas");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Parâmetros do mês */}
      <div className="card grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className="label" htmlFor="referencia">Mês de referência *</label>
          <input id="referencia" type="month" className="input" value={referencia} onChange={(e) => setReferencia(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="tarifa">Tarifa (R$/kWh)</label>
          <input id="tarifa" type="number" min={0} step={0.00001} className="input" value={tarifa} onChange={(e) => setTarifa(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="taxa">Ilum. pública (R$)</label>
          <input id="taxa" type="number" min={0} step={0.01} className="input" value={taxa} onChange={(e) => setTaxa(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="vencimento">Vencimento</label>
          <input id="vencimento" type="date" className="input" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="status">Situação</label>
          <select id="status" className="input" value={status} onChange={(e) => setStatus(e.target.value as StatusFatura)}>
            <option value="pendente">Pendente</option>
            <option value="paga">Paga</option>
          </select>
        </div>
      </div>

      {/* Tabela de leituras */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="pb-2 font-medium">Morador</th>
              <th className="pb-2 font-medium">Leitura anterior</th>
              <th className="pb-2 font-medium">Leitura atual</th>
              <th className="pb-2 font-medium">Consumo</th>
              <th className="pb-2 font-medium">Desc.</th>
              <th className="pb-2 text-right font-medium">A pagar</th>
              <th className="pb-2 text-right font-medium">Economia</th>
            </tr>
          </thead>
          <tbody>
            {calculados.map(({ cliente: c, consumo, valorLiquido, economia, preenchida }) => (
              <tr key={c.id} className="border-b border-slate-100 last:border-0">
                <td className="py-2 pr-2">
                  <span className="font-medium text-slate-900">{c.nome}</span>
                  {c.unidade && <span className="ml-1 text-xs text-slate-400">{c.unidade}</span>}
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className="input w-28 py-1"
                    value={linhas[c.id].leituraAnterior}
                    onChange={(e) => atualizar(c.id, "leituraAnterior", e.target.value)}
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className="input w-28 py-1"
                    value={linhas[c.id].leituraAtual}
                    onChange={(e) => atualizar(c.id, "leituraAtual", e.target.value)}
                  />
                </td>
                <td className="py-2 pr-2 text-slate-600">{preenchida ? formatKwh(consumo) : "-"}</td>
                <td className="py-2 pr-2 text-slate-600">{c.desconto_percentual}%</td>
                <td className="py-2 pr-2 text-right font-medium text-slate-900">{preenchida ? formatBRL(valorLiquido) : "-"}</td>
                <td className="py-2 text-right text-eco-700">{preenchida ? formatBRL(economia) : "-"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 font-semibold text-slate-900">
              <td className="pt-3" colSpan={5}>Total ({preenchidas.length} fatura(s))</td>
              <td className="pt-3 text-right">{formatBRL(totalPagar)}</td>
              <td className="pt-3 text-right text-eco-700">{formatBRL(totalEconomia)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {mensagem && <span className="text-sm text-slate-600">{mensagem}</span>}
        <Link href="/admin/faturas" className="btn-outline">Cancelar</Link>
        <button type="submit" className="btn-primary" disabled={pending || preenchidas.length === 0}>
          {pending ? "Gerando..." : `Gerar ${preenchidas.length} fatura(s)`}
        </button>
      </div>
    </form>
  );
}
