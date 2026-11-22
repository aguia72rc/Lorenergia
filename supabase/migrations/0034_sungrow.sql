-- =====================================================================
-- LORENERGIA - Migração 0034: geração das usinas (Sungrow iSolarCloud)
-- =====================================================================
-- Rode no SQL Editor do Supabase ANTES de promover o deploy.
--
-- sungrow_conexao: autorização OAuth da conta iSolarCloud (uma linha só).
--   RLS ligado e SEM políticas: só o servidor (chave de serviço) lê os tokens.
-- usinas: última leitura de cada usina (potência, geração, curva do dia).
-- usina_geracao_diaria: geração de cada dia, para somar o mês.
-- =====================================================================

create table if not exists public.sungrow_conexao (
  id smallint primary key default 1 check (id = 1),
  access_token text not null,
  refresh_token text,
  expira_em timestamptz not null,
  conectado_em timestamptz not null default now(),
  conectado_por text,
  atualizado_em timestamptz not null default now()
);
alter table public.sungrow_conexao enable row level security;

create table if not exists public.usinas (
  ps_id text primary key,
  nome text not null,
  capacidade_kwp numeric,
  potencia_w numeric,
  geracao_hoje_kwh numeric,
  geracao_total_kwh numeric,
  online boolean,
  falha text,
  curva_hoje jsonb,
  curva_lida_em timestamptz,
  dados jsonb,
  lido_em timestamptz not null default now()
);
alter table public.usinas enable row level security;
drop policy if exists "usinas_admin_select" on public.usinas;
create policy "usinas_admin_select" on public.usinas for select using (public.is_admin());

create table if not exists public.usina_geracao_diaria (
  ps_id text not null references public.usinas(ps_id) on delete cascade,
  dia date not null,
  geracao_kwh numeric not null default 0,
  total_kwh numeric,
  atualizado_em timestamptz not null default now(),
  primary key (ps_id, dia)
);
alter table public.usina_geracao_diaria enable row level security;
drop policy if exists "usina_geracao_admin_select" on public.usina_geracao_diaria;
create policy "usina_geracao_admin_select" on public.usina_geracao_diaria for select using (public.is_admin());
