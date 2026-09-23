-- =====================================================================
-- LORENERGIA - Migração 0017: restaura TUSD GD II DENTRO do desconto
-- =====================================================================
-- Rode no SQL Editor do Supabase.
--
-- Desfaz o efeito da 0016. Volta à regra original: o desconto incide sobre o
-- VALOR BRUTO TOTAL (conta cheia), INCLUINDO a TUSD GD II (taxa_energia_solar):
--     bruto    = consumo×(tusd+te) + bandeira + TUSD GD II + iluminação + multa/juros
--     desconto = bruto × desconto%
--     líquido  = bruto − desconto
--
-- Recalcula todas as faturas já geradas para os valores originais (os que
-- foram divulgados aos clientes).
-- =====================================================================

update public.faturas f
set
  valor_bruto    = round(b.bruto, 2),
  valor_desconto = round(b.bruto * f.desconto_percentual / 100, 2),
  valor_liquido  = round(b.bruto - b.bruto * f.desconto_percentual / 100, 2),
  economia       = round(b.bruto * f.desconto_percentual / 100, 2),
  updated_at     = now()
from (
  select
    id,
    consumo_kwh * (coalesce(tarifa_tusd, 0) + coalesce(tarifa_te, 0))
      + coalesce(adicional_bandeira, 0)
      + coalesce(taxa_energia_solar, 0)
      + coalesce(taxa_iluminacao, 0)
      + coalesce(multa_juros, 0) as bruto
  from public.faturas
) b
where b.id = f.id;

-- Restaura o comentário original da coluna.
comment on column public.faturas.taxa_energia_solar is
  'Taxa de energia solar (R$ fixo). Entra na base do desconto.';
