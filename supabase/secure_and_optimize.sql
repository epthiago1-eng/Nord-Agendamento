-- ==============================================================================
-- 1. HABILITAR RLS (ROW LEVEL SECURITY) EM TODAS AS TABELAS
-- Isso remove o aviso de "Unrestricted" e protege os dados por padrão.
-- ==============================================================================

ALTER TABLE public.agenda_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 2. FUNÇÕES AUXILIARES DE SEGURANÇA
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  -- SECURITY DEFINER + search_path = public garante que ignore RLS
  RETURN COALESCE(
    (SELECT role = 'ADMIN' FROM public.profiles WHERE id = auth.uid()),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_my_pro_id()
RETURNS uuid AS $$
BEGIN
  RETURN (SELECT professional_id FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ==============================================================================
-- 3. POLÍTICAS DE ACESSO (POLICIES)
-- ==============================================================================

-- --- TABELA: SETTINGS ---
DROP POLICY IF EXISTS "Settings Public Read" ON public.settings;
DROP POLICY IF EXISTS "Settings Admin Write" ON public.settings;
CREATE POLICY "Settings Public Read" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Settings Admin Write" ON public.settings FOR ALL USING (is_admin());

-- --- TABELA: PROFILES ---
-- Permitir que qualquer usuário logado veja os perfis (necessário para filtrar admins no app)
DROP POLICY IF EXISTS "Profiles Read Access" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Update Access" ON public.profiles;
CREATE POLICY "Profiles Read Access" ON public.profiles FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Profiles Update Access" ON public.profiles FOR UPDATE 
USING (auth.uid() = id OR is_admin());

-- --- TABELA: PROFESSIONALS ---
DROP POLICY IF EXISTS "Professionals Public Read" ON public.professionals;
DROP POLICY IF EXISTS "Professionals Admin Write" ON public.professionals;
CREATE POLICY "Professionals Public Read" ON public.professionals FOR SELECT USING (true);
CREATE POLICY "Professionals Admin Write" ON public.professionals FOR ALL USING (is_admin());

-- --- TABELA: SERVICES ---
DROP POLICY IF EXISTS "Services Public Read" ON public.services;
DROP POLICY IF EXISTS "Services Admin Write" ON public.services;
CREATE POLICY "Services Public Read" ON public.services FOR SELECT USING (true);
CREATE POLICY "Services Admin Write" ON public.services FOR ALL USING (is_admin());

-- --- TABELA: APPOINTMENTS ---
DROP POLICY IF EXISTS "Appointments Read Access" ON public.appointments;
DROP POLICY IF EXISTS "Appointments Insert Access" ON public.appointments;
DROP POLICY IF EXISTS "Appointments Update Access" ON public.appointments;
DROP POLICY IF EXISTS "Appointments Delete Access" ON public.appointments;

-- Leitura: Admin vê tudo. Outros vêem o que é público ou o que lhes pertence.
CREATE POLICY "Appointments Read Access" ON public.appointments FOR SELECT 
USING (
  is_admin() 
  OR 
  (auth.role() = 'authenticated' AND "professionalId"::text = get_my_pro_id()::text)
  OR
  (auth.role() = 'anon')
);

CREATE POLICY "Appointments Insert Access" ON public.appointments FOR INSERT 
WITH CHECK (true); -- Permitir inserção (spam check é feito no app)

CREATE POLICY "Appointments Update Access" ON public.appointments FOR UPDATE 
USING (
  is_admin() 
  OR 
  (auth.role() = 'authenticated' AND "professionalId"::text = get_my_pro_id()::text)
);

CREATE POLICY "Appointments Delete Access" ON public.appointments FOR DELETE USING (is_admin());

-- --- TABELA: TRANSACTIONS ---
DROP POLICY IF EXISTS "Transactions Read Access" ON public.transactions;
DROP POLICY IF EXISTS "Transactions Write Access" ON public.transactions;
DROP POLICY IF EXISTS "Transactions Update Access" ON public.transactions;
DROP POLICY IF EXISTS "Transactions Delete Access" ON public.transactions;

CREATE POLICY "Transactions Read Access" ON public.transactions FOR SELECT 
USING (
  is_admin() 
  OR 
  (auth.role() = 'authenticated' AND professional_id = get_my_pro_id())
);

CREATE POLICY "Transactions Write Access" ON public.transactions FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Transactions Update Access" ON public.transactions FOR UPDATE 
USING (is_admin() OR professional_id = get_my_pro_id());

CREATE POLICY "Transactions Delete Access" ON public.transactions FOR DELETE USING (is_admin());

-- --- TABELA: CLIENTS ---
DROP POLICY IF EXISTS "Clients Access" ON public.clients;
CREATE POLICY "Clients Access" ON public.clients FOR ALL 
USING (true)
WITH CHECK (true);

-- --- TABELA: PRODUCTS ---
DROP POLICY IF EXISTS "Products Read Auth" ON public.products;
DROP POLICY IF EXISTS "Products Admin Write" ON public.products;
CREATE POLICY "Products Read Auth" ON public.products FOR SELECT USING (true);
CREATE POLICY "Products Admin Write" ON public.products FOR ALL USING (is_admin());

-- --- TABELA: BILLS ---
DROP POLICY IF EXISTS "Bills Admin Access" ON public.bills;
CREATE POLICY "Bills Admin Access" ON public.bills FOR ALL USING (is_admin());

-- --- TABELA: COST_CENTERS ---
DROP POLICY IF EXISTS "CostCenters Admin Access" ON public.cost_centers;
CREATE POLICY "CostCenters Admin Access" ON public.cost_centers FOR ALL USING (is_admin());

-- --- TABELA: NOTIFICATIONS ---
DROP POLICY IF EXISTS "Notifications Read Access" ON public.notifications;
DROP POLICY IF EXISTS "Notifications Write Access" ON public.notifications;
DROP POLICY IF EXISTS "Notifications Admin Update" ON public.notifications;
DROP POLICY IF EXISTS "Notifications Admin Delete" ON public.notifications;

CREATE POLICY "Notifications Read Access" ON public.notifications FOR SELECT 
USING (
  is_admin() 
  OR 
  recipient_pro_id = get_my_pro_id()
  OR
  recipient_pro_id IS NULL
);

CREATE POLICY "Notifications Write Access" ON public.notifications FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Notifications Admin Update" ON public.notifications FOR UPDATE USING (is_admin());
CREATE POLICY "Notifications Admin Delete" ON public.notifications FOR DELETE USING (is_admin());

-- --- TABELA: AGENDA_BLOCKS ---
-- Leitura: Pública (para verificar disponibilidade)
CREATE POLICY "Blocks Public Read" ON public.agenda_blocks FOR SELECT USING (true);
-- Escrita: Admin ou o próprio Profissional
CREATE POLICY "Blocks Write Access" ON public.agenda_blocks FOR ALL 
USING (is_admin() OR professional_id = get_my_pro_id());

-- --- TABELA: PROFESSIONAL_HOURS ---
-- Leitura: Pública
CREATE POLICY "Hours Public Read" ON public.professional_hours FOR SELECT USING (true);
-- Escrita: Admin
CREATE POLICY "Hours Admin Write" ON public.professional_hours FOR ALL USING (is_admin());

-- --- TABELA: PROFESSIONAL_SERVICES ---
-- Leitura: Autenticados (para cálculo de comissão)
CREATE POLICY "ProServices Read Auth" ON public.professional_services FOR SELECT USING (auth.role() = 'authenticated');
-- Escrita: Admin
CREATE POLICY "ProServices Admin Write" ON public.professional_services FOR ALL USING (is_admin());

-- --- TABELA: PAYMENT_METHODS ---
-- Leitura: Autenticados
CREATE POLICY "PaymentMethods Read Auth" ON public.payment_methods FOR SELECT USING (auth.role() = 'authenticated');
-- Escrita: Admin
CREATE POLICY "PaymentMethods Admin Write" ON public.payment_methods FOR ALL USING (is_admin());


-- ==============================================================================
-- 5. FUNÇÕES RPC PARA AGENDAMENTO PÚBLICO (SEGURANÇA VIA TELEFONE)
-- Permite que usuários não logados cancelem/reagendem se confirmarem o telefone.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.cancel_appointment_public(
  p_appointment_id uuid,
  p_client_phone text
)
RETURNS void AS $$
DECLARE
  v_phone text;
BEGIN
  -- Verifica se o agendamento existe e pega o telefone
  SELECT "clientPhone" INTO v_phone
  FROM public.appointments
  WHERE id = p_appointment_id;

  IF v_phone IS NULL THEN
    RAISE EXCEPTION 'Agendamento não encontrado.';
  END IF;

  -- Normalização básica para comparação (remove caracteres não numéricos)
  -- Assumindo que o front envia formatado ou não, o ideal é comparar apenas números.
  IF regexp_replace(v_phone, '\D', '', 'g') <> regexp_replace(p_client_phone, '\D', '', 'g') THEN
    RAISE EXCEPTION 'Telefone não confere com o agendamento.';
  END IF;

  UPDATE public.appointments
  SET status = 'Cancelaram'
  WHERE id = p_appointment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.update_appointment_public(
  p_appointment_id uuid,
  p_client_phone text,
  p_data jsonb
)
RETURNS void AS $$
DECLARE
  v_phone text;
BEGIN
  SELECT "clientPhone" INTO v_phone
  FROM public.appointments
  WHERE id = p_appointment_id;

  IF v_phone IS NULL THEN
    RAISE EXCEPTION 'Agendamento não encontrado.';
  END IF;

  IF regexp_replace(v_phone, '\D', '', 'g') <> regexp_replace(p_client_phone, '\D', '', 'g') THEN
    RAISE EXCEPTION 'Telefone não confere com o agendamento.';
  END IF;

  UPDATE public.appointments
  SET 
    date = COALESCE((p_data->>'date')::text, date),
    time = COALESCE((p_data->>'time')::text, time),
    "professionalId" = COALESCE((p_data->>'professionalId')::text, "professionalId"),
    "professionalName" = COALESCE((p_data->>'professionalName')::text, "professionalName"),
    duration = COALESCE((p_data->>'duration')::int, duration),
    status = COALESCE((p_data->>'status')::text, status),
    observation = COALESCE((p_data->>'observation')::text, observation),
    -- Services é array de texto, precisa de cast cuidadoso do JSONB
    services = COALESCE(
      (SELECT array_agg(x) FROM jsonb_array_elements_text(p_data->'services') t(x)),
      services
    ),
    total_value = COALESCE((p_data->>'total_value')::numeric, total_value)
  WHERE id = p_appointment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

