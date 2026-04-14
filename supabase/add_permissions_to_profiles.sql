-- Adiciona colunas de permissões granulares à tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS can_delete_appointments boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS can_transfer_appointments boolean DEFAULT false;

-- Atualiza a política de RLS para permitir que colaboradores com permissão deletem agendamentos
DROP POLICY IF EXISTS "Appointments Delete Access" ON public.appointments;

CREATE POLICY "Appointments Delete Access" ON public.appointments
    FOR DELETE
    USING (
        is_admin() 
        OR 
        (
            auth.uid() IN (SELECT id FROM public.profiles WHERE can_delete_appointments = true)
        )
    );

-- A política de UPDATE já permite que o próprio profissional atualize (o que cobre a transferência para si mesmo),
-- mas para transferir DE si mesmo PARA outro, o RLS atual:
-- (is_admin() OR auth.uid() = "professionalId")
-- Como a transferência altera o "professionalId" para o ID do NOVO profissional, 
-- a política de UPDATE precisa permitir se o usuário logado é o profissional ANTIGO (que está transferindo)
-- ou se ele tem a permissão 'can_transfer_appointments'.

DROP POLICY IF EXISTS "Appointments Update Access" ON public.appointments;

CREATE POLICY "Appointments Update Access" ON public.appointments
    FOR UPDATE
    USING (
        is_admin() 
        OR 
        (auth.role() = 'authenticated' AND "professionalId"::text = get_my_pro_id()::text)
        OR
        (
            auth.uid() IN (SELECT id FROM public.profiles WHERE can_transfer_appointments = true)
        )
    );
