import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Finaliza o login vindo do e-mail (link mágico, convite ou confirmação).
 * Trata os dois formatos que o Supabase pode enviar:
 *  - fluxo PKCE:      ?code=...
 *  - verificação OTP: ?token_hash=...&type=...
 * Em caso de falha, volta ao login com um aviso amigável.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  const supabase = createClient();
  let ok = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    ok = !error;
  }

  if (ok) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  // Link inválido/expirado ou parâmetros ausentes.
  return NextResponse.redirect(`${origin}/login?erro=link`);
}
