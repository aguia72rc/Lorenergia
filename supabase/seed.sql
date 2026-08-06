-- =====================================================================
-- Dados de exemplo (OPCIONAL) - útil para testar o sistema.
-- Rode DEPOIS do 0001_init.sql. Remova antes de usar em produção.
-- =====================================================================

insert into public.clientes (nome, unidade, email, telefone, desconto_percentual)
values
  ('Maria Silva',    'Apto 101', 'maria@example.com',  '5511999990001', 20),
  ('João Souza',     'Apto 102', 'joao@example.com',   '5511999990002', 20),
  ('Ana Oliveira',   'Apto 201', 'ana@example.com',    '5511999990003', 15),
  ('Carlos Pereira', 'Apto 202', 'carlos@example.com', '5511999990004', 20)
on conflict do nothing;

update public.configuracoes
set nome_usina = 'Usina Solar do Prédio',
    tarifa_kwh = 0.95,
    dados_pagamento = 'PIX (chave): seu-email@exemplo.com'
where id = 1;
