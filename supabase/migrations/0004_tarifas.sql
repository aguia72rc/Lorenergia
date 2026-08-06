-- =====================================================================
-- LORENERGIA - Migração 0004: detalhamento tarifário da fatura
-- =====================================================================
-- Rode no SQL Editor do Supabase DEPOIS das migrações 0001, 0002 e 0003.
--
-- Substitui a tarifa única por um detalhamento no padrão da conta de luz:
--   - TUSD (Tarifa de Uso do Sistema de Distribuição)  [R$/kWh]
--   - TE   (Tarifa de Energia)                         [R$/kWh]
--   - Adicional de bandeira                            [R$/kWh]
--   - Taxa de Fio-B TUSD GII                           [R$/kWh]
--   - Contribuição de iluminação pública               [R$]  (já existia)
--   - Multa / juros                                    [R$]
--
-- Regra de desconto: incide só sobre a energia (TUSD + TE + bandeira).
-- =====================================================================

-- ---- faturas ----
alter table public.faturas
  add column if not exists tarifa_tusd       numeric(10,5) not null default 0,
  add column if not exists tarifa_te         numeric(10,5) not null default 0,
  add column if not exists adicional_bandeira numeric(10,5) not null default 0,  -- R$/kWh
  add column if not exists fio_b             numeric(10,5) not null default 0,   -- R$/kWh (Fio-B TUSD GII)
  add column if not exists multa_juros       numeric(10,2) not null default 0;   -- R$

comment on column public.faturas.tarifa_tusd is 'Tarifa de Uso do Sistema de Distribuição (R$/kWh).';
comment on column public.faturas.tarifa_te is 'Tarifa de Energia (R$/kWh).';
comment on column public.faturas.adicional_bandeira is 'Adicional de bandeira tarifária (R$/kWh).';
comment on column public.faturas.fio_b is 'Taxa de Fio-B TUSD GII (R$/kWh).';
comment on column public.faturas.multa_juros is 'Multa e juros por atraso (R$).';

-- Para faturas antigas: joga a tarifa única em TUSD para não perder o histórico.
update public.faturas
set tarifa_tusd = tarifa_kwh
where tarifa_tusd = 0 and coalesce(tarifa_kwh, 0) > 0;

-- ---- configuracoes (valores padrão usados ao gerar faturas) ----
alter table public.configuracoes
  add column if not exists tarifa_tusd        numeric(10,5) not null default 0,
  add column if not exists tarifa_te          numeric(10,5) not null default 0,
  add column if not exists adicional_bandeira numeric(10,5) not null default 0,
  add column if not exists fio_b              numeric(10,5) not null default 0;

-- Migra o padrão antigo: se TUSD/TE zerados, usa a tarifa_kwh como ponto de partida.
update public.configuracoes
set tarifa_tusd = coalesce(tarifa_kwh, 0)
where id = 1 and tarifa_tusd = 0;
