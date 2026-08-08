-- ==============================================================================
-- FECHA VAZAMENTO PÚBLICO NA TABELA BILLS (contas a pagar/despesas)
--
-- Verificado ao vivo: a chave pública (anon) do projeto conseguia ler todas
-- as linhas de public.bills (descrição, valor, vencimento, categoria) sem
-- autenticação. A primeira tentativa (recriar só a policy "Bills Admin
-- Access") não resolveu — sinal de que existe outra policy permissiva
-- na tabela (RLS combina policies com OU: qualquer uma que libere já basta),
-- provavelmente uma policy de leitura pública antiga que nunca foi removida.
--
-- Esta versão remove TODAS as policies existentes em public.bills antes de
-- recriar só a correta, sem depender de adivinhar o nome da policy extra.
-- ==============================================================================

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bills' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.bills', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bills Admin Access" ON public.bills FOR ALL USING (is_admin());
