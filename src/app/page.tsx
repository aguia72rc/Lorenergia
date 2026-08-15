import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import CalculadoraEconomia from "@/components/CalculadoraEconomia";
import FaqLista from "@/components/FaqLista";

export const dynamic = "force-dynamic";

const WHATSAPP = "5581995592624";
const whatsappLink =
  "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent("Olá! Quero economizar na minha conta de luz com a Lorenergia.");

const AR = "'Archivo',sans-serif";

const pains = [
  "Você abre a fatura da Neoenergia todo mês e sente aquele aperto — de novo.",
  "Você já pensou em energia solar, mas achou que precisava gastar R$15-20 mil e esperar meses de obra.",
  "Você desconfia de qualquer coisa que promete desconto na conta de luz — parece bom demais pra ser verdade.",
  "Você mora de aluguel, em apartamento, ou não tem telhado, e achou que solar não era pra você.",
  'Você tentou entender "geração compartilhada" e desistiu no meio, de tanta burocracia.',
  "Você só quer pagar menos e cuidar melhor do orçamento da família, sem risco e sem complicação.",
].map((text, i) => ({ n: i + 1, text }));

const benefits: [string, string][] = [
  ["Alívio já no primeiro mês", "A redução de até 20% aparece na fatura logo depois de aderir. Não é promessa pro futuro — é dinheiro que sobra agora."],
  ["Sem obra, sem transtorno", "Nada de engenheiro, autorização de condomínio ou furo no telhado. Sua rotina não muda em nada."],
  ["Zero preocupação técnica", "Nunca vai limpar painel, trocar peça ou ligar pra assistência. Se algo acontece com as usinas, o problema é nosso."],
  ["Sem investimento inicial", "Você paga R$0,00 pra começar. O dinheiro que sobra é só o que você deixa de pagar na Neoenergia."],
  ["Liberdade total", "Entra quando quer, sai quando quer. Nenhuma letra miúda te prendendo."],
  ["Respaldo de lei federal", "O benefício vem da Lei 14.300/2022, não de uma promessa comercial. Isso te protege como consumidor."],
  ["Mesma distribuidora", "Você não muda de fornecedor nem corre risco de ficar sem energia. Só a fatura chega mais barata."],
  ["Serve pra qualquer imóvel", "Casa própria, apartamento, aluguel ou comércio — sem instalação física, funciona em qualquer situação."],
];

const testimonials = [
  { quote: "Minha conta caiu de R$XXX pra R$XXX logo no primeiro mês. Não mudei nada em casa.", name: "[Depoimento 1]", place: "Bairro, Recife" },
  { quote: "Não precisei fazer nada, só me inscrever. Foi mais fácil que abrir conta em banco.", name: "[Depoimento 2]", place: "Bairro, Jaboatão" },
  { quote: "Fiquei com medo no início, mas a conta continua vindo da Neoenergia mesmo, no meu nome, só mais barata.", name: "[Depoimento 3]", place: "Bairro, Recife" },
];

const stack = [
  "Créditos de energia solar aplicados direto na sua fatura Neoenergia PE",
  "Até 20% de desconto sobre o seu consumo em kWh",
  "Economia já a partir do 1º faturamento",
  "Sem instalação de nenhum equipamento",
  "Sem manutenção — nunca",
  "Sem investimento inicial (R$ 0,00 pra aderir)",
  "Sem fidelidade — cancele quando quiser, sem multa",
  "Respaldo da Lei Federal 14.300/2022",
  "Continua com a Neoenergia, no seu CPF, no seu nome",
];

const sims = [
  { fatura: "R$250", mes: "R$50 a menos", ano: "R$600" },
  { fatura: "R$350", mes: "R$70 a menos", ano: "R$840" },
  { fatura: "R$500", mes: "R$100 a menos", ano: "R$1.200" },
];

const objections = [
  { q: "Isso não é golpe?", a: "O modelo é regulamentado pela Lei Federal 14.300/2022. Você continua recebendo a fatura da própria Neoenergia, com o seu CPF, no seu endereço. Não existe transferência de titularidade nem contrato com terceiros obscuros. O que muda é só o valor final." },
  { q: "Vou precisar trocar de distribuidora ou mexer na instalação elétrica?", a: "Não. Zero mudança física na sua casa. Sua energia continua vindo da mesma rede da Neoenergia, do mesmo jeito de sempre." },
  { q: "E se eu quiser sair depois?", a: "Sem problema. Não existe fidelidade. Você cancela quando quiser, sem multa, sem retenção e sem ligação insistente." },
  { q: "Não moro em casa própria e não tenho telhado — serve pra mim?", a: "Serve. Como você não instala nada, o modelo funciona igual pra aluguel, apartamento, casa própria ou comércio." },
  { q: "Parece complicado de entender.", a: "Na prática é simples: você se inscreve, a gente cuida de toda a parte técnica e regulatória com a Neoenergia, e o desconto aparece automaticamente na próxima fatura." },
];

const faqs = [
  { q: "Preciso instalar alguma coisa na minha casa?", a: "Não. A energia continua vindo da Neoenergia normalmente, pela mesma rede. Só os créditos solares são aplicados na sua fatura." },
  { q: "Serve pra quem mora de aluguel ou apartamento?", a: "Sim. Como não há instalação física em lugar nenhum, o modelo funciona igual em qualquer imóvel." },
  { q: "Quanto tempo até eu começar a economizar?", a: "A economia já aparece na sua primeira fatura após a adesão." },
  { q: "E se eu não gostar ou quiser cancelar?", a: "Você cancela quando quiser, sem multa e sem burocracia — não existe fidelidade." },
  { q: "Preciso pagar algo pra aderir?", a: "Não. A adesão é 100% gratuita. Você só continua pagando sua própria conta de luz, agora com desconto." },
  { q: "Isso é legal e regulamentado?", a: "Sim. O modelo é baseado na Lei Federal 14.300/2022, que regulamenta a geração compartilhada de energia elétrica no Brasil desde janeiro de 2022." },
  { q: "A conta muda de nome ou CPF?", a: "Não. A fatura continua vindo no seu CPF, no seu endereço, com a Neoenergia Pernambuco. Só o valor final chega menor." },
  { q: "Como faço pra assinar?", a: "Basta se inscrever pelo WhatsApp. Em poucos minutos você já está cadastrado, e a partir da próxima fatura o desconto começa a aparecer." },
];

const htmlTopo = `
  <div style="background:#0B1017; color:#FFF6E3; font-family:${AR}; font-size:14px; letter-spacing:.02em; text-align:center; padding:11px 20px;">
    Recife e Região Metropolitana — Energia solar por assinatura, sem instalar nada.
  </div>

  <section style="position:relative; overflow:hidden; background:radial-gradient(120% 90% at 85% 0%, #1D2942 0%, #0B1017 58%); color:#FFF6E3;">
    <div style="position:absolute; top:-180px; right:-140px; width:620px; height:620px; border-radius:50%; background:radial-gradient(circle,rgba(255,178,26,.28) 0%,rgba(255,178,26,0) 68%);"></div>
    <div style="position:relative; max-width:1180px; margin:0 auto; padding:26px 28px 76px;" class="lp-sec">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:46px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:34px; height:34px; border-radius:9px; background:linear-gradient(140deg,#FFB21A,#FF8A00); display:flex; align-items:center; justify-content:center; font-family:${AR}; font-weight:900; color:#0B1017; font-size:19px;">L</div>
          <div style="font-family:${AR}; font-weight:800; font-size:20px; letter-spacing:-.02em;">Lorenergia</div>
        </div>
        <a href="/login" class="lp-enter" style="display:inline-flex; align-items:center; gap:8px; padding:10px 20px; border-radius:11px; font-family:${AR}; font-weight:700; font-size:15px;">Entrar</a>
      </div>

      <div class="lp-grid" style="display:grid; grid-template-columns:1.15fr .85fr; gap:56px; align-items:center;">
        <div>
          <div style="display:inline-flex; align-items:center; gap:9px; padding:7px 14px; border-radius:99px; border:1px solid rgba(255,178,26,.45); background:rgba(255,178,26,.1); font-family:${AR}; font-weight:600; font-size:13px; color:#FFD98A; letter-spacing:.03em; margin-bottom:26px;">
            <span style="width:7px; height:7px; border-radius:50%; background:#FFB21A;"></span>
            RESPALDO DA LEI FEDERAL 14.300/2022
          </div>
          <h1 class="lp-h1" style="font-family:${AR}; font-weight:900; font-size:64px; line-height:1.02; letter-spacing:-.035em; margin:0 0 26px; text-wrap:balance;">
            Você não precisa de painel solar pra economizar com <span style="color:#FFB21A;">energia solar</span>.
          </h1>
          <p style="font-size:20px; line-height:1.55; color:rgba(255,246,227,.78); margin:0 0 34px; max-width:620px; text-wrap:pretty;">
            Créditos de energia solar aplicados direto na sua conta da Neoenergia — sem instalar painel, sem gastar nada, sem fidelidade. Numa fatura de R$350, isso é <strong style="color:#FFF6E3;">R$70 a menos todo mês</strong>. R$840 por ano de volta no seu bolso.
          </p>
          <div style="display:flex; flex-wrap:wrap; gap:14px; align-items:center;">
            <a href="${whatsappLink}" target="_blank" rel="noopener" class="lp-cta" style="display:inline-flex; align-items:center; gap:10px; background:linear-gradient(140deg,#FFC24D,#FF9E0B); color:#0B1017; font-family:${AR}; font-weight:800; font-size:18px; letter-spacing:-.01em; padding:19px 30px; border-radius:14px; animation:lorPulse 2.8s ease-out infinite;">
              Quero pagar menos na minha conta de luz
            </a>
          </div>
          <div style="display:flex; flex-wrap:wrap; gap:8px 18px; margin-top:18px; font-size:14px; color:rgba(255,246,227,.6);">
            <span>Sem custo de adesão</span><span>•</span><span>Economia já no 1º faturamento</span><span>•</span><span>Cancele quando quiser</span>
          </div>
        </div>

        <div style="background:rgba(255,246,227,.06); border:1px solid rgba(255,246,227,.14); border-radius:22px; padding:30px; backdrop-filter:blur(6px);">
          <div style="font-family:${AR}; font-size:13px; letter-spacing:.08em; color:rgba(255,246,227,.5); margin-bottom:22px;">SUA FATURA, ANTES E DEPOIS</div>
          <div style="display:grid; gap:14px;">
            <div style="display:flex; justify-content:space-between; align-items:baseline; padding:16px 18px; border-radius:13px; background:rgba(255,246,227,.05);">
              <span style="font-size:15px; color:rgba(255,246,227,.7);">Hoje</span>
              <span style="font-family:${AR}; font-weight:700; font-size:26px; text-decoration:line-through; text-decoration-color:rgba(255,120,120,.8);">R$ 350</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:baseline; padding:16px 18px; border-radius:13px; background:rgba(255,178,26,.15); border:1px solid rgba(255,178,26,.4);">
              <span style="font-size:15px; color:#FFD98A;">Com a Lorenergia</span>
              <span style="font-family:${AR}; font-weight:900; font-size:34px; color:#FFB21A;">R$ 280</span>
            </div>
          </div>
          <div style="margin-top:22px; padding-top:22px; border-top:1px solid rgba(255,246,227,.12); display:grid; grid-template-columns:1fr 1fr; gap:18px;">
            <div>
              <div style="font-family:${AR}; font-weight:900; font-size:30px; color:#FFF6E3;">8</div>
              <div style="font-size:13px; color:rgba(255,246,227,.6); line-height:1.35;">famílias já economizam em PE</div>
            </div>
            <div>
              <div style="font-family:${AR}; font-weight:900; font-size:30px; color:#FFF6E3;">26 mil</div>
              <div style="font-size:13px; color:rgba(255,246,227,.6); line-height:1.35;">kWh/mês gerados em 2 usinas</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="lp-sec" style="max-width:1180px; margin:0 auto; padding:96px 28px 0;">
    <div class="lp-grid" style="display:grid; grid-template-columns:.9fr 1.1fr; gap:64px;">
      <div>
        <h2 class="lp-h2" style="font-family:${AR}; font-weight:800; font-size:42px; line-height:1.08; letter-spacing:-.03em; margin:0 0 22px;">Todo mês a mesma cena.</h2>
        <p style="font-size:18px; line-height:1.6; color:#4A5361; margin:0 0 16px; text-wrap:pretty;">A fatura chega e você olha o valor com aquele aperto no peito. O consumo é o mesmo — só o preço muda pra pior.</p>
        <p style="font-size:18px; line-height:1.6; color:#4A5361; margin:0; text-wrap:pretty;">A maioria das famílias em Recife e Jaboatão acha que a única saída é instalar painel em casa. Só que isso custa caro, exige obra, e não serve pra quem mora em apartamento, aluga ou não tem telhado.</p>
      </div>
      <div style="display:grid; gap:10px;">
        ${pains
          .map(
            (p) => `<div style="display:flex; gap:14px; align-items:flex-start; background:#FFFFFF; border:1px solid #EAE2D4; border-radius:13px; padding:17px 19px;">
            <span style="flex:none; margin-top:2px; width:20px; height:20px; border-radius:6px; background:#FFEFD1; color:#B8801A; font-family:${AR}; font-weight:800; font-size:12px; display:flex; align-items:center; justify-content:center;">${p.n}</span>
            <span style="font-size:16px; line-height:1.5; color:#2B323C;">${p.text}</span>
          </div>`
          )
          .join("")}
      </div>
    </div>
  </section>

  <section class="lp-sec" style="max-width:1180px; margin:0 auto; padding:96px 28px 0;">
    <div style="text-align:center; max-width:760px; margin:0 auto 48px;">
      <div style="font-family:${AR}; font-size:13px; letter-spacing:.1em; color:#B8801A; margin-bottom:14px;">COMO FUNCIONA</div>
      <h2 class="lp-h2" style="font-family:${AR}; font-weight:800; font-size:44px; line-height:1.06; letter-spacing:-.03em; margin:0 0 18px; text-wrap:balance;">Energia por assinatura, não obra em casa.</h2>
      <p style="font-size:18px; line-height:1.6; color:#4A5361; margin:0; text-wrap:pretty;">Você se conecta às nossas usinas solares já em operação em Pernambuco e recebe uma cota dos créditos que elas geram. Esses créditos entram automaticamente na sua fatura da Neoenergia.</p>
    </div>
    <div class="lp-grid" style="display:grid; grid-template-columns:repeat(3,1fr); gap:20px;">
      <div style="background:#0B1017; color:#FFF6E3; border-radius:20px; padding:32px;">
        <div style="font-family:${AR}; font-weight:900; font-size:42px; color:#FFB21A; line-height:1; margin-bottom:18px;">01</div>
        <div style="font-family:${AR}; font-weight:700; font-size:21px; margin-bottom:10px; letter-spacing:-.02em;">Você se inscreve</div>
        <div style="font-size:16px; line-height:1.55; color:rgba(255,246,227,.7);">Leva minutos, é de graça e não exige nenhuma visita técnica.</div>
      </div>
      <div style="background:#0B1017; color:#FFF6E3; border-radius:20px; padding:32px;">
        <div style="font-family:${AR}; font-weight:900; font-size:42px; color:#FFB21A; line-height:1; margin-bottom:18px;">02</div>
        <div style="font-family:${AR}; font-weight:700; font-size:21px; margin-bottom:10px; letter-spacing:-.02em;">A gente cuida do resto</div>
        <div style="font-size:16px; line-height:1.55; color:rgba(255,246,227,.7);">Toda a parte técnica e regulatória com a Neoenergia é nossa, sob a Lei 14.300/2022.</div>
      </div>
      <div style="background:linear-gradient(150deg,#FFC24D,#FF9E0B); color:#0B1017; border-radius:20px; padding:32px;">
        <div style="font-family:${AR}; font-weight:900; font-size:42px; line-height:1; margin-bottom:18px; color:rgba(11,16,23,.45);">03</div>
        <div style="font-family:${AR}; font-weight:700; font-size:21px; margin-bottom:10px; letter-spacing:-.02em;">A conta chega menor</div>
        <div style="font-size:16px; line-height:1.55; color:rgba(11,16,23,.75);">Mesma distribuidora, mesmo CPF, mesmo endereço. Até 20% de desconto sobre o seu consumo.</div>
      </div>
    </div>
  </section>
`;

const htmlMeio = `
  <section class="lp-sec" style="max-width:1180px; margin:0 auto; padding:96px 28px 0;">
    <h2 class="lp-h2" style="font-family:${AR}; font-weight:800; font-size:44px; line-height:1.06; letter-spacing:-.03em; margin:0 0 44px; max-width:700px; text-wrap:balance;">O que muda de verdade na sua casa</h2>
    <div class="lp-grid" style="display:grid; grid-template-columns:repeat(4,1fr); gap:18px;">
      ${benefits
        .map(
          ([title, text]) => `<div style="background:#FFFFFF; border:1px solid #EAE2D4; border-radius:18px; padding:28px 26px;">
          <div style="width:30px; height:4px; border-radius:99px; background:#FFB21A; margin-bottom:20px;"></div>
          <div style="font-family:${AR}; font-weight:700; font-size:19px; line-height:1.2; letter-spacing:-.02em; margin-bottom:10px;">${title}</div>
          <div style="font-size:15px; line-height:1.55; color:#4A5361;">${text}</div>
        </div>`
        )
        .join("")}
    </div>
  </section>

  <section class="lp-sec" style="max-width:1180px; margin:0 auto; padding:96px 28px 0;">
    <div style="text-align:center; margin-bottom:40px;">
      <div style="font-family:${AR}; font-size:13px; letter-spacing:.1em; color:#B8801A; margin-bottom:14px;">QUEM JÁ ECONOMIZA</div>
      <h2 class="lp-h2" style="font-family:${AR}; font-weight:800; font-size:40px; letter-spacing:-.03em; margin:0; text-wrap:balance;">8 famílias em Pernambuco, 100% ativas.</h2>
    </div>
    <div class="lp-grid" style="display:grid; grid-template-columns:repeat(3,1fr); gap:20px;">
      ${testimonials
        .map(
          (t) => `<div style="background:#FFFFFF; border:1px solid #EAE2D4; border-radius:18px; padding:30px 28px; display:flex; flex-direction:column; gap:20px;">
          <div style="font-family:${AR}; font-size:36px; color:#FFB21A; line-height:.6;">&ldquo;</div>
          <div style="font-size:17px; line-height:1.55; color:#2B323C; flex:1;">${t.quote}</div>
          <div style="display:flex; align-items:center; gap:12px; padding-top:16px; border-top:1px solid #EFE8DB;">
            <div style="width:38px; height:38px; border-radius:99px; background:#F1EADC;"></div>
            <div>
              <div style="font-family:${AR}; font-weight:700; font-size:15px;">${t.name}</div>
              <div style="font-size:13px; color:#7A8493;">${t.place}</div>
            </div>
          </div>
        </div>`
        )
        .join("")}
    </div>
  </section>

  <section class="lp-sec" style="max-width:1180px; margin:0 auto; padding:96px 28px 0;">
    <div class="lp-grid" style="background:#FFFFFF; border:1px solid #EAE2D4; border-radius:26px; overflow:hidden; display:grid; grid-template-columns:1.05fr .95fr;">
      <div style="padding:52px 48px;">
        <div style="font-family:${AR}; font-size:13px; letter-spacing:.1em; color:#B8801A; margin-bottom:16px;">O QUE VOCÊ RECEBE AO ASSINAR</div>
        <div style="display:grid; gap:12px; margin-bottom:34px;">
          ${stack
            .map(
              (text) => `<div style="display:flex; gap:13px; align-items:flex-start;">
              <span style="flex:none; width:21px; height:21px; border-radius:99px; background:#0B1017; color:#FFB21A; font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:center; margin-top:1px;">✓</span>
              <span style="font-size:16.5px; line-height:1.45; color:#2B323C;">${text}</span>
            </div>`
            )
            .join("")}
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; padding-top:28px; border-top:1px solid #EFE8DB;">
          <div>
            <div style="font-size:14px; color:#7A8493; margin-bottom:4px;">Custo pra aderir</div>
            <div style="font-family:${AR}; font-weight:900; font-size:34px; letter-spacing:-.03em;">R$ 0,00</div>
          </div>
          <div>
            <div style="font-size:14px; color:#7A8493; margin-bottom:4px;">O que você paga</div>
            <div style="font-size:16px; line-height:1.4; color:#2B323C; padding-top:6px;">só a própria conta de luz, já com desconto</div>
          </div>
        </div>
      </div>
      <div style="background:#12192A; color:#FFF6E3; padding:52px 46px;">
        <div style="font-family:${AR}; font-size:13px; letter-spacing:.1em; color:rgba(255,246,227,.5); margin-bottom:26px;">SIMULAÇÃO REAL</div>
        <div style="display:grid; gap:12px;">
          ${sims
            .map(
              (s) => `<div style="display:grid; grid-template-columns:1fr auto; gap:10px; align-items:center; padding:18px 20px; border-radius:14px; background:rgba(255,246,227,.05);">
              <div>
                <div style="font-size:15px; color:rgba(255,246,227,.65);">Fatura de ${s.fatura}/mês</div>
                <div style="font-family:${AR}; font-weight:700; font-size:20px; margin-top:3px;">${s.mes} por mês</div>
              </div>
              <div style="font-family:${AR}; font-weight:900; font-size:24px; color:#FFB21A;">${s.ano}<span style="font-size:13px; font-weight:600; color:rgba(255,246,227,.5);">/ano</span></div>
            </div>`
            )
            .join("")}
        </div>
        <div style="margin-top:26px; padding:22px; border-radius:14px; border:1px dashed rgba(255,178,26,.45); font-size:16px; line-height:1.55; color:rgba(255,246,227,.8);">
          Em 5 anos isso pode representar <strong style="color:#FFB21A;">mais de R$4.000</strong> que fica no seu bolso em vez de sair pra Neoenergia — sem você ter feito nada além de assinar.
        </div>
      </div>
    </div>
  </section>

  <section class="lp-sec" style="max-width:1180px; margin:0 auto; padding:96px 28px 0;">
    <div class="lp-grid" style="display:grid; grid-template-columns:.85fr 1.15fr; gap:56px;">
      <div>
        <h2 class="lp-h2" style="font-family:${AR}; font-weight:800; font-size:40px; line-height:1.06; letter-spacing:-.03em; margin:0 0 18px;">"Isso não é golpe?"</h2>
        <p style="font-size:17px; line-height:1.6; color:#4A5361; margin:0;">A desconfiança faz sentido — o modelo é novo pra maioria das pessoas. Por isso respondemos tudo de frente.</p>
      </div>
      <div style="display:grid; gap:12px;">
        ${objections
          .map(
            (o) => `<div style="background:#FFFFFF; border:1px solid #EAE2D4; border-left:4px solid #FFB21A; border-radius:14px; padding:24px 26px;">
            <div style="font-family:${AR}; font-weight:700; font-size:18px; margin-bottom:9px; letter-spacing:-.01em;">${o.q}</div>
            <div style="font-size:16px; line-height:1.6; color:#4A5361;">${o.a}</div>
          </div>`
          )
          .join("")}
      </div>
    </div>
  </section>

  <section class="lp-sec" style="max-width:1180px; margin:0 auto; padding:96px 28px 0;">
    <div class="lp-grid lp-pad" style="background:linear-gradient(150deg,#FFC24D,#FF9E0B); border-radius:26px; padding:56px; display:grid; grid-template-columns:1fr 1fr; gap:48px; align-items:center;">
      <div>
        <div style="font-family:${AR}; font-size:13px; letter-spacing:.1em; color:rgba(11,16,23,.55); margin-bottom:14px;">GARANTIA</div>
        <h2 class="lp-h2" style="font-family:${AR}; font-weight:900; font-size:44px; line-height:1.04; letter-spacing:-.035em; margin:0;">Sua garantia é a sua própria fatura.</h2>
      </div>
      <div style="font-size:17.5px; line-height:1.6; color:rgba(11,16,23,.82);">
        <p style="margin:0 0 14px;">Você não investe nada pra começar e não assina fidelidade. Você olha o próximo boleto da Neoenergia e confere com seus próprios olhos o desconto aplicado.</p>
        <p style="margin:0;">Se em algum momento não quiser continuar — no primeiro mês, no sexto ou no quinto ano — é só avisar. Cancelamos sem multa e sem burocracia. O risco é literalmente zero, porque você nunca colocou dinheiro na jogada.</p>
      </div>
    </div>
  </section>

  <section class="lp-sec" style="max-width:1180px; margin:0 auto; padding:96px 28px 0;">
    <div class="lp-grid lp-pad" style="border:1px solid #EAE2D4; background:#FFFFFF; border-radius:22px; padding:44px 48px; display:grid; grid-template-columns:1fr auto; gap:40px; align-items:center;">
      <div>
        <h2 class="lp-h2" style="font-family:${AR}; font-weight:800; font-size:32px; letter-spacing:-.03em; margin:0 0 14px;">Nossas usinas têm capacidade limitada.</h2>
        <p style="font-size:17px; line-height:1.6; color:#4A5361; margin:0; max-width:640px;">Hoje operamos 1 usina com geração total de 4.000 kWh/mês. Cada família que entra ocupa parte dessa capacidade — quando ela é preenchida, entramos em lista de espera até a próxima expansão. Quanto antes você assinar, mais cedo o desconto aparece na sua conta.</p>
      </div>
      <div style="text-align:center; padding:26px 34px; border-radius:18px; background:#FFF6E3;">
        <div style="font-family:${AR}; font-weight:900; font-size:44px; color:#B8801A; letter-spacing:-.03em; line-height:1;">4.000</div>
        <div style="font-size:14px; color:#7A8493; margin-top:6px;">kWh/mês disponíveis</div>
      </div>
    </div>
  </section>
`;

const htmlFinal = `
  <section style="margin-top:96px; background:radial-gradient(110% 90% at 50% 0%, #1D2942 0%, #0B1017 60%); color:#FFF6E3; padding:96px 28px 104px;">
    <div style="max-width:840px; margin:0 auto; text-align:center;">
      <h2 class="lp-h1" style="font-family:${AR}; font-weight:900; font-size:52px; line-height:1.05; letter-spacing:-.035em; margin:0 0 24px; text-wrap:balance;">Enquanto sua conta sobe, esse desconto já podia estar caindo na sua fatura.</h2>
      <p style="font-size:19px; line-height:1.6; color:rgba(255,246,227,.72); margin:0 0 12px;">Você não precisa instalar nada. Não precisa investir nada. Não precisa assinar fidelidade nenhuma. Só precisa dizer sim.</p>
      <p style="font-size:19px; line-height:1.6; color:rgba(255,246,227,.72); margin:0 0 38px;">A cada mês sem assinar é mais um mês de dinheiro saindo da sua família pra Neoenergia — dinheiro que podia ficar em casa.</p>
      <a href="${whatsappLink}" target="_blank" rel="noopener" class="lp-cta" style="display:inline-flex; align-items:center; gap:10px; background:linear-gradient(140deg,#FFC24D,#FF9E0B); color:#0B1017; font-family:${AR}; font-weight:800; font-size:19px; padding:21px 36px; border-radius:14px;">
        Quero economizar até 20% na minha conta agora
      </a>
      <div style="margin-top:16px; font-size:14px; color:rgba(255,246,227,.55);">Grátis • Sem fidelidade • Economia no 1º mês</div>

      <div style="margin-top:56px; text-align:left; background:rgba(255,246,227,.06); border-left:3px solid #FFB21A; border-radius:12px; padding:26px 30px; font-size:16.5px; line-height:1.65; color:rgba(255,246,227,.78);">
        <strong style="color:#FFB21A; font-family:${AR};">PS:</strong> se você chegou até aqui, é porque a conta de luz realmente pesa no seu orçamento. Não custa nada testar — você não paga adesão, não assina fidelidade e pode sair quando quiser. No pior cenário, você volta a pagar o que já paga hoje. No melhor, sua família fica com até R$1.200 a mais por ano no bolso.
      </div>
    </div>
  </section>

  <footer style="background:#070B11; color:rgba(255,246,227,.5); padding:34px 28px; font-size:14px;">
    <div style="max-width:1180px; margin:0 auto; display:flex; flex-wrap:wrap; gap:16px; justify-content:space-between; align-items:center;">
      <div style="font-family:${AR}; font-weight:700; color:#FFF6E3;">Lorenergia</div>
      <div>Geração compartilhada regulamentada pela Lei Federal 14.300/2022 • PERNAMBUCO</div>
    </div>
  </footer>
`;

export default async function HomePage() {
  const sessao = await getSessao();
  if (sessao?.profile?.role === "admin") redirect("/admin");
  if (sessao?.profile?.role === "cliente") redirect("/portal");

  return (
    <main className="lp" style={{ fontFamily: "'IBM Plex Sans',system-ui,sans-serif", color: "#0B1017", background: "#FBF7F0" }}>
      <div dangerouslySetInnerHTML={{ __html: htmlTopo }} />
      <CalculadoraEconomia />
      <div dangerouslySetInnerHTML={{ __html: htmlMeio }} />
      <FaqLista faqs={faqs} />
      <div dangerouslySetInnerHTML={{ __html: htmlFinal }} />
    </main>
  );
}
