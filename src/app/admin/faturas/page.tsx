import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatBRL, formatReferencia, formatData } from "@/lib/format";
import { getBaseUrl } from "@/lib/url";
import { montarMensagem, gerarLinkWhatsApp } from "@/lib/whatsapp";
import StatusBadge from "@/components/StatusBadge";
import FaturaRowActions from "@/components/FaturaRowActions";
import type { FaturaComCliente, Configuracoes, StatusFatura } from "@/lib/types";

export const dynamic = "force-dynamic";

const filtros: { chave: string; rotulo: string }[] = [
  { chave: "todas", rotulo: "Todas" },
  { chave: "pendente", rotulo: "Pendentes" },
  { chave: "paga", rotulo: "Pagas" },
  { chave: "cancelada", rotulo: "Canceladas" },
];

export default async function FaturasPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const supabase = createClient();
  const statusFiltro = searchParams.status ?? "todas";
  const baseUrl = getBaseUrl();

  let query = supabase
    .from("faturas")
    .select("*, clientes(id, nome, unidade, telefone, email)")
    .order("referencia", { ascending: false })
    .order("created_at", { ascending: false });

  if (statusFiltro !== "todas") {
    query = query.eq("status", statusFiltro as StatusFatura);
  }

  const [{ data: faturas }, { data: config }] = await Promise.all([
    query,
    supabase.from("configuracoes").select("*").eq("id", 1).single(),
  ]);

  const lista = (faturas ?? []) as FaturaComCliente[];
  const cfg = config as Configuracoes;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Faturas</h1>
          <p className="text-sm text-slate-500">{lista.length} fatura(s)</p>
        </div>
        <Link href="/admin/faturas/nova" className="btn-primary">
          <Plus className="h-4 w-4" /> Nova fatura
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {filtros.map((f) => (
          <Link
            key={f.chave}
            href={f.chave === "todas" ? "/admin/faturas" : `/admin/faturas?status=${f.chave}`}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              statusFiltro === f.chave ? "bg-brand-500 text-brand-950" : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            {f.rotulo}
          </Link>
        ))}
      </div>

      {lista.length === 0 ? (
        <div className="card flex flex-col items-center py-12 text-center">
          <FileText className="h-10 w-10 text-slate-300" />
          <p className="mt-3 text-slate-600">Nenhuma fatura encontrada.</p>
          <Link href="/admin/faturas/nova" className="btn-primary mt-4">
            <Plus className="h-4 w-4" /> Gerar fatura
          </Link>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="pb-2 font-medium">Morador</th>
                <th className="pb-2 font-medium">Referência</th>
                <th className="pb-2 font-medium">Consumo</th>
                <th className="pb-2 font-medium">A pagar</th>
                <th className="pb-2 font-medium">Economia</th>
                <th className="pb-2 font-medium">Vencimento</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((f) => {
                const mensagem = montarMensagem(f, cfg, `${baseUrl}/fatura/${f.id}`);
                const link = gerarLinkWhatsApp(f.clientes?.telefone, mensagem);
                return (
                  <tr key={f.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3">
                      <span className="font-medium text-slate-900">{f.clientes?.nome ?? "-"}</span>
                      <span className="ml-1 text-xs text-slate-400">{f.clientes?.unidade}</span>
                    </td>
                    <td className="py-3 text-slate-600">{formatReferencia(f.referencia)}</td>
                    <td className="py-3 text-slate-600">{f.consumo_kwh} kWh</td>
                    <td className="py-3 font-medium text-slate-900">{formatBRL(f.valor_liquido)}</td>
                    <td className="py-3 text-eco-700">{formatBRL(f.economia)}</td>
                    <td className="py-3 text-slate-600">{formatData(f.vencimento)}</td>
                    <td className="py-3"><StatusBadge status={f.status} /></td>
                    <td className="py-3">
                      <FaturaRowActions id={f.id} status={f.status} whatsappLink={link} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
