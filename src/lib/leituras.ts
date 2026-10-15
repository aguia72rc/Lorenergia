import type { SupabaseClient } from "@supabase/supabase-js";
import type { UltimoVencimento } from "@/lib/vencimento";

/**
 * Retorna um mapa { cliente_id -> última leitura_atual registrada }.
 * Usado para preencher automaticamente a "leitura anterior" ao gerar
 * a próxima fatura do morador.
 */
export async function ultimaLeituraPorCliente(
  supabase: SupabaseClient
): Promise<Record<string, number>> {
  const { data } = await supabase
    .from("faturas")
    .select("cliente_id, leitura_atual, referencia")
    .not("leitura_atual", "is", null)
    .order("referencia", { ascending: false });

  const mapa: Record<string, number> = {};
  for (const linha of (data ?? []) as { cliente_id: string; leitura_atual: number }[]) {
    // Como está ordenado por referência desc, a primeira ocorrência é a mais recente.
    if (!(linha.cliente_id in mapa)) {
      mapa[linha.cliente_id] = Number(linha.leitura_atual);
    }
  }
  return mapa;
}

/**
 * Retorna { cliente_id -> última fatura com vencimento (vencimento + referência) }.
 * Usado para sugerir o vencimento da próxima fatura do morador.
 */
export async function ultimoVencimentoPorCliente(
  supabase: SupabaseClient
): Promise<Record<string, UltimoVencimento>> {
  const { data } = await supabase
    .from("faturas")
    .select("cliente_id, vencimento, referencia")
    .not("vencimento", "is", null)
    .order("referencia", { ascending: false });

  const mapa: Record<string, UltimoVencimento> = {};
  for (const l of (data ?? []) as { cliente_id: string; vencimento: string; referencia: string }[]) {
    // Ordenado por referência desc: a primeira ocorrência é a mais recente.
    if (!(l.cliente_id in mapa)) mapa[l.cliente_id] = { vencimento: l.vencimento, referencia: l.referencia };
  }
  return mapa;
}
