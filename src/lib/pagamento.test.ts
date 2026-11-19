import { test } from "node:test";
import assert from "node:assert/strict";
import { resumoPagamento } from "./pagamento";

const taxas = { multa: 2, juros: 1 };
const fatura = { valor_liquido: 476.65, vencimento: "2026-11-10" };

test("pagamento em dia: total é o valor da fatura, sem encargos", () => {
  const r = resumoPagamento({ ...fatura, valor_pago: 476.65 }, "2026-11-08", taxas);
  assert.equal(r.total, 476.65);
  assert.equal(r.encargos, 0);
  assert.equal(r.detalhado, false);
});

test("pagamento atrasado com valor gravado: separa multa (2%) e juros (1% ao mês pro rata)", () => {
  // 10 dias de atraso: multa 9,53; juros 476,65 × 1% × 10/30 = 1,59
  const r = resumoPagamento({ ...fatura, valor_pago: 487.77 }, "2026-11-20", taxas);
  assert.equal(r.diasAtraso, 10);
  assert.equal(r.multa, 9.53);
  assert.equal(r.juros, 1.59);
  assert.equal(r.encargos, 11.12);
  assert.equal(r.total, 487.77);
  assert.equal(r.detalhado, true);
});

test("valor gravado diferente do cálculo (ex.: juros perdoados em parte): mostra só o total de encargos", () => {
  const r = resumoPagamento({ ...fatura, valor_pago: 480 }, "2026-11-20", taxas);
  assert.equal(r.total, 480);
  assert.equal(r.encargos, 3.35);
  assert.equal(r.detalhado, false);
});

test("fatura antiga sem valor gravado: calcula pela data do pagamento; sem data, vale o valor da fatura", () => {
  const r = resumoPagamento(fatura, "2026-11-20", taxas);
  assert.equal(r.total, 487.77);
  assert.equal(r.detalhado, true);
  const semData = resumoPagamento(fatura, null, taxas);
  assert.equal(semData.total, 476.65);
  assert.equal(semData.encargos, 0);
});
