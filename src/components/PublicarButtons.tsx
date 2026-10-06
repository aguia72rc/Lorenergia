"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { publicarFatura, publicarMes } from "@/app/admin/faturas/actions";

/** Publica UMA fatura em rascunho (o cliente passa a vê-la). */
export function PublicarFaturaButton({
  id,
  nome,
  className = "btn-eco",
}: {
  id: string;
  nome?: string | null;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  function onPublicar() {
    const quem = nome ? ` para ${nome}` : "";
    if (!confirm(`Publicar esta fatura${quem}? O cliente passará a vê-la no portal.`)) return;
    startTransition(async () => {
      await publicarFatura(id);
    });
  }

  return (
    <button type="button" onClick={onPublicar} disabled={pending} className={className}>
      <Send className="h-4 w-4" /> {pending ? "Publicando…" : "Publicar"}
    </button>
  );
}

/** Publica de uma vez todos os rascunhos de um mês. */
export function PublicarMesButton({ referencia, qtd, rotuloMes }: { referencia: string; qtd: number; rotuloMes: string }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function onPublicar() {
    if (!confirm(`Publicar ${qtd} fatura(s) de ${rotuloMes}? Os clientes passarão a vê-las no portal.`)) return;
    setMsg(null);
    startTransition(async () => {
      const r = await publicarMes(referencia);
      setMsg(r.mensagem);
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      {msg && <span className="text-xs text-slate-400">{msg}</span>}
      <button type="button" onClick={onPublicar} disabled={pending} className="btn-eco">
        <Send className="h-4 w-4" /> {pending ? "Publicando…" : `Publicar o mês (${qtd})`}
      </button>
    </span>
  );
}
