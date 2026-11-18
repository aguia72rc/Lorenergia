-- =====================================================================
-- LORENERGIA - Migração 0032: nova mensagem de "fatura disponível"
-- =====================================================================
-- Rode no SQL Editor do Supabase ANTES de promover o deploy.
--
-- Troca a mensagem de WhatsApp enviada quando a fatura é publicada pela nova
-- versão ("sua fatura já está disponível no aplicativo" + o desconto do mês).
-- SÓ troca se a mensagem atual ainda for a original do sistema: se você
-- personalizou o texto em Configurações, ele é mantido.
-- =====================================================================

-- Texto original (instalação) — comparado sem diferenças de quebra de linha.
with original as (
  select 'Olá {nome}! 👋 Segue sua fatura de energia solar referente a {referencia}.' || E'\n\n' ||
         '⚡ Consumo: {consumo} kWh' || E'\n' ||
         '💰 Valor a pagar: {valor}' || E'\n' ||
         '🌱 Você economizou: {economia}' || E'\n' ||
         '📅 Vencimento: {vencimento}' || E'\n\n' ||
         'Fatura completa: {link}' || E'\n\n' || 'Obrigado por usar energia limpa! ☀️' as texto
),
nova as (
  select 'Olá, {primeiro_nome}! ☀️' || E'\n\n' ||
         'Sua fatura da Lorenergia de {referencia} já está disponível no aplicativo.' || E'\n\n' ||
         '{beneficio}' || E'\n\n' ||
         '💰 Valor: {valor}' || E'\n' ||
         '📅 Vencimento: {vencimento}' || E'\n\n' ||
         'Veja a fatura e pague por PIX: {link}' as texto
)
update public.configuracoes c
   set mensagem_whatsapp = (select texto from nova)
 where c.id = 1
   and (
     btrim(replace(coalesce(c.mensagem_whatsapp, ''), E'\r\n', E'\n')) = (select texto from original)
     or btrim(coalesce(c.mensagem_whatsapp, '')) = ''
   );

alter table public.configuracoes
  alter column mensagem_whatsapp set default
    'Olá, {primeiro_nome}! ☀️' || E'\n\n' ||
    'Sua fatura da Lorenergia de {referencia} já está disponível no aplicativo.' || E'\n\n' ||
    '{beneficio}' || E'\n\n' ||
    '💰 Valor: {valor}' || E'\n' ||
    '📅 Vencimento: {vencimento}' || E'\n\n' ||
    'Veja a fatura e pague por PIX: {link}';
