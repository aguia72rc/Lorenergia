"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { validarPlanos, type PlanoCota } from "@/lib/simulador";

export interface LinhaPlano {
  codigo: string;
  kwh: number;
  mensalidade: number;
  ativo: boolean;
}

/**
 * Salva a tabela inteira de planos: faz upsert de cada linha (pela chave
 * `codigo`) e apaga os planos que foram removidos. Bloqueia se houver ERRO
 * de coerência/não linearidade (avisos passam).
 */
export async function salvarPlanos(linhas: LinhaPlano[]): Promise<{ ok: boolean; mensagem: string }> {
  const sessao = await getSessao();
  if (sessao?.profile?.role !== "admin") return { ok: false, mensagem: "Acesso negado." };

  // Normaliza e valida os códigos.
  const rows = linhas
    .map((l) => ({ codigo: (l.codigo ?? "").trim().toUpperCase(), kwh: Number(l.kwh) || 0, mensalidade: Number(l.mensalidade) || 0, ativo: l.ativo !== false }))
    .filter((l) => l.codigo !== "");

  if (rows.length === 0) return { ok: false, mensagem: "Cadastre ao menos um plano." };
  const codigos = rows.map((r) => r.codigo);
  if (new Set(codigos).size !== codigos.length) return { ok: false, mensagem: "Há códigos de plano repetidos." };

  // Barra erros de não linearidade (avisos não bloqueiam).
  const v = validarPlanos(rows as PlanoCota[]);
  const erros = v.problemas.filter((p) => p.nivel === "erro");
  if (erros.length > 0) return { ok: false, mensagem: "Corrija antes de salvar: " + erros[0].mensagem };

  const db = createClient();

  // Apaga os planos que não estão mais na lista.
  const { data: existentes } = await db.from("planos_cota").select("codigo");
  const manter = new Set(codigos);
  const remover = (existentes ?? []).map((e: { codigo: string }) => e.codigo).filter((c) => !manter.has(c));
  if (remover.length > 0) {
    const { error } = await db.from("planos_cota").delete().in("codigo", remover);
    if (error) return { ok: false, mensagem: "Erro ao remover planos: " + error.message };
  }

  // Upsert (insere/atualiza) pela chave única `codigo`.
  const { error } = await db.from("planos_cota").upsert(rows, { onConflict: "codigo" });
  if (error) return { ok: false, mensagem: "Erro ao salvar: " + error.message };

  revalidatePath("/admin/planos");
  const avisos = v.problemas.filter((p) => p.nivel === "aviso").length;
  return { ok: true, mensagem: `Planos salvos.${avisos > 0 ? ` (${avisos} aviso${avisos > 1 ? "s" : ""} de não linearidade — sem bloquear.)` : ""}` };
}
