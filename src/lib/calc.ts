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
  leituraAtual: number | null | undefined,
  fatorMultiplicador: number | null | undefined = 1
): number {
  const anterior = Number(leituraAnterior) || 0;
  const atual = Number(leituraAtual) || 0;
  const fator = Number(fatorMultiplicador) || 1;
  return arredondar(Math.max(0, atual - anterior) * fator);
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
 *   energia    = consumo × (TUSD + TE)
 *   bandeira   = consumo × adicional_bandeira (R$/kWh)
 *   base       = energia + bandeira + iluminação + multa/juros
 *   desconto   = base × desconto%                     → economia
 *                (a TUSD GD II / Fio B NÃO entra no desconto)
 *
 *   bruto = base + taxa solar (TUSD GD II)   ← tudo, antes do desconto
 *   total = bruto − desconto                 ← a TUSD GD II é paga cheia
 * ================================================================= */

export interface EntradaCalculoDetalhada {
  consumoKwh: number;
  tarifaTusd: number; // R$/kWh
  tarifaTe: number; // R$/kWh
  adicionalBandeira: number; // R$ fixo
  taxaEnergiaSolar: number; // R$ fixo — TUSD GD II (FORA do desconto)
  taxaIluminacao: number; // R$ fixo (sem desconto)
  multaJuros: number; // R$ fixo (sem desconto)
  descontoPercentual: number;
}

export interface ResultadoCalculoDetalhado {
  energiaTusd: number;
  energiaTe: number;
  energia: number; // TUSD + TE
  bandeira: number;
  taxaSolar: number;
  iluminacao: number;
  multaJuros: number;
  baseDesconto: number; // base do desconto (SEM a TUSD GD II)
  valorDesconto: number;
  valorBruto: number; // tudo, antes do desconto
  valorLiquido: number; // total a pagar
  economia: number;
}

export function calcularFaturaDetalhada(e: EntradaCalculoDetalhada): ResultadoCalculoDetalhado {
  const consumo = Math.max(0, Number(e.consumoKwh) || 0);
  const tusd = Math.max(0, Number(e.tarifaTusd) || 0);
  const te = Math.max(0, Number(e.tarifaTe) || 0);
  const bandeira = arredondar(Math.max(0, Number(e.adicionalBandeira) || 0));
  const taxaSolar = arredondar(Math.max(0, Number(e.taxaEnergiaSolar) || 0));
  const iluminacao = arredondar(Math.max(0, Number(e.taxaIluminacao) || 0));
  const multaJuros = arredondar(Math.max(0, Number(e.multaJuros) || 0));
  const desconto = Math.min(100, Math.max(0, Number(e.descontoPercentual) || 0));

  // Os totais usam precisão cheia (arredonda só no fim, como na conta de luz);
  // as linhas TUSD/TE são arredondadas apenas para exibição.
  const energiaTusdRaw = consumo * tusd;
  const energiaTeRaw = consumo * te;
  const energiaRaw = energiaTusdRaw + energiaTeRaw;

  // O desconto incide sobre energia + bandeira + iluminação + multa/juros.
  // A TUSD GD II (Fio B / taxa solar) fica FORA do desconto: o cliente a paga
  // cheia. Ela entra só no valor bruto e no total a pagar.
  const baseRaw = energiaRaw + bandeira + iluminacao + multaJuros;
  const descontoRaw = baseRaw * (desconto / 100);
  const brutoRaw = baseRaw + taxaSolar;
  const liquidoRaw = brutoRaw - descontoRaw;

  return {
    energiaTusd: arredondar(energiaTusdRaw),
    energiaTe: arredondar(energiaTeRaw),
    energia: arredondar(energiaRaw),
    bandeira,
    taxaSolar,
    iluminacao,
    multaJuros,
    baseDesconto: arredondar(baseRaw),
    valorDesconto: arredondar(descontoRaw),
    valorBruto: arredondar(brutoRaw),
    valorLiquido: arredondar(liquidoRaw),
    economia: arredondar(descontoRaw),
  };
}
