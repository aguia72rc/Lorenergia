-- =====================================================================
-- LORENERGIA - Migração 0033: valor efetivamente pago
-- =====================================================================
-- Rode no SQL Editor do Supabase ANTES de promover o deploy.
--
-- faturas.valor_pago: quanto o morador pagou, já com multa e juros quando
-- pagou depois do vencimento. É gravado no momento em que a fatura é marcada
-- como paga e aparece no recibo. Sem esta coluna o recibo calcula a multa e
-- os juros pela data do pagamento (com as taxas atuais das Configurações).
-- =====================================================================

alter table public.faturas
  add column if not exists valor_pago numeric(12,2);

comment on column public.faturas.valor_pago is
  'Valor efetivamente pago (fatura + multa e juros, se pago em atraso). Null = não paga ou paga antes desta coluna existir.';
