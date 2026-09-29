-- =====================================================================
-- LORENERGIA - Migração 0022: consumo do prédio editável por mês
-- =====================================================================
-- Rode no SQL Editor do Supabase DEPOIS da 0021.
--
-- Permite lançar manualmente o consumo do prédio de um mês. Quando NULL, o
-- sistema usa a soma automática das faturas dos membros do prédio.
-- =====================================================================

alter table public.geracao_mensal
  add column if not exists consumo_predio numeric(12,2);

comment on column public.geracao_mensal.consumo_predio is
  'Consumo do prédio no mês (kWh), lançado manualmente. NULL = soma das faturas dos membros.';
