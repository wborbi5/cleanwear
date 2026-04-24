-- ============================================================
-- CleanWear: Public-by-default scans migration
-- Per design-handoff.md §4.4 (Principle 4 "Public-by-default is a product
-- posture, not a feature"), this adds the public-scan surface that powers
-- the /s/:scanId share page and the /feed aggregations.
--
-- This is the as-applied, cleaned version. Applied to the production
-- Supabase project on 2026-04-24 across 5 MCP migrations
-- (public_scans_share_feed_disputes, harden_public_scan_functions,
--  restore_public_scan_functions, scan_disputes_anon_policy_explicit,
--  tighten_scans_rls_drop_readall). Consolidated here for clarity and
--  to keep the migrations folder reproducible.
--
-- Key decisions:
--   - Scans default to is_public = true; owner can flip per row.
--   - Anon reads require is_public AND is_verified. Nothing is verified
--     at launch, so /feed returns empty until verification pipeline ships.
--   - Functions pin search_path = '' and fully qualify every call
--     (extensions.gen_random_bytes, pg_catalog.substr) so they pass the
--     Supabase security advisor.
--   - DROPS the pre-existing "Anyone can read scans" policy which was
--     leaking every scan to anon. Replaced by scans_select_public.
-- ============================================================

-- 1. Add public-scan columns to the existing scans table
ALTER TABLE public.scans
  ADD COLUMN IF NOT EXISTS is_public        boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_verified      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_slug       text UNIQUE,
  ADD COLUMN IF NOT EXISTS chemicals        jsonb,
  ADD COLUMN IF NOT EXISTS scan_version     integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS disputed_at      timestamptz,
  ADD COLUMN IF NOT EXISTS disputed_reason  text;

CREATE INDEX IF NOT EXISTS idx_scans_share_slug
  ON public.scans(share_slug) WHERE share_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scans_public
  ON public.scans(is_public, is_verified, scanned_at DESC)
  WHERE is_public = true AND is_verified = true;

-- 2. Share-slug trigger. Every call is fully qualified so the function
--    runs safely with SET search_path = ''.
CREATE OR REPLACE FUNCTION public.assign_share_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $fn$
BEGIN
  IF NEW.share_slug IS NULL THEN
    NEW.share_slug := pg_catalog.substr(
      pg_catalog.translate(
        pg_catalog.encode(extensions.gen_random_bytes(8), 'base64'),
        '+/=', 'xyz'
      ),
      1, 10
    );
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_assign_share_slug ON public.scans;
CREATE TRIGGER trg_assign_share_slug
  BEFORE INSERT ON public.scans
  FOR EACH ROW EXECUTE FUNCTION public.assign_share_slug();

-- 3. RLS housekeeping on scans
--    a) drop the pre-existing "Anyone can read scans" read-all policy —
--       it was leaking every anon-created row to any anon reader.
--    b) add scans_select_public (is_public AND is_verified).
--    c) add scans_toggle_privacy so owners can flip their own is_public.
DROP POLICY IF EXISTS "Anyone can read scans" ON public.scans;
DROP POLICY IF EXISTS "Anyone can insert scans" ON public.scans;
-- scans_anon_insert, scans_select_own, scans_update_own already exist from 001.

DROP POLICY IF EXISTS "scans_select_public" ON public.scans;
CREATE POLICY "scans_select_public"
  ON public.scans
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true AND is_verified = true);

DROP POLICY IF EXISTS "scans_toggle_privacy" ON public.scans;
CREATE POLICY "scans_toggle_privacy"
  ON public.scans
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. Feed trending materialized view (§5.7: at least 2 scans per product)
DROP MATERIALIZED VIEW IF EXISTS public.feed_trending_this_week;
CREATE MATERIALIZED VIEW public.feed_trending_this_week AS
SELECT
  s.brand,
  s.product                              AS name,
  s.category                             AS category,
  mode() WITHIN GROUP (ORDER BY s.score) AS score,
  COUNT(*)                               AS scan_count,
  MAX(s.scanned_at)                      AS last_scanned_at
FROM public.scans s
WHERE s.is_public = true
  AND s.is_verified = true
  AND s.scanned_at >= now() - interval '7 days'
GROUP BY s.brand, s.product, s.category
HAVING COUNT(*) >= 2;

CREATE UNIQUE INDEX IF NOT EXISTS idx_feed_trending_brand_name
  ON public.feed_trending_this_week(brand, name);

GRANT SELECT ON public.feed_trending_this_week TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.refresh_feed_trending()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.feed_trending_this_week;
END;
$fn$;

-- 5. Dispute log
CREATE TABLE IF NOT EXISTS public.scan_disputes (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  scan_id         bigint REFERENCES public.scans(id) ON DELETE CASCADE,
  share_slug      text,
  submitter_email text,
  submitter_affiliation text,
  claim           text NOT NULL,
  evidence_url    text,
  status          text NOT NULL DEFAULT 'open',
  created_at      timestamptz DEFAULT now(),
  resolved_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_scan_disputes_scan_id  ON public.scan_disputes(scan_id);
CREATE INDEX IF NOT EXISTS idx_scan_disputes_status   ON public.scan_disputes(status);

ALTER TABLE public.scan_disputes ENABLE ROW LEVEL SECURITY;

-- Anyone may file a dispute. No SELECT policy = default deny, only
-- service_role can read the queue (for the admin moderation UI).
DROP POLICY IF EXISTS "scan_disputes_anon_insert" ON public.scan_disputes;
DROP POLICY IF EXISTS "scan_disputes_public_insert" ON public.scan_disputes;
CREATE POLICY "scan_disputes_anon_insert"
  ON public.scan_disputes
  AS PERMISSIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 6. Takedown soft-delete helper
CREATE OR REPLACE FUNCTION public.hide_scan(scan_slug text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $fn$
  UPDATE public.scans
     SET is_public = false,
         disputed_at = pg_catalog.now(),
         disputed_reason = COALESCE(disputed_reason, 'owner takedown')
   WHERE share_slug = scan_slug;
$fn$;

-- 7. Back-fill share_slug on pre-existing rows (one-shot; future inserts
--    populate via the trigger).
UPDATE public.scans
   SET share_slug = pg_catalog.substr(
         pg_catalog.translate(
           pg_catalog.encode(extensions.gen_random_bytes(8), 'base64'),
           '+/=', 'xyz'
         ), 1, 10)
 WHERE share_slug IS NULL;
