import { calcularEncargosAtraso } from "./atraso";

/**
 * Quanto o morador pagou e quanto disso foi multa e juros. Função pura (testável).
 *
 * - `valorPago` gravado: é o valor oficial; a diferença para o valor da fatura são os encargos.
 * - sem `valorPago`, mas com data do pagamento: calcula a multa e os juros até aquela data.
 * - sem nenhum dos dois: considera pago o valor da fatura.
 */
export interface ResumoPagamento {
  valorFatura: number;
  multa: number;
  juros: number;
  encargos: number; // multa + juros
  total: number; // valor efetivamente pago
  diasAtraso: number;
  /** true quando multa e juros vêm separados (calculados); false quando só se sabe o total de encargos. */
  detalhado: boolean;
}

const arred = (n: number) => Math.round(n * 100) / 100;

export function resumoPagamento(
  f: { valor_liquido: number; vencimento: string | null; valor_pago?: number | null },
  dataPagamento: string | null, // YYYY-MM-DD
  taxas: { multa: number; juros: number }
): ResumoPagamento {
  const valorFatura = arred(Math.max(0, Number(f.valor_liquido) || 0));
  const calculado = dataPagamento
    ? calcularEncargosAtraso(valorFatura, f.vencimento, dataPagamento, taxas.multa, taxas.juros)
    : null;
  const pago = f.valor_pago == null ? null : Number(f.valor_pago);

  if (pago != null && Number.isFinite(pago)) {
    const encargos = arred(Math.max(0, pago - valorFatura));
    // Bate com o cálculo na data do pagamento? Então dá para mostrar multa e juros separados.
    const bate = !!calculado && Math.abs(calculado.encargos - encargos) < 0.01;
    return {
      valorFatura,
      multa: bate ? calculado!.multa : 0,
      juros: bate ? calculado!.juros : 0,
      encargos,
      total: arred(Math.max(pago, valorFatura)),
      diasAtraso: calculado?.diasAtraso ?? 0,
      detalhado: bate && encargos > 0,
    };
  }

  if (calculado?.emAtraso) {
    return {
      valorFatura,
      multa: calculado.multa,
      juros: calculado.juros,
      encargos: calculado.encargos,
      total: calculado.totalAtualizado,
      diasAtraso: calculado.diasAtraso,
      detalhado: true,
    };
  }

  return { valorFatura, multa: 0, juros: 0, encargos: 0, total: valorFatura, diasAtraso: 0, detalhado: false };
}
