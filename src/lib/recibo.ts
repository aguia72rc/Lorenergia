/**
 * Número do recibo de uma fatura paga: mês de referência + início do código da
 * fatura, ex.: "202610-3F9A1C". Estável (sempre o mesmo para a mesma fatura).
 */
export function numeroRecibo(fatura: { id: string; referencia: string }): string {
  const mes = fatura.referencia.slice(0, 7).replace("-", "");
  return `${mes}-${fatura.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** "2026-11-18" → "18 de novembro de 2026". */
export function dataPorExtenso(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split("-").map(Number);
  if (!ano || !mes || !dia) return "";
  return `${dia} de ${MESES[mes - 1]} de ${ano}`;
}
