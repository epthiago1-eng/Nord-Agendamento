-- ==============================================================================
-- RESTRINGE ACESSO A DADOS FINANCEIROS SENSÍVEIS (saldos e resumo financeiro)
--
-- Problema: a tabela `settings` tinha SELECT liberado para todos (policy
-- "Settings Public Read" USING (true)), incluindo as colunas de saldo
-- (cash_balance, bank_balance, pix_balance, card_balance). Como `settings` é
-- lida pelas telas públicas de agendamento (sem login), qualquer pessoa com a
-- chave pública (anon) do projeto conseguia ler o saldo de caixa/banco/pix/
-- cartão em tempo real via REST, e também chamar a função get_financial_summary
-- (SECURITY DEFINER, sem checagem de admin, liberada para o papel anon) para
-- obter faturamento/despesa/lucro de qualquer período.
--
-- Correção: as colunas de saldo deixam de ser legíveis via SELECT direto para
-- os papéis anon/authenticated (permissão em nível de coluna). Uma nova RPC
-- get_cash_balances() passa a ser o único caminho para ler os saldos, e ela
-- checa is_admin() internamente. get_financial_summary() passa a checar
-- is_admin() também, e perde a permissão de execução do papel anon.
--
-- Não afeta escrita: a policy "Settings Admin Write" (USING (is_admin()))
-- continua controlando quem pode alterar os saldos, sem mudança aqui.
-- ==============================================================================

-- 1. Remove a leitura direta das colunas de saldo para anon/authenticated,
--    mantendo os campos públicos (nome, logo, cores, intervalo de agenda)
--    legíveis como antes.
REVOKE SELECT ON public.settings FROM anon, authenticated;
GRANT SELECT (id, primary_color, secondary_color, name, logo_url, slot_interval)
  ON public.settings TO anon, authenticated;

-- 2. RPC dedicada para ler os saldos, restrita a administradores.
CREATE OR REPLACE FUNCTION public.get_cash_balances()
RETURNS TABLE (
  cash_balance numeric,
  bank_balance numeric,
  pix_balance numeric,
  card_balance numeric
) AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem consultar saldos.';
  END IF;

  RETURN QUERY
  SELECT s.cash_balance, s.bank_balance, s.pix_balance, s.card_balance
  FROM public.settings s
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.get_cash_balances() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_cash_balances() TO authenticated;

-- 3. get_financial_summary passa a exigir admin e perde acesso anônimo.
--    (Corpo idêntico ao de supabase/secure_and_optimize.sql, só com a
--    checagem de admin adicionada no início.)
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
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem consultar o resumo financeiro.';
  END IF;

  SELECT COALESCE(SUM(val), 0)
  INTO v_income
  FROM public.transactions
  WHERE date >= start_date AND date <= end_date
    AND operation_type = 'ENTRADA'
    AND type != 'GORJETA'
    AND (pro_id_filter IS NULL OR professional_id = pro_id_filter);

  SELECT COALESCE(SUM(ABS(val)), 0)
  INTO v_expense
  FROM public.transactions
  WHERE date >= start_date AND date <= end_date
    AND operation_type = 'SAÍDA'
    AND (pro_id_filter IS NULL OR professional_id = pro_id_filter);

  SELECT COALESCE(SUM(commission_amount), 0)
  INTO v_pending_commissions
  FROM public.transactions
  WHERE date >= start_date AND date <= end_date
    AND operation_type = 'ENTRADA'
    AND commission_paid = false
    AND (pro_id_filter IS NULL OR professional_id = pro_id_filter);

  SELECT COALESCE(SUM(val), 0)
  INTO v_future_receivables
  FROM public.transactions
  WHERE date >= start_date AND date <= end_date
    AND operation_type = 'ENTRADA'
    AND payment_account = 'CARD'
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

REVOKE EXECUTE ON FUNCTION public.get_financial_summary(date, date, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_financial_summary(date, date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_financial_summary(date, date, uuid) TO service_role;
