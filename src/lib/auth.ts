import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** Retorna o usuário autenticado e seu profile (ou null se deslogado). */
export async function getSessao(): Promise<{
  userId: string;
  email: string | null;
  profile: Profile | null;
} | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { userId: user.id, email: user.email ?? null, profile: (profile as Profile) ?? null };
}
