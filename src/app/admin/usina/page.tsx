import { Sun, Zap, BatteryCharging, Layers, AlertTriangle, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatKwh, formatReferencia, formatReferenciaCurta, primeiroDiaMesAtual } from "@/lib/format";
import MonthFilter from "@/components/MonthFilter";
import RateioEditor from "@/components/RateioEditor";
import SaldoHistoricoCliente from "@/components/SaldoHistoricoCliente";

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
  let todosRaw = (clientesComPapel.data ?? []) as ClienteMin[];
  if (clientesComPapel.error && /predio_papel/.test(clientesComPapel.error.message ?? "")) {
    const fb = await supabase.from("clientes").select("id, nome, unidade").eq("ativo", true).order("nome");
    todosRaw = (fb.data ?? []) as ClienteMin[];
  }

  const [{ data: geracoes }, { data: rateiosData, error: rateioErr }, { data: faturas }] = await Promise.all([
    supabase.from("geracao_mensal").select("referencia, kwh_injetado"),
    supabase.from("rateio_mensal").select("referencia, cliente_id, percentual"),
    supabase.from("faturas").select("referencia, cliente_id, consumo_kwh, status"),
  ]);

  const migracaoPendente = !!rateioErr && /rateio_mensal|does not exist|schema cache/.test(rateioErr.message);
  const todos = todosRaw;

  // Grupo "Consumo do Prédio" e seus membros.
  const membros = todos.filter((c) => c.predio_papel === "membro");
  const membroIds = new Set(membros.map((c) => c.id));
  const grupo = todos.find((c) => c.predio_papel === "grupo") ?? null;
  // Participantes do rateio: normais + a UC do grupo (membros ficam de fora).
  const clientes = todos.filter((c) => c.predio_papel !== "membro");

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
  const consumoMembrosMes = new Map<string, number>(); // soma dos membros por mês
  for (const f of (faturas ?? []) as { referencia: string; cliente_id: string; consumo_kwh: number; status: string }[]) {
    if (f.status === "cancelada") continue;
    const k = `${f.referencia}|${f.cliente_id}`;
    consumoPorClienteMes.set(k, (consumoPorClienteMes.get(k) ?? 0) + Number(f.consumo_kwh));
    if (membroIds.has(f.cliente_id)) {
      consumoMembrosMes.set(f.referencia, (consumoMembrosMes.get(f.referencia) ?? 0) + Number(f.consumo_kwh));
    }
  }
  // O consumo da UC "Consumo do Prédio" é a SOMA dos membros.
  if (grupo) {
    for (const [ref, soma] of consumoMembrosMes) consumoPorClienteMes.set(`${ref}|${grupo.id}`, soma);
  }

  // Meses até o selecionado (rollover).
  const mesesSet = new Set<string>([referencia]);
  for (const ref of geracaoPorMes.keys()) mesesSet.add(ref);
  for (const k of pctPorClienteMes.keys()) mesesSet.add(k.split("|")[0]);
  for (const k of consumoPorClienteMes.keys()) mesesSet.add(k.split("|")[0]);
  const meses = Array.from(mesesSet).filter((ref) => ref <= referencia).sort((a, b) => a.localeCompare(b));

  interface Linha {
    clienteId: string; nome: string; unidade: string | null;
    percentual: number; consumo: number; saldoAnterior: number;
  }
  const linhas: Linha[] = [];
  let totalCreditos = 0, totalConsumo = 0, totalCompensado = 0, totalSaldo = 0;

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
      if (ref === referencia) { entrando = saldo; credSel = creditos; consSel = consumo; compSel = compensado; saldoFinalSel = novoSaldo; pctSel = pct; }
      saldo = novoSaldo;
    }
    const nome = grupo && c.id === grupo.id ? "Consumo do Prédio" : c.nome;
    linhas.push({ clienteId: c.id, nome, unidade: c.unidade, percentual: pctSel, consumo: consSel, saldoAnterior: entrando });
    totalCreditos += credSel; totalConsumo += consSel; totalCompensado += compSel; totalSaldo += saldoFinalSel;
  }

  const geracaoMes = geracaoPorMes.get(referencia) ?? 0;

  // Histórico de saldo por participante (inclui a UC do prédio, exclui membros).
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
    const nome = grupo && c.id === grupo.id ? "Consumo do Prédio" : c.nome;
    return { clienteId: c.id, nome, unidade: c.unidade, pontos };
  });

  // Dados da seção "Consumo do Prédio" (membros do mês selecionado).
  const membrosMes = membros
    .map((c) => ({ id: c.id, nome: c.nome, unidade: c.unidade, consumo: consumoPorClienteMes.get(`${referencia}|${c.id}`) ?? 0 }))
    .sort((a, b) => b.consumo - a.consumo);
  const consumoPredio = membrosMes.reduce((s, x) => s + x.consumo, 0);

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
        desabilitado={migracaoPendente}
      />

      {(membrosMes.length > 0 || grupo) && (
        <div className="card">
          <div className="mb-1 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-brand-300" />
            <h2 className="font-semibold text-white">Consumo do Prédio</h2>
          </div>
          <p className="mb-4 text-sm text-slate-400">
            Moradores agrupados na UC “Consumo do Prédio”. Eles não entram no rateio individualmente — o consumo somado
            ({formatKwh(consumoPredio)} em {formatReferencia(referencia)}) é o que entra como uma única linha do rateio.
          </p>
          {membrosMes.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">
              Nenhum morador marcado como membro ainda. Marque em <span className="text-brand-300">Moradores → Papel no rateio</span> ou rode o SQL <code>consumo-predio-membros.sql</code>.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-slate-400">
                    <th className="pb-2 font-medium">Morador</th>
                    <th className="pb-2 font-medium">Unidade</th>
                    <th className="pb-2 text-right font-medium">Consumo do mês</th>
                  </tr>
                </thead>
                <tbody>
                  {membrosMes.map((mem) => (
                    <tr key={mem.id} className="border-b border-white/5 last:border-0">
                      <td className="py-2.5 font-medium text-white">{mem.nome}</td>
                      <td className="py-2.5 text-slate-400">{mem.unidade ?? "—"}</td>
                      <td className="py-2.5 text-right tabular-nums text-slate-200">{formatKwh(mem.consumo)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-white/10 font-semibold text-white">
                    <td className="pt-3" colSpan={2}>Total do prédio ({membrosMes.length} moradores)</td>
                    <td className="pt-3 text-right tabular-nums text-brand-300">{formatKwh(consumoPredio)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-slate-500">
        Créditos = geração × %. Compensado = quanto do consumo foi coberto por créditos (saldo anterior + créditos do mês).
        O que sobra vira saldo e acumula (rollover). A soma dos percentuais idealmente é 100%. O consumo vem das faturas do mês.
      </p>

      {historico.length > 0 && mesesComDados.length >= 1 && (
        <div className="card">
          <h2 className="mb-1 font-semibold text-white">Histórico de saldo por cliente</h2>
          <p className="mb-4 text-sm text-slate-400">Evolução do saldo de créditos (kWh) mês a mês, por participante do rateio.</p>
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
