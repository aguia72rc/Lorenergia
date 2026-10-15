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
    </div>
  );
}
