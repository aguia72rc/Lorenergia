import type { StatusFatura } from "@/lib/types";

const estilos: Record<StatusFatura, string> = {
  pendente: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/25",
  paga: "bg-eco-500/15 text-eco-300 ring-1 ring-eco-500/25",
  cancelada: "bg-white/10 text-slate-300 ring-1 ring-white/10",
};

const rotulos: Record<StatusFatura, string> = {
  pendente: "Pendente",
  paga: "Paga",
  cancelada: "Cancelada",
};

export default function StatusBadge({ status }: { status: StatusFatura }) {
  return <span className={`badge ${estilos[status]}`}>{rotulos[status]}</span>;
}
