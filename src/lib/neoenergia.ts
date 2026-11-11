/**
 * Leitura da fatura da Neoenergia Pernambuco (DANFE em PDF) a partir do TEXTO
 * extraído do arquivo. Função pura (testável): não abre arquivo nem acessa rede.
 *
 * O que a fatura traz e o sistema aproveita:
 *  - leitura anterior e atual do medidor (e a constante) → consumo do mês;
 *  - TUSD GD II (Fio B) e ICMS-CDE, em R$;
 *  - mês de referência, vencimento e total a pagar (para conferência).
 */

export interface FaturaNeoenergia {
  referencia: string | null; // YYYY-MM
  vencimento: string | null; // YYYY-MM-DD
  totalPagar: number | null; // R$
  nomeCliente: string | null;
  unidadeConsumidora: string | null;
  leituraAnterior: number | null;
  leituraAtual: number | null;
  constanteMedidor: number | null;
  /** (leitura atual − anterior) × constante: o consumo real do mês, em kWh. */
  consumoMedidoKwh: number | null;
  /** kWh cobrados pela Neoenergia depois de abater os créditos (costuma ser 0). */
  consumoFaturadoKwh: number | null;
  dataLeituraAnterior: string | null; // YYYY-MM-DD
  dataLeituraAtual: string | null; // YYYY-MM-DD
  tarifaTusd: number | null; // R$/kWh com tributos
  tarifaTe: number | null; // R$/kWh com tributos
  tusdGd2: number | null; // R$ (soma das linhas "TUSD GDII")
  icmsCde: number | null; // R$
  bandeira: string | null;
  /** O que não foi encontrado ou merece conferência. */
  avisos: string[];
}

export type LeituraNeoenergia = { ok: true; fatura: FaturaNeoenergia } | { ok: false; erro: string };

/** "1.104,00" → 1104; "0,56913015" → 0.56913015. Devolve null se não for número. */
export function numeroBr(texto: string | null | undefined): number | null {
  if (texto == null) return null;
  const limpo = String(texto).trim().replace(/\./g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(limpo)) return null;
  const n = Number(limpo);
  return Number.isFinite(n) ? n : null;
}

/** "23/11/2026" → "2026-11-23". */
function dataBr(texto: string | undefined): string | null {
  const m = texto?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

const arred = (n: number, casas = 2) => Math.round(n * 10 ** casas) / 10 ** casas;

export function interpretarFaturaNeoenergia(textoBruto: string): LeituraNeoenergia {
  const texto = (textoBruto ?? "").replace(/\r/g, "").replace(/[ \t]+/g, " ");
  if (texto.trim().length < 50) {
    return { ok: false, erro: "Não consegui ler texto neste PDF. Se for uma foto ou um arquivo escaneado, baixe a 2ª via em PDF no site da Neoenergia." };
  }
  if (!/neoenergia|COMPANHIA ENERG[ÉE]TICA DE PERNAMBUCO/i.test(texto) || !/ITENS DA FATURA|TOTAL A PAGAR/i.test(texto)) {
    return { ok: false, erro: "Este arquivo não parece ser uma fatura da Neoenergia." };
  }

  const avisos: string[] = [];
  const pega = (re: RegExp) => texto.match(re)?.[1]?.trim() ?? null;

  // Mês de referência, vencimento e total
  const ref = texto.match(/(\d{2})\/(\d{4})\s+(?:VENCIMENTO|C[ÓO]DIGO D[ÉE]BITO)/);
  const referencia = ref ? `${ref[2]}-${ref[1]}` : null;
  const vencimento = dataBr(pega(/VENCIMENTO\s+(\d{2}\/\d{2}\/\d{4})/) ?? undefined);
  const totalPagar = numeroBr(pega(/TOTAL A PAGAR R\$\s+(-?[\d.]+,\d{2})/));

  // Identificação (só para o admin conferir que é a conta certa)
  const nomeCliente = pega(/NOME DO CLIENTE:\s*\n([^\n]+)/);
  const unidadeConsumidora = pega(/N[ÚU]MERO DA UNIDADE CONSUMIDORA\s*\n([\d.\-]+)/);

  // Medidor: "5252564596 Energia Ativa Único 608,00 1.104,00 1,00000 0,00"
  const med = texto.match(/^\d{5,}\s+Energia Ativa\s+\S+\s+(-?[\d.]+,\d+)\s+(-?[\d.]+,\d+)\s+([\d.]+,\d+)\s+(-?[\d.]+,\d+)\s*$/im);
  const leituraAnterior = numeroBr(med?.[1]);
  const leituraAtual = numeroBr(med?.[2]);
  const constanteMedidor = numeroBr(med?.[3]);
  const consumoFaturadoKwh = numeroBr(med?.[4]);
  let consumoMedidoKwh: number | null = null;
  if (leituraAnterior != null && leituraAtual != null) {
    consumoMedidoKwh = arred(Math.max(0, leituraAtual - leituraAnterior) * (constanteMedidor || 1));
    if (leituraAtual < leituraAnterior) avisos.push("A leitura atual é menor que a anterior (troca ou virada de medidor?). Confira o consumo.");
  } else {
    avisos.push("Não encontrei as leituras do medidor.");
  }
  if ((texto.match(/^\d{5,}\s+Energia Ativa\s/gim) ?? []).length > 1) {
    avisos.push("A fatura tem mais de uma linha de medição; usei a primeira. Confira as leituras.");
  }

  const datas = texto.match(/LEITURA ANTERIOR\s+(\d{2}\/\d{2}\/\d{4})\s+LEITURA ATUAL\s+(\d{2}\/\d{2}\/\d{4})/);

  // Tarifas com tributos: "Consumo-TUSD kWh 0,00 0,56913015 ..."
  const tarifaTusd = numeroBr(pega(/^Consumo-TUSD\s+kWh\s+-?[\d.]+,\d+\s+([\d.]+,\d+)/im));
  const tarifaTe = numeroBr(pega(/^Consumo-TE\s+kWh\s+-?[\d.]+,\d+\s+([\d.]+,\d+)/im));

  // TUSD GD II (Fio B): "TUSD GDII com trib. 82,48 4,91" → o 1º valor é o da linha
  const linhasGd2 = texto.match(/^TUSD\s*GD\s*II[^\n]*$/gim) ?? [];
  const valoresGd2 = linhasGd2.map((l) => numeroBr(l.match(/(-?[\d.]+,\d{2})(?!\d)/)?.[1])).filter((v): v is number => v != null);
  const tusdGd2 = valoresGd2.length > 0 ? arred(valoresGd2.reduce((s, v) => s + v, 0)) : null;
  if (tusdGd2 == null) avisos.push("Não encontrei a linha TUSD GD II (Fio B) nesta fatura.");
  if (valoresGd2.length > 1) avisos.push(`Há ${valoresGd2.length} linhas de TUSD GD II; somei todas. Confira o valor.`);

  // ICMS-CDE: "ICMS-CDE NF423940826 5,98" → o último valor da linha
  const linhaCde = texto.match(/^ICMS-CDE[^\n]*$/im)?.[0];
  const icmsCde = numeroBr(linhaCde?.match(/(-?[\d.]+,\d{2})\s*$/)?.[1]);

  const bandeira = pega(/bandeira em vigor [ée] a\s+([A-Za-zÀ-ú]+(?: [A-Za-zÀ-ú]+ ?\d?)?)\./i);

  if (!referencia) avisos.push("Não encontrei o mês de referência.");

  return {
    ok: true,
    fatura: {
      referencia,
      vencimento,
      totalPagar,
      nomeCliente,
      unidadeConsumidora,
      leituraAnterior,
      leituraAtual,
      constanteMedidor,
      consumoMedidoKwh,
      consumoFaturadoKwh,
      dataLeituraAnterior: dataBr(datas?.[1]),
      dataLeituraAtual: dataBr(datas?.[2]),
      tarifaTusd,
      tarifaTe,
      tusdGd2,
      icmsCde,
      bandeira,
      avisos,
    },
  };
}
