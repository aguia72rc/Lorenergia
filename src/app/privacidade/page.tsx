import type { Metadata } from "next";
import CabecalhoPublico from "@/components/landing/CabecalhoPublico";
import { WHATSAPP } from "@/content/landing";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Quais dados a Lorenergia coleta, para que usa e como você pede acesso, correção ou exclusão.",
};

const WHATSAPP_LEGIVEL = "(81) 99559-2624";

export default function PrivacidadePage() {
  return (
    <main className="lp" style={{ fontFamily: "'IBM Plex Sans',system-ui,sans-serif", color: "#0B1017", background: "#FBF7F0", minHeight: "100vh" }}>
      <CabecalhoPublico
        titulo="Política de privacidade"
        subtitulo="Em linguagem direta: o que coletamos, para que usamos e como você controla os seus dados."
      />
      <article className="lp-sec lp-texto" style={{ maxWidth: "860px", margin: "0 auto", padding: "20px 28px 80px" }}>
        <p style={{ fontSize: "14px", color: "#7A8493", marginTop: "24px" }}>Atualizada em novembro de 2026.</p>

        <h2>Quem cuida dos seus dados</h2>
        <p>
          A Lorenergia, que opera o rateio de créditos de energia solar em Pernambuco, é a responsável pelos dados tratados neste site e no
          sistema de faturas. Qualquer pedido sobre os seus dados pode ser feito pelo WhatsApp {WHATSAPP_LEGIVEL}.
        </p>

        <h2>Quais dados coletamos</h2>
        <ul>
          <li>
            <strong>No simulador de economia:</strong> o nome e o WhatsApp que você informa, o consumo ou o valor da conta digitado e o
            resultado da simulação.
          </li>
          <li>
            <strong>De quem é cliente:</strong> dados de cadastro (nome, e-mail, telefone, CPF ou CNPJ, endereço e unidade), leituras do
            medidor, faturas e situação dos pagamentos.
          </li>
          <li>
            <strong>Dados técnicos:</strong> para evitar abuso do simulador, guardamos um código derivado do endereço de internet (IP), que
            não permite identificar você. O contador de visitas do site não usa cookies nem dados pessoais.
          </li>
        </ul>

        <h2>Para que usamos</h2>
        <ul>
          <li>Entrar em contato pelo WhatsApp sobre a simulação que você fez, com o seu consentimento.</li>
          <li>Calcular, emitir e enviar as faturas dos clientes e mostrar a economia de cada um.</li>
          <li>Manter o sistema seguro e funcionando.</li>
        </ul>
        <p>Não vendemos os seus dados e não os usamos para publicidade de terceiros.</p>

        <h2>Com quem compartilhamos</h2>
        <p>
          Os dados ficam em serviços contratados para hospedar o site e o banco de dados (Vercel e Supabase), que os processam em nosso
          nome. Quando você conversa conosco pelo WhatsApp, a conversa passa pelo próprio WhatsApp. Fora disso, só compartilhamos dados
          quando for necessário para prestar o serviço ou por obrigação legal.
        </p>

        <h2>Cookies</h2>
        <p>
          Usamos apenas os cookies necessários para manter o login de clientes e administradores. Não usamos cookies de publicidade nem de
          rastreamento.
        </p>

        <h2>Por quanto tempo guardamos</h2>
        <p>
          Os contatos do simulador ficam guardados até você pedir a exclusão. Os dados de clientes ficam guardados enquanto durar o
          relacionamento e, depois, pelo prazo exigido por lei para documentos de cobrança.
        </p>

        <h2>Seus direitos</h2>
        <p>
          Pela Lei Geral de Proteção de Dados (Lei 13.709/2018), você pode pedir a qualquer momento: confirmação de que tratamos os seus
          dados, acesso a eles, correção, exclusão e a retirada do consentimento para contato. Basta chamar no WhatsApp{" "}
          <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer">{WHATSAPP_LEGIVEL}</a>.
        </p>

        <h2>Mudanças nesta política</h2>
        <p>Se esta política mudar, a nova versão será publicada nesta página, com a data de atualização no topo.</p>
      </article>
    </main>
  );
}
