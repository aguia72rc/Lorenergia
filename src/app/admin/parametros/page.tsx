import { createClient } from "@/lib/supabase/server";
import ParametrosForm from "@/components/ParametrosForm";
import type { EntradaParametros } from "./actions";

export const dynamic = "force-dynamic";

interface Row {
  tusd: number | null;
  te: number | null;
  tarifa_tusd_te: number | null;
  icms: number | null;
  pis_cofins: number | null;
  cip: number | null;
}

export default async function ParametrosPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("parametros_energia")
    .select("tusd, te, tarifa_tusd_te, icms, pis_cofins, cip")
    .order("vigente_desde", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const p = (data ?? {}) as Row;
  const iniciais: EntradaParametros = {
    tusd: Number(p.tusd ?? p.tarifa_tusd_te ?? 0),
    te: Number(p.te ?? 0),
    icmsPct: Number(p.icms ?? 0) * 100,
    pisCofinsPct: Number(p.pis_cofins ?? 0) * 100,
    cip: Number(p.cip ?? 0),
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>Parâmetros de energia</h1>
        <p className="text-sm text-slate-400">
          Tarifa (TUSD + TE), tributos e iluminação usados pelo simulador. Tudo fica no banco — atualize aqui quando a Neoenergia reajustar (ex.: novo ciclo da ANEEL).
        </p>
      </div>
      <ParametrosForm iniciais={iniciais} />
    </div>
  );
}
