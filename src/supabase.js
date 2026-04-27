import { createClient } from '@supabase/supabase-js'

// ============================================================
// SETUP REQUIRED in Supabase Dashboard (Authentication > URL Configuration):
//   Site URL: https://cleanwear.org
//   Redirect URLs (allowlist) — add ALL of these:
//     https://cleanwear.org/auth/callback
//     https://cleanwear-app.vercel.app/auth/callback
//     http://localhost:5173/auth/callback
// Email Templates > Magic Link uses {{ .Token }} for the 6-digit OTP code.
// (No clickable link — defeats Microsoft Safe Links / Defender prefetch.)
// ============================================================

// These are public keys — safe to expose in client code
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hevrtwfqwlqzwxyzgemv.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_qcwQk7Z_MFMP2paU-CvV9w_PsvCcnhM'

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        // Implicit flow — generates a verifiable 6-digit OTP token that
        // verifyOtp({ type: 'email' }) can validate directly. PKCE flow
        // would hash the token (pkce_<hash> in auth.one_time_tokens) and
        // expect URL exchange via exchangeCodeForSession, which breaks
        // our code-input UI. We're not using clickable magic links
        // anyway (email scanners pre-fetch them and consume the token),
        // so the PKCE-vs-implicit security tradeoff doesn't apply here.
        flowType: 'implicit',
        detectSessionInUrl: true,
        autoRefreshToken: true,
        persistSession: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    })
  : null

// Log every scan — includes PostHog distinct_id + user_id if authenticated
export async function logScan({ query, score, brand, product, category,
                                score_v3 = null, trace_v3 = null, confidence_tier_v3 = null }) {
  if (!supabase) return
  try {
    const ph = window.posthog
    const { data: { session } } = await supabase.auth.getSession()
    await supabase.from('scans').insert({
      query,
      score,
      brand,
      product,
      category,
      posthog_distinct_id: ph?.get_distinct_id() || null,
      user_id: session?.user?.id || null,
      scanned_at: new Date().toISOString(),
      // V3 shadow fields — nullable; null if V3 engine returned no result (§I.3)
      score_v3:           score_v3 ?? null,
      trace_v3:           trace_v3 ?? null,
      confidence_tier_v3: confidence_tier_v3 ?? null,
    })
  } catch (e) {
    console.warn('Scan log failed:', e)
  }
}

// ============================================================
// WARDROBE — Supabase-backed for auth users, localStorage fallback
// ============================================================

export async function addToWardrobe(item) {
  if (!supabase) return { error: 'Supabase not configured' }
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return { error: 'Not authenticated' }

    const { error } = await supabase.from('wardrobe').insert({
      user_id: session.user.id,
      product_name: item.name,
      brand: item.brand || null,
      score: item.score || null,
      category: item.category || null,
      scan_data: item,
    })
    return { error }
  } catch (e) {
    console.warn('Add to wardrobe failed:', e)
    return { error: e.message }
  }
}

export async function fetchWardrobe() {
  if (!supabase) return { data: [], error: 'Supabase not configured' }
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return { data: [], error: 'Not authenticated' }

    const { data, error } = await supabase
      .from('wardrobe')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
    return { data: data || [], error }
  } catch (e) {
    console.warn('Fetch wardrobe failed:', e)
    return { data: [], error: e.message }
  }
}

export async function removeFromWardrobe(id) {
  if (!supabase) return { error: 'Supabase not configured' }
  try {
    const { error } = await supabase.from('wardrobe').delete().eq('id', id)
    return { error }
  } catch (e) {
    console.warn('Remove from wardrobe failed:', e)
    return { error: e.message }
  }
}

// ============================================================
// PUBLIC FEED + SHARE SCANS (migration 002_public_scans)
// ============================================================

// Fetch the weekly trending feed. Reads from the materialized view so
// ranking is cheap on the read path. Refreshed hourly by pg_cron/Edge fn.
export async function fetchFeedTrending({ limit = 25 } = {}) {
  if (!supabase) return { data: [], error: 'Supabase not configured' }
  try {
    const { data, error } = await supabase
      .from('feed_trending_this_week')
      .select('brand, name, category, score, scan_count')
      .order('scan_count', { ascending: false })
      .limit(limit)
    return { data: data || [], error }
  } catch (e) {
    console.warn('Feed fetch failed:', e)
    return { data: [], error: e.message }
  }
}

// Fetch a single public scan by share_slug. Used on /s/:slug — RLS on
// the scans table gates visibility to is_public AND is_verified rows.
export async function fetchScanBySlug(slug) {
  if (!supabase) return { data: null, error: 'Supabase not configured' }
  try {
    const { data, error } = await supabase
      .from('scans')
      .select('id, brand, product, category, score, chemicals, scanned_at, share_slug, is_public, is_verified')
      .eq('share_slug', slug)
      .maybeSingle()
    return { data, error }
  } catch (e) {
    console.warn('Scan fetch failed:', e)
    return { data: null, error: e.message }
  }
}

// File a score dispute — anonymous inserts allowed per migration 002.
export async function submitScanDispute({ shareSlug, scanId, email, affiliation, claim, evidenceUrl }) {
  if (!supabase) return { error: 'Supabase not configured' }
  try {
    const { error } = await supabase.from('scan_disputes').insert({
      scan_id: scanId || null,
      share_slug: shareSlug || null,
      submitter_email: email || null,
      submitter_affiliation: affiliation || null,
      claim,
      evidence_url: evidenceUrl || null,
    })
    return { error }
  } catch (e) {
    console.warn('Dispute submit failed:', e)
    return { error: e.message }
  }
}
