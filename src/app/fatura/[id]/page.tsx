import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Sun } from "lucide-react";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { getSessao } from "@/lib/auth";
import { formatBRL, formatReferencia, formatData, formatReferenciaCurta } from "@/lib/format";
import { gerarPixCopiaECola } from "@/lib/pix";
import StatusBadge from "@/components/StatusBadge";
import PrintButton from "@/components/PrintButton";
import EconomiaChart from "@/components/EconomiaChart";
import type { FaturaComCliente, Configuracoes, Fatura } from "@/lib/types";

export const dynamic = "force-dynamic";

function numero(v: number | null | undefined, casas = 2): string {
  return (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

export default async function FaturaPage({ params }: { params: { id: string } }) {
  const sessao = await getSessao();
  if (!sessao) redirect(`/login?redirect=/fatura/${params.id}`);

  const supabase = createClient();

  const { data: fatura } = await supabase
    .from("faturas")
    .select("*, clientes(id, nome, unidade, telefone, email, cpf, endereco, cep, cidade_uf, numero_medidor, tipo_ligacao)")
    .eq("id", params.id)
    .single();

  if (!fatura) notFound();
  const f = fatura as FaturaComCliente;
  const c = f.clientes;

  const { data: config } = await supabase.from("configuracoes").select("*").eq("id", 1).single();
  const cfg = config as Configuracoes | null;

  const { data: historico } = await supabase
    .from("faturas")
    .select("consumo_kwh, economia, referencia, status")
    .eq("cliente_id", f.cliente_id)
    .neq("status", "cancelada")
    .order("referencia", { ascending: true });

  const hist = (historico ?? []) as Pick<Fatura, "consumo_kwh" | "economia" | "referencia">[];
  const pontosConsumo = hist.slice(-6).map((h) => ({ label: formatReferenciaCurta(h.referencia), valor: Number(h.consumo_kwh), referencia: h.referencia }));
  const pontosEconomia = hist.slice(-6).map((h) => ({ label: formatReferenciaCurta(h.referencia), valor: Number(h.economia), referencia: h.referencia }));
  const economiaAcumulada = hist.reduce((s, h) => s + Number(h.economia), 0);

  // PIX / QR Code
  let qrSvg: string | null = null;
  let pixCopiaECola: string | null = null;
  if (cfg?.chave_pix) {
    pixCopiaECola = gerarPixCopiaECola({
      chave: cfg.chave_pix,
      nome: cfg.pix_nome || cfg.nome_usina || "Recebedor",
      cidade: cfg.pix_cidade || "Cidade",
      valor: Number(f.valor_liquido),
    });
    qrSvg = await QRCode.toString(pixCopiaECola, { type: "svg", margin: 1, width: 150 });
  }

  const valorTusd = Number(f.consumo_kwh) * Number(f.tarifa_tusd);
  const valorTe = Number(f.consumo_kwh) * Number(f.tarifa_te);
  const codigo = [c?.unidade, c?.tipo_ligacao].filter(Boolean).join(" · ");
  const voltarHref = sessao.profile?.role === "admin" ? "/admin/faturas" : "/portal";

  return (
    <div className="min-h-screen py-8">
      <div className="mx-auto max-w-2xl px-4">
        <div className="no-print mb-4 flex items-center justify-between">
          <Link href={voltarHref} className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <PrintButton />
        </div>

        <div className="print-light overflow-hidden rounded-2xl bg-white shadow-[0_0_60px_-12px_rgba(255,176,32,0.35)] ring-1 ring-white/10">
          {/* Cabeçalho */}
          <div className="bg-slate-900 p-6 text-white">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <Sun className="h-8 w-8 shrink-0 text-brand-400" />
                <div>
                  <p className="text-lg font-bold leading-tight">{cfg?.nome_usina ?? "Lorenergia"}</p>
                  <p className="text-xs text-slate-400">Rateio de geração compartilhada · Energia que vem de casa</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Referência</p>
                <p className="font-semibold uppercase">{formatReferencia(f.referencia)}</p>
                <p className="mt-1 text-xs text-slate-400">{numero(f.consumo_kwh, 0)} kWh consumidos</p>
              </div>
            </div>
            <p className="mt-3 border-t border-slate-700 pt-2 text-[11px] text-slate-500">
              Geração compartilhada nos termos da Lei 14.300/2022 · Gerado em {formatData((f.created_at ?? "").slice(0, 10))}
            </p>
          </div>

          {/* Dados do cliente + documento */}
          <div className="grid gap-4 border-b border-slate-100 p-6 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Dados do cliente</p>
              <p className="mt-1 font-semibold text-slate-900">{c?.nome}</p>
              {c?.endereco && <p className="text-sm text-slate-500">{c.endereco}</p>}
              {(c?.cidade_uf || c?.cep) && (
                <p className="text-sm text-slate-500">{[c?.cidade_uf, c?.cep && `CEP ${c.cep}`].filter(Boolean).join(" — ")}</p>
              )}
              {c?.cpf && <p className="text-sm text-slate-500">CPF/CNPJ: {c.cpf}</p>}
              {codigo && <p className="mt-1 text-sm text-slate-500">Código {codigo}</p>}
            </div>
            <div className="sm:text-right">
              <div className="mb-2"><StatusBadge status={f.status} /></div>
              <dl className="space-y-1 text-sm">
                <Info label="Emissão" valor={formatData((f.created_at ?? "").slice(0, 10))} />
                <Info label="Vencimento" valor={formatData(f.vencimento)} />
                <Info label="Nº medidor" valor={c?.numero_medidor || "—"} />
                <Info label="Consumo" valor={`${numero(f.consumo_kwh, 0)} kWh`} />
              </dl>
            </div>
          </div>

          {/* PIX */}
          {qrSvg && (
            <div className="flex flex-col items-center gap-4 border-b border-slate-100 p-6 sm:flex-row">
              <div className="h-[140px] w-[140px] shrink-0 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-wide text-slate-400">Pagamento via PIX</p>
                <p className="mt-1 text-sm text-slate-600">Escaneie o QR Code no app do seu banco ou copie a chave abaixo:</p>
                <p className="mt-2 break-all rounded-lg bg-slate-50 p-2 text-xs text-slate-700">{cfg?.chave_pix}</p>
              </div>
            </div>
          )}

          {/* Composição da fatura */}
          <div className="p-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Composição da fatura</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-400">
                  <th className="pb-2 text-left font-medium">Descrição</th>
                  <th className="pb-2 text-right font-medium">Qtd (kWh)</th>
                  <th className="pb-2 text-right font-medium">Preço</th>
                  <th className="pb-2 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                <LinhaComp desc="Consumo — TUSD" qtd={numero(f.consumo_kwh, 1)} preco={numero(f.tarifa_tusd, 2)} valor={valorTusd} />
                <LinhaComp desc="Consumo — TE" qtd={numero(f.consumo_kwh, 1)} preco={numero(f.tarifa_te, 2)} valor={valorTe} />
                <LinhaComp desc="Contribuição de iluminação pública" valor={f.taxa_iluminacao} />
                <LinhaComp desc="TUSD GD II" valor={f.taxa_energia_solar} />
                <LinhaComp desc="Adicional bandeira" valor={f.adicional_bandeira} />
                <LinhaComp desc="Multa / juros" valor={f.multa_juros} destaque={Number(f.multa_juros) > 0} />
                <tr className="border-b border-slate-100">
                  <td className="py-2.5 text-eco-700" colSpan={3}>Desconto aplicado ({numero(f.desconto_percentual, 0)}%)</td>
                  <td className="py-2.5 text-right font-medium text-eco-700">- {formatBRL(f.valor_desconto)}</td>
                </tr>
              </tbody>
            </table>

            <div className="mt-4 rounded-xl bg-brand-50 px-5 py-4">
              {Number(f.valor_desconto) > 0 && (
                <div className="mb-3 flex items-center justify-between border-b border-brand-200 pb-3">
                  <span className="text-sm text-slate-500">Sem o desconto solar seria</span>
                  <span className="text-2xl font-bold text-red-600">{formatBRL(f.valor_bruto)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Total a pagar</span>
                <span className="text-3xl font-extrabold text-slate-900">{formatBRL(f.valor_liquido)}</span>
              </div>
              {Number(f.valor_desconto) > 0 && (
                <div className="mt-3 flex items-center justify-between rounded-lg bg-eco-100 px-3 py-2 text-sm text-eco-800">
                  <span>🌱 Você economizou com energia solar</span>
                  <span className="font-bold">{formatBRL(f.valor_desconto)} ({numero(f.desconto_percentual, 0)}%)</span>
                </div>
              )}
            </div>

            {/* Medição + tributos */}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Dados da medição</p>
                <dl className="mt-2 space-y-1 text-sm">
                  <Info label="Leitura anterior" valor={numero(f.leitura_anterior, 1)} />
                  <Info label="Leitura atual" valor={numero(f.leitura_atual, 1)} />
                  <Info label="Fator multiplicador" valor={numero(f.fator_multiplicador, 1)} />
                  <Info label="Consumo do mês" valor={`${numero(f.consumo_kwh, 1)} kWh`} />
                </dl>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Tributos (informativo)</p>
                <dl className="mt-2 space-y-1 text-sm">
                  <Info label="ICMS" valor={formatBRL(f.icms)} />
                  <Info label="PIS" valor={formatBRL(f.pis)} />
                  <Info label="COFINS" valor={formatBRL(f.cofins)} />
                </dl>
              </div>
            </div>

            {/* Gráficos */}
            {pontosConsumo.length >= 2 && (
              <div className="mt-5 rounded-xl border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Consumo — últimos 6 meses (kWh)</p>
                <div className="mt-2">
                  <EconomiaChart dados={pontosConsumo} destaqueRef={f.referencia} altura={170} cor="#ca8a04" ariaLabel="Consumo mensal" textoVazio="Sem histórico de consumo." />
                </div>
              </div>
            )}

            <div className="mt-4 rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide text-slate-400">Economia — últimos 6 meses</p>
                <p className="text-xs text-slate-400">Acumulada: <strong className="text-eco-700">{formatBRL(economiaAcumulada)}</strong></p>
              </div>
              {pontosEconomia.length >= 2 ? (
                <div className="mt-2"><EconomiaChart dados={pontosEconomia} destaqueRef={f.referencia} altura={170} /></div>
              ) : (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-eco-50 px-4 py-3 text-sm text-eco-700">
                  🌱 Você economizou <strong>{formatBRL(f.economia)}</strong> usando energia solar este mês.
                </div>
              )}
            </div>

            {Number(f.taxa_iluminacao) === 0 && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <strong>Aviso importante:</strong> a contribuição de iluminação pública ainda não está sendo cobrada nesta fatura. Os valores acima são calculados automaticamente a partir dos parâmetros informados.
              </div>
            )}

            {f.observacoes && <p className="mt-4 text-sm text-slate-500"><strong>Obs.:</strong> {f.observacoes}</p>}
          </div>

          {/* Rodapé total */}
          <div className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white">
            <div>
              <p className="text-xs text-slate-400">Total a pagar</p>
              {f.vencimento && <p className="text-xs text-slate-400">Vencimento em {formatData(f.vencimento)}</p>}
            </div>
            <p className="text-2xl font-extrabold text-brand-400">{formatBRL(f.valor_liquido)}</p>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Fatura gerada por {cfg?.nome_usina ?? "Lorenergia"} · Energia limpa e mais barata ☀️
        </p>
      </div>
    </div>
  );
}

function Info({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-4 sm:justify-end">
      <dt className="text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-700">{valor}</dd>
    </div>
  );
}

function LinhaComp({ desc, qtd, preco, valor, destaque }: { desc: string; qtd?: string; preco?: string; valor: number; destaque?: boolean }) {
  return (
    <tr className="border-b border-slate-100">
      <td className={`py-2.5 ${destaque ? "text-red-600" : "text-slate-600"}`}>{desc}</td>
      <td className="py-2.5 text-right text-slate-500">{qtd ?? "—"}</td>
      <td className="py-2.5 text-right text-slate-500">{preco ?? "—"}</td>
      <td className={`py-2.5 text-right ${destaque ? "text-red-600" : "text-slate-900"}`}>{formatBRL(valor)}</td>
    </tr>
  );
}
