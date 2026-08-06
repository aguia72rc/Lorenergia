import Link from "next/link";
import { ArrowLeft, Send, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatBRL, formatReferencia, formatData, primeiroDiaMesAtual } from "@/lib/format";
import { getBaseUrl } from "@/lib/url";
import { montarMensagem, gerarLinkWhatsApp } from "@/lib/whatsapp";
import MonthFilter from "@/components/MonthFilter";
import WhatsAppButton from "@/components/WhatsAppButton";
import StatusBadge from "@/components/StatusBadge";
import type { FaturaComCliente, Configuracoes } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EnviarWhatsappPage({
  searchParams,
}: {
  searchParams: { mes?: string };
}) {
  const supabase = createClient();
  const baseUrl = getBaseUrl();

  // Por padrão, o mês atual.
  const mesParam = searchParams.mes ?? primeiroDiaMesAtual().slice(0, 7);
  const [ano, m] = mesParam.split("-");
  const referencia = `${ano}-${(m ?? "01").padStart(2, "0")}-01`;

  const [{ data: faturas }, { data: config }] = await Promise.all([
    supabase
      .from("faturas")
      .select("*, clientes(id, nome, unidade, telefone, email)")
      .eq("referencia", referencia)
      .neq("status", "cancelada")
      .order("created_at", { ascending: true }),
    supabase.from("configuracoes").select("*").eq("id", 1).single(),
  ]);

  const lista = (faturas ?? []) as FaturaComCliente[];
  const cfg = config as Configuracoes;

  const totalEnviadas = lista.filter((f) => f.whatsapp_enviado_em).length;
  const semTelefone = lista.filter((f) => !f.clientes?.telefone).length;

  return (
    <div className="space-y-6">
      <Link href="/admin/faturas" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Enviar faturas pelo WhatsApp</h1>
          <p className="text-sm text-slate-500">
            {formatReferencia(referencia)} · {totalEnviadas} de {lista.length} enviada(s)
          </p>
        </div>
        <MonthFilter basePath="/admin/faturas/enviar" />
      </div>

      <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800">
        💡 Clique em <strong>Enviar WhatsApp</strong> em cada morador: abre o WhatsApp com a mensagem e o link da
        fatura prontos — é só apertar enviar. O sistema marca automaticamente quem já foi enviado.
      </div>

      {semTelefone > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {semTelefone} morador(es) sem WhatsApp cadastrado — o link abrirá sem destinatário.
        </div>
      )}

      {lista.length === 0 ? (
        <div className="card flex flex-col items-center py-12 text-center">
          <Send className="h-10 w-10 text-slate-300" />
          <p className="mt-3 text-slate-600">Nenhuma fatura para {formatReferencia(referencia)}.</p>
          <Link href="/admin/faturas/lote" className="btn-primary mt-4">Gerar faturas do mês</Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {lista.map((f) => {
            const mensagem = montarMensagem(f, cfg, `${baseUrl}/fatura/${f.id}`);
            const link = gerarLinkWhatsApp(f.clientes?.telefone, mensagem);
            return (
              <div key={f.id} className="card flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{f.clientes?.nome}</p>
                    <p className="text-xs text-slate-400">
                      {f.clientes?.unidade} {f.clientes?.telefone ? `· ${f.clientes.telefone}` : "· sem WhatsApp"}
                    </p>
                  </div>
                  <StatusBadge status={f.status} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">A pagar</span>
                  <span className="font-semibold text-slate-900">{formatBRL(f.valor_liquido)}</span>
                </div>
                {f.whatsapp_enviado_em && (
                  <p className="text-xs text-eco-700">✓ Enviado em {formatData(f.whatsapp_enviado_em.slice(0, 10))}</p>
                )}
                <WhatsAppButton faturaId={f.id} link={link} enviadoEm={f.whatsapp_enviado_em} variante="grande" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
