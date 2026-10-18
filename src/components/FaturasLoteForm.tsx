"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { calcularFaturaDetalhada, consumoDeLeituras, distribuirTusdGd2, tarifaGd2Valida, MSG_TARIFA_GD2, type ModoGd2 } from "@/lib/calc";
import { formatBRL, formatKwh } from "@/lib/format";
import { gerarFaturasLote, type ItemLote } from "@/app/admin/faturas/actions";
import type { StatusFatura } from "@/lib/types";
import type { TarifasPadrao } from "@/components/NovaFaturaForm";
import { vencimentoSugerido, type UltimoVencimento } from "@/lib/vencimento";

interface ClienteLote {
  id: string;
  nome: string;
  unidade: string | null;
  desconto_percentual: number;
}

interface LinhaEstado {
  leituraAnterior: string;
  leituraAtual: string;
  vencimento: string;
  desconto: string; // % deste morador (começa no cadastro dele; editável)
}

export default function FaturasLoteForm({
  clientes,
  ultimaLeitura,
  tarifas,
  referenciaPadrao,
  ultimoVencimento = {},
}: {
  clientes: ClienteLote[];
  ultimaLeitura: Record<string, number>;
  /** Última fatura com vencimento de cada morador (base da sugestão). */
  ultimoVencimento?: Record<string, UltimoVencimento>;
  tarifas: TarifasPadrao;
  referenciaPadrao: string; // YYYY-MM
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mensagem, setMensagem] = useState<string | null>(null);

  const hoje = new Date().toISOString().slice(0, 10);
  const [referencia, setReferencia] = useState(referenciaPadrao);
  const [dataEmissao, setDataEmissao] = useState(hoje);
  const [fator, setFator] = useState("1");
  const [tusd, setTusd] = useState(String(tarifas.tusd));
  const [te, setTe] = useState(String(tarifas.te));
  const [bandeira, setBandeira] = useState(String(tarifas.bandeira));
  // TUSD GD II (Fio B): por padrão informa o TOTAL da conta da Neoenergia (R$) e o
  // sistema divide entre os moradores pelo consumo de cada um. Alternativa: tarifa por kWh.
  const [gd2Modo, setGd2Modo] = useState<ModoGd2>("total");
  const [gd2Total, setGd2Total] = useState("");
  const [tarifaGd2, setTarifaGd2] = useState(String(tarifas.tarifaGd2));
  // Desconto (%) dado no Fio B: só aparece aqui no admin; o morador vê apenas o valor final.
  const [descontoFioB, setDescontoFioB] = useState("0");
  const [taxa, setTaxa] = useState(String(tarifas.iluminacao));
  const [multa, setMulta] = useState("0");
  const [icms, setIcms] = useState("0");
  const [pis, setPis] = useState("0");
  const [cofins, setCofins] = useState("0");
  const [descontoTodos, setDescontoTodos] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [status, setStatus] = useState<StatusFatura>("pendente");
  // Padrão seguro: o lote nasce como rascunho (só o admin vê até publicar).
  const [rascunho, setRascunho] = useState(true);

  const [linhas, setLinhas] = useState<Record<string, LinhaEstado>>(() =>
    Object.fromEntries(
      clientes.map((c) => [
        c.id,
        {
          leituraAnterior: ultimaLeitura[c.id] != null ? String(ultimaLeitura[c.id]) : "",
          leituraAtual: "",
          vencimento: vencimentoSugerido(ultimoVencimento[c.id], referenciaPadrao),
          desconto: String(c.desconto_percentual),
        },
      ])
    )
  );
  // Moradores cujo vencimento foi alterado à mão: a sugestão não os sobrescreve.
  const [vencEditado, setVencEditado] = useState<Record<string, boolean>>({});

  function atualizar(id: string, campo: keyof LinhaEstado, valor: string) {
    setLinhas((prev) => ({ ...prev, [id]: { ...prev[id], [campo]: valor } }));
    if (campo === "vencimento") setVencEditado((prev) => ({ ...prev, [id]: true }));
  }

  // Trocar o mês recalcula a sugestão de quem ainda não foi editado.
  function onMudarReferencia(valor: string) {
    setReferencia(valor);
    setLinhas((prev) =>
      Object.fromEntries(
        clientes.map((c) => [
          c.id,
          vencEditado[c.id] ? prev[c.id] : { ...prev[c.id], vencimento: vencimentoSugerido(ultimoVencimento[c.id], valor) },
        ])
      )
    );
  }

  // "Vencimento para todos": aplica a mesma data a todos os moradores.
  function aplicarVencimentoATodos(valor: string) {
    setVencimento(valor);
    setLinhas((prev) => Object.fromEntries(clientes.map((c) => [c.id, { ...prev[c.id], vencimento: valor }])));
    setVencEditado(Object.fromEntries(clientes.map((c) => [c.id, valor !== ""])));
  }

  // "Desconto (%) para todos": aplica o mesmo percentual a todos os moradores.
  function aplicarDescontoATodos(valor: string) {
    setDescontoTodos(valor);
    if (valor === "") return;
    setLinhas((prev) => Object.fromEntries(clientes.map((c) => [c.id, { ...prev[c.id], desconto: valor }])));
  }

  const descontoDe = (c: ClienteLote, l: LinhaEstado) => (l.desconto === "" ? c.desconto_percentual : Number(l.desconto));

  const calculados = useMemo(() => {
    const base = clientes.map((c) => {
      const l = linhas[c.id];
      const preenchida = l.leituraAtual !== "";
      const consumo = consumoDeLeituras(Number(l.leituraAnterior), Number(l.leituraAtual), Number(fator));
      return { c, l, preenchida, consumo };
    });
    // O rateio considera só quem tem leitura atual preenchida.
    const ativos = base.filter((b) => b.preenchida);
    const gd2 = distribuirTusdGd2(
      gd2Modo,
      Number(gd2Modo === "total" ? gd2Total : tarifaGd2),
      ativos.map((b) => b.consumo),
      Number(descontoFioB)
    );
    const valorGd2 = new Map(ativos.map((b, i) => [b.c.id, gd2.valores[i]]));

    return base.map(({ c, l, preenchida, consumo }) => {
      const r = calcularFaturaDetalhada({
        consumoKwh: consumo,
        tarifaTusd: Number(tusd),
        tarifaTe: Number(te),
        adicionalBandeira: Number(bandeira),
        taxaEnergiaSolar: valorGd2.get(c.id) ?? 0,
        taxaIluminacao: Number(taxa),
        multaJuros: Number(multa),
        descontoPercentual: descontoDe(c, l),
      });
      return { cliente: c, consumo, preenchida, ...r };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientes, linhas, fator, tusd, te, bandeira, gd2Modo, gd2Total, tarifaGd2, descontoFioB, taxa, multa]);

  const preenchidas = calculados.filter((x) => x.preenchida);
  const kwhRateio = preenchidas.reduce((sum, x) => sum + x.consumo, 0);
  // Trava: tarifa (digitada ou equivalente ao total) acima do limite = valor no campo errado.
  const tarifaGd2Efetiva =
    gd2Modo === "tarifa" ? Number(tarifaGd2) || 0 : kwhRateio > 0 ? (Number(gd2Total) || 0) / kwhRateio : 0;
  const gd2Invalida = !tarifaGd2Valida(tarifaGd2Efetiva);
  const gd2Resumo =
    gd2Modo === "total" && Number(gd2Total) > 0 && kwhRateio > 0
      ? `R$ ${(Number(gd2Total) / kwhRateio).toLocaleString("pt-BR", { maximumFractionDigits: 5 })} por kWh (${kwhRateio.toLocaleString("pt-BR")} kWh no lote)`
      : "";
  const totalPagar = preenchidas.reduce((s, x) => s + x.valorLiquido, 0);
  const totalEconomia = preenchidas.reduce((s, x) => s + x.economia, 0);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMensagem(null);
    const itens: ItemLote[] = clientes.map((c) => {
      const l = linhas[c.id];
      return {
        cliente_id: c.id,
        leitura_anterior: l.leituraAnterior === "" ? null : Number(l.leituraAnterior),
        leitura_atual: l.leituraAtual === "" ? null : Number(l.leituraAtual),
        desconto_percentual: descontoDe(c, l),
        vencimento: l.vencimento || null,
      };
    });

    startTransition(async () => {
      const r = await gerarFaturasLote({
        referencia,
        fator_multiplicador: Number(fator) || 1,
        tarifa_tusd: Number(tusd),
        tarifa_te: Number(te),
        adicional_bandeira: Number(bandeira),
        gd2_modo: gd2Modo,
        gd2_total: Number(gd2Total) || 0,
        tarifa_gd2: Number(tarifaGd2) || 0,
        desconto_fio_b: Number(descontoFioB) || 0,
        taxa_iluminacao: Number(taxa),
        multa_juros: Number(multa) || 0,
        icms: Number(icms) || 0,
        pis: Number(pis) || 0,
        cofins: Number(cofins) || 0,
        data_emissao: dataEmissao || null,
        vencimento: vencimento || null,
        status,
        rascunho,
        itens,
      });
      setMensagem(r.mensagem);
      if (r.ok) router.push("/admin/faturas");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Parâmetros do mês (aplicados a todos os moradores) */}
      <div className="card space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label" htmlFor="referencia">Mês de referência *</label>
            <input id="referencia" type="month" className="input" value={referencia} onChange={(e) => onMudarReferencia(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="data_emissao">Data de emissão</label>
            <input id="data_emissao" type="date" className="input" value={dataEmissao} onChange={(e) => setDataEmissao(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="vencimento">Vencimento (todos)</label>
            <input id="vencimento" type="date" className="input" value={vencimento} onChange={(e) => aplicarVencimentoATodos(e.target.value)} />
            <p className="mt-1 text-xs text-slate-400">Opcional: preenche a data de todos. Cada morador pode ter a sua na tabela.</p>
          </div>
          <div>
            <label className="label" htmlFor="status">Situação</label>
            <select id="status" className="input" value={status} onChange={(e) => setStatus(e.target.value as StatusFatura)}>
              <option value="pendente">Pendente</option>
              <option value="paga">Paga</option>
            </select>
          </div>
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tarifas de energia (R$/kWh) · Fator</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label" htmlFor="tusd">Consumo — TUSD</label>
            <input id="tusd" type="number" min={0} step={0.00001} className="input" value={tusd} onChange={(e) => setTusd(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="te">Consumo — TE</label>
            <input id="te" type="number" min={0} step={0.00001} className="input" value={te} onChange={(e) => setTe(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="fator">Fator multiplicador</label>
            <input id="fator" type="number" min={0} step={0.0001} className="input" value={fator} onChange={(e) => setFator(e.target.value)} />
          </div>
        </div>

        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">TUSD GD II (Fio B) — proporcional ao consumo</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label" htmlFor="gd2_modo">Como informar</label>
            <select id="gd2_modo" className="input" value={gd2Modo} onChange={(e) => setGd2Modo(e.target.value as ModoGd2)}>
              <option value="total">Total da conta (R$) — rateado</option>
              <option value="tarifa">Tarifa por kWh (R$/kWh)</option>
            </select>
          </div>
          {gd2Modo === "total" ? (
            <div>
              <label className="label" htmlFor="gd2_total">Fio B total do mês (R$)</label>
              <input id="gd2_total" type="number" min={0} step={0.01} className="input" value={gd2Total} onChange={(e) => setGd2Total(e.target.value)} placeholder="valor da conta" />
            </div>
          ) : (
            <div>
              <label className="label" htmlFor="tarifaGd2">TUSD GD II (R$/kWh)</label>
              <input id="tarifaGd2" type="number" min={0} step={0.00001} className="input" value={tarifaGd2} onChange={(e) => setTarifaGd2(e.target.value)} />
            </div>
          )}
          <div>
            <label className="label" htmlFor="desconto_fio_b">Desconto no Fio B (%)</label>
            <input id="desconto_fio_b" type="number" min={0} max={100} step={0.5} className="input" value={descontoFioB} onChange={(e) => setDescontoFioB(e.target.value)} />
          </div>
          {gd2Invalida && (
            <p className="text-xs font-medium text-red-400 sm:col-span-4">
              {gd2Modo === "total"
                ? `O total informado equivale a R$ ${tarifaGd2Efetiva.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} por kWh — alto demais. Confira o valor do Fio B e as leituras (leitura anterior em branco infla o consumo).`
                : MSG_TARIFA_GD2}
            </p>
          )}
          <p className="text-xs text-slate-400 sm:col-span-2">
            {gd2Modo === "total"
              ? `Informe o Fio B da conta da Neoenergia (já com o percentual do ano). Cada morador paga a parte proporcional ao próprio consumo${gd2Resumo ? ` — equivale a ${gd2Resumo}` : ""}.`
              : "Cada morador paga a tarifa × o próprio consumo."}
            {Number(descontoFioB) > 0 && " O desconto no Fio B reduz o valor repassado; o morador vê só o valor final, sem o percentual."}
          </p>
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Valores fixos (R$)</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Campo id="bandeira" label="Adic. bandeira" value={bandeira} onChange={setBandeira} />
          <Campo id="taxa" label="Ilum. pública" value={taxa} onChange={setTaxa} />
          <Campo id="multa" label="Multa / juros" value={multa} onChange={setMulta} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tributos (informativo) · Desconto</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Campo id="icms" label="ICMS (R$)" value={icms} onChange={setIcms} />
          <Campo id="pis" label="PIS (R$)" value={pis} onChange={setPis} />
          <Campo id="cofins" label="COFINS (R$)" value={cofins} onChange={setCofins} />
          <div>
            <label className="label" htmlFor="desconto_todos">Desconto (%) — todos</label>
            <input id="desconto_todos" type="number" min={0} max={100} step={0.5} className="input" value={descontoTodos} placeholder="cada um o seu" onChange={(e) => aplicarDescontoATodos(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-slate-400">
          Estes valores se aplicam a <strong>todos</strong> os moradores do lote. O desconto vem do cadastro de cada morador e pode ser ajustado
          um a um na tabela (ou para todos de uma vez no campo acima). Para um valor diferente em só uma fatura, edite-a depois.
        </p>
        <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-sm text-sky-200">
          <input type="checkbox" checked={rascunho} onChange={(e) => setRascunho(e.target.checked)} className="mt-0.5 h-4 w-4" />
          <span>
            <strong>Salvar como rascunho</strong>
            <span className="block text-xs text-sky-300/80">
              As faturas ficam só no admin: você confere, edita o que precisar e publica depois (uma a uma ou o mês inteiro). Faturas que já existem mantêm o estado atual.
            </span>
          </span>
        </label>
      </div>

      {/* Tabela de leituras */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-slate-400">
              <th className="pb-2 font-medium">Morador</th>
              <th className="pb-2 font-medium">Leitura anterior</th>
              <th className="pb-2 font-medium">Leitura atual</th>
              <th className="pb-2 font-medium">Vencimento</th>
              <th className="pb-2 font-medium">Consumo</th>
              <th className="pb-2 font-medium">Desc.</th>
              <th className="pb-2 text-right font-medium">A pagar</th>
              <th className="pb-2 text-right font-medium">Economia</th>
            </tr>
          </thead>
          <tbody>
            {calculados.map(({ cliente: c, consumo, valorLiquido, economia, preenchida }) => (
              <tr key={c.id} className="border-b border-white/5 last:border-0">
                <td className="py-2 pr-2">
                  <span className="font-medium text-white">{c.nome}</span>
                  {c.unidade && <span className="ml-1 text-xs text-slate-400">{c.unidade}</span>}
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className="input w-28 py-1"
                    value={linhas[c.id].leituraAnterior}
                    onChange={(e) => atualizar(c.id, "leituraAnterior", e.target.value)}
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className="input w-28 py-1"
                    value={linhas[c.id].leituraAtual}
                    onChange={(e) => atualizar(c.id, "leituraAtual", e.target.value)}
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="date"
                    className="input w-36 py-1"
                    value={linhas[c.id].vencimento}
                    onChange={(e) => atualizar(c.id, "vencimento", e.target.value)}
                    aria-label={`Vencimento de ${c.nome}`}
                  />
                </td>
                <td className="py-2 pr-2 text-slate-300">{preenchida ? formatKwh(consumo) : "-"}</td>
                <td className="py-2 pr-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    className="input w-20 py-1"
                    value={linhas[c.id].desconto}
                    onChange={(e) => atualizar(c.id, "desconto", e.target.value)}
                    aria-label={`Desconto de ${c.nome} (%)`}
                  />
                </td>
                <td className="py-2 pr-2 text-right font-medium text-white">{preenchida ? formatBRL(valorLiquido) : "-"}</td>
                <td className="py-2 text-right text-eco-300">{preenchida ? formatBRL(economia) : "-"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-white/10 font-semibold text-white">
              <td className="pt-3" colSpan={6}>Total ({preenchidas.length} fatura(s))</td>
              <td className="pt-3 text-right">{formatBRL(totalPagar)}</td>
              <td className="pt-3 text-right text-eco-300">{formatBRL(totalEconomia)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {mensagem && <span className="text-sm text-slate-300">{mensagem}</span>}
        <Link href="/admin/faturas" className="btn-outline">Cancelar</Link>
        <button type="submit" className="btn-primary" disabled={pending || preenchidas.length === 0 || gd2Invalida}>
          {pending ? "Salvando..." : rascunho ? `Salvar ${preenchidas.length} rascunho(s)` : `Gerar e publicar ${preenchidas.length} fatura(s)`}
        </button>
      </div>
    </form>
  );
}

function Campo({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <input id={id} type="number" min={0} step={0.01} className="input" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
