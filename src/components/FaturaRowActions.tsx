"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Eye, EyeOff, Pencil, Trash2, CheckCircle2, RotateCcw } from "lucide-react";
import { atualizarStatusFatura, despublicarFatura, excluirFatura } from "@/app/admin/faturas/actions";
import WhatsAppButton from "@/components/WhatsAppButton";
import { PublicarFaturaButton } from "@/components/PublicarButtons";
import type { StatusFatura } from "@/lib/types";

export default function FaturaRowActions({
  id,
  status,
  publicada = true,
  nome,
  whatsappLink,
  whatsappEnviadoEm,
}: {
  id: string;
  status: StatusFatura;
  publicada?: boolean;
  nome?: string | null;
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

  function onDespublicar() {
    if (!confirm("Despublicar esta fatura? Ela volta para rascunho e o cliente deixa de vê-la.")) return;
    startTransition(async () => {
      await despublicarFatura(id);
    });
  }

  function onExcluir() {
    if (!confirm("Excluir esta fatura?")) return;
    startTransition(async () => {
      await excluirFatura(id);
    });
  }

  const botaoIcone = "rounded-md p-1.5 text-slate-400 hover:bg-white/5";

  return (
    <div className="flex items-center justify-end gap-1">
      {publicada ? (
        <WhatsAppButton faturaId={id} link={whatsappLink} enviadoEm={whatsappEnviadoEm} />
      ) : (
        <>
          <Link href={`/admin/faturas/${id}/editar`} title="Editar rascunho" className={`${botaoIcone} hover:text-brand-300`}>
            <Pencil className="h-4 w-4" />
          </Link>
          <PublicarFaturaButton id={id} nome={nome} className="btn-eco px-2.5 py-1 text-xs" />
        </>
      )}
      <Link href={`/fatura/${id}`} title="Ver fatura" className={`${botaoIcone} hover:text-brand-300`}>
        <Eye className="h-4 w-4" />
      </Link>
      {publicada && (
        <>
          <button
            onClick={alternarPaga}
            disabled={pending}
            title={status === "paga" ? "Marcar como pendente" : "Marcar como paga"}
            className={`${botaoIcone} ${status === "paga" ? "hover:text-amber-600" : "hover:text-eco-300"}`}
          >
            {status === "paga" ? <RotateCcw className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          </button>
          <button onClick={onDespublicar} disabled={pending} title="Despublicar (volta a rascunho)" className={`${botaoIcone} hover:text-sky-300`}>
            <EyeOff className="h-4 w-4" />
          </button>
        </>
      )}
      <button onClick={onExcluir} disabled={pending} title="Excluir" className={`${botaoIcone} hover:text-red-400`}>
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
