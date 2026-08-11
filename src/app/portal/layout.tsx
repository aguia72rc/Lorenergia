import Link from "next/link";
import { redirect } from "next/navigation";
import { Sun, LogOut, KeyRound } from "lucide-react";
import { getSessao } from "@/lib/auth";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const sessao = await getSessao();
  if (!sessao) redirect("/login?redirect=/portal");
  if (sessao.profile?.role === "admin") redirect("/admin");

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Sun className="h-6 w-6 text-brand-500" />
            <span className="font-bold text-slate-900">Lorenergia</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">{sessao.email}</span>
            <Link href="/portal/senha" className="btn-outline">
              <KeyRound className="h-4 w-4" /> Trocar senha
            </Link>
            <form action="/auth/signout" method="post">
              <button type="submit" className="btn-outline">
                <LogOut className="h-4 w-4" /> Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}
