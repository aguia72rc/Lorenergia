/** Utilitários de formatação (moeda, datas, números) em pt-BR. */

export function formatBRL(valor: number | null | undefined): string {
  const n = Number(valor) || 0;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatKwh(valor: number | null | undefined): string {
  const n = Number(valor) || 0;
  return `${n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kWh`;
}

/** Recebe "YYYY-MM-DD" e devolve "agosto de 2026". */
export function formatReferencia(referencia: string | null | undefined): string {
  if (!referencia) return "-";
  const [ano, mes] = referencia.split("-");
  const data = new Date(Number(ano), Number(mes) - 1, 1);
  return data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

/** Recebe "YYYY-MM-DD" e devolve "ago/26". */
export function formatReferenciaCurta(referencia: string | null | undefined): string {
  if (!referencia) return "-";
  const [ano, mes] = referencia.split("-");
  const data = new Date(Number(ano), Number(mes) - 1, 1);
  const nome = data.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  return `${nome}/${ano.slice(2)}`;
}

/** Recebe "YYYY-MM-DD" e devolve "06/08/2026". */
export function formatData(data: string | null | undefined): string {
  if (!data) return "-";
  const [ano, mes, dia] = data.split("-");
  if (!ano || !mes || !dia) return "-";
  return `${dia}/${mes}/${ano}`;
}

/**
 * Data (YYYY-MM-DD) no fuso do Recife para um instante qualquer. O servidor roda
 * em UTC: sem isto, a partir das 21h "hoje" já seria amanhã, e uma fatura que
 * vence hoje apareceria vencida (com multa) três horas antes da hora.
 */
export function dataNoRecife(instante: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Recife", year: "numeric", month: "2-digit", day: "2-digit" }).format(instante);
}

/** Primeiro dia do mês atual no formato YYYY-MM-DD. */
export function primeiroDiaMesAtual(): string {
  return `${hojeISO().slice(0, 7)}-01`;
}

/** Data de hoje no formato YYYY-MM-DD (fuso do Recife). */
export function hojeISO(): string {
  return dataNoRecife(new Date());
}

/**
 * True se a fatura está vencida: pendente, com vencimento definido e
 * anterior à data de hoje.
 */
export function faturaVencida(vencimento: string | null | undefined, status: string): boolean {
  if (status !== "pendente" || !vencimento) return false;
  return vencimento < hojeISO();
}

/** Deixa apenas dígitos (para telefone do WhatsApp). */
export function apenasDigitos(valor: string | null | undefined): string {
  return (valor ?? "").replace(/\D/g, "");
}
