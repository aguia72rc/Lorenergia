-- =====================================================================
-- LORENERGIA - Migração 0020: Consumo do Prédio (grupo no rateio)
-- =====================================================================
-- Rode no SQL Editor do Supabase DEPOIS da 0019.
--
-- Alguns moradores fazem parte do "Consumo do Prédio" e não devem aparecer
-- como participantes individuais do rateio. Eles são agrupados em UMA linha
-- de rateio chamada "Consumo do Prédio", cujo consumo é a SOMA dos membros.
--
--   predio_papel = 'grupo'  -> a UC única "Consumo do Prédio" (entra no rateio)
--   predio_papel = 'membro' -> morador que compõe o consumo do prédio
--                              (sai dos sliders individuais do rateio)
--   NULL                    -> morador normal (participa do rateio sozinho)
-- =====================================================================

alter table public.clientes
  add column if not exists predio_papel text
    check (predio_papel in ('grupo','membro'));

comment on column public.clientes.predio_papel is
  'Papel no rateio: grupo (UC Consumo do Prédio), membro (compõe o prédio) ou NULL (normal).';

-- Cria a UC única "Consumo do Prédio" (só se ainda não existir).
insert into public.clientes (nome, unidade, predio_papel, ativo)
select 'Consumo do Prédio', 'Área comum', 'grupo', true
where not exists (select 1 from public.clientes where predio_papel = 'grupo');
