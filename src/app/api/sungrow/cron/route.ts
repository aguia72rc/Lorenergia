import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { lerUsinas } from "@/lib/sungrow-servidor";

export const dynamic = "force-dynamic";

/**
 * Leitura diária agendada (vercel.json, 21h do Recife): grava a geração do dia
 * mesmo que ninguém abra o painel, para o total do mês ficar completo.
 * A Vercel envia "Authorization: Bearer <CRON_SECRET>".
 */
export async function GET(request: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  const recebido = request.headers.get("authorization") ?? "";
  const esperado = `Bearer ${segredo}`;
  if (!segredo || recebido.length !== esperado.length || !timingSafeEqual(Buffer.from(recebido), Buffer.from(esperado))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const estado = await lerUsinas({ forcar: true });
  return NextResponse.json({ ok: !estado.erro, usinas: estado.usinas.length, erro: estado.erro });
}
