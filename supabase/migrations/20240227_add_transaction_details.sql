-- Add new columns for detailed financial tracking
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS original_value numeric(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_value numeric(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_amount numeric(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_rate numeric(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS appointment_total numeric(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS appointment_tip numeric(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_value numeric(10, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS commission_type text DEFAULT 'percent';

-- Rename or use existing columns if they match the intent, but adding specific ones is safer.
-- Note: 'val' and 'total_value' usually hold the net value (final price).

-- Ensure indexes if needed (optional but good for performance)
-- create index IF not exists idx_transactions_date on public.transactions (date);
