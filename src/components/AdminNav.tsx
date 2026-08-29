"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, LayoutDashboard, Users, FileText, BarChart3, Settings, LogOut, Target, KanbanSquare, Radar, SlidersHorizontal, Gauge } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const itens = [
  { href: "/admin", label: "Painel", icon: LayoutDashboard },
  { href: "/admin/leads/scanner", label: "Scanner", icon: Radar },
  { href: "/admin/leads", label: "Leads", icon: Target },
  { href: "/admin/leads/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/admin/clientes", label: "Moradores", icon: Users },
  { href: "/admin/faturas", label: "Faturas", icon: FileText },
  { href: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/admin/planos", label: "Planos", icon: SlidersHorizontal },
  { href: "/admin/parametros", label: "Parâmetros", icon: Gauge },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export default function AdminNav({ email }: { email: string | null }) {
  const pathname = usePathname();

  return (
    <aside className="glass flex w-full flex-col border-x-0 border-t-0 md:h-screen md:w-64 md:border-b-0 md:border-r">
      <div className="flex items-center gap-2.5 px-5 py-4">
        <span className="relative inline-flex h-7 w-7 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-brand-500/30 blur-md animate-pulse-glow" />
          <Sun className="relative h-6 w-6 text-brand-400" />
        </span>
        <span className="font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>Lorenergia</span>
        <ThemeToggle className="ml-auto" />
      </div>
      <nav className="flex flex-1 gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
        {itens.map(({ href, label, icon: Icon }) => {
          const ativo = href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                ativo
                  ? "bg-brand-500/15 text-brand-300 shadow-[inset_0_0_0_1px_rgba(255,176,32,0.25)]"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="hidden border-t border-white/10 p-3 md:block">
        <p className="mb-2 truncate px-2 text-xs text-slate-500">{email}</p>
        <form action="/auth/signout" method="post">
          <button type="submit" className="btn-outline w-full">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
