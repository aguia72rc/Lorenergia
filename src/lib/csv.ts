/**
 * CSV no formato que o Excel em português abre direto: separador ";",
 * decimal com vírgula e BOM (para os acentos). Funções puras (testáveis).
 */

/** Formata uma célula. Números usam vírgula decimal; textos são protegidos. */
export function celulaCsv(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "number") {
    return Number.isFinite(valor) ? String(Math.round(valor * 100) / 100).replace(".", ",") : "";
  }
  let texto = String(valor);
  // Texto começando com = + - @ poderia ser executado como fórmula ao abrir a planilha.
  if (/^[=+\-@\t\r]/.test(texto)) texto = "'" + texto;
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function montarCsv(cabecalho: string[], linhas: (string | number | null | undefined)[][]): string {
  const todas = [cabecalho, ...linhas].map((l) => l.map(celulaCsv).join(";"));
  return "﻿" + todas.join("\r\n") + "\r\n";
}
