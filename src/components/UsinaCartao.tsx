import { Sun, AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatData, formatKwh } from "@/lib/format";
import type { UsinaPainel } from "@/lib/sungrow-servidor";
import type { CodigoStatus } from "@/lib/sungrow";
import CurvaGeracaoChart from "@/components/CurvaGeracaoChart";

/** Peças da tela Admin → Usinas. */

export const kw = (w: number | null) =>
  w === null ? "—" : `${(w / 1000).toLocaleString("pt-BR", { minimumFractionDigits: w < 10000 ? 2 : 1, maximumFractionDigits: w < 10000 ? 2 : 1 })} kW`;
const kwhOuTraco = (v: number | null) => (v === null ? "—" : formatKwh(v));
const horaRecife = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

const ESTILO_STATUS: Record<CodigoStatus, string> = {
  gerando: "bg-eco-500/15 text-eco-300 border-eco-500/30",
  sem_sol: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  desatualizada: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  alarme: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  offline: "bg-red-500/15 text-red-300 border-red-500/30",
  falha: "bg-red-500/15 text-red-300 border-red-500/30",
};

export function CartaoUsina({ u }: { u: UsinaPainel }) {
  const fracao = u.capacidadeKwp && u.potenciaW !== null ? Math.min(1, u.potenciaW / 1000 / u.capacidadeKwp) : null;
  return (
    <div className="card space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-white">{u.nome}</h2>
          <p className="text-xs text-slate-400">
            {u.capacidadeKwp ? `${u.capacidadeKwp.toLocaleString("pt-BR")} kWp · ` : ""}última leitura às {horaRecife(u.lidoEm)}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${ESTILO_STATUS[u.status.codigo]}`}>
          {u.status.codigo === "gerando" ? <Sun className="h-3.5 w-3.5" /> : u.status.codigo === "sem_sol" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          {u.status.rotulo}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Dado titulo="Potência agora" valor={kw(u.potenciaW)} />
        <Dado titulo="Hoje" valor={kwhOuTraco(u.hojeKwh)} />
        <Dado titulo="No mês" valor={formatKwh(u.mesKwh)} detalhe={u.mesDesde ? `desde ${formatData(u.mesDesde)}` : undefined} />
        <Dado titulo="Total" valor={kwhOuTraco(u.totalKwh)} />
      </div>

      {fracao !== null && (
        <div>
          <div className="mb-1.5 flex justify-between text-xs text-slate-400">
            <span>Uso da capacidade agora</span>
            <span className="font-semibold text-slate-200">{Math.round(fracao * 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-brand-400" style={{ width: `${Math.max(2, fracao * 100)}%` }} />
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-medium text-slate-300">Potência ao longo de hoje <span className="text-xs font-normal text-slate-500">(kW)</span></p>
        <CurvaGeracaoChart pontos={u.curva} />
      </div>

      <details className="text-xs text-slate-500">
        <summary className="cursor-pointer hover:text-slate-300">Dados recebidos da Sungrow</summary>
        <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-black/30 p-3 text-[11px] text-slate-400">{JSON.stringify(u.dados, null, 2)}</pre>
      </details>
    </div>
  );
}

export function KpiUsina({ icon, titulo, valor, detalhe, cor }: { icon: React.ReactNode; titulo: string; valor: string; detalhe?: string; cor: string }) {
  return (
    <div className="card">
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${cor}`}>{icon}</div>
      <p className="text-sm text-slate-400">{titulo}</p>
      <p className="mt-1 text-xl font-bold text-white">{valor}</p>
      {detalhe && <p className="mt-0.5 text-xs text-slate-500">{detalhe}</p>}
    </div>
  );
}

function Dado({ titulo, valor, detalhe }: { titulo: string; valor: string; detalhe?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-xs text-slate-400">{titulo}</p>
      <p className="mt-0.5 text-lg font-bold text-white">{valor}</p>
      {detalhe && <p className="text-[11px] text-slate-500">{detalhe}</p>}
    </div>
  );
}

export function Aviso({ tipo, children }: { tipo: "ok" | "erro"; children: React.ReactNode }) {
  const cls = tipo === "ok" ? "border-eco-500/40 bg-eco-500/10 text-eco-200" : "border-red-500/40 bg-red-500/10 text-red-200";
  return (
    <div className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${cls}`}>
      {tipo === "ok" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
      <p>{children}</p>
    </div>
  );
}
