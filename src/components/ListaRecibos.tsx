import Link from "next/link";
import { ReceiptText, ChevronRight } from "lucide-react";
import { formatBRL, formatReferencia, formatData, dataNoRecife } from "@/lib/format";
import { numeroRecibo } from "@/lib/recibo";

type FaturaPaga = { id: string; referencia: string; valor_liquido: number; pago_em?: string | null };

/** Lista de recibos: um por fatura paga, do mais recente para o mais antigo. */
export default function ListaRecibos({ faturas, vazio }: { faturas: FaturaPaga[]; vazio?: string }) {
  if (faturas.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <ReceiptText className="h-9 w-9 text-slate-400" />
        <p className="mt-2 text-sm text-slate-400">{vazio ?? "Ainda não há recibos. Eles aparecem aqui assim que uma fatura é paga."}</p>
      </div>
    );
  }
  return (
    <div className="divide-y divide-white/5">
      {faturas.map((f) => (
        <Link
          key={f.id}
          href={`/recibo/${f.id}`}
          className="-mx-2 flex items-center justify-between gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-white/5"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-eco-500/15 text-eco-300">
              <ReceiptText className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="font-medium text-white">Recibo · {formatReferencia(f.referencia)}</p>
              <p className="text-xs text-slate-400">
                Nº {numeroRecibo(f)} · {f.pago_em ? `pago em ${formatData(dataNoRecife(new Date(f.pago_em)))}` : "pagamento registrado"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold tabular-nums text-white">{formatBRL(Number(f.valor_liquido))}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
          </div>
        </Link>
      ))}
    </div>
  );
}
