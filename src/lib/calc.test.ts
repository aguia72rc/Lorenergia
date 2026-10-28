import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularFaturaDetalhada, consumoDeLeituras, valorTusdGd2, ratearProporcional, distribuirTusdGd2, tarifaGd2Valida, aplicarDescontoFioB } from "./calc";
import { calcularEncargosAtraso } from "./atraso";
import { vencimentoSugerido } from "./vencimento";
import { beneficioDaFatura, economiaPorMes, economiaTotal } from "./economia";
import { interpretarResumo } from "./resumo-publico";
import { normalizarWhatsapp, normalizarNome, entradaValida, comparativo } from "./simulador-publico";

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

test("rateio do Fio B: exemplo real (R$ 208,45 ÷ 1.810,3 kWh) — centavo de ajuste no maior consumo", () => {
  const consumos = [180.7, 136.2, 204.5, 213.1, 85.0, 310.7, 136.2, 68.8, 475.1];
  const r = distribuirTusdGd2("total", 208.45, consumos);
  assert.equal(r.tarifa, 0.11515);
  assert.deepEqual(r.valores, [20.81, 15.68, 23.55, 24.54, 9.79, 35.78, 15.68, 7.92, 54.7]);
  assert.equal(centavos(r.valores), 20845); // fecha exatamente em R$ 208,45
});

test("economia gerada: desconto usa a economia, cashback usa o cashback", () => {
  assert.equal(beneficioDaFatura({ referencia: "2026-09-01", status: "pendente", economia: 70, modalidade_beneficio: "desconto" }), 70);
  assert.equal(beneficioDaFatura({ referencia: "2026-09-01", status: "pendente", economia: 0, cashback_valor: 55.5, modalidade_beneficio: "cashback" }), 55.5);
  assert.equal(beneficioDaFatura({ referencia: "2026-09-01", status: "pendente", economia: "12,5" as unknown as number }), 0); // lixo vira 0
});

test("economia gerada: soma por mês e total ignora rascunho e cancelada", () => {
  const faturas = [
    { referencia: "2026-09-01", status: "paga", economia: 70, publicada: true },
    { referencia: "2026-09-01", status: "pendente", economia: 30, publicada: true },
    { referencia: "2026-10-01", status: "pendente", economia: 100, publicada: true },
    { referencia: "2026-10-01", status: "pendente", economia: 999, publicada: false }, // rascunho
    { referencia: "2026-10-01", status: "cancelada", economia: 888, publicada: true }, // cancelada
    { referencia: "2026-10-01", status: "pendente", economia: 0, cashback_valor: 20, modalidade_beneficio: "cashback" }, // publicada por padrão
  ];
  const porMes = economiaPorMes(faturas);
  assert.equal(porMes.get("2026-09-01"), 100);
  assert.equal(porMes.get("2026-10-01"), 120);
  assert.equal(economiaTotal(porMes), 220);
  assert.equal(economiaTotal(economiaPorMes([])), 0);
});

test("resumo público: lê economia, mês e famílias; ignora dado inválido", () => {
  assert.deepEqual(
    interpretarResumo({ economia_total: 18450.97, ultima_referencia: "2026-10-01", familias: 13 }),
    { economiaTotal: 18450.97, ultimaReferencia: "2026-10-01", familias: 13 }
  );
  // banco ainda sem o campo "familias" (migração 0028 pendente) → usa o valor padrão da página
  assert.equal(interpretarResumo({ economia_total: 100, ultima_referencia: "2026-10-01" })?.familias, null);
  assert.equal(interpretarResumo({ economia_total: 100, familias: 0 })?.familias, null);
  // sem economia ou resposta estranha → nada a mostrar
  assert.equal(interpretarResumo({ economia_total: 0, familias: 5 }), null);
  assert.equal(interpretarResumo(null), null);
  assert.equal(interpretarResumo("x"), null);
});

test("trava da TUSD GD II: tarifa por kWh plausível passa; total em R$ ou valor fixo antigo não", () => {
  assert.equal(tarifaGd2Valida(0.11515), true);
  assert.equal(tarifaGd2Valida(0), true);
  assert.equal(tarifaGd2Valida(1), true);
  assert.equal(tarifaGd2Valida(20), false); // antigo valor fixo digitado no campo por kWh
  assert.equal(tarifaGd2Valida(208.45), false); // total da conta digitado no campo por kWh
  assert.equal(tarifaGd2Valida(-0.1), false);
  // o rateio do exemplo real continua dentro da trava
  const r = distribuirTusdGd2("total", 208.45, [180.7, 136.2, 204.5, 213.1, 85, 310.7, 136.2, 68.8, 475.1]);
  assert.equal(tarifaGd2Valida(r.tarifa), true);
  // total digitado errado (ou leituras erradas) estoura a trava no modo "total"
  assert.equal(tarifaGd2Valida(distribuirTusdGd2("total", 20845, [180.7, 136.2]).tarifa), false);
});

test("desconto no Fio B: aplica o % ao valor repassado e limita a 0–100", () => {
  assert.equal(aplicarDescontoFioB(100, 30), 70);
  assert.equal(aplicarDescontoFioB(53.2, 25), 39.9);
  assert.equal(aplicarDescontoFioB(100, 0), 100);
  assert.equal(aplicarDescontoFioB(100, 100), 0);
  assert.equal(aplicarDescontoFioB(100, 150), 0); // acima de 100% vira 100%
  assert.equal(aplicarDescontoFioB(100, -10), 100); // negativo vira 0%
  assert.equal(aplicarDescontoFioB(-5, 10), 0);
});

test("desconto no Fio B no lote: total com desconto rateado fecha ao centavo; sem desconto nada muda", () => {
  const consumos = [180.7, 136.2, 204.5, 213.1, 85.0, 310.7, 136.2, 68.8, 475.1];
  const sem = distribuirTusdGd2("total", 208.45, consumos);
  assert.deepEqual(sem.valores, sem.brutos); // 0% = valor normal
  const com = distribuirTusdGd2("total", 208.45, consumos, 20);
  assert.equal(centavos(com.valores), 16676); // 208,45 × 0,80 = 166,76
  assert.equal(centavos(com.brutos), 20845); // o valor normal continua guardado
  assert.equal(com.tarifa, 0.11515); // a trava confere o valor normal, não o descontado
  assert.ok(com.valores.every((v, i) => v <= com.brutos[i]));
  const porKwh = distribuirTusdGd2("tarifa", 0.1, [100, 200], 10);
  assert.deepEqual(porKwh.brutos, [10, 20]);
  assert.deepEqual(porKwh.valores, [9, 18]);
});

test("simulador público: WhatsApp brasileiro normalizado ou recusado", () => {
  assert.equal(normalizarWhatsapp("(81) 99559-2624"), "5581995592624");
  assert.equal(normalizarWhatsapp("+55 81 99559-2624"), "5581995592624");
  assert.equal(normalizarWhatsapp("81 3333-4444"), "558133334444"); // fixo, 8 dígitos
  assert.equal(normalizarWhatsapp("99559-2624"), null); // sem DDD
  assert.equal(normalizarWhatsapp("(81) 89559-2624"), null); // celular de 9 dígitos precisa começar em 9
  assert.equal(normalizarWhatsapp("0819955926"), null);
  assert.equal(normalizarWhatsapp(""), null);
});

test("simulador público: nome e limites de entrada", () => {
  assert.equal(normalizarNome("  Maria   da  Silva "), "Maria da Silva");
  assert.equal(normalizarNome("A"), null);
  assert.equal(normalizarNome("x".repeat(81)), null);
  assert.equal(entradaValida("kwh", 300), true);
  assert.equal(entradaValida("kwh", 0), false);
  assert.equal(entradaValida("kwh", 1e9), false);
  assert.equal(entradaValida("reais", NaN), false);
  assert.equal(entradaValida("reais", 350), true);
});

test("simulador público: comparativo usa a faixa conservadora e não passa de 100%", () => {
  assert.deepEqual(comparativo(400, 60), { hoje: 400, com: 340, fracao: 0.85 });
  assert.equal(comparativo(400, 999).com, 0);
  assert.equal(comparativo(0, 20).fracao, 1);
});
