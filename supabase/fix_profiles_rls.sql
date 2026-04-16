-- Adiciona política de INSERT para a tabela profiles
-- Necessário porque o comando 'upsert' do Supabase exige permissão de INSERT, mesmo quando acaba fazendo um UPDATE.
DROP POLICY IF EXISTS "Profiles Insert Access" ON public.profiles;

CREATE POLICY "Profiles Insert Access" ON public.profiles 
FOR INSERT 
WITH CHECK (
  is_admin() OR auth.uid() = id
);

-- Garante que a política de UPDATE tenha a cláusula WITH CHECK explícita para evitar problemas
DROP POLICY IF EXISTS "Profiles Update Access" ON public.profiles;

CREATE POLICY "Profiles Update Access" ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id OR is_admin())
WITH CHECK (auth.uid() = id OR is_admin());
