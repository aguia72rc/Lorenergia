import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-5xl">☀️</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Página não encontrada</h1>
      <p className="mt-2 text-slate-500">O conteúdo que você procura não existe ou foi movido.</p>
      <Link href="/" className="btn-primary mt-6">Voltar ao início</Link>
    </div>
  );
}
