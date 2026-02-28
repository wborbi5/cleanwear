import { createClient } from '@supabase/supabase-js'

// These are public keys — safe to expose in client code
// Replace with your actual Supabase project values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hevrtwfqwlqzwxyzgemv.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_qcwQk7Z_MFMP2paU-CvV9w_PsvCcnhM'

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

// Log every scan — no auth required
export async function logScan({ query, score, brand, product, category }) {
  if (!supabase) return
  try {
    await supabase.from('scans').insert({
      query,
      score,
      brand,
      product,
      category,
      scanned_at: new Date().toISOString(),
    })
  } catch (e) {
    console.warn('Scan log failed:', e)
  }
}
