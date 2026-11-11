import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { hojeISO } from "@/lib/format";
import { montarCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

const SITUACAO: Record<string, string> = { pendente: "Pendente", paga: "Paga", cancelada: "Cancelada" };

/** Exporta as faturas (mesmos filtros da lista: ?status= e ?mes=YYYY-MM) em CSV para Excel. */
export async function GET(request: NextRequest) {
  const sessao = await getSessao();
  if (sessao?.profile?.role !== "admin") {
    return NextResponse.json({ erro: "Acesso negado." }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const status = sp.get("status") ?? "todas";
  const mes = sp.get("mes");
  const referencia = mes && /^\d{4}-\d{1,2}$/.test(mes) ? `${mes.split("-")[0]}-${mes.split("-")[1].padStart(2, "0")}-01` : null;

  const supabase = await createClient();
  let query = supabase
    .from("faturas")
    .select("*, clientes(nome, unidade)")
    .order("referencia", { ascending: false })
    .order("created_at", { ascending: false });

  if (status === "rascunho") query = query.eq("publicada", false);
  else if (status === "vencidas") query = query.eq("publicada", true).eq("status", "pendente").lt("vencimento", hojeISO());
  else if (["pendente", "paga", "cancelada"].includes(status)) query = query.eq("publicada", true).eq("status", status);
  if (referencia) query = query.eq("referencia", referencia);

  const { data, error } = await query;
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  type Linha = Record<string, unknown> & { clientes: { nome?: string; unidade?: string | null } | null };
  const linhas = ((data ?? []) as Linha[]).map((f) => [
    String(f.referencia ?? "").slice(0, 7),
    f.clientes?.nome ?? "",
    f.clientes?.unidade ?? "",
    Number(f.consumo_kwh) || 0,
    Number(f.valor_bruto) || 0,
    Number(f.valor_desconto) || 0,
    Number(f.taxa_energia_solar) || 0,
    Number(f.valor_liquido) || 0,
    Number(f.economia) || 0,
    String(f.vencimento ?? ""),
    SITUACAO[String(f.status)] ?? String(f.status ?? ""),
    f.publicada === false ? "Rascunho" : "Publicada",
    f.pago_em ? String(f.pago_em).slice(0, 10) : "",
  ]);

  const csv = montarCsv(
    ["Mês", "Morador", "Unidade", "Consumo (kWh)", "Valor bruto (R$)", "Desconto (R$)", "TUSD GD II (R$)", "A pagar (R$)", "Economia (R$)", "Vencimento", "Situação", "Publicação", "Paga em"],
    linhas
  );

  const nome = `faturas-lorenergia${referencia ? "-" + referencia.slice(0, 7) : ""}${status !== "todas" ? "-" + status : ""}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nome}"`,
      "Cache-Control": "no-store",
    },
  });
}
