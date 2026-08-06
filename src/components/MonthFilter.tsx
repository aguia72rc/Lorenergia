"use client";

import { useRouter, useSearchParams } from "next/navigation";

/**
 * Seletor de mês que atualiza a URL (?mes=YYYY-MM), preservando os demais
 * parâmetros (ex.: status). "Todos os meses" remove o filtro.
 */
export default function MonthFilter({ basePath }: { basePath: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const mesAtual = params.get("mes") ?? "";

  function navegar(mes: string) {
    const novo = new URLSearchParams(params.toString());
    if (mes) novo.set("mes", mes);
    else novo.delete("mes");
    const qs = novo.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="month"
        value={mesAtual}
        onChange={(e) => navegar(e.target.value)}
        className="input w-auto py-1.5"
        aria-label="Filtrar por mês"
      />
      {mesAtual && (
        <button onClick={() => navegar("")} className="text-sm text-slate-500 hover:text-slate-800 hover:underline">
          Todos os meses
        </button>
      )}
    </div>
  );
}
