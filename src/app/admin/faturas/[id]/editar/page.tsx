import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import NovaFaturaForm, { type FaturaEdicao } from "@/components/NovaFaturaForm";
import { formatReferencia } from "@/lib/format";
import type { Fatura } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditarFaturaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("faturas")
    .select("*, clientes(id, nome, unidade, desconto_percentual)")
    .eq("id", id)
    .single();
  if (!data) notFound();

  const f = data as Fatura & {
    clientes: { id: string; nome: string; unidade: string | null; desconto_percentual: number } | null;
  };
  if (!f.clientes) notFound();

  // Faturas anteriores à migração 0026 guardam só o valor em R$: derivamos a tarifa
  // (valor ÷ consumo) para que a edição não perca a TUSD GD II.
  const consumo = Number(f.consumo_kwh);
  const tarifaGd2 =
    Number(f.tarifa_gd2) > 0
      ? Number(f.tarifa_gd2)
      : consumo > 0 && Number(f.taxa_energia_solar) > 0
        ? Math.round((Number(f.taxa_energia_solar) / consumo) * 1e6) / 1e6
        : 0;

  // Desconto no Fio B (tabela só do admin, migração 0029): valor normal e %. Ausente = sem desconto.
  const { data: fiob } = await supabase
    .from("faturas_fiob_desconto")
    .select("bruto, desconto_percentual")
    .eq("fatura_id", id)
    .maybeSingle();

  // Histórico de alterações (tabela só do admin, migração 0030). Ausente = lista vazia.
  const { data: historico } = await supabase
    .from("faturas_historico")
    .select("id, evento, detalhes, autor_email, created_at")
    .eq("fatura_id", id)
    .order("created_at", { ascending: false })
    .limit(30);
  const eventos = (historico ?? []) as { id: string; evento: string; detalhes: Record<string, unknown> | null; autor_email: string | null; created_at: string }[];

  const edicao: FaturaEdicao = {
    id: f.id,
    cliente_id: f.cliente_id,
    referencia: f.referencia,
    leitura_anterior: f.leitura_anterior,
    leitura_atual: f.leitura_atual,
    fator_multiplicador: Number(f.fator_multiplicador) || 1,
    consumo_kwh: Number(f.consumo_kwh),
    tarifa_tusd: Number(f.tarifa_tusd),
    tarifa_te: Number(f.tarifa_te),
    tarifa_gd2: tarifaGd2,
    taxa_energia_solar: Number(f.taxa_energia_solar),
    fio_b_normal: fiob ? Number(fiob.bruto) : null,
    desconto_fio_b: fiob ? Number(fiob.desconto_percentual) : null,
    adicional_bandeira: Number(f.adicional_bandeira),
    taxa_iluminacao: Number(f.taxa_iluminacao),
    multa_juros: Number(f.multa_juros),
    icms: Number(f.icms),
    pis: Number(f.pis),
    cofins: Number(f.cofins),
    desconto_percentual: Number(f.desconto_percentual),
    data_emissao: f.data_emissao,
    vencimento: f.vencimento,
    status: f.status,
    observacoes: f.observacoes,
    publicada: f.publicada !== false,
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/admin/faturas" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-white">Editar fatura</h1>
        <p className="text-sm capitalize text-slate-400">
          {f.clientes.nome} · {formatReferencia(f.referencia)}
        </p>
      </div>

      <NovaFaturaForm
        clientes={[f.clientes]}
        ultimaLeitura={{}}
        tarifas={{ tusd: 0, te: 0, bandeira: 0, tarifaGd2: 0, iluminacao: 0 }}
        referenciaPadrao={f.referencia.slice(0, 7)}
        fatura={edicao}
      />

      {eventos.length > 0 && (
        <div className="card">
          <h2 className="mb-3 font-semibold text-white">Histórico desta fatura</h2>
          <ul className="space-y-2 text-sm">
            {eventos.map((e) => (
              <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-b border-white/5 pb-2 last:border-0 last:pb-0">
                <span className="text-slate-200">{descreverEvento(e.evento, e.detalhes)}</span>
                <span className="text-xs text-slate-400">
                  {e.autor_email ?? "—"} · {new Date(e.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Recife" })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const SITUACAO: Record<string, string> = { pendente: "Pendente", paga: "Paga", cancelada: "Cancelada" };

function descreverEvento(evento: string, d: Record<string, unknown> | null): string {
  const sit = (v: unknown) => SITUACAO[String(v)] ?? String(v ?? "—");
  switch (evento) {
    case "SITUACAO":
      return `Situação: ${sit(d?.de)} → ${sit(d?.para)}`;
    case "CRIADA_OU_EDITADA":
      return "Fatura salva (criada ou editada)";
    case "LOTE":
      return "Fatura salva pelo lote do mês";
    case "PUBLICADA":
      return d?.em_lote ? "Publicada (mês inteiro)" : "Publicada para o cliente";
    case "LEMBRETE":
      return "Lembrete de vencimento enviado pelo WhatsApp";
    case "EXCLUIDA":
      return "Fatura excluída";
    case "DESPUBLICADA":
      return "Voltou para rascunho";
    default:
      return evento;
  }
}
