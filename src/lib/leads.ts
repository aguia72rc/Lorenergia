import type { Lead, StatusLead, StatusContato, SegmentoLead } from "@/lib/types";

/** Comissão por kWh e parâmetros de estimativa (modelo Lorenergia). */
export const COMISSAO_POR_KWH = 0.5;
const TARIFA_REF = 0.9; // R$/kWh de referência para estimar economia
const DESCONTO_REF = 0.2; // 20%

/** Consumo efetivo do lead: confirmado quando houver, senão o estimado. */
export function consumoLead(l: Pick<Lead, "consumo_estimado_kwh" | "consumo_confirmado_kwh">): number {
  return Number(l.consumo_confirmado_kwh ?? 0) || Number(l.consumo_estimado_kwh ?? 0);
}
export function comissaoLead(l: Pick<Lead, "consumo_estimado_kwh" | "consumo_confirmado_kwh">): number {
  return consumoLead(l) * COMISSAO_POR_KWH;
}
export function economiaLead(l: Pick<Lead, "consumo_estimado_kwh" | "consumo_confirmado_kwh">): number {
  return consumoLead(l) * TARIFA_REF * DESCONTO_REF;
}

/**
 * Máquina de estados do funil (espelha o lead-lifecycle). A partir de cada
 * status, quais transições são válidas. Validada também no servidor.
 */
export const FLOW: Record<StatusLead, StatusLead[]> = {
  NOVO: ["QUALIFICADO", "PRIORIZADO", "EM_CONTATO", "DESCARTADO"],
  QUALIFICADO: ["PRIORIZADO", "EM_CONTATO", "DESCARTADO"],
  PRIORIZADO: ["EM_CONTATO", "DESCARTADO"],
  EM_CONTATO: ["AGUARDANDO_RESPOSTA", "RESPONDEU", "SEM_INTERESSE", "DESCARTADO"],
  AGUARDANDO_RESPOSTA: ["RESPONDEU", "EM_CONTATO", "SEM_INTERESSE", "DESCARTADO"],
  RESPONDEU: ["INTERESSADO", "AGUARDANDO_RESPOSTA", "SEM_INTERESSE"],
  INTERESSADO: ["DOCUMENTACAO", "SEM_INTERESSE"],
  DOCUMENTACAO: ["ENVIADO_FINDER", "INTERESSADO", "SEM_INTERESSE"],
  ENVIADO_FINDER: ["VENDA_REALIZADA", "INTERESSADO", "SEM_INTERESSE"],
  VENDA_REALIZADA: [],
  SEM_INTERESSE: ["NOVO"],
  DESCARTADO: ["NOVO"],
};

export const STATUS_LEAD_LABEL: Record<StatusLead, string> = {
  NOVO: "Novo", QUALIFICADO: "Qualificado", PRIORIZADO: "Priorizado", EM_CONTATO: "Em contato",
  AGUARDANDO_RESPOSTA: "Aguardando", RESPONDEU: "Respondeu", INTERESSADO: "Interessado",
  DOCUMENTACAO: "Documentação", ENVIADO_FINDER: "Fechamento", VENDA_REALIZADA: "Venda",
  SEM_INTERESSE: "Sem interesse", DESCARTADO: "Descartado",
};
export const STATUS_LEAD_COR: Record<StatusLead, string> = {
  NOVO: "#a1a1aa", QUALIFICADO: "#60a5fa", PRIORIZADO: "#fbbf24", EM_CONTATO: "#c084fc",
  AGUARDANDO_RESPOSTA: "#fbbf24", RESPONDEU: "#34d399", INTERESSADO: "#34d399",
  DOCUMENTACAO: "#22d3ee", ENVIADO_FINDER: "#818cf8", VENDA_REALIZADA: "#34d399",
  SEM_INTERESSE: "#f87171", DESCARTADO: "#71717a",
};
export const STATUS_CONTATO_LABEL: Record<StatusContato, string> = {
  NAO_CONTATADO: "Não contatado", PRIMEIRO_CONTATO: "1º contato", AGUARDANDO_RESPOSTA: "Aguardando",
  RESPONDEU: "Respondeu", SEGUNDO_CONTATO_NECESSARIO: "2º contato necessário", SEM_RESPOSTA: "Sem resposta",
};
export const SEGMENTO_LABEL: Record<SegmentoLead, string> = {
  COMERCIAL: "Comercial", INDUSTRIAL: "Industrial", RESIDENCIAL: "Residencial",
};
export const SEGMENTO_COR: Record<SegmentoLead, string> = {
  COMERCIAL: "#60a5fa", INDUSTRIAL: "#34d399", RESIDENCIAL: "#fbbf24",
};

/** Colunas do pipeline (ordem do funil). */
export const COLUNAS_PIPELINE: StatusLead[] = [
  "NOVO", "QUALIFICADO", "PRIORIZADO", "EM_CONTATO", "AGUARDANDO_RESPOSTA",
  "RESPONDEU", "INTERESSADO", "DOCUMENTACAO", "ENVIADO_FINDER", "VENDA_REALIZADA",
];

export function proximoStatus(atual: StatusLead): StatusLead | null {
  const p = FLOW[atual];
  return p && p.length > 0 ? p[0] : null;
}
