"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

type Tema = "dark" | "light";

/**
 * Botão de alternância entre modo escuro e claro.
 * Persiste a escolha em localStorage e aplica via data-theme no <html>.
 * O tema inicial é definido por um script inline no layout (sem flash).
 */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [tema, setTema] = useState<Tema>("dark");
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    const atual = (document.documentElement.getAttribute("data-theme") as Tema) || "dark";
    setTema(atual);
    setMontado(true);
  }, []);

  function alternar() {
    const novo: Tema = tema === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", novo);
    try {
      localStorage.setItem("tema", novo);
    } catch {
      /* storage indisponível */
    }
    setTema(novo);
  }

  const proximo = tema === "dark" ? "claro" : "escuro";

  return (
    <button
      type="button"
      onClick={alternar}
      className={`btn-outline !px-2.5 ${className}`}
      aria-label={`Ativar modo ${proximo}`}
      title={`Ativar modo ${proximo}`}
    >
      {/* Antes de montar, mostra um ícone neutro para casar com o SSR. */}
      {!montado || tema === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
