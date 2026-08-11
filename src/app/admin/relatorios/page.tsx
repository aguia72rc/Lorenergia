import { Wallet, CheckCircle2, Clock, Leaf, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  formatBRL,
  formatReferencia,
  formatReferenciaCurta,
  formatData,
  primeiroDiaMesAtual,
  faturaVencida,
} from "@/lib/format";
import MonthFilter from "@/components/MonthFilter";
import EconomiaChart from "@/components/EconomiaChart";
import StatusBadge from "@/components/StatusBadge";
import type { FaturaComCliente, Fatura } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: { mes?: string };
}) {
  const supabase = createClient();

  const mesPadrao = primeiroDiaMesAtual().slice(0, 7);
  const mesParam = searchParams.mes ?? mesPadrao;
  const [ano, m] = mesParam.split("-");
  const referencia = `${ano}-${(m ?? "01").padStart(2, "0")}-01`;

  const [{ data: doMes }, { data: todas }] = await Promise.all([
    supabase
      .from("faturas")
      .select("*, clientes(id, nome, unidade, telefone, email)")
      .eq("referencia", referencia)
      .order("created_at", { ascending: true }),
    supabase.from("faturas").select("referencia, valor_liquido, economia, status"),
  ]);

  const faturasMes = (doMes ?? []) as FaturaComCliente[];
  const ativas = faturasMes.filter((f) => f.status !== "cancelada");

  const faturado = ativas.reduce((s, f) => s + Number(f.valor_liquido), 0);
  const recebido = ativas.filter((f) => f.status === "paga").reduce((s, f) => s + Number(f.valor_liquido), 0);
  const aReceber = ativas.filter((f) => f.status === "pendente").reduce((s, f) => s + Number(f.valor_liquido), 0);
  const economia = ativas.reduce((s, f) => s + Number(f.economia), 0);
  const vencidas = ativas.filter((f) => faturaVencida(f.vencimento, f.status));
  const valorVencido = vencidas.reduce((s, f) => s + Number(f.valor_liquido), 0);

  // Gráfico: recebido (faturas pagas) por mês, últimos 12 meses.
  const porMes = new Map<string, number>();
  for (const f of (todas ?? []) as Pick<Fatura, "referencia" | "valor_liquido" | "status">[]) {
    if (f.status !== "paga") continue;
    porMes.set(f.referencia, (porMes.get(f.referencia) ?? 0) + Number(f.valor_liquido));
  }
  const pontosRecebido = Array.from(porMes.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([ref, valor]) => ({ label: formatReferenciaCurta(ref), valor, referencia: ref }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Relatórios</h1>
          <p className="text-sm text-slate-400">Recebimentos de {formatReferencia(referencia)}</p>
        </div>
        <MonthFilter basePath="/admin/relatorios" defaultValue={mesPadrao} permitirLimpar={false} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<Wallet />} titulo="Faturado no mês" valor={formatBRL(faturado)} cor="bg-brand-500/15 text-brand-300" />
        <Kpi icon={<CheckCircle2 />} titulo="Recebido" valor={formatBRL(recebido)} cor="bg-eco-500/15 text-eco-300" />
        <Kpi icon={<Clock />} titulo="A receber" valor={formatBRL(aReceber)} cor="bg-amber-500/15 text-amber-300" />
        <Kpi icon={<Leaf />} titulo="Economia gerada" valor={formatBRL(economia)} cor="bg-eco-500/15 text-eco-300" />
      </div>

      {vencidas.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {vencidas.length} fatura(s) vencida(s) neste mês, somando <strong>{formatBRL(valorVencido)}</strong>.
        </div>
      )}

      <div className="card">
        <h2 className="mb-1 font-semibold text-white">Recebimentos mês a mês</h2>
        <p className="mb-4 text-sm text-slate-400">Total recebido (faturas pagas) por mês.</p>
        <EconomiaChart
          dados={pontosRecebido}
          destaqueRef={referencia}
          cor="#ca8a04"
          ariaLabel="Gráfico de recebimentos mensais"
          textoVazio="Nenhum recebimento registrado ainda."
        />
      </div>

      <div className="card overflow-x-auto">
        <h2 className="mb-4 font-semibold text-white">Detalhe por morador — {formatReferencia(referencia)}</h2>
        {ativas.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Nenhuma fatura neste mês.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-slate-400">
                <th className="pb-2 font-medium">Morador</th>
                <th className="pb-2 font-medium">Vencimento</th>
                <th className="pb-2 text-right font-medium">Valor</th>
                <th className="pb-2 text-right font-medium">Economia</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {ativas.map((f) => {
                const venc = faturaVencida(f.vencimento, f.status);
                return (
                  <tr key={f.id} className="border-b border-white/5 last:border-0">
                    <td className="py-2.5 font-medium text-white">
                      {f.clientes?.nome}
                      <span className="ml-1 text-xs text-slate-400">{f.clientes?.unidade}</span>
                    </td>
                    <td className={`py-2.5 ${venc ? "font-medium text-red-400" : "text-slate-300"}`}>
                      {formatData(f.vencimento)}
                    </td>
                    <td className="py-2.5 text-right text-white">{formatBRL(f.valor_liquido)}</td>
                    <td className="py-2.5 text-right text-eco-300">{formatBRL(f.economia)}</td>
                    <td className="py-2.5">
                      {venc ? <span className="badge bg-red-500/15 text-red-300">Vencida</span> : <StatusBadge status={f.status} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/10 font-semibold text-white">
                <td className="pt-3" colSpan={2}>Total</td>
                <td className="pt-3 text-right">{formatBRL(faturado)}</td>
                <td className="pt-3 text-right text-eco-300">{formatBRL(economia)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}

function Kpi({ icon, titulo, valor, cor }: { icon: React.ReactNode; titulo: string; valor: string; cor: string }) {
  return (
    <div className="card">
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${cor}`}>{icon}</div>
      <p className="text-sm text-slate-400">{titulo}</p>
      <p className="mt-1 text-xl font-bold text-white">{valor}</p>
    </div>
  );
}
