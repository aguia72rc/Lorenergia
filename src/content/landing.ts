/**
 * Textos e números da landing page. Para mudar uma frase, um benefício ou uma
 * pergunta do site, é aqui — as seções em src/components/landing só montam a tela.
 */

export const WHATSAPP = "5581995592624";
export const whatsappLink =
  "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent("Olá! Quero economizar na minha conta de luz com a Lorenergia.");

/** Fonte dos títulos. */
export const AR = "'Archivo',sans-serif";

/** Geração mensal da usina (kWh), como aparece no site. Mude aqui quando a usina crescer. */
export const GERACAO_KWH_MES = "4.000";

// Usado se o banco ainda não informar o nº de famílias (migração 0028 pendente ou sem dados).
export const FAMILIAS_PADRAO = 13;

export const pains = [
  "Você abre a fatura da Neoenergia todo mês e sente aquele aperto — de novo.",
  "Você já pensou em energia solar, mas achou que precisava gastar R$15-20 mil e esperar meses de obra.",
  "Você desconfia de qualquer coisa que promete desconto na conta de luz — parece bom demais pra ser verdade.",
  "Você mora de aluguel, em apartamento, ou não tem telhado, e achou que solar não era pra você.",
  'Você tentou entender "geração compartilhada" e desistiu no meio, de tanta burocracia.',
  "Você só quer pagar menos e cuidar melhor do orçamento da família, sem risco e sem complicação.",
].map((text, i) => ({ n: i + 1, text }));

export const benefits: [string, string][] = [
  ["Alívio já no primeiro mês", "A redução de até 20% aparece na fatura logo depois de aderir. Não é promessa pro futuro — é dinheiro que sobra agora."],
  ["Sem obra, sem transtorno", "Nada de engenheiro, autorização de condomínio ou furo no telhado. Sua rotina não muda em nada."],
  ["Zero preocupação técnica", "Nunca vai limpar painel, trocar peça ou ligar pra assistência. Se algo acontece com a usina, o problema é nosso."],
  ["Sem investimento inicial", "Você paga R$0,00 pra começar. O dinheiro que sobra é só o que você deixa de pagar na Neoenergia."],
  ["Liberdade total", "Entra quando quer, sai quando quer. Nenhuma letra miúda te prendendo."],
  ["Respaldo de lei federal", "O benefício vem da Lei 14.300/2022, não de uma promessa comercial. Isso te protege como consumidor."],
  ["Mesma distribuidora", "Você não muda de fornecedor nem corre risco de ficar sem energia. Só a fatura chega mais barata."],
  ["Serve pra qualquer imóvel", "Casa própria, apartamento, aluguel ou comércio — sem instalação física, funciona em qualquer situação."],
];

export const stack = [
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

export const sims = [
  { fatura: "R$250", mes: "R$50 a menos", ano: "R$600" },
  { fatura: "R$350", mes: "R$70 a menos", ano: "R$840" },
  { fatura: "R$500", mes: "R$100 a menos", ano: "R$1.200" },
];

export const objections = [
  { q: "Isso não é golpe?", a: "O modelo é regulamentado pela Lei Federal 14.300/2022. Você continua recebendo a fatura da própria Neoenergia, com o seu CPF, no seu endereço. Não existe transferência de titularidade nem contrato com terceiros obscuros. O que muda é só o valor final." },
  { q: "Vou precisar trocar de distribuidora ou mexer na instalação elétrica?", a: "Não. Zero mudança física na sua casa. Sua energia continua vindo da mesma rede da Neoenergia, do mesmo jeito de sempre." },
  { q: "E se eu quiser sair depois?", a: "Sem problema. Não existe fidelidade. Você cancela quando quiser, sem multa, sem retenção e sem ligação insistente." },
  { q: "Não moro em casa própria e não tenho telhado — serve pra mim?", a: "Serve. Como você não instala nada, o modelo funciona igual pra aluguel, apartamento, casa própria ou comércio." },
  { q: "Parece complicado de entender.", a: "Na prática é simples: você se inscreve, a gente cuida de toda a parte técnica e regulatória com a Neoenergia, e o desconto aparece automaticamente na próxima fatura." },
];

export const faqs = [
  { q: "Preciso instalar alguma coisa na minha casa?", a: "Não. A energia continua vindo da Neoenergia normalmente, pela mesma rede. Só os créditos solares são aplicados na sua fatura." },
  { q: "Serve pra quem mora de aluguel ou apartamento?", a: "Sim. Como não há instalação física em lugar nenhum, o modelo funciona igual em qualquer imóvel." },
  { q: "Quanto tempo até eu começar a economizar?", a: "A economia já aparece na sua primeira fatura após a adesão." },
  { q: "E se eu não gostar ou quiser cancelar?", a: "Você cancela quando quiser, sem multa e sem burocracia — não existe fidelidade." },
  { q: "Preciso pagar algo pra aderir?", a: "Não. A adesão é 100% gratuita. Você só continua pagando sua própria conta de luz, agora com desconto." },
  { q: "Isso é legal e regulamentado?", a: "Sim. O modelo é baseado na Lei Federal 14.300/2022, que regulamenta a geração compartilhada de energia elétrica no Brasil desde janeiro de 2022." },
  { q: "A conta muda de nome ou CPF?", a: "Não. A fatura continua vindo no seu CPF, no seu endereço, com a Neoenergia Pernambuco. Só o valor final chega menor." },
  { q: "Como faço pra assinar?", a: "Basta se inscrever pelo WhatsApp. Em poucos minutos você já está cadastrado, e a partir da próxima fatura o desconto começa a aparecer." },
];
