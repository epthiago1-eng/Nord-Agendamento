-- ==============================================================================
-- OTIMIZAÇÃO DE PERFORMANCE (EGRESS E CONSULTAS)
-- ==============================================================================

-- 1. ÍNDICES PARA CONSULTAS FREQUENTES
-- Acelera buscas por data e profissional, reduzindo o tempo de CPU e IO no banco.

CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_professional_id ON public.appointments("professionalId");
CREATE INDEX IF NOT EXISTS idx_appointments_client_phone ON public.appointments("clientPhone");

CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_professional_id ON public.transactions(professional_id);
CREATE INDEX IF NOT EXISTS idx_transactions_appointment_id ON public.transactions(appointment_id);

-- 2. FUNÇÃO RPC PARA CÁLCULO DE TOTAIS NO SERVIDOR (REDUZ EGRESS)
-- Em vez de baixar milhares de linhas para somar no front, o banco retorna apenas o resumo.

CREATE OR REPLACE FUNCTION public.get_financial_summary(
  start_date date,
  end_date date,
  pro_id_filter uuid DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_income numeric := 0;
  v_expense numeric := 0;
  v_total_commissions numeric := 0;
  v_pending_commissions numeric := 0;
  v_future_receivables numeric := 0;
  v_net numeric := 0;
BEGIN
  -- Calcular Entradas (Vendas)
  SELECT COALESCE(SUM(total_value), 0)
  INTO v_income
  FROM public.transactions
  WHERE date >= start_date AND date <= end_date
    AND operation = 'VENDA'
    AND type != 'GORJETA' -- Exclui gorjetas do faturamento da casa
    AND (pro_id_filter IS NULL OR professional_id = pro_id_filter);

  -- Calcular Saídas (Despesas)
  SELECT COALESCE(SUM(ABS(total_value)), 0)
  INTO v_expense
  FROM public.transactions
  WHERE date >= start_date AND date <= end_date
    AND operation = 'COMPRA'
    AND (pro_id_filter IS NULL OR professional_id = pro_id_filter);

  -- Calcular Comissões Pendentes
  SELECT COALESCE(SUM(commission_amount), 0)
  INTO v_pending_commissions
  FROM public.transactions
  WHERE date >= start_date AND date <= end_date
    AND operation = 'VENDA'
    AND commission_paid = false
    AND (pro_id_filter IS NULL OR professional_id = pro_id_filter);

  -- Calcular Recebíveis Futuros (Cartão de Crédito)
  SELECT COALESCE(SUM(total_value), 0)
  INTO v_future_receivables
  FROM public.transactions
  WHERE date >= start_date AND date <= end_date
    AND operation = 'VENDA'
    AND payment_method ILIKE '%crédito%'
    AND (pro_id_filter IS NULL OR professional_id = pro_id_filter);

  v_net := v_income - v_expense;

  RETURN json_build_object(
    'income', v_income,
    'expense', v_expense,
    'pending_commissions', v_pending_commissions,
    'future_receivables', v_future_receivables,
    'net', v_net
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Permissões para a nova função
GRANT EXECUTE ON FUNCTION public.get_financial_summary(date, date, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_financial_summary(date, date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_financial_summary(date, date, uuid) TO service_role;
