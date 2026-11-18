import { test } from "node:test";
import assert from "node:assert/strict";
import { classificarLembrete, diasAteVencimento, prazoPorExtenso, montarLembrete } from "./lembretes";
import { dataNoRecife } from "./format";

test("lembrete: dias até o vencimento, inclusive virando mês e ano", () => {
  assert.equal(diasAteVencimento("2026-11-10", "2026-11-10"), 0);
  assert.equal(diasAteVencimento("2026-11-13", "2026-11-10"), 3);
  assert.equal(diasAteVencimento("2026-11-01", "2026-11-10"), -9);
  assert.equal(diasAteVencimento("2027-01-02", "2026-12-30"), 3);
});

test("lembrete: classifica vencida, vence hoje, a vencer (janela) ou nada", () => {
  const hoje = "2026-11-10";
  assert.equal(classificarLembrete("2026-11-09", hoje), "vencida");
  assert.equal(classificarLembrete("2026-11-10", hoje), "vence_hoje");
  assert.equal(classificarLembrete("2026-11-13", hoje), "a_vencer");
  assert.equal(classificarLembrete("2026-11-14", hoje), null); // fora da janela de 3 dias
  assert.equal(classificarLembrete("2026-11-14", hoje, 7), "a_vencer");
  assert.equal(classificarLembrete(null, hoje), null);
  assert.equal(classificarLembrete("", hoje), null);
  assert.equal(classificarLembrete("data-ruim", hoje), null);
});

test("lembrete: prazo por extenso", () => {
  assert.equal(prazoPorExtenso(0), "vence hoje");
  assert.equal(prazoPorExtenso(1), "vence amanhã");
  assert.equal(prazoPorExtenso(3), "vence em 3 dias");
  assert.equal(prazoPorExtenso(-1), "venceu ontem");
  assert.equal(prazoPorExtenso(-5), "venceu há 5 dias");
});

test("lembrete de vencimento: diz quantos dias faltam, o valor, o link e que é automática", () => {
  const base = { nome: "Maria da Silva", referencia: "outubro de 2026", vencimento: "10/11/2026", valor: "R$ 476,65", link: "https://lorenergia.com.br/fatura/abc" };
  const antes = montarLembrete("a_vencer", { ...base, dias: 2 });
  assert.match(antes, /^Olá, Maria!/);
  assert.match(antes, /Lembrete de vencimento: faltam 2 dias para o vencimento da sua fatura da Lorenergia de outubro de 2026, no valor de R\$ 476,65 \(vence em 10\/11\/2026\)\./);
  assert.match(antes, /https:\/\/lorenergia\.com\.br\/fatura\/abc/);
  assert.match(antes, /Esta é uma mensagem automática\. Se o pagamento já foi efetuado, envie o comprovante e desconsidere esta mensagem\./);
  assert.doesNotMatch(antes, /multa|atraso/);
  assert.match(montarLembrete("a_vencer", { ...base, dias: 1 }), /falta 1 dia para o vencimento/);
  const hoje = montarLembrete("vence_hoje", { ...base, dias: 0 });
  assert.match(hoje, /Lembrete de vencimento: a sua fatura .* vence hoje \(10\/11\/2026\)\./);
  assert.match(hoje, /mensagem automática/);
});

test("lembrete de atraso: diz quantos dias de atraso, cita multa só se houver e pede o comprovante", () => {
  const base = { nome: "Maria da Silva", referencia: "outubro de 2026", vencimento: "10/11/2026", valor: "R$ 476,65", link: "https://lorenergia.com.br/fatura/abc" };
  const vencida = montarLembrete("vencida", { ...base, dias: -4, temEncargos: true });
  assert.match(vencida, /Lembrete de atraso: a sua fatura da Lorenergia de outubro de 2026 venceu em 10\/11\/2026 e está com 4 dias de atraso\./);
  assert.match(vencida, /atualizado, com multa e juros, é R\$ 476,65/);
  assert.match(vencida, /Esta é uma mensagem automática\. Se o pagamento já foi efetuado, envie o comprovante e desconsidere esta mensagem\./);
  const umDia = montarLembrete("vencida", { ...base, dias: -1 });
  assert.match(umDia, /está com 1 dia de atraso/);
  assert.doesNotMatch(umDia, /multa/);
});

test("data no fuso do Recife: 23h do Recife ainda é o mesmo dia (em UTC já seria o seguinte)", () => {
  assert.equal(dataNoRecife(new Date("2026-11-11T02:30:00Z")), "2026-11-10"); // 23h30 do dia 10 no Recife
  assert.equal(dataNoRecife(new Date("2026-11-11T03:00:00Z")), "2026-11-11"); // meia-noite no Recife
  assert.equal(dataNoRecife(new Date("2027-01-01T01:00:00Z")), "2026-12-31"); // virada de ano
});
