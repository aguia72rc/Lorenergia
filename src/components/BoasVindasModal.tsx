"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sun, BadgePercent, TrendingUp, ShieldCheck, Leaf, X } from "lucide-react";
import { formatBRL } from "@/lib/format";

/**
 * Janela de boas-vindas exibida uma vez por sessão de login, antes do
 * morador acessar as informações. Explica os benefícios da energia solar,
 * o desconto, a economia no ano e a vantagem frente à inflação energética.
 */
export default function BoasVindasModal({
  nome,
  descontoPercentual,
  economiaAno,
  economiaTotal,
  projecaoAno,
}: {
  nome: string;
  descontoPercentual: number;
  economiaAno: number;
  economiaTotal: number;
  projecaoAno: number;
}) {
  const reduce = useReducedMotion();
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("lorenergia_boasvindas_v1") !== "1") {
        setAberto(true);
      }
    } catch {
      setAberto(true);
    }
  }, []);

  function fechar() {
    try {
      sessionStorage.setItem("lorenergia_boasvindas_v1", "1");
    } catch {
      /* ignora indisponibilidade do storage */
    }
    setAberto(false);
  }

  // Valor de economia a destacar: economia do ano corrente, com projeção
  // como fallback quando ainda não há histórico suficiente.
  const temEconomia = economiaAno > 0 || economiaTotal > 0;
  const valorAno = economiaAno > 0 ? economiaAno : projecaoAno;
  const rotuloAno = economiaAno > 0 ? "Você já economizou este ano" : "Sua economia estimada por ano";

  return (
    <AnimatePresence>
      {aberto && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="boasvindas-titulo"
        >
          <button
            aria-label="Fechar"
            onClick={fechar}
            className="absolute inset-0 cursor-default bg-slate-950/70 backdrop-blur-sm"
          />

          <motion.div
            className="relative z-10 my-auto w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-slate-900/90 shadow-2xl"
            initial={reduce ? false : { opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* brilho de fundo */}
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-eco-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -left-16 top-24 h-48 w-48 rounded-full bg-brand-500/20 blur-3xl" />

            <button
              onClick={fechar}
              aria-label="Fechar"
              className="absolute right-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative p-6 sm:p-8">
              <div className="flex flex-col items-center text-center">
                <span className="relative inline-flex h-14 w-14 items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-brand-500/30 blur-md animate-pulse-glow" />
                  <Sun className="relative h-11 w-11 text-brand-400" />
                </span>
                <h2
                  id="boasvindas-titulo"
                  className="mt-3 text-2xl font-bold text-white"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Bem-vindo(a), {nome}! ☀️
                </h2>
                <p className="mt-2 text-sm text-slate-300">
                  Você faz parte da nossa geração solar compartilhada. A energia limpa
                  produzida no prédio abastece a sua unidade — e isso traz vantagens reais
                  para o seu bolso todos os meses.
                </p>
              </div>

              {temEconomia && (
                <div
                  className="relative mt-5 overflow-hidden rounded-xl border border-eco-500/30 p-4 text-center"
                  style={{ background: "linear-gradient(120deg, rgba(16,185,129,0.22), rgba(34,211,238,0.12))" }}
                >
                  <p className="text-xs uppercase tracking-wide text-eco-200">{rotuloAno}</p>
                  <p className="mt-1 text-3xl font-extrabold text-white" style={{ fontFamily: "var(--font-display)" }}>
                    {formatBRL(valorAno)} 🌱
                  </p>
                </div>
              )}

              <div className="mt-5 space-y-3">
                <Beneficio
                  icon={<BadgePercent className="h-5 w-5" />}
                  cor="bg-eco-500/15 text-eco-300"
                  titulo={`Desconto de ${formatarPct(descontoPercentual)} garantido`}
                  texto="Você paga menos do que pagaria à distribuidora sobre toda a energia que consome. O desconto vem impresso em cada fatura."
                />
                <Beneficio
                  icon={<TrendingUp className="h-5 w-5" />}
                  cor="bg-brand-500/15 text-brand-300"
                  titulo="Economia acumulada no ano"
                  texto="Mês após mês, a economia soma. No portal você acompanha quanto já poupou no ano e desde que entrou na geração compartilhada."
                />
                <Beneficio
                  icon={<ShieldCheck className="h-5 w-5" />}
                  cor="bg-amber-500/15 text-amber-300"
                  titulo="Proteção contra a inflação da energia"
                  texto="A conta de luz sobe praticamente todo ano com reajustes e bandeiras tarifárias. Com o desconto fixo da energia solar, você fica protegido desses aumentos e paga sempre menos."
                />
                <Beneficio
                  icon={<Leaf className="h-5 w-5" />}
                  cor="bg-emerald-500/15 text-emerald-300"
                  titulo="Energia limpa e renovável"
                  texto="Além de economizar, você consome energia solar e ajuda a reduzir as emissões de CO₂. Bom para você e para o planeta."
                />
              </div>

              <button onClick={fechar} className="btn-primary mt-6 w-full">
                Ver minhas informações
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Beneficio({
  icon,
  cor,
  titulo,
  texto,
}: {
  icon: React.ReactNode;
  cor: string;
  titulo: string;
  texto: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-white/5 bg-white/5 p-3">
      <div className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cor}`}>{icon}</div>
      <div>
        <p className="text-sm font-semibold text-white">{titulo}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{texto}</p>
      </div>
    </div>
  );
}

function formatarPct(v: number): string {
  const n = Number(v) || 0;
  const s = Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
  return `${s}%`;
}
