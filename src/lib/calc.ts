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
