import { Sun, Zap, CalendarDays, Gauge, RefreshCw, Link2, Unplug } from "lucide-react";
import { formatKwh } from "@/lib/format";
import { lerUsinas, sungrowConfigurado, sungrowRedirectUri } from "@/lib/sungrow-servidor";
import { Aviso, CartaoUsina, KpiUsina as Kpi, kw } from "@/components/UsinaCartao";
import AtualizarAuto from "@/components/AtualizarAuto";
import { getSessao } from "@/lib/auth";
import { redirect } from "next/navigation";
import { atualizarUsinasAgora, desconectarUsinas } from "./actions";

export const dynamic = "force-dynamic";

const ERROS: Record<string, string> = {
  config: "Faltam as chaves da Sungrow nas variáveis de ambiente da Vercel.",
  expirou: "A autorização demorou mais de 15 minutos ou foi iniciada em outro navegador. Clique em Conectar de novo.",
  state: "A volta da iSolarCloud não confere com a autorização iniciada aqui. Clique em Conectar de novo.",
  negado: "A autorização não foi concluída na iSolarCloud.",
  troca: "A Sungrow não aceitou a autorização.",
};

export default async function UsinasPage({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string; msg?: string }> }) {
  // O layout já protege; conferimos aqui também porque a página usa a chave de serviço.
  const sessao = await getSessao();
  if (sessao?.profile?.role !== "admin") redirect("/portal");
  const q = await searchParams;
  const configurado = sungrowConfigurado();
  const estado = await lerUsinas();
  const erroVolta = q.erro ? `${ERROS[q.erro] ?? "Não foi possível conectar."}${q.msg ? ` (${q.msg})` : ""}` : null;

  return (
    <div className="space-y-6">
      {estado.conectado && <AtualizarAuto segundos={300} />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>Usinas</h1>
          <p className="text-sm text-slate-400">
            Geração das usinas pela iSolarCloud (Sungrow). Atualiza sozinha a cada 5 minutos.
          </p>
        </div>
        {estado.conectado && (
          <div className="flex flex-wrap gap-2">
            <form action={atualizarUsinasAgora}>
              <button type="submit" className="btn-outline"><RefreshCw className="h-4 w-4" /> Atualizar agora</button>
            </form>
            <a href="/api/sungrow/conectar" className="btn-outline"><Link2 className="h-4 w-4" /> Reconectar</a>
          </div>
        )}
      </div>

      {q.ok && (
        <Aviso tipo="ok">Conta da iSolarCloud conectada. As usinas autorizadas aparecem abaixo.</Aviso>
      )}
      {erroVolta && <Aviso tipo="erro">{erroVolta}</Aviso>}
      {estado.erro && (
        <Aviso tipo="erro">
          {estado.erro}
          {estado.usinas.length > 0 && " Mostrando a última leitura gravada."}
          {estado.reconectar && (
            <a href="/api/sungrow/conectar" className="ml-2 underline">Reconectar agora</a>
          )}
        </Aviso>
      )}

      {!configurado && (
        <div className="card space-y-3 text-sm text-slate-300">
          <h2 className="font-semibold text-white">Configurar a integração</h2>
          <p>Cadastre na Vercel (Settings → Environment Variables, ambiente Production) e promova um novo deploy:</p>
          <ul className="list-inside list-disc space-y-1 font-mono text-xs text-slate-200">
            <li>SUNGROW_APPKEY</li>
            <li>SUNGROW_SECRET_KEY</li>
            <li>SUNGROW_APP_ID <span className="font-sans text-slate-400">(o número depois de applicationId=)</span></li>
            <li>SUNGROW_SERVER <span className="font-sans text-slate-400">(opcional; padrão international)</span></li>
          </ul>
          <p>
            No portal de desenvolvedor da Sungrow, o endereço de retorno do aplicativo deve ser{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">{sungrowRedirectUri()}</code>
          </p>
        </div>
      )}

      {configurado && !estado.conectado && !estado.erro && (
        <div className="card flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/15 text-brand-300"><Sun className="h-6 w-6" /></span>
            <div>
              <p className="font-semibold text-white">Conectar a conta da iSolarCloud</p>
              <p className="text-sm text-slate-400">Você entra na página da própria Sungrow e marca as usinas. A senha não passa pelo sistema.</p>
            </div>
          </div>
          <a href="/api/sungrow/conectar" className="btn-primary"><Link2 className="h-4 w-4" /> Conectar</a>
        </div>
      )}

      {configurado && !estado.conectado && (
        <p className="text-xs text-slate-500">
          Endereço de retorno enviado à Sungrow:{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5">{sungrowRedirectUri()}</code> — tem de ser idêntico ao
          cadastrado no aplicativo do portal de desenvolvedor.
        </p>
      )}

      {estado.usinas.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Kpi icon={<Zap />} titulo="Potência agora" valor={kw(estado.totais.potenciaW)}
              detalhe={estado.totais.capacidadeKwp > 0 ? `de ${estado.totais.capacidadeKwp.toLocaleString("pt-BR")} kWp instalados` : undefined}
              cor="bg-brand-500/15 text-brand-300" />
            <Kpi icon={<Sun />} titulo="Gerado hoje" valor={formatKwh(estado.totais.hojeKwh)} cor="bg-amber-500/15 text-amber-300" />
            <Kpi icon={<CalendarDays />} titulo="Gerado no mês" valor={formatKwh(estado.totais.mesKwh)}
              detalhe={estado.usinas.some((u) => u.mesDesde) ? "desde o início da integração" : undefined}
              cor="bg-eco-500/15 text-eco-300" />
            <Kpi icon={<Gauge />} titulo="Total gerado" valor={formatKwh(estado.totais.totalKwh)} cor="bg-blue-500/15 text-blue-300" />
          </div>

          {estado.usinas.map((u) => <CartaoUsina key={u.psId} u={u} />)}

          <form action={desconectarUsinas} className="text-right">
            <button type="submit" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-300">
              <Unplug className="h-3.5 w-3.5" /> Desconectar a conta da iSolarCloud
            </button>
          </form>
        </>
      )}
    </div>
  );
}
