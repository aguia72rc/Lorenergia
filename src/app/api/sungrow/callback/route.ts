import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getSessao } from "@/lib/auth";
import { conectarComCodigo } from "@/lib/sungrow-servidor";

export const dynamic = "force-dynamic";

const iguais = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Volta da iSolarCloud com ?code=…&state=…: troca o código pelos tokens. */
export async function GET(request: NextRequest) {
  const destino = (q: string) => {
    const res = NextResponse.redirect(new URL(`/admin/usinas?${q}`, request.url));
    res.cookies.delete({ name: "sg_state", path: "/api/sungrow" });
    return res;
  };

  const sessao = await getSessao();
  if (sessao?.profile?.role !== "admin") {
    return NextResponse.redirect(new URL("/login?redirect=/admin/usinas", request.url));
  }

  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");
  const esperado = request.cookies.get("sg_state")?.value;

  // Sem o cookie, a autorização não foi iniciada por este admin (ou passou de 15 min).
  if (!esperado) return destino("erro=expirou");
  // A iSolarCloud devolve o state; se vier, tem de ser o mesmo.
  if (state && !iguais(state, esperado)) return destino("erro=state");
  if (!code || code.length > 4096) return destino("erro=negado");

  try {
    await conectarComCodigo(code, sessao.email);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao conectar.";
    return destino(`erro=troca&msg=${encodeURIComponent(msg.slice(0, 200))}`);
  }
  return destino("ok=1");
}
