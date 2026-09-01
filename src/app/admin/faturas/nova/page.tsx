import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import NovaFaturaForm from "@/components/NovaFaturaForm";
import { primeiroDiaMesAtual } from "@/lib/format";
import { ultimaLeituraPorCliente } from "@/lib/leituras";

export const dynamic = "force-dynamic";

export default async function NovaFaturaPage() {
  const supabase = await createClient();

  const [{ data: clientes }, { data: config }, ultimaLeitura] = await Promise.all([
    supabase.from("clientes").select("id, nome, unidade, desconto_percentual").eq("ativo", true).order("nome"),
    supabase.from("configuracoes").select("tarifa_tusd, tarifa_te, adicional_bandeira, taxa_energia_solar, taxa_iluminacao_publica").eq("id", 1).single(),
    ultimaLeituraPorCliente(supabase),
  ]);

  const refAtual = primeiroDiaMesAtual().slice(0, 7); // YYYY-MM

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/admin/faturas" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <h1 className="text-2xl font-bold text-white">Nova fatura</h1>

      {(clientes ?? []).length === 0 ? (
        <div className="card flex flex-col items-center py-12 text-center">
          <Users className="h-10 w-10 text-slate-300" />
          <p className="mt-3 text-slate-300">Cadastre um morador ativo antes de gerar faturas.</p>
          <Link href="/admin/clientes/novo" className="btn-primary mt-4">Cadastrar morador</Link>
        </div>
      ) : (
        <NovaFaturaForm
          clientes={clientes ?? []}
          ultimaLeitura={ultimaLeitura}
          tarifas={{
            tusd: Number(config?.tarifa_tusd ?? 0),
            te: Number(config?.tarifa_te ?? 0),
            bandeira: Number(config?.adicional_bandeira ?? 0),
            taxaSolar: Number(config?.taxa_energia_solar ?? 0),
            iluminacao: Number(config?.taxa_iluminacao_publica ?? 0),
          }}
          referenciaPadrao={refAtual}
        />
      )}
    </div>
  );
}
