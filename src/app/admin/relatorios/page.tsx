import { Wallet, CheckCircle2, Clock, Leaf, AlertTriangle, Sun, Zap, BatteryCharging } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  formatBRL,
  formatKwh,
  formatReferencia,
  formatReferenciaCurta,
  formatData,
  primeiroDiaMesAtual,
  faturaVencida,
} from "@/lib/format";
import MonthFilter from "@/components/MonthFilter";
import EconomiaChart from "@/components/EconomiaChart";
import StatusBadge from "@/components/StatusBadge";
import { salvarGeracaoMensal } from "./actions";
import type { FaturaComCliente, Fatura, GeracaoMensal } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: { mes?: string };
}) {
  const supabase = createClient();

  const mesPadrao = primeiroDiaMesAtual().slice(0, 7);
  const mesParam = searchParams.mes ?? mesPadrao;
  const [ano, m] = mesParam.split("-");
  const referencia = `${ano}-${(m ?? "01").padStart(2, "0")}-01`;

  const [{ data: doMes }, { data: todas }, { data: geracaoTodas }] = await Promise.all([
    supabase
      .from("faturas")
      .select("*, clientes(id, nome, unidade, telefone, email)")
      .eq("referencia", referencia)
      .order("created_at", { ascending: true }),
    supabase.from("faturas").select("referencia, valor_liquido, economia, consumo_kwh, status"),
    supabase.from("geracao_mensal").select("referencia, kwh_injetado, kwh_consumido"),
  ]);

  const faturasMes = (doMes ?? []) as FaturaComCliente[];
  const ativas = faturasMes.filter((f) => f.status !== "cancelada");

  const faturado = ativas.reduce((s, f) => s + Number(f.valor_liquido), 0);
  const recebido = ativas.filter((f) => f.status === "paga").reduce((s, f) => s + Number(f.valor_liquido), 0);
  const aReceber = ativas.filter((f) => f.status === "pendente").reduce((s, f) => s + Number(f.valor_liquido), 0);
  const economia = ativas.reduce((s, f) => s + Number(f.economia), 0);
  const vencidas = ativas.filter((f) => faturaVencida(f.vencimento, f.status));
  const valorVencido = vencidas.reduce((s, f) => s + Number(f.valor_liquido), 0);

  // ---- Energia (kWh): geração, consumo e créditos ----
  type FaturaEnergia = Pick<Fatura, "referencia" | "consumo_kwh" | "status">;
  const faturasEnergia = (todas ?? []) as (FaturaEnergia & Pick<Fatura, "valor_liquido" | "economia">)[];
  const geracao = (geracaoTodas ?? []) as Pick<GeracaoMensal, "referencia" | "kwh_injetado" | "kwh_consumido">[];
  const geracaoMes = geracao.find((g) => g.referencia === referencia);

  // Injeção e consumo por mês (todos os meses), para o saldo acumulado.
  // O consumo lançado manualmente tem prioridade sobre a soma das faturas.
  const consumoFaturasPorMes = new Map<string, number>();
  for (const f of faturasEnergia) {
    if (f.status === "cancelada") continue;
    consumoFaturasPorMes.set(f.referencia, (consumoFaturasPorMes.get(f.referencia) ?? 0) + Number(f.consumo_kwh));
  }
  const consumoPorMes = new Map<string, number>(consumoFaturasPorMes);
  const injetadoPorMes = new Map<string, number>();
  for (const g of geracao) {
    injetadoPorMes.set(g.referencia, (injetadoPorMes.get(g.referencia) ?? 0) + Number(g.kwh_injetado));
    if (g.kwh_consumido != null) consumoPorMes.set(g.referencia, Number(g.kwh_consumido));
  }

  // Consumo automático (soma das faturas) do mês selecionado, usado como
  // valor pré-preenchido no formulário.
  const consumidoMesAuto = ativas.reduce((s, f) => s + Number(f.consumo_kwh), 0);
  // Consumo exibido: manual quando lançado, senão a soma das faturas.
  const consumidoMes = geracaoMes?.kwh_consumido != null ? Number(geracaoMes.kwh_consumido) : consumidoMesAuto;
  // Injetado do mês selecionado (leitura lançada pelo admin).
  const injetadoMes = Number(geracaoMes?.kwh_injetado ?? 0);

  // Saldo de créditos acumulado até o mês selecionado (rollover, sem ficar negativo).
  const meses = Array.from(
    new Set(Array.from(consumoPorMes.keys()).concat(Array.from(injetadoPorMes.keys())))
  )
    .filter((ref) => ref <= referencia)
    .sort((a, b) => a.localeCompare(b));
  let saldoCreditos = 0;
  for (const ref of meses) {
    saldoCreditos += (injetadoPorMes.get(ref) ?? 0) - (consumoPorMes.get(ref) ?? 0);
    if (saldoCreditos < 0) saldoCreditos = 0;
  }

  // Gráfico: recebido (faturas pagas) por mês, últimos 12 meses.
  const porMes = new Map<string, number>();
  for (const f of (todas ?? []) as Pick<Fatura, "referencia" | "valor_liquido" | "status">[]) {
    if (f.status !== "paga") continue;
    porMes.set(f.referencia, (porMes.get(f.referencia) ?? 0) + Number(f.valor_liquido));
  }
  const pontosRecebido = Array.from(porMes.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([ref, valor]) => ({ label: formatReferenciaCurta(ref), valor, referencia: ref }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Relatórios</h1>
          <p className="text-sm text-slate-400">Recebimentos de {formatReferencia(referencia)}</p>
        </div>
        <MonthFilter basePath="/admin/relatorios" defaultValue={mesPadrao} permitirLimpar={false} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<Wallet />} titulo="Faturado no mês" valor={formatBRL(faturado)} cor="bg-brand-500/15 text-brand-300" />
        <Kpi icon={<CheckCircle2 />} titulo="Recebido" valor={formatBRL(recebido)} cor="bg-eco-500/15 text-eco-300" />
        <Kpi icon={<Clock />} titulo="A receber" valor={formatBRL(aReceber)} cor="bg-amber-500/15 text-amber-300" />
        <Kpi icon={<Leaf />} titulo="Economia gerada" valor={formatBRL(economia)} cor="bg-eco-500/15 text-eco-300" />
      </div>

      {vencidas.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {vencidas.length} fatura(s) vencida(s) neste mês, somando <strong>{formatBRL(valorVencido)}</strong>.
        </div>
      )}

      {/* ---- Energia da usina (kWh) ---- */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-semibold text-white">Geração e consumo da usina</h2>
            <p className="text-sm text-slate-400">Acompanhe a energia da sua usina em {formatReferencia(referencia)}.</p>
          </div>
          <form action={salvarGeracaoMensal} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="referencia" value={referencia} />
            <div>
              <label className="label" htmlFor="kwh_injetado">Injetado na rede (kWh)</label>
              <input
                id="kwh_injetado"
                name="kwh_injetado"
                type="number"
                min={0}
                step={0.01}
                defaultValue={injetadoMes || ""}
                placeholder="0"
                className="input w-40"
              />
            </div>
            <div>
              <label className="label" htmlFor="kwh_consumido">Consumido (kWh)</label>
              <input
                id="kwh_consumido"
                name="kwh_consumido"
                type="number"
                min={0}
                step={0.01}
                defaultValue={geracaoMes?.kwh_consumido != null ? Number(geracaoMes.kwh_consumido) : ""}
                placeholder={consumidoMesAuto ? `${consumidoMesAuto} (faturas)` : "0"}
                className="input w-40"
              />
            </div>
            <button type="submit" className="btn-primary">Salvar</button>
          </form>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Kpi icon={<BatteryCharging />} titulo="Créditos de kWh (acumulado)" valor={formatKwh(saldoCreditos)} cor="bg-eco-500/15 text-eco-300" />
          <Kpi icon={<Zap />} titulo="kWh consumido no mês" valor={formatKwh(consumidoMes)} cor="bg-amber-500/15 text-amber-300" />
          <Kpi icon={<Sun />} titulo="kWh injetado no mês" valor={formatKwh(injetadoMes)} cor="bg-brand-500/15 text-brand-300" />
        </div>
        <p className="text-xs text-slate-500">
          Créditos = energia injetada − energia consumida, acumulados mês a mês (o saldo nunca fica negativo).
          Lance o injetado e o consumido de cada mês nos campos acima. Se deixar o consumido em branco,
          o sistema usa automaticamente a soma do consumo das faturas do mês.
        </p>
      </div>

      <div className="card">
        <h2 className="mb-1 font-semibold text-white">Recebimentos mês a mês</h2>
        <p className="mb-4 text-sm text-slate-400">Total recebido (faturas pagas) por mês.</p>
        <EconomiaChart
          dados={pontosRecebido}
          destaqueRef={referencia}
          cor="#ca8a04"
          ariaLabel="Gráfico de recebimentos mensais"
          textoVazio="Nenhum recebimento registrado ainda."
        />
      </div>

      <div className="card overflow-x-auto">
        <h2 className="mb-4 font-semibold text-white">Detalhe por morador — {formatReferencia(referencia)}</h2>
        {ativas.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Nenhuma fatura neste mês.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-slate-400">
                <th className="pb-2 font-medium">Morador</th>
                <th className="pb-2 font-medium">Vencimento</th>
                <th className="pb-2 text-right font-medium">Valor</th>
                <th className="pb-2 text-right font-medium">Economia</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {ativas.map((f) => {
                const venc = faturaVencida(f.vencimento, f.status);
                return (
                  <tr key={f.id} className="border-b border-white/5 last:border-0">
                    <td className="py-2.5 font-medium text-white">
                      {f.clientes?.nome}
                      <span className="ml-1 text-xs text-slate-400">{f.clientes?.unidade}</span>
                    </td>
                    <td className={`py-2.5 ${venc ? "font-medium text-red-400" : "text-slate-300"}`}>
                      {formatData(f.vencimento)}
                    </td>
                    <td className="py-2.5 text-right text-white">{formatBRL(f.valor_liquido)}</td>
                    <td className="py-2.5 text-right text-eco-300">{formatBRL(f.economia)}</td>
                    <td className="py-2.5">
                      {venc ? <span className="badge bg-red-500/15 text-red-300">Vencida</span> : <StatusBadge status={f.status} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/10 font-semibold text-white">
                <td className="pt-3" colSpan={2}>Total</td>
                <td className="pt-3 text-right">{formatBRL(faturado)}</td>
                <td className="pt-3 text-right text-eco-300">{formatBRL(economia)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
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
