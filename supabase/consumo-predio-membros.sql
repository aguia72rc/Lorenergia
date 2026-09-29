-- =====================================================================
-- LORENERGIA - Marcar membros do "Consumo do Prédio"
-- =====================================================================
-- Rode DEPOIS da migração 0020_consumo_predio.sql.
--
-- Marca RAMON, ROCKSANE, AÉRCIO, LINDALVA, POLIANA, MANOEL, ADRIANA e
-- MARIA GISELE como membros do Consumo do Prédio (saem do rateio individual).
--
-- ⚠️ CONFIRA ANTES: rode primeiro o SELECT de prévia e veja se aparecem
-- exatamente os 8 moradores certos. Ajuste os nomes se algum não bater
-- (ILIKE é sensível a acento — por isso há variantes com/sem acento).
-- =====================================================================

-- 1) PRÉVIA — quem será marcado (rode e confira: devem ser 8):
select id, nome, unidade
from public.clientes
where coalesce(predio_papel,'') <> 'grupo'
  and nome ilike any (array[
    '%ramon%', '%rocksane%', '%roxane%',
    '%aércio%', '%aercio%',
    '%lindalva%', '%poliana%', '%manoel%',
    '%adriana%', '%maria gisele%'
  ]);

-- 2) APLICAR — só rode depois de conferir a prévia acima:
update public.clientes
set predio_papel = 'membro'
where coalesce(predio_papel,'') <> 'grupo'
  and nome ilike any (array[
    '%ramon%', '%rocksane%', '%roxane%',
    '%aércio%', '%aercio%',
    '%lindalva%', '%poliana%', '%manoel%',
    '%adriana%', '%maria gisele%'
  ]);

-- Para desfazer um marcado por engano:
--   update public.clientes set predio_papel = null where id = '<uuid>';
