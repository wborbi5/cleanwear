import { createClient } from '@supabase/supabase-js'

// ============================================================
// SETUP REQUIRED in Supabase Dashboard:
// 1. Authentication > Providers > Email: Enable "magic link"
//    Disable "email + password" (magic link only)
// 2. Authentication > URL Configuration:
//    Site URL: https://cleanwear.vercel.app
//    Redirect URLs: https://cleanwear.vercel.app/auth/callback
// 3. Authentication > Email Templates:
//    Replace with the custom HTML template provided in
//    supabase/email-templates/magic-link.html
// ============================================================

// These are public keys — safe to expose in client code
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hevrtwfqwlqzwxyzgemv.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_qcwQk7Z_MFMP2paU-CvV9w_PsvCcnhM'

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

// Log every scan — includes PostHog distinct_id + user_id if authenticated
export async function logScan({ query, score, brand, product, category }) {
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
