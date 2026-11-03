import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatKwh } from "@/lib/format";
import type { Lead } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Pessoas que fizeram a simulação no site (nome e WhatsApp), da mais recente para a mais antiga. */
export default async function ContatosSimuladorPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select("*")
    .eq("fonte_dados", "SIMULADOR")
    .order("created_at", { ascending: false });
  const contatos = (data ?? []) as Lead[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>Contatos do simulador</h1>
        <p className="text-sm text-slate-400">
          Quem simulou a economia no site e deixou nome e WhatsApp — {contatos.length} contato(s).
        </p>
      </div>

      {contatos.length === 0 ? (
        <div className="card text-sm text-slate-400">
          Ainda não há contatos. Quando alguém usar o simulador em <strong className="text-slate-200">/simulador</strong>, o nome e o WhatsApp aparecem aqui.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-slate-400">
                <th className="pb-2 font-medium">Data</th>
                <th className="pb-2 font-medium">Nome</th>
                <th className="pb-2 font-medium">WhatsApp</th>
                <th className="pb-2 text-right font-medium">Consumo</th>
                <th className="pb-2 font-medium">Simulação</th>
                <th className="pb-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {contatos.map((l) => {
                const zap = (l.whatsapp ?? "").replace(/\D/g, "");
                const msg = encodeURIComponent(`Olá, ${l.nome}! Aqui é da Lorenergia. Vi que você simulou a sua economia no nosso site e queria te ajudar a conferir o valor.`);
                return (
                  <tr key={l.id} className="border-b border-white/5 last:border-0">
                    <td className="whitespace-nowrap py-2 pr-3 text-slate-400">
                      {new Date(l.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                    </td>
                    <td className="py-2 pr-3 font-medium text-white">{l.nome}</td>
                    <td className="whitespace-nowrap py-2 pr-3 text-slate-300">{zap ? `+${zap}` : "—"}</td>
                    <td className="whitespace-nowrap py-2 pr-3 text-right tabular-nums text-slate-300">
                      {Number(l.consumo_estimado_kwh) > 0 ? formatKwh(Number(l.consumo_estimado_kwh)) : "—"}
                    </td>
                    <td className="py-2 pr-3 text-xs text-slate-400">{l.observacoes ?? "—"}</td>
                    <td className="whitespace-nowrap py-2 text-right">
                      {zap && (
                        <a href={`https://wa.me/${zap}?text=${msg}`} target="_blank" rel="noopener noreferrer" className="btn-eco">
                          <MessageCircle className="h-4 w-4" /> Chamar
                        </a>
                      )}
                      <Link href={`/admin/leads/${l.id}`} className="ml-2 text-xs text-slate-400 underline hover:text-white">detalhes</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
