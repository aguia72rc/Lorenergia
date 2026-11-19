import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Sun } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { formatBRL, formatReferencia, formatData, hojeISO, dataNoRecife } from "@/lib/format";
import { reaisPorExtenso } from "@/lib/extenso";
import { numeroRecibo, dataPorExtenso } from "@/lib/recibo";
import PrintButton from "@/components/PrintButton";
import type { FaturaComCliente } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Recibo de pagamento de uma fatura paga (o morador vê só os dele; o admin, todos). */
export default async function ReciboPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessao = await getSessao();
  if (!sessao) redirect(`/login?redirect=/recibo/${id}`);

  const supabase = await createClient();
  const { data } = await supabase
    .from("faturas")
    .select("*, clientes(id, nome, unidade, cpf, endereco, cep, cidade_uf, telefone, email, numero_medidor, tipo_ligacao)")
    .eq("id", id)
    .single();
  if (!data) notFound();

  const f = data as FaturaComCliente;
  const c = f.clientes;
  const ehAdmin = sessao.profile?.role === "admin";
  const voltarHref = ehAdmin ? (c ? `/admin/clientes/${c.id}?aba=recibos` : "/admin/faturas") : "/portal?aba=recibos";

  if (f.status !== "paga") {
    return (
      <div className="sem-aurora mx-auto max-w-xl px-4 py-12">
        <div className="card text-center">
          <h1 className="text-xl font-bold text-white">Recibo ainda não disponível</h1>
          <p className="mt-2 text-sm text-slate-400">O recibo é emitido quando a fatura de {formatReferencia(f.referencia)} estiver paga.</p>
          <Link href={`/fatura/${f.id}`} className="btn-primary mt-5">Ver a fatura</Link>
        </div>
      </div>
    );
  }

  const valor = Number(f.valor_liquido) || 0;
  const pagoEm = f.pago_em ? dataNoRecife(new Date(f.pago_em)) : null;
  const dataRecibo = pagoEm ?? hojeISO();

  return (
    <div className="sem-aurora min-h-screen py-8">
      <div className="mx-auto max-w-2xl px-4">
        <div className="no-print mb-4 flex items-center justify-between">
          <Link href={voltarHref} className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <PrintButton />
        </div>

        <div className="print-light overflow-hidden rounded-2xl bg-white text-slate-800 shadow-[0_0_60px_-12px_rgba(255,176,32,0.35)] ring-1 ring-white/10">
          <div className="flex items-start justify-between gap-4 bg-slate-900 p-6 text-white">
            <div className="flex items-center gap-3">
              <Sun className="h-8 w-8 shrink-0 text-brand-400" />
              <div>
                <p className="text-lg font-bold leading-tight">Lorenergia</p>
                <p className="text-xs text-slate-400">Energia que vem de casa 🌞🏡</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-slate-400">Recibo nº</p>
              <p className="whitespace-nowrap font-mono font-semibold">{numeroRecibo(f)}</p>
            </div>
          </div>

          <div className="space-y-6 p-6 sm:p-8">
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-slate-100 pb-5">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Recibo de pagamento</h1>
              <p className="text-3xl font-extrabold tabular-nums text-slate-900">{formatBRL(valor)}</p>
            </div>

            <p className="text-[15px] leading-relaxed">
              Recebemos de <strong className="text-slate-900">{c?.nome ?? "—"}</strong>
              {c?.cpf ? <>, CPF/CNPJ {c.cpf}</> : null}
              {c?.unidade ? <>, unidade {c.unidade}</> : null}, a importância de{" "}
              <strong className="text-slate-900">{formatBRL(valor)}</strong> ({reaisPorExtenso(valor)}), referente à fatura de energia solar
              compartilhada de <strong className="text-slate-900">{formatReferencia(f.referencia)}</strong>.
            </p>

            <dl className="grid gap-x-6 gap-y-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
              <Item rotulo="Mês de referência" valor={formatReferencia(f.referencia)} />
              <Item rotulo="Consumo" valor={`${(Number(f.consumo_kwh) || 0).toLocaleString("pt-BR")} kWh`} />
              <Item rotulo="Vencimento" valor={formatData(f.vencimento)} />
              <Item rotulo="Data do pagamento" valor={pagoEm ? formatData(pagoEm) : "não registrada"} />
              {Number(f.economia) > 0 && <Item rotulo="Economia com energia solar" valor={formatBRL(Number(f.economia))} destaque />}
            </dl>

            <p className="text-sm text-slate-600">
              Para clareza, firmamos o presente recibo dando plena quitação do valor acima.
            </p>

            <div className="flex flex-col items-center gap-1 pt-6 text-center">
              <p className="text-sm text-slate-600">Recife, {dataPorExtenso(dataRecibo)}.</p>
              <div className="mt-8 w-64 border-t border-slate-400 pt-2">
                <p className="font-semibold text-slate-900">Lorenergia</p>
                <p className="text-xs text-slate-500">Energia solar compartilhada</p>
              </div>
            </div>
          </div>
        </div>

        <p className="no-print mt-4 text-center text-xs text-slate-400">
          Recibo gerado pelo sistema da Lorenergia a partir do registro de pagamento da fatura.{" "}
          <Link href={`/fatura/${f.id}`} className="underline hover:text-white">Ver a fatura</Link>
        </p>
      </div>
    </div>
  );
}

function Item({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{rotulo}</dt>
      <dd className={`font-semibold ${destaque ? "text-emerald-700" : "text-slate-900"}`}>{valor}</dd>
    </div>
  );
}
