"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Eye, Trash2, CheckCircle2, RotateCcw } from "lucide-react";
import { atualizarStatusFatura, excluirFatura } from "@/app/admin/faturas/actions";
import type { StatusFatura } from "@/lib/types";

export default function FaturaRowActions({
  id,
  status,
  whatsappLink,
}: {
  id: string;
  status: StatusFatura;
  whatsappLink: string;
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
      <a
        href={whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        title="Enviar pelo WhatsApp"
        className="inline-flex items-center gap-1 rounded-md bg-eco-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-eco-700"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
          <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.9-4.44 9.9-9.9S17.5 2 12.04 2zm5.8 14.16c-.24.68-1.4 1.3-1.94 1.34-.5.05-.98.23-3.3-.69-2.78-1.1-4.55-3.94-4.69-4.13-.14-.19-1.13-1.5-1.13-2.86s.72-2.03.98-2.31c.24-.26.53-.32.71-.32.18 0 .35 0 .5.01.16.01.38-.06.59.45.24.58.8 2 .87 2.14.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.14-.28.29-.12.56.16.28.72 1.18 1.54 1.91 1.06.94 1.95 1.24 2.23 1.38.28.14.44.12.6-.07.16-.19.69-.8.87-1.08.18-.28.36-.23.61-.14.25.09 1.58.75 1.85.89.28.14.46.21.53.32.07.12.07.66-.17 1.34z" />
        </svg>
        WhatsApp
      </a>
      <Link href={`/fatura/${id}`} title="Ver fatura" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-700">
        <Eye className="h-4 w-4" />
      </Link>
      <button
        onClick={alternarPaga}
        disabled={pending}
        title={status === "paga" ? "Marcar como pendente" : "Marcar como paga"}
        className={`rounded-md p-1.5 hover:bg-slate-100 ${status === "paga" ? "text-slate-400 hover:text-amber-600" : "text-slate-500 hover:text-eco-700"}`}
      >
        {status === "paga" ? <RotateCcw className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
      </button>
      <button onClick={onExcluir} disabled={pending} title="Excluir" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
