-- =====================================================================
-- LORENERGIA - Migração 0013: planos por FAIXA de consumo
-- =====================================================================
-- Rode no SQL Editor do Supabase DEPOIS da 0012.
--
-- Os planos deixam de ter uma cota fixa (kwh) e passam a ser uma FAIXA de
-- consumo (kwh_min .. kwh_max). No cálculo:
--   - o plano é escolhido pela faixa do CONSUMO TOTAL;
--   - compensa-se o PISO da faixa (kwh_min), limitado ao consumo compensável.
--
-- Os valores da 0012 eram apenas semente/placeholder, então aqui trocamos a
-- coluna kwh por faixas. Ajuste os números reais depois em Admin → Planos.
-- =====================================================================

alter table public.planos_cota add column if not exists kwh_min int;
alter table public.planos_cota add column if not exists kwh_max int;

-- Remove a cota fixa antiga (placeholder).
alter table public.planos_cota drop column if exists kwh;

-- Semente inicial em faixas contíguas, com ganho de escala (R$/kWh cai).
-- Só preenche quando a faixa ainda não foi definida (não sobrescreve edições).
update public.planos_cota set kwh_min = 100, kwh_max = 200, mensalidade = 69  where codigo = 'A' and kwh_max is null;
update public.planos_cota set kwh_min = 200, kwh_max = 300, mensalidade = 97  where codigo = 'B' and kwh_max is null;
update public.planos_cota set kwh_min = 300, kwh_max = 400, mensalidade = 122 where codigo = 'C' and kwh_max is null;
update public.planos_cota set kwh_min = 400, kwh_max = 500, mensalidade = 150 where codigo = 'D' and kwh_max is null;
update public.planos_cota set kwh_min = 500, kwh_max = 600, mensalidade = 180 where codigo = 'E' and kwh_max is null;

-- Se houver planos sem faixa (nenhum, no caso da semente), zera para poder
-- travar o NOT NULL — ajuste-os depois no admin.
update public.planos_cota set kwh_min = coalesce(kwh_min, 0), kwh_max = coalesce(kwh_max, 0);
alter table public.planos_cota alter column kwh_min set not null;
alter table public.planos_cota alter column kwh_max set not null;

create index if not exists idx_planos_cota_faixa on public.planos_cota(kwh_min, kwh_max);
