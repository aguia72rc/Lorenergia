export type Role = "admin" | "cliente";
export type StatusFatura = "pendente" | "paga" | "cancelada";

export interface Cliente {
  id: string;
  nome: string;
  unidade: string | null;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  cep: string | null;
  cidade_uf: string | null;
  numero_medidor: string | null;
  tipo_ligacao: string | null;
  desconto_percentual: number;
  ativo: boolean;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Configuracoes {
  id: number;
  nome_usina: string;
  tarifa_kwh: number;
  tarifa_tusd: number;
  tarifa_te: number;
  adicional_bandeira: number;
  fio_b: number;
  taxa_energia_solar: number;
  taxa_iluminacao_publica: number;
  chave_pix: string | null;
  pix_nome: string | null;
  pix_cidade: string | null;
  dados_pagamento: string | null;
  mensagem_whatsapp: string;
  updated_at: string;
}

export interface Fatura {
  id: string;
  cliente_id: string;
  referencia: string; // YYYY-MM-DD (primeiro dia do mês)
  leitura_anterior: number | null;
  leitura_atual: number | null;
  fator_multiplicador: number;
  consumo_kwh: number;
  tarifa_kwh: number;
  tarifa_tusd: number;
  tarifa_te: number;
  adicional_bandeira: number;
  fio_b: number;
  taxa_energia_solar: number;
  taxa_iluminacao: number;
  multa_juros: number;
  icms: number;
  pis: number;
  cofins: number;
  desconto_percentual: number;
  valor_bruto: number;
  valor_desconto: number;
  valor_liquido: number;
  economia: number;
  data_emissao: string | null;
  vencimento: string | null;
  status: StatusFatura;
  observacoes: string | null;
  whatsapp_enviado_em: string | null;
  created_at: string;
  updated_at: string;
}

export interface FaturaComCliente extends Fatura {
  clientes: Pick<
    Cliente,
    | "id" | "nome" | "unidade" | "telefone" | "email" | "cpf"
    | "endereco" | "cep" | "cidade_uf" | "numero_medidor" | "tipo_ligacao"
  > | null;
}

export interface GeracaoMensal {
  referencia: string; // YYYY-MM-DD (1º dia do mês)
  kwh_injetado: number;
  kwh_gerado: number | null;
  observacoes: string | null;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string | null;
  role: Role;
  cliente_id: string | null;
  must_change_password: boolean;
  created_at: string;
}
