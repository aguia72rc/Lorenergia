/**
 * Regras do simulador público: contato do visitante, limites de entrada e
 * comparativo "conta hoje × com a Lorenergia". Funções puras (testáveis).
 */

export const LIMITE_KWH = 20000;
export const LIMITE_REAIS = 200000;

/** Limites de uso por hora (contra spam no simulador aberto ao público). */
export const LIMITE_POR_IP_HORA = 10;
export const LIMITE_POR_WHATSAPP_HORA = 5;
export const LIMITE_GLOBAL_HORA = 300;

/**
 * WhatsApp brasileiro só com dígitos e DDI: "(81) 99559-2624" → "5581995592624".
 * Aceita DDD + 8 ou 9 dígitos, com ou sem o 55 na frente. Devolve null se inválido.
 */
export function normalizarWhatsapp(valor: string): string | null {
  let d = String(valor ?? "").replace(/\D/g, "");
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return null;
  if (d.startsWith("0")) return null;
  if (d.length === 11 && d[2] !== "9") return null; // celular com 9 dígitos começa em 9
  return "55" + d;
}

/** Nome do visitante: 2 a 80 caracteres, espaços extras removidos. */
export function normalizarNome(valor: string): string | null {
  const n = String(valor ?? "").replace(/\s+/g, " ").trim();
  return n.length >= 2 && n.length <= 80 ? n : null;
}

/** Consumo (kWh) ou conta (R$) dentro de limites plausíveis. */
export function entradaValida(modo: "kwh" | "reais", entrada: number): boolean {
  const n = Number(entrada);
  if (!Number.isFinite(n) || n <= 0) return false;
  return n <= (modo === "kwh" ? LIMITE_KWH : LIMITE_REAIS);
}

/**
 * Comparativo para a tela: quanto a pessoa paga hoje e até quanto pagaria com a
 * Lorenergia. Usa a faixa já arredondada para baixo (conservador) e não revela o
 * percentual de desconto nem o cálculo detalhado.
 */
export function comparativo(contaAtual: number, faixaMin: number): { hoje: number; com: number; fracao: number } {
  const hoje = Math.max(0, Math.round(Number(contaAtual) || 0));
  const com = Math.max(0, hoje - Math.max(0, Math.round(Number(faixaMin) || 0)));
  return { hoje, com, fracao: hoje > 0 ? Math.min(1, com / hoje) : 1 };
}
