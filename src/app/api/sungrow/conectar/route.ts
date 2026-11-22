import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getSessao } from "@/lib/auth";
import { urlAutorizacao } from "@/lib/sungrow";
import { sungrowAppId, sungrowConfigurado, sungrowRedirectUri, sungrowServidor } from "@/lib/sungrow-servidor";

export const dynamic = "force-dynamic";

/** Admin clica em "Conectar": vai para a página de autorização da iSolarCloud. */
export async function GET(request: NextRequest) {
  // A volta da Sungrow cai no endereço cadastrado (ex.: lorenergia.com.br). O cookie de
  // segurança e a sessão precisam ser desse mesmo endereço: se o admin entrou por outro
  // (www, vercel.app), recomeça por lá.
  const retorno = new URL(sungrowRedirectUri());
  const host = request.headers.get("x-forwarded-host") ?? request.nextUrl.host;
  if (host !== retorno.host && !request.nextUrl.hostname.endsWith("localhost")) {
    return NextResponse.redirect(`${retorno.origin}/api/sungrow/conectar`);
  }

  const sessao = await getSessao();
  if (sessao?.profile?.role !== "admin") {
    return NextResponse.redirect(new URL("/login?redirect=/admin/usinas", request.url));
  }
  if (!sungrowConfigurado()) {
    return NextResponse.redirect(new URL("/admin/usinas?erro=config", request.url));
  }
  const state = randomBytes(16).toString("base64url");
  const res = NextResponse.redirect(urlAutorizacao(sungrowServidor(), sungrowAppId(), sungrowRedirectUri(), state));
  // Confere na volta que a autorização foi iniciada aqui (15 minutos).
  res.cookies.set("sg_state", state, { httpOnly: true, secure: true, sameSite: "lax", path: "/api/sungrow", maxAge: 15 * 60 });
  return res;
}
