-- =====================================================================
-- LORENERGIA - Migração 0030: data do pagamento e histórico das faturas
-- =====================================================================
-- Rode no SQL Editor do Supabase ANTES de promover o deploy.
--
-- 1) faturas.pago_em: quando a fatura foi marcada como paga. Aparece na
--    fatura ("Paga em ...") para o morador e para o admin.
-- 2) faturas_historico: registro de quem fez o quê em cada fatura (criou,
--    editou, mudou a situação, publicou, excluiu). Só o admin consegue ler.
--    Não tem chave estrangeira de propósito: o registro de uma fatura
--    excluída continua existindo.
-- =====================================================================

alter table public.faturas
  add column if not exists pago_em timestamptz;

comment on column public.faturas.pago_em is
  'Quando a fatura foi marcada como paga (null = não paga).';

create table if not exists public.faturas_historico (
  id          uuid primary key default uuid_generate_v4(),
  fatura_id   uuid,                 -- sem FK: sobrevive à exclusão da fatura
  evento      text not null,        -- CRIADA_OU_EDITADA, LOTE, SITUACAO, PUBLICADA, DESPUBLICADA, EXCLUIDA
  detalhes    jsonb,
  autor_email text,
  created_at  timestamptz not null default now()
);

create index if not exists faturas_historico_fatura_idx
  on public.faturas_historico (fatura_id, created_at desc);

alter table public.faturas_historico enable row level security;

drop policy if exists faturas_historico_admin_all on public.faturas_historico;
create policy faturas_historico_admin_all on public.faturas_historico
  for all using (public.is_admin()) with check (public.is_admin());

comment on table public.faturas_historico is
  'Histórico de alterações das faturas (somente admin): quem fez o quê e quando.';
