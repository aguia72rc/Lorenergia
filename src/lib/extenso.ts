/**
 * Valor em reais por extenso, para recibos: 476,65 → "quatrocentos e setenta e
 * seis reais e sessenta e cinco centavos". Função pura (testável).
 */

const UNIDADES = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENTENAS = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

/** 0–999 por extenso ("" para 0). */
function ate999(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const c = Math.floor(n / 100);
  const resto = n % 100;
  const partes: string[] = [];
  if (c > 0) partes.push(CENTENAS[c]);
  if (resto > 0) {
    if (resto < 20) partes.push(UNIDADES[resto]);
    else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      partes.push(u > 0 ? `${DEZENAS[d]} e ${UNIDADES[u]}` : DEZENAS[d]);
    }
  }
  return partes.join(" e ");
}

/** Número inteiro (até 999.999.999) por extenso. */
export function inteiroPorExtenso(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return "zero";
  const milhoes = Math.floor(n / 1_000_000);
  const milhares = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const grupos: string[] = [];
  if (milhoes > 0) grupos.push(milhoes === 1 ? "um milhão" : `${ate999(milhoes)} milhões`);
  if (milhares > 0) grupos.push(milhares === 1 ? "mil" : `${ate999(milhares)} mil`);
  if (resto > 0) grupos.push(ate999(resto));
  if (grupos.length === 1) return grupos[0];
  // "e" antes do último grupo quando ele é menor que 100 ou uma centena redonda (ex.: "mil e cem", "mil e vinte").
  const ultimo = grupos.pop()!;
  const usaE = resto > 0 && (resto < 100 || resto % 100 === 0);
  return `${grupos.join(", ")}${usaE ? " e " : ", "}${ultimo}`;
}

/** Valor em R$ por extenso, arredondado ao centavo. */
export function reaisPorExtenso(valor: number): string {
  const centavosTotal = Math.round(Math.abs(Number(valor) || 0) * 100);
  const reais = Math.floor(centavosTotal / 100);
  const centavos = centavosTotal % 100;
  const partes: string[] = [];
  if (reais > 0) {
    const r = inteiroPorExtenso(reais);
    // "um milhão de reais", "dois milhões de reais"
    const de = reais % 1_000_000 === 0 ? " de" : "";
    partes.push(`${r}${de} ${reais === 1 ? "real" : "reais"}`);
  }
  if (centavos > 0) partes.push(`${inteiroPorExtenso(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`);
  return partes.length > 0 ? partes.join(" e ") : "zero real";
}
