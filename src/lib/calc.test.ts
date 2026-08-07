import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularFaturaDetalhada, consumoDeLeituras } from "./calc";

test("bate no centavo com o PDF de referência (R$ 146,29)", () => {
  const r = calcularFaturaDetalhada({
    consumoKwh: 167.8,
    tarifaTusd: 0.75,
    tarifaTe: 0.31,
    adicionalBandeira: 0,
    taxaEnergiaSolar: 5,
    taxaIluminacao: 0,
    multaJuros: 0,
    descontoPercentual: 20,
  });
  assert.equal(r.energiaTusd, 125.85);
  assert.equal(r.energiaTe, 52.02);
  assert.equal(r.valorDesconto, 36.57);
  assert.equal(r.valorLiquido, 146.29);
  assert.equal(r.economia, 36.57);
});

test("desconto incide sobre TUSD+TE+bandeira+taxa solar; iluminação e multa/juros ficam fora", () => {
  const r = calcularFaturaDetalhada({
    consumoKwh: 100,
    tarifaTusd: 1,
    tarifaTe: 0,
    adicionalBandeira: 10,
    taxaEnergiaSolar: 20,
    taxaIluminacao: 30,
    multaJuros: 5,
    descontoPercentual: 10,
  });
  // energia = 100; base = 100 + 10 + 20 = 130; desconto = 13
  // bruto = 130 + 30 + 5 = 165; líquido = 165 - 13 = 152
  assert.equal(r.baseDesconto, 130);
  assert.equal(r.valorDesconto, 13);
  assert.equal(r.valorBruto, 165);
  assert.equal(r.valorLiquido, 152);
});

test("consumoDeLeituras aplica o fator e nunca fica negativo", () => {
  assert.equal(consumoDeLeituras(100, 250, 1), 150);
  assert.equal(consumoDeLeituras(100, 250, 2), 300);
  assert.equal(consumoDeLeituras(300, 100, 1), 0); // troca/zeragem de medidor
});

test("desconto de 0% e de 100%", () => {
  const base = {
    consumoKwh: 10,
    tarifaTusd: 1,
    tarifaTe: 0,
    adicionalBandeira: 0,
    taxaEnergiaSolar: 0,
    taxaIluminacao: 0,
    multaJuros: 0,
  };
  assert.equal(calcularFaturaDetalhada({ ...base, descontoPercentual: 0 }).valorLiquido, 10);
  assert.equal(calcularFaturaDetalhada({ ...base, descontoPercentual: 100 }).valorLiquido, 0);
});

test("entradas negativas ou inválidas são tratadas como zero", () => {
  const r = calcularFaturaDetalhada({
    consumoKwh: -5,
    tarifaTusd: -1,
    tarifaTe: NaN,
    adicionalBandeira: -3,
    taxaEnergiaSolar: -2,
    taxaIluminacao: -1,
    multaJuros: -1,
    descontoPercentual: -10,
  });
  assert.equal(r.valorLiquido, 0);
  assert.equal(r.economia, 0);
});
