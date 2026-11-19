import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ClienteFormFields from "@/components/ClienteFormFields";
import ListaRecibos from "@/components/ListaRecibos";
import { formatBRL, dataNoRecife } from "@/lib/format";
import { resumoPagamento } from "@/lib/pagamento";
import { atualizarCliente } from "../actions";
import type { Cliente } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditarClientePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aba?: string }>;
}) {
  const { id } = await params;
  const aba = (await searchParams).aba === "recibos" ? "recibos" : "dados";
  const supabase = await createClient();
  const [{ data }, { data: pagas }, { data: cfg }] = await Promise.all([
    supabase.from("clientes").select("*").eq("id", id).single(),
    // "*" para funcionar com ou sem as colunas pago_em/valor_pago (migrações 0030 e 0033)
    supabase.from("faturas").select("*").eq("cliente_id", id).eq("status", "paga").order("referencia", { ascending: false }),
    supabase.from("configuracoes").select("multa_percentual, juros_mensal_percentual").eq("id", 1).maybeSingle(),
  ]);

  if (!data) notFound();
  const cliente = data as Cliente;
  const acao = atualizarCliente.bind(null, cliente.id);
  const taxas = {
    multa: Number((cfg as { multa_percentual?: number } | null)?.multa_percentual ?? 2),
    juros: Number((cfg as { juros_mensal_percentual?: number } | null)?.juros_mensal_percentual ?? 1),
  };
  type Paga = { id: string; referencia: string; valor_liquido: number; vencimento: string | null; pago_em?: string | null; valor_pago?: number | null };
  const recibos = ((pagas ?? []) as Paga[]).map((f) => {
    const pg = resumoPagamento(f, f.pago_em ? dataNoRecife(new Date(f.pago_em)) : null, taxas);
    return { id: f.id, referencia: f.referencia, pago_em: f.pago_em ?? null, valor: pg.total, comEncargos: pg.encargos > 0 };
  });
  const totalPago = recibos.reduce((s, r) => s + r.valor, 0);

  const abaClasse = (ativa: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-semibold ${ativa ? "bg-brand-500 text-brand-950" : "glass text-slate-300 hover:bg-white/5"}`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/admin/clientes" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-white">{cliente.nome}</h1>
        {cliente.unidade && <p className="text-sm text-slate-400">{cliente.unidade}</p>}
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Dados e recibos do morador">
        <Link href={`/admin/clientes/${cliente.id}`} role="tab" aria-selected={aba === "dados"} className={abaClasse(aba === "dados")}>
          Dados
        </Link>
        <Link href={`/admin/clientes/${cliente.id}?aba=recibos`} role="tab" aria-selected={aba === "recibos"} className={abaClasse(aba === "recibos")}>
          Recibos ({recibos.length})
        </Link>
      </div>

      {aba === "recibos" ? (
        <div className="card">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold text-white">Recibos de pagamento</h2>
            {recibos.length > 0 && (
              <p className="text-sm text-slate-400">
                Total pago: <span className="font-semibold text-white">{formatBRL(totalPago)}</span>
              </p>
            )}
          </div>
          <ListaRecibos
            faturas={recibos}
            vazio="Nenhuma fatura deste morador está marcada como paga. O recibo aparece aqui assim que você marcar o pagamento."
          />
        </div>
      ) : (
        <form action={acao} className="card space-y-6">
          <ClienteFormFields cliente={cliente} />
          <div className="flex justify-end gap-2">
            <Link href="/admin/clientes" className="btn-outline">Cancelar</Link>
            <button type="submit" className="btn-primary">Salvar alterações</button>
          </div>
        </form>
      )}
    </div>
  );
}
