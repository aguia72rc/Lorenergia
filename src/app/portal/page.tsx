import Link from "next/link";
import { redirect } from "next/navigation";
import { Leaf, Wallet, FileText, TrendingDown, ChevronRight, Home, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { formatBRL, formatReferencia, formatData, formatReferenciaCurta } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import EconomiaChart from "@/components/EconomiaChart";
import EconomiaRing from "@/components/EconomiaRing";
import BoasVindasModal from "@/components/BoasVindasModal";
import { AnimatedNumber } from "@/components/motion";
import type { Cliente, Fatura } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const sessao = await getSessao();
  const supabase = createClient();

  // Primeiro acesso: obriga a definir uma senha pessoal.
  if (sessao?.profile?.must_change_password) {
    redirect("/portal/senha");
  }

  if (!sessao?.profile?.cliente_id) {
    return (
      <div className="card text-center">
        <h1 className="text-xl font-bold text-white">Conta ainda não vinculada</h1>
        <p className="mt-2 text-sm text-slate-300">
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

  // Projeção anual de economia: média mensal das faturas válidas × 12.
  const faturasValidas = lista.filter((f) => f.status !== "cancelada");
  const mediaMensalEconomia =
    faturasValidas.length > 0 ? economiaTotal / faturasValidas.length : 0;
  const projecaoAno = Math.round(mediaMensalEconomia * 12);

  // % de economia média (desconto / valor cheio) para o anel.
  const brutoTotal = faturasValidas.reduce((s, f) => s + Number(f.valor_bruto), 0);
  const descontoTotal = faturasValidas.reduce((s, f) => s + Number(f.valor_desconto), 0);
  const pctEconomia = brutoTotal > 0 ? (descontoTotal / brutoTotal) * 100 : 0;

  // Conquistas.
  const mesesAtivos = faturasValidas.length;
  const consumoTotal = faturasValidas.reduce((s, f) => s + Number(f.consumo_kwh), 0);
  // CO₂ evitado (estimativa) — fator aproximado do SIN: ~0,0817 kg CO₂/kWh.
  const co2Kg = consumoTotal * 0.0817;
  const co2Texto = co2Kg >= 1000 ? `${(co2Kg / 1000).toFixed(1)} t` : `${Math.round(co2Kg)} kg`;

  // Pontos do gráfico (ordem cronológica, até os últimos 12 meses).
  const faturasGrafico = [...lista]
    .filter((f) => f.status !== "cancelada")
    .sort((a, b) => a.referencia.localeCompare(b.referencia))
    .slice(-12);
  const pontosEconomia = faturasGrafico.map((f) => ({
    label: formatReferenciaCurta(f.referencia),
    valor: Number(f.economia),
    referencia: f.referencia,
  }));
  const pontosConsumo = faturasGrafico.map((f) => ({
    label: formatReferenciaCurta(f.referencia),
    valor: Number(f.consumo_kwh),
    referencia: f.referencia,
  }));

  return (
    <div className="space-y-6">
      <BoasVindasModal
        nome={c?.nome?.split(" ")[0] ?? "morador"}
        descontoPercentual={Number(c?.desconto_percentual ?? 0)}
        economiaAno={economiaAno}
        economiaTotal={economiaTotal}
        projecaoAno={projecaoAno}
      />
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>Olá, {c?.nome?.split(" ")[0]} 👋</h1>
        <p className="text-sm text-slate-400">Acompanhe suas faturas e sua economia com energia solar.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<Leaf />} titulo="Economia total" valor={economiaTotal} fmt="brl" cor="bg-eco-500/15 text-eco-300" destaque />
        <Kpi icon={<TrendingDown />} titulo={`Economia em ${anoAtual}`} valor={economiaAno} fmt="brl" cor="bg-eco-500/15 text-eco-300" />
        <Kpi icon={<Wallet />} titulo="Em aberto" valor={totalPendente} fmt="brl" cor="bg-amber-500/15 text-amber-300" />
        <Kpi icon={<FileText />} titulo="Faturas" valor={lista.length} cor="bg-blue-500/15 text-blue-300" />
      </div>

      {/* Link para site externo (Meu Aluguel) */}
      <a
        href="https://meualuguel.vercel.app/#/login"
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand-400/30 p-5 transition-colors hover:border-brand-400/60"
        style={{ background: "linear-gradient(120deg, rgba(255,176,32,0.14), rgba(34,211,238,0.08))" }}
      >
        <div className="flex items-center gap-4">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300">
            <Home className="h-6 w-6" />
          </span>
          <div>
            <p className="font-semibold text-white">Meu Aluguel</p>
            <p className="text-sm text-slate-400">Acesse o portal do seu aluguel.</p>
          </div>
        </div>
        <span className="btn-primary shrink-0">
          Acessar <ExternalLink className="h-4 w-4" />
        </span>
      </a>

      {economiaTotal > 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-eco-500/30 p-6"
          style={{ background: "linear-gradient(120deg, rgba(16,185,129,0.22), rgba(34,211,238,0.12))" }}>
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-eco-500/20 blur-3xl" />
          <p className="relative text-sm text-eco-200">Desde que você usa energia solar</p>
          <p className="relative mt-1 text-3xl font-extrabold text-white" style={{ fontFamily: "var(--font-display)" }}>
            <AnimatedNumber value={economiaTotal} format="brl" /> economizados 🌱
          </p>
          <p className="relative mt-1 text-sm text-eco-200">Obrigado por escolher energia limpa!</p>
        </div>
      )}

      {mesesAtivos > 0 && (
        <div className="card">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
            <div className="shrink-0">
              <EconomiaRing percent={pctEconomia} legenda="de economia" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-white">Suas conquistas com energia solar</h2>
              <p className="mt-1 text-sm text-slate-400">
                Em média você paga <strong className="text-eco-300">{numeroPct(pctEconomia)}% menos</strong> do que pagaria à distribuidora.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Conquista emoji="🌱" texto={`${mesesAtivos} ${mesesAtivos === 1 ? "mês" : "meses"} de energia solar`} />
                <Conquista emoji="💰" texto={`${formatBRL(economiaTotal)} economizados`} />
                <Conquista emoji="🌍" texto={`~${co2Texto} de CO₂ evitado`} />
                <Conquista emoji="⚡" texto="Geração compartilhada" />
              </div>
              <p className="mt-3 text-xs text-slate-500">CO₂ evitado é uma estimativa com base no seu consumo.</p>
            </div>
          </div>
        </div>
      )}

      {pontosEconomia.length > 0 && (
        <div className="card">
          <h2 className="mb-1 font-semibold text-white">Sua economia mês a mês</h2>
          <p className="mb-4 text-sm text-slate-400">Quanto você economizou (R$) usando energia solar.</p>
          <EconomiaChart dados={pontosEconomia} />
        </div>
      )}

      {pontosConsumo.length > 0 && (
        <div className="card">
          <h2 className="mb-1 font-semibold text-white">Seu consumo mês a mês</h2>
          <p className="mb-4 text-sm text-slate-400">Energia que você consumiu (kWh) por mês.</p>
          <EconomiaChart
            dados={pontosConsumo}
            cor="#38bdf8"
            formato="kwh"
            ariaLabel="Gráfico de consumo mensal em kWh"
            textoVazio="Ainda não há consumo para exibir."
          />
        </div>
      )}

      <div className="card">
        <h2 className="mb-4 font-semibold text-white">Minhas faturas</h2>
        {lista.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Você ainda não tem faturas.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {lista.map((f) => (
              <Link
                key={f.id}
                href={`/fatura/${f.id}`}
                className="-mx-2 flex items-center justify-between rounded-xl px-2 py-3 transition-colors hover:bg-white/5"
              >
                <div>
                  <p className="font-medium capitalize text-white">{formatReferencia(f.referencia)}</p>
                  <p className="text-xs text-slate-400">
                    {f.consumo_kwh} kWh · economia {formatBRL(f.economia)}
                    {f.vencimento ? ` · vence ${formatData(f.vencimento)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end gap-0.5">
                    {Number(f.valor_desconto) > 0 && (
                      <p className="text-xs tabular-nums text-slate-500 line-through">{formatBRL(f.valor_bruto)}</p>
                    )}
                    <p className="font-semibold tabular-nums text-white">{formatBRL(f.valor_liquido)}</p>
                    <StatusBadge status={f.status} />
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
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
  fmt = "int",
  cor,
  destaque,
}: {
  icon: React.ReactNode;
  titulo: string;
  valor: number;
  fmt?: "int" | "brl";
  cor: string;
  destaque?: boolean;
}) {
  return (
    <div className={`card card-hover ${destaque ? "ring-1 ring-eco-400/40" : ""}`}>
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${cor}`}>{icon}</div>
      <p className="text-sm text-slate-400">{titulo}</p>
      <p className="mt-1 text-xl font-bold text-white">
        <AnimatedNumber value={valor} format={fmt} />
      </p>
    </div>
  );
}

function Conquista({ emoji, texto }: { emoji: string; texto: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200">
      <span aria-hidden>{emoji}</span> {texto}
    </span>
  );
}

function numeroPct(v: number): string {
  const n = Number(v) || 0;
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}
