import Link from "next/link";
import { Leaf, Wallet, FileText, TrendingDown, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { formatBRL, formatReferencia, formatData, formatReferenciaCurta } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import EconomiaChart from "@/components/EconomiaChart";
import type { Cliente, Fatura } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const sessao = await getSessao();
  const supabase = createClient();

  if (!sessao?.profile?.cliente_id) {
    return (
      <div className="card text-center">
        <h1 className="text-xl font-bold text-slate-900">Conta ainda não vinculada</h1>
        <p className="mt-2 text-sm text-slate-600">
          Seu acesso foi criado, mas ainda não está ligado a um cadastro de morador.
          Peça ao responsável pela usina para vincular o e-mail <strong>{sessao?.email}</strong> ao seu cadastro.
        </p>
      </div>
    );
  }

  const [{ data: cliente }, { data: faturas }] = await Promise.all([
    supabase.from("clientes").select("*").eq("id", sessao.profile.cliente_id).single(),
    supabase
      .from("faturas")
      .select("*")
      .eq("cliente_id", sessao.profile.cliente_id)
      .order("referencia", { ascending: false }),
  ]);

  const c = cliente as Cliente;
  const lista = (faturas ?? []) as Fatura[];

  const anoAtual = new Date().getFullYear();
  const economiaTotal = lista.reduce((s, f) => s + Number(f.economia), 0);
  const economiaAno = lista
    .filter((f) => f.referencia.startsWith(String(anoAtual)))
    .reduce((s, f) => s + Number(f.economia), 0);
  const pendentes = lista.filter((f) => f.status === "pendente");
  const totalPendente = pendentes.reduce((s, f) => s + Number(f.valor_liquido), 0);

  // Pontos do gráfico (ordem cronológica, até os últimos 12 meses).
  const pontosEconomia = [...lista]
    .filter((f) => f.status !== "cancelada")
    .sort((a, b) => a.referencia.localeCompare(b.referencia))
    .slice(-12)
    .map((f) => ({ label: formatReferenciaCurta(f.referencia), valor: Number(f.economia), referencia: f.referencia }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Olá, {c?.nome?.split(" ")[0]} 👋</h1>
        <p className="text-sm text-slate-500">Acompanhe suas faturas e sua economia com energia solar.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<Leaf />} titulo="Economia total" valor={formatBRL(economiaTotal)} cor="bg-eco-100 text-eco-700" destaque />
        <Kpi icon={<TrendingDown />} titulo={`Economia em ${anoAtual}`} valor={formatBRL(economiaAno)} cor="bg-eco-100 text-eco-700" />
        <Kpi icon={<Wallet />} titulo="Em aberto" valor={formatBRL(totalPendente)} cor="bg-amber-100 text-amber-700" />
        <Kpi icon={<FileText />} titulo="Faturas" valor={String(lista.length)} cor="bg-blue-100 text-blue-700" />
      </div>

      {economiaTotal > 0 && (
        <div className="rounded-xl bg-gradient-to-r from-eco-600 to-eco-500 p-6 text-white">
          <p className="text-sm text-eco-50">Desde que você usa energia solar</p>
          <p className="mt-1 text-3xl font-extrabold">{formatBRL(economiaTotal)} economizados 🌱</p>
          <p className="mt-1 text-sm text-eco-50">Obrigado por escolher energia limpa!</p>
        </div>
      )}

      {pontosEconomia.length > 0 && (
        <div className="card">
          <h2 className="mb-1 font-semibold text-slate-900">Sua economia mês a mês</h2>
          <p className="mb-4 text-sm text-slate-500">Quanto você economizou (R$) usando energia solar.</p>
          <EconomiaChart dados={pontosEconomia} />
        </div>
      )}

      <div className="card">
        <h2 className="mb-4 font-semibold text-slate-900">Minhas faturas</h2>
        {lista.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">Você ainda não tem faturas.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {lista.map((f) => (
              <Link
                key={f.id}
                href={`/fatura/${f.id}`}
                className="flex items-center justify-between py-3 transition-colors hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium capitalize text-slate-900">{formatReferencia(f.referencia)}</p>
                  <p className="text-xs text-slate-500">
                    {f.consumo_kwh} kWh · economia {formatBRL(f.economia)}
                    {f.vencimento ? ` · vence ${formatData(f.vencimento)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    {Number(f.valor_desconto) > 0 && (
                      <p className="text-sm font-bold text-red-600">{formatBRL(f.valor_bruto)}</p>
                    )}
                    <p className="font-semibold text-slate-900">{formatBRL(f.valor_liquido)}</p>
                    <StatusBadge status={f.status} />
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({
  icon,
  titulo,
  valor,
  cor,
  destaque,
}: {
  icon: React.ReactNode;
  titulo: string;
  valor: string;
  cor: string;
  destaque?: boolean;
}) {
  return (
    <div className={`card ${destaque ? "ring-2 ring-eco-200" : ""}`}>
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${cor}`}>{icon}</div>
      <p className="text-sm text-slate-500">{titulo}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{valor}</p>
    </div>
  );
}
