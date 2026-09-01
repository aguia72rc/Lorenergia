"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { validarPlanos, type PlanoDesconto } from "@/lib/simulador";

export interface LinhaPlano {
  codigo: string;
  nome: string;
  desconto_percentual: number;
  fidelidade: boolean;
  ativo: boolean;
}

/**
 * Salva a tabela inteira de planos de desconto: upsert por `codigo` e apaga os
 * removidos. Bloqueia se houver ERRO de validação (desconto fora de 0–100 etc.).
 */
export async function salvarPlanos(linhas: LinhaPlano[]): Promise<{ ok: boolean; mensagem: string }> {
  const sessao = await getSessao();
  if (sessao?.profile?.role !== "admin") return { ok: false, mensagem: "Acesso negado." };

  const rows = linhas
    .map((l) => ({
      codigo: (l.codigo ?? "").trim().toUpperCase(),
      nome: (l.nome ?? "").trim() || (l.codigo ?? "").trim().toUpperCase(),
      desconto_percentual: Number(l.desconto_percentual) || 0,
      fidelidade: !!l.fidelidade,
      ativo: l.ativo !== false,
    }))
    .filter((l) => l.codigo !== "");

  if (rows.length === 0) return { ok: false, mensagem: "Cadastre ao menos um plano." };

  const v = validarPlanos(rows as PlanoDesconto[]);
  const erros = v.problemas.filter((p) => p.nivel === "erro");
  if (erros.length > 0) return { ok: false, mensagem: "Corrija antes de salvar: " + erros[0].mensagem };

  const db = await createClient();
  const codigos = rows.map((r) => r.codigo);

  const { data: existentes } = await db.from("planos_cota").select("codigo");
  const manter = new Set(codigos);
  const remover = (existentes ?? []).map((e: { codigo: string }) => e.codigo).filter((c) => !manter.has(c));
  if (remover.length > 0) {
    const { error } = await db.from("planos_cota").delete().in("codigo", remover);
    if (error) return { ok: false, mensagem: "Erro ao remover planos: " + error.message };
  }

  const { error } = await db.from("planos_cota").upsert(rows, { onConflict: "codigo" });
  if (error) return { ok: false, mensagem: "Erro ao salvar: " + error.message };

  revalidatePath("/admin/planos");
  return { ok: true, mensagem: "Planos salvos." };
}
