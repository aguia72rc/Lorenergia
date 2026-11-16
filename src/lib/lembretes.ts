/**
 * Lembretes de vencimento: quem lembrar, quando e com qual mensagem.
 * Funções puras (testáveis). Datas no formato YYYY-MM-DD.
 */

export type TipoLembrete = "vencida" | "vence_hoje" | "a_vencer";

/** Dias entre hoje e o vencimento: negativo = já venceu, 0 = vence hoje. */
export function diasAteVencimento(vencimento: string, hoje: string): number {
  const ms = Date.parse(`${vencimento.slice(0, 10)}T00:00:00Z`) - Date.parse(`${hoje.slice(0, 10)}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/**
 * Em qual grupo de lembrete a fatura entra. `null` = ainda não é hora
 * (vence depois da janela) ou não tem vencimento.
 */
export function classificarLembrete(
  vencimento: string | null | undefined,
  hoje: string,
  diasAntes = 3
): TipoLembrete | null {
  if (!vencimento) return null;
  const dias = diasAteVencimento(vencimento, hoje);
  if (Number.isNaN(dias)) return null;
  if (dias < 0) return "vencida";
  if (dias === 0) return "vence_hoje";
  return dias <= diasAntes ? "a_vencer" : null;
}

/** "vence hoje", "vence amanhã", "vence em 3 dias", "venceu ontem", "venceu há 5 dias". */
export function prazoPorExtenso(dias: number): string {
  if (dias === 0) return "vence hoje";
  if (dias === 1) return "vence amanhã";
  if (dias > 1) return `vence em ${dias} dias`;
  if (dias === -1) return "venceu ontem";
  return `venceu há ${-dias} dias`;
}

export interface DadosLembrete {
  nome: string;
  referencia: string; // já formatada, ex.: "outubro de 2026"
  vencimento: string; // já formatado, ex.: "10/11/2026"
  valor: string; // já formatado; nas vencidas, o valor atualizado
  link: string;
  dias: number;
  temEncargos?: boolean; // vencida com multa/juros somados ao valor
}

/** "1 dia" / "4 dias". */
function qtdDias(n: number): string {
  return n === 1 ? "1 dia" : `${n} dias`;
}

/** Rodapé comum: avisa que a mensagem é automática e o que fazer se já pagou. */
const RODAPE =
  "Esta é uma mensagem automática. Se o pagamento já foi efetuado, envie o comprovante e desconsidere esta mensagem. Obrigado! ☀️";

/**
 * Texto do lembrete, no tom de quem avisa um vizinho — sem ameaça. Sempre diz
 * quantos dias faltam para o vencimento (ou quantos dias de atraso).
 */
export function montarLembrete(tipo: TipoLembrete, d: DadosLembrete): string {
  const primeiroNome = d.nome.trim().split(/\s+/)[0] || d.nome;
  if (tipo === "vencida") {
    const atraso = Math.max(1, -d.dias);
    return [
      `Olá, ${primeiroNome}! Tudo bem?`,
      `Lembrete de atraso: a sua fatura da Lorenergia de ${d.referencia} venceu em ${d.vencimento} e está com ${qtdDias(atraso)} de atraso.`,
      `O valor ${d.temEncargos ? "atualizado, com multa e juros, é" : "é"} ${d.valor}.`,
      `Para pagar por PIX é só abrir: ${d.link}`,
      RODAPE,
    ].join("\n\n");
  }
  const prazo =
    d.dias <= 0
      ? `a sua fatura da Lorenergia de ${d.referencia}, no valor de ${d.valor}, vence hoje (${d.vencimento}).`
      : `${d.dias === 1 ? "falta 1 dia" : `faltam ${d.dias} dias`} para o vencimento da sua fatura da Lorenergia de ${d.referencia}, no valor de ${d.valor} (vence em ${d.vencimento}).`;
  return [
    `Olá, ${primeiroNome}! Tudo bem?`,
    `Lembrete de vencimento: ${prazo}`,
    `Para pagar por PIX é só abrir: ${d.link}`,
    RODAPE,
  ].join("\n\n");
}
