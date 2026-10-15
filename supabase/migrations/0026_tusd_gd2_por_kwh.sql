-- =====================================================================
-- LORENERGIA - Migração 0026: TUSD GD II proporcional ao consumo (R$/kWh)
-- =====================================================================
-- Rode no SQL Editor do Supabase DEPOIS da 0025 e ANTES de promover o deploy.
--
-- A TUSD GD II (Fio B) deixa de ser um valor fixo igual para todos e passa a ser
-- PROPORCIONAL ao consumo de cada morador. No lote, o Fio B total da conta é
-- rateado pelo consumo; a tarifa equivalente (total ÷ kWh) fica guardada.
--
--   faturas.tarifa_gd2         tarifa equivalente na fatura (R$/kWh)
--   configuracoes.tarifa_gd2   tarifa padrão sugerida nas telas de gerar fatura
--
-- Continua valendo faturas.taxa_energia_solar: guarda o VALOR em R$ já calculado
-- (tarifa × consumo), então as faturas antigas e todas as telas de leitura
-- seguem iguais. O antigo valor fixo de configuracoes.taxa_energia_solar deixa
-- de ser usado — informe a nova tarifa em Configurações.
-- =====================================================================

alter table public.faturas
  add column if not exists tarifa_gd2 numeric(10,5) not null default 0;

alter table public.configuracoes
  add column if not exists tarifa_gd2 numeric(10,5) not null default 0;

comment on column public.faturas.tarifa_gd2 is
  'Tarifa TUSD GD II (R$/kWh) usada na fatura. taxa_energia_solar = tarifa_gd2 × consumo_kwh.';
comment on column public.configuracoes.tarifa_gd2 is
  'Tarifa TUSD GD II padrão (R$/kWh), sugerida ao gerar faturas.';
