-- ==============================================================================
-- VINCULA CONTAS (bills) AO LANÇAMENTO FINANCEIRO QUE ELAS GERAM
--
-- Problema: "Desfazer Pagamento" localizava a transação a remover comparando
-- descrição + valor (item = 'Pgto: <descrição>' AND val = -valor), pegando a
-- mais recente que batesse. Contas recorrentes (aluguel, etc.) são clonadas
-- todo mês com a MESMA descrição — se dois meses da mesma conta já foram
-- pagos, desfazer o pagamento de um mês antigo apaga o lançamento do mês mais
-- recente por engano, deixando o lançamento antigo órfão e o saldo errado.
--
-- Correção: bills.transaction_id guarda o id exato da transação criada no
-- pagamento. O estorno usa esse vínculo direto; a busca por descrição+valor
-- vira apenas um fallback para contas pagas antes desta mudança.
-- ==============================================================================

ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL;
