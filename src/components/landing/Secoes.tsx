import { formatReferencia } from "@/lib/format";
import type { ResumoPublico } from "@/lib/resumo-publico";
import { AR, GERACAO_KWH_MES, whatsappLink, pains, benefits, stack, sims, objections } from "@/content/landing";

/**
 * Seções da landing page, na ordem em que aparecem. Os textos em lista (dores,
 * benefícios, simulações, objeções, perguntas) ficam em src/content/landing.ts.
 */

/** Bloco "economia total gerada" do destaque. Não aparece se ainda não há dado. */
function EconomiaTotal({ resumo }: { resumo: ResumoPublico | null }) {
  if (!resumo) return null;
  // Arredonda para baixo: nunca anunciar mais do que foi de fato economizado.
  const valor = Math.floor(resumo.economiaTotal).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const atualizado = resumo.ultimaReferencia ? ` • atualizado até ${formatReferencia(resumo.ultimaReferencia)}` : "";
  return (
    <div style={{ gridColumn: "1 / -1", paddingTop: "18px", borderTop: "1px solid rgba(255,246,227,.12)" }}>
      <div style={{ fontFamily: AR, fontWeight: "900", fontSize: "34px", color: "#FFB21A", lineHeight: "1.1" }}>{valor}</div>
      <div style={{ fontSize: "13px", color: "rgba(255,246,227,.6)", lineHeight: "1.35", marginTop: "2px" }}>já economizados pelas famílias da Lorenergia{atualizado}</div>
    </div>
  );
}

export function FaixaTopo() {
  return (
    <div style={{ background: "#0B1017", color: "#FFF6E3", fontFamily: AR, fontSize: "14px", letterSpacing: ".02em", textAlign: "center", padding: "11px 20px" }}>
      Recife e Região Metropolitana — Energia solar por assinatura, sem instalar nada.
    </div>
  );
}

export function Hero({ familias, resumo }: { familias: number; resumo: ResumoPublico | null }) {
  return (
    <section style={{ position: "relative", overflow: "hidden", background: "radial-gradient(120% 90% at 85% 0%, #1D2942 0%, #0B1017 58%)", color: "#FFF6E3" }}>
      <div style={{ position: "absolute", top: "-180px", right: "-140px", width: "620px", height: "620px", borderRadius: "50%", background: "radial-gradient(circle,rgba(255,178,26,.28) 0%,rgba(255,178,26,0) 68%)" }}></div>
      <div style={{ position: "relative", maxWidth: "1180px", margin: "0 auto", padding: "26px 28px 76px" }} className="lp-sec">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "46px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: "linear-gradient(140deg,#FFB21A,#FF8A00)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: AR, fontWeight: "900", color: "#0B1017", fontSize: "19px" }}>L</div>
            <div style={{ fontFamily: AR, fontWeight: "800", fontSize: "20px", letterSpacing: "-.02em" }}>Lorenergia</div>
          </div>
          <a href="/login" className="lp-enter" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 20px", borderRadius: "11px", fontFamily: AR, fontWeight: "700", fontSize: "15px" }}>Entrar</a>
        </div>
  
        <div className="lp-grid" style={{ display: "grid", gridTemplateColumns: "1.15fr .85fr", gap: "56px", alignItems: "center" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "9px", padding: "7px 14px", borderRadius: "99px", border: "1px solid rgba(255,178,26,.45)", background: "rgba(255,178,26,.1)", fontFamily: AR, fontWeight: "600", fontSize: "13px", color: "#FFD98A", letterSpacing: ".03em", marginBottom: "26px" }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#FFB21A" }}></span>
              RESPALDO DA LEI FEDERAL 14.300/2022
            </div>
            <h1 className="lp-h1" style={{ fontFamily: AR, fontWeight: "900", fontSize: "64px", lineHeight: "1.02", letterSpacing: "-.035em", margin: "0 0 26px", textWrap: "balance" }}>
              Você não precisa de painel solar pra economizar com <span style={{ color: "#FFB21A" }}>energia solar</span>.
            </h1>
            <p style={{ fontSize: "20px", lineHeight: "1.55", color: "rgba(255,246,227,.78)", margin: "0 0 34px", maxWidth: "620px", textWrap: "pretty" }}>
              Créditos de energia solar aplicados direto na sua conta da Neoenergia — sem instalar painel, sem gastar nada, sem fidelidade. Numa fatura de R$350, isso é <strong style={{ color: "#FFF6E3" }}>R$70 a menos todo mês</strong>. R$840 por ano de volta no seu bolso.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "center" }}>
              <a href={whatsappLink} target="_blank" rel="noopener" className="lp-cta" style={{ display: "inline-flex", alignItems: "center", gap: "10px", background: "linear-gradient(140deg,#FFC24D,#FF9E0B)", color: "#0B1017", fontFamily: AR, fontWeight: "800", fontSize: "18px", letterSpacing: "-.01em", padding: "19px 30px", borderRadius: "14px", animation: "lorPulse 2.8s ease-out infinite" }}>
                Quero pagar menos na minha conta de luz
              </a>
              <a href="/simulador" className="lp-cta2" style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontFamily: AR, fontWeight: "700", fontSize: "17px", padding: "18px 26px", borderRadius: "14px" }}>
                Simular minha economia
              </a>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px", marginTop: "18px", fontSize: "14px", color: "rgba(255,246,227,.6)" }}>
              <span>Sem custo de adesão</span><span>•</span><span>Economia já no 1º faturamento</span><span>•</span><span>Cancele quando quiser</span>
            </div>
          </div>
  
          <div style={{ background: "rgba(255,246,227,.06)", border: "1px solid rgba(255,246,227,.14)", borderRadius: "22px", padding: "30px", backdropFilter: "blur(6px)" }}>
            <div style={{ fontFamily: AR, fontSize: "13px", letterSpacing: ".08em", color: "rgba(255,246,227,.5)", marginBottom: "22px" }}>SUA FATURA, ANTES E DEPOIS</div>
            <div style={{ display: "grid", gap: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "16px 18px", borderRadius: "13px", background: "rgba(255,246,227,.05)" }}>
                <span style={{ fontSize: "15px", color: "rgba(255,246,227,.7)" }}>Hoje</span>
                <span style={{ fontFamily: AR, fontWeight: "700", fontSize: "26px", textDecoration: "line-through", textDecorationColor: "rgba(255,120,120,.8)" }}>R$ 350</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "16px 18px", borderRadius: "13px", background: "rgba(255,178,26,.15)", border: "1px solid rgba(255,178,26,.4)" }}>
                <span style={{ fontSize: "15px", color: "#FFD98A" }}>Com a Lorenergia</span>
                <span style={{ fontFamily: AR, fontWeight: "900", fontSize: "34px", color: "#FFB21A" }}>R$ 280</span>
              </div>
            </div>
            <div style={{ marginTop: "22px", paddingTop: "22px", borderTop: "1px solid rgba(255,246,227,.12)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px" }}>
              <div>
                <div style={{ fontFamily: AR, fontWeight: "900", fontSize: "30px", color: "#FFF6E3" }}>{familias}</div>
                <div style={{ fontSize: "13px", color: "rgba(255,246,227,.6)", lineHeight: "1.35" }}>famílias já economizam em PE</div>
              </div>
              <div>
                <div style={{ fontFamily: AR, fontWeight: "900", fontSize: "30px", color: "#FFF6E3" }}>{GERACAO_KWH_MES}</div>
                <div style={{ fontSize: "13px", color: "rgba(255,246,227,.6)", lineHeight: "1.35" }}>kWh/mês gerados na usina</div>
              </div>
              <EconomiaTotal resumo={resumo} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Dores() {
  return (
    <section className="lp-sec" style={{ maxWidth: "1180px", margin: "0 auto", padding: "96px 28px 0" }}>
      <div className="lp-grid" style={{ display: "grid", gridTemplateColumns: ".9fr 1.1fr", gap: "64px" }}>
        <div>
          <h2 className="lp-h2" style={{ fontFamily: AR, fontWeight: "800", fontSize: "42px", lineHeight: "1.08", letterSpacing: "-.03em", margin: "0 0 22px" }}>Todo mês a mesma cena.</h2>
          <p style={{ fontSize: "18px", lineHeight: "1.6", color: "#4A5361", margin: "0 0 16px", textWrap: "pretty" }}>A fatura chega e você olha o valor com aquele aperto no peito. O consumo é o mesmo — só o preço muda pra pior.</p>
          <p style={{ fontSize: "18px", lineHeight: "1.6", color: "#4A5361", margin: "0", textWrap: "pretty" }}>A maioria das famílias em Recife e Jaboatão acha que a única saída é instalar painel em casa. Só que isso custa caro, exige obra, e não serve pra quem mora em apartamento, aluga ou não tem telhado.</p>
        </div>
        <div style={{ display: "grid", gap: "10px" }}>
          {pains.map((p) => (
  <div key={p.n} style={{ display: "flex", gap: "14px", alignItems: "flex-start", background: "#FFFFFF", border: "1px solid #EAE2D4", borderRadius: "13px", padding: "17px 19px" }}>
              <span style={{ flex: "none", marginTop: "2px", width: "20px", height: "20px", borderRadius: "6px", background: "#FFEFD1", color: "#B8801A", fontFamily: AR, fontWeight: "800", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>{p.n}</span>
              <span style={{ fontSize: "16px", lineHeight: "1.5", color: "#2B323C" }}>{p.text}</span>
            </div>
  ))}
        </div>
      </div>
    </section>
  );
}

export function ComoFunciona() {
  return (
    <section className="lp-sec" style={{ maxWidth: "1180px", margin: "0 auto", padding: "96px 28px 0" }}>
      <div style={{ textAlign: "center", maxWidth: "760px", margin: "0 auto 48px" }}>
        <div style={{ fontFamily: AR, fontSize: "13px", letterSpacing: ".1em", color: "#B8801A", marginBottom: "14px" }}>COMO FUNCIONA</div>
        <h2 className="lp-h2" style={{ fontFamily: AR, fontWeight: "800", fontSize: "44px", lineHeight: "1.06", letterSpacing: "-.03em", margin: "0 0 18px", textWrap: "balance" }}>Energia por assinatura, não obra em casa.</h2>
        <p style={{ fontSize: "18px", lineHeight: "1.6", color: "#4A5361", margin: "0", textWrap: "pretty" }}>Você se conecta à nossa usina solar já em operação em Pernambuco e recebe uma cota dos créditos que ela gera. Esses créditos entram automaticamente na sua fatura da Neoenergia.</p>
      </div>
      <div className="lp-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "20px" }}>
        <div style={{ background: "#0B1017", color: "#FFF6E3", borderRadius: "20px", padding: "32px" }}>
          <div style={{ fontFamily: AR, fontWeight: "900", fontSize: "42px", color: "#FFB21A", lineHeight: "1", marginBottom: "18px" }}>01</div>
          <div style={{ fontFamily: AR, fontWeight: "700", fontSize: "21px", marginBottom: "10px", letterSpacing: "-.02em" }}>Você se inscreve</div>
          <div style={{ fontSize: "16px", lineHeight: "1.55", color: "rgba(255,246,227,.7)" }}>Leva minutos, é de graça e não exige nenhuma visita técnica.</div>
        </div>
        <div style={{ background: "#0B1017", color: "#FFF6E3", borderRadius: "20px", padding: "32px" }}>
          <div style={{ fontFamily: AR, fontWeight: "900", fontSize: "42px", color: "#FFB21A", lineHeight: "1", marginBottom: "18px" }}>02</div>
          <div style={{ fontFamily: AR, fontWeight: "700", fontSize: "21px", marginBottom: "10px", letterSpacing: "-.02em" }}>A gente cuida do resto</div>
          <div style={{ fontSize: "16px", lineHeight: "1.55", color: "rgba(255,246,227,.7)" }}>Toda a parte técnica e regulatória com a Neoenergia é nossa, sob a Lei 14.300/2022.</div>
        </div>
        <div style={{ background: "linear-gradient(150deg,#FFC24D,#FF9E0B)", color: "#0B1017", borderRadius: "20px", padding: "32px" }}>
          <div style={{ fontFamily: AR, fontWeight: "900", fontSize: "42px", lineHeight: "1", marginBottom: "18px", color: "rgba(11,16,23,.45)" }}>03</div>
          <div style={{ fontFamily: AR, fontWeight: "700", fontSize: "21px", marginBottom: "10px", letterSpacing: "-.02em" }}>A conta chega menor</div>
          <div style={{ fontSize: "16px", lineHeight: "1.55", color: "rgba(11,16,23,.75)" }}>Mesma distribuidora, mesmo CPF, mesmo endereço. Até 20% de desconto sobre o seu consumo.</div>
        </div>
      </div>
    </section>
  );
}

export function Beneficios() {
  return (
    <section className="lp-sec" style={{ maxWidth: "1180px", margin: "0 auto", padding: "96px 28px 0" }}>
      <h2 className="lp-h2" style={{ fontFamily: AR, fontWeight: "800", fontSize: "44px", lineHeight: "1.06", letterSpacing: "-.03em", margin: "0 0 44px", maxWidth: "700px", textWrap: "balance" }}>O que muda de verdade na sua casa</h2>
      <div className="lp-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "18px" }}>
        {benefits.map(([title, text]) => (
  <div key={title} style={{ background: "#FFFFFF", border: "1px solid #EAE2D4", borderRadius: "18px", padding: "28px 26px" }}>
            <div style={{ width: "30px", height: "4px", borderRadius: "99px", background: "#FFB21A", marginBottom: "20px" }}></div>
            <div style={{ fontFamily: AR, fontWeight: "700", fontSize: "19px", lineHeight: "1.2", letterSpacing: "-.02em", marginBottom: "10px" }}>{title}</div>
            <div style={{ fontSize: "15px", lineHeight: "1.55", color: "#4A5361" }}>{text}</div>
          </div>
  ))}
      </div>
    </section>
  );
}

export function Oferta() {
  return (
    <section className="lp-sec" style={{ maxWidth: "1180px", margin: "0 auto", padding: "96px 28px 0" }}>
      <div className="lp-grid" style={{ background: "#FFFFFF", border: "1px solid #EAE2D4", borderRadius: "26px", overflow: "hidden", display: "grid", gridTemplateColumns: "1.05fr .95fr" }}>
        <div style={{ padding: "52px 48px" }}>
          <div style={{ fontFamily: AR, fontSize: "13px", letterSpacing: ".1em", color: "#B8801A", marginBottom: "16px" }}>O QUE VOCÊ RECEBE AO ASSINAR</div>
          <div style={{ display: "grid", gap: "12px", marginBottom: "34px" }}>
            {stack.map((text) => (
  <div key={text} style={{ display: "flex", gap: "13px", alignItems: "flex-start" }}>
                <span style={{ flex: "none", width: "21px", height: "21px", borderRadius: "99px", background: "#0B1017", color: "#FFB21A", fontSize: "12px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", marginTop: "1px" }}>✓</span>
                <span style={{ fontSize: "16.5px", lineHeight: "1.45", color: "#2B323C" }}>{text}</span>
              </div>
  ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", paddingTop: "28px", borderTop: "1px solid #EFE8DB" }}>
            <div>
              <div style={{ fontSize: "14px", color: "#7A8493", marginBottom: "4px" }}>Custo pra aderir</div>
              <div style={{ fontFamily: AR, fontWeight: "900", fontSize: "34px", letterSpacing: "-.03em" }}>R$ 0,00</div>
            </div>
            <div>
              <div style={{ fontSize: "14px", color: "#7A8493", marginBottom: "4px" }}>O que você paga</div>
              <div style={{ fontSize: "16px", lineHeight: "1.4", color: "#2B323C", paddingTop: "6px" }}>só a própria conta de luz, já com desconto</div>
            </div>
          </div>
        </div>
        <div style={{ background: "#12192A", color: "#FFF6E3", padding: "52px 46px" }}>
          <div style={{ fontFamily: AR, fontSize: "13px", letterSpacing: ".1em", color: "rgba(255,246,227,.5)", marginBottom: "26px" }}>SIMULAÇÃO REAL</div>
          <div style={{ display: "grid", gap: "12px" }}>
            {sims.map((s) => (
  <div key={s.fatura} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "10px", alignItems: "center", padding: "18px 20px", borderRadius: "14px", background: "rgba(255,246,227,.05)" }}>
                <div>
                  <div style={{ fontSize: "15px", color: "rgba(255,246,227,.65)" }}>Fatura de {s.fatura}/mês</div>
                  <div style={{ fontFamily: AR, fontWeight: "700", fontSize: "20px", marginTop: "3px" }}>{s.mes} por mês</div>
                </div>
                <div style={{ fontFamily: AR, fontWeight: "900", fontSize: "24px", color: "#FFB21A" }}>{s.ano}<span style={{ fontSize: "13px", fontWeight: "600", color: "rgba(255,246,227,.5)" }}>/ano</span></div>
              </div>
  ))}
          </div>
          <div style={{ marginTop: "26px", padding: "22px", borderRadius: "14px", border: "1px dashed rgba(255,178,26,.45)", fontSize: "16px", lineHeight: "1.55", color: "rgba(255,246,227,.8)" }}>
            Em 5 anos isso pode representar <strong style={{ color: "#FFB21A" }}>mais de R$4.000</strong> que fica no seu bolso em vez de sair pra Neoenergia — sem você ter feito nada além de assinar.
          </div>
        </div>
      </div>
    </section>
  );
}

export function Objecoes() {
  return (
    <section className="lp-sec" style={{ maxWidth: "1180px", margin: "0 auto", padding: "96px 28px 0" }}>
      <div className="lp-grid" style={{ display: "grid", gridTemplateColumns: ".85fr 1.15fr", gap: "56px" }}>
        <div>
          <h2 className="lp-h2" style={{ fontFamily: AR, fontWeight: "800", fontSize: "40px", lineHeight: "1.06", letterSpacing: "-.03em", margin: "0 0 18px" }}>&quot;Isso não é golpe?&quot;</h2>
          <p style={{ fontSize: "17px", lineHeight: "1.6", color: "#4A5361", margin: "0" }}>A desconfiança faz sentido — o modelo é novo pra maioria das pessoas. Por isso respondemos tudo de frente.</p>
        </div>
        <div style={{ display: "grid", gap: "12px" }}>
          {objections.map((o) => (
  <div key={o.q} style={{ background: "#FFFFFF", border: "1px solid #EAE2D4", borderLeft: "4px solid #FFB21A", borderRadius: "14px", padding: "24px 26px" }}>
              <div style={{ fontFamily: AR, fontWeight: "700", fontSize: "18px", marginBottom: "9px", letterSpacing: "-.01em" }}>{o.q}</div>
              <div style={{ fontSize: "16px", lineHeight: "1.6", color: "#4A5361" }}>{o.a}</div>
            </div>
  ))}
        </div>
      </div>
    </section>
  );
}

export function Garantia() {
  return (
    <section className="lp-sec" style={{ maxWidth: "1180px", margin: "0 auto", padding: "96px 28px 0" }}>
      <div className="lp-grid lp-pad" style={{ background: "linear-gradient(150deg,#FFC24D,#FF9E0B)", borderRadius: "26px", padding: "56px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: AR, fontSize: "13px", letterSpacing: ".1em", color: "rgba(11,16,23,.55)", marginBottom: "14px" }}>GARANTIA</div>
          <h2 className="lp-h2" style={{ fontFamily: AR, fontWeight: "900", fontSize: "44px", lineHeight: "1.04", letterSpacing: "-.035em", margin: "0" }}>Sua garantia é a sua própria fatura.</h2>
        </div>
        <div style={{ fontSize: "17.5px", lineHeight: "1.6", color: "rgba(11,16,23,.82)" }}>
          <p style={{ margin: "0 0 14px" }}>Você não investe nada pra começar e não assina fidelidade. Você olha o próximo boleto da Neoenergia e confere com seus próprios olhos o desconto aplicado.</p>
          <p style={{ margin: "0" }}>Se em algum momento não quiser continuar — no primeiro mês, no sexto ou no quinto ano — é só avisar. Cancelamos sem multa e sem burocracia. O risco é literalmente zero, porque você nunca colocou dinheiro na jogada.</p>
        </div>
      </div>
    </section>
  );
}

export function Capacidade() {
  return (
    <section className="lp-sec" style={{ maxWidth: "1180px", margin: "0 auto", padding: "96px 28px 0" }}>
      <div className="lp-grid lp-pad" style={{ border: "1px solid #EAE2D4", background: "#FFFFFF", borderRadius: "22px", padding: "44px 48px", display: "grid", gridTemplateColumns: "1fr auto", gap: "40px", alignItems: "center" }}>
        <div>
          <h2 className="lp-h2" style={{ fontFamily: AR, fontWeight: "800", fontSize: "32px", letterSpacing: "-.03em", margin: "0 0 14px" }}>Nossa usina tem capacidade limitada.</h2>
          <p style={{ fontSize: "17px", lineHeight: "1.6", color: "#4A5361", margin: "0", maxWidth: "640px" }}>Hoje operamos 1 usina com geração total de {GERACAO_KWH_MES} kWh/mês. Cada família que entra ocupa parte dessa capacidade — quando ela é preenchida, entramos em lista de espera até a próxima expansão. Quanto antes você assinar, mais cedo o desconto aparece na sua conta.</p>
        </div>
        <div style={{ textAlign: "center", padding: "26px 34px", borderRadius: "18px", background: "#FFF6E3" }}>
          <div style={{ fontFamily: AR, fontWeight: "900", fontSize: "44px", color: "#B8801A", letterSpacing: "-.03em", lineHeight: "1" }}>{GERACAO_KWH_MES}</div>
          <div style={{ fontSize: "14px", color: "#7A8493", marginTop: "6px" }}>kWh/mês disponíveis</div>
        </div>
      </div>
    </section>
  );
}

export function ChamadaFinal() {
  return (
    <section style={{ marginTop: "96px", background: "radial-gradient(110% 90% at 50% 0%, #1D2942 0%, #0B1017 60%)", color: "#FFF6E3", padding: "96px 28px 104px" }}>
      <div style={{ maxWidth: "840px", margin: "0 auto", textAlign: "center" }}>
        <h2 className="lp-h1" style={{ fontFamily: AR, fontWeight: "900", fontSize: "52px", lineHeight: "1.05", letterSpacing: "-.035em", margin: "0 0 24px", textWrap: "balance" }}>Enquanto sua conta sobe, esse desconto já podia estar caindo na sua fatura.</h2>
        <p style={{ fontSize: "19px", lineHeight: "1.6", color: "rgba(255,246,227,.72)", margin: "0 0 12px" }}>Você não precisa instalar nada. Não precisa investir nada. Não precisa assinar fidelidade nenhuma. Só precisa dizer sim.</p>
        <p style={{ fontSize: "19px", lineHeight: "1.6", color: "rgba(255,246,227,.72)", margin: "0 0 38px" }}>A cada mês sem assinar é mais um mês de dinheiro saindo da sua família pra Neoenergia — dinheiro que podia ficar em casa.</p>
        <a href={whatsappLink} target="_blank" rel="noopener" className="lp-cta" style={{ display: "inline-flex", alignItems: "center", gap: "10px", background: "linear-gradient(140deg,#FFC24D,#FF9E0B)", color: "#0B1017", fontFamily: AR, fontWeight: "800", fontSize: "19px", padding: "21px 36px", borderRadius: "14px" }}>
          Quero economizar até 20% na minha conta agora
        </a>
        <div style={{ marginTop: "16px", fontSize: "14px", color: "rgba(255,246,227,.55)" }}>Grátis • Sem fidelidade • Economia no 1º mês</div>
        <div style={{ marginTop: "22px" }}>
          <a href="/simulador" className="lp-cta2" style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontFamily: AR, fontWeight: "700", fontSize: "16px", padding: "14px 24px", borderRadius: "12px" }}>
            Prefere ver o seu número antes? Simule em 1 minuto
          </a>
        </div>
  
        <div style={{ marginTop: "56px", textAlign: "left", background: "rgba(255,246,227,.06)", borderLeft: "3px solid #FFB21A", borderRadius: "12px", padding: "26px 30px", fontSize: "16.5px", lineHeight: "1.65", color: "rgba(255,246,227,.78)" }}>
          <strong style={{ color: "#FFB21A", fontFamily: AR }}>PS:</strong> se você chegou até aqui, é porque a conta de luz realmente pesa no seu orçamento. Não custa nada testar — você não paga adesão, não assina fidelidade e pode sair quando quiser. No pior cenário, você volta a pagar o que já paga hoje. No melhor, sua família fica com até R$1.200 a mais por ano no bolso.
        </div>
      </div>
    </section>
  );
}

export function Rodape() {
  return (
    <footer style={{ background: "#070B11", color: "rgba(255,246,227,.5)", padding: "34px 28px", fontSize: "14px" }}>
      <div style={{ maxWidth: "1180px", margin: "0 auto", display: "flex", flexWrap: "wrap", gap: "16px", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: AR, fontWeight: "700", color: "#FFF6E3" }}>Lorenergia</div>
        <nav aria-label="Links do rodapé" style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px" }}>
          <a href="/simulador" className="lp-rodape">Simulador de economia</a>
          <a href="/privacidade" className="lp-rodape">Política de privacidade</a>
          <a href="/login" className="lp-rodape">Área do cliente</a>
        </nav>
        <div style={{ flexBasis: "100%" }}>Geração compartilhada regulamentada pela Lei Federal 14.300/2022 • PERNAMBUCO</div>
      </div>
    </footer>
  );
}
