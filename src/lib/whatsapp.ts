import { apenasDigitos, formatBRL, formatKwh, formatReferencia, formatData } from "./format";
import type { FaturaComCliente, Configuracoes } from "./types";

/**
 * Monta o texto da mensagem de WhatsApp a partir do template configurado,
 * substituindo as variáveis {nome}, {consumo}, {valor}, etc.
 */
export function montarMensagem(
  fatura: FaturaComCliente,
  config: Pick<Configuracoes, "mensagem_whatsapp">,
  linkFatura: string
): string {
  const template = config.mensagem_whatsapp ?? "";
  const substituicoes: Record<string, string> = {
    "{nome}": fatura.clientes?.nome ?? "",
    "{referencia}": formatReferencia(fatura.referencia),
    "{consumo}": formatKwh(fatura.consumo_kwh),
    "{valor}": formatBRL(fatura.valor_liquido),
    "{economia}": formatBRL(fatura.economia),
    "{vencimento}": formatData(fatura.vencimento),
    "{link}": linkFatura,
  };

  return Object.entries(substituicoes).reduce(
    (texto, [chave, valor]) => texto.split(chave).join(valor),
    template
  );
}

/**
 * Gera o link wa.me (gratuito) que abre o WhatsApp já com a mensagem pronta.
 * Basta o usuário clicar em "Enviar".
 */
export function gerarLinkWhatsApp(telefone: string | null | undefined, mensagem: string): string {
  const numero = apenasDigitos(telefone);
  const texto = encodeURIComponent(mensagem);
  return numero
    ? `https://wa.me/${numero}?text=${texto}`
    : `https://wa.me/?text=${texto}`;
}

/* ---------------------------------------------------------------------
 * (OPCIONAL) Envio automático pela API Oficial (WhatsApp Cloud API / Meta).
 * Requer WHATSAPP_CLOUD_API_TOKEN e WHATSAPP_PHONE_NUMBER_ID no ambiente.
 * Deixe pronto para ativar quando tiver a conta WhatsApp Business.
 * ------------------------------------------------------------------- */
export async function enviarViaCloudApi(
  telefone: string,
  mensagem: string
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.WHATSAPP_CLOUD_API_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) {
    return { ok: false, error: "API oficial do WhatsApp não configurada." };
  }

  try {
    const resp = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: apenasDigitos(telefone),
        type: "text",
        text: { body: mensagem },
      }),
    });
    if (!resp.ok) {
      const detalhe = await resp.text();
      return { ok: false, error: `Falha ao enviar (${resp.status}): ${detalhe}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" };
  }
}
