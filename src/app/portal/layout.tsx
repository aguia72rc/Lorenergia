import Link from "next/link";
import { redirect } from "next/navigation";
import { Sun, LogOut, KeyRound, ReceiptText } from "lucide-react";
import { getSessao } from "@/lib/auth";
import ThemeToggle from "@/components/ThemeToggle";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const sessao = await getSessao();
  if (!sessao) redirect("/login?redirect=/portal");
  if (sessao.profile?.role === "admin") redirect("/admin");

  return (
    <div className="min-h-screen">
      <header className="glass sticky top-0 z-10 border-x-0 border-t-0">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2.5">
            <span className="relative inline-flex h-6 w-6 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-brand-500/30 blur-md animate-pulse-glow" />
              <Sun className="relative h-6 w-6 text-brand-400" />
            </span>
            <span className="font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>Lorenergia</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">{sessao.email}</span>
            <ThemeToggle />
            <Link href="/portal?aba=recibos#lista" className="btn-outline" title="Meus recibos" aria-label="Meus recibos">
              <ReceiptText className="h-4 w-4" /> <span className="hidden sm:inline">Recibos</span>
            </Link>
            <Link href="/portal/senha" className="btn-outline" title="Trocar senha" aria-label="Trocar senha">
              <KeyRound className="h-4 w-4" /> <span className="hidden sm:inline">Trocar senha</span>
            </Link>
            <form action="/auth/signout" method="post">
              <button type="submit" className="btn-outline">
                <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sair</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}
