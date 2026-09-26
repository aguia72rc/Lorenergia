-- =====================================================================
-- LORENERGIA - Migração 0018: modalidade de benefício (desconto ou cashback)
-- =====================================================================
-- Rode no SQL Editor do Supabase DEPOIS da 0017.
--
-- Cada morador escolhe COMO recebe o benefício do rateio:
--   - 'desconto'  (padrão): abatido na própria fatura, todo mês.
--   - 'cashback': a fatura sai cheia e o mesmo % (20%/15%) vira um saldo de
--                 cashback acumulado, pago periodicamente.
--
-- Periodicidade do cashback:
--   - 'semestral': a cada 6 meses.
--   - 'dezembro' : sempre no mês de dezembro.
--
-- O percentual do cashback é o MESMO do plano/cliente (desconto_percentual).
-- =====================================================================

-- ---- clientes: modalidade e periodicidade ----
alter table public.clientes
  add column if not exists modalidade_beneficio text not null default 'desconto'
    check (modalidade_beneficio in ('desconto','cashback')),
  add column if not exists cashback_periodicidade text
    check (cashback_periodicidade in ('semestral','dezembro'));

comment on column public.clientes.modalidade_beneficio is
  'Como o morador recebe o benefício: desconto (na fatura) ou cashback (pago periodicamente).';
comment on column public.clientes.cashback_periodicidade is
  'Quando o cashback é pago: semestral (a cada 6 meses) ou dezembro.';

-- ---- faturas: snapshot da modalidade + saldo de cashback ----
alter table public.faturas
  add column if not exists modalidade_beneficio text not null default 'desconto'
    check (modalidade_beneficio in ('desconto','cashback')),
  add column if not exists cashback_valor  numeric(10,2) not null default 0,
  add column if not exists cashback_pago   boolean not null default false,
  add column if not exists cashback_pago_em date;

comment on column public.faturas.modalidade_beneficio is
  'Modalidade usada nesta fatura (desconto ou cashback).';
comment on column public.faturas.cashback_valor is
  'Valor de cashback gerado nesta fatura (R$). Só > 0 quando modalidade = cashback.';
comment on column public.faturas.cashback_pago is
  'Se o cashback desta fatura já foi pago ao morador.';

create index if not exists faturas_cashback_pendente_idx
  on public.faturas (cliente_id)
  where modalidade_beneficio = 'cashback' and cashback_pago = false;
