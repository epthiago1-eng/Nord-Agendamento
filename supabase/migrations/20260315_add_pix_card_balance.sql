-- Adiciona colunas de saldo pix e cartão na tabela settings
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS pix_balance numeric DEFAULT 0;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS card_balance numeric DEFAULT 0;
