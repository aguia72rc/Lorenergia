import Link from "next/link";
import { redirect } from "next/navigation";
import { Sun, Zap, Leaf, FileText } from "lucide-react";
import { getSessao } from "@/lib/auth";

export default async function HomePage() {
  const sessao = await getSessao();
  if (sessao?.profile?.role === "admin") redirect("/admin");
  if (sessao?.profile?.role === "cliente") redirect("/portal");

  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Sun className="h-7 w-7 text-brand-500" />
            <span className="text-xl font-bold text-slate-900">Lorenergia</span>
          </div>
          <Link href="/login" className="btn-primary">
            Entrar
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <span className="badge bg-eco-100 text-eco-700">☀️ Energia limpa e mais barata</span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight text-slate-900 md:text-5xl">
              Gestão da sua usina solar de forma simples
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Cadastre os moradores, calcule o consumo de cada um, gere faturas com
              desconto e envie pelo WhatsApp. Seus moradores acompanham as faturas e
              quanto economizam com a energia solar.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="btn-primary">
                Acessar o sistema
              </Link>
              <a href="#recursos" className="btn-outline">
                Ver recursos
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4" id="recursos">
            <Recurso icon={<Zap />} titulo="Cálculo automático" texto="Informe o consumo e o sistema calcula tudo, aplicando o desconto." />
            <Recurso icon={<FileText />} titulo="Faturas & WhatsApp" texto="Gere a fatura e envie pelo WhatsApp com um clique." />
            <Recurso icon={<Leaf />} titulo="Economia visível" texto="Cada morador vê quanto economiza usando energia solar." />
            <Recurso icon={<Sun />} titulo="Portal do morador" texto="Acesso próprio para ver o histórico de faturas." />
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">
        Lorenergia · Energia solar para todos ☀️
      </footer>
    </main>
  );
}

function Recurso({ icon, titulo, texto }: { icon: React.ReactNode; titulo: string; texto: string }) {
  return (
    <div className="card">
      <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
        {icon}
      </div>
      <h3 className="font-semibold text-slate-900">{titulo}</h3>
      <p className="mt-1 text-sm text-slate-600">{texto}</p>
    </div>
  );
}
