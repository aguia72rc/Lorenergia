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
 *   - A mensalidade do plano NÃO entra no cálculo da conta/economia; fica só
 *     como informação de receita (uso interno do CRM).
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
  kwh: number;
  mensalidade: number;
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
  sobraKwh: number; // consumo compensável acima do plano

  // Linhas do "com a Lorenergia".
  taxaMinimaRede: number; // disponibilidade × tarifa
  consumoAcimaPlano: number; // sobra × tarifa
  usoRedeCompensado: number; // plano.kwh × fioB × percentual (Fio B)
  mensalidade: number; // plano.mensalidade — receita interna, FORA do cálculo

  // Totais.
  contaAtual: number; // hoje
  contaLorenergia: number; // conta que resta + mensalidade
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
 * Escolhe o plano: se `codigo` for informado (≠ "auto"), usa-o; senão sugere
 * o maior plano ativo cuja cota caiba no consumo compensável.
 */
export function escolherPlano(planos: PlanoCota[], compensavelKwh: number, codigo?: string): PlanoCota | null {
  const ativos = (planos ?? []).filter((p) => p.ativo !== false);
  if (codigo && codigo !== "auto") {
    return ativos.find((p) => p.codigo === codigo) ?? null;
  }
  const porKwh = [...ativos].sort((a, b) => Number(a.kwh) - Number(b.kwh));
  let escolhido: PlanoCota | null = null;
  for (const p of porKwh) {
    if (Number(p.kwh) <= compensavelKwh) escolhido = p;
  }
  return escolhido;
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
    plano: null, sobraKwh: 0,
    taxaMinimaRede: 0, consumoAcimaPlano: 0, usoRedeCompensado: 0, mensalidade: 0,
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
  const plano = escolherPlano(planos, compensavel, entrada.planoCodigo);

  if (!plano) {
    return {
      ok: false,
      motivo: "sem_margem",
      mensagem: `O consumo informado (${Math.round(consumo)} kWh) fica abaixo do menor plano depois do custo de disponibilidade.`,
      ...base,
      consumoKwh: consumo,
    };
  }

  const planoKwh = Number(plano.kwh) || 0;
  const planoMensalidade = Number(plano.mensalidade) || 0;
  const contaAtual = consumo * tarifa + cip;
  const taxaMinimaRede = disp * tarifa;
  const sobra = Math.max(0, compensavel - planoKwh);
  const consumoAcimaPlano = sobra * tarifa;
  const usoRedeCompensado = planoKwh * fioB * pct;
  // A mensalidade do plano NÃO entra na conta (fica só como receita interna).
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
    sobraKwh: sobra,
    taxaMinimaRede,
    consumoAcimaPlano,
    usoRedeCompensado,
    mensalidade: planoMensalidade,
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
