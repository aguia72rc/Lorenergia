import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calcularEconomia,
  percentualFioB,
  escolherPlano,
  faixaEconomia,
  validarPlanos,
  type ParametrosEnergia,
  type PlanoCota,
  type FioBItem,
} from "./simulador";

// Premissas e planos idênticos à semente/protótipo.
const PARAMS: ParametrosEnergia = {
  tarifa_tusd_te: 0.76918,
  icms: 0.205,
  pis_cofins: 0.0465,
  tusd_fio_b: 0.25,
  cip: 12,
  disp_monofasica: 30,
  disp_bifasica: 50,
  disp_trifasica: 100,
};
const PLANOS: PlanoCota[] = [
  { codigo: "A", kwh_min: 100, kwh_max: 200, mensalidade: 69 },
  { codigo: "B", kwh_min: 200, kwh_max: 300, mensalidade: 97 },
  { codigo: "C", kwh_min: 300, kwh_max: 400, mensalidade: 122 },
  { codigo: "D", kwh_min: 400, kwh_max: 500, mensalidade: 150 },
  { codigo: "E", kwh_min: 500, kwh_max: 600, mensalidade: 180 },
];
const CRONOGRAMA: FioBItem[] = [
  { ano: 2026, percentual: 0.6 },
  { ano: 2027, percentual: 0.75 },
  { ano: 2028, percentual: 0.9 },
  { ano: 2029, percentual: 1.0 },
];

test("caso base do protótipo: 230 kWh, monofásica, 2026", () => {
  const r = calcularEconomia(
    { modo: "kwh", entrada: 230, tipoLigacao: "monofasica", ano: 2026 },
    PARAMS, PLANOS, CRONOGRAMA
  );
  assert.equal(r.ok, true);
  assert.equal(r.consumoKwh, 230);
  assert.equal(r.plano?.codigo, "B"); // faixa do consumo total (200–300)
  assert.equal(r.energiaCompensadaKwh, 200); // piso da faixa, limitado ao compensável (200)
  // Conta de hoje ~R$ 248,35. Mensalidade FORA do cálculo: economia ~R$ 165,45 (~66,6%).
  assert.ok(Math.abs(r.contaAtual - 248.35) < 0.05, `contaAtual=${r.contaAtual}`);
  assert.ok(Math.abs(r.economiaMensal - 165.45) < 0.1, `economia=${r.economiaMensal}`);
  assert.ok(Math.abs(r.economiaPercentual - 0.6662) < 0.002, `pct=${r.economiaPercentual}`);
  // A mensalidade fica só como informação (receita), fora da conta.
  assert.equal(r.mensalidade, 97);
  assert.ok(Math.abs(r.contaLorenergia - (r.taxaMinimaRede + r.consumoAcimaPlano + r.usoRedeCompensado + r.cip)) < 0.001,
    "conta com a Lorenergia não deve incluir a mensalidade");
  // Consistência: conta com a Lorenergia + economia = conta de hoje.
  assert.ok(Math.abs(r.contaLorenergia + r.economiaMensal - r.contaAtual) < 0.001);
  // Barra soma ~100% (sem fatia de mensalidade).
  assert.equal(r.barra.lore, 0);
  assert.ok(Math.abs(r.barra.neo + r.barra.lore + r.barra.corte - 100) < 0.001);
});

test("entrada em R$ estima o consumo (gross-up e CIP)", () => {
  // Com tarifa cheia ~1,0276 e CIP 12: R$ 248,35 ≈ 230 kWh.
  const r = calcularEconomia(
    { modo: "reais", entrada: 248.35, tipoLigacao: "monofasica", ano: 2026 },
    PARAMS, PLANOS, CRONOGRAMA
  );
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.consumoKwh - 230) < 1, `consumo=${r.consumoKwh}`);
});

test("consumo abaixo da menor faixa não tem plano", () => {
  const r = calcularEconomia(
    { modo: "kwh", entrada: 90, tipoLigacao: "monofasica", ano: 2026 }, // 90 < piso da menor faixa (100)
    PARAMS, PLANOS, CRONOGRAMA
  );
  assert.equal(r.ok, false);
  assert.equal(r.motivo, "sem_margem");
});

test("consumo zero é inválido", () => {
  const r = calcularEconomia(
    { modo: "kwh", entrada: 0, tipoLigacao: "monofasica", ano: 2026 },
    PARAMS, PLANOS, CRONOGRAMA
  );
  assert.equal(r.ok, false);
  assert.equal(r.motivo, "consumo_invalido");
});

test("Fio B: ano além do cadastrado usa o maior (2029 em diante)", () => {
  assert.equal(percentualFioB(CRONOGRAMA, 2026), 0.6);
  assert.equal(percentualFioB(CRONOGRAMA, 2029), 1.0);
  assert.equal(percentualFioB(CRONOGRAMA, 2035), 1.0);
  assert.equal(percentualFioB(CRONOGRAMA, 2020), 0.6); // antes do primeiro usa o menor
});

test("escolha manual de plano respeita o código e ignora inativos", () => {
  assert.equal(escolherPlano(PLANOS, 500, "B")?.codigo, "B");
  const comInativo = [...PLANOS, { codigo: "Z", kwh_min: 900, kwh_max: 1000, mensalidade: 500, ativo: false }];
  assert.equal(escolherPlano(comInativo, 5000)?.codigo, "E"); // acima de tudo → maior faixa ativa (Z inativo ignorado)
});

test("faixa de economia arredonda para baixo (simulador público)", () => {
  assert.deepEqual(faixaEconomia(143.8, 20), { min: 140, max: 160 });
  assert.deepEqual(faixaEconomia(43.45, 20), { min: 40, max: 60 });
  assert.deepEqual(faixaEconomia(0, 20), { min: 0, max: 20 });
});

test("validação de planos: a semente é não-linear e sem erros", () => {
  const v = validarPlanos(PLANOS);
  assert.equal(v.ok, true);
  assert.equal(v.problemas.filter((p) => p.nivel === "erro").length, 0);
  assert.equal(v.problemas.filter((p) => p.nivel === "aviso").length, 0);
  // preço por kWh cai da menor para a maior faixa
  assert.ok(v.precos[0].porKwh > v.precos[v.precos.length - 1].porKwh);
});

test("validação de planos: preço linear gera AVISO de não linearidade", () => {
  const linear: PlanoCota[] = [
    { codigo: "A", kwh_min: 100, kwh_max: 200, mensalidade: 50 }, // 0,50/kWh (piso)
    { codigo: "B", kwh_min: 200, kwh_max: 300, mensalidade: 100 }, // 0,50/kWh — sem ganho de escala
  ];
  const v = validarPlanos(linear);
  assert.equal(v.ok, true); // é aviso, não erro
  assert.equal(v.problemas.some((p) => p.nivel === "aviso"), true);
});

test("validação de planos: faixa maior mais barata é ERRO (dominado)", () => {
  const dominado: PlanoCota[] = [
    { codigo: "A", kwh_min: 100, kwh_max: 200, mensalidade: 90 },
    { codigo: "B", kwh_min: 200, kwh_max: 300, mensalidade: 80 }, // faixa maior e mais barata
  ];
  const v = validarPlanos(dominado);
  assert.equal(v.ok, false);
  assert.equal(v.problemas.some((p) => p.nivel === "erro"), true);
});

test("validação de planos: buraco entre faixas gera AVISO", () => {
  const comBuraco: PlanoCota[] = [
    { codigo: "A", kwh_min: 100, kwh_max: 200, mensalidade: 90 },
    { codigo: "B", kwh_min: 260, kwh_max: 360, mensalidade: 120 }, // buraco 200–260
  ];
  const v = validarPlanos(comBuraco);
  assert.equal(v.problemas.some((p) => p.nivel === "aviso" && /buraco/i.test(p.mensagem)), true);
});
