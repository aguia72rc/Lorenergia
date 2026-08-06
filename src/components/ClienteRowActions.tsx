"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, Trash2, Send } from "lucide-react";
import { excluirCliente, convidarMorador } from "@/app/admin/clientes/actions";

export default function ClienteRowActions({ id, temEmail }: { id: string; temEmail: boolean }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function onExcluir() {
    if (!confirm("Excluir este morador? As faturas dele também serão removidas.")) return;
    startTransition(async () => {
      await excluirCliente(id);
    });
  }

  function onConvidar() {
    setMsg(null);
    startTransition(async () => {
      const r = await convidarMorador(id);
      setMsg(r.mensagem);
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {msg && <span className="mr-2 text-xs text-slate-500">{msg}</span>}
      {temEmail && (
        <button
          onClick={onConvidar}
          disabled={pending}
          title="Convidar para o portal por e-mail"
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-eco-700"
        >
          <Send className="h-4 w-4" />
        </button>
      )}
      <Link
        href={`/admin/clientes/${id}`}
        title="Editar"
        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-700"
      >
        <Pencil className="h-4 w-4" />
      </Link>
      <button
        onClick={onExcluir}
        disabled={pending}
        title="Excluir"
        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
