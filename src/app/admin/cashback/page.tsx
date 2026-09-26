import Link from "next/link";
import { Coins, HandCoins, CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatBRL, formatReferencia, formatData } from "@/lib/format";
import QuitarCashbackButton from "@/components/QuitarCashbackButton";

export const dynamic = "force-dynamic";

interface FaturaCashback {
  id: string;
  cliente_id: string;
  referencia: string;
  cashback_valor: number;
  cashback_pago: boolean;
  cashback_pago_em: string | null;
  clientes: { nome: string; unidade: string | null; cashback_periodicidade: string | null } | null;
}

export default async function CashbackPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("faturas")
    .select("id, cliente_id, referencia, cashback_valor, cashback_pago, cashback_pago_em, clientes(nome, unidade, cashback_periodicidade)")
    .eq("modalidade_beneficio", "cashback")
    .order("referencia", { ascending: true });

  // Migração 0018 ainda não aplicada.
  if (error && /modalidade_beneficio|cashback/.test(error.message)) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-white">Cashback</h1>
        <div className="card text-sm text-amber-300">
          A funcionalidade de cashback ainda não está ativa no banco. Rode a migração <code>0018_cashback.sql</code> no Supabase.
        </div>
      </div>
    );
  }

  const faturas = (data ?? []) as unknown as FaturaCashback[];

  // Agrupa por morador o cashback PENDENTE (ainda não pago).
  interface Grupo {
    clienteId: string;
    nome: string;
    unidade: string | null;
    periodicidade: string | null;
    total: number;
    meses: string[];
  }
  const pendentesMap = new Map<string, Grupo>();
  let totalPendente = 0;
  let totalPago = 0;

  for (const f of faturas) {
    const valor = Number(f.cashback_valor);
    if (f.cashback_pago) {
      totalPago += valor;
      continue;
    }
    totalPendente += valor;
    const g = pendentesMap.get(f.cliente_id) ?? {
      clienteId: f.cliente_id,
      nome: f.clientes?.nome ?? "—",
      unidade: f.clientes?.unidade ?? null,
      periodicidade: f.clientes?.cashback_periodicidade ?? null,
      total: 0,
      meses: [],
    };
    g.total += valor;
    g.meses.push(f.referencia);
    pendentesMap.set(f.cliente_id, g);
  }

  const pendentes = Array.from(pendentesMap.values()).sort((a, b) => b.total - a.total);

  // Últimos pagamentos (faturas de cashback já quitadas), agrupados por data+cliente.
  const pagos = faturas
    .filter((f) => f.cashback_pago && f.cashback_pago_em)
    .sort((a, b) => (b.cashback_pago_em ?? "").localeCompare(a.cashback_pago_em ?? ""))
    .slice(0, 20);

  const periodicidadeLabel = (p: string | null) => (p === "dezembro" ? "Em dezembro" : "A cada 6 meses");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Cashback</h1>
        <p className="text-sm text-slate-400">Saldo de cashback a pagar aos moradores que optaram por essa modalidade.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi icon={<Coins />} titulo="A pagar (acumulado)" valor={formatBRL(totalPendente)} cor="bg-brand-500/15 text-brand-300" />
        <Kpi icon={<HandCoins />} titulo="Já pago (histórico)" valor={formatBRL(totalPago)} cor="bg-eco-500/15 text-eco-300" />
        <Kpi icon={<CalendarClock />} titulo="Moradores com saldo" valor={String(pendentes.length)} cor="bg-amber-500/15 text-amber-300" />
      </div>

      <div className="card overflow-x-auto">
        <h2 className="mb-4 font-semibold text-white">Cashback a pagar por morador</h2>
        {pendentes.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            Nenhum cashback pendente. Moradores na modalidade cashback aparecem aqui conforme as faturas são geradas.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-slate-400">
                <th className="pb-2 font-medium">Morador</th>
                <th className="pb-2 font-medium">Periodicidade</th>
                <th className="pb-2 text-center font-medium">Meses</th>
                <th className="pb-2 text-right font-medium">A pagar</th>
                <th className="pb-2 text-right font-medium">Ação</th>
              </tr>
            </thead>
            <tbody>
              {pendentes.map((g) => (
                <tr key={g.clienteId} className="border-b border-white/5 last:border-0">
                  <td className="py-3 font-medium text-white">
                    {g.nome}
                    {g.unidade && <span className="ml-1 text-xs text-slate-400">{g.unidade}</span>}
                    <div className="text-xs text-slate-500">
                      {g.meses.map((m) => formatReferencia(m)).join(" · ")}
                    </div>
                  </td>
                  <td className="py-3 text-slate-300">{periodicidadeLabel(g.periodicidade)}</td>
                  <td className="py-3 text-center text-slate-300">{g.meses.length}</td>
                  <td className="py-3 text-right font-bold text-brand-300">{formatBRL(g.total)}</td>
                  <td className="py-3 text-right">
                    <QuitarCashbackButton clienteId={g.clienteId} nome={g.nome} total={formatBRL(g.total)} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/10 font-semibold text-white">
                <td className="pt-3" colSpan={3}>Total a pagar</td>
                <td className="pt-3 text-right text-brand-300">{formatBRL(totalPendente)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {pagos.length > 0 && (
        <div className="card overflow-x-auto">
          <h2 className="mb-4 font-semibold text-white">Últimos pagamentos de cashback</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-slate-400">
                <th className="pb-2 font-medium">Morador</th>
                <th className="pb-2 font-medium">Referência</th>
                <th className="pb-2 font-medium">Pago em</th>
                <th className="pb-2 text-right font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {pagos.map((f) => (
                <tr key={f.id} className="border-b border-white/5 last:border-0">
                  <td className="py-2.5 text-white">{f.clientes?.nome ?? "—"}</td>
                  <td className="py-2.5 text-slate-300">{formatReferencia(f.referencia)}</td>
                  <td className="py-2.5 text-slate-300">{formatData(f.cashback_pago_em)}</td>
                  <td className="py-2.5 text-right text-eco-300">{formatBRL(f.cashback_valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-500">
        Para colocar um morador na modalidade cashback, edite o cadastro dele em{" "}
        <Link href="/admin/clientes" className="text-brand-300 hover:underline">Moradores</Link>. O percentual do cashback é o mesmo do benefício (ex.: 20% com fidelidade).
      </p>
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
