-- =====================================================================
-- LORENERGIA - Migração 0027: resumo público da economia gerada
-- =====================================================================
-- Rode no SQL Editor do Supabase DEPOIS da 0026 e ANTES de promover o deploy.
--
-- A landing page (pública) precisa mostrar a economia total gerada para os
-- clientes, mas a tabela `faturas` é protegida por RLS. Esta função devolve
-- APENAS dois números agregados, sem nenhum dado de morador ou de fatura:
--   economia_total      soma do benefício das faturas publicadas e não canceladas
--                       (desconto: economia; cashback: cashback_valor)
--   ultima_referencia   mês (1º dia) da fatura publicada mais recente
--
-- É SECURITY DEFINER para poder somar mesmo com o RLS ligado, e libera a
-- execução para visitantes (anon). Rascunhos não entram na conta.
-- =====================================================================

create or replace function public.resumo_publico()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'economia_total',
      coalesce(sum(
        case when modalidade_beneficio = 'cashback'
             then cashback_valor
             else economia
        end
      ), 0),
    'ultima_referencia', max(referencia)
  )
  from public.faturas
  where publicada = true
    and status <> 'cancelada';
$$;

revoke all on function public.resumo_publico() from public;
grant execute on function public.resumo_publico() to anon, authenticated;

comment on function public.resumo_publico() is
  'Totais agregados e públicos (economia gerada para os clientes). Não expõe dados individuais.';
