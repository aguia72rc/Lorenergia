-- =====================================================================
-- LORENERGIA - Migração 0025: faturas em rascunho (publicar depois)
-- =====================================================================
-- Rode no SQL Editor do Supabase DEPOIS da 0024 e ANTES de promover o deploy.
--
-- Uma fatura pode ser lançada como RASCUNHO (publicada = false): ela fica
-- visível só para o admin, que pode editar e conferir os valores. O cliente
-- só passa a enxergá-la quando o admin PUBLICAR (publicada = true).
--
-- A proteção é feita no banco (RLS), não só na tela: mesmo abrindo o link
-- direto da fatura, o cliente não consegue ler um rascunho.
--
-- Faturas já existentes continuam publicadas (default true).
-- =====================================================================

alter table public.faturas
  add column if not exists publicada boolean not null default true;

comment on column public.faturas.publicada is
  'false = rascunho (só o admin vê); true = publicada (o cliente vê).';

-- O morador só lê as próprias faturas PUBLICADAS. O admin continua vendo tudo
-- (policy faturas_admin_all).
drop policy if exists faturas_self_select on public.faturas;
create policy faturas_self_select on public.faturas
  for select using (publicada = true and cliente_id = public.my_cliente_id());

create index if not exists faturas_rascunho_idx
  on public.faturas (referencia)
  where publicada = false;
