-- =====================================================================
-- LORENERGIA - Migração 0015: planos de DESCONTO (rateio de créditos)
-- =====================================================================
-- Rode no SQL Editor do Supabase DEPOIS da 0014.
--
-- Novo modelo de negócio: rateio de créditos. O plano deixa de ser faixa de
-- consumo e passa a ser um PLANO DE DESCONTO:
--   - Com fidelidade (contrato): 20%
--   - Sem fidelidade: 15%
-- O desconto incide sobre o valor da energia (kWh × tarifa). A iluminação
-- pública fica fora do desconto.
-- =====================================================================

-- planos_cota: vira tabela de planos de desconto.
alter table public.planos_cota add column if not exists nome text;
alter table public.planos_cota add column if not exists desconto_percentual numeric(5,2);
alter table public.planos_cota add column if not exists fidelidade boolean not null default false;
alter table public.planos_cota drop column if exists kwh_min;
alter table public.planos_cota drop column if exists kwh_max;

-- Remove os planos de faixa antigos e cadastra os dois planos de desconto.
delete from public.planos_cota where codigo in ('A','B','C','D','E');
insert into public.planos_cota (codigo, nome, desconto_percentual, fidelidade, ativo) values
  ('FID', 'Com fidelidade', 20, true,  true),
  ('SEM', 'Sem fidelidade', 15, false, true)
on conflict (codigo) do update
  set nome = excluded.nome,
      desconto_percentual = excluded.desconto_percentual,
      fidelidade = excluded.fidelidade,
      ativo = true;

-- Preenche e trava NOT NULL.
update public.planos_cota set nome = coalesce(nome, codigo), desconto_percentual = coalesce(desconto_percentual, 0);
alter table public.planos_cota alter column nome set not null;
alter table public.planos_cota alter column desconto_percentual set not null;

-- simulacoes: guarda o desconto aplicado; campos do modelo antigo viram opcionais.
alter table public.simulacoes add column if not exists desconto_percentual numeric(5,2);
alter table public.simulacoes alter column ano_referencia drop not null;
alter table public.simulacoes alter column tipo_ligacao drop not null;

-- Guarda TUSD e TE separados (editáveis no admin). tarifa_tusd_te = tusd + te.
alter table public.parametros_energia add column if not exists tusd numeric(12,5);
alter table public.parametros_energia add column if not exists te   numeric(12,5);

-- Tarifa 2026 (Neoenergia PE, B1 residencial), retirada de fatura real:
--   TUSD 0,70 + TE 0,34 = 1,04 R$/kWh (sem tributos).
update public.parametros_energia
set tusd = 0.70,
    te   = 0.34,
    tarifa_tusd_te = 1.04,
    vigente_desde  = current_date
where id = (
  select id from public.parametros_energia
  order by vigente_desde desc, created_at desc limit 1
);

-- Para linhas antigas sem TUSD/TE, usa a tarifa combinada como TUSD.
update public.parametros_energia
set tusd = coalesce(tusd, tarifa_tusd_te), te = coalesce(te, 0)
where tusd is null or te is null;
