-- =====================================================================
-- LORENERGIA - Migração 0019: rateio mensal por cliente (central da usina)
-- =====================================================================
-- Rode no SQL Editor do Supabase DEPOIS da 0018.
--
-- Guarda o PERCENTUAL de rateio de cada cliente em cada mês. A geração da
-- usina continua em geracao_mensal (kwh_injetado). A partir daí o sistema
-- contabiliza, por cliente e por mês:
--   creditos   = geração × percentual/100         (kWh alocados ao cliente)
--   consumo    = soma das faturas do cliente no mês
--   compensado = min(consumo, saldo anterior + creditos)
--   saldo      = (saldo anterior + creditos) − compensado   (rollover)
--
-- O rateio pode mudar mês a mês. A soma dos percentuais de um mês idealmente
-- é 100% (a tela alerta quando não é).
-- =====================================================================

create table if not exists public.rateio_mensal (
  id           uuid primary key default uuid_generate_v4(),
  referencia   date not null,                         -- 1º dia do mês (YYYY-MM-01)
  cliente_id   uuid not null references public.clientes(id) on delete cascade,
  percentual   numeric(7,4) not null default 0
               check (percentual >= 0 and percentual <= 100),
  observacoes  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (referencia, cliente_id)
);

comment on table public.rateio_mensal is
  'Percentual de rateio de cada cliente por mês. Base para contabilizar créditos e compensações.';
comment on column public.rateio_mensal.percentual is
  'Fatia da geração da usina alocada ao cliente no mês (0 a 100%).';

create index if not exists rateio_mensal_referencia_idx on public.rateio_mensal (referencia);
create index if not exists rateio_mensal_cliente_idx    on public.rateio_mensal (cliente_id);

alter table public.rateio_mensal enable row level security;

-- Apenas o admin (dono) gerencia e lê o rateio.
drop policy if exists rateio_mensal_admin_all on public.rateio_mensal;
create policy rateio_mensal_admin_all on public.rateio_mensal
  for all using (public.is_admin()) with check (public.is_admin());

drop trigger if exists trg_rateio_mensal_updated on public.rateio_mensal;
create trigger trg_rateio_mensal_updated before update on public.rateio_mensal
  for each row execute function public.set_updated_at();
