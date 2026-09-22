-- =====================================================================
-- LORENERGIA - Migração 0016: TUSD GD II fora do desconto (recálculo)
-- =====================================================================
-- Rode no SQL Editor do Supabase DEPOIS da 0015.
--
-- Regra corrigida: o desconto NÃO incide mais sobre a TUSD GD II (Fio B /
-- taxa_energia_solar). O cliente paga essa parcela cheia. O desconto passa a
-- incidir apenas sobre:
--     energia (consumo × (TUSD + TE)) + bandeira + iluminação + multa/juros
--
-- Esta migração RECALCULA todas as faturas já geradas para refletir a nova
-- regra (mesma fórmula de calcularFaturaDetalhada em src/lib/calc.ts):
--     base    = consumo×(tusd+te) + bandeira + iluminação + multa/juros
--     desconto = base × desconto%
--     bruto    = base + taxa_energia_solar        (TUSD GD II paga cheia)
--     líquido  = bruto − desconto
-- =====================================================================

update public.faturas f
set
  valor_bruto    = round(b.base + coalesce(f.taxa_energia_solar, 0), 2),
  valor_desconto = round(b.base * f.desconto_percentual / 100, 2),
  valor_liquido  = round(
                     b.base + coalesce(f.taxa_energia_solar, 0)
                     - b.base * f.desconto_percentual / 100, 2),
  economia       = round(b.base * f.desconto_percentual / 100, 2),
  updated_at     = now()
from (
  select
    id,
    consumo_kwh * (coalesce(tarifa_tusd, 0) + coalesce(tarifa_te, 0))
      + coalesce(adicional_bandeira, 0)
      + coalesce(taxa_iluminacao, 0)
      + coalesce(multa_juros, 0) as base
  from public.faturas
) b
where b.id = f.id;

-- Atualiza o comentário da coluna para refletir a nova regra.
comment on column public.faturas.taxa_energia_solar is
  'TUSD GD II (Fio B), R$ fixo. FORA do desconto: o cliente paga cheia.';
