import Link from "next/link";
import { redirect } from "next/navigation";
import { Sun, Zap, FileText, Leaf, ArrowRight, ShieldCheck } from "lucide-react";
import { getSessao } from "@/lib/auth";
import { Reveal, AnimatedNumber } from "@/components/motion";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const sessao = await getSessao();
  if (sessao?.profile?.role === "admin") redirect("/admin");
  if (sessao?.profile?.role === "cliente") redirect("/portal");

  return (
    <main className="relative min-h-screen">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <span className="relative inline-flex h-9 w-9 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-brand-500/30 blur-md animate-pulse-glow" />
            <Sun className="relative h-7 w-7 text-brand-400" />
          </span>
          <span className="text-xl font-bold tracking-tight text-white" style={{ fontFamily: "var(--font-display)" }}>
            Lorenergia
          </span>
        </div>
        <Link href="/login" className="btn-primary">
          Entrar <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-10 pt-8 md:grid-cols-[1fr_1.2fr] md:pt-16">
        <div>
          <Reveal>
            <span className="eyebrow">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-400 shadow-[0_0_12px_var(--brand)]" />
              Energia que vem de casa
            </span>
          </Reveal>
          <Reveal delay={0.08}>
            <h1
              className="mt-4 text-5xl font-extrabold leading-[1.05] tracking-tight text-white md:text-6xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Sua usina solar,<br />
              <span className="grad-text">no controle total.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-slate-300">
              Cadastre os moradores, calcule o consumo, gere faturas com desconto e
              envie pelo WhatsApp. Cada morador acompanha suas faturas e o quanto
              economiza — em tempo real.
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="btn-primary">
                Acessar o sistema <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#recursos" className="btn-outline">Ver recursos</a>
            </div>
          </Reveal>

          <Reveal delay={0.32}>
            <div className="mt-12 grid max-w-md grid-cols-3 gap-4">
              <Stat valor={20} sufixo="%" label="de desconto" />
              <Stat valor={100} sufixo="%" label="energia limpa" />
              <Stat valor={24} sufixo="/7" label="acesso online" />
            </div>
          </Reveal>
        </div>

        {/* Vídeo institucional (no lugar do sol animado) */}
        <Reveal delay={0.1} className="relative mx-auto w-full max-w-xl lg:max-w-2xl">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 shadow-2xl">
            <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-brand-500/20 blur-3xl animate-pulse-glow" />
            <div className="pointer-events-none absolute -right-16 bottom-0 h-48 w-48 rounded-full bg-cyan-500/20 blur-3xl" />
            <video
              className="relative aspect-video w-full bg-black"
              autoPlay
              muted
              loop
              playsInline
              controls
              preload="auto"
            >
              <source src="/institucional.mp4" type="video/mp4" />
              Seu navegador não suporta vídeo.{" "}
              <a href="/institucional.mp4" className="underline">Baixe o vídeo</a>.
            </video>
          </div>
        </Reveal>
      </section>

      {/* Recursos */}
      <section id="recursos" className="mx-auto max-w-6xl px-5 py-16">
        <Reveal>
          <div className="mb-10 text-center">
            <span className="eyebrow justify-center">O que você faz aqui</span>
            <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
              Tudo da usina em um só lugar
            </h2>
          </div>
        </Reveal>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Recurso i={0} icon={<Zap />} titulo="Cálculo automático" texto="Informe as leituras e o sistema calcula tudo, com o desconto aplicado." />
          <Recurso i={1} icon={<FileText />} titulo="Faturas & WhatsApp" texto="Gere a fatura completa e envie pelo WhatsApp com um clique." />
          <Recurso i={2} icon={<Leaf />} titulo="Economia visível" texto="Cada morador vê, mês a mês, o quanto economiza com energia solar." />
          <Recurso i={3} icon={<ShieldCheck />} titulo="Portal seguro" texto="Acesso próprio e protegido: cada um enxerga só as próprias faturas." />
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-5 py-10 text-center text-sm text-slate-500">
        <div className="hr-line mb-6" />
        Lorenergia · Energia limpa e mais barata ☀️
      </footer>
    </main>
  );
}

function Stat({ valor, sufixo, label }: { valor: number; sufixo: string; label: string }) {
  return (
    <div>
      <p className="text-3xl font-extrabold text-white" style={{ fontFamily: "var(--font-display)" }}>
        <AnimatedNumber value={valor} />
        <span className="neon-text">{sufixo}</span>
      </p>
      <p className="mt-1 text-xs text-slate-400">{label}</p>
    </div>
  );
}

function Recurso({ i, icon, titulo, texto }: { i: number; icon: React.ReactNode; titulo: string; texto: string }) {
  return (
    <Reveal delay={i * 0.08}>
      <div className="card card-hover h-full">
        <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-brand-500/10 text-brand-400">
          {icon}
        </div>
        <h3 className="font-semibold text-white">{titulo}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{texto}</p>
      </div>
    </Reveal>
  );
}
