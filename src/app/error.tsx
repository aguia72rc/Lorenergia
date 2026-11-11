"use client";

import { useEffect } from "react";

/** Tela de erro amigável (no lugar da página em branco), com botão de tentar de novo. */
export default function Erro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="card max-w-md text-center">
        <h1 className="text-xl font-bold text-white">Não deu certo desta vez</h1>
        <p className="mt-2 text-sm text-slate-400">
          Algo falhou ao carregar esta tela ou ao salvar. Nada foi perdido: tente de novo. Se continuar, confira os dados digitados.
        </p>
        {error.digest && <p className="mt-2 text-xs text-slate-500">Código do erro: {error.digest}</p>}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={reset} className="btn-primary">Tentar de novo</button>
          {/* Navegação completa de propósito: recarrega o app do zero depois de um erro. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className="btn-outline">Voltar ao início</a>
        </div>
      </div>
    </div>
  );
}
