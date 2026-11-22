"use server";

import { revalidatePath } from "next/cache";
import { getSessao } from "@/lib/auth";
import { desconectarSungrow, lerUsinas } from "@/lib/sungrow-servidor";

async function exigirAdmin() {
  const sessao = await getSessao();
  if (sessao?.profile?.role !== "admin") throw new Error("Acesso negado.");
}

/** "Atualizar agora": consulta a Sungrow mesmo dentro dos 5 minutos de cache. */
export async function atualizarUsinasAgora() {
  await exigirAdmin();
  await lerUsinas({ forcar: true });
  revalidatePath("/admin/usinas");
  revalidatePath("/admin");
}

export async function desconectarUsinas() {
  await exigirAdmin();
  await desconectarSungrow();
  revalidatePath("/admin/usinas");
  revalidatePath("/admin");
}
