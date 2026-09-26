"use client";

import { useState, useTransition } from "react";
import { HandCoins } from "lucide-react";
import { quitarCashback } from "@/app/admin/cashback/actions";

export default function QuitarCashbackButton({ clienteId, nome, total }: { clienteId: string; nome: string; total: string }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function onQuitar() {
    if (!confirm(`Confirmar o pagamento de ${total} de cashback para ${nome}? As faturas de cashback pendentes serão marcadas como pagas.`)) return;
    setMsg(null);
    startTransition(async () => {
      const r = await quitarCashback(clienteId);
      setMsg(r.mensagem);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={onQuitar} disabled={pending} className="btn-eco whitespace-nowrap">
        <HandCoins className="h-4 w-4" /> {pending ? "Quitando…" : "Quitar cashback"}
      </button>
      {msg && <span className="text-xs text-slate-400">{msg}</span>}
    </div>
  );
}
