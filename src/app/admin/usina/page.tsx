import { Sun, Zap, BatteryCharging, Layers, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatKwh, formatReferencia, formatReferenciaCurta, primeiroDiaMesAtual } from "@/lib/format";
import MonthFilter from "@/components/MonthFilter";
import RateioEditor from "@/components/RateioEditor";
import SaldoHistoricoCliente from "@/components/SaldoHistoricoCliente";

export const dynamic = "force-dynamic";

interface ClienteMin { id: string; nome: string; unidade: string | null }

export default async function UsinaPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const supabase = await createClient();

  const sp = await searchParams;
  const mesPadrao = primeiroDiaMesAtual().slice(0, 7);
  const mesParam = sp.mes ?? mesPadrao;
  const [ano, m] = mesParam.split("-");
  const referencia = `${ano}-${(m ?? "01").padStart(2, "0")}-01`;

  const [{ data: clientesData }, { data: geracoes }, { data: rateiosData, error: rateioErr }, { data: faturas }] =
    await Promise.all([
      supabase.from("clientes").select("id, nome, unidade").eq("ativo", true).order("nome"),
      supabase.from("geracao_mensal").select("referencia, kwh_injetado"),
      supabase.from("rateio_mensal").select("referencia, cliente_id, percentual"),
      supabase.from("faturas").select("referencia, cliente_id, consumo_kwh, status"),
    ]);

  const migracaoPendente = !!rateioErr && /rateio_mensal|does not exist|schema cache/.test(rateioErr.message);
  const clientes = (clientesData ?? []) as ClienteMin[];

  // Mapas de apoio
  const geracaoPorMes = new Map<string, number>();
  for (const g of (geracoes ?? []) as { referencia: string; kwh_injetado: number }[]) {
    geracaoPorMes.set(g.referencia, Number(g.kwh_injetado));
  }
  const pctPorClienteMes = new Map<string, number>();
  for (const r of (rateiosData ?? []) as { referencia: string; cliente_id: string; percentual: number }[]) {
    pctPorClienteMes.set(`${r.referencia}|${r.cliente_id}`, Number(r.percentual));
  }
  const consumoPorClienteMes = new Map<string, number>();
  for (const f of (faturas ?? []) as { referencia: string; cliente_id: string; consumo_kwh: number; status: string }[]) {
    if (f.status === "cancelada") continue;
    const k = `${f.referencia}|${f.cliente_id}`;
    consumoPorClienteMes.set(k, (consumoPorClienteMes.get(k) ?? 0) + Number(f.consumo_kwh));
  }

  // Todos os meses com dados, até o mês selecionado (para o rollover), + o próprio mês.
  const mesesSet = new Set<string>([referencia]);
  for (const ref of geracaoPorMes.keys()) mesesSet.add(ref);
  for (const k of pctPorClienteMes.keys()) mesesSet.add(k.split("|")[0]);
  for (const k of consumoPorClienteMes.keys()) mesesSet.add(k.split("|")[0]);
  const meses = Array.from(mesesSet).filter((ref) => ref <= referencia).sort((a, b) => a.localeCompare(b));

  // Contabiliza o rollover por cliente até (e incluindo) o mês selecionado.
  interface Linha {
    clienteId: string;
    nome: string;
    unidade: string | null;
    percentual: number; // do mês selecionado
    consumo: number; // do mês selecionado
    saldoAnterior: number; // saldo entrando no mês selecionado
  }
  const linhas: Linha[] = [];
  let totalCreditos = 0, totalConsumo = 0, totalCompensado = 0, totalSaldo = 0, somaPct = 0;

  for (const c of clientes) {
    let saldo = 0;
    let entrando = 0, credSel = 0, consSel = 0, compSel = 0, saldoFinalSel = 0, pctSel = 0;
    for (const ref of meses) {
      const g = geracaoPorMes.get(ref) ?? 0;
      const pct = pctPorClienteMes.get(`${ref}|${c.id}`) ?? 0;
      const creditos = (g * pct) / 100;
      const consumo = consumoPorClienteMes.get(`${ref}|${c.id}`) ?? 0;
      const disponivel = saldo + creditos;
      const compensado = Math.min(consumo, disponivel);
      const novoSaldo = disponivel - compensado;
      if (ref === referencia) {
        entrando = saldo; credSel = creditos; consSel = consumo; compSel = compensado; saldoFinalSel = novoSaldo; pctSel = pct;
      }
      saldo = novoSaldo;
    }
    linhas.push({ clienteId: c.id, nome: c.nome, unidade: c.unidade, percentual: pctSel, consumo: consSel, saldoAnterior: entrando });
    totalCreditos += credSel; totalConsumo += consSel; totalCompensado += compSel; totalSaldo += saldoFinalSel; somaPct += pctSel;
  }

  const geracaoMes = geracaoPorMes.get(referencia) ?? 0;

  // Histórico completo de saldo por cliente (todos os meses com dados),
  // para o gráfico de evolução do saldo de créditos (somente no admin).
  const mesesComDados = Array.from(
    new Set<string>([
      ...geracaoPorMes.keys(),
      ...Array.from(pctPorClienteMes.keys()).map((k) => k.split("|")[0]),
      ...Array.from(consumoPorClienteMes.keys()).map((k) => k.split("|")[0]),
    ])
  ).sort((a, b) => a.localeCompare(b));

  const historico = clientes.map((c) => {
    let saldo = 0;
    const pontos = mesesComDados.map((ref) => {
      const g = geracaoPorMes.get(ref) ?? 0;
      const pct = pctPorClienteMes.get(`${ref}|${c.id}`) ?? 0;
      const creditos = (g * pct) / 100;
      const consumo = consumoPorClienteMes.get(`${ref}|${c.id}`) ?? 0;
      const disponivel = saldo + creditos;
      saldo = disponivel - Math.min(consumo, disponivel);
      return { label: formatReferenciaCurta(ref), valor: Math.round(saldo * 100) / 100, referencia: ref };
    });
    return { clienteId: c.id, nome: c.nome, unidade: c.unidade, pontos };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Central da usina</h1>
          <p className="text-sm text-slate-400">Rateio, créditos e compensações de {formatReferencia(referencia)}.</p>
        </div>
        <MonthFilter basePath="/admin/usina" defaultValue={mesPadrao} permitirLimpar={false} />
      </div>

      {migracaoPendente && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Rode a migração <code className="mx-1">0019_rateio_mensal.sql</code> no Supabase para ativar o controle de rateio.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<Sun />} titulo="Geração do mês" valor={formatKwh(geracaoMes)} cor="bg-brand-500/15 text-brand-300" />
        <Kpi icon={<Layers />} titulo="Créditos alocados" valor={formatKwh(totalCreditos)} cor="bg-blue-500/15 text-blue-300" />
        <Kpi icon={<Zap />} titulo="Compensado no mês" valor={formatKwh(totalCompensado)} cor="bg-amber-500/15 text-amber-300" />
        <Kpi icon={<BatteryCharging />} titulo="Saldo acumulado (créditos)" valor={formatKwh(totalSaldo)} cor="bg-eco-500/15 text-eco-300" />
      </div>

      <RateioEditor
        referencia={referencia}
        geracaoInicial={geracaoMes}
        linhas={linhas}
        totais={{ consumo: totalConsumo, compensado: totalCompensado, saldo: totalSaldo, somaPct }}
        desabilitado={migracaoPendente}
      />

      <p className="text-xs text-slate-500">
        Créditos = geração × %. Compensado = quanto do consumo do cliente foi coberto por créditos (saldo anterior + créditos do mês).
        O que sobra vira saldo e acumula para os próximos meses (rollover). A soma dos percentuais do mês idealmente é 100%.
        O consumo vem das faturas do mês de cada cliente.
      </p>

      {historico.length > 0 && mesesComDados.length >= 1 && (
        <div className="card">
          <h2 className="mb-1 font-semibold text-white">Histórico de saldo por cliente</h2>
          <p className="mb-4 text-sm text-slate-400">Evolução do saldo de créditos (kWh) mês a mês, por morador.</p>
          <SaldoHistoricoCliente clientes={historico} destaqueRef={referencia} />
        </div>
      )}
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
