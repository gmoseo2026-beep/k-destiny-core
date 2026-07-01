-- supabase_scripts/create_payment_consents.sql

-- 1. Create the payment_consents table
CREATE TABLE IF NOT EXISTS public.payment_consents (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    plan_id text NOT NULL,
    consented_at timestamp with time zone DEFAULT now() NOT NULL,
    user_agent text,
    ip_address text
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.payment_consents ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
-- Allow users to insert their own consent records
CREATE POLICY "Users can insert their own consent records"
ON public.payment_consents
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to read their own consent records (optional, but good for transparency)
CREATE POLICY "Users can view their own consent records"
ON public.payment_consents
FOR SELECT
USING (auth.uid() = user_id);

-- Only service role / admins can view all records (no policy needed, default behavior of RLS blocks public read)
