"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, LayoutDashboard, Users, FileText, Settings, LogOut } from "lucide-react";

const itens = [
  { href: "/admin", label: "Painel", icon: LayoutDashboard },
  { href: "/admin/clientes", label: "Moradores", icon: Users },
  { href: "/admin/faturas", label: "Faturas", icon: FileText },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export default function AdminNav({ email }: { email: string | null }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-full flex-col border-b border-slate-200 bg-white md:h-screen md:w-64 md:border-b-0 md:border-r">
      <div className="flex items-center gap-2 px-5 py-4">
        <Sun className="h-6 w-6 text-brand-500" />
        <span className="font-bold text-slate-900">Lorenergia</span>
      </div>
      <nav className="flex flex-1 gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
        {itens.map(({ href, label, icon: Icon }) => {
          const ativo = href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                ativo ? "bg-brand-100 text-brand-800" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="hidden border-t border-slate-200 p-3 md:block">
        <p className="mb-2 truncate px-2 text-xs text-slate-500">{email}</p>
        <form action="/auth/signout" method="post">
          <button type="submit" className="btn-outline w-full text-slate-600">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
