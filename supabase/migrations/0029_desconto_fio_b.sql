-- =====================================================================
-- LORENERGIA - Migração 0029: desconto no Fio B (TUSD GD II)
-- =====================================================================
-- Rode no SQL Editor do Supabase ANTES de promover o deploy.
--
-- Ao gerar a fatura você pode dar um desconto (%) sobre o Fio B repassado ao
-- morador. A fatura (faturas.taxa_energia_solar) guarda só o valor FINAL, e é
-- só ele que o morador vê. O valor normal e o percentual ficam NESTA tabela,
-- que só o admin consegue ler (o morador não enxerga nem pela API), e servem
-- para reabrir a fatura na edição com os números originais.
-- =====================================================================

create table if not exists public.faturas_fiob_desconto (
  fatura_id           uuid primary key references public.faturas(id) on delete cascade,
  bruto               numeric(10,2) not null,  -- Fio B normal (R$), antes do desconto
  desconto_percentual numeric(5,2)  not null,  -- desconto dado no Fio B (%)
  updated_at          timestamptz   not null default now()
);

alter table public.faturas_fiob_desconto enable row level security;

drop policy if exists faturas_fiob_desconto_admin_all on public.faturas_fiob_desconto;
create policy faturas_fiob_desconto_admin_all on public.faturas_fiob_desconto
  for all using (public.is_admin()) with check (public.is_admin());

comment on table public.faturas_fiob_desconto is
  'Desconto no Fio B por fatura (somente admin). A fatura guarda só o valor final.';
