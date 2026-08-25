-- =====================================================================
-- LORENERGIA - Migração 0014: remover mensalidade do simulador
-- =====================================================================
-- Rode no SQL Editor do Supabase DEPOIS da 0013.
--
-- A Lorenergia NÃO cobra mensalidade. O plano passa a ser apenas a faixa de
-- consumo (kwh_min..kwh_max); não há mais preço/mensalidade.
-- =====================================================================

alter table public.planos_cota drop column if exists mensalidade;
alter table public.simulacoes  drop column if exists plano_mensalidade;
