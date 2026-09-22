import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularFaturaDetalhada, consumoDeLeituras } from "./calc";

test("TUSD GD II fica FORA do desconto; o cliente a paga cheia", () => {
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
  // energia = 177,868; base do desconto = 177,868 (sem a TUSD GD II de 5)
  // desconto = 177,868 × 20% = 35,5736 → 35,57
  // bruto = 177,868 + 5 = 182,87; líquido = 182,868 − 35,5736 = 147,29
  assert.equal(r.energiaTusd, 125.85);
  assert.equal(r.energiaTe, 52.02);
  assert.equal(r.baseDesconto, 177.87);
  assert.equal(r.valorDesconto, 35.57);
  assert.equal(r.valorBruto, 182.87);
  assert.equal(r.valorLiquido, 147.29);
  assert.equal(r.economia, 35.57);
});

test("desconto incide sobre energia + bandeira + iluminação + multa/juros (sem TUSD GD II)", () => {
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
  // energia = 100; base = 100 + 10 + 30 + 5 = 145 (TUSD GD II de 20 fora)
  // desconto = 145 × 10% = 14,5; bruto = 145 + 20 = 165
  // líquido = 165 − 14,5 = 150,5
  assert.equal(r.baseDesconto, 145);
  assert.equal(r.valorDesconto, 14.5);
  assert.equal(r.valorBruto, 165);
  assert.equal(r.valorLiquido, 150.5);
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
