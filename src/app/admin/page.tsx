import Link from "next/link";
import { Users, FileText, Wallet, Leaf, Plus, AlertTriangle, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatBRL, formatReferencia, primeiroDiaMesAtual, hojeISO } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import { AnimatedNumber } from "@/components/motion";
import type { FaturaComCliente } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = await createClient();
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
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>Painel</h1>
          <p className="text-sm text-slate-400">Resumo de {formatReferencia(refMes)}</p>
        </div>
        <Link href="/admin/faturas/nova" className="btn-primary">
          <Plus className="h-4 w-4" /> Nova fatura
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<Users />} titulo="Moradores ativos" valor={totalMoradores ?? 0} cor="bg-blue-500/15 text-blue-300" />
        <Kpi icon={<Wallet />} titulo="A receber (pendente)" valor={totalPendente} fmt="brl" cor="bg-amber-500/15 text-amber-300" />
        <Kpi icon={<FileText />} titulo="Faturado no mês" valor={receitaMes} fmt="brl" cor="bg-brand-500/15 text-brand-300" />
        <Kpi icon={<Leaf />} titulo="Economia gerada no mês" valor={economiaMes} fmt="brl" cor="bg-eco-500/15 text-eco-300" />
      </div>

      {qtdVencidas > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 backdrop-blur">
          <div className="flex items-center gap-3 text-red-300">
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
          <h2 className="font-semibold text-white">Últimas faturas</h2>
          <Link href="/admin/faturas" className="text-sm text-brand-300 hover:underline">
            Ver todas →
          </Link>
        </div>
        {(ultimas ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            Nenhuma fatura ainda. Cadastre os moradores e gere a primeira fatura.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-slate-500">
                  <th className="pb-2 font-medium">Morador</th>
                  <th className="pb-2 font-medium">Referência</th>
                  <th className="pb-2 font-medium">Valor</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(ultimas as FaturaComCliente[]).map((f) => (
                  <tr key={f.id} className="border-b border-white/5 last:border-0">
                    <td className="py-2.5">
                      <Link href={`/fatura/${f.id}`} className="font-medium text-white hover:text-brand-300">
                        {f.clientes?.nome ?? "-"}
                      </Link>
                      <span className="ml-1 text-xs text-slate-500">{f.clientes?.unidade}</span>
                    </td>
                    <td className="py-2.5 text-slate-300">{formatReferencia(f.referencia)}</td>
                    <td className="py-2.5 text-slate-200">{formatBRL(f.valor_liquido)}</td>
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

function Kpi({ icon, titulo, valor, fmt = "int", cor }: { icon: React.ReactNode; titulo: string; valor: number; fmt?: "int" | "brl"; cor: string }) {
  return (
    <div className="card card-hover">
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${cor}`}>{icon}</div>
      <p className="text-sm text-slate-400">{titulo}</p>
      <p className="mt-1 text-xl font-bold text-white">
        <AnimatedNumber value={valor} format={fmt} />
      </p>
    </div>
  );
}
