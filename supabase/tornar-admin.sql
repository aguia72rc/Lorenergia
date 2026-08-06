-- =====================================================================
-- Transformar um usuário em ADMINISTRADOR (dono da usina)
-- =====================================================================
-- 1) Crie sua conta normalmente (cadastre-se pelo app ou pelo painel
--    Authentication > Users do Supabase).
-- 2) Troque o e-mail abaixo pelo SEU e-mail e rode este comando no
--    SQL Editor do Supabase.
-- =====================================================================

update public.profiles
set role = 'admin'
where email = 'seu-email@exemplo.com';

-- Conferir:
-- select id, email, role, cliente_id from public.profiles;
