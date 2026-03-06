-- Adiciona colunas de saldo bancário e caixa na tabela settings
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS cash_balance numeric DEFAULT 0;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS bank_balance numeric DEFAULT 0;
