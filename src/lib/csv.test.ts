import { test } from "node:test";
import assert from "node:assert/strict";
import { celulaCsv, montarCsv } from "./csv";

test("CSV: números com vírgula decimal e 2 casas; vazio para nulo", () => {
  assert.equal(celulaCsv(476.65), "476,65");
  assert.equal(celulaCsv(100), "100");
  assert.equal(celulaCsv(0.1 + 0.2), "0,3");
  assert.equal(celulaCsv(null), "");
  assert.equal(celulaCsv(NaN), "");
});

test("CSV: texto com ; ou aspas vai entre aspas; fórmula é neutralizada", () => {
  assert.equal(celulaCsv("Maria da Silva"), "Maria da Silva");
  assert.equal(celulaCsv("Apto 1; Bloco B"), '"Apto 1; Bloco B"');
  assert.equal(celulaCsv('João "Jota"'), '"João ""Jota"""');
  assert.equal(celulaCsv("=SOMA(A1:A9)"), "'=SOMA(A1:A9)");
  assert.equal(celulaCsv("@cmd"), "'@cmd");
});

test("CSV: arquivo com BOM, ; como separador e uma linha por registro", () => {
  const csv = montarCsv(["Morador", "A pagar (R$)"], [["Ana", 10.5], ["Bia", 20]]);
  assert.equal(csv, "﻿Morador;A pagar (R$)\r\nAna;10,5\r\nBia;20\r\n");
});
