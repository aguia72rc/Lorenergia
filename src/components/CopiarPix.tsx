"use client";

import { useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * Código "PIX copia e cola" com botão de copiar. É o que resolve para quem abre a
 * fatura no celular (não dá para escanear a própria tela): o código já leva o valor.
 */
export default function CopiarPix({ codigo }: { codigo: string }) {
  const [copiado, setCopiado] = useState(false);
  const campo = useRef<HTMLTextAreaElement>(null);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo);
    } catch {
      // Navegador sem permissão de área de transferência: seleciona o texto para copiar à mão.
      campo.current?.focus();
      campo.current?.select();
      try {
        document.execCommand("copy");
      } catch {
        return;
      }
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  return (
    <div className="mt-2">
      <textarea
        ref={campo}
        readOnly
        rows={2}
        value={codigo}
        aria-label="Código PIX copia e cola"
        onFocus={(e) => e.currentTarget.select()}
        className="block w-full resize-none break-all rounded-lg border border-slate-200 bg-slate-50 p-2 font-mono text-[11px] leading-snug text-slate-700"
      />
      <button
        type="button"
        onClick={copiar}
        className="no-print mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto"
      >
        {copiado ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
        {copiado ? "Código copiado" : "Copiar código PIX"}
      </button>
      <p className="no-print mt-1.5 text-xs text-slate-500" aria-live="polite">
        {copiado ? "Agora abra o app do banco e escolha PIX copia e cola." : "No app do banco, escolha PIX copia e cola. O valor já vem preenchido."}
      </p>
    </div>
  );
}
