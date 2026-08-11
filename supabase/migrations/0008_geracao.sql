-- =====================================================================
-- LORENERGIA - Migração 0008: geração mensal da usina (kWh injetado)
-- =====================================================================
-- Rode no SQL Editor do Supabase DEPOIS das migrações 0001..0007.
--
-- Guarda, por mês, a energia que a usina injetou na rede (leitura do
-- inversor/distribuidora). Com isso o relatório calcula:
--   - kWh injetado (do mês)         = valor lançado aqui
--   - kWh consumido (do mês)        = soma do consumo das faturas
--   - Créditos de kWh (acumulado)   = saldo rolando de mês a mês
-- =====================================================================

create table if not exists public.geracao_mensal (
  referencia    date primary key,                    -- 1º dia do mês (YYYY-MM-01)
  kwh_injetado  numeric(12,2) not null default 0,    -- energia injetada na rede no mês
  kwh_gerado    numeric(12,2),                        -- geração total (opcional)
  observacoes   text,
  updated_at    timestamptz not null default now()
);

comment on table public.geracao_mensal is 'Geração mensal da usina: kWh injetado na rede por mês de referência.';

alter table public.geracao_mensal enable row level security;

-- Apenas o admin (dono) gerencia e lê a geração.
drop policy if exists geracao_admin_all on public.geracao_mensal;
create policy geracao_admin_all on public.geracao_mensal
  for all using (public.is_admin()) with check (public.is_admin());
