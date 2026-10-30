"use client";

import { useState, useTransition } from "react";
import { simularPublico, type ResultadoPublico } from "@/app/simulador/actions";

const brl = (n: number) => "R$ " + Math.round(n).toLocaleString("pt-BR");

export interface ProvaSocial {
  economiaTotal: number; // R$ já economizados pelos moradores
  familias: number | null;
}

function Barra({ rotulo, valor, fracao, cor }: { rotulo: string; valor: string; fracao: number; cor: string }) {
  const pct = Math.max(8, Math.min(100, Math.round(fracao * 100)));
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-slate-300">
        <span>{rotulo}</span>
        <span className="font-semibold text-white">{valor}</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${cor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function SimuladorPublico({
  planos,
  prova,
}: {
  planos: { codigo: string; nome: string; desconto: number }[];
  prova?: ProvaSocial | null;
}) {
  const [pendente, startTransition] = useTransition();
  const [modo, setModo] = useState<"kwh" | "reais">("kwh");
  const [entrada, setEntrada] = useState(300);
  const [planoCodigo, setPlanoCodigo] = useState("auto");
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [site, setSite] = useState(""); // isca anti-robô (escondida)
  const [res, setRes] = useState<ResultadoPublico | null>(null);

  function simular() {
    setRes(null);
    startTransition(async () => {
      const r = await simularPublico({ modo, entrada, planoCodigo, nome, whatsapp, site });
      setRes(r);
    });
  }

  return (
    <div className="space-y-5">
      <div className="card">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="entrada">
              {modo === "kwh" ? "Consumo médio (kWh/mês)" : "Valor da conta (R$/mês)"}
            </label>
            <div className="flex gap-2">
              <input
                id="entrada"
                type="number"
                min={0}
                step={modo === "kwh" ? 1 : 10}
                inputMode="decimal"
                className="input flex-1"
                value={entrada}
                onChange={(e) => setEntrada(Number(e.target.value))}
              />
              <div className="flex overflow-hidden rounded-xl border border-white/10">
                {(["kwh", "reais"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setModo(m); setEntrada(m === "kwh" ? 300 : 350); }}
                    className={`px-3 text-sm font-medium ${modo === m ? "bg-brand-500 text-brand-950" : "text-slate-300 hover:bg-white/5"}`}
                  >
                    {m === "kwh" ? "kWh" : "R$"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="plano">Plano</label>
            <select id="plano" className="input" value={planoCodigo} onChange={(e) => setPlanoCodigo(e.target.value)}>
              <option value="auto">Melhor desconto</option>
              {planos.map((p) => <option key={p.codigo} value={p.codigo}>{p.nome} — {p.desconto}%</option>)}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="nome">Seu nome</label>
            <input id="nome" className="input" autoComplete="name" maxLength={80} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Como podemos te chamar?" />
          </div>
          <div>
            <label className="label" htmlFor="whatsapp">Seu WhatsApp</label>
            <input id="whatsapp" className="input" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(81) 99999-9999" />
          </div>
          {/* Isca para robôs: pessoas não veem nem preenchem. */}
          <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label htmlFor="site">Site</label>
            <input id="site" tabIndex={-1} autoComplete="off" value={site} onChange={(e) => setSite(e.target.value)} />
          </div>

          <div className="sm:col-span-2">
            <button onClick={simular} className="btn-primary w-full" disabled={pendente}>
              {pendente ? "Calculando…" : "Ver quanto vou economizar"}
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Ao simular, você concorda em receber contato da Lorenergia pelo WhatsApp sobre a sua economia. Não enviamos spam.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Você passa a receber créditos de energia solar, com desconto direto na sua conta de luz. Nada para instalar e nada para comprar. Estimativa gratuita, com base na tarifa vigente.
        </p>
      </div>

      {res && !res.ok && (
        <div className="card">
          <p className="text-sm text-amber-300">
            {res.mensagem ||
              (res.motivo === "consumo_invalido"
                ? "Informe o consumo para simular."
                : "Simulador indisponível no momento. Tente novamente em instantes.")}
          </p>
        </div>
      )}

      {res && res.ok && (
        <div className="relative overflow-hidden rounded-2xl border border-eco-500/30 p-6"
          style={{ background: "linear-gradient(120deg, rgba(16,185,129,0.20), rgba(255,176,32,0.10))" }}>
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-eco-500/20 blur-3xl" />
          <p className="relative text-sm text-eco-200">Todo mês, este dinheiro volta para você:</p>
          <p className="relative mt-1 text-4xl font-extrabold text-white" style={{ fontFamily: "var(--font-display)" }}>
            {brl(res.faixaMin)}
            <span className="text-lg font-semibold text-eco-200"> a {brl(res.faixaMax)}</span>
          </p>
          <p className="relative mt-2 text-sm text-eco-200">
            Em um ano são pelo menos <strong className="text-white">{brl(res.anualMin)}</strong> que hoje vão embora na conta de luz e passam a ficar com você.
          </p>
          {res.contaHoje > 0 && (
            <div className="relative mt-5 space-y-2 rounded-xl bg-black/20 p-4">
              <Barra rotulo="Hoje você paga" valor={`≈ ${brl(res.contaHoje)}`} fracao={1} cor="bg-slate-400" />
              <Barra
                rotulo="Com a Lorenergia você pagaria"
                valor={`até ${brl(res.contaComLorenergia)}`}
                fracao={res.contaHoje > 0 ? res.contaComLorenergia / res.contaHoje : 1}
                cor="bg-eco-400"
              />
            </div>
          )}

          <ul className="relative mt-4 grid gap-2 text-sm text-eco-100 sm:grid-cols-2">
            <li>💰 Economia todo mês, sem esforço</li>
            <li>🏠 Nada de obra ou equipamento: a conta continua no seu nome</li>
            <li>🚫 Sem mensalidade</li>
            <li>☀️ Você usa energia solar de verdade, limpa e mais barata</li>
          </ul>
          {prova && prova.economiaTotal > 0 && (
            <p className="relative mt-4 text-sm text-eco-200">
              Quem já aderiu economizou{" "}
              <strong className="text-white">{brl(prova.economiaTotal)}</strong>
              {prova.familias ? <> em conjunto, em <strong className="text-white">{prova.familias} famílias</strong></> : null}.
            </p>
          )}

          <div className="relative mt-4 flex flex-wrap gap-3">
            <a href={`https://wa.me/5581995592624?text=${encodeURIComponent(`Olá! Sou ${nome.trim()}, fiz a simulação no site e quero saber mais.`)}`} target="_blank" rel="noopener noreferrer" className="btn-eco">
              Quero esse desconto na minha conta
            </a>
            <span className="self-center text-xs text-slate-400">Um consultor confirma o seu valor e explica o passo a passo, sem compromisso.</span>
          </div>

          <div className="relative mt-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
            <span aria-hidden className="text-amber-300">⚠️</span>
            <p className="text-xs leading-relaxed text-amber-100">
              <strong>Importante:</strong> os valores acima são uma <strong>estimativa</strong> com base no consumo
              que você informou e na tarifa vigente. O valor real depende do seu consumo mensal e pode variar. Esta
              simulação não é uma garantia de desconto.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
