
-- Fix constraints in appointments table to allow null client_id and professional_id
-- This prevents crashes when the app uses temporary or legacy IDs that the code nullifies
-- or when the client creation fails.

ALTER TABLE public.appointments ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE public.appointments ALTER COLUMN professional_id DROP NOT NULL;

-- Clean up duplicate clients before adding unique constraint
DO $$ 
DECLARE 
    r RECORD;
    master_id UUID;
BEGIN 
    -- Find phones that have duplicates
    FOR r IN (SELECT phone FROM public.clients GROUP BY phone HAVING COUNT(*) > 1) LOOP
        -- Pick one record as master (the one with the lowest ID or first found)
        SELECT id INTO master_id FROM public.clients WHERE phone = r.phone LIMIT 1;
        
        -- Update references in appointments to the master ID
        -- We try to update both snake_case and camelCase if they exist as columns
        BEGIN
            UPDATE public.appointments SET client_id = master_id WHERE client_id IN (SELECT id FROM public.clients WHERE phone = r.phone AND id <> master_id);
        EXCEPTION WHEN OTHERS THEN 
            -- Ignore if column doesn't exist
        END;

        BEGIN
            UPDATE public.appointments SET "clientId" = master_id::text WHERE "clientId" IN (SELECT id::text FROM public.clients WHERE phone = r.phone AND id <> master_id);
        EXCEPTION WHEN OTHERS THEN 
            -- Ignore if column doesn't exist
        END;
        
        -- Delete duplicates
        DELETE FROM public.clients WHERE phone = r.phone AND id <> master_id;
    END LOOP;
END $$;

-- Ensure clients table has a unique constraint on phone to allow upsert to work correctly
-- This is critical for the public booking flow to link appointments to real clients
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'clients_phone_key'
    ) THEN
        ALTER TABLE public.clients ADD CONSTRAINT clients_phone_key UNIQUE (phone);
    END IF;
END $$;

-- Also ensure professionalId and clientPhone columns exist if they are being used in indices
-- (The app seems to use both camelCase and snake_case)
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS "clientId" text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS "professionalId" text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS "clientPhone" text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS "clientName" text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS "professionalName" text;
