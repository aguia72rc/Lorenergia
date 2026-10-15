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
 *   energia   = consumo × (TUSD + TE)
 *   bandeira  = consumo × adicional_bandeira (R$/kWh)
 *   bruto     = energia + bandeira + taxa solar + iluminação + multa/juros
 *   desconto  = bruto × desconto%                     → economia
 *               (incide sobre o valor bruto TOTAL — conta cheia)
 *
 *   total = bruto − desconto
 * ================================================================= */

export interface EntradaCalculoDetalhada {
  consumoKwh: number;
  tarifaTusd: number; // R$/kWh
  tarifaTe: number; // R$/kWh
  adicionalBandeira: number; // R$ fixo
  taxaEnergiaSolar: number; // TUSD GD II em R$ (= tarifa × consumo; ver valorTusdGd2)
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
  baseDesconto: number; // valor bruto total (conta cheia) — base do desconto
  valorDesconto: number;
  valorBruto: number; // tudo, antes do desconto
  valorLiquido: number; // total a pagar
  economia: number;
}

/**
 * TUSD GD II proporcional ao consumo: tarifa (R$/kWh) × consumo (kWh),
 * arredondado em centavos. O resultado entra em `taxaEnergiaSolar`.
 */
export function valorTusdGd2(consumoKwh: number, tarifaGd2: number): number {
  const consumo = Math.max(0, Number(consumoKwh) || 0);
  const tarifa = Math.max(0, Number(tarifaGd2) || 0);
  return arredondar(consumo * tarifa);
}

/**
 * Divide `total` (R$) proporcionalmente aos `pesos` (ex.: kWh de cada morador).
 * Exato ao centavo: a soma das partes é sempre igual ao total (método do maior resto).
 */
export function ratearProporcional(total: number, pesos: number[]): number[] {
  const centavos = Math.round(Math.max(0, Number(total) || 0) * 100);
  const w = pesos.map((p) => Math.max(0, Number(p) || 0));
  const soma = w.reduce((s, x) => s + x, 0);
  if (centavos === 0 || soma <= 0) return w.map(() => 0);

  const cotas = w.map((x) => (x / soma) * centavos);
  const base = cotas.map((c) => Math.floor(c));
  let resto = centavos - base.reduce((s, x) => s + x, 0);
  const ordem = cotas.map((c, i) => ({ i, f: c - Math.floor(c) })).sort((a, b) => b.f - a.f || a.i - b.i);
  for (let k = 0; resto > 0 && k < ordem.length; k++, resto--) base[ordem[k].i] += 1;
  return base.map((c) => c / 100);
}

export type ModoGd2 = "total" | "tarifa";

/**
 * TUSD GD II (Fio B) de cada morador do lote.
 *  - "total": `entrada` é o Fio B TOTAL da conta (R$), rateado pelo consumo de cada um.
 *  - "tarifa": `entrada` é a tarifa em R$/kWh; cada um paga tarifa × o próprio consumo.
 * Retorna o valor (R$) por morador e a tarifa equivalente em R$/kWh.
 */
export function distribuirTusdGd2(
  modo: ModoGd2,
  entrada: number,
  consumos: number[]
): { valores: number[]; tarifa: number } {
  if (modo === "total") {
    const total = Math.max(0, Number(entrada) || 0);
    const soma = consumos.reduce((s, c) => s + Math.max(0, Number(c) || 0), 0);
    return {
      valores: ratearProporcional(total, consumos),
      tarifa: soma > 0 ? Math.round((total / soma) * 1e5) / 1e5 : 0,
    };
  }
  const tarifa = Math.max(0, Number(entrada) || 0);
  return { valores: consumos.map((c) => valorTusdGd2(c, tarifa)), tarifa };
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

  // Desconto incide sobre o VALOR BRUTO TOTAL (conta cheia): energia +
  // bandeira + taxa solar + iluminação + multa/juros.
  const brutoRaw = energiaRaw + bandeira + taxaSolar + iluminacao + multaJuros;
  const descontoRaw = brutoRaw * (desconto / 100);
  const liquidoRaw = brutoRaw - descontoRaw;

  return {
    energiaTusd: arredondar(energiaTusdRaw),
    energiaTe: arredondar(energiaTeRaw),
    energia: arredondar(energiaRaw),
    bandeira,
    taxaSolar,
    iluminacao,
    multaJuros,
    baseDesconto: arredondar(brutoRaw),
    valorDesconto: arredondar(descontoRaw),
    valorBruto: arredondar(brutoRaw),
    valorLiquido: arredondar(liquidoRaw),
    economia: arredondar(descontoRaw),
  };
}
