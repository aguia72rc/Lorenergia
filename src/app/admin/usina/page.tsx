import { Sun, Building2, Percent, Layers, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatKwh, formatReferencia, formatReferenciaCurta, primeiroDiaMesAtual } from "@/lib/format";
import MonthFilter from "@/components/MonthFilter";
import RateioEditor from "@/components/RateioEditor";
import SaldoHistoricoCliente from "@/components/SaldoHistoricoCliente";
import { PREDIO_ID } from "@/lib/rateio";

export const dynamic = "force-dynamic";

interface ClienteMin { id: string; nome: string; unidade: string | null; predio_papel?: "grupo" | "membro" | null }

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

  // Clientes (com fallback se a coluna predio_papel ainda não existir).
  const clientesComPapel = await supabase
    .from("clientes")
    .select("id, nome, unidade, predio_papel")
    .eq("ativo", true)
    .order("nome");
  let todos = (clientesComPapel.data ?? []) as ClienteMin[];
  if (clientesComPapel.error && /predio_papel/.test(clientesComPapel.error.message ?? "")) {
    const fb = await supabase.from("clientes").select("id, nome, unidade").eq("ativo", true).order("nome");
    todos = (fb.data ?? []) as ClienteMin[];
  }

  const [{ data: geracoesRaw, error: gErr }, { data: rateiosData, error: rateioErr }, { data: faturas }] = await Promise.all([
    supabase.from("geracao_mensal").select("referencia, kwh_injetado, consumo_predio, predio_percentual"),
    supabase.from("rateio_mensal").select("referencia, cliente_id, percentual"),
    supabase.from("faturas").select("referencia, cliente_id, consumo_kwh, status"),
  ]);
  let geracoes = (geracoesRaw ?? []) as { referencia: string; kwh_injetado: number; consumo_predio?: number | null; predio_percentual?: number | null }[];
  if (gErr && /consumo_predio|predio_percentual/.test(gErr.message ?? "")) {
    const fb = await supabase.from("geracao_mensal").select("referencia, kwh_injetado");
    geracoes = (fb.data ?? []) as typeof geracoes;
  }

  const migracaoPendente = !!rateioErr && /rateio_mensal|does not exist|schema cache/.test(rateioErr.message);

  // Membros compõem o "Consumo do Prédio"; não são participantes individuais.
  const membroIds = new Set(todos.filter((c) => c.predio_papel === "membro").map((c) => c.id));
  const associados = todos.filter((c) => c.predio_papel !== "membro" && c.predio_papel !== "grupo");

  // Mapas de apoio
  const geracaoPorMes = new Map<string, number>();
  const overridePredioPorMes = new Map<string, number>();
  const predioPctPorMes = new Map<string, number>();
  for (const g of geracoes) {
    geracaoPorMes.set(g.referencia, Number(g.kwh_injetado));
    if (g.consumo_predio != null) overridePredioPorMes.set(g.referencia, Number(g.consumo_predio));
    if (g.predio_percentual != null) predioPctPorMes.set(g.referencia, Number(g.predio_percentual));
  }
  const pctPorClienteMes = new Map<string, number>();
  for (const r of (rateiosData ?? []) as { referencia: string; cliente_id: string; percentual: number }[]) {
    pctPorClienteMes.set(`${r.referencia}|${r.cliente_id}`, Number(r.percentual));
  }
  const consumoPorClienteMes = new Map<string, number>();
  const consumoMembrosMes = new Map<string, number>();
  for (const f of (faturas ?? []) as { referencia: string; cliente_id: string; consumo_kwh: number; status: string }[]) {
    if (f.status === "cancelada") continue;
    if (membroIds.has(f.cliente_id)) {
      consumoMembrosMes.set(f.referencia, (consumoMembrosMes.get(f.referencia) ?? 0) + Number(f.consumo_kwh));
    } else {
      const k = `${f.referencia}|${f.cliente_id}`;
      consumoPorClienteMes.set(k, (consumoPorClienteMes.get(k) ?? 0) + Number(f.consumo_kwh));
    }
  }
  const consumoPredioMes = (ref: string) => overridePredioPorMes.get(ref) ?? consumoMembrosMes.get(ref) ?? 0;

  // Base do rateio = geração total do mês (o prédio também rateia por %).
  const baseMes = (ref: string) => geracaoPorMes.get(ref) ?? 0;

  // Meses até o selecionado (rollover).
  const mesesSet = new Set<string>([referencia]);
  for (const ref of geracaoPorMes.keys()) mesesSet.add(ref);
  for (const k of pctPorClienteMes.keys()) mesesSet.add(k.split("|")[0]);
  for (const k of consumoPorClienteMes.keys()) mesesSet.add(k.split("|")[0]);
  for (const ref of consumoMembrosMes.keys()) mesesSet.add(ref);
  for (const ref of predioPctPorMes.keys()) mesesSet.add(ref);
  const meses = Array.from(mesesSet).filter((ref) => ref <= referencia).sort((a, b) => a.localeCompare(b));
  const mesesComDados = Array.from(mesesSet).sort((a, b) => a.localeCompare(b));

  // Rollup de um participante (getPct/getConsumo por mês) até o mês selecionado.
  function rollupSelecionado(getPct: (ref: string) => number, getConsumo: (ref: string) => number) {
    let saldo = 0, entrando = 0, pctSel = 0, consSel = 0;
    for (const ref of meses) {
      const creditos = (baseMes(ref) * getPct(ref)) / 100;
      const consumo = getConsumo(ref);
      const disponivel = saldo + creditos;
      const novoSaldo = disponivel - Math.min(consumo, disponivel);
      if (ref === referencia) { entrando = saldo; pctSel = getPct(ref); consSel = consumo; }
      saldo = novoSaldo;
    }
    return { percentual: pctSel, consumo: consSel, saldoAnterior: entrando };
  }
  function historicoPontos(getPct: (ref: string) => number, getConsumo: (ref: string) => number) {
    let saldo = 0;
    return mesesComDados.map((ref) => {
      const creditos = (baseMes(ref) * getPct(ref)) / 100;
      const consumo = getConsumo(ref);
      const disponivel = saldo + creditos;
      saldo = disponivel - Math.min(consumo, disponivel);
      return { label: formatReferenciaCurta(ref), valor: Math.round(saldo * 100) / 100, referencia: ref };
    });
  }

  const pctPredio = (ref: string) => predioPctPorMes.get(ref) ?? 0;
  const incluiPredio = membroIds.size > 0 || overridePredioPorMes.size > 0 || predioPctPorMes.size > 0;

  interface Linha { clienteId: string; nome: string; unidade: string | null; percentual: number; consumo: number; saldoAnterior: number }
  const linhas: Linha[] = [];
  if (incluiPredio) {
    const r = rollupSelecionado(pctPredio, consumoPredioMes);
    linhas.push({ clienteId: PREDIO_ID, nome: "Consumo do Prédio", unidade: null, ...r });
  }
  for (const c of associados) {
    const r = rollupSelecionado(
      (ref) => pctPorClienteMes.get(`${ref}|${c.id}`) ?? 0,
      (ref) => consumoPorClienteMes.get(`${ref}|${c.id}`) ?? 0
    );
    linhas.push({ clienteId: c.id, nome: c.nome, unidade: c.unidade, ...r });
  }

  const historico: { clienteId: string; nome: string; unidade: string | null; pontos: { label: string; valor: number; referencia: string }[] }[] = [];
  if (incluiPredio) historico.push({ clienteId: PREDIO_ID, nome: "Consumo do Prédio", unidade: null, pontos: historicoPontos(pctPredio, consumoPredioMes) });
  for (const c of associados) {
    historico.push({ clienteId: c.id, nome: c.nome, unidade: c.unidade, pontos: historicoPontos((ref) => pctPorClienteMes.get(`${ref}|${c.id}`) ?? 0, (ref) => consumoPorClienteMes.get(`${ref}|${c.id}`) ?? 0) });
  }

  const geracaoMes = geracaoPorMes.get(referencia) ?? 0;
  const consumoPredioAuto = consumoMembrosMes.get(referencia) ?? 0;
  const consumoPredioOverride = overridePredioPorMes.get(referencia) ?? null;
  const consumoPredio = consumoPredioMes(referencia);
  const predioPctSel = pctPredio(referencia);
  const predioCreditos = (geracaoMes * predioPctSel) / 100;

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

      {incluiPredio && (
        <div className="card">
          <div className="mb-1 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-brand-300" />
            <h2 className="font-semibold text-white">Consumo do Prédio</h2>
          </div>
          <p className="mb-4 text-sm text-slate-400">
            O prédio recebe um percentual do rateio, como os demais. O consumo dele é a soma dos membros (ou o valor lançado no mês).
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi icon={<Sun />} titulo="Geração do mês" valor={formatKwh(geracaoMes)} cor="bg-brand-500/15 text-brand-300" />
            <Kpi icon={<Building2 />} titulo="Consumo do prédio" valor={formatKwh(consumoPredio)} cor="bg-slate-500/15 text-slate-200" />
            <Kpi icon={<Percent />} titulo="Rateio do prédio" valor={`${predioPctSel.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`} cor="bg-amber-500/15 text-amber-300" />
            <Kpi icon={<Layers />} titulo="Créditos do prédio" valor={formatKwh(predioCreditos)} cor="bg-eco-500/15 text-eco-300" />
          </div>
        </div>
      )}

      <RateioEditor
        referencia={referencia}
        geracaoInicial={geracaoMes}
        consumoPredioAuto={consumoPredioAuto}
        consumoPredioOverride={consumoPredioOverride}
        linhas={linhas}
        desabilitado={migracaoPendente}
      />

      <p className="text-xs text-slate-500">
        Créditos = geração × %. Compensado = quanto do consumo foi coberto por créditos (saldo anterior + créditos do mês).
        O que sobra vira saldo e acumula (rollover). A soma dos percentuais (incluindo o prédio) idealmente é 100%.
      </p>

      {historico.length > 0 && mesesComDados.length >= 1 && (
        <div className="card">
          <h2 className="mb-1 font-semibold text-white">Histórico de saldo por participante</h2>
          <p className="mb-4 text-sm text-slate-400">Evolução do saldo de créditos (kWh) mês a mês.</p>
          <SaldoHistoricoCliente clientes={historico} destaqueRef={referencia} />
        </div>
      )}
    </div>
  );
}

function Kpi({ icon, titulo, valor, cor }: { icon: React.ReactNode; titulo: string; valor: string; cor: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg ${cor}`}>{icon}</div>
      <p className="text-xs text-slate-400">{titulo}</p>
      <p className="mt-0.5 text-lg font-bold text-white">{valor}</p>
    </div>
  );
}
