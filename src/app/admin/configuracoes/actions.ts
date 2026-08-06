"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";

export async function salvarConfiguracoes(formData: FormData) {
  const sessao = await getSessao();
  if (sessao?.profile?.role !== "admin") throw new Error("Acesso negado.");

  const supabase = createClient();
  const tarifa_tusd = Number(formData.get("tarifa_tusd") ?? 0);
  const tarifa_te = Number(formData.get("tarifa_te") ?? 0);
  const dados = {
    nome_usina: String(formData.get("nome_usina") ?? "").trim() || "Minha Usina Solar",
    tarifa_tusd,
    tarifa_te,
    tarifa_kwh: tarifa_tusd + tarifa_te, // compatibilidade
    adicional_bandeira: Number(formData.get("adicional_bandeira") ?? 0),
    fio_b: Number(formData.get("fio_b") ?? 0),
    taxa_iluminacao_publica: Number(formData.get("taxa_iluminacao_publica") ?? 0),
    dados_pagamento: String(formData.get("dados_pagamento") ?? "").trim() || null,
    mensagem_whatsapp: String(formData.get("mensagem_whatsapp") ?? "").trim(),
  };

  const { error } = await supabase.from("configuracoes").update(dados).eq("id", 1);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/configuracoes");
  revalidatePath("/admin");
}
