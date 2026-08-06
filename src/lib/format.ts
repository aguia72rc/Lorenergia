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

/** Primeiro dia do mês atual no formato YYYY-MM-DD. */
export function primeiroDiaMesAtual(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;
}

/** Data de hoje no formato YYYY-MM-DD (fuso local). */
export function hojeISO(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
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
