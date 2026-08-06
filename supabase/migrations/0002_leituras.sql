-- =====================================================================
-- LORENERGIA - Migração 0002: leitura anterior e atual do medidor
-- =====================================================================
-- Passe a rodar este arquivo no SQL Editor do Supabase DEPOIS do 0001.
-- Adiciona as leituras do medidor às faturas. O consumo passa a ser
-- calculado como (leitura_atual - leitura_anterior), mas o campo
-- consumo_kwh continua armazenado (congelado) em cada fatura.
-- =====================================================================

alter table public.faturas
  add column if not exists leitura_anterior numeric(10,2),
  add column if not exists leitura_atual    numeric(10,2);

comment on column public.faturas.leitura_anterior is 'Leitura do medidor no mês anterior.';
comment on column public.faturas.leitura_atual is 'Leitura do medidor no mês atual. Consumo = atual - anterior.';
