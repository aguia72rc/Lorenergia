import { test } from "node:test";
import assert from "node:assert/strict";
import { interpretarFaturaNeoenergia, numeroBr } from "./neoenergia";

// Texto de uma fatura real da Neoenergia PE (out/2026), como sai do PDF — com os
// dados pessoais (nome, CPF, endereço, UC, nota fiscal, código de barras) trocados por fictícios.
const FATURA = `Consumo-TUSD kWh 0,00 0,56913015 0,00 0,00 0,00 00,00 0,00 0,53521000
Consumo-TE kWh 0,00 0,28035942 0,00 0,00 0,00 00,00 0,00 0,26365000
TUSD GDII com trib. 82,48 4,91
ICMS-CDE NF000000000 5,98
www.neoenergia.com|Ligue grátis 116
DANFE - DOCUMENTO AUXILIAR DA NOTA FISCAL DE ENERGIA ELÉTRICA ELETRÔNICA 2ª VIA
COMPANHIA ENERGÉTICA DE PERNAMBUCO
AV.JOÃO DE BARROS, 111, BOA VISTA, RECIFE, PERNAMBUCO CEP 50050-902
CLASSIFICAÇÃO: B1 RESIDENCIAL -RESIDENCIAL TIPO DE FORNECIMENTO: Conv. Monômia - Monofásico
NOME DO CLIENTE:
FULANO DE TAL DA SILVA
CPF: 000.0**.***-**
ENDEREÇO:
RUA DE EXEMPLO 100 --A
BAIRRO/RECIFE
50000-000 RECIFE PE
NÚMERO DA UNIDADE CONSUMIDORA
0.000.000.000-00
DATAS DE LEITURAS LEITURA ANTERIOR 10/09/2026 LEITURA ATUAL 09/10/2026 N° DE DIAS 29 PRÓXIMA LEITURA 09/11/2026
NOTA FISCAL N° 000000000 - SÉRIE 000 / DATA DE EMISSÃO: 16/10/2026
REF:MÊS/ANO
10/2026 VENCIMENTO
23/11/2026
TOTAL A PAGAR R$
88,46
TRIBUTO BASE DE ALÍQUOTA VALOR (R$)
CÁLCULO (R$) (%)
PIS 82,48 1,06 0,87
COFINS 82,48 4,90 4,04
ICMS 0,00 0,00
CONSUMO / kWh
CONSUMO FATURADO N°DIAS FAT
OUT26 0 29
SET26 0 29
AGO26 241 21
MEDIDOR GRANDEZAS POSTOS LEITURA LEITURA CONST. CONSUMO
HORÁRIOS ANTERIOR ATUAL MEDIDOR kWh
1234567890 Energia Ativa Único 608,00 1.104,00 1,00000 0,00
RESERVADO AO FISCO
INFORMAÇÕES IMPORTANTES
Na data da leitura a bandeira em vigor é a Verde. Mais informações em www.aneel.gov.br.
No valor do consumo faturado está incluído o ajuste na(s) função(ões) CAT de - 496 kWh
10/2026 CÓDIGO DÉBITO EM CONTA 0000000000 VENCIMENTO 23/11/2026 TOTAL A PAGAR R$ 88,46
TOTAL 88,46
ITENS DA FATURA UNID. QUANT. PREÇO UNIT. VALOR PIS/ BASE CALC. ALÍQUOTA ICMS (R$) TARIFA
COM TRIB.(R$) (R$) COFINS(R$) ICMS(R$) ICMS(%) UNIT(R$)`;

test("números no formato brasileiro", () => {
  assert.equal(numeroBr("1.104,00"), 1104);
  assert.equal(numeroBr("0,56913015"), 0.56913015);
  assert.equal(numeroBr("-496,5"), -496.5);
  assert.equal(numeroBr("abc"), null);
  assert.equal(numeroBr(""), null);
  assert.equal(numeroBr(undefined), null);
});

test("fatura Neoenergia: lê leituras, consumo, Fio B, ICMS-CDE, mês e vencimento", () => {
  const r = interpretarFaturaNeoenergia(FATURA);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  const f = r.fatura;
  assert.equal(f.referencia, "2026-10");
  assert.equal(f.vencimento, "2026-11-23");
  assert.equal(f.totalPagar, 88.46);
  assert.equal(f.leituraAnterior, 608);
  assert.equal(f.leituraAtual, 1104);
  assert.equal(f.constanteMedidor, 1);
  assert.equal(f.consumoMedidoKwh, 496); // 1.104 − 608
  assert.equal(f.consumoFaturadoKwh, 0); // tudo compensado pelos créditos
  assert.equal(f.dataLeituraAnterior, "2026-09-10");
  assert.equal(f.dataLeituraAtual, "2026-10-09");
  assert.equal(f.tusdGd2, 82.48); // e não 4,91 (PIS/COFINS da mesma linha)
  assert.equal(f.icmsCde, 5.98);
  assert.equal(f.tarifaTusd, 0.56913015);
  assert.equal(f.tarifaTe, 0.28035942);
  assert.equal(f.bandeira, "Verde");
  assert.equal(f.nomeCliente, "FULANO DE TAL DA SILVA");
  assert.equal(f.unidadeConsumidora, "0.000.000.000-00");
  assert.deepEqual(f.avisos, []);
  // o Fio B mais o ICMS-CDE fecham o total da conta
  assert.equal(Math.round((f.tusdGd2! + f.icmsCde!) * 100), Math.round(f.totalPagar! * 100));
});

test("fatura Neoenergia: constante do medidor multiplica o consumo; sem Fio B gera aviso", () => {
  const t = FATURA.replace("608,00 1.104,00 1,00000 0,00", "608,00 1.104,00 40,00000 0,00").replace(/^TUSD GDII[^\n]*\n/m, "");
  const r = interpretarFaturaNeoenergia(t);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.fatura.consumoMedidoKwh, 19840); // 496 × 40
  assert.equal(r.fatura.tusdGd2, null);
  assert.ok(r.fatura.avisos.some((a) => /TUSD GD II/.test(a)));
});

test("fatura Neoenergia: várias linhas de Fio B são somadas, com aviso", () => {
  const t = FATURA.replace("TUSD GDII com trib. 82,48 4,91", "TUSD GDII com trib. 82,48 4,91\nTUSD GD II mês anterior 10,02 0,60");
  const r = interpretarFaturaNeoenergia(t);
  assert.equal(r.ok && r.fatura.tusdGd2, 92.5);
  assert.ok(r.ok && r.fatura.avisos.some((a) => /2 linhas/.test(a)));
});

test("fatura Neoenergia: recusa arquivo que não é fatura ou não tem texto", () => {
  assert.equal(interpretarFaturaNeoenergia("").ok, false);
  assert.equal(interpretarFaturaNeoenergia("   ").ok, false);
  const outro = interpretarFaturaNeoenergia("Extrato bancário do mês de outubro. Saldo anterior 100,00. Saldo atual 200,00. Total a pagar zero.");
  assert.equal(outro.ok, false);
  assert.match(outro.ok ? "" : outro.erro, /não parece ser uma fatura da Neoenergia/);
});
