-- =====================================================================
-- LORENERGIA - Migração 0010: CRM / Prospecção (leads)
-- =====================================================================
-- Rode no SQL Editor do Supabase DEPOIS das migrações 0001..0009.
--
-- Módulo de aquisição de clientes: leads prospectados, funil comercial
-- (máquina de estados), histórico de eventos e ponte para virar cliente.
-- Comissão = consumo (kWh) × R$ 0,50 (calculada na aplicação).
-- =====================================================================

create table if not exists public.leads (
  id                     uuid primary key default uuid_generate_v4(),
  nome                   text not null,
  segmento               text not null default 'COMERCIAL'
                         check (segmento in ('COMERCIAL','INDUSTRIAL','RESIDENCIAL')),
  subsegmento            text,
  cidade                 text not null default 'Recife',
  estado                 text not null default 'PE',
  bairro                 text,
  endereco               text,
  numero                 text,
  cep                    text,
  telefone               text,
  whatsapp               text,   -- só dígitos, com DDI+DDD. ex.: 5581999998888
  email                  text,
  website                text,
  latitude               numeric(10,6),
  longitude              numeric(10,6),
  consumo_estimado_kwh   numeric(12,2) not null default 0,
  consumo_confirmado_kwh numeric(12,2),
  lead_score             int not null default 50 check (lead_score between 0 and 100),
  prioridade_operacional int not null default 50 check (prioridade_operacional between 0 and 100),
  status_lead            text not null default 'NOVO'
                         check (status_lead in ('NOVO','QUALIFICADO','PRIORIZADO','EM_CONTATO',
                           'AGUARDANDO_RESPOSTA','RESPONDEU','INTERESSADO','DOCUMENTACAO',
                           'ENVIADO_FINDER','VENDA_REALIZADA','SEM_INTERESSE','DESCARTADO')),
  status_contato         text not null default 'NAO_CONTATADO'
                         check (status_contato in ('NAO_CONTATADO','PRIMEIRO_CONTATO',
                           'AGUARDANDO_RESPOSTA','RESPONDEU','SEGUNDO_CONTATO_NECESSARIO','SEM_RESPOSTA')),
  tentativas_contato     int not null default 0,
  max_tentativas_contato int not null default 2,
  proximo_contato_data   timestamptz,
  ultimo_contato_data    timestamptz,
  fonte_dados            text not null default 'MANUAL',
  observacoes            text,
  cliente_id             uuid references public.clientes(id) on delete set null, -- preenchido ao converter
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on table public.leads is 'Leads de prospecção (CRM) da Lorenergia. Viram cliente ao fechar a venda.';

create index if not exists idx_leads_status on public.leads(status_lead);
create index if not exists idx_leads_segmento on public.leads(segmento);
create index if not exists idx_leads_bairro on public.leads(bairro);

-- Histórico de eventos do lead (mudanças de status, contatos, etc.)
create table if not exists public.lead_eventos (
  id         uuid primary key default uuid_generate_v4(),
  lead_id    uuid not null references public.leads(id) on delete cascade,
  evento     text not null,
  detalhes   jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_lead_eventos_lead on public.lead_eventos(lead_id);

-- updated_at automático
drop trigger if exists trg_leads_updated on public.leads;
create trigger trg_leads_updated before update on public.leads
  for each row execute function public.set_updated_at();

-- RLS: só o admin (dono) gerencia o CRM.
alter table public.leads       enable row level security;
alter table public.lead_eventos enable row level security;

drop policy if exists leads_admin_all on public.leads;
create policy leads_admin_all on public.leads
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists lead_eventos_admin_all on public.lead_eventos;
create policy lead_eventos_admin_all on public.lead_eventos
  for all using (public.is_admin()) with check (public.is_admin());
