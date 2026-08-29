import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calcularEconomia,
  escolherPlano,
  faixaEconomia,
  validarPlanos,
  comTributos,
  type ParametrosEnergia,
  type PlanoDesconto,
} from "./simulador";

const PARAMS: ParametrosEnergia = {
  tarifa_tusd_te: 0.76918, // real ANEEL B1 residencial PE (TUSD+TE, sem tributos)
  icms: 0.205,
  pis_cofins: 0.0465,
  cip: 12,
};
const PLANOS: PlanoDesconto[] = [
  { codigo: "FID", nome: "Com fidelidade", desconto_percentual: 20, fidelidade: true },
  { codigo: "SEM", nome: "Sem fidelidade", desconto_percentual: 15, fidelidade: false },
];

test("com fidelidade (20%): 500 kWh", () => {
  const r = calcularEconomia({ modo: "kwh", entrada: 500, planoCodigo: "FID" }, PARAMS, PLANOS);
  assert.equal(r.ok, true);
  assert.equal(r.consumoKwh, 500);
  assert.equal(r.plano?.codigo, "FID");
  // tarifa com tributos = 0.76918 / (1 - 0.205 - 0.0465) ≈ 1.02763
  const tarifa = 0.76918 / (1 - 0.205 - 0.0465);
  const valorEnergia = 500 * tarifa;
  assert.ok(Math.abs(r.valorEnergia - valorEnergia) < 0.01);
  // economia = 20% do valor da energia
  assert.ok(Math.abs(r.economiaMensal - valorEnergia * 0.2) < 0.01, `economia=${r.economiaMensal}`);
  // conta de hoje = energia + iluminação; com a Lorenergia = conta − economia
  assert.ok(Math.abs(r.contaAtual - (valorEnergia + 12)) < 0.01);
  assert.ok(Math.abs(r.contaLorenergia - (r.contaAtual - r.economiaMensal)) < 0.001);
});

test("sem fidelidade aplica 15%", () => {
  const r = calcularEconomia({ modo: "kwh", entrada: 500, planoCodigo: "SEM" }, PARAMS, PLANOS);
  assert.equal(r.plano?.codigo, "SEM");
  assert.ok(Math.abs(r.descontoPercentual - 0.15) < 1e-9);
  assert.ok(Math.abs(r.economiaMensal - r.valorEnergia * 0.15) < 0.01);
});

test("auto sugere o maior desconto (com fidelidade)", () => {
  const r = calcularEconomia({ modo: "kwh", entrada: 300 }, PARAMS, PLANOS);
  assert.equal(r.plano?.codigo, "FID");
  assert.ok(Math.abs(r.descontoPercentual - 0.2) < 1e-9);
});

test("entrada em R$ estima o consumo (gross-up e CIP)", () => {
  const tarifa = comTributos(PARAMS).tarifa;
  const contaEnergia = 500 * tarifa + 12; // conta de hoje para 500 kWh
  const r = calcularEconomia({ modo: "reais", entrada: contaEnergia, planoCodigo: "FID" }, PARAMS, PLANOS);
  assert.ok(Math.abs(r.consumoKwh - 500) < 1, `consumo=${r.consumoKwh}`);
});

test("consumo zero é inválido", () => {
  const r = calcularEconomia({ modo: "kwh", entrada: 0 }, PARAMS, PLANOS);
  assert.equal(r.ok, false);
  assert.equal(r.motivo, "consumo_invalido");
});

test("sem plano cadastrado → sem_plano", () => {
  const r = calcularEconomia({ modo: "kwh", entrada: 500 }, PARAMS, []);
  assert.equal(r.ok, false);
  assert.equal(r.motivo, "sem_plano");
});

test("qualquer consumo positivo é livre (sem mínimo)", () => {
  const r = calcularEconomia({ modo: "kwh", entrada: 30, planoCodigo: "FID" }, PARAMS, PLANOS);
  assert.equal(r.ok, true);
  assert.ok(r.economiaMensal > 0);
});

test("escolherPlano respeita o código e ignora inativos", () => {
  assert.equal(escolherPlano(PLANOS, "SEM")?.codigo, "SEM");
  const comInativo: PlanoDesconto[] = [...PLANOS, { codigo: "X", nome: "X", desconto_percentual: 99, fidelidade: false, ativo: false }];
  assert.equal(escolherPlano(comInativo)?.codigo, "FID"); // X inativo é ignorado no auto
});

test("faixa de economia arredonda para baixo (simulador público)", () => {
  assert.deepEqual(faixaEconomia(143.8, 20), { min: 140, max: 160 });
  assert.deepEqual(faixaEconomia(0, 20), { min: 0, max: 20 });
});

test("validação de planos: desconto fora de 0–100 é ERRO", () => {
  const v = validarPlanos([{ codigo: "A", nome: "A", desconto_percentual: 120, fidelidade: false }]);
  assert.equal(v.ok, false);
  assert.equal(v.problemas.some((p) => p.nivel === "erro"), true);
});

test("validação de planos: os dois planos padrão são válidos", () => {
  const v = validarPlanos(PLANOS);
  assert.equal(v.ok, true);
});
