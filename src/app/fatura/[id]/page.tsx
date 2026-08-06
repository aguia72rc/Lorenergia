import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Sun, Leaf } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { formatBRL, formatKwh, formatReferencia, formatData } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import PrintButton from "@/components/PrintButton";
import type { FaturaComCliente, Configuracoes } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FaturaPage({ params }: { params: { id: string } }) {
  const sessao = await getSessao();
  if (!sessao) redirect(`/login?redirect=/fatura/${params.id}`);

  const supabase = createClient();

  // O RLS garante que o morador só enxergue as próprias faturas.
  const { data: fatura } = await supabase
    .from("faturas")
    .select("*, clientes(id, nome, unidade, telefone, email)")
    .eq("id", params.id)
    .single();

  if (!fatura) notFound();
  const f = fatura as FaturaComCliente;

  const { data: config } = await supabase.from("configuracoes").select("*").eq("id", 1).single();
  const cfg = config as Configuracoes | null;

  const voltarHref = sessao.profile?.role === "admin" ? "/admin/faturas" : "/portal";

  return (
    <div className="min-h-screen bg-slate-100 py-8">
      <div className="mx-auto max-w-2xl px-4">
        <div className="no-print mb-4 flex items-center justify-between">
          <Link href={voltarHref} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <PrintButton />
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {/* Cabeçalho */}
          <div className="flex items-start justify-between bg-slate-900 p-6 text-white">
            <div className="flex items-center gap-2">
              <Sun className="h-8 w-8 text-brand-400" />
              <div>
                <p className="text-lg font-bold">{cfg?.nome_usina ?? "Usina Solar"}</p>
                <p className="text-xs text-slate-400">Fatura de energia solar</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Referência</p>
              <p className="font-semibold">{formatReferencia(f.referencia)}</p>
            </div>
          </div>

          {/* Dados do morador */}
          <div className="grid gap-4 border-b border-slate-100 p-6 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Morador</p>
              <p className="font-semibold text-slate-900">{f.clientes?.nome}</p>
              {f.clientes?.unidade && <p className="text-sm text-slate-500">{f.clientes.unidade}</p>}
            </div>
            <div className="sm:text-right">
              <p className="text-xs uppercase tracking-wide text-slate-400">Situação</p>
              <div className="mt-1"><StatusBadge status={f.status} /></div>
              {f.vencimento && <p className="mt-1 text-sm text-slate-500">Vence em {formatData(f.vencimento)}</p>}
            </div>
          </div>

          {/* Detalhamento */}
          <div className="p-6">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-2.5 text-slate-600">Consumo do mês</td>
                  <td className="py-2.5 text-right font-medium text-slate-900">{formatKwh(f.consumo_kwh)}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2.5 text-slate-600">Tarifa (R$/kWh)</td>
                  <td className="py-2.5 text-right text-slate-900">{formatBRL(f.tarifa_kwh)}</td>
                </tr>
                {Number(f.taxa_iluminacao) > 0 && (
                  <tr className="border-b border-slate-100">
                    <td className="py-2.5 text-slate-600">Iluminação pública</td>
                    <td className="py-2.5 text-right text-slate-900">{formatBRL(f.taxa_iluminacao)}</td>
                  </tr>
                )}
                <tr className="border-b border-slate-100">
                  <td className="py-2.5 text-slate-600">Valor cheio (distribuidora)</td>
                  <td className="py-2.5 text-right text-slate-900">{formatBRL(f.valor_bruto)}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2.5 text-eco-700">Desconto energia solar ({f.desconto_percentual}%)</td>
                  <td className="py-2.5 text-right font-medium text-eco-700">- {formatBRL(f.valor_desconto)}</td>
                </tr>
              </tbody>
            </table>

            <div className="mt-4 flex items-center justify-between rounded-xl bg-brand-50 px-5 py-4">
              <span className="font-semibold text-slate-700">Total a pagar</span>
              <span className="text-3xl font-extrabold text-slate-900">{formatBRL(f.valor_liquido)}</span>
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-xl bg-eco-50 px-5 py-3 text-eco-700">
              <Leaf className="h-5 w-5" />
              <span className="text-sm">
                Você economizou <strong>{formatBRL(f.economia)}</strong> usando energia solar este mês. ☀️
              </span>
            </div>

            {cfg?.dados_pagamento && (
              <div className="mt-4 rounded-xl border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Pagamento</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{cfg.dados_pagamento}</p>
              </div>
            )}

            {f.observacoes && (
              <p className="mt-4 text-sm text-slate-500">
                <strong>Obs.:</strong> {f.observacoes}
              </p>
            )}
          </div>

          <div className="border-t border-slate-100 p-4 text-center text-xs text-slate-400">
            Fatura gerada por Lorenergia · Energia limpa e mais barata ☀️
          </div>
        </div>
      </div>
    </div>
  );
}
