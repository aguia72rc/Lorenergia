-- =====================================================================
-- LORENERGIA - Migração 0021: Consumo do Prédio deixa de ser um morador
-- =====================================================================
-- Rode no SQL Editor do Supabase DEPOIS da 0020.
--
-- Ajuste de modelo: o "Consumo do Prédio" NÃO é mais um morador/UC. Ele
-- entra apenas como geração, consumo e compensação:
--   - a geração cobre o consumo do prédio primeiro (compensação do prédio);
--   - o EXCEDENTE (geração − consumo do prédio) é a base do rateio dos
--     demais moradores.
--
-- Os membros continuam marcados com predio_papel = 'membro' (a soma do
-- consumo deles é o "Consumo do Prédio"). Aqui removemos a UC 'grupo' que a
-- migração 0020 havia criado.
-- =====================================================================

delete from public.clientes where predio_papel = 'grupo';
