import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularFaturaDetalhada, consumoDeLeituras, valorTusdGd2, ratearProporcional, distribuirTusdGd2 } from "./calc";
import { calcularEncargosAtraso } from "./atraso";
import { vencimentoSugerido } from "./vencimento";

test("encargos de atraso: 2% de multa + 1% ao mês pro rata die", () => {
  const r = calcularEncargosAtraso(100, "2026-01-01", "2026-01-31", 2, 1);
  assert.equal(r.emAtraso, true);
  assert.equal(r.diasAtraso, 30);
  assert.equal(r.multa, 2);
  assert.equal(r.juros, 1); // 100 × 1% × (30/30)
  assert.equal(r.totalAtualizado, 103);
});

test("encargos de atraso: sem atraso quando não vencida", () => {
  const r = calcularEncargosAtraso(100, "2026-12-31", "2026-01-31", 2, 1);
  assert.equal(r.emAtraso, false);
  assert.equal(r.encargos, 0);
  assert.equal(r.totalAtualizado, 100);
});

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

test("desconto incide sobre o valor bruto total (conta cheia), incluindo iluminação e multa/juros", () => {
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
  // energia = 100; bruto = 100 + 10 + 20 + 30 + 5 = 165
  // desconto = 165 × 10% = 16,5; líquido = 165 - 16,5 = 148,5
  assert.equal(r.baseDesconto, 165);
  assert.equal(r.valorDesconto, 16.5);
  assert.equal(r.valorBruto, 165);
  assert.equal(r.valorLiquido, 148.5);
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

test("vencimento sugerido: mantém o dia e o deslocamento da última fatura", () => {
  const ultimo = { vencimento: "2026-10-10", referencia: "2026-09-01" }; // dia 10, mês seguinte
  assert.equal(vencimentoSugerido(ultimo, "2026-10"), "2026-11-10");
  assert.equal(vencimentoSugerido(ultimo, "2026-10-01"), "2026-11-10");
});

test("vencimento sugerido: virada de ano e vencimento no próprio mês", () => {
  assert.equal(vencimentoSugerido({ vencimento: "2026-12-10", referencia: "2026-11-01" }, "2026-12"), "2027-01-10");
  assert.equal(vencimentoSugerido({ vencimento: "2026-10-20", referencia: "2026-10-01" }, "2026-11"), "2026-11-20");
});

test("vencimento sugerido: dia 31 usa o último dia do mês curto; sem histórico fica vazio", () => {
  assert.equal(vencimentoSugerido({ vencimento: "2026-01-31", referencia: "2025-12-01" }, "2026-01"), "2026-02-28");
  assert.equal(vencimentoSugerido(null, "2026-10"), "");
  assert.equal(vencimentoSugerido({ vencimento: "", referencia: "2026-09-01" }, "2026-10"), "");
});

test("TUSD GD II é proporcional ao consumo: tarifa (R$/kWh) × kWh", () => {
  assert.equal(valorTusdGd2(340, 0.06), 20.4);
  assert.equal(valorTusdGd2(100, 0.06), 6);
  assert.equal(valorTusdGd2(0, 0.06), 0);
  assert.equal(valorTusdGd2(340, -1), 0);
  // cada morador paga conforme o próprio consumo
  assert.ok(valorTusdGd2(500, 0.06) > valorTusdGd2(340, 0.06));
});

const centavos = (v: number[]) => Math.round(v.reduce((s, x) => s + x, 0) * 100);

test("rateio proporcional: partes proporcionais ao consumo e soma exata ao centavo", () => {
  assert.deepEqual(ratearProporcional(600, [1, 2, 3]), [100, 200, 300]);
  const partes = ratearProporcional(150.33, [340, 500, 410]);
  assert.equal(centavos(partes), 15033); // nunca perde nem sobra centavo
  assert.ok(partes[1] > partes[2] && partes[2] > partes[0]); // quem consome mais paga mais
  assert.equal(centavos(ratearProporcional(100, [1, 1, 1])), 10000);
});

test("rateio proporcional: casos de borda", () => {
  assert.deepEqual(ratearProporcional(100, [0, 0]), [0, 0]);
  assert.deepEqual(ratearProporcional(0, [10, 20]), [0, 0]);
  assert.deepEqual(ratearProporcional(100, [50, 0]), [100, 0]);
  assert.deepEqual(ratearProporcional(-5, [10, 20]), [0, 0]);
});

test("TUSD GD II no lote: total da conta rateado, ou tarifa por kWh", () => {
  const consumos = [340, 500, 410];
  const total = distribuirTusdGd2("total", 150.33, consumos);
  assert.equal(centavos(total.valores), 15033);
  assert.equal(total.tarifa, Math.round((150.33 / 1250) * 1e5) / 1e5);
  const porKwh = distribuirTusdGd2("tarifa", 0.06, consumos);
  assert.deepEqual(porKwh.valores, [20.4, 30, 24.6]);
  assert.equal(porKwh.tarifa, 0.06);
  assert.deepEqual(distribuirTusdGd2("total", 100, []).valores, []);
});
