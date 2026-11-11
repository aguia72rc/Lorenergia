"use client";

import { useState, useTransition } from "react";
import { simularPublico, type ResultadoPublico } from "@/app/simulador/actions";
import { AR, WHATSAPP } from "@/content/landing";

const brl = (n: number) => "R$ " + Math.round(n).toLocaleString("pt-BR");

export interface ProvaSocial {
  economiaTotal: number; // R$ já economizados pelos moradores
  familias: number | null;
}

function Barra({ rotulo, valor, fracao, cor }: { rotulo: string; valor: string; fracao: number; cor: string }) {
  const pct = Math.max(8, Math.min(100, Math.round(fracao * 100)));
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "14px", color: "rgba(255,246,227,.7)", marginBottom: "6px" }}>
        <span>{rotulo}</span>
        <span style={{ fontFamily: AR, fontWeight: 700, color: "#FFF6E3", whiteSpace: "nowrap" }}>{valor}</span>
      </div>
      <div style={{ height: "12px", borderRadius: "99px", background: "rgba(255,246,227,.1)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: "99px", background: cor }} />
      </div>
    </div>
  );
}

/** Simulador público, no visual da landing: formulário claro e resultado em painel escuro. */
export default function SimuladorPublico({
  planos,
  prova,
  resultadoInicial = null,
}: {
  planos: { codigo: string; nome: string; desconto: number }[];
  prova?: ProvaSocial | null;
  /** Só para testes de tela: abre já mostrando um resultado. */
  resultadoInicial?: ResultadoPublico | null;
}) {
  const [pendente, startTransition] = useTransition();
  const [modo, setModo] = useState<"kwh" | "reais">("kwh");
  const [entrada, setEntrada] = useState(300);
  const [planoCodigo, setPlanoCodigo] = useState("auto");
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [site, setSite] = useState(""); // isca anti-robô (escondida)
  const [res, setRes] = useState<ResultadoPublico | null>(resultadoInicial);

  function simular(e: React.FormEvent) {
    e.preventDefault();
    setRes(null);
    startTransition(async () => {
      const r = await simularPublico({ modo, entrada, planoCodigo, nome, whatsapp, site });
      setRes(r);
    });
  }

  const linkWhatsapp = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Olá! Sou ${nome.trim()}, fiz a simulação no site e quero saber mais.`)}`;

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <form onSubmit={simular} className="lp-card" noValidate>
        <div className="lp-form-grid">
          <div>
            <label className="lp-label" htmlFor="entrada">
              {modo === "kwh" ? "Consumo médio (kWh/mês)" : "Valor da conta (R$/mês)"}
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                id="entrada"
                type="number"
                min={0}
                step={modo === "kwh" ? 1 : 10}
                inputMode="decimal"
                className="lp-input"
                style={{ flex: 1, minWidth: 0 }}
                value={entrada}
                onChange={(e) => setEntrada(Number(e.target.value))}
              />
              <div className="lp-seg" role="group" aria-label="Informar em kWh ou em reais">
                {(["kwh", "reais"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={modo === m}
                    onClick={() => { setModo(m); setEntrada(m === "kwh" ? 300 : 350); }}
                  >
                    {m === "kwh" ? "kWh" : "R$"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="lp-label" htmlFor="plano">Plano</label>
            <select id="plano" className="lp-input" value={planoCodigo} onChange={(e) => setPlanoCodigo(e.target.value)}>
              <option value="auto">Melhor desconto</option>
              {planos.map((p) => <option key={p.codigo} value={p.codigo}>{p.nome} — {p.desconto}%</option>)}
            </select>
          </div>

          <div>
            <label className="lp-label" htmlFor="nome">Seu nome</label>
            <input id="nome" className="lp-input" autoComplete="name" maxLength={80} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Como podemos te chamar?" />
          </div>
          <div>
            <label className="lp-label" htmlFor="whatsapp">Seu WhatsApp</label>
            <input id="whatsapp" className="lp-input" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(81) 99999-9999" />
          </div>
          {/* Isca para robôs: pessoas não veem nem preenchem. */}
          <div aria-hidden style={{ position: "absolute", left: "-9999px", width: 0, height: 0, overflow: "hidden" }}>
            <label htmlFor="site">Site</label>
            <input id="site" tabIndex={-1} autoComplete="off" value={site} onChange={(e) => setSite(e.target.value)} />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <button type="submit" className="lp-btn" disabled={pendente}>
              {pendente ? "Calculando…" : "Ver quanto vou economizar"}
            </button>
          </div>
        </div>
        <p style={{ margin: "14px 0 0", fontSize: "13px", lineHeight: 1.5, color: "#7A8493" }}>
          Ao simular, você concorda em receber contato da Lorenergia pelo WhatsApp sobre a sua economia. Não enviamos spam.{" "}
          <a href="/privacidade" style={{ textDecoration: "underline" }}>Como usamos seus dados</a>.
        </p>
        <p style={{ margin: "8px 0 0", fontSize: "13px", lineHeight: 1.5, color: "#7A8493" }}>
          Você passa a receber créditos de energia solar, com desconto direto na sua conta de luz. Nada para instalar e nada para comprar. Estimativa gratuita, com base na tarifa vigente.
        </p>
      </form>

      <div aria-live="polite">
        {res && !res.ok && (
          <div className="lp-card" style={{ borderColor: "#F0C36D", background: "#FFF8E8" }}>
            <p style={{ margin: 0, fontSize: "15px", color: "#7A4B00" }}>
              {res.mensagem ||
                (res.motivo === "consumo_invalido"
                  ? "Informe o consumo para simular."
                  : "Simulador indisponível no momento. Tente novamente em instantes.")}
            </p>
          </div>
        )}

        {res && res.ok && (
          <div className="lp-pad" style={{ background: "#0B1017", color: "#FFF6E3", borderRadius: "22px", padding: "34px" }}>
            <p style={{ margin: 0, fontSize: "15px", color: "#FFD98A" }}>Todo mês, este dinheiro volta para você:</p>
            <p style={{ margin: "6px 0 0", fontFamily: AR, fontWeight: 900, fontSize: "46px", lineHeight: 1.05, letterSpacing: "-.03em", color: "#FFB21A" }}>
              {brl(res.faixaMin)}
              <span style={{ fontSize: "20px", fontWeight: 600, color: "rgba(255,246,227,.6)" }}> a {brl(res.faixaMax)}</span>
            </p>
            <p style={{ margin: "12px 0 0", fontSize: "16px", lineHeight: 1.55, color: "rgba(255,246,227,.78)" }}>
              Em um ano são pelo menos <strong style={{ color: "#FFF6E3" }}>{brl(res.anualMin)}</strong> que hoje vão embora na conta de luz e passam a ficar com você.
            </p>

            {res.contaHoje > 0 && (
              <div style={{ display: "grid", gap: "14px", marginTop: "24px", padding: "20px", borderRadius: "16px", background: "rgba(255,246,227,.05)" }}>
                <Barra rotulo="Hoje você paga" valor={`≈ ${brl(res.contaHoje)}`} fracao={1} cor="#7A8493" />
                <Barra
                  rotulo="Com a Lorenergia você pagaria"
                  valor={`até ${brl(res.contaComLorenergia)}`}
                  fracao={res.contaHoje > 0 ? res.contaComLorenergia / res.contaHoje : 1}
                  cor="linear-gradient(90deg,#FFB21A,#FFD98A)"
                />
              </div>
            )}

            <ul className="lp-ganhos">
              <li>💰 Economia todo mês, sem esforço</li>
              <li>🏠 Nada de obra ou equipamento: a conta continua no seu nome</li>
              <li>🚫 Sem mensalidade</li>
              <li>☀️ Você usa energia solar de verdade, limpa e mais barata</li>
            </ul>
            {prova && prova.economiaTotal > 0 && (
              <p style={{ margin: "18px 0 0", fontSize: "15px", color: "rgba(255,246,227,.78)" }}>
                Quem já aderiu economizou <strong style={{ color: "#FFB21A" }}>{brl(prova.economiaTotal)}</strong>
                {prova.familias ? <> em conjunto, em <strong style={{ color: "#FFF6E3" }}>{prova.familias} famílias</strong></> : null}.
              </p>
            )}

            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px 16px", marginTop: "24px" }}>
              <a
                href={linkWhatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="lp-cta"
                style={{ display: "inline-flex", alignItems: "center", gap: "10px", background: "linear-gradient(140deg,#FFC24D,#FF9E0B)", color: "#0B1017", fontFamily: AR, fontWeight: 800, fontSize: "17px", padding: "16px 26px", borderRadius: "14px" }}
              >
                Quero esse desconto na minha conta
              </a>
              <span style={{ fontSize: "13px", color: "rgba(255,246,227,.55)", maxWidth: "260px" }}>Um consultor confirma o seu valor e explica o passo a passo, sem compromisso.</span>
            </div>

            <p style={{ margin: "22px 0 0", padding: "14px 16px", borderRadius: "12px", border: "1px dashed rgba(255,178,26,.45)", fontSize: "13px", lineHeight: 1.55, color: "rgba(255,246,227,.72)" }}>
              <strong style={{ color: "#FFD98A" }}>Importante:</strong> os valores acima são uma <strong>estimativa</strong> com base no consumo
              que você informou e na tarifa vigente. O valor real depende do seu consumo mensal e pode variar. Esta
              simulação não é uma garantia de desconto.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
