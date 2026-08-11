"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, Trash2, Send, KeyRound, Copy, Check } from "lucide-react";
import { excluirCliente, convidarMorador, gerarAcessoMorador } from "@/app/admin/clientes/actions";

export default function ClienteRowActions({ id, temEmail }: { id: string; temEmail: boolean }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [senha, setSenha] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  function onExcluir() {
    if (!confirm("Excluir este morador? As faturas dele também serão removidas.")) return;
    startTransition(async () => {
      await excluirCliente(id);
    });
  }

  function onConvidar() {
    setMsg(null);
    setSenha(null);
    startTransition(async () => {
      const r = await convidarMorador(id);
      setMsg(r.mensagem);
    });
  }

  function onGerarAcesso() {
    if (!confirm("Gerar uma nova senha temporária para este morador? (a senha atual, se houver, deixa de valer)")) return;
    setMsg(null);
    setSenha(null);
    setCopiado(false);
    startTransition(async () => {
      const r = await gerarAcessoMorador(id);
      if (r.ok && r.senha) setSenha(r.senha);
      else setMsg(r.mensagem);
    });
  }

  function copiar() {
    if (!senha) return;
    navigator.clipboard?.writeText(senha);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center justify-end gap-1">
        {msg && <span className="mr-2 text-xs text-slate-400">{msg}</span>}
        {temEmail && (
          <>
            <button
              onClick={onGerarAcesso}
              disabled={pending}
              title="Gerar senha de acesso (troca no 1º acesso)"
              className="rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-brand-300"
            >
              <KeyRound className="h-4 w-4" />
            </button>
            <button
              onClick={onConvidar}
              disabled={pending}
              title="Convidar por e-mail (link mágico)"
              className="rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-eco-300"
            >
              <Send className="h-4 w-4" />
            </button>
          </>
        )}
        <Link href={`/admin/clientes/${id}`} title="Editar" className="rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-brand-300">
          <Pencil className="h-4 w-4" />
        </Link>
        <button onClick={onExcluir} disabled={pending} title="Excluir" className="rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-red-400">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {senha && (
        <div className="flex items-center gap-2 rounded-lg bg-brand-500/10 px-2.5 py-1.5 text-xs">
          <span className="text-slate-300">Senha temporária:</span>
          <code className="font-mono font-bold text-white">{senha}</code>
          <button onClick={copiar} title="Copiar" className="text-slate-400 hover:text-brand-300">
            {copiado ? <Check className="h-3.5 w-3.5 text-eco-600" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}
    </div>
  );
}
