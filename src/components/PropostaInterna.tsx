"use client";

import { useMemo, useState, useTransition } from "react";
import { Printer, Save, Sun } from "lucide-react";
import { formatBRL } from "@/lib/format";
import {
  calcularEconomia,
  type ParametrosEnergia,
  type PlanoDesconto,
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

export interface ParamsIniciais {
  tusd: number; // R$/kWh (sem tributos)
  te: number; // R$/kWh (sem tributos)
  bandeira: number; // R$/kWh acréscimo de bandeira
  iluminacao: number; // R$/mês (CIP)
  icmsPct: number; // %
  pisPct: number; // %
  cofinsPct: number; // %
}

const pct1 = (v: number) => (v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const kwh0 = (v: number) => `${Math.round(v).toLocaleString("pt-BR")} kWh`;

export default function PropostaInterna({
  lead, paramsIniciais, planos, nomeUsina,
}: {
  lead: LeadResumido;
  paramsIniciais: ParamsIniciais;
  planos: PlanoDesconto[];
  nomeUsina: string;
}) {
  const [modo, setModo] = useState<"kwh" | "reais">("kwh");
  const [entrada, setEntrada] = useState(Math.max(0, Math.round(lead.consumo)) || 300);
  const [planoCodigo, setPlanoCodigo] = useState("auto");
  // Composição da conta — editável por proposta.
  const [comp, setComp] = useState<ParamsIniciais>(paramsIniciais);
  const [salvando, startSalvar] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  const setC = (campo: keyof ParamsIniciais, v: number) => setComp((s) => ({ ...s, [campo]: v }));

  // Monta os parâmetros do cálculo a partir dos campos editáveis.
  const parametros: ParametrosEnergia = useMemo(() => ({
    tarifa_tusd_te: comp.tusd + comp.te + comp.bandeira,
    icms: comp.icmsPct / 100,
    pis_cofins: (comp.pisPct + comp.cofinsPct) / 100,
    cip: comp.iluminacao,
  }), [comp]);

  const r = useMemo(
    () => calcularEconomia({ modo, entrada, planoCodigo }, parametros, planos),
    [modo, entrada, planoCodigo, parametros, planos]
  );

  const hoje = new Date().toLocaleDateString("pt-BR");
  const local = [lead.bairro, [lead.cidade, lead.estado].filter(Boolean).join("/")].filter(Boolean).join(" · ");

  function salvar() {
    setMsg(null);
    startSalvar(async () => {
      const res = await salvarSimulacaoCrm({ leadId: lead.id, nomeCliente: lead.nome, modo, entrada, planoCodigo, parametros });
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
                  <button key={m} type="button" onClick={() => { setModo(m); setEntrada(m === "kwh" ? (Math.round(lead.consumo) || 300) : 350); }}
                    className={`px-3 text-sm font-medium ${modo === m ? "bg-brand-500 text-brand-950" : "text-slate-300 hover:bg-white/5"}`}>
                    {m === "kwh" ? "kWh" : "R$"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="plano">Plano</label>
            <select id="plano" className="input" value={planoCodigo} onChange={(e) => setPlanoCodigo(e.target.value)}>
              <option value="auto">Melhor desconto</option>
              {planos.map((p) => <option key={p.codigo} value={p.codigo}>{p.nome} — {Number(p.desconto_percentual)}%</option>)}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button onClick={() => window.print()} className="btn-outline" disabled={!r.ok}><Printer className="h-4 w-4" /> Proposta (PDF)</button>
            <button onClick={salvar} className="btn-primary" disabled={!r.ok || salvando}><Save className="h-4 w-4" /> {salvando ? "Salvando…" : "Salvar no lead"}</button>
          </div>
        </div>
        {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-eco-300" : "text-red-400"}`}>{msg.texto}</p>}
      </div>

      {/* ---- Composição da conta (editável, não imprime) ---- */}
      <div className="card no-print">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Composição da conta (editável)</p>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <CampoNum label="Consumo TUSD (R$/kWh)" step={0.00001} value={comp.tusd} onChange={(v) => setC("tusd", v)} />
          <CampoNum label="Consumo TE (R$/kWh)" step={0.00001} value={comp.te} onChange={(v) => setC("te", v)} />
          <CampoNum label="Acréscimo de bandeira (R$/kWh)" step={0.00001} value={comp.bandeira} onChange={(v) => setC("bandeira", v)} />
          <CampoNum label="Iluminação pública (R$/mês)" step={0.01} value={comp.iluminacao} onChange={(v) => setC("iluminacao", v)} />
          <CampoNum label="PIS (%)" step={0.01} value={comp.pisPct} onChange={(v) => setC("pisPct", v)} />
          <CampoNum label="COFINS (%)" step={0.01} value={comp.cofinsPct} onChange={(v) => setC("cofinsPct", v)} />
          <CampoNum label="ICMS (%)" step={0.01} value={comp.icmsPct} onChange={(v) => setC("icmsPct", v)} />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Vem dos parâmetros do banco, mas você pode ajustar para esta proposta. Tarifa da energia = TUSD + TE + bandeira; o desconto incide sobre a energia; iluminação pública fica fora.
        </p>
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
                  <p className="text-xs text-slate-400">Proposta de economia · Rateio de créditos de energia solar</p>
                </div>
              </div>
              <div className="text-right text-xs text-slate-400">
                <p>Emitida em {hoje}</p>
                <p>{r.plano?.nome}</p>
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
                <Linha rotulo="Valor da energia" valor={formatBRL(r.valorEnergia)} />
                <Linha rotulo="Iluminação pública" valor={formatBRL(r.cip)} />
                <Total rotulo="Você paga" valor={formatBRL(r.contaAtual)} />
              </div>
              <div className="rounded-xl border-[1.5px] border-eco-600/50 p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-eco-700">Com a {nomeUsina}</p>
                <Linha rotulo="Valor da energia" valor={formatBRL(r.valorEnergia)} />
                <Linha rotulo={`Desconto rateio de créditos (${pct1(r.descontoPercentual)}%)`} valor={`- ${formatBRL(r.economiaMensal)}`} verde />
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
                Cerca de <strong className="text-slate-700">{formatBRL(r.economiaMensal * 12)} por ano</strong> — {pct1(r.descontoPercentual)}% de desconto sobre a energia consumida, no plano {r.plano?.nome?.toLowerCase()}.
              </p>
            </div>

            <div className="px-6 pb-6 text-[11px] leading-relaxed text-slate-500">
              Você não faz obra, não instala equipamento e não muda a titularidade — a conta continua chegando da distribuidora no seu nome, com valor menor. Você recebe créditos de energia da nossa usina solar por rateio, com desconto sobre a energia consumida. A iluminação pública (municipal) não entra no desconto. Os valores são uma estimativa: o valor real pode variar conforme a modalidade de cobrança da Neoenergia (tarifa vigente, bandeiras tarifárias, tributos e perfil de consumo), que estão sujeitos a alteração. A energia gerada varia com o clima, então a economia pode oscilar de mês para mês. Esta proposta não constitui garantia de desconto.
            </div>
          </div>

          {/* ---- Uso interno (não imprime) ---- */}
          <div className="no-print rounded-2xl border border-dashed border-brand-400/40 bg-brand-500/5 p-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-brand-300">Uso interno — não sai na proposta</p>
            <p className="text-sm text-slate-300">
              Plano <strong className="text-white">{r.plano?.nome}</strong> ({pct1(r.descontoPercentual)}%) · economia de <strong className="text-white">{pct1(r.economiaPercentual)}%</strong> da conta · {kwh0(r.consumoKwh)}/mês.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function CampoNum({ label, value, onChange, step }: { label: string; value: number; onChange: (n: number) => void; step: number }) {
  return (
    <div>
      <label className="label text-[11px]">{label}</label>
      <input className="input tabular-nums" type="number" min={0} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function Linha({ rotulo, valor, verde }: { rotulo: string; valor: string; verde?: boolean }) {
  return (
    <div className="mt-2 flex items-baseline justify-between text-sm">
      <span className={verde ? "text-eco-700" : "text-slate-500"}>{rotulo}</span>
      <span className={`tabular-nums ${verde ? "font-medium text-eco-700" : "text-slate-800"}`}>{valor}</span>
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
