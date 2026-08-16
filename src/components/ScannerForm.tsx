"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatBRL, formatKwh } from "@/lib/format";
import { CIDADES_LISTA } from "@/lib/scanner";
import { escanear, type ResultadoScan } from "@/app/admin/leads/scanner/actions";

export default function ScannerForm() {
  const [pendente, startTransition] = useTransition();
  const [cidade, setCidade] = useState("Recife");
  const [raio, setRaio] = useState(10);
  const [segmento, setSegmento] = useState("Todos");
  const [consumoMin, setConsumoMin] = useState(250);
  const [res, setRes] = useState<ResultadoScan | null>(null);

  function rodar() {
    setRes(null);
    startTransition(async () => {
      const r = await escanear({ cidade, raioKm: raio, segmento, consumoMin });
      setRes(r);
    });
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label" htmlFor="cidade">Cidade</label>
            <select id="cidade" className="input" value={cidade} onChange={(e) => setCidade(e.target.value)}>
              {CIDADES_LISTA.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="raio">Raio (km)</label>
            <select id="raio" className="input" value={raio} onChange={(e) => setRaio(Number(e.target.value))}>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="segmento">Segmento</label>
            <select
              id="segmento"
              className="input"
              value={segmento}
              onChange={(e) => {
                const v = e.target.value;
                setSegmento(v);
                // Residencial tem consumo baixo — zera o mínimo para não filtrar tudo.
                if (v === "RESIDENCIAL") setConsumoMin(0);
              }}
            >
              <option>Todos</option>
              <option value="COMERCIAL">Comercial</option>
              <option value="INDUSTRIAL">Industrial</option>
              <option value="RESIDENCIAL">Residencial (endereços)</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="consumo">Consumo mín. (kWh)</label>
            <input id="consumo" type="number" min={0} step={50} className="input w-28" value={consumoMin} onChange={(e) => setConsumoMin(Number(e.target.value))} />
          </div>
          <button onClick={rodar} className="btn-primary" disabled={pendente}>
            {pendente ? "🔍 Escaneando..." : "🚀 Iniciar escaneamento"}
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Fonte real: <strong className="text-brand-300">OpenStreetMap</strong> (Overpass). Varre comércios e indústrias com nome, endereço e contato quando disponíveis; estima o consumo, pontua e salva no banco com dedupe automático. A varredura pode levar alguns segundos.
        </p>
        {segmento === "RESIDENCIAL" && (
          <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-200">
            ⚠️ Residencial traz <strong>endereços</strong> reais (rua, número, bairro) para <strong>visita/rota porta a porta</strong> — o OpenStreetMap não tem telefone/WhatsApp de casas, então esses leads ficam sem contato.
          </p>
        )}
      </div>

      {pendente && (
        <div className="card text-center text-sm text-slate-300">🔍 Varrendo {cidade} num raio de {raio} km… isso pode levar até ~40s.</div>
      )}

      {res && (
        <div className="card space-y-4">
          <p className={`text-sm ${res.ok ? "text-eco-300" : "text-red-400"}`}>{res.mensagem}</p>
          {res.ok && (
            <>
              <div className="grid gap-3 sm:grid-cols-4">
                <Mini titulo="Analisados" valor={String(res.analisados)} />
                <Mini titulo="Novos leads" valor={String(res.novos)} destaque />
                <Mini titulo="Consumo total" valor={formatKwh(res.consumoTotal)} />
                <Mini titulo="Comissão potencial" valor={formatBRL(res.comissaoTotal)} destaque />
              </div>

              {res.leads.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-left text-slate-400">
                        <th className="pb-2 font-medium">Nome</th>
                        <th className="pb-2 font-medium">Segmento</th>
                        <th className="pb-2 font-medium">Bairro</th>
                        <th className="pb-2 text-right font-medium">Consumo</th>
                        <th className="pb-2 text-center font-medium">Score</th>
                        <th className="pb-2 text-center font-medium">📱</th>
                      </tr>
                    </thead>
                    <tbody>
                      {res.leads.map((l, i) => (
                        <tr key={i} className="border-b border-white/5 last:border-0">
                          <td className="py-2 font-medium text-white">{l.nome}</td>
                          <td className="py-2 text-slate-300">{l.segmento === "INDUSTRIAL" ? "Industrial" : "Comercial"}</td>
                          <td className="py-2 text-slate-300">{l.bairro || "—"}</td>
                          <td className="py-2 text-right text-slate-300">{formatKwh(l.consumo)}</td>
                          <td className="py-2 text-center font-semibold text-white">{l.score}</td>
                          <td className="py-2 text-center">{l.whatsapp ? "📱" : <span className="text-slate-600">—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <Link href="/admin/leads" className="btn-primary inline-flex">👥 Ver na Central de Leads</Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Mini({ titulo, valor, destaque }: { titulo: string; valor: string; destaque?: boolean }) {
  return (
    <div className={`rounded-xl border border-white/10 bg-white/5 p-3 ${destaque ? "ring-1 ring-eco-400/30" : ""}`}>
      <p className="text-xs text-slate-400">{titulo}</p>
      <p className="mt-1 text-lg font-bold text-white">{valor}</p>
    </div>
  );
}
