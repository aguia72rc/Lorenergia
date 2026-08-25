import { createClient } from "@/lib/supabase/server";
import PlanosEditor from "@/components/PlanosEditor";
import type { LinhaPlano } from "./actions";

export const dynamic = "force-dynamic";

interface PlanoRow {
  codigo: string;
  kwh_min: number;
  kwh_max: number;
  ativo: boolean;
}

export default async function PlanosPage() {
  const supabase = createClient();
  const { data } = await supabase.from("planos_cota").select("codigo, kwh_min, kwh_max, ativo").order("kwh_min", { ascending: true });

  const iniciais: LinhaPlano[] = ((data ?? []) as PlanoRow[]).map((p) => ({
    codigo: p.codigo,
    kwh_min: Number(p.kwh_min),
    kwh_max: Number(p.kwh_max),
    ativo: p.ativo,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>Planos do simulador</h1>
        <p className="text-sm text-slate-400">
          Faixas de consumo (kWh) usadas pelo simulador de economia. A Lorenergia não cobra mensalidade — o plano define apenas a faixa e a energia compensada. Tudo fica no banco.
        </p>
      </div>

      {iniciais.length === 0 ? (
        <div className="card"><p className="text-sm text-amber-300">Nenhum plano cadastrado. Rode a migração do simulador (semente) ou adicione planos abaixo.</p>
          <div className="mt-3"><PlanosEditor iniciais={[]} /></div>
        </div>
      ) : (
        <PlanosEditor iniciais={iniciais} />
      )}
    </div>
  );
}
