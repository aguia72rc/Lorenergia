import { createClient } from "@/lib/supabase/server";
import PlanosEditor from "@/components/PlanosEditor";
import type { LinhaPlano } from "./actions";

export const dynamic = "force-dynamic";

interface PlanoRow {
  codigo: string;
  nome: string;
  desconto_percentual: number;
  fidelidade: boolean;
  ativo: boolean;
}

export default async function PlanosPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("planos_cota")
    .select("codigo, nome, desconto_percentual, fidelidade, ativo")
    .order("desconto_percentual", { ascending: false });

  const iniciais: LinhaPlano[] = ((data ?? []) as PlanoRow[]).map((p) => ({
    codigo: p.codigo,
    nome: p.nome,
    desconto_percentual: Number(p.desconto_percentual),
    fidelidade: p.fidelidade,
    ativo: p.ativo,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>Planos de desconto</h1>
        <p className="text-sm text-slate-400">
          Rateio de créditos: cada plano é um percentual de desconto sobre a energia consumida (ex.: Com fidelidade 20%, Sem fidelidade 15%). Os percentuais ficam no banco — o simulador os lê automaticamente.
        </p>
      </div>

      <PlanosEditor iniciais={iniciais} />
    </div>
  );
}
