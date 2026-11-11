import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (antigo "middleware") que:
 *  1) mantém a sessão do Supabase atualizada (renova cookies);
 *  2) protege as áreas /admin e /portal exigindo usuário autenticado;
 *  3) na página inicial, manda quem já está logado direto para o sistema —
 *     assim a landing pode ficar em cache para os visitantes.
 */
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const naInicial = path === "/";

  // Visitante sem cookie de sessão na landing: nada a conferir (não consulta o Supabase).
  if (naInicial && !request.cookies.getAll().some((c) => c.name.startsWith("sb-"))) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (naInicial) {
    if (!user) return response;
    // Logado: o portal encaminha o admin para /admin.
    const url = request.nextUrl.clone();
    url.pathname = "/portal";
    return NextResponse.redirect(url);
  }

  const protegida = path.startsWith("/admin") || path.startsWith("/portal");

  if (protegida && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", path);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/", "/admin/:path*", "/portal/:path*"],
};
