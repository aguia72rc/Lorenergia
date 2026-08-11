"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { concluirTrocaSenha } from "@/app/portal/actions";

export default function TrocarSenhaPage() {
  const router = useRouter();
  const supabase = createClient();

  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (senha.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirma) {
      setErro("As senhas não conferem.");
      return;
    }

    setCarregando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) {
      setCarregando(false);
      setErro(error.message);
      return;
    }
    await concluirTrocaSenha();
    setCarregando(false);
    router.push("/portal");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-2 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
          <KeyRound className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Defina sua senha</h1>
        <p className="mt-1 text-sm text-slate-500">
          Este é seu primeiro acesso. Crie uma senha pessoal para continuar.
        </p>
      </div>

      <form onSubmit={salvar} className="card space-y-4">
        <div>
          <label className="label" htmlFor="senha">Nova senha</label>
          <input id="senha" type="password" autoComplete="new-password" className="input" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="confirma">Confirmar senha</label>
          <input id="confirma" type="password" autoComplete="new-password" className="input" value={confirma} onChange={(e) => setConfirma(e.target.value)} required />
        </div>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <button type="submit" className="btn-primary w-full" disabled={carregando}>
          {carregando ? "Salvando..." : "Salvar e continuar"}
        </button>
      </form>
    </div>
  );
}
