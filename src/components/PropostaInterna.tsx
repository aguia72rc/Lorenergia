"use client";

import { useMemo, useState, useTransition } from "react";
import { Printer, Save, Sun } from "lucide-react";
import { formatBRL } from "@/lib/format";
import {
  calcularEconomia,
  type ParametrosEnergia,
  type PlanoCota,
  type FioBItem,
  type TipoLigacao,
} from "@/lib/simulador";
import { salvarSimulacaoCrm } from "@/app/proposta/[id]/actions";

export interface LeadResumido {
  id: string;
  nome: string;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  consumo: number;
}

const LIGACOES: { v: TipoLigacao; t: string }[] = [
  { v: "monofasica", t: "Monofásica" },
  { v: "bifasica", t: "Bifásica" },
  { v: "trifasica", t: "Trifásica" },
];

const pct1 = (v: number) => (v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const kwh0 = (v: number) => `${Math.round(v).toLocaleString("pt-BR")} kWh`;

export default function PropostaInterna({
  lead, parametros, planos, cronograma, nomeUsina,
}: {
  lead: LeadResumido;
  parametros: ParametrosEnergia;
  planos: PlanoCota[];
  cronograma: FioBItem[];
  nomeUsina: string;
}) {
  const [modo, setModo] = useState<"kwh" | "reais">("kwh");
  const [entrada, setEntrada] = useState(Math.max(0, Math.round(lead.consumo)) || 230);
  const [tipoLigacao, setTipoLigacao] = useState<TipoLigacao>("monofasica");
  const [ano, setAno] = useState(2026);
  const [planoCodigo, setPlanoCodigo] = useState("auto");
  const [salvando, startSalvar] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  const r = useMemo(
    () => calcularEconomia({ modo, entrada, tipoLigacao, ano, planoCodigo }, parametros, planos, cronograma),
    [modo, entrada, tipoLigacao, ano, planoCodigo, parametros, planos, cronograma]
  );

  const hoje = new Date().toLocaleDateString("pt-BR");
  const local = [lead.bairro, [lead.cidade, lead.estado].filter(Boolean).join("/")].filter(Boolean).join(" · ");

  function salvar() {
    setMsg(null);
    startSalvar(async () => {
      const res = await salvarSimulacaoCrm({ leadId: lead.id, nomeCliente: lead.nome, modo, entrada, tipoLigacao, ano, planoCodigo });
      setMsg({ ok: res.ok, texto: res.mensagem });
    });
  }

  return (
    <div className="space-y-5">
      {/* ---- Controles (não imprime) ---- */}
      <div className="card no-print">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="label" htmlFor="entrada">{modo === "kwh" ? "Consumo (kWh/mês)" : "Valor da conta (R$/mês)"}</label>
            <div className="flex gap-2">
              <input id="entrada" type="number" min={0} step={modo === "kwh" ? 1 : 10} className="input flex-1" value={entrada} onChange={(e) => setEntrada(Number(e.target.value))} />
              <div className="flex overflow-hidden rounded-xl border border-white/10">
                {(["kwh", "reais"] as const).map((m) => (
                  <button key={m} type="button" onClick={() => { setModo(m); setEntrada(m === "kwh" ? (Math.round(lead.consumo) || 230) : 240); }}
                    className={`px-3 text-sm font-medium ${modo === m ? "bg-brand-500 text-brand-950" : "text-slate-300 hover:bg-white/5"}`}>
                    {m === "kwh" ? "kWh" : "R$"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="ligacao">Tipo de ligação</label>
            <select id="ligacao" className="input" value={tipoLigacao} onChange={(e) => setTipoLigacao(e.target.value as TipoLigacao)}>
              {LIGACOES.map((l) => <option key={l.v} value={l.v}>{l.t}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="ano">Ano de referência</label>
            <select id="ano" className="input" value={ano} onChange={(e) => setAno(Number(e.target.value))}>
              <option value={2026}>2026</option><option value={2027}>2027</option>
              <option value={2028}>2028</option><option value={2029}>2029 em diante</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="plano">Plano</label>
            <select id="plano" className="input" value={planoCodigo} onChange={(e) => setPlanoCodigo(e.target.value)}>
              <option value="auto">Sugerir automaticamente</option>
              {planos.map((p) => <option key={p.codigo} value={p.codigo}>Plano {p.codigo} — {p.kwh_min}–{p.kwh_max} kWh</option>)}
            </select>
          </div>
          <div className="flex items-end gap-2 lg:col-span-2">
            <button onClick={() => window.print()} className="btn-outline" disabled={!r.ok}><Printer className="h-4 w-4" /> Gerar proposta (PDF)</button>
            <button onClick={salvar} className="btn-primary" disabled={!r.ok || salvando}><Save className="h-4 w-4" /> {salvando ? "Salvando…" : "Salvar no lead"}</button>
          </div>
        </div>
        {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-eco-300" : "text-red-400"}`}>{msg.texto}</p>}
      </div>

      {!r.ok ? (
        <div className="card"><p className="text-sm text-amber-300">{r.mensagem}</p></div>
      ) : (
        <>
          {/* ---- Proposta (imprime em branco) ---- */}
          <div className="print-light overflow-hidden rounded-2xl bg-white text-slate-900 shadow-[0_0_60px_-12px_rgba(255,176,32,0.35)]">
            <div className="flex items-start justify-between gap-4 bg-slate-900 p-6 text-white">
              <div className="flex items-center gap-3">
                <Sun className="h-8 w-8 shrink-0 text-brand-400" />
                <div>
                  <p className="text-lg font-bold leading-tight">{nomeUsina}</p>
                  <p className="text-xs text-slate-400">Proposta de economia · Energia solar compartilhada</p>
                </div>
              </div>
              <div className="text-right text-xs text-slate-400">
                <p>Emitida em {hoje}</p>
                <p>Referência {ano}</p>
              </div>
            </div>

            <div className="border-b border-slate-100 p-6">
              <p className="text-xs uppercase tracking-wide text-slate-400">Proposta para</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{lead.nome}</p>
              {lead.endereco && <p className="text-sm text-slate-500">{lead.endereco}</p>}
              {local && <p className="text-sm text-slate-500">{local}</p>}
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Como é hoje</p>
                <Linha rotulo="Energia consumida" valor={kwh0(r.consumoKwh)} />
                <Linha rotulo="Valor da energia" valor={formatBRL(r.contaAtual - r.cip)} />
                <Linha rotulo="Iluminação pública" valor={formatBRL(r.cip)} />
                <Total rotulo="Você paga" valor={formatBRL(r.contaAtual)} />
              </div>
              <div className="rounded-xl border-[1.5px] border-eco-600/50 p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-eco-700">Com a {nomeUsina}</p>
                <Linha rotulo="Taxa mínima da rede" valor={formatBRL(r.taxaMinimaRede)} />
                {r.sobraKwh > 0 && <Linha rotulo="Consumo acima do plano" valor={formatBRL(r.consumoAcimaPlano)} />}
                <Linha rotulo="Uso da rede (Fio B)" valor={formatBRL(r.usoRedeCompensado)} />
                <Linha rotulo="Iluminação pública" valor={formatBRL(r.cip)} />
                <Total rotulo="Você paga" valor={formatBRL(r.contaLorenergia)} destaque />
              </div>
            </div>

            <div className="mx-6 mb-6 rounded-xl bg-brand-50 px-5 py-4">
              <div className="flex items-baseline justify-between">
                <span className="font-semibold text-slate-700">Sua economia</span>
                <span className="text-3xl font-extrabold text-eco-700">{formatBRL(r.economiaMensal)}<span className="text-base font-semibold text-slate-500"> /mês</span></span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Cerca de <strong className="text-slate-700">{formatBRL(r.economiaMensal * 12)} por ano</strong> — o equivalente a {pct1(r.economiaPercentual)}% da sua conta. Plano sugerido: {r.plano?.codigo} (faixa {r.plano?.kwh_min}–{r.plano?.kwh_max} kWh/mês).
              </p>
            </div>

            <div className="px-6 pb-6 text-[11px] leading-relaxed text-slate-500">
              Você não faz obra, não instala equipamento e não muda a titularidade — a conta continua chegando da distribuidora no seu nome, com valor menor. A energia gerada varia com o clima, então a economia oscila de mês para mês. O custo do uso da rede sobre a energia compensada aumenta gradualmente até 2029 (Lei 14.300/2022). Esta proposta é uma estimativa e não constitui garantia de desconto.
            </div>
          </div>

          {/* ---- Uso interno (não imprime) ---- */}
          <div className="no-print rounded-2xl border border-dashed border-brand-400/40 bg-brand-500/5 p-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-brand-300">Uso interno — não sai na proposta</p>
            <p className="text-sm text-slate-300">
              Economia de <strong className="text-white">{pct1(r.economiaPercentual)}%</strong> · {Math.round(r.energiaCompensadaKwh)} kWh compensados (faixa {r.plano?.kwh_min}–{r.plano?.kwh_max}).
            </p>
            {r.economiaPercentual < 0.12 && (
              <p className="mt-1 text-sm text-amber-300"><strong>Margem fraca (&lt;12%).</strong> Tende a gerar questionamento — reavalie o plano.</p>
            )}
            {r.sobraKwh > 0 && (
              <p className="mt-1 text-sm text-slate-300"><strong>Sobram {kwh0(r.sobraKwh)}</strong> sem compensação — uma faixa maior aumenta a economia do cliente.</p>
            )}
            {ano >= 2028 && (
              <p className="mt-1 text-sm text-slate-300"><strong>Cenário 2028+.</strong> Use para checar a durabilidade da venda.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="mt-2 flex items-baseline justify-between text-sm">
      <span className="text-slate-500">{rotulo}</span>
      <span className="tabular-nums text-slate-800">{valor}</span>
    </div>
  );
}
function Total({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className={`mt-3 flex items-baseline justify-between border-t pt-3 ${destaque ? "border-eco-600/40" : "border-slate-200"}`}>
      <span className="text-sm font-medium text-slate-700">{rotulo}</span>
      <span className={`text-xl font-bold tabular-nums ${destaque ? "text-eco-700" : "text-slate-900"}`}>{valor}</span>
    </div>
  );
}
