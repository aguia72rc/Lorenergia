-- =====================================================================
-- LORENERGIA - Migração 0009: consumo mensal lançado manualmente
-- =====================================================================
-- Rode no SQL Editor do Supabase DEPOIS das migrações 0001..0008.
--
-- Permite lançar o kWh consumido de cada mês manualmente (ex.: meses
-- sem faturas ou para bater com a conta da distribuidora). Quando
-- preenchido, esse valor tem prioridade sobre a soma das faturas no
-- relatório e no cálculo dos créditos. Se ficar em branco (null), o
-- sistema continua somando o consumo das faturas do mês.
-- =====================================================================

alter table public.geracao_mensal
  add column if not exists kwh_consumido numeric(12,2);

comment on column public.geracao_mensal.kwh_consumido is
  'Consumo do mês lançado manualmente. Null = usa a soma do consumo das faturas.';
