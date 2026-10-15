/**
 * Sugestão de vencimento a partir da última fatura do morador.
 *
 * Mantém o mesmo "padrão" da última fatura: o mesmo dia do mês e o mesmo
 * deslocamento em relação ao mês de referência. Ex.: a fatura de set/2026
 * vencia em 10/10/2026 (dia 10, um mês depois) → a de out/2026 sugere
 * 10/11/2026. Se o dia não existir no mês (31 em fevereiro), usa o último dia.
 *
 * Só trabalha com texto YYYY-MM-DD (sem fuso horário).
 */

export interface UltimoVencimento {
  vencimento: string; // YYYY-MM-DD
  referencia: string; // YYYY-MM-DD (1º dia do mês da fatura)
}

function partes(iso: string): [number, number, number] {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return [a, m, d || 1];
}

function diasNoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

/** `referencia` aceita "YYYY-MM" ou "YYYY-MM-DD". Retorna "" quando não há base. */
export function vencimentoSugerido(ultimo: UltimoVencimento | null | undefined, referencia: string): string {
  if (!ultimo?.vencimento || !ultimo.referencia || !referencia) return "";

  const [va, vm, vd] = partes(ultimo.vencimento);
  const [ra, rm] = partes(ultimo.referencia);
  const [na, nm] = partes(referencia.length === 7 ? `${referencia}-01` : referencia);
  if ([va, vm, vd, ra, rm, na, nm].some((n) => Number.isNaN(n))) return "";

  // Quantos meses a data de vencimento fica depois do mês de referência.
  const deslocamento = va * 12 + vm - (ra * 12 + rm);
  const indice = na * 12 + (nm - 1) + deslocamento; // mês de vencimento, base zero
  const ano = Math.floor(indice / 12);
  const mes = (indice % 12) + 1;
  const dia = Math.min(vd, diasNoMes(ano, mes));

  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}
