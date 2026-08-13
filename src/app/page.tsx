import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Sun, Zap, FileText, Leaf, ArrowRight, ShieldCheck,
  Gauge, ReceiptText, PiggyBank, Lock, Quote,
} from "lucide-react";
import { getSessao } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import ThemeToggle from "@/components/ThemeToggle";
import { Reveal, AnimatedNumber } from "@/components/motion";

export const dynamic = "force-dynamic";

interface EstatisticasHome {
  economiaTotal: number;
  moradores: number;
  kwhLimpa: number;
}

/**
 * Números reais para o hero (economia total, moradores ativos, energia limpa).
 * Usa o cliente de serviço (agregados públicos, sem expor dados individuais).
 * Em qualquer falha, retorna zeros e a home cai nos valores padrão.
 */
async function carregarEstatisticas(): Promise<EstatisticasHome> {
  try {
    const admin = createAdminClient();
    const [{ data: faturas }, { count: moradores }, { data: geracao }] = await Promise.all([
      admin.from("faturas").select("economia, status"),
      admin.from("clientes").select("id", { count: "exact", head: true }).eq("ativo", true),
      admin.from("geracao_mensal").select("kwh_injetado"),
    ]);

    const economiaTotal = (faturas ?? [])
      .filter((f: { status: string }) => f.status !== "cancelada")
      .reduce((s: number, f: { economia: number | null }) => s + Number(f.economia ?? 0), 0);
    const kwhLimpa = (geracao ?? []).reduce(
      (s: number, g: { kwh_injetado: number | null }) => s + Number(g.kwh_injetado ?? 0),
      0
    );

    return { economiaTotal, moradores: moradores ?? 0, kwhLimpa };
  } catch {
    return { economiaTotal: 0, moradores: 0, kwhLimpa: 0 };
  }
}

export default async function HomePage() {
  const sessao = await getSessao();
  if (sessao?.profile?.role === "admin") redirect("/admin");
  if (sessao?.profile?.role === "cliente") redirect("/portal");

  const stats = await carregarEstatisticas();

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
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="btn-primary">
            Entrar <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
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
              {stats.economiaTotal > 0 ? (
                <Stat valor={stats.economiaTotal} formato="brl" label="já economizados" />
              ) : (
                <Stat valor={20} sufixo="%" label="de desconto" />
              )}
              {stats.moradores > 0 ? (
                <Stat valor={stats.moradores} label={stats.moradores === 1 ? "morador ativo" : "moradores ativos"} />
              ) : (
                <Stat valor={100} sufixo="%" label="energia limpa" />
              )}
              {stats.kwhLimpa > 0 ? (
                <Stat valor={stats.kwhLimpa} label="kWh de energia limpa" />
              ) : (
                <Stat valor={24} sufixo="/7" label="acesso online" />
              )}
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
              poster="/video-poster"
            >
              <source src="/institucional.mp4" type="video/mp4" />
              Seu navegador não suporta vídeo.{" "}
              <a href="/institucional.mp4" className="underline">Baixe o vídeo</a>.
            </video>
          </div>
        </Reveal>
      </section>

      {/* Faixa de confiança */}
      <div className="border-y border-white/5 bg-white/[0.02]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-5 py-4 text-sm text-slate-400">
          <span className="inline-flex items-center gap-2"><Lock className="h-4 w-4 text-brand-400" /> Dados protegidos</span>
          <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-brand-400" /> Geração compartilhada · Lei 14.300/2022</span>
          <span className="inline-flex items-center gap-2"><Leaf className="h-4 w-4 text-eco-400" /> 100% energia solar</span>
          <span className="inline-flex items-center gap-2"><Sun className="h-4 w-4 text-brand-400" /> Economia todo mês</span>
        </div>
      </div>

      {/* Como funciona (3 passos) */}
      <section id="como-funciona" className="mx-auto max-w-6xl px-5 py-16">
        <Reveal>
          <div className="mb-10 text-center">
            <span className="eyebrow justify-center">Simples assim</span>
            <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
              Como funciona
            </h2>
          </div>
        </Reveal>
        <div className="grid gap-5 md:grid-cols-3">
          <Passo n={1} icon={<Gauge />} titulo="Leitura do medidor" texto="A cada mês registramos a leitura da sua unidade — anterior e atual." />
          <Passo n={2} icon={<ReceiptText />} titulo="Fatura com desconto" texto="O sistema calcula o consumo e aplica o desconto da energia solar automaticamente." />
          <Passo n={3} icon={<PiggyBank />} titulo="Você economiza" texto="Você paga menos que na distribuidora e acompanha sua economia no portal." />
        </div>
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

      {/* Depoimentos */}
      <section id="depoimentos" className="mx-auto max-w-6xl px-5 py-16">
        <Reveal>
          <div className="mb-10 text-center">
            <span className="eyebrow justify-center">Quem usa, recomenda</span>
            <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
              O que dizem os moradores
            </h2>
          </div>
        </Reveal>
        <div className="grid gap-5 md:grid-cols-3">
          {DEPOIMENTOS.map((d, i) => (
            <Depoimento key={i} i={i} {...d} />
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-6xl px-5 pb-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-brand-400/20 px-6 py-12 text-center"
            style={{ background: "linear-gradient(120deg, rgba(255,176,32,0.16), rgba(34,211,238,0.10))" }}>
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-500/25 blur-3xl" />
            <h2 className="text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
              Pronto para economizar com energia solar?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-300">
              Acesse seu portal e acompanhe suas faturas e sua economia em tempo real.
            </p>
            <div className="mt-7 flex justify-center">
              <Link href="/login" className="btn-primary">
                Acessar o sistema <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="mx-auto max-w-6xl px-5 py-10 text-center text-sm text-slate-500">
        <div className="hr-line mb-6" />
        Lorenergia · Energia limpa e mais barata ☀️
      </footer>
    </main>
  );
}

// Depoimentos — EXEMPLOS. Substitua pelos depoimentos reais dos seus moradores.
const DEPOIMENTOS = [
  { nome: "Morador", unidade: "Apto 101", texto: "Minha conta de luz caiu todo mês e ainda acompanho tudo pelo celular. Muito prático." },
  { nome: "Moradora", unidade: "Apto 204", texto: "Adoro ver quanto economizo com energia solar. As faturas são claras e chegam pelo WhatsApp." },
  { nome: "Morador", unidade: "Apto 302", texto: "Simples de entender e o desconto aparece direitinho na fatura. Recomendo." },
];

function Stat({ valor, sufixo = "", label, formato = "int" }: { valor: number; sufixo?: string; label: string; formato?: "int" | "brl" | "kwh" }) {
  return (
    <div>
      <p className="text-3xl font-extrabold text-white" style={{ fontFamily: "var(--font-display)" }}>
        <AnimatedNumber value={valor} format={formato} />
        {sufixo && <span className="neon-text">{sufixo}</span>}
      </p>
      <p className="mt-1 text-xs text-slate-400">{label}</p>
    </div>
  );
}

function Passo({ n, icon, titulo, texto }: { n: number; icon: React.ReactNode; titulo: string; texto: string }) {
  return (
    <Reveal delay={n * 0.08}>
      <div className="card card-hover h-full">
        <div className="mb-4 flex items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/15 text-sm font-bold text-brand-300">{n}</span>
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-brand-500/10 text-brand-400">{icon}</span>
        </div>
        <h3 className="font-semibold text-white">{titulo}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{texto}</p>
      </div>
    </Reveal>
  );
}

function Depoimento({ i, nome, unidade, texto }: { i: number; nome: string; unidade: string; texto: string }) {
  return (
    <Reveal delay={i * 0.08}>
      <div className="card card-hover h-full">
        <Quote className="h-6 w-6 text-brand-400/70" />
        <p className="mt-3 text-sm leading-relaxed text-slate-200">“{texto}”</p>
        <div className="mt-4 flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-500/15 text-sm font-bold text-brand-300">
            {nome.charAt(0)}
          </span>
          <div>
            <p className="text-sm font-semibold text-white">{nome}</p>
            <p className="text-xs text-slate-400">{unidade}</p>
          </div>
        </div>
      </div>
    </Reveal>
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
