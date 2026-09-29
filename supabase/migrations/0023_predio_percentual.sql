-- =====================================================================
-- LORENERGIA - Migração 0023: percentual de rateio do Consumo do Prédio
-- =====================================================================
-- Rode no SQL Editor do Supabase DEPOIS da 0022.
--
-- O "Consumo do Prédio" passa a receber um PERCENTUAL do rateio, como os
-- demais participantes (igual à planilha). Como ele não é um morador, o
-- percentual dele fica no próprio mês (geracao_mensal), não em rateio_mensal.
-- =====================================================================

alter table public.geracao_mensal
  add column if not exists predio_percentual numeric(7,4) not null default 0
    check (predio_percentual >= 0 and predio_percentual <= 100);

comment on column public.geracao_mensal.predio_percentual is
  'Percentual do rateio destinado ao Consumo do Prédio no mês (0 a 100%).';
