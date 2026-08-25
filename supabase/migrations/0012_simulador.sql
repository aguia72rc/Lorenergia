-- =====================================================================
-- LORENERGIA - Migração 0012: Simulador de economia
-- =====================================================================
-- Rode no SQL Editor do Supabase DEPOIS das migrações 0001..0011.
--
-- Tabelas do simulador de economia. TODA a parametrização de dinheiro
-- (tarifa, Fio B e preços de plano) fica no banco — nada é chumbado no
-- código. A lógica de cálculo (calcularEconomia) lê estas tabelas.
--
--   parametros_energia  -> tarifa, tributos, Fio B, CIP e disponibilidade
--                          (com vigência: usa-se sempre a linha mais recente)
--   fio_b_cronograma    -> percentual do Fio B cobrado por ano (Lei 14.300)
--   planos_cota         -> planos/cotas (kWh e mensalidade)
--   simulacoes          -> cada simulação feita (pública ou no CRM)
--
-- RLS: tudo restrito ao admin. A ÚNICA exceção é o INSERT anônimo em
-- simulacoes (para o simulador público gravar o lead da simulação).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Premissas de energia (com vigência)
-- ---------------------------------------------------------------------
create table if not exists public.parametros_energia (
  id               uuid primary key default uuid_generate_v4(),
  tarifa_tusd_te   numeric(12,5) not null,  -- R$/kWh, SEM tributos
  icms             numeric(6,4)  not null,  -- fração (0.2050 = 20,5%)
  pis_cofins       numeric(6,4)  not null,  -- fração (0.0465 = 4,65%)
  tusd_fio_b       numeric(12,5) not null,  -- R$/kWh, SEM tributos
  cip              numeric(10,2) not null,  -- iluminação pública, R$/mês
  disp_monofasica  int not null default 30, -- custo de disponibilidade (kWh)
  disp_bifasica    int not null default 50,
  disp_trifasica   int not null default 100,
  vigente_desde    date not null default current_date,
  observacoes      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
comment on table public.parametros_energia is
  'Premissas do simulador (tarifa, tributos, Fio B, CIP, disponibilidade). Usa-se a linha mais recente por vigente_desde.';

create index if not exists idx_parametros_energia_vigencia
  on public.parametros_energia(vigente_desde desc);

-- ---------------------------------------------------------------------
-- 2) Cronograma do Fio B (percentual cobrado por ano — Lei 14.300/2022)
-- ---------------------------------------------------------------------
create table if not exists public.fio_b_cronograma (
  ano        int primary key,
  percentual numeric(4,3) not null check (percentual >= 0 and percentual <= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.fio_b_cronograma is
  'Percentual do Fio B cobrado por ano. Para anos além do último cadastrado, usa-se o maior ano <= ano pedido.';

-- ---------------------------------------------------------------------
-- 3) Planos / cotas (kWh e mensalidade)
-- ---------------------------------------------------------------------
create table if not exists public.planos_cota (
  id          uuid primary key default uuid_generate_v4(),
  codigo      text not null unique,          -- 'A', 'B', ...
  kwh         int  not null check (kwh > 0),  -- cota de energia (kWh/mês)
  mensalidade numeric(10,2) not null check (mensalidade >= 0),
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.planos_cota is
  'Planos/cotas ofertados: energia alocada (kWh) e mensalidade (R$). Preços vêm do banco.';

create index if not exists idx_planos_cota_kwh on public.planos_cota(kwh);

-- ---------------------------------------------------------------------
-- 4) Simulações realizadas (públicas e do CRM)
-- ---------------------------------------------------------------------
create table if not exists public.simulacoes (
  id                   uuid primary key default uuid_generate_v4(),
  origem               text not null default 'publico'
                       check (origem in ('publico','crm')),
  lead_id              uuid references public.leads(id) on delete set null,
  nome_cliente         text,
  -- entrada
  modo                 text not null default 'kwh' check (modo in ('kwh','reais')),
  entrada              numeric(12,2) not null default 0,   -- valor digitado (kWh ou R$)
  consumo_kwh          numeric(12,2) not null default 0,   -- consumo calculado
  tipo_ligacao         text not null default 'monofasica'
                       check (tipo_ligacao in ('monofasica','bifasica','trifasica')),
  disponibilidade_kwh  int not null default 30,
  ano_referencia       int not null,
  fio_b_percentual     numeric(4,3) not null default 0,
  -- plano usado
  plano_codigo         text,
  plano_kwh            int,
  plano_mensalidade    numeric(10,2),
  -- resultado
  conta_atual          numeric(12,2) not null default 0,
  conta_lorenergia     numeric(12,2) not null default 0,
  economia_mensal      numeric(12,2) not null default 0,
  economia_percentual  numeric(6,4)  not null default 0,   -- fração (0.18 = 18%)
  -- foto das premissas usadas (para reproduzir a simulação no futuro)
  parametros_snapshot  jsonb,
  created_at           timestamptz not null default now()
);
comment on table public.simulacoes is
  'Cada simulação de economia (pública ou no CRM). Guarda entrada, resultado e uma foto das premissas usadas.';

create index if not exists idx_simulacoes_lead   on public.simulacoes(lead_id);
create index if not exists idx_simulacoes_origem on public.simulacoes(origem);
create index if not exists idx_simulacoes_data   on public.simulacoes(created_at desc);

-- ---------------------------------------------------------------------
-- updated_at automático (mesma função das outras tabelas)
-- ---------------------------------------------------------------------
drop trigger if exists trg_parametros_energia_updated on public.parametros_energia;
create trigger trg_parametros_energia_updated before update on public.parametros_energia
  for each row execute function public.set_updated_at();

drop trigger if exists trg_fio_b_cronograma_updated on public.fio_b_cronograma;
create trigger trg_fio_b_cronograma_updated before update on public.fio_b_cronograma
  for each row execute function public.set_updated_at();

drop trigger if exists trg_planos_cota_updated on public.planos_cota;
create trigger trg_planos_cota_updated before update on public.planos_cota
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.parametros_energia enable row level security;
alter table public.fio_b_cronograma   enable row level security;
alter table public.planos_cota        enable row level security;
alter table public.simulacoes         enable row level security;

-- Config: só o admin lê/escreve (o simulador público lê via service role no servidor).
drop policy if exists parametros_energia_admin_all on public.parametros_energia;
create policy parametros_energia_admin_all on public.parametros_energia
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists fio_b_cronograma_admin_all on public.fio_b_cronograma;
create policy fio_b_cronograma_admin_all on public.fio_b_cronograma
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists planos_cota_admin_all on public.planos_cota;
create policy planos_cota_admin_all on public.planos_cota
  for all using (public.is_admin()) with check (public.is_admin());

-- Simulações: o admin gerencia tudo...
drop policy if exists simulacoes_admin_all on public.simulacoes;
create policy simulacoes_admin_all on public.simulacoes
  for all using (public.is_admin()) with check (public.is_admin());

-- ...e QUALQUER pessoa (inclusive anônimo) pode APENAS inserir (simulador público).
-- Não pode ler, alterar nem apagar — só gravar a própria simulação.
drop policy if exists simulacoes_insert_publico on public.simulacoes;
create policy simulacoes_insert_publico on public.simulacoes
  for insert with check (true);

-- =====================================================================
-- SEMENTE (valores iniciais vindos do protótipo — ajuste depois no admin)
-- =====================================================================

-- Premissas (só insere se a tabela estiver vazia)
insert into public.parametros_energia
  (tarifa_tusd_te, icms, pis_cofins, tusd_fio_b, cip, vigente_desde, observacoes)
select 0.76918, 0.2050, 0.0465, 0.25000, 12.00, current_date,
       'Semente inicial (protótipo). Confirmar na planilha tarifária vigente da Neoenergia.'
where not exists (select 1 from public.parametros_energia);

-- Cronograma do Fio B (Lei 14.300)
insert into public.fio_b_cronograma (ano, percentual) values
  (2026, 0.600), (2027, 0.750), (2028, 0.900), (2029, 1.000)
on conflict (ano) do nothing;

-- Planos / cotas
insert into public.planos_cota (codigo, kwh, mensalidade) values
  ('A', 100,  69.00),
  ('B', 150,  97.00),
  ('C', 200, 122.00),
  ('D', 300, 172.00),
  ('E', 400, 218.00)
on conflict (codigo) do nothing;
