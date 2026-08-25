/**
 * Simulador de economia — MÓDULO ÚNICO de cálculo.
 *
 * `calcularEconomia` é a ÚNICA fonte da lógica: o simulador público e o
 * simulador interno (CRM) importam esta mesma função. Nada de tarifa, Fio B
 * ou preço de plano aqui dentro — tudo chega como parâmetro, vindo do banco
 * (tabelas parametros_energia, fio_b_cronograma, planos_cota).
 *
 * Modelo (idêntico ao protótipo aprovado):
 *   - As premissas do banco vêm SEM tributos; aqui fazemos o "gross-up"
 *     dividindo por (1 − ICMS − PIS/COFINS) para chegar ao R$/kWh cheio.
 *   - A conta de hoje = consumo × tarifa + CIP.
 *   - Com a Lorenergia o cliente ainda paga à distribuidora: a taxa mínima
 *     da rede (disponibilidade), o consumo acima do plano, o Fio B sobre a
 *     energia compensada e a CIP.
 *   - Economia = conta de hoje − conta que resta na distribuidora.
 *   - A Lorenergia NÃO cobra mensalidade: o plano define apenas a faixa de
 *     consumo e a energia compensada (piso da faixa).
 */

// ----- Formatos das linhas do banco (só o que o cálculo usa) -----
export interface ParametrosEnergia {
  tarifa_tusd_te: number; // R$/kWh, SEM tributos
  icms: number; // fração (0.205)
  pis_cofins: number; // fração (0.0465)
  tusd_fio_b: number; // R$/kWh, SEM tributos
  cip: number; // R$/mês
  disp_monofasica: number; // kWh
  disp_bifasica: number; // kWh
  disp_trifasica: number; // kWh
}

export interface PlanoCota {
  codigo: string;
  kwh_min: number; // piso da faixa de consumo (kWh) — é o que se compensa
  kwh_max: number; // teto da faixa de consumo (kWh)
  ativo?: boolean;
}

export interface FioBItem {
  ano: number;
  percentual: number; // fração (0.60 = 60%)
}

export type TipoLigacao = "monofasica" | "bifasica" | "trifasica";

export interface EntradaSimulacao {
  modo: "kwh" | "reais";
  entrada: number; // valor digitado (kWh ou R$)
  tipoLigacao: TipoLigacao;
  ano: number;
  planoCodigo?: string; // undefined/"auto" = sugerir automaticamente
}

export interface ResultadoSimulacao {
  ok: boolean;
  motivo?: "consumo_invalido" | "sem_margem";
  mensagem?: string;

  // Premissas efetivas (já com tributos embutidos).
  tarifa: number;
  fioB: number;
  cip: number;

  // Entrada normalizada.
  consumoKwh: number;
  disponibilidadeKwh: number;
  fioBPercentual: number;

  // Plano usado (ou null quando não há margem).
  plano: PlanoCota | null;
  energiaCompensadaKwh: number; // energia efetivamente compensada (piso da faixa, limitado ao compensável)
  sobraKwh: number; // consumo compensável acima do que foi compensado

  // Linhas do "com a Lorenergia".
  taxaMinimaRede: number; // disponibilidade × tarifa
  consumoAcimaPlano: number; // sobra × tarifa
  usoRedeCompensado: number; // energia compensada × fioB × percentual (Fio B)

  // Totais.
  contaAtual: number; // hoje
  contaLorenergia: number; // conta que resta na distribuidora
  economiaMensal: number;
  economiaPercentual: number; // fração (0.18 = 18%)

  // Composição da barra (percentuais que somam ~100).
  barra: { neo: number; lore: number; corte: number };
}

/** Aplica os tributos (gross-up) às premissas sem tributos. */
export function comTributos(p: ParametrosEnergia): { tarifa: number; fioB: number; cip: number } {
  const div = 1 - (Number(p.icms) || 0) - (Number(p.pis_cofins) || 0);
  const fator = div > 0 ? 1 / div : 0;
  return {
    tarifa: (Number(p.tarifa_tusd_te) || 0) * fator,
    fioB: (Number(p.tusd_fio_b) || 0) * fator,
    cip: Number(p.cip) || 0,
  };
}

/** Disponibilidade (kWh) pelo tipo de ligação. */
export function disponibilidadeDe(p: ParametrosEnergia, tipo: TipoLigacao): number {
  if (tipo === "trifasica") return Number(p.disp_trifasica) || 0;
  if (tipo === "bifasica") return Number(p.disp_bifasica) || 0;
  return Number(p.disp_monofasica) || 0;
}

/**
 * Percentual do Fio B para o ano pedido: usa o maior ano cadastrado que seja
 * ≤ ano (ex.: "2029 em diante"). Se o ano for menor que todos, usa o menor.
 */
export function percentualFioB(cronograma: FioBItem[], ano: number): number {
  if (!cronograma || cronograma.length === 0) return 0;
  const ordenado = [...cronograma].sort((a, b) => a.ano - b.ano);
  let escolhido = ordenado[0];
  for (const item of ordenado) {
    if (item.ano <= ano) escolhido = item;
  }
  return Number(escolhido.percentual) || 0;
}

/**
 * Escolhe o plano (faixa) pelo CONSUMO TOTAL: usa a faixa em que o consumo
 * cai (kwh_min ≤ consumo ≤ kwh_max). Acima da maior faixa, usa a maior;
 * abaixo da menor, não há plano (null). Se `codigo` for informado, usa-o.
 */
export function escolherPlano(planos: PlanoCota[], consumoTotalKwh: number, codigo?: string): PlanoCota | null {
  const ativos = (planos ?? []).filter((p) => p.ativo !== false);
  if (codigo && codigo !== "auto") {
    return ativos.find((p) => p.codigo === codigo) ?? null;
  }
  const porFaixa = [...ativos].sort((a, b) => Number(a.kwh_min) - Number(b.kwh_min));
  if (porFaixa.length === 0) return null;
  // Faixa que contém o consumo.
  const contida = porFaixa.find((p) => consumoTotalKwh >= Number(p.kwh_min) && consumoTotalKwh <= Number(p.kwh_max));
  if (contida) return contida;
  // Acima da maior faixa → usa a maior; abaixo da menor → sem plano.
  const maior = porFaixa[porFaixa.length - 1];
  if (consumoTotalKwh > Number(maior.kwh_max)) return maior;
  return null;
}

/**
 * CÁLCULO PRINCIPAL — único ponto de verdade da economia.
 * Recebe as premissas/planos do banco e a entrada do usuário; devolve o
 * detalhamento completo. As telas decidem o que exibir (o público arredonda
 * a economia para baixo; o CRM mostra tudo).
 */
export function calcularEconomia(
  entrada: EntradaSimulacao,
  parametros: ParametrosEnergia,
  planos: PlanoCota[],
  cronograma: FioBItem[]
): ResultadoSimulacao {
  const { tarifa, fioB, cip } = comTributos(parametros);
  const disp = disponibilidadeDe(parametros, entrada.tipoLigacao);
  const pct = percentualFioB(cronograma, entrada.ano);

  const base: Omit<ResultadoSimulacao, "ok" | "motivo" | "mensagem"> = {
    tarifa, fioB, cip,
    consumoKwh: 0, disponibilidadeKwh: disp, fioBPercentual: pct,
    plano: null, energiaCompensadaKwh: 0, sobraKwh: 0,
    taxaMinimaRede: 0, consumoAcimaPlano: 0, usoRedeCompensado: 0,
    contaAtual: 0, contaLorenergia: 0, economiaMensal: 0, economiaPercentual: 0,
    barra: { neo: 0, lore: 0, corte: 0 },
  };

  // Consumo em kWh: direto, ou estimado a partir do valor em R$.
  const valor = Number(entrada.entrada) || 0;
  const consumo = entrada.modo === "kwh" ? valor : tarifa > 0 ? Math.max(0, (valor - cip) / tarifa) : 0;

  if (consumo <= 0) {
    return { ok: false, motivo: "consumo_invalido", mensagem: "Informe o consumo para ver a simulação.", ...base };
  }

  const compensavel = Math.max(0, consumo - disp);
  // Plano escolhido pela faixa do CONSUMO TOTAL.
  const plano = escolherPlano(planos, consumo, entrada.planoCodigo);

  if (!plano) {
    return {
      ok: false,
      motivo: "sem_margem",
      mensagem: `O consumo informado (${Math.round(consumo)} kWh) fica abaixo da menor faixa de plano disponível.`,
      ...base,
      consumoKwh: consumo,
    };
  }

  const contaAtual = consumo * tarifa + cip;
  const taxaMinimaRede = disp * tarifa;
  // Compensa-se o PISO da faixa, nunca mais que a energia compensável disponível.
  const energiaCompensada = Math.min(Number(plano.kwh_min) || 0, compensavel);
  const sobra = Math.max(0, compensavel - energiaCompensada);
  const consumoAcimaPlano = sobra * tarifa;
  const usoRedeCompensado = energiaCompensada * fioB * pct;
  // A Lorenergia não cobra mensalidade: a conta é só o que resta na distribuidora.
  const contaResta = taxaMinimaRede + consumoAcimaPlano + usoRedeCompensado + cip;
  const contaLorenergia = contaResta;
  const economiaMensal = contaAtual - contaLorenergia;
  const economiaPercentual = contaAtual > 0 ? economiaMensal / contaAtual : 0;

  const neo = contaAtual > 0 ? Math.max(0, (contaResta / contaAtual) * 100) : 0;
  const lore = 0; // sem mensalidade no cálculo, não há fatia de "mensalidade" na barra
  const corte = Math.max(0, 100 - neo - lore);

  return {
    ok: true,
    ...base,
    consumoKwh: consumo,
    plano,
    energiaCompensadaKwh: energiaCompensada,
    sobraKwh: sobra,
    taxaMinimaRede,
    consumoAcimaPlano,
    usoRedeCompensado,
    contaAtual,
    contaLorenergia,
    economiaMensal,
    economiaPercentual,
    barra: { neo, lore, corte },
  };
}

/**
 * Faixa de economia arredondada PARA BAIXO — usada no simulador PÚBLICO, que
 * mostra apenas uma faixa (nunca o valor cheio nem o detalhamento).
 * Ex.: economia de R$ 143,80 → faixa "R$ 120 a R$ 140" (passo padrão 20).
 */
export function faixaEconomia(economiaMensal: number, passo = 20): { min: number; max: number } {
  const v = Math.max(0, Number(economiaMensal) || 0);
  const min = Math.floor(v / passo) * passo;
  return { min, max: min + passo };
}

// ---------------------------------------------------------------------
// Validação de NÃO LINEARIDADE dos planos (tela de planos do admin)
// ---------------------------------------------------------------------
export interface PrecoPlano {
  codigo: string;
  kwhMin: number;
  kwhMax: number;
}
export interface ProblemaPlano {
  codigo: string;
  nivel: "erro" | "aviso";
  mensagem: string;
}
export interface ValidacaoPlanos {
  ok: boolean; // sem ERROS (avisos não bloqueiam)
  precos: PrecoPlano[];
  problemas: ProblemaPlano[];
}

/**
 * Verifica se as faixas de plano são coerentes:
 *  - cada faixa deve ter kwh_max > kwh_min (erro);
 *  - as faixas devem crescer sem se sobrepor (erro se o piso de uma faixa cair
 *    dentro da anterior);
 *  - aviso quando há BURACO entre uma faixa e a seguinte (consumos nesse
 *    intervalo ficam sem plano).
 * Considera apenas planos ativos, ordenados pelo piso.
 */
export function validarPlanos(planos: PlanoCota[]): ValidacaoPlanos {
  const precos: PrecoPlano[] = (planos ?? [])
    .filter((p) => p.ativo !== false)
    .map((p) => ({ codigo: p.codigo, kwhMin: Number(p.kwh_min) || 0, kwhMax: Number(p.kwh_max) || 0 }))
    .sort((a, b) => a.kwhMin - b.kwhMin);

  const problemas: ProblemaPlano[] = [];
  for (const p of precos) {
    if (p.kwhMin <= 0) problemas.push({ codigo: p.codigo, nivel: "erro", mensagem: `Plano ${p.codigo}: informe o piso da faixa (kWh, maior que zero).` });
    if (p.kwhMax <= p.kwhMin) problemas.push({ codigo: p.codigo, nivel: "erro", mensagem: `Plano ${p.codigo}: o teto (${p.kwhMax}) deve ser maior que o piso (${p.kwhMin}).` });
  }

  for (let i = 1; i < precos.length; i++) {
    const ant = precos[i - 1];
    const cur = precos[i];
    if (cur.kwhMin <= ant.kwhMax - 1e-9) {
      problemas.push({ codigo: cur.codigo, nivel: "erro", mensagem: `Faixa do plano ${cur.codigo} (a partir de ${cur.kwhMin}) sobrepõe a do ${ant.codigo} (até ${ant.kwhMax}).` });
    } else if (cur.kwhMin > ant.kwhMax + 1e-9) {
      problemas.push({ codigo: cur.codigo, nivel: "aviso", mensagem: `Há um buraco entre o plano ${ant.codigo} (até ${ant.kwhMax}) e o ${cur.codigo} (a partir de ${cur.kwhMin}) — consumos nesse intervalo ficam sem plano.` });
    }
  }

  return { ok: !problemas.some((p) => p.nivel === "erro"), precos, problemas };
}
