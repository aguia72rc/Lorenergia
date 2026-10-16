/**
 * Economia gerada para os clientes.
 *
 * Benefício de uma fatura:
 *  - modalidade "desconto": a `economia` (desconto abatido na fatura);
 *  - modalidade "cashback": o `cashback_valor` acumulado (a fatura sai cheia).
 *
 * Só contam faturas PUBLICADAS e não canceladas. Rascunho não entra.
 * (A mesma regra existe em SQL na função public.resumo_publico.)
 */

export interface FaturaEconomia {
  referencia: string; // YYYY-MM-DD
  status: string;
  economia?: number | string | null;
  cashback_valor?: number | string | null;
  modalidade_beneficio?: string | null;
  publicada?: boolean | null;
}

export function beneficioDaFatura(f: FaturaEconomia): number {
  const v = f.modalidade_beneficio === "cashback" ? f.cashback_valor : f.economia;
  return Math.max(0, Number(v) || 0);
}

export function contaNaEconomia(f: FaturaEconomia): boolean {
  return f.status !== "cancelada" && f.publicada !== false;
}

/** Economia somada por mês de referência (YYYY-MM-DD → R$). */
export function economiaPorMes(faturas: FaturaEconomia[]): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const f of faturas) {
    if (!contaNaEconomia(f)) continue;
    mapa.set(f.referencia, (mapa.get(f.referencia) ?? 0) + beneficioDaFatura(f));
  }
  return mapa;
}

/** Total acumulado de todos os meses. */
export function economiaTotal(porMes: Map<string, number>): number {
  let total = 0;
  for (const v of porMes.values()) total += v;
  return Math.round(total * 100) / 100;
}
