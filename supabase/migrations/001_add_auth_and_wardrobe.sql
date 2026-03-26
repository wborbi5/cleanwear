-- ============================================================
-- CleanWear: Auth & Wardrobe Migration
-- Adds user_id + posthog_distinct_id to scans,
-- creates wardrobe table, RLS policies, and migration function
-- ============================================================

-- 1. Add auth columns to scans
ALTER TABLE public.scans
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS posthog_distinct_id text;

-- 2. Create wardrobe table
CREATE TABLE IF NOT EXISTS public.wardrobe (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id    bigint REFERENCES public.products(id) ON DELETE SET NULL,
  scan_id       bigint REFERENCES public.scans(id) ON DELETE SET NULL,
  product_name  text NOT NULL,
  brand         text,
  score         integer,
  category      text,
  scan_data     jsonb,
  added_at      timestamptz DEFAULT now()
);

-- 3. Index for fast wardrobe lookups
CREATE INDEX IF NOT EXISTS idx_wardrobe_user_id ON public.wardrobe(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_posthog_id ON public.scans(posthog_distinct_id) WHERE posthog_distinct_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON public.scans(user_id) WHERE user_id IS NOT NULL;

-- 4. Enable RLS
ALTER TABLE public.wardrobe ENABLE ROW LEVEL SECURITY;
-- scans RLS is already enabled per schema

-- ── SCANS RLS POLICIES ──────────────────────────────────────

-- Anonymous inserts (user_id IS NULL is valid)
CREATE POLICY "scans_anon_insert" ON public.scans
  FOR INSERT WITH CHECK (true);

-- Authenticated users can read their own scans
CREATE POLICY "scans_select_own" ON public.scans
  FOR SELECT USING (user_id = auth.uid());

-- Authenticated users can update their own scans (for migration)
CREATE POLICY "scans_update_own" ON public.scans
  FOR UPDATE USING (user_id = auth.uid());

-- ── WARDROBE RLS POLICIES ───────────────────────────────────

CREATE POLICY "wardrobe_select_own" ON public.wardrobe
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "wardrobe_insert_own" ON public.wardrobe
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "wardrobe_delete_own" ON public.wardrobe
  FOR DELETE USING (user_id = auth.uid());

-- ── ANONYMOUS SCAN MIGRATION FUNCTION ───────────────────────

CREATE OR REPLACE FUNCTION public.migrate_anonymous_scans(
  p_posthog_id text,
  p_user_id    uuid
) RETURNS void AS $$
  UPDATE public.scans
  SET user_id = p_user_id
  WHERE posthog_distinct_id = p_posthog_id
    AND user_id IS NULL;
$$ LANGUAGE sql SECURITY DEFINER;
