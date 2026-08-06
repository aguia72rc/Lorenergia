import Link from "next/link";
import { Users, FileText, Wallet, Leaf, Plus, AlertTriangle, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatBRL, formatReferencia, primeiroDiaMesAtual, hojeISO } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import type { FaturaComCliente } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = createClient();
  const refMes = primeiroDiaMesAtual();

  const [{ count: totalMoradores }, { data: faturasMes }, { data: pendentes }, { data: vencidas }, { data: ultimas }] =
    await Promise.all([
      supabase.from("clientes").select("*", { count: "exact", head: true }).eq("ativo", true),
      supabase.from("faturas").select("valor_liquido, economia").eq("referencia", refMes),
      supabase.from("faturas").select("valor_liquido").eq("status", "pendente"),
      supabase.from("faturas").select("valor_liquido").eq("status", "pendente").lt("vencimento", hojeISO()),
      supabase
        .from("faturas")
        .select("*, clientes(id, nome, unidade, telefone, email)")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const receitaMes = (faturasMes ?? []).reduce((s, f) => s + Number(f.valor_liquido), 0);
  const economiaMes = (faturasMes ?? []).reduce((s, f) => s + Number(f.economia), 0);
  const totalPendente = (pendentes ?? []).reduce((s, f) => s + Number(f.valor_liquido), 0);
  const totalVencido = (vencidas ?? []).reduce((s, f) => s + Number(f.valor_liquido), 0);
  const qtdVencidas = (vencidas ?? []).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Painel</h1>
          <p className="text-sm text-slate-500">Resumo de {formatReferencia(refMes)}</p>
        </div>
        <Link href="/admin/faturas/nova" className="btn-primary">
          <Plus className="h-4 w-4" /> Nova fatura
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<Users />} titulo="Moradores ativos" valor={String(totalMoradores ?? 0)} cor="bg-blue-100 text-blue-700" />
        <Kpi icon={<Wallet />} titulo="A receber (pendente)" valor={formatBRL(totalPendente)} cor="bg-amber-100 text-amber-700" />
        <Kpi icon={<FileText />} titulo="Faturado no mês" valor={formatBRL(receitaMes)} cor="bg-brand-100 text-brand-700" />
        <Kpi icon={<Leaf />} titulo="Economia gerada no mês" valor={formatBRL(economiaMes)} cor="bg-eco-100 text-eco-700" />
      </div>

      {qtdVencidas > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-3 text-red-700">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p className="text-sm">
              <strong>{qtdVencidas} fatura(s) vencida(s)</strong> somando {formatBRL(totalVencido)}. Envie um lembrete aos moradores.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/faturas?status=vencidas" className="btn-outline">Ver vencidas</Link>
            <Link href="/admin/faturas/enviar" className="btn-eco"><Send className="h-4 w-4" /> Enviar lembrete</Link>
          </div>
        </div>
      )}

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Últimas faturas</h2>
          <Link href="/admin/faturas" className="text-sm text-brand-700 hover:underline">
            Ver todas →
          </Link>
        </div>
        {(ultimas ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            Nenhuma fatura ainda. Cadastre os moradores e gere a primeira fatura.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="pb-2 font-medium">Morador</th>
                  <th className="pb-2 font-medium">Referência</th>
                  <th className="pb-2 font-medium">Valor</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(ultimas as FaturaComCliente[]).map((f) => (
                  <tr key={f.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2.5">
                      <Link href={`/fatura/${f.id}`} className="font-medium text-slate-900 hover:underline">
                        {f.clientes?.nome ?? "-"}
                      </Link>
                      <span className="ml-1 text-xs text-slate-400">{f.clientes?.unidade}</span>
                    </td>
                    <td className="py-2.5">{formatReferencia(f.referencia)}</td>
                    <td className="py-2.5">{formatBRL(f.valor_liquido)}</td>
                    <td className="py-2.5"><StatusBadge status={f.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ icon, titulo, valor, cor }: { icon: React.ReactNode; titulo: string; valor: string; cor: string }) {
  return (
    <div className="card">
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${cor}`}>
        {icon}
      </div>
      <p className="text-sm text-slate-500">{titulo}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{valor}</p>
    </div>
  );
}
