import { test } from "node:test";
import assert from "node:assert/strict";
import {
  servidorSungrow,
  urlAutorizacao,
  interpretarToken,
  erroDaResposta,
  erroDeAutorizacao,
  paraKwh,
  paraW,
  interpretarTempoReal,
  interpretarUsinas,
  statusUsina,
  interpretarCurva,
  carimboRecife,
  janelasDoDia,
  geracaoDoMes,
} from "./sungrow";

test("servidor: padrão international e apelidos", () => {
  assert.equal(servidorSungrow(undefined).api, "https://gateway.isolarcloud.com.hk");
  assert.equal(servidorSungrow("EU").nome, "europe");
  assert.equal(servidorSungrow("qualquer").nome, "international");
});

test("url de autorização: state antes do # e retorno codificado", () => {
  const url = urlAutorizacao(servidorSungrow("international"), "1234", "https://lorenergia.com.br/api/sungrow/callback", "abc");
  assert.equal(
    url,
    "https://web3.isolarcloud.com.hk/?state=abc#/authorized-app?cloudId=2&applicationId=1234&redirectUrl=https://lorenergia.com.br/api/sungrow/callback"
  );
  // Igual ao link do portal, exceto pelo state.
  assert.ok(url.endsWith("#/authorized-app?cloudId=2&applicationId=1234&redirectUrl=https://lorenergia.com.br/api/sungrow/callback"));
  assert.match(urlAutorizacao(servidorSungrow("international"), "1", "https://x.com/cb?a=1&b=2", "s"), /redirectUrl=https%3A%2F%2Fx\.com%2Fcb%3Fa%3D1%26b%3D2$/);
});

test("token: no topo ou em result_data, com folga na validade", () => {
  const agora = Date.parse("2026-11-22T12:00:00Z");
  const t = interpretarToken({ access_token: "a", refresh_token: "r", expires_in: 3600 }, agora)!;
  assert.equal(t.access_token, "a");
  assert.equal(t.refresh_token, "r");
  assert.equal(t.expira_em, "2026-11-22T12:59:00.000Z");
  assert.equal(interpretarToken({ result_code: "1", result_data: { access_token: "b" } }, agora)!.access_token, "b");
  assert.equal(interpretarToken({ result_code: "E900", result_msg: "erro" }, agora), null);
});

test("erro da resposta", () => {
  assert.equal(erroDaResposta({ result_code: "1", result_data: {} }), null);
  assert.match(erroDaResposta({ result_code: "E00003", result_msg: "er_token_login_invalid" })!, /er_token_login_invalid/);
  assert.equal(erroDeAutorizacao("E00003 · er_token_login_invalid"), true);
  assert.equal(erroDeAutorizacao("server busy"), false);
});

test("unidades de energia e potência", () => {
  assert.equal(paraKwh("12500", "Wh"), 12.5);
  assert.equal(paraKwh("12.5", "kWh"), 12.5);
  assert.equal(paraKwh(2, "MWh"), 2000);
  assert.equal(paraKwh("--"), null);
  assert.equal(paraW("3.2", "kW"), 3200);
  assert.equal(paraW(800), 800);
});

test("tempo real: lê pontos com unidades do point_dict", () => {
  const r = interpretarTempoReal({
    device_point_list: [
      { ps_id: 5512, p83033: "4210", p83022: "18300", p83024: "12.3" },
      { device_point: { ps_id: "77", p83067: "1.5", p83009: "900" } },
    ],
    point_dict: [
      { point_id: 83024, point_unit: "MWh" },
      { point_id: "83067", point_unit: "kW" },
    ],
  });
  assert.deepEqual(r["5512"], { potenciaW: 4210, hojeKwh: 18.3, totalKwh: 12300 });
  assert.deepEqual(r["77"], { potenciaW: 1500, hojeKwh: 0.9, totalKwh: null });
});

test("lista de usinas", () => {
  const u = interpretarUsinas({
    pageList: [
      { ps_id: 1, ps_name: "Prédio", total_capcity: { value: "75.6", unit: "kWp" }, online_status: 1, ps_fault_status: 4 },
      { ps_id: 2, online_status: 0, ps_fault_status: 1 },
    ],
  });
  assert.deepEqual(u[0], { psId: "1", nome: "Prédio", capacidadeKwp: 75.6, online: true, falha: null });
  assert.equal(u[1].nome, "Usina 2");
  assert.equal(u[1].online, false);
  assert.equal(u[1].falha, "falha");
});

test("status da usina", () => {
  const agora = Date.parse("2026-11-22T15:00:00Z");
  const lido = "2026-11-22T14:58:00Z";
  assert.equal(statusUsina({ online: true, falha: null, potenciaW: 5000, lidoEm: lido }, agora).codigo, "gerando");
  assert.equal(statusUsina({ online: true, falha: null, potenciaW: 0, lidoEm: lido }, agora).codigo, "sem_sol");
  assert.equal(statusUsina({ online: false, falha: null, potenciaW: 0, lidoEm: lido }, agora).codigo, "offline");
  assert.equal(statusUsina({ online: true, falha: "falha", potenciaW: 0, lidoEm: lido }, agora).codigo, "falha");
  assert.equal(statusUsina({ online: true, falha: null, potenciaW: 0, lidoEm: "2026-11-22T10:00:00Z" }, agora).codigo, "desatualizada");
});

test("curva do dia", () => {
  const c = interpretarCurva(
    { "9": [{ time_stamp: "20261122091500", p83033: "3000" }, { time_stamp: "20261122090000", p83033: "2500" }, { time_stamp: "20261122091500", p83033: "3000" }] },
    "9"
  );
  assert.deepEqual(c, [{ hora: "09:00", kw: 2.5 }, { hora: "09:15", kw: 3 }]);
  assert.deepEqual(interpretarCurva({}, "9"), []);
});

test("carimbo e janelas no fuso do Recife", () => {
  const agora = new Date("2026-11-22T14:20:00Z"); // 11:20 no Recife
  assert.equal(carimboRecife(agora), "20261122112000");
  assert.deepEqual(janelasDoDia(agora), [
    { inicio: "20261122050000", fim: "20261122080000" },
    { inicio: "20261122080000", fim: "20261122110000" },
    { inicio: "20261122110000", fim: "20261122112000" },
  ]);
  assert.deepEqual(janelasDoDia(new Date("2026-11-22T06:00:00Z")), []); // 3h no Recife
});

test("geração do mês", () => {
  const dias = [
    { dia: "2026-11-20", geracao_kwh: 300 },
    { dia: "2026-11-21", geracao_kwh: "310.5" },
    { dia: "2026-10-31", geracao_kwh: 999 },
  ];
  assert.deepEqual(geracaoDoMes(dias, "2026-11-22"), { totalKwh: 610.5, desde: "2026-11-20" });
  assert.deepEqual(geracaoDoMes([{ dia: "2026-11-01", geracao_kwh: 10 }], "2026-11-22"), { totalKwh: 10, desde: null });
});
