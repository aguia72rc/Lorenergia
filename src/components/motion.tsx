"use client";

import { motion, useMotionValue, animate, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { formatBRL, formatKwh } from "@/lib/format";

type FormatoNumero = "int" | "brl" | "kwh";

function formatar(n: number, formato: FormatoNumero): string {
  if (formato === "brl") return formatBRL(n);
  if (formato === "kwh") return formatKwh(Math.round(n));
  return String(Math.round(n));
}

/** Revela o conteúdo com fade + leve subida quando entra na tela. */
export function Reveal({
  children,
  delay = 0,
  y = 16,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Número que "conta" até o valor quando aparece na tela. */
export function AnimatedNumber({
  value,
  format = "int",
  className,
}: {
  value: number;
  format?: FormatoNumero;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const [texto, setTexto] = useState(formatar(reduce ? value : 0, format));

  useEffect(() => {
    if (reduce) {
      setTexto(formatar(value, format));
      return;
    }
    const controls = animate(mv, value, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setTexto(formatar(v, format)),
    });
    return () => controls.stop();
  }, [value, reduce]); // eslint-disable-line react-hooks/exhaustive-deps

  return <span className={className}>{texto}</span>;
}
