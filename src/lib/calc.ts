/**
 * Lógica de cálculo das faturas.
 *
 * Modelo de cobrança:
 *   valor_bruto  = consumo_kwh * tarifa_kwh + taxa_iluminacao
 *                  (quanto o morador pagaria à distribuidora tradicional)
 *   valor_desconto = valor_bruto * (desconto_percentual / 100)
 *   valor_liquido  = valor_bruto - valor_desconto
 *                  (quanto o morador paga de fato para a usina)
 *   economia       = valor_desconto
 *                  (o quanto o morador economiza usando a energia solar)
 */

export interface EntradaCalculo {
  consumoKwh: number;
  tarifaKwh: number;
  descontoPercentual: number;
  taxaIluminacao?: number;
}

export interface ResultadoCalculo {
  valorBruto: number;
  valorDesconto: number;
  valorLiquido: number;
  economia: number;
}

function arredondar(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/**
 * Consumo a partir das leituras do medidor.
 * Nunca retorna negativo (protege contra troca/zeragem de medidor).
 */
export function consumoDeLeituras(
  leituraAnterior: number | null | undefined,
  leituraAtual: number | null | undefined
): number {
  const anterior = Number(leituraAnterior) || 0;
  const atual = Number(leituraAtual) || 0;
  return arredondar(Math.max(0, atual - anterior));
}

export function calcularFatura(entrada: EntradaCalculo): ResultadoCalculo {
  const consumo = Math.max(0, Number(entrada.consumoKwh) || 0);
  const tarifa = Math.max(0, Number(entrada.tarifaKwh) || 0);
  const taxa = Math.max(0, Number(entrada.taxaIluminacao) || 0);
  const desconto = Math.min(100, Math.max(0, Number(entrada.descontoPercentual) || 0));

  const valorBruto = arredondar(consumo * tarifa + taxa);
  const valorDesconto = arredondar(valorBruto * (desconto / 100));
  const valorLiquido = arredondar(valorBruto - valorDesconto);

  return {
    valorBruto,
    valorDesconto,
    valorLiquido,
    economia: valorDesconto,
  };
}

/* =====================================================================
 * Cálculo detalhado (padrão conta de luz).
 *
 *   energia   = consumo × (TUSD + TE)
 *   bandeira  = consumo × adicional_bandeira (R$/kWh)
 *   desconto  = (energia + bandeira) × desconto%      → economia
 *   fio_b     = consumo × fio_b (R$/kWh)              (sem desconto)
 *   iluminação e multa/juros                          (sem desconto)
 *
 *   total = energia + bandeira − desconto + fio_b + iluminação + multa
 * ================================================================= */

export interface EntradaCalculoDetalhada {
  consumoKwh: number;
  tarifaTusd: number;
  tarifaTe: number;
  adicionalBandeira: number; // R$/kWh
  fioB: number; // R$/kWh
  taxaIluminacao: number; // R$
  multaJuros: number; // R$
  descontoPercentual: number;
}

export interface ResultadoCalculoDetalhado {
  energia: number;
  bandeira: number;
  fioB: number;
  iluminacao: number;
  multaJuros: number;
  baseDesconto: number; // energia + bandeira
  valorDesconto: number;
  valorBruto: number; // tudo, antes do desconto
  valorLiquido: number; // total a pagar
  economia: number;
}

export function calcularFaturaDetalhada(e: EntradaCalculoDetalhada): ResultadoCalculoDetalhado {
  const consumo = Math.max(0, Number(e.consumoKwh) || 0);
  const tusd = Math.max(0, Number(e.tarifaTusd) || 0);
  const te = Math.max(0, Number(e.tarifaTe) || 0);
  const bandeiraKwh = Math.max(0, Number(e.adicionalBandeira) || 0);
  const fioBKwh = Math.max(0, Number(e.fioB) || 0);
  const iluminacao = Math.max(0, Number(e.taxaIluminacao) || 0);
  const multaJuros = Math.max(0, Number(e.multaJuros) || 0);
  const desconto = Math.min(100, Math.max(0, Number(e.descontoPercentual) || 0));

  const energia = arredondar(consumo * (tusd + te));
  const bandeira = arredondar(consumo * bandeiraKwh);
  const fioB = arredondar(consumo * fioBKwh);

  const baseDesconto = arredondar(energia + bandeira);
  const valorDesconto = arredondar(baseDesconto * (desconto / 100));

  const valorBruto = arredondar(baseDesconto + fioB + iluminacao + multaJuros);
  const valorLiquido = arredondar(valorBruto - valorDesconto);

  return {
    energia,
    bandeira,
    fioB,
    iluminacao,
    multaJuros,
    baseDesconto,
    valorDesconto,
    valorBruto,
    valorLiquido,
    economia: valorDesconto,
  };
}
