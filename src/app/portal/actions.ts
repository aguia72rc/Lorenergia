"use server";

import { revalidatePath } from "next/cache";
import { getSessao } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Marca que o morador já definiu a própria senha (chamado após a troca).
 * Usa a chave de serviço porque o morador não pode alterar o próprio profile
 * pelas políticas de RLS.
 */
export async function concluirTrocaSenha(): Promise<{ ok: boolean; mensagem?: string }> {
  const sessao = await getSessao();
  if (!sessao) return { ok: false, mensagem: "Sessão expirada." };

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, mensagem: "Configuração ausente no servidor." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", sessao.userId);

  if (error) return { ok: false, mensagem: error.message };

  revalidatePath("/portal");
  return { ok: true };
}
