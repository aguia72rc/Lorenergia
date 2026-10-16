-- =====================================================================
-- LORENERGIA - Migração 0028: nº de famílias no resumo público
-- =====================================================================
-- Rode no SQL Editor do Supabase DEPOIS da 0027 e ANTES de promover o deploy.
--
-- Acrescenta ao resumo público da landing page a quantidade de FAMÍLIAS que
-- já economizam: moradores distintos com ao menos uma fatura publicada e não
-- cancelada. Continua devolvendo só números agregados (nenhum dado individual).
-- Rascunhos não contam.
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
    'ultima_referencia', max(referencia),
    'familias', count(distinct cliente_id)
  )
  from public.faturas
  where publicada = true
    and status <> 'cancelada';
$$;

revoke all on function public.resumo_publico() from public;
grant execute on function public.resumo_publico() to anon, authenticated;
