-- Add referral columns to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS referral_count integer DEFAULT 0;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS free_haircuts_earned integer DEFAULT 0;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.clients(id);

-- Create announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    message text,
    image_url text,
    target_audience text NOT NULL CHECK (target_audience IN ('PUBLIC', 'ADMIN', 'ALL')),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at timestamp with time zone
);

-- RLS for announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Announcements are viewable by everyone."
    ON public.announcements FOR SELECT
    USING (true);

CREATE POLICY "Announcements are insertable by authenticated users only"
    ON public.announcements FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Announcements are updatable by authenticated users only"
    ON public.announcements FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Announcements are deletable by authenticated users only"
    ON public.announcements FOR DELETE
    USING (auth.role() = 'authenticated');
