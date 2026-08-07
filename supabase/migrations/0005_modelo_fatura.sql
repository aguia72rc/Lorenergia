-- =====================================================================
-- LORENERGIA - Migração 0005: modelo de fatura completo (igual ao PDF)
-- =====================================================================
-- Rode no SQL Editor do Supabase DEPOIS das migrações 0001..0004.
--
-- - Taxa de energia solar volta a ser valor FIXO (R$) e entra no desconto.
-- - Adicional de bandeira passa a ser valor FIXO (R$).
-- - Medição: fator multiplicador, nº do medidor e tipo de ligação.
-- - Tributos informativos: ICMS, PIS, COFINS.
-- - Dados de endereço do morador e dados de PIX/QR.
-- =====================================================================

-- ---- clientes: endereço + medição ----
alter table public.clientes
  add column if not exists endereco       text,
  add column if not exists cep            text,
  add column if not exists cidade_uf      text,
  add column if not exists numero_medidor text,
  add column if not exists tipo_ligacao   text;   -- monofásico / bifásico / trifásico

-- ---- faturas: fator, taxa solar (R$), tributos informativos ----
alter table public.faturas
  add column if not exists fator_multiplicador numeric(10,4) not null default 1,
  add column if not exists taxa_energia_solar  numeric(10,2) not null default 0,  -- R$ fixo (entra no desconto)
  add column if not exists icms                numeric(10,2) not null default 0,  -- informativo
  add column if not exists pis                 numeric(10,2) not null default 0,  -- informativo
  add column if not exists cofins              numeric(10,2) not null default 0;  -- informativo

comment on column public.faturas.fator_multiplicador is 'Fator multiplicador da medição. consumo = (atual - anterior) * fator.';
comment on column public.faturas.taxa_energia_solar is 'Taxa de energia solar (R$ fixo). Entra na base do desconto.';

-- ---- configuracoes: padrões da taxa solar e dados de PIX ----
alter table public.configuracoes
  add column if not exists taxa_energia_solar numeric(10,2) not null default 0,
  add column if not exists chave_pix          text,
  add column if not exists pix_nome           text,   -- nome do recebedor (para o QR)
  add column if not exists pix_cidade         text;   -- cidade do recebedor (para o QR)
