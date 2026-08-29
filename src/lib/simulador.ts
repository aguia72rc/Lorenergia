/**
 * Simulador de economia — MÓDULO ÚNICO de cálculo (rateio de créditos).
 *
 * Modelo de negócio: RATEIO DE CRÉDITOS de energia solar (não é instalação).
 * O cliente recebe um DESCONTO sobre o valor da energia (kWh) que consome:
 *   - Com fidelidade (contrato): 20%
 *   - Sem fidelidade: 15%
 * Os percentuais e a tarifa vêm do banco — nada chumbado no código.
 *
 *   valor da energia = consumo × tarifa (com tributos)
 *   economia         = valor da energia × desconto%
 *   conta de hoje    = valor da energia + iluminação pública (CIP)
 *   conta Lorenergia = conta de hoje − economia
 *
 * A iluminação pública (municipal) NÃO entra no desconto.
 */

// ----- Formatos das linhas do banco (só o que o cálculo usa) -----
export interface ParametrosEnergia {
  tarifa_tusd_te: number; // R$/kWh, SEM tributos (TUSD + TE)
  icms: number; // fração (0.205)
  pis_cofins: number; // fração (0.0465)
  cip: number; // iluminação pública, R$/mês
}

export interface PlanoDesconto {
  codigo: string;
  nome: string;
  desconto_percentual: number; // 20, 15, ...
  fidelidade: boolean;
  ativo?: boolean;
}

export interface EntradaSimulacao {
  modo: "kwh" | "reais";
  entrada: number; // valor digitado (kWh ou R$)
  planoCodigo?: string; // undefined/"auto" = melhor desconto ativo
}

export interface ResultadoSimulacao {
  ok: boolean;
  motivo?: "consumo_invalido" | "sem_plano";
  mensagem?: string;

  // Premissas efetivas.
  tarifa: number; // R$/kWh já com tributos
  cip: number;

  // Entrada normalizada + plano.
  consumoKwh: number;
  plano: PlanoDesconto | null;
  descontoPercentual: number; // fração (0.20 = 20%)

  // Composição.
  valorEnergia: number; // consumo × tarifa
  economiaMensal: number; // valorEnergia × desconto
  contaAtual: number; // valorEnergia + CIP
  contaLorenergia: number; // contaAtual − economia
  economiaPercentual: number; // fração da conta
}

/** Aplica os tributos (gross-up) à tarifa sem tributos. */
export function comTributos(p: ParametrosEnergia): { tarifa: number; cip: number } {
  const div = 1 - (Number(p.icms) || 0) - (Number(p.pis_cofins) || 0);
  const fator = div > 0 ? 1 / div : 0;
  return {
    tarifa: (Number(p.tarifa_tusd_te) || 0) * fator,
    cip: Number(p.cip) || 0,
  };
}

/**
 * Escolhe o plano de desconto: se `codigo` for informado (≠ "auto"), usa-o;
 * senão sugere o de MAIOR desconto ativo (com fidelidade).
 */
export function escolherPlano(planos: PlanoDesconto[], codigo?: string): PlanoDesconto | null {
  const ativos = (planos ?? []).filter((p) => p.ativo !== false);
  if (ativos.length === 0) return null;
  if (codigo && codigo !== "auto") {
    return ativos.find((p) => p.codigo === codigo) ?? null;
  }
  return [...ativos].sort((a, b) => Number(b.desconto_percentual) - Number(a.desconto_percentual))[0];
}

/**
 * CÁLCULO PRINCIPAL — único ponto de verdade da economia.
 * Recebe a tarifa/planos do banco e a entrada do usuário; devolve o
 * detalhamento. As telas decidem o que exibir (o público arredonda a
 * economia para baixo; o CRM mostra tudo).
 */
export function calcularEconomia(
  entrada: EntradaSimulacao,
  parametros: ParametrosEnergia,
  planos: PlanoDesconto[]
): ResultadoSimulacao {
  const { tarifa, cip } = comTributos(parametros);

  const base: Omit<ResultadoSimulacao, "ok" | "motivo" | "mensagem"> = {
    tarifa, cip,
    consumoKwh: 0, plano: null, descontoPercentual: 0,
    valorEnergia: 0, economiaMensal: 0,
    contaAtual: 0, contaLorenergia: 0, economiaPercentual: 0,
  };

  // Consumo em kWh: direto, ou estimado a partir do valor em R$.
  const valor = Number(entrada.entrada) || 0;
  const consumo = entrada.modo === "kwh" ? valor : tarifa > 0 ? Math.max(0, (valor - cip) / tarifa) : 0;

  if (consumo <= 0) {
    return { ok: false, motivo: "consumo_invalido", mensagem: "Informe o consumo para ver a simulação.", ...base };
  }

  const plano = escolherPlano(planos, entrada.planoCodigo);
  if (!plano) {
    return { ok: false, motivo: "sem_plano", mensagem: "Nenhum plano de desconto cadastrado. Cadastre em Planos.", ...base, consumoKwh: consumo };
  }

  const d = Math.min(1, Math.max(0, (Number(plano.desconto_percentual) || 0) / 100));
  const valorEnergia = consumo * tarifa;
  const economiaMensal = valorEnergia * d;
  const contaAtual = valorEnergia + cip;
  const contaLorenergia = contaAtual - economiaMensal;
  const economiaPercentual = contaAtual > 0 ? economiaMensal / contaAtual : 0;

  return {
    ok: true,
    ...base,
    consumoKwh: consumo,
    plano,
    descontoPercentual: d,
    valorEnergia,
    economiaMensal,
    contaAtual,
    contaLorenergia,
    economiaPercentual,
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
// Validação dos planos de desconto (tela de planos do admin)
// ---------------------------------------------------------------------
export interface ProblemaPlano {
  codigo: string;
  nivel: "erro" | "aviso";
  mensagem: string;
}
export interface ValidacaoPlanos {
  ok: boolean; // sem ERROS
  problemas: ProblemaPlano[];
}

/** Valida os planos de desconto: percentual entre 0 e 100, sem duplicados. */
export function validarPlanos(planos: PlanoDesconto[]): ValidacaoPlanos {
  const problemas: ProblemaPlano[] = [];
  const vistos = new Set<string>();
  for (const p of planos ?? []) {
    const cod = (p.codigo ?? "").trim().toUpperCase();
    const pct = Number(p.desconto_percentual);
    if (!cod) problemas.push({ codigo: cod, nivel: "erro", mensagem: "Informe o código do plano." });
    else if (vistos.has(cod)) problemas.push({ codigo: cod, nivel: "erro", mensagem: `Código de plano repetido: ${cod}.` });
    else vistos.add(cod);
    if (!(pct >= 0 && pct <= 100)) problemas.push({ codigo: cod, nivel: "erro", mensagem: `Plano ${cod || "?"}: desconto deve estar entre 0% e 100%.` });
  }
  if ((planos ?? []).filter((p) => p.ativo !== false).length === 0) {
    problemas.push({ codigo: "", nivel: "aviso", mensagem: "Nenhum plano ativo — o simulador não terá desconto para oferecer." });
  }
  return { ok: !problemas.some((p) => p.nivel === "erro"), problemas };
}
