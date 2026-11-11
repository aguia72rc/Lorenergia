-- =====================================================================
-- LORENERGIA - Migração 0031: lembrete de vencimento
-- =====================================================================
-- Rode no SQL Editor do Supabase ANTES de promover o deploy.
--
-- faturas.lembrete_enviado_em: quando o último lembrete de vencimento foi
-- enviado pelo WhatsApp (tela Admin > Faturas > Lembretes). Sem esta coluna
-- os lembretes funcionam, mas o sistema não marca quem já foi lembrado.
-- =====================================================================

alter table public.faturas
  add column if not exists lembrete_enviado_em timestamptz;

comment on column public.faturas.lembrete_enviado_em is
  'Quando o último lembrete de vencimento foi enviado pelo WhatsApp (null = nunca).';
