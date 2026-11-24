-- =====================================================================
-- LORENERGIA - Migração 0035: quais usinas aparecem no portal dos moradores
-- =====================================================================
-- Rode no SQL Editor do Supabase ANTES de promover o deploy.
--
-- usinas.exibir_portal: o admin escolhe, em Admin > Usinas, quais usinas
-- entram no cartão "A usina gerou X kWh hoje" do portal. Padrão: não
-- (nenhuma aparece até ser liberada).
-- =====================================================================

alter table public.usinas
  add column if not exists exibir_portal boolean not null default false;

comment on column public.usinas.exibir_portal is
  'Se a usina aparece no portal dos moradores (escolha do admin em Admin > Usinas).';
