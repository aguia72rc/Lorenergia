-- =====================================================================
-- LORENERGIA - Migração 0024: multa e juros de mora automáticos
-- =====================================================================
-- Rode no SQL Editor do Supabase DEPOIS da 0023.
--
-- Taxas de atraso configuráveis, usadas para calcular multa + juros de mora
-- automaticamente nas faturas vencidas e não pagas (cálculo "ao vivo", nada
-- é gravado):
--   multa = valor × multa_percentual         (uma vez, ao vencer)
--   juros = valor × juros_mensal_percentual × (dias de atraso / 30)  (pro rata die)
-- =====================================================================

alter table public.configuracoes
  add column if not exists multa_percentual         numeric(6,2) not null default 2,
  add column if not exists juros_mensal_percentual  numeric(6,2) not null default 1;

comment on column public.configuracoes.multa_percentual is
  'Multa por atraso (%) aplicada uma vez sobre o valor da fatura vencida.';
comment on column public.configuracoes.juros_mensal_percentual is
  'Juros de mora ao mês (%), cobrados pro rata die a partir do vencimento.';
