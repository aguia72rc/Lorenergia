"use client";

import { useRef, useState, useTransition } from "react";
import { FileUp, AlertTriangle, Check } from "lucide-react";
import { lerFaturaNeoenergia } from "@/app/admin/faturas/neoenergia-actions";
import type { FaturaNeoenergia } from "@/lib/neoenergia";
import { formatBRL } from "@/lib/format";

const LIMITE_BYTES = 4 * 1024 * 1024;
const num = (n: number | null, casas = 2) => (n == null ? "—" : n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }));
const dataBr = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");
const mesBr = (ym: string | null) => (ym ? ym.split("-").reverse().join("/") : "—");

/**
 * Importa a fatura da Neoenergia (PDF): mostra o que foi lido para conferência e,
 * ao confirmar, entrega os números para o formulário preencher os campos.
 * `consumoLancadoKwh` (lote): soma das leituras digitadas, para comparar com a conta.
 */
export default function ImportarNeoenergia({
  modo,
  onUsar,
  consumoLancadoKwh,
}: {
  modo: "individual" | "lote";
  /** `fioB` já considera a opção de somar o ICMS-CDE. */
  onUsar: (fatura: FaturaNeoenergia, fioB: number | null) => void;
  consumoLancadoKwh?: number;
}) {
  const campo = useRef<HTMLInputElement>(null);
  const [pendente, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [fatura, setFatura] = useState<FaturaNeoenergia | null>(null);
  const [somarCde, setSomarCde] = useState(false);
  const [usado, setUsado] = useState(false);

  function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = ""; // permite escolher o mesmo arquivo de novo
    if (!arquivo) return;
    setErro(null);
    setFatura(null);
    setUsado(false);
    if (arquivo.size > LIMITE_BYTES) {
      setErro("Arquivo grande demais (máximo de 4 MB).");
      return;
    }
    const dados = new FormData();
    dados.set("arquivo", arquivo);
    startTransition(async () => {
      try {
        const r = await lerFaturaNeoenergia(dados);
        if (r.ok) setFatura(r.fatura);
        else setErro(r.erro);
      } catch {
        setErro("Não foi possível ler o arquivo agora. Tente de novo.");
      }
    });
  }

  const fioB = fatura?.tusdGd2 == null ? null : Math.round((fatura.tusdGd2 + (somarCde ? fatura.icmsCde ?? 0 : 0)) * 100) / 100;
  const diferenca =
    fatura?.consumoMedidoKwh != null && consumoLancadoKwh != null && consumoLancadoKwh > 0
      ? consumoLancadoKwh - fatura.consumoMedidoKwh
      : null;

  return (
    <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-white">Importar fatura da Neoenergia (PDF)</p>
          <p className="text-xs text-slate-400">
            {modo === "individual"
              ? "Preenche as leituras, o mês e a TUSD GD II com os números da conta. O arquivo não fica guardado."
              : "Preenche o Fio B total e o mês com os números da conta. O arquivo não fica guardado."}
          </p>
        </div>
        <input ref={campo} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={aoEscolher} aria-label="Arquivo PDF da fatura da Neoenergia" />
        <button type="button" className="btn-outline" onClick={() => campo.current?.click()} disabled={pendente}>
          <FileUp className="h-4 w-4" /> {pendente ? "Lendo…" : fatura ? "Trocar arquivo" : "Escolher PDF"}
        </button>
      </div>

      <div aria-live="polite">
        {erro && (
          <p className="mt-3 flex items-start gap-2 text-sm text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {erro}
          </p>
        )}

        {fatura && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-slate-400">
              Conta de <strong className="text-slate-200">{fatura.nomeCliente ?? "—"}</strong>
              {fatura.unidadeConsumidora ? ` · UC ${fatura.unidadeConsumidora}` : ""} · referência {mesBr(fatura.referencia)} · vence {dataBr(fatura.vencimento)} · total {fatura.totalPagar == null ? "—" : formatBRL(fatura.totalPagar)}
            </p>
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <Item rotulo="Leitura anterior" valor={`${num(fatura.leituraAnterior)}${fatura.dataLeituraAnterior ? ` (${dataBr(fatura.dataLeituraAnterior)})` : ""}`} />
              <Item rotulo="Leitura atual" valor={`${num(fatura.leituraAtual)}${fatura.dataLeituraAtual ? ` (${dataBr(fatura.dataLeituraAtual)})` : ""}`} />
              <Item rotulo="Consumo do mês" valor={fatura.consumoMedidoKwh == null ? "—" : `${num(fatura.consumoMedidoKwh, 0)} kWh`} />
              <Item rotulo="TUSD GD II (Fio B)" valor={fatura.tusdGd2 == null ? "não encontrada" : formatBRL(fatura.tusdGd2)} destaque />
            </dl>

            {fatura.icmsCde != null && fatura.icmsCde > 0 && fatura.tusdGd2 != null && (
              <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-300">
                <input type="checkbox" className="mt-0.5 h-4 w-4" checked={somarCde} onChange={(e) => { setSomarCde(e.target.checked); setUsado(false); }} />
                <span>
                  Somar o ICMS-CDE da conta ({formatBRL(fatura.icmsCde)}) ao Fio B
                  <span className="block text-xs text-slate-400">
                    Com ele, o valor lançado fica {formatBRL(Math.round((fatura.tusdGd2 + fatura.icmsCde) * 100) / 100)}. Sem ele, {formatBRL(fatura.tusdGd2)}.
                  </span>
                </span>
              </label>
            )}

            {modo === "lote" && diferenca != null && fatura.consumoMedidoKwh != null && (
              <p className={`text-sm ${Math.abs(diferenca) > Math.max(1, fatura.consumoMedidoKwh * 0.02) ? "text-amber-300" : "text-eco-300"}`}>
                Conta da Neoenergia: {num(fatura.consumoMedidoKwh, 0)} kWh · soma das leituras do lote: {num(consumoLancadoKwh ?? 0, 1)} kWh
                {Math.abs(diferenca) > Math.max(1, fatura.consumoMedidoKwh * 0.02)
                  ? ` — diferença de ${num(Math.abs(diferenca), 1)} kWh. Confira as leituras.`
                  : " — batem."}
              </p>
            )}

            {fatura.avisos.map((a) => (
              <p key={a} className="flex items-start gap-2 text-sm text-amber-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {a}
              </p>
            ))}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="btn-primary"
                onClick={() => { onUsar(fatura, fioB); setUsado(true); }}
              >
                {usado ? <Check className="h-4 w-4" /> : null}
                {usado ? "Campos preenchidos" : "Preencher com estes dados"}
              </button>
              <span className="text-xs text-slate-400">Confira os campos abaixo antes de salvar. Você pode ajustar qualquer valor.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Item({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{rotulo}</dt>
      <dd className={`font-semibold tabular-nums ${destaque ? "text-brand-300" : "text-white"}`}>{valor}</dd>
    </div>
  );
}
