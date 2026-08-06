import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sessao = await getSessao();

  if (!sessao) redirect("/login?redirect=/admin");
  if (sessao.profile?.role !== "admin") {
    // Usuário logado, mas não é administrador → manda para o portal do morador.
    redirect("/portal");
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AdminNav email={sessao.email} />
      <main className="flex-1 overflow-x-hidden bg-slate-50 p-4 md:p-8">{children}</main>
    </div>
  );
}
