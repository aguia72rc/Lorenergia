import Link from "next/link";
import { ArrowLeft, BellRing, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatBRL, formatReferencia, formatData, hojeISO, dataNoRecife } from "@/lib/format";
import { getBaseUrl } from "@/lib/url";
import { gerarLinkWhatsApp } from "@/lib/whatsapp";
import { calcularEncargosAtraso } from "@/lib/atraso";
import { classificarLembrete, diasAteVencimento, montarLembrete, prazoPorExtenso, type TipoLembrete } from "@/lib/lembretes";
import WhatsAppButton from "@/components/WhatsAppButton";
import type { FaturaComCliente, Configuracoes } from "@/lib/types";

export const dynamic = "force-dynamic";

const GRUPOS: { tipo: TipoLembrete; titulo: string; ajuda: string }[] = [
  { tipo: "vencida", titulo: "Vencidas", ajuda: "Já passaram do vencimento. O valor abaixo está atualizado com multa e juros." },
  { tipo: "vence_hoje", titulo: "Vencem hoje", ajuda: "Último dia para pagar sem multa." },
  { tipo: "a_vencer", titulo: "Vencem em breve", ajuda: "Um aviso antes do vencimento evita atraso." },
];

/** Lembretes de vencimento: quem está para vencer ou vencido, com o WhatsApp pronto. */
export default async function LembretesPage({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const supabase = await createClient();
  const baseUrl = await getBaseUrl();
  const sp = await searchParams;
  const diasAntes = [3, 5, 7, 10].includes(Number(sp.dias)) ? Number(sp.dias) : 3;

  const hoje = hojeISO();
  const limite = new Date(Date.parse(`${hoje}T00:00:00Z`) + diasAntes * 86_400_000).toISOString().slice(0, 10);

  const [{ data: faturas }, { data: config }] = await Promise.all([
    supabase
      .from("faturas")
      .select("*, clientes(id, nome, unidade, telefone, email)")
      .eq("publicada", true)
      .eq("status", "pendente")
      .not("vencimento", "is", null)
      .lte("vencimento", limite)
      .order("vencimento", { ascending: true }),
    supabase.from("configuracoes").select("*").eq("id", 1).single(),
  ]);

  const cfg = config as Configuracoes | null;
  const lista = (faturas ?? []) as FaturaComCliente[];

  const itens = lista.flatMap((f) => {
    const tipo = classificarLembrete(f.vencimento, hoje, diasAntes);
    if (!tipo || !f.vencimento) return [];
    const dias = diasAteVencimento(f.vencimento, hoje);
    const enc = calcularEncargosAtraso(Number(f.valor_liquido), f.vencimento, hoje, Number(cfg?.multa_percentual ?? 2), Number(cfg?.juros_mensal_percentual ?? 1));
    const valor = enc.emAtraso ? enc.totalAtualizado : Number(f.valor_liquido);
    const mensagem = montarLembrete(tipo, {
      nome: f.clientes?.nome ?? "",
      referencia: formatReferencia(f.referencia),
      vencimento: formatData(f.vencimento),
      valor: formatBRL(valor),
      link: `${baseUrl}/fatura/${f.id}`,
      dias,
      temEncargos: enc.emAtraso && enc.encargos > 0,
    });
    return [{ f, tipo, dias, valor, link: gerarLinkWhatsApp(f.clientes?.telefone, mensagem) }];
  });

  const semTelefone = itens.filter((i) => !i.f.clientes?.telefone).length;
  const totalAberto = itens.reduce((s, i) => s + i.valor, 0);

  return (
    <div className="space-y-6">
      <Link href="/admin/faturas" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Lembretes de vencimento</h1>
          <p className="text-sm text-slate-400">
            {itens.length} fatura(s) para lembrar · {formatBRL(totalAberto)} em aberto
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
          Avisar com antecedência de
          {[3, 5, 7, 10].map((d) => (
            <Link
              key={d}
              href={d === 3 ? "/admin/faturas/lembretes" : `/admin/faturas/lembretes?dias=${d}`}
              className={`rounded-full px-3 py-1.5 font-medium ${diasAntes === d ? "bg-brand-500 text-brand-950" : "glass text-slate-300 hover:bg-white/5"}`}
            >
              {d} dias
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-brand-500/30 bg-brand-500/10 p-3 text-sm text-brand-300">
        💡 Clique em <strong>Enviar lembrete</strong>: abre o WhatsApp com a mensagem pronta e o link da fatura — é só apertar enviar.
        O sistema marca quem já foi lembrado. Só entram faturas publicadas e pendentes.
      </div>

      {semTelefone > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {semTelefone} morador(es) sem WhatsApp cadastrado — o link abrirá sem destinatário.
        </div>
      )}

      {itens.length === 0 ? (
        <div className="card flex flex-col items-center py-12 text-center">
          <BellRing className="h-10 w-10 text-slate-300" />
          <p className="mt-3 text-slate-300">Ninguém para lembrar agora.</p>
          <p className="mt-1 text-sm text-slate-400">Nenhuma fatura pendente vence nos próximos {diasAntes} dias, e nenhuma está vencida.</p>
        </div>
      ) : (
        GRUPOS.map((g) => {
          const doGrupo = itens.filter((i) => i.tipo === g.tipo);
          if (doGrupo.length === 0) return null;
          return (
            <section key={g.tipo} className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {g.titulo}
                  <span className="ml-2 text-sm font-normal text-slate-400">{doGrupo.length} fatura(s)</span>
                </h2>
                <p className="text-sm text-slate-400">{g.ajuda}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {doGrupo.map(({ f, dias, valor, link, tipo }) => (
                  <div key={f.id} className="card flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-white">{f.clientes?.nome}</p>
                        <p className="text-xs text-slate-400">
                          {f.clientes?.unidade} {f.clientes?.telefone ? `· ${f.clientes.telefone}` : "· sem WhatsApp"}
                        </p>
                      </div>
                      <span className={`badge ${tipo === "vencida" ? "bg-red-500/15 text-red-300 ring-1 ring-red-500/25" : "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/25"}`}>
                        {prazoPorExtenso(dias)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400 capitalize">{formatReferencia(f.referencia)} · vence {formatData(f.vencimento)}</span>
                      <span className="font-semibold text-white">{formatBRL(valor)}</span>
                    </div>
                    {f.lembrete_enviado_em && (
                      <p className="text-xs text-eco-300">✓ Lembrado em {formatData(dataNoRecife(new Date(f.lembrete_enviado_em)))}</p>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <WhatsAppButton faturaId={f.id} link={link} enviadoEm={f.lembrete_enviado_em ?? null} variante="grande" tipo="lembrete" />
                      </div>
                      <Link href={`/fatura/${f.id}`} className="text-xs text-slate-400 underline hover:text-white">ver fatura</Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
