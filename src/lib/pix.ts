/**
 * Geração do "PIX Copia e Cola" (BR Code / EMV) para pagamento.
 * Padrão do Banco Central — permite gerar o QR Code da fatura.
 */

function emv(id: string, valor: string): string {
  const tam = valor.length.toString().padStart(2, "0");
  return `${id}${tam}${valor}`;
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Remove acentos e limita o tamanho (nome/cidade do recebedor). */
function limpar(texto: string, max: number): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim()
    .slice(0, max)
    .toUpperCase();
}

export interface DadosPix {
  chave: string;
  nome: string;
  cidade: string;
  valor: number;
  txid?: string;
}

/** Monta o payload "copia e cola" do PIX. */
export function gerarPixCopiaECola({ chave, nome, cidade, valor, txid = "***" }: DadosPix): string {
  const nomeR = limpar(nome || "RECEBEDOR", 25);
  const cidadeR = limpar(cidade || "CIDADE", 15);
  const valorStr = (Number(valor) || 0).toFixed(2);

  const gui = emv("00", "br.gov.bcb.pix");
  const chaveM = emv("01", chave.trim());
  const mai = emv("26", `${gui}${chaveM}`); // Merchant Account Information

  const payloadSemCrc =
    emv("00", "01") + // Payload Format Indicator
    mai +
    emv("52", "0000") + // Merchant Category Code
    emv("53", "986") + // Moeda (BRL)
    emv("54", valorStr) + // Valor
    emv("58", "BR") + // País
    emv("59", nomeR) + // Nome do recebedor
    emv("60", cidadeR) + // Cidade
    emv("62", emv("05", txid)) + // Additional data (txid)
    "6304"; // CRC16 (id + tam)

  return payloadSemCrc + crc16(payloadSemCrc);
}
