"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessao } from "@/lib/auth";
import { apenasDigitos } from "@/lib/format";
import { getBaseUrl } from "@/lib/url";

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
    endereco: String(formData.get("endereco") ?? "").trim() || null,
    cep: String(formData.get("cep") ?? "").trim() || null,
    cidade_uf: String(formData.get("cidade_uf") ?? "").trim() || null,
    numero_medidor: String(formData.get("numero_medidor") ?? "").trim() || null,
    tipo_ligacao: String(formData.get("tipo_ligacao") ?? "").trim() || null,
    desconto_percentual: Number(formData.get("desconto_percentual") ?? 20),
    ativo: formData.get("ativo") === "on",
    observacoes: String(formData.get("observacoes") ?? "").trim() || null,
  };
}

export async function criarCliente(formData: FormData) {
  await exigirAdmin();
  const supabase = await createClient();
  const dados = dadosDoForm(formData);

  if (!dados.nome) throw new Error("O nome é obrigatório.");

  const { error } = await supabase.from("clientes").insert(dados);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/clientes");
  redirect("/admin/clientes");
}

export async function atualizarCliente(id: string, formData: FormData) {
  await exigirAdmin();
  const supabase = await createClient();
  const dados = dadosDoForm(formData);

  if (!dados.nome) throw new Error("O nome é obrigatório.");

  const { error } = await supabase.from("clientes").update(dados).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/clientes");
  redirect("/admin/clientes");
}

export async function excluirCliente(id: string) {
  await exigirAdmin();
  const supabase = await createClient();
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
  const supabase = await createClient();

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
  const { error } = await admin.auth.admin.inviteUserByEmail(cliente.email, {
    // Garante que o link do convite volte para a página de callback correta.
    redirectTo: `${await getBaseUrl()}/auth/callback`,
  });
  if (error) {
    return { ok: false, mensagem: `Não foi possível convidar: ${error.message}` };
  }
  return { ok: true, mensagem: `Convite enviado para ${cliente.email}.` };
}

/** Gera uma senha temporária legível (sem caracteres ambíguos). */
function gerarSenhaTemporaria(): string {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnpqrstuvwxyz";
  let s = "";
  for (let i = 0; i < 8; i++) s += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  return s;
}

/**
 * Cria (ou redefine) o acesso do morador com uma SENHA TEMPORÁRIA, sem
 * depender de e-mail. Marca must_change_password para forçar a troca no
 * primeiro acesso. Retorna a senha para o admin repassar (ex.: WhatsApp).
 */
export async function gerarAcessoMorador(
  clienteId: string
): Promise<{ ok: boolean; senha?: string; mensagem: string }> {
  await exigirAdmin();
  const supabase = await createClient();

  const { data: cliente } = await supabase
    .from("clientes")
    .select("email, nome")
    .eq("id", clienteId)
    .single();

  if (!cliente?.email) {
    return { ok: false, mensagem: "Cadastre um e-mail para este morador antes de gerar o acesso." };
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, mensagem: "Acesso indisponível: falta configurar SUPABASE_SERVICE_ROLE_KEY." };
  }

  const admin = createAdminClient();
  const senha = gerarSenhaTemporaria();
  const email = cliente.email.toLowerCase();

  // Já existe um usuário com esse e-mail?
  const { data: lista } = await admin.auth.admin.listUsers();
  const existente = lista?.users?.find((u) => (u.email ?? "").toLowerCase() === email);

  let userId: string;
  if (existente) {
    const { error } = await admin.auth.admin.updateUserById(existente.id, {
      password: senha,
      email_confirm: true,
    });
    if (error) return { ok: false, mensagem: `Não foi possível redefinir a senha: ${error.message}` };
    userId = existente.id;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    });
    if (error || !data.user) return { ok: false, mensagem: `Não foi possível criar o acesso: ${error?.message}` };
    userId = data.user.id;
  }

  // Vincula ao morador e força a troca de senha no primeiro acesso.
  await admin
    .from("profiles")
    .upsert(
      { id: userId, email, role: "cliente", cliente_id: clienteId, must_change_password: true },
      { onConflict: "id" }
    );

  revalidatePath("/admin/clientes");
  return { ok: true, senha, mensagem: `Acesso criado. Senha temporária: ${senha}` };
}
