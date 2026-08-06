import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com a chave de serviço (service_role).
 * IGNORA o RLS - use somente no servidor e apenas quando estritamente
 * necessário (ex.: criar usuários de acesso para os moradores).
 *
 * NUNCA importe este arquivo em componentes de cliente.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}
