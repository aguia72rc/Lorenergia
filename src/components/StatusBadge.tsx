import type { StatusFatura } from "@/lib/types";

const estilos: Record<StatusFatura, string> = {
  pendente: "bg-amber-100 text-amber-800",
  paga: "bg-eco-100 text-eco-700",
  cancelada: "bg-slate-200 text-slate-600",
};

const rotulos: Record<StatusFatura, string> = {
  pendente: "Pendente",
  paga: "Paga",
  cancelada: "Cancelada",
};

export default function StatusBadge({ status }: { status: StatusFatura }) {
  return <span className={`badge ${estilos[status]}`}>{rotulos[status]}</span>;
}
