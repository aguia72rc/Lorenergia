"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Sun } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function entrarComSenha(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setAviso(null);
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setCarregando(false);
    if (error) {
      setErro("E-mail ou senha inválidos.");
      return;
    }
    router.push(params.get("redirect") || "/");
    router.refresh();
  }

  async function enviarLinkMagico() {
    if (!email) {
      setErro("Digite seu e-mail para receber o link.");
      return;
    }
    setErro(null);
    setCarregando(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setCarregando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setAviso("Enviamos um link de acesso para o seu e-mail. Verifique a caixa de entrada.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center">
          <Sun className="h-10 w-10 text-brand-500" />
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Lorenergia</h1>
          <p className="text-sm text-slate-500">Acesse sua conta</p>
        </div>

        <form onSubmit={entrarComSenha} className="card space-y-4">
          <div>
            <label className="label" htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="senha">Senha</label>
            <input
              id="senha"
              type="password"
              autoComplete="current-password"
              className="input"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}
          {aviso && <p className="text-sm text-eco-700">{aviso}</p>}

          <button type="submit" className="btn-primary w-full" disabled={carregando}>
            {carregando ? "Entrando..." : "Entrar"}
          </button>

          <button
            type="button"
            onClick={enviarLinkMagico}
            className="btn-outline w-full"
            disabled={carregando}
          >
            Entrar com link por e-mail
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          <Link href="/" className="hover:underline">← Voltar ao início</Link>
        </p>
      </div>
    </main>
  );
}
