-- ============================================================
-- CleanWear: Research Requests Migration
-- Logs unknown product queries so the team can prioritize
-- which brands/products to research and add to the database.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.research_requests (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  query               text NOT NULL,
  brand               text,
  request_count       integer NOT NULL DEFAULT 1,
  first_requested_at  timestamptz NOT NULL DEFAULT now(),
  last_requested_at   timestamptz NOT NULL DEFAULT now()
);

-- Unique index on normalized query so we can upsert by count
CREATE UNIQUE INDEX IF NOT EXISTS idx_research_requests_query
  ON public.research_requests (lower(query));

-- Index for team dashboard: sort by most-requested
CREATE INDEX IF NOT EXISTS idx_research_requests_count
  ON public.research_requests (request_count DESC);

-- No RLS needed — this table is write-only from the server function
-- (uses service role / anon insert). Team reads directly from Supabase dashboard.
ALTER TABLE public.research_requests ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts from the API function
CREATE POLICY "research_requests_insert" ON public.research_requests
  FOR INSERT WITH CHECK (true);

-- No public select — team reads via dashboard only
