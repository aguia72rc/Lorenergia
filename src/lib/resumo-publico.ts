import { createClient } from "@supabase/supabase-js";

export interface ResumoPublico {
  economiaTotal: number; // R$ somados de todas as faturas publicadas
  ultimaReferencia: string | null; // YYYY-MM-DD (mês da fatura publicada mais recente)
}

/**
 * Totais agregados e públicos para a landing page (economia gerada para os
 * clientes). Usa a função `public.resumo_publico()` do banco, que devolve só
 * números agregados — nenhum dado de morador ou de fatura.
 *
 * Nunca quebra a página: se a função ainda não existir (migração 0027 não
 * aplicada), se o banco falhar ou se não houver economia, devolve `null`.
 */
export async function getResumoPublico(): Promise<ResumoPublico | null> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !chave) return null;

    const supabase = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await supabase.rpc("resumo_publico");
    if (error || !data) return null;

    const total = Number((data as { economia_total?: unknown }).economia_total);
    if (!Number.isFinite(total) || total <= 0) return null;

    const ref = (data as { ultima_referencia?: unknown }).ultima_referencia;
    return { economiaTotal: total, ultimaReferencia: typeof ref === "string" ? ref : null };
  } catch {
    return null;
  }
}
