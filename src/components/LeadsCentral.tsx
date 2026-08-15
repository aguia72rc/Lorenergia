"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatBRL, formatKwh } from "@/lib/format";
import {
  consumoLead, comissaoLead, economiaLead,
  STATUS_LEAD_LABEL, STATUS_LEAD_COR, SEGMENTO_LABEL, SEGMENTO_COR,
} from "@/lib/leads";
import type { Lead } from "@/lib/types";

const MSG_PADRAO = `Olá {{nome}}! 👋

Sou da Lorenergia. Sua empresa em {{bairro}} pode economizar ~{{economia}}/mês com energia solar por assinatura, sem investir nada e sem instalar painel.

Podemos conversar?

Lorenergia`;

function Badge({ texto, cor }: { texto: string; cor: string }) {
  return (
    <span className="badge" style={{ background: `${cor}22`, color: cor, border: `1px solid ${cor}33` }}>
      {texto}
    </span>
  );
}

export default function LeadsCentral({ leads }: { leads: Lead[] }) {
  const [busca, setBusca] = useState("");
  const [seg, setSeg] = useState("");
  const [status, setStatus] = useState("");
  const [ordem, setOrdem] = useState<"comissao" | "consumo" | "score" | "nome">("comissao");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState(MSG_PADRAO);

  const lista = useMemo(() => {
    let l = leads.filter((x) => {
      const b = busca.toLowerCase();
      return (
        (!seg || x.segmento === seg) &&
        (!status || x.status_lead === status) &&
        (!b || x.nome.toLowerCase().includes(b) || (x.bairro || "").toLowerCase().includes(b))
      );
    });
    l = [...l].sort((a, b) => {
      if (ordem === "consumo") return consumoLead(b) - consumoLead(a);
      if (ordem === "score") return b.lead_score - a.lead_score;
      if (ordem === "nome") return a.nome.localeCompare(b.nome);
      return comissaoLead(b) - comissaoLead(a);
    });
    return l;
  }, [leads, busca, seg, status, ordem]);

  function toggle(id: string) {
    setSel((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }
  const todos = () => setSel(new Set(lista.map((l) => l.id)));
  const nenhum = () => setSel(new Set());
  const topScore = () => setSel(new Set([...leads].sort((a, b) => b.lead_score - a.lead_score).slice(0, 20).map((l) => l.id)));

  function enviarWhats() {
    const alvos = leads.filter((l) => sel.has(l.id));
    let enviados = 0, pulados = 0;
    alvos.forEach((l, i) => {
      if (!l.whatsapp) { pulados++; return; }
      const texto = msg
        .replace(/\{\{nome\}\}/g, l.nome)
        .replace(/\{\{bairro\}\}/g, l.bairro || "sua região")
        .replace(/\{\{consumo\}\}/g, formatKwh(consumoLead(l)))
        .replace(/\{\{economia\}\}/g, formatBRL(economiaLead(l)));
      setTimeout(() => window.open(`https://wa.me/${l.whatsapp}?text=${encodeURIComponent(texto)}`, "_blank"), i * 600);
      enviados++;
    });
    if (enviados === 0) alert("Nenhum dos selecionados tem WhatsApp cadastrado.");
    else alert(`Abrindo ${enviados} conversa(s) no WhatsApp${pulados ? ` — ${pulados} sem WhatsApp foram pulados` : ""}. Autorize os pop-ups se o navegador bloquear.`);
  }

  function addVar(v: string) { setMsg((m) => m + v); }

  const selCount = sel.size;

  return (
    <div className="space-y-4">
      {/* WhatsApp em massa */}
      <div className="card">
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div>
            <label className="label">Mensagem do benefício (variáveis serão substituídas)</label>
            <textarea
              className="input"
              style={{ height: 120, resize: "vertical", fontFamily: "inherit" }}
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
            />
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-400">
              {["{{nome}}", "{{bairro}}", "{{consumo}}", "{{economia}}"].map((v) => (
                <button key={v} type="button" onClick={() => addVar(v)} className="text-brand-300 hover:underline">+ {v}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl bg-white/5 px-6 py-4">
            <span className="text-3xl font-extrabold text-eco-300">{selCount}</span>
            <span className="text-xs text-slate-400">selecionados</span>
            <button onClick={enviarWhats} className="btn-primary" disabled={selCount === 0}>📱 Enviar WhatsApp</button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input className="input w-52" placeholder="🔍 Buscar nome ou bairro..." value={busca} onChange={(e) => setBusca(e.target.value)} />
          <select className="input w-auto" value={seg} onChange={(e) => setSeg(e.target.value)}>
            <option value="">Segmento</option>
            <option value="COMERCIAL">Comercial</option>
            <option value="INDUSTRIAL">Industrial</option>
            <option value="RESIDENCIAL">Residencial</option>
          </select>
          <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Status</option>
            {Object.entries(STATUS_LEAD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className="input w-auto" value={ordem} onChange={(e) => setOrdem(e.target.value as typeof ordem)}>
            <option value="comissao">Ordenar: Comissão ↓</option>
            <option value="consumo">Consumo ↓</option>
            <option value="score">Score ↓</option>
            <option value="nome">Nome A-Z</option>
          </select>
          <div className="ml-auto flex gap-2">
            <button className="btn-outline !px-3 !py-1.5 text-xs" onClick={todos}>☑️ Todos</button>
            <button className="btn-outline !px-3 !py-1.5 text-xs" onClick={topScore}>⭐ Top score</button>
            <button className="btn-outline !px-3 !py-1.5 text-xs" onClick={nenhum}>☐ Nenhum</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-slate-400">
                <th className="w-8 pb-2"></th>
                <th className="pb-2 font-medium">Lead</th>
                <th className="pb-2 font-medium">Segmento</th>
                <th className="pb-2 font-medium">Bairro</th>
                <th className="pb-2 text-right font-medium">Consumo</th>
                <th className="pb-2 text-right font-medium">Comissão</th>
                <th className="pb-2 text-center font-medium">Score</th>
                <th className="pb-2 text-center font-medium">Status</th>
                <th className="pb-2 text-center font-medium">📱</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 ? (
                <tr><td colSpan={10} className="py-8 text-center text-slate-400">Nenhum lead. Adicione um lead ou rode a prospecção.</td></tr>
              ) : lista.map((l) => (
                <tr key={l.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="py-2"><input type="checkbox" checked={sel.has(l.id)} onChange={() => toggle(l.id)} /></td>
                  <td className="py-2">
                    <p className="font-medium text-white">{l.nome}</p>
                    {l.subsegmento && <p className="text-xs text-slate-500">{l.subsegmento}</p>}
                  </td>
                  <td className="py-2"><Badge texto={SEGMENTO_LABEL[l.segmento]} cor={SEGMENTO_COR[l.segmento]} /></td>
                  <td className="py-2 text-slate-300">{l.bairro || "—"}</td>
                  <td className="py-2 text-right text-slate-300">{formatKwh(consumoLead(l))}</td>
                  <td className="py-2 text-right font-semibold text-eco-300">{formatBRL(comissaoLead(l))}</td>
                  <td className="py-2 text-center font-semibold text-white">{l.lead_score}</td>
                  <td className="py-2 text-center"><Badge texto={STATUS_LEAD_LABEL[l.status_lead]} cor={STATUS_LEAD_COR[l.status_lead]} /></td>
                  <td className="py-2 text-center">
                    {l.whatsapp ? <a href={`https://wa.me/${l.whatsapp}`} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}>📱</a> : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="py-2 text-right"><Link href={`/admin/leads/${l.id}`} className="text-brand-300 hover:underline">Ver</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
