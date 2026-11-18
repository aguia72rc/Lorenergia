import { test } from "node:test";
import assert from "node:assert/strict";
import { inteiroPorExtenso, reaisPorExtenso } from "./extenso";

test("extenso: números inteiros", () => {
  assert.equal(inteiroPorExtenso(0), "zero");
  assert.equal(inteiroPorExtenso(1), "um");
  assert.equal(inteiroPorExtenso(15), "quinze");
  assert.equal(inteiroPorExtenso(21), "vinte e um");
  assert.equal(inteiroPorExtenso(100), "cem");
  assert.equal(inteiroPorExtenso(101), "cento e um");
  assert.equal(inteiroPorExtenso(476), "quatrocentos e setenta e seis");
  assert.equal(inteiroPorExtenso(1000), "mil");
  assert.equal(inteiroPorExtenso(1001), "mil e um");
  assert.equal(inteiroPorExtenso(1100), "mil e cem");
  assert.equal(inteiroPorExtenso(1250), "mil, duzentos e cinquenta");
  assert.equal(inteiroPorExtenso(2020), "dois mil e vinte");
  assert.equal(inteiroPorExtenso(18451), "dezoito mil, quatrocentos e cinquenta e um");
  assert.equal(inteiroPorExtenso(1_000_000), "um milhão");
  assert.equal(inteiroPorExtenso(2_500_000), "dois milhões, quinhentos mil");
});

test("extenso: valores em reais", () => {
  assert.equal(reaisPorExtenso(476.65), "quatrocentos e setenta e seis reais e sessenta e cinco centavos");
  assert.equal(reaisPorExtenso(1), "um real");
  assert.equal(reaisPorExtenso(0.01), "um centavo");
  assert.equal(reaisPorExtenso(0.5), "cinquenta centavos");
  assert.equal(reaisPorExtenso(88.46), "oitenta e oito reais e quarenta e seis centavos");
  assert.equal(reaisPorExtenso(1000), "mil reais");
  assert.equal(reaisPorExtenso(1_000_000), "um milhão de reais");
  assert.equal(reaisPorExtenso(0), "zero real");
  assert.equal(reaisPorExtenso(0.1 + 0.2), "trinta centavos");
});

import { numeroRecibo, dataPorExtenso } from "./recibo";

test("recibo: número estável e data por extenso", () => {
  assert.equal(numeroRecibo({ id: "3f9a1c2e-0000-4000-8000-000000000000", referencia: "2026-10-01" }), "202610-3F9A1C");
  assert.equal(dataPorExtenso("2026-11-18"), "18 de novembro de 2026");
  assert.equal(dataPorExtenso("2026-03-01T10:00:00Z"), "1 de março de 2026");
  assert.equal(dataPorExtenso(""), "");
});
