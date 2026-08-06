"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";

export async function salvarConfiguracoes(formData: FormData) {
  const sessao = await getSessao();
  if (sessao?.profile?.role !== "admin") throw new Error("Acesso negado.");

  const supabase = createClient();
  const dados = {
    nome_usina: String(formData.get("nome_usina") ?? "").trim() || "Minha Usina Solar",
    tarifa_kwh: Number(formData.get("tarifa_kwh") ?? 0),
    taxa_iluminacao_publica: Number(formData.get("taxa_iluminacao_publica") ?? 0),
    dados_pagamento: String(formData.get("dados_pagamento") ?? "").trim() || null,
    mensagem_whatsapp: String(formData.get("mensagem_whatsapp") ?? "").trim(),
  };

  const { error } = await supabase.from("configuracoes").update(dados).eq("id", 1);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/configuracoes");
  revalidatePath("/admin");
}
