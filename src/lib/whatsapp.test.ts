import { test } from "node:test";
import assert from "node:assert/strict";
import { montarMensagem, textoBeneficio, MENSAGEM_PADRAO } from "./whatsapp";

const base = {
  clientes: { id: "c1", nome: "Maria da Silva", unidade: "Apto 1", telefone: "81999991234", email: null, cpf: null, endereco: null, cep: null, cidade_uf: null, numero_medidor: null, tipo_ligacao: null },
  referencia: "2026-10-01",
  consumo_kwh: 496,
  valor_liquido: 476.65,
  economia: 95.33,
  vencimento: "2026-11-20",
} as Parameters<typeof montarMensagem>[0];

test("aviso de fatura nova (padrão): disponível no app, com o desconto do mês", () => {
  const m = montarMensagem(base, { mensagem_whatsapp: "" }, "https://lorenergia.com.br/fatura/abc");
  assert.match(m, /^Olá, Maria! ☀️/);
  assert.match(m, /Sua fatura da Lorenergia de outubro de 2026 já está disponível no aplicativo\./);
  assert.match(m, /Com a energia solar, você economizou R\$\s95,33 neste mês\./);
  assert.match(m, /Valor: R\$\s476,65/);
  assert.match(m, /Vencimento: 20\/11\/2026/);
  assert.match(m, /pague por PIX: https:\/\/lorenergia\.com\.br\/fatura\/abc$/);
});

test("aviso de fatura nova: cashback vira frase de cashback; sem ganho, a linha some sem deixar buraco", () => {
  const cb = montarMensagem({ ...base, economia: 0, modalidade_beneficio: "cashback", cashback_valor: 40 }, null, "x");
  assert.match(cb, /acumulou R\$\s40,00 de cashback/);
  assert.doesNotMatch(cb, /economizou/);
  const semGanho = montarMensagem({ ...base, economia: 0 }, null, "x");
  assert.doesNotMatch(semGanho, /economizou|cashback/);
  assert.doesNotMatch(semGanho, /\n{3,}/);
  assert.equal(textoBeneficio({ ...base, economia: 0 }), "");
});

test("mensagem configurada pelo admin continua valendo, com as variáveis antigas e novas", () => {
  const m = montarMensagem(base, { mensagem_whatsapp: "Oi {nome} ({primeiro_nome}): {valor} até {vencimento}. {economia}\r\n{link}" }, "L");
  assert.equal(m, "Oi Maria da Silva (Maria): R$ 476,65 até 20/11/2026. R$ 95,33\nL");
  assert.ok(MENSAGEM_PADRAO.includes("{beneficio}"));
});
