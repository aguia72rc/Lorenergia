-- =====================================================================
-- LORENERGIA - Migração 0007: data de emissão da fatura
-- =====================================================================
-- Rode no SQL Editor do Supabase DEPOIS das migrações 0001..0006.
--
-- Adiciona um campo editável de data de emissão na fatura. Faturas
-- antigas sem valor caem no created_at ao serem exibidas.
-- =====================================================================

alter table public.faturas
  add column if not exists data_emissao date default current_date;

-- Preenche faturas já existentes com a data de criação.
update public.faturas
   set data_emissao = created_at::date
 where data_emissao is null;
