-- =====================================================================
-- LORENERGIA - Schema inicial do banco de dados (Supabase / PostgreSQL)
-- =====================================================================
-- Execute este arquivo no Supabase:
--   Opção A) SQL Editor > cole o conteúdo > Run
--   Opção B) supabase db push (usando a CLI do Supabase)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Extensões
-- ---------------------------------------------------------------------
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- Tabela: clientes (moradores que recebem a energia da usina)
-- ---------------------------------------------------------------------
create table if not exists public.clientes (
  id                  uuid primary key default uuid_generate_v4(),
  nome                text not null,
  unidade             text,                         -- ex.: "Apto 101"
  cpf                 text,
  email               text,
  telefone            text,                         -- WhatsApp (com DDD). ex.: 5599999999999
  desconto_percentual numeric(5,2) not null default 20 check (desconto_percentual >= 0 and desconto_percentual <= 100),
  ativo               boolean not null default true,
  observacoes         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.clientes is 'Moradores que consomem a energia distribuída pela usina solar.';
comment on column public.clientes.telefone is 'Número de WhatsApp com código do país e DDD, apenas dígitos. Ex.: 5511999998888';

-- ---------------------------------------------------------------------
-- Tabela: configuracoes (parâmetros globais de cálculo - linha única)
-- ---------------------------------------------------------------------
create table if not exists public.configuracoes (
  id                       int primary key default 1,
  nome_usina               text not null default 'Minha Usina Solar',
  tarifa_kwh               numeric(10,5) not null default 0.90000,  -- R$ por kWh cobrado pela distribuidora
  taxa_iluminacao_publica  numeric(10,2) not null default 0,        -- CIP/COSIP em R$ (opcional, por fatura)
  dados_pagamento          text,                                    -- ex.: chave PIX / instruções de pagamento
  mensagem_whatsapp        text not null default
    'Olá {nome}! 👋 Segue sua fatura de energia solar referente a {referencia}.\n\n' ||
    '⚡ Consumo: {consumo} kWh\n' ||
    '💰 Valor a pagar: {valor}\n' ||
    '🌱 Você economizou: {economia}\n' ||
    '📅 Vencimento: {vencimento}\n\n' ||
    'Fatura completa: {link}\n\nObrigado por usar energia limpa! ☀️',
  updated_at               timestamptz not null default now(),
  constraint configuracoes_single_row check (id = 1)
);

comment on table public.configuracoes is 'Parâmetros globais usados no cálculo das faturas. Sempre 1 única linha (id = 1).';

insert into public.configuracoes (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Tabela: faturas (uma por cliente por mês de referência)
-- ---------------------------------------------------------------------
create table if not exists public.faturas (
  id                  uuid primary key default uuid_generate_v4(),
  cliente_id          uuid not null references public.clientes(id) on delete cascade,
  referencia          date not null,                 -- primeiro dia do mês de referência (ex.: 2026-08-01)
  consumo_kwh         numeric(10,2) not null check (consumo_kwh >= 0),
  tarifa_kwh          numeric(10,5) not null,         -- tarifa vigente no momento da geração (histórico)
  taxa_iluminacao     numeric(10,2) not null default 0,
  desconto_percentual numeric(5,2) not null check (desconto_percentual >= 0 and desconto_percentual <= 100),
  valor_bruto         numeric(10,2) not null,         -- consumo * tarifa (+ taxa) = quanto pagaria à distribuidora
  valor_desconto      numeric(10,2) not null,         -- quanto foi abatido (economia)
  valor_liquido       numeric(10,2) not null,         -- quanto o morador paga de fato
  economia            numeric(10,2) not null,         -- = valor_desconto (economia do morador)
  vencimento          date,
  status              text not null default 'pendente' check (status in ('pendente','paga','cancelada')),
  observacoes         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (cliente_id, referencia)
);

comment on table public.faturas is 'Faturas mensais de cada morador, com valores já calculados e congelados (histórico).';

create index if not exists faturas_cliente_idx on public.faturas (cliente_id);
create index if not exists faturas_referencia_idx on public.faturas (referencia);
create index if not exists faturas_status_idx on public.faturas (status);

-- ---------------------------------------------------------------------
-- Tabela: profiles (liga usuários do Supabase Auth a papéis/clientes)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  role        text not null default 'cliente' check (role in ('admin','cliente')),
  cliente_id  uuid references public.clientes(id) on delete set null,
  created_at  timestamptz not null default now()
);

comment on table public.profiles is 'Perfil de cada usuário autenticado. role=admin (dono) ou cliente (morador).';

-- ---------------------------------------------------------------------
-- Trigger: atualizar updated_at automaticamente
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_clientes_updated on public.clientes;
create trigger trg_clientes_updated before update on public.clientes
  for each row execute function public.set_updated_at();

drop trigger if exists trg_faturas_updated on public.faturas;
create trigger trg_faturas_updated before update on public.faturas
  for each row execute function public.set_updated_at();

drop trigger if exists trg_config_updated on public.configuracoes;
create trigger trg_config_updated before update on public.configuracoes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Trigger: criar profile automaticamente ao cadastrar um usuário.
-- Se o e-mail do usuário bater com o e-mail de um cliente, já vincula.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente_id uuid;
begin
  select id into v_cliente_id
  from public.clientes
  where lower(email) = lower(new.email)
  limit 1;

  insert into public.profiles (id, email, role, cliente_id)
  values (new.id, new.email, 'cliente', v_cliente_id)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Função auxiliar: is_admin() - usada nas políticas de RLS.
-- SECURITY DEFINER para ler profiles sem cair em recursão de RLS.
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Função auxiliar: cliente_id do usuário logado.
create or replace function public.my_cliente_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select cliente_id from public.profiles where id = auth.uid();
$$;

-- =====================================================================
-- RLS (Row Level Security)
-- =====================================================================
alter table public.clientes      enable row level security;
alter table public.faturas       enable row level security;
alter table public.configuracoes enable row level security;
alter table public.profiles      enable row level security;

-- ---- profiles ----
drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- clientes ----
drop policy if exists clientes_admin_all on public.clientes;
create policy clientes_admin_all on public.clientes
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists clientes_self_select on public.clientes;
create policy clientes_self_select on public.clientes
  for select using (id = public.my_cliente_id());

-- ---- faturas ----
drop policy if exists faturas_admin_all on public.faturas;
create policy faturas_admin_all on public.faturas
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists faturas_self_select on public.faturas;
create policy faturas_self_select on public.faturas
  for select using (cliente_id = public.my_cliente_id());

-- ---- configuracoes ----
drop policy if exists config_admin_all on public.configuracoes;
create policy config_admin_all on public.configuracoes
  for all using (public.is_admin()) with check (public.is_admin());

-- Leitura da tarifa liberada a qualquer usuário autenticado (não é sensível).
drop policy if exists config_auth_select on public.configuracoes;
create policy config_auth_select on public.configuracoes
  for select using (auth.role() = 'authenticated');
