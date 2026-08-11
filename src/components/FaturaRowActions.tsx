"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Eye, Trash2, CheckCircle2, RotateCcw } from "lucide-react";
import { atualizarStatusFatura, excluirFatura } from "@/app/admin/faturas/actions";
import WhatsAppButton from "@/components/WhatsAppButton";
import type { StatusFatura } from "@/lib/types";

export default function FaturaRowActions({
  id,
  status,
  whatsappLink,
  whatsappEnviadoEm,
}: {
  id: string;
  status: StatusFatura;
  whatsappLink: string;
  whatsappEnviadoEm: string | null;
}) {
  const [pending, startTransition] = useTransition();

  function alternarPaga() {
    const novo: StatusFatura = status === "paga" ? "pendente" : "paga";
    startTransition(async () => {
      await atualizarStatusFatura(id, novo);
    });
  }

  function onExcluir() {
    if (!confirm("Excluir esta fatura?")) return;
    startTransition(async () => {
      await excluirFatura(id);
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <WhatsAppButton faturaId={id} link={whatsappLink} enviadoEm={whatsappEnviadoEm} />
      <Link href={`/fatura/${id}`} title="Ver fatura" className="rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-brand-300">
        <Eye className="h-4 w-4" />
      </Link>
      <button
        onClick={alternarPaga}
        disabled={pending}
        title={status === "paga" ? "Marcar como pendente" : "Marcar como paga"}
        className={`rounded-md p-1.5 hover:bg-white/5 ${status === "paga" ? "text-slate-400 hover:text-amber-600" : "text-slate-400 hover:text-eco-300"}`}
      >
        {status === "paga" ? <RotateCcw className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
      </button>
      <button onClick={onExcluir} disabled={pending} title="Excluir" className="rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-red-400">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
