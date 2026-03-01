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
-- Evitam repetição de código nas políticas e centralizam a lógica de permissão.
-- ==============================================================================

-- Verifica se o usuário atual é ADMIN
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  -- Verifica a role na tabela profiles
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Retorna o ID do Profissional vinculado ao usuário atual (se houver)
CREATE OR REPLACE FUNCTION public.get_my_pro_id()
RETURNS uuid AS $$
BEGIN
  RETURN (SELECT professional_id FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 3. POLÍTICAS DE ACESSO (POLICIES)
-- Definem quem pode fazer o que em cada tabela.
-- ==============================================================================

-- --- TABELA: SETTINGS ---
-- Leitura: Pública (necessário para carregar cores/logo no login)
CREATE POLICY "Settings Public Read" ON public.settings FOR SELECT USING (true);
-- Escrita: Apenas Admin
CREATE POLICY "Settings Admin Write" ON public.settings FOR ALL USING (is_admin());

-- --- TABELA: PROFILES ---
-- Leitura: O próprio usuário ou Admin
CREATE POLICY "Profiles Read Own or Admin" ON public.profiles FOR SELECT 
USING (auth.uid() = id OR is_admin());
-- Escrita: Apenas Admin (geralmente) ou o próprio usuário (para editar nome)
CREATE POLICY "Profiles Update Own or Admin" ON public.profiles FOR UPDATE 
USING (auth.uid() = id OR is_admin());

-- --- TABELA: PROFESSIONALS ---
-- Leitura: Pública (necessário para agendamento)
CREATE POLICY "Professionals Public Read" ON public.professionals FOR SELECT USING (true);
-- Escrita: Apenas Admin
CREATE POLICY "Professionals Admin Write" ON public.professionals FOR ALL USING (is_admin());

-- --- TABELA: SERVICES ---
-- Leitura: Pública
CREATE POLICY "Services Public Read" ON public.services FOR SELECT USING (true);
-- Escrita: Apenas Admin
CREATE POLICY "Services Admin Write" ON public.services FOR ALL USING (is_admin());

-- --- TABELA: APPOINTMENTS ---
-- Leitura: Admin vê tudo. Colaborador vê os seus.
-- Nota: professionalId na tabela appointments é TEXT, precisamos converter para comparar.
CREATE POLICY "Appointments Read Access" ON public.appointments FOR SELECT 
USING (
  is_admin() 
  OR 
  (auth.role() = 'authenticated' AND "professionalId"::text = get_my_pro_id()::text)
);

-- Inserção: Usuários autenticados (Recepcionista, Colaborador, Admin)
CREATE POLICY "Appointments Insert Access" ON public.appointments FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Atualização: Admin ou Dono do agendamento
CREATE POLICY "Appointments Update Access" ON public.appointments FOR UPDATE 
USING (
  is_admin() 
  OR 
  (auth.role() = 'authenticated' AND "professionalId"::text = get_my_pro_id()::text)
);

-- Exclusão: Apenas Admin (ou Colaborador se permitido pela regra de negócio, aqui restrito a Admin para segurança)
CREATE POLICY "Appointments Delete Access" ON public.appointments FOR DELETE USING (is_admin());

-- --- TABELA: TRANSACTIONS ---
-- Leitura: Admin vê tudo. Colaborador vê as suas (para calcular comissão).
CREATE POLICY "Transactions Read Access" ON public.transactions FOR SELECT 
USING (
  is_admin() 
  OR 
  (auth.role() = 'authenticated' AND professional_id = get_my_pro_id())
);

-- Escrita: Admin ou Colaborador (para lançar vendas/serviços)
CREATE POLICY "Transactions Write Access" ON public.transactions FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Transactions Update Access" ON public.transactions FOR UPDATE 
USING (is_admin() OR professional_id = get_my_pro_id());

CREATE POLICY "Transactions Delete Access" ON public.transactions FOR DELETE USING (is_admin());

-- --- TABELA: CLIENTS ---
-- Leitura/Escrita: Todos os usuários autenticados (Colaboradores precisam ver/cadastrar clientes)
CREATE POLICY "Clients Auth Access" ON public.clients FOR ALL 
USING (auth.role() = 'authenticated');

-- --- TABELA: PRODUCTS ---
-- Leitura: Autenticados (para lançar vendas)
CREATE POLICY "Products Read Auth" ON public.products FOR SELECT USING (auth.role() = 'authenticated');
-- Escrita: Apenas Admin (Gestão de Estoque)
CREATE POLICY "Products Admin Write" ON public.products FOR ALL USING (is_admin());

-- --- TABELA: BILLS (Contas a Pagar) ---
-- Acesso total apenas para Admin
CREATE POLICY "Bills Admin Access" ON public.bills FOR ALL USING (is_admin());

-- --- TABELA: COST_CENTERS ---
-- Acesso total apenas para Admin
CREATE POLICY "CostCenters Admin Access" ON public.cost_centers FOR ALL USING (is_admin());

-- --- TABELA: NOTIFICATIONS ---
-- Leitura: Admin ou Destinatário
CREATE POLICY "Notifications Read Access" ON public.notifications FOR SELECT 
USING (
  is_admin() 
  OR 
  recipient_pro_id = get_my_pro_id()
  OR
  recipient_pro_id IS NULL -- Notificações gerais
);
-- Escrita: Sistema (via funções) ou Admin
CREATE POLICY "Notifications Admin Write" ON public.notifications FOR ALL USING (is_admin());

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
-- 4. ÍNDICES DE PERFORMANCE (PERFORMANCE TUNING)
-- Acelera as consultas mais frequentes do aplicativo.
-- ==============================================================================

-- Appointments: Muito filtrado por data e profissional
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_pro_id ON public.appointments("professionalId");
CREATE INDEX IF NOT EXISTS idx_appointments_client_phone ON public.appointments("clientPhone");

-- Transactions: Filtrado por data, profissional e tipo
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_pro_id ON public.transactions(professional_id);
CREATE INDEX IF NOT EXISTS idx_transactions_operation ON public.transactions(operation);

-- Clients: Busca por telefone e nome
CREATE INDEX IF NOT EXISTS idx_clients_phone ON public.clients(phone);
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients(name);

-- Notifications: Filtrado por destinatário e status de leitura
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_pro_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

-- Profiles: Join constante para auth
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(id);

