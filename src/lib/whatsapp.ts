import { apenasDigitos, formatBRL, formatKwh, formatReferencia, formatData } from "./format";
import type { FaturaComCliente, Configuracoes } from "./types";

/**
 * Mensagem padrão do aviso de fatura nova (usada quando o campo "Mensagem do
 * WhatsApp" das Configurações está vazio; a migração 0032 também a grava lá).
 */
export const MENSAGEM_PADRAO = [
  "Olá, {primeiro_nome}! ☀️",
  "Sua fatura da Lorenergia de {referencia} já está disponível no aplicativo.",
  "{beneficio}",
  "💰 Valor: {valor}\n📅 Vencimento: {vencimento}",
  "Veja a fatura e pague por PIX: {link}",
].join("\n\n");

type FaturaMensagem = Pick<
  FaturaComCliente,
  "clientes" | "referencia" | "consumo_kwh" | "valor_liquido" | "economia" | "vencimento"
> & { modalidade_beneficio?: string | null; cashback_valor?: number | null };

/**
 * A frase do ganho do mês, certa para cada modalidade: desconto (economia na
 * fatura) ou cashback (valor que volta depois). Vazia se não houve ganho.
 */
export function textoBeneficio(f: FaturaMensagem): string {
  if (f.modalidade_beneficio === "cashback") {
    const v = Number(f.cashback_valor) || 0;
    return v > 0 ? `Neste mês você acumulou ${formatBRL(v)} de cashback com a energia solar. 💚` : "";
  }
  const v = Number(f.economia) || 0;
  return v > 0 ? `Com a energia solar, você economizou ${formatBRL(v)} neste mês. 💚` : "";
}

/**
 * Monta o texto da mensagem de WhatsApp a partir do template configurado,
 * substituindo as variáveis {nome}, {primeiro_nome}, {consumo}, {valor}, etc.
 */
export function montarMensagem(
  fatura: FaturaMensagem,
  config: Pick<Configuracoes, "mensagem_whatsapp"> | null | undefined,
  linkFatura: string
): string {
  const template = config?.mensagem_whatsapp?.trim() || MENSAGEM_PADRAO;
  const nome = fatura.clientes?.nome ?? "";
  const substituicoes: Record<string, string> = {
    "{nome}": nome,
    "{primeiro_nome}": nome.trim().split(/\s+/)[0] || nome,
    "{referencia}": formatReferencia(fatura.referencia),
    "{consumo}": formatKwh(fatura.consumo_kwh),
    "{valor}": formatBRL(fatura.valor_liquido),
    "{economia}": formatBRL(fatura.economia),
    "{beneficio}": textoBeneficio(fatura),
    "{vencimento}": formatData(fatura.vencimento),
    "{link}": linkFatura,
  };

  const texto = Object.entries(substituicoes).reduce(
    (t, [chave, valor]) => t.split(chave).join(valor),
    template.replace(/\r\n/g, "\n")
  );
  // Sem ganho no mês, {beneficio} fica vazio: não deixa linhas em branco sobrando.
  return texto.replace(/\n{3,}/g, "\n\n").trim();
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
