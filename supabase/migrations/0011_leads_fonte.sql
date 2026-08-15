-- =====================================================================
-- LORENERGIA - Migração 0011: origem externa do lead (dedupe do scanner)
-- =====================================================================
-- Rode no SQL Editor do Supabase DEPOIS da 0010.
--
-- Guarda o identificador da fonte (ex.: "osm/node/123") para o scanner
-- não duplicar o mesmo estabelecimento entre varreduras.
-- =====================================================================

alter table public.leads
  add column if not exists fonte_id_externo text;

create unique index if not exists uq_leads_fonte_ext
  on public.leads(fonte_id_externo)
  where fonte_id_externo is not null;
