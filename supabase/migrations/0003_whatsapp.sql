-- =====================================================================
-- LORENERGIA - Migração 0003: controle de envio pelo WhatsApp
-- =====================================================================
-- Rode no SQL Editor do Supabase DEPOIS das migrações 0001 e 0002.
-- Guarda quando cada fatura foi enviada pelo WhatsApp, para o envio em
-- massa saber quem já recebeu.
-- =====================================================================

alter table public.faturas
  add column if not exists whatsapp_enviado_em timestamptz;

comment on column public.faturas.whatsapp_enviado_em is 'Data/hora do último envio da fatura pelo WhatsApp (null = ainda não enviada).';
