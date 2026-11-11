"use server";

import { getSessao } from "@/lib/auth";
import { interpretarFaturaNeoenergia, type LeituraNeoenergia } from "@/lib/neoenergia";

const LIMITE_BYTES = 4 * 1024 * 1024;

/**
 * Lê uma fatura da Neoenergia em PDF e devolve os números (leituras, consumo,
 * Fio B). O arquivo é processado na memória e descartado: nada é gravado.
 */
export async function lerFaturaNeoenergia(formData: FormData): Promise<LeituraNeoenergia> {
  const sessao = await getSessao();
  if (sessao?.profile?.role !== "admin") return { ok: false, erro: "Acesso negado." };

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { ok: false, erro: "Escolha o arquivo PDF da fatura." };
  if (arquivo.size > LIMITE_BYTES) return { ok: false, erro: "Arquivo grande demais (máximo de 4 MB)." };

  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  // Todo PDF começa com "%PDF".
  if (!(bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)) {
    return { ok: false, erro: "O arquivo não é um PDF. Baixe a 2ª via em PDF no site da Neoenergia." };
  }

  let texto: string;
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(bytes);
    const extraido = await extractText(pdf, { mergePages: true });
    texto = extraido.text;
  } catch {
    return { ok: false, erro: "Não consegui abrir este PDF. Confira se o arquivo não está protegido por senha nem corrompido." };
  }

  return interpretarFaturaNeoenergia(texto);
}
