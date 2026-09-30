/**
 * Encargos de atraso (multa + juros de mora) calculados "ao vivo".
 *
 *   multa = valor × multa_percentual/100            (uma vez, ao vencer)
 *   juros = valor × juros_mensal_percentual/100 × (dias de atraso / 30)  (pro rata die)
 *
 * Nada é gravado — recalcula conforme os dias passam. O chamador só deve
 * aplicar quando a fatura estiver PENDENTE (não paga/cancelada).
 */

function arredondar(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

/** Dias corridos entre duas datas YYYY-MM-DD (hoje − vencimento). */
function diasEntre(vencimento: string, hoje: string): number {
  const v = Date.parse(`${vencimento}T00:00:00Z`);
  const h = Date.parse(`${hoje}T00:00:00Z`);
  if (Number.isNaN(v) || Number.isNaN(h)) return 0;
  return Math.floor((h - v) / 86_400_000);
}

export interface EncargosAtraso {
  emAtraso: boolean;
  diasAtraso: number;
  multa: number;
  juros: number;
  encargos: number; // multa + juros
  totalAtualizado: number; // valor + encargos
}

export function calcularEncargosAtraso(
  valorLiquido: number,
  vencimento: string | null | undefined,
  hoje: string,
  multaPercentual = 2,
  jurosMensalPercentual = 1
): EncargosAtraso {
  const base = Math.max(0, Number(valorLiquido) || 0);
  const semAtraso: EncargosAtraso = {
    emAtraso: false, diasAtraso: 0, multa: 0, juros: 0, encargos: 0, totalAtualizado: arredondar(base),
  };
  if (!vencimento) return semAtraso;

  const dias = diasEntre(vencimento, hoje);
  if (dias <= 0) return semAtraso;

  const multa = base * (Math.max(0, Number(multaPercentual) || 0) / 100);
  const juros = base * (Math.max(0, Number(jurosMensalPercentual) || 0) / 100) * (dias / 30);
  const encargos = multa + juros;
  return {
    emAtraso: true,
    diasAtraso: dias,
    multa: arredondar(multa),
    juros: arredondar(juros),
    encargos: arredondar(encargos),
    totalAtualizado: arredondar(base + encargos),
  };
}
