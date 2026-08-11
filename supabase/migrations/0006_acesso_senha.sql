-- =====================================================================
-- LORENERGIA - Migração 0006: acesso por senha (troca no 1º acesso)
-- =====================================================================
-- Rode no SQL Editor do Supabase DEPOIS das migrações 0001..0005.
--
-- Marca quando o morador precisa DEFINIR uma nova senha no primeiro
-- acesso (após o admin gerar uma senha temporária).
-- =====================================================================

alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

comment on column public.profiles.must_change_password is 'true quando o usuário deve definir uma nova senha no próximo acesso (senha temporária gerada pelo admin).';
