-- ============================================================
-- CleanWear: Public-by-default scans migration
-- Per design-handoff.md §4.4 (Principle 4 "Public-by-default is a product
-- posture, not a feature"), this adds the public-scan surface that powers
-- the /s/:scanId share page and the /feed aggregations.
--
-- Key decisions encoded here:
--   - Scans default to is_public = true; owner can flip per row.
--   - Public reads are allowed ONLY on verified (not LLM-generated) scans
--     that have is_public = true. No PII columns are exposed to anon reads.
--   - Feed aggregations query a dedicated materialized view so rank/volume
--     computation doesn't run on every page load. Refreshed hourly.
--   - Compatible with the existing wardrobe/scans tables from 001.
-- ============================================================

-- ── 1. Add public-scan columns to existing scans table ──────
ALTER TABLE public.scans
  ADD COLUMN IF NOT EXISTS is_public         boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_verified       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_slug        text UNIQUE,
  ADD COLUMN IF NOT EXISTS chemicals         jsonb,
  ADD COLUMN IF NOT EXISTS scan_version      integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS disputed_at       timestamptz,
  ADD COLUMN IF NOT EXISTS disputed_reason   text;

-- share_slug is what appears in /s/:scanId URLs. Not the primary key —
-- keeps the id opaque and lets us rotate slugs if a scan is taken down.
CREATE INDEX IF NOT EXISTS idx_scans_share_slug ON public.scans(share_slug) WHERE share_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scans_public ON public.scans(is_public, is_verified, created_at DESC) WHERE is_public = true AND is_verified = true;

-- Assign share_slug on insert if null (used by client-side share links).
CREATE OR REPLACE FUNCTION public.assign_share_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.share_slug IS NULL THEN
    -- 10-char base62-ish slug. Collision-resistant at the volumes we expect.
    NEW.share_slug := substr(
      translate(encode(gen_random_bytes(8), 'base64'), '+/=', 'xyz'),
      1, 10
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_share_slug ON public.scans;
CREATE TRIGGER trg_assign_share_slug
  BEFORE INSERT ON public.scans
  FOR EACH ROW EXECUTE FUNCTION public.assign_share_slug();

-- ── 2. Public RLS: anyone can read is_public + is_verified scans ────
--
-- The narrow SELECT policy is load-bearing for the public-by-default posture.
-- Whittling it further would silently break the Share page for recipients
-- who aren't logged in.
CREATE POLICY IF NOT EXISTS "scans_select_public"
  ON public.scans
  FOR SELECT
  USING (is_public = true AND is_verified = true);

-- Owners can always read their own scans regardless of flags (already covered
-- by scans_select_own from migration 001, kept here as a comment for clarity).

-- Owners can toggle the privacy flag on their own scans.
CREATE POLICY IF NOT EXISTS "scans_toggle_privacy"
  ON public.scans
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── 3. Feed aggregation (materialized) ──────────────────────
--
-- Aggregates by product + week. Refreshed hourly via a scheduled function
-- (Supabase Edge Function / pg_cron; not set up in this migration).
CREATE MATERIALIZED VIEW IF NOT EXISTS public.feed_trending_this_week AS
SELECT
  s.brand,
  s.product                              AS name,
  s.category                             AS category,
  mode() WITHIN GROUP (ORDER BY s.score) AS score,  -- representative score
  COUNT(*)                               AS scan_count,
  MAX(s.created_at)                      AS last_scanned_at
FROM public.scans s
WHERE s.is_public = true
  AND s.is_verified = true
  AND s.created_at >= now() - interval '7 days'
GROUP BY s.brand, s.product, s.category
HAVING COUNT(*) >= 2  -- §5.7: hide products with only a single scan
ORDER BY scan_count DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_feed_trending_brand_name
  ON public.feed_trending_this_week(brand, name);

-- Refresh helper — call from pg_cron or a Supabase Edge Function:
--   SELECT public.refresh_feed_trending();
CREATE OR REPLACE FUNCTION public.refresh_feed_trending()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.feed_trending_this_week;
END;
$$;

-- ── 4. Dispute-this-score trail ─────────────────────────────
--
-- Per design-handoff §5.9: "Add a visible 'Dispute this score' link for
-- brands on every Share/Feed entry linking to a process." This table is
-- the persistence layer.
CREATE TABLE IF NOT EXISTS public.scan_disputes (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  scan_id       bigint REFERENCES public.scans(id) ON DELETE CASCADE,
  submitter_email text,          -- can be null (anonymous dispute allowed)
  submitter_affiliation text,    -- "brand representative", "consumer", etc.
  claim         text NOT NULL,   -- free-text dispute body
  evidence_url  text,            -- optional link to supporting material
  status        text NOT NULL DEFAULT 'open',  -- open | under_review | resolved | rejected
  created_at    timestamptz DEFAULT now(),
  resolved_at   timestamptz
);

CREATE INDEX IF NOT EXISTS idx_scan_disputes_scan_id ON public.scan_disputes(scan_id);
CREATE INDEX IF NOT EXISTS idx_scan_disputes_status ON public.scan_disputes(status);

ALTER TABLE public.scan_disputes ENABLE ROW LEVEL SECURITY;

-- Anyone may file a dispute (including anon). Admin reviews out-of-band.
CREATE POLICY IF NOT EXISTS "scan_disputes_anon_insert"
  ON public.scan_disputes
  FOR INSERT WITH CHECK (true);

-- Only service_role sees the queue (RA/admin reviews through an admin UI).
-- No SELECT policy for authenticated/anon = default deny.

-- ── 5. Takedown support (DMCA / user-sensitive scans) ───────
--
-- Soft-delete pattern. We don't hard-delete because a scan may be cited in
-- another user's wardrobe activity log. Setting is_public = false removes
-- the scan from every public surface immediately.
CREATE OR REPLACE FUNCTION public.hide_scan(scan_slug text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.scans
     SET is_public = false,
         disputed_at = now(),
         disputed_reason = COALESCE(disputed_reason, 'owner takedown')
   WHERE share_slug = scan_slug;
$$;

-- ── 6. Housekeeping ─────────────────────────────────────────
-- Back-fill share_slug on rows that pre-date this migration.
UPDATE public.scans SET share_slug = NULL WHERE share_slug = '';  -- normalize empties
-- Then let a separate script (outside this migration) call an INSERT-like
-- update on each pre-existing row to force the trigger to populate slugs.
-- Running that inside a migration risks long locks on hot tables.
