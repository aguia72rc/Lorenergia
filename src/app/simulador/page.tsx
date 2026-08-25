import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Sun } from "lucide-react";
import SimuladorPublico from "@/components/SimuladorPublico";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Simulador de economia",
  description: "Descubra em segundos quanto você pode economizar na conta de luz com a energia solar compartilhada da Lorenergia.",
};

export default function SimuladorPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Voltar ao site
        </Link>
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
          <Sun className="h-5 w-5 text-brand-400" /> Lorenergia
        </span>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
          Quanto você pode economizar?
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Preencha com os dados da sua conta de luz e veja na hora a faixa de economia com a energia solar compartilhada. É grátis e não compromete nada.
        </p>
      </div>

      <SimuladorPublico />

      <p className="mt-8 text-center text-xs text-slate-500">
        Geração compartilhada nos termos da Lei 14.300/2022 · A economia estimada é uma projeção, não uma garantia de desconto.
      </p>
    </main>
  );
}
