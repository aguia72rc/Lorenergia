"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessao } from "@/lib/auth";
import { apenasDigitos } from "@/lib/format";

async function exigirAdmin() {
  const sessao = await getSessao();
  if (sessao?.profile?.role !== "admin") {
    throw new Error("Acesso negado.");
  }
}

function dadosDoForm(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  return {
    nome: String(formData.get("nome") ?? "").trim(),
    unidade: String(formData.get("unidade") ?? "").trim() || null,
    cpf: String(formData.get("cpf") ?? "").trim() || null,
    email: email || null,
    telefone: apenasDigitos(String(formData.get("telefone") ?? "")) || null,
    desconto_percentual: Number(formData.get("desconto_percentual") ?? 20),
    ativo: formData.get("ativo") === "on",
    observacoes: String(formData.get("observacoes") ?? "").trim() || null,
  };
}

export async function criarCliente(formData: FormData) {
  await exigirAdmin();
  const supabase = createClient();
  const dados = dadosDoForm(formData);

  if (!dados.nome) throw new Error("O nome é obrigatório.");

  const { error } = await supabase.from("clientes").insert(dados);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/clientes");
  redirect("/admin/clientes");
}

export async function atualizarCliente(id: string, formData: FormData) {
  await exigirAdmin();
  const supabase = createClient();
  const dados = dadosDoForm(formData);

  if (!dados.nome) throw new Error("O nome é obrigatório.");

  const { error } = await supabase.from("clientes").update(dados).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/clientes");
  redirect("/admin/clientes");
}

export async function excluirCliente(id: string) {
  await exigirAdmin();
  const supabase = createClient();
  const { error } = await supabase.from("clientes").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/clientes");
}

/**
 * Convida o morador por e-mail para acessar o portal.
 * Requer a chave de serviço (SUPABASE_SERVICE_ROLE_KEY) no ambiente.
 * O gatilho handle_new_user vincula automaticamente o profile ao cliente
 * pelo e-mail.
 */
export async function convidarMorador(clienteId: string): Promise<{ ok: boolean; mensagem: string }> {
  await exigirAdmin();
  const supabase = createClient();

  const { data: cliente } = await supabase
    .from("clientes")
    .select("email, nome")
    .eq("id", clienteId)
    .single();

  if (!cliente?.email) {
    return { ok: false, mensagem: "Cadastre um e-mail para este morador antes de convidar." };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, mensagem: "Convite indisponível: falta configurar SUPABASE_SERVICE_ROLE_KEY." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(cliente.email);
  if (error) {
    return { ok: false, mensagem: `Não foi possível convidar: ${error.message}` };
  }
  return { ok: true, mensagem: `Convite enviado para ${cliente.email}.` };
}
