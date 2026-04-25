-- ============================================================
-- CleanWear: V3 Shadow Scoring Columns
-- Migration 003 — applied after V3 engine code is deployed.
--
-- These three nullable columns store V3 scores alongside the
-- existing V2 score. V2 remains the displayed score during the
-- parallel scoring period (methodology §I.3).
-- All columns nullable — existing rows keep NULL here.
--
-- DO NOT run until explicitly approved.
-- Apply via: Supabase Dashboard → SQL Editor, or MCP apply_migration.
-- ============================================================

ALTER TABLE public.scans
  ADD COLUMN IF NOT EXISTS score_v3           INTEGER,
  ADD COLUMN IF NOT EXISTS trace_v3           JSONB,
  ADD COLUMN IF NOT EXISTS confidence_tier_v3 INTEGER;

-- Index for divergence analysis queries during parallel period
CREATE INDEX IF NOT EXISTS idx_scans_score_v3
  ON public.scans(score_v3)
  WHERE score_v3 IS NOT NULL;

-- ============================================================
-- ROLLBACK (run to undo):
-- DROP INDEX  IF EXISTS idx_scans_score_v3;
-- ALTER TABLE public.scans DROP COLUMN IF EXISTS score_v3;
-- ALTER TABLE public.scans DROP COLUMN IF EXISTS trace_v3;
-- ALTER TABLE public.scans DROP COLUMN IF EXISTS confidence_tier_v3;
-- ============================================================
