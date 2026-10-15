"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { calcularFaturaDetalhada, consumoDeLeituras, valorTusdGd2 } from "@/lib/calc";
import { formatBRL, formatKwh } from "@/lib/format";
import { gerarFatura } from "@/app/admin/faturas/actions";
import { vencimentoSugerido, type UltimoVencimento } from "@/lib/vencimento";

interface ClienteOpcao {
  id: string;
  nome: string;
  unidade: string | null;
  desconto_percentual: number;
}

export interface TarifasPadrao {
  tusd: number;
  te: number;
  bandeira: number; // R$
  tarifaGd2: number; // TUSD GD II, R$/kWh (× consumo de cada morador)
  iluminacao: number; // R$
}

/** Dados de uma fatura existente, para o modo "editar". */
export interface FaturaEdicao {
  id: string;
  cliente_id: string;
  referencia: string; // YYYY-MM-DD
  leitura_anterior: number | null;
  leitura_atual: number | null;
  fator_multiplicador: number;
  consumo_kwh: number;
  tarifa_tusd: number;
  tarifa_te: number;
  tarifa_gd2: number; // TUSD GD II (R$/kWh)
  taxa_energia_solar: number; // TUSD GD II em R$ já gravado (preservado se nada mudar)
  adicional_bandeira: number;
  taxa_iluminacao: number;
  multa_juros: number;
  icms: number;
  pis: number;
  cofins: number;
  desconto_percentual: number;
  data_emissao: string | null;
  vencimento: string | null;
  status: "pendente" | "paga" | "cancelada";
  observacoes: string | null;
  publicada: boolean;
}

export default function NovaFaturaForm({
  clientes,
  ultimaLeitura,
  tarifas,
  referenciaPadrao,
  ultimoVencimento = {},
  fatura,
}: {
  clientes: ClienteOpcao[];
  ultimaLeitura: Record<string, number>;
  tarifas: TarifasPadrao;
  referenciaPadrao: string; // YYYY-MM
  /** Última fatura com vencimento de cada morador (base da sugestão de vencimento). */
  ultimoVencimento?: Record<string, UltimoVencimento>;
  /** Quando informada, o formulário edita esta fatura (morador e mês ficam fixos). */
  fatura?: FaturaEdicao;
}) {
  const editando = !!fatura;
  const hoje = new Date().toISOString().slice(0, 10);
  const primeiro = clientes.find((c) => c.id === fatura?.cliente_id) ?? clientes[0];
  const num = (v: number | null | undefined) => (v == null ? "" : String(v));
  const [clienteId, setClienteId] = useState(primeiro?.id ?? "");
  const [leituraAnterior, setLeituraAnterior] = useState(
    fatura
      ? fatura.leitura_atual != null ? num(fatura.leitura_anterior) : "0"
      : primeiro && ultimaLeitura[primeiro.id] != null ? String(ultimaLeitura[primeiro.id]) : ""
  );
  // Faturas antigas sem leituras: usa o consumo gravado como leitura atual (fator 1).
  const [leituraAtual, setLeituraAtual] = useState(
    fatura ? (fatura.leitura_atual != null ? num(fatura.leitura_atual) : num(fatura.consumo_kwh)) : ""
  );
  const [fator, setFator] = useState(fatura ? (fatura.leitura_atual != null ? num(fatura.fator_multiplicador) : "1") : "1");
  const [tusd, setTusd] = useState(fatura ? num(fatura.tarifa_tusd) : String(tarifas.tusd));
  const [te, setTe] = useState(fatura ? num(fatura.tarifa_te) : String(tarifas.te));
  const [bandeira, setBandeira] = useState(fatura ? num(fatura.adicional_bandeira) : String(tarifas.bandeira));
  const [tarifaGd2, setTarifaGd2] = useState(fatura ? num(fatura.tarifa_gd2) : String(tarifas.tarifaGd2));
  const [iluminacao, setIluminacao] = useState(fatura ? num(fatura.taxa_iluminacao) : String(tarifas.iluminacao));
  const [multa, setMulta] = useState(fatura ? num(fatura.multa_juros) : "0");
  const [desconto, setDesconto] = useState(fatura ? num(fatura.desconto_percentual) : String(primeiro?.desconto_percentual ?? 20));
  const [rascunho, setRascunho] = useState(true);
  // Vencimento: já vem sugerido pelo padrão da última fatura do morador e
  // continua editável. Uma edição manual não é mais sobrescrita pela sugestão.
  const [referencia, setReferencia] = useState(referenciaPadrao);
  const [vencimento, setVencimento] = useState(
    fatura ? (fatura.vencimento ?? "") : vencimentoSugerido(ultimoVencimento[primeiro?.id ?? ""], referenciaPadrao)
  );
  const [vencEditado, setVencEditado] = useState(!!fatura);

  const consumo = consumoDeLeituras(Number(leituraAnterior), Number(leituraAtual), Number(fator));

  // TUSD GD II em R$. Ao editar, se consumo e tarifa não mudaram, mantém o valor gravado
  // (inclusive o centavo exato de um rateio do lote); senão, tarifa × consumo.
  const valorGd2 =
    fatura &&
    Math.abs(consumo - Number(fatura.consumo_kwh)) < 0.005 &&
    Math.abs(Number(tarifaGd2) - Number(fatura.tarifa_gd2)) < 1e-9
      ? Number(fatura.taxa_energia_solar)
      : valorTusdGd2(consumo, Number(tarifaGd2));

  const r = useMemo(
    () =>
      calcularFaturaDetalhada({
        consumoKwh: consumo,
        tarifaTusd: Number(tusd),
        tarifaTe: Number(te),
        adicionalBandeira: Number(bandeira),
        taxaEnergiaSolar: valorGd2,
        taxaIluminacao: Number(iluminacao),
        multaJuros: Number(multa),
        descontoPercentual: Number(desconto),
      }),
    [consumo, tusd, te, bandeira, valorGd2, iluminacao, multa, desconto]
  );

  function onSelecionarCliente(id: string) {
    setClienteId(id);
    const c = clientes.find((x) => x.id === id);
    if (c) setDesconto(String(c.desconto_percentual));
    setLeituraAnterior(ultimaLeitura[id] != null ? String(ultimaLeitura[id]) : "");
    if (!vencEditado) setVencimento(vencimentoSugerido(ultimoVencimento[id], referencia));
  }

  function onMudarReferencia(valor: string) {
    setReferencia(valor);
    if (!vencEditado) setVencimento(vencimentoSugerido(ultimoVencimento[clienteId], valor));
  }

  return (
    <form action={gerarFatura} className="grid gap-6 lg:grid-cols-3">
      <div className="card space-y-4 lg:col-span-2">
        <div>
          <label className="label" htmlFor="cliente_id">Morador *</label>
          <select id="cliente_id" name={editando ? undefined : "cliente_id"} className="input" value={clienteId} onChange={(e) => onSelecionarCliente(e.target.value)} disabled={editando} required>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.nome} {c.unidade ? `— ${c.unidade}` : ""}</option>
            ))}
          </select>
          {editando && <input type="hidden" name="cliente_id" value={clienteId} />}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="referencia">Mês de referência *</label>
            {editando ? (
              <>
                <div className="flex h-[38px] items-center rounded-lg bg-white/10 px-3 text-sm font-semibold text-slate-200">{referenciaPadrao}</div>
                <input type="hidden" name="referencia" value={referenciaPadrao} />
              </>
            ) : (
              <input id="referencia" name="referencia" type="month" className="input" value={referencia} onChange={(e) => onMudarReferencia(e.target.value)} required />
            )}
          </div>
          <div>
            <label className="label" htmlFor="data_emissao">Data de emissão</label>
            <input id="data_emissao" name="data_emissao" type="date" className="input" defaultValue={fatura?.data_emissao ?? hoje} />
          </div>
          <div>
            <label className="label" htmlFor="vencimento">Vencimento</label>
            <input id="vencimento" name="vencimento" type="date" className="input" value={vencimento} onChange={(e) => { setVencimento(e.target.value); setVencEditado(true); }} />
            {!editando && vencimento && !vencEditado && (
              <p className="mt-1 text-xs text-slate-400">Sugerido pela última fatura do morador — pode alterar.</p>
            )}
          </div>
        </div>

        <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Medição</p>
        <div className="grid gap-4 sm:grid-cols-4">
          <Campo label="Leitura anterior" name="leitura_anterior" value={leituraAnterior} onChange={setLeituraAnterior} step={0.01} />
          <Campo label="Leitura atual *" name="leitura_atual" value={leituraAtual} onChange={setLeituraAtual} step={0.01} required />
          <Campo label="Fator mult." name="fator_multiplicador" value={fator} onChange={setFator} step={0.0001} />
          <div>
            <label className="label">Consumo</label>
            <div className="flex h-[38px] items-center rounded-lg bg-white/10 px-3 text-sm font-semibold text-slate-200">{formatKwh(consumo)}</div>
          </div>
        </div>

        <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Tarifas de energia (R$/kWh)</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo label="Consumo — TUSD" name="tarifa_tusd" value={tusd} onChange={setTusd} step={0.00001} />
          <Campo label="Consumo — TE" name="tarifa_te" value={te} onChange={setTe} step={0.00001} />
          <div>
            <Campo label="TUSD GD II (R$/kWh)" name="tarifa_gd2" value={tarifaGd2} onChange={setTarifaGd2} step={0.00001} />
            <input type="hidden" name="taxa_energia_solar" value={valorGd2.toFixed(2)} />
            <p className="mt-1 text-xs text-slate-400">= {formatBRL(r.taxaSolar)} neste consumo</p>
          </div>
        </div>

        <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Valores fixos (R$)</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo label="Adic. bandeira" name="adicional_bandeira" value={bandeira} onChange={setBandeira} step={0.01} />
          <Campo label="Ilum. pública" name="taxa_iluminacao" value={iluminacao} onChange={setIluminacao} step={0.01} />
          <Campo label="Multa / juros" name="multa_juros" value={multa} onChange={setMulta} step={0.01} />
        </div>

        <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Tributos (informativo) · Situação</p>
        <div className="grid gap-4 sm:grid-cols-4">
          <NumInput label="ICMS (R$)" name="icms" step={0.01} valor={fatura?.icms} />
          <NumInput label="PIS (R$)" name="pis" step={0.01} valor={fatura?.pis} />
          <NumInput label="COFINS (R$)" name="cofins" step={0.01} valor={fatura?.cofins} />
          <div>
            <label className="label" htmlFor="desconto_percentual">Desconto (%)</label>
            <input id="desconto_percentual" name="desconto_percentual" type="number" min={0} max={100} step={0.5} className="input" value={desconto} onChange={(e) => setDesconto(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="status">Situação</label>
            <select id="status" name="status" className="input" defaultValue={fatura?.status === "paga" ? "paga" : "pendente"}>
              <option value="pendente">Pendente</option>
              <option value="paga">Paga</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="observacoes">Observações</label>
            <input id="observacoes" name="observacoes" className="input" defaultValue={fatura?.observacoes ?? ""} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card bg-slate-900 text-white">
          <p className="text-sm text-slate-300">Prévia do cálculo</p>
          <div className="mt-3 space-y-1.5 text-sm">
            <Linha rotulo="Consumo — TUSD" valor={formatBRL(r.energiaTusd)} />
            <Linha rotulo="Consumo — TE" valor={formatBRL(r.energiaTe)} />
            {r.taxaSolar > 0 && <Linha rotulo="TUSD GD II" valor={formatBRL(r.taxaSolar)} />}
            {r.bandeira > 0 && <Linha rotulo="Adicional bandeira" valor={formatBRL(r.bandeira)} />}
            <Linha rotulo={`Desconto (${desconto || 0}%)`} valor={`- ${formatBRL(r.valorDesconto)}`} classe="text-eco-400" />
            {r.iluminacao > 0 && <Linha rotulo="Iluminação pública" valor={formatBRL(r.iluminacao)} />}
            {r.multaJuros > 0 && <Linha rotulo="Multa / juros" valor={formatBRL(r.multaJuros)} />}
            <div className="my-2 border-t border-slate-700" />
            <div className="flex items-center justify-between">
              <span className="font-semibold">A pagar</span>
              <span className="text-2xl font-bold text-brand-400">{formatBRL(r.valorLiquido)}</span>
            </div>
            <div className="mt-2 rounded-lg bg-eco-600/20 px-3 py-2 text-eco-300">🌱 Economia: <strong>{formatBRL(r.economia)}</strong></div>
          </div>
        </div>
        {editando ? (
          <div className={`rounded-lg border p-3 text-sm ${fatura!.publicada ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-sky-500/30 bg-sky-500/10 text-sky-300"}`}>
            {fatura!.publicada
              ? "⚠️ Esta fatura já está publicada: o cliente verá as alterações assim que você salvar. Para ajustar sem ele ver, despublique antes."
              : "📝 Rascunho: só você vê. Salve as alterações e, quando estiver certo, publique."}
          </div>
        ) : (
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-sm text-sky-200">
            <input type="checkbox" name="rascunho" checked={rascunho} onChange={(e) => setRascunho(e.target.checked)} className="mt-0.5 h-4 w-4" />
            <span>
              <strong>Salvar como rascunho</strong>
              <span className="block text-xs text-sky-300/80">Só você vê. O cliente só enxerga depois que você publicar.</span>
            </span>
          </label>
        )}
        <div className="flex flex-col gap-2">
          <button type="submit" className="btn-primary w-full">
            {editando ? "Salvar alterações" : rascunho ? "Salvar rascunho" : "Gerar e publicar"}
          </button>
          <Link href="/admin/faturas" className="btn-outline w-full">Cancelar</Link>
        </div>
      </div>
    </form>
  );
}

function Campo({ label, name, value, onChange, step, required }: { label: string; name: string; value: string; onChange: (v: string) => void; step: number; required?: boolean }) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} type="number" min={0} step={step} className="input" value={value} onChange={(e) => onChange(e.target.value)} required={required} />
    </div>
  );
}

function NumInput({ label, name, step, valor }: { label: string; name: string; step: number; valor?: number }) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} type="number" min={0} step={step} className="input" defaultValue={valor ?? 0} />
    </div>
  );
}

function Linha({ rotulo, valor, classe }: { rotulo: string; valor: string; classe?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-300">{rotulo}</span>
      <span className={classe ?? ""}>{valor}</span>
    </div>
  );
}
