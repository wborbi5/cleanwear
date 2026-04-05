// Vercel Serverless Function — /api/scan
// 5-LAYER LOOKUP: Supabase cache → UPC manufacturer lookup → Open Products Facts → brand-level fallback → keyword fallback
// Every scan result is cached in Supabase so the database grows with every user.

import { createClient } from '@supabase/supabase-js'

const supabase = (process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY)
  ? createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
  : null

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { query, isBarcode } = req.body
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({ error: 'Missing query' })
  }

  const q = query.trim()

  // ========================================
  // LAYER 1: Check Supabase product cache
  // ========================================
  if (supabase) {
    try {
      const cached = isBarcode
        ? await supabase.from('products').select('data').eq('barcode', q).maybeSingle()
        : await supabase.from('products').select('data').ilike('search_key', `%${q}%`).limit(1).maybeSingle()

      if (cached?.data?.data) {
        console.log('[scan] Cache hit:', q)
        return res.status(200).json({ ...cached.data.data, _source: 'cache' })
      }
    } catch (e) {
      console.warn('[scan] Cache lookup failed:', e.message)
    }
  }

  // ========================================
  // LAYER 2: UPC Manufacturer Lookup (barcodes only)
  // Queries multiple free UPC databases to resolve a barcode to a brand/product.
  // Even if we only get a brand name, we can surface a brand-level safety result.
  // ========================================
  let upcBrand = null
  let upcProductName = null
  let upcCategory = null
  let upcMaterials = []
  let upcSource = null

  if (isBarcode) {
    // 2a: UPC Items DB (free trial — 100 req/day, no key needed)
    try {
      const upcRes = await fetch(
        `https://api.upcitemdb.com/prod/trial/lookup?upc=${q}`,
        { headers: { 'Accept': 'application/json', 'User-Agent': 'CleanWear/1.0 (cleanwear.app)' } }
      )
      if (upcRes.ok) {
        const upcData = await upcRes.json()
        if (upcData?.items?.length > 0) {
          const item = upcData.items[0]
          upcBrand = item.brand || null
          upcProductName = item.title || null
          upcCategory = item.category || null
          upcSource = 'upc_items_db'
          console.log('[scan] UPC Items DB hit:', upcBrand, upcProductName)
        }
      }
    } catch (e) {
      console.warn('[scan] UPC Items DB failed:', e.message)
    }

    // 2b: Open Products Facts (clothing/textile products)
    if (!upcProductName) {
      try {
        const opfRes = await fetch(
          `https://world.openproductsfacts.org/api/v3/product/${q}.json`,
          { headers: { 'User-Agent': 'CleanWear/1.0 (cleanwear.app)' } }
        )
        if (opfRes.ok) {
          const opfData = await opfRes.json()
          if (opfData?.product?.product_name) {
            const parsed = parseOpenProductsFacts(opfData.product)
            const enriched = enrichWithChemicals(parsed)
            await cacheProduct(q, isBarcode, enriched)
            return res.status(200).json({ ...enriched, _source: 'open_products_facts' })
          }
          // Even if no product_name, try to extract brand
          if (!upcBrand && opfData?.product?.brands) {
            upcBrand = opfData.product.brands.split(',')[0].trim()
            upcSource = 'open_products_facts'
          }
        }
      } catch (e) {
        console.warn('[scan] Open Products Facts failed:', e.message)
      }
    }

    // 2c: Open Food Facts fallback (some clothing items end up here)
    if (!upcBrand && !upcProductName) {
      try {
        const offRes = await fetch(
          `https://world.openfoodfacts.org/api/v2/product/${q}.json`,
          { headers: { 'User-Agent': 'CleanWear/1.0 (cleanwear.app)' } }
        )
        if (offRes.ok) {
          const offData = await offRes.json()
          if (offData?.product?.brands) {
            upcBrand = offData.product.brands.split(',')[0].trim()
            upcProductName = offData.product.product_name || null
            upcSource = 'open_food_facts'
            console.log('[scan] Open Food Facts brand hit:', upcBrand)
          }
        }
      } catch (e) {
        console.warn('[scan] Open Food Facts failed:', e.message)
      }
    }
  }

  // ========================================
  // LAYER 3: If UPC resolved a full product, return it with chemical enrichment
  // ========================================
  if (upcProductName && upcBrand) {
    const category = inferCategory(upcProductName, upcCategory)
    const materials = inferMaterials(upcProductName, category)
    const result = {
      product_name: upcProductName,
      brand: upcBrand,
      category,
      materials,
      chemicals: [],
      certifications: [],
      origin: 'Unknown',
      health_notes: `Product identified via barcode lookup (${upcSource}). Chemical analysis based on inferred material composition.`,
      alternatives: [],
      _upc_source: upcSource,
    }
    const enriched = enrichWithChemicals(result)
    await cacheProduct(q, isBarcode, enriched)
    return res.status(200).json({ ...enriched, _source: upcSource })
  }

  // ========================================
  // LAYER 4: Brand-level fallback — we got a brand but no product details
  // Surface a brand-level result with a data gap flag so the client-side
  // scoring engine can still score it using brand safety data (NRDC, Good On You, etc.)
  // ========================================
  if (upcBrand) {
    const category = 'Casual' // conservative default
    const materials = inferMaterials(upcBrand, category)
    const result = {
      product_name: `${upcBrand} Product (UPC: ${q})`,
      brand: upcBrand,
      category,
      materials,
      chemicals: [],
      certifications: [],
      origin: 'Unknown',
      health_notes: `Brand identified via barcode (${upcSource}). Specific product not in database — showing brand-level safety assessment.`,
      alternatives: [],
      _upc_source: upcSource,
      _brand_level_only: true,  // flag for client to show data gap notice
    }
    const enriched = enrichWithChemicals(result)
    await cacheProduct(q, isBarcode, enriched)
    console.log('[scan] Brand-level result for UPC:', upcBrand)
    return res.status(200).json({ ...enriched, _source: 'upc_brand_only' })
  }

  // ========================================
  // LAYER 5: Keyword fallback (no barcode match at all)
  // ========================================
  const fb = buildFallback(query, isBarcode)
  await cacheProduct(q, isBarcode, fb)
  return res.status(200).json({ ...fb, _source: 'fallback' })
}

// ========================================
// OPEN PRODUCTS FACTS PARSER
// ========================================
function parseOpenProductsFacts(product) {
  const name = product.product_name || product.product_name_en || 'Unknown Product'
  const brand = product.brands || 'Unknown Brand'
  const categories = product.categories || product.categories_tags?.join(', ') || 'Clothing'

  const materialsRaw = product.materials_tags || product.labels_tags || []
  const materials = []
  const matMap = {
    'cotton': 'Cotton', 'polyester': 'Polyester', 'nylon': 'Nylon',
    'wool': 'Wool', 'silk': 'Silk', 'linen': 'Linen',
    'elastane': 'Elastane', 'spandex': 'Spandex', 'viscose': 'Viscose',
    'acrylic': 'Acrylic', 'hemp': 'Hemp', 'bamboo': 'Bamboo',
  }

  materialsRaw.forEach(tag => {
    const clean = tag.replace(/^[a-z]{2}:/, '').toLowerCase()
    if (matMap[clean]) materials.push({ name: matMap[clean], percentage: 100 })
  })

  if (materials.length > 1) {
    const share = Math.round(100 / materials.length)
    materials.forEach((m, i) => {
      m.percentage = i === 0 ? 100 - (share * (materials.length - 1)) : share
    })
  }

  const origin = product.origins || product.manufacturing_places || 'Unknown'
  const labels = (product.labels || '').toLowerCase()
  const certifications = []
  if (labels.includes('oeko-tex') || labels.includes('oekotex')) certifications.push('oeko-tex')
  if (labels.includes('gots')) certifications.push('gots')
  if (labels.includes('bluesign')) certifications.push('bluesign')
  if (labels.includes('fair trade') || labels.includes('fairtrade')) certifications.push('fair_trade')

  return {
    product_name: name,
    brand: brand.split(',')[0].trim(),
    category: categories.split(',')[0].trim(),
    materials,
    chemicals: [],
    certifications,
    origin,
    health_notes: 'Product data from Open Products Facts. Chemical analysis based on material composition.',
    alternatives: [
      { name: 'Organic Cotton Tee', brand: 'Patagonia', reason: 'GOTS certified organic cotton, minimal chemical treatments.' },
      { name: 'Merino Wool Base Layer', brand: 'Smartwool', reason: 'Natural fibers without synthetic chemical treatments.' },
      { name: 'Hemp Blend Tee', brand: 'prAna', reason: 'Hemp is naturally pest-resistant, minimal chemical processing.' },
    ],
  }
}

// ========================================
// CHEMICAL ENRICHMENT
// ========================================
function enrichWithChemicals(pd) {
  const chemicals = new Set()
  pd.materials.forEach(m => {
    const n = m.name.toLowerCase()
    if (n.includes('polyester')) { chemicals.add('antimony'); chemicals.add('microplastics'); chemicals.add('bpa') }
    if (n.includes('nylon')) { chemicals.add('microplastics'); chemicals.add('formaldehyde') }
    if (n.includes('spandex') || n.includes('elastane') || n.includes('lycra')) { chemicals.add('phthalates') }
    if (n.includes('acrylic')) { chemicals.add('microplastics') }
    if (n.includes('cotton') && !n.includes('organic')) { chemicals.add('formaldehyde') }
  })
  pd.certifications.forEach(c => {
    if (c === 'oeko-tex') { chemicals.delete('formaldehyde'); chemicals.delete('heavy_metals') }
    if (c === 'gots') { chemicals.delete('formaldehyde'); chemicals.delete('phthalates') }
    if (c === 'bluesign') { chemicals.delete('formaldehyde') }
  })
  pd.chemicals = [...chemicals]
  return pd
}

// ========================================
// CACHE WRITE
// ========================================
async function cacheProduct(query, isBarcode, productData) {
  if (!supabase) return
  try {
    const record = {
      barcode: isBarcode ? query : null,
      search_key: productData.product_name?.toLowerCase() || query.toLowerCase(),
      brand: productData.brand || null,
      product_name: productData.product_name || query,
      category: productData.category || null,
      data: productData,
      updated_at: new Date().toISOString(),
    }
    if (isBarcode && query) {
      await supabase.from('products').upsert(record, { onConflict: 'barcode' })
    } else {
      await supabase.from('products').upsert(record, { onConflict: 'search_key' })
    }
  } catch (e) {
    console.warn('[scan] Cache write failed:', e.message)
  }
}

// ========================================
// LAYER 4: KEYWORD FALLBACK
// ========================================
function buildFallback(query, isBarcode) {
  const q = query.toLowerCase()

  const hasPoly = /polyester|poly |dri-fit|dri fit|climalite|aeroready|heatgear|coolmax|moisture.?wicking/.test(q)
  const hasNylon = /nylon|supplex|tactel/.test(q)
  const hasSpandex = /spandex|elastane|lycra|stretch/.test(q)
  const hasCotton = /cotton|supima|pima/.test(q)
  const hasOrganic = /organic|gots|oeko/.test(q)
  const hasWool = /wool|merino|cashmere/.test(q)
  const hasLinen = /linen|flax/.test(q)
  const hasHemp = /hemp/.test(q)
  const hasSilk = /silk|satin/.test(q)
  const isAthletic = /nike|adidas|under armour|gymshark|lululemon|reebok|puma|2xu|gym|athletic|sport|workout|running|compression|dri-fit|legging|tight|shorts|jersey/.test(q)
  const isSafe = /patagonia|allbirds|pact|coyuchi|smartwool|icebreaker|prana/.test(q)
  const isFastFashion = /shein|temu|primark|fashion nova|boohoo|romwe|zaful/.test(q)

  const materials = []
  const chemicals = []

  if (hasOrganic && hasCotton) { materials.push({ name: 'Organic Cotton', percentage: 95 }, { name: 'Spandex', percentage: 5 }); chemicals.push('phthalates') }
  else if (hasWool) { materials.push({ name: 'Merino Wool', percentage: 100 }) }
  else if (hasLinen) { materials.push({ name: 'Linen', percentage: 100 }) }
  else if (hasHemp) { materials.push({ name: 'Hemp', percentage: 55 }, { name: 'Organic Cotton', percentage: 45 }) }
  else if (hasSilk) { materials.push({ name: 'Silk', percentage: 100 }) }
  else if (hasPoly && hasSpandex) { materials.push({ name: 'Polyester', percentage: 85 }, { name: 'Elastane', percentage: 15 }); chemicals.push('antimony', 'microplastics', 'phthalates', 'bpa') }
  else if (hasPoly) { materials.push({ name: 'Polyester', percentage: 100 }); chemicals.push('antimony', 'microplastics', 'bpa') }
  else if (hasNylon && hasSpandex) { materials.push({ name: 'Nylon', percentage: 82 }, { name: 'Elastane', percentage: 18 }); chemicals.push('microplastics', 'phthalates', 'formaldehyde') }
  else if (hasNylon) { materials.push({ name: 'Nylon', percentage: 100 }); chemicals.push('microplastics', 'formaldehyde') }
  else if (hasCotton && hasSpandex) { materials.push({ name: 'Cotton', percentage: 92 }, { name: 'Elastane', percentage: 8 }); chemicals.push('formaldehyde', 'phthalates') }
  else if (hasCotton) { materials.push({ name: 'Cotton', percentage: 100 }); chemicals.push('formaldehyde') }
  else if (isAthletic) { materials.push({ name: 'Polyester', percentage: 88 }, { name: 'Elastane', percentage: 12 }); chemicals.push('antimony', 'microplastics', 'phthalates', 'bpa') }
  else if (isFastFashion) { materials.push({ name: 'Polyester', percentage: 65 }, { name: 'Cotton', percentage: 30 }, { name: 'Elastane', percentage: 5 }); chemicals.push('antimony', 'microplastics', 'formaldehyde', 'phthalates', 'azo_dyes', 'heavy_metals') }
  else { materials.push({ name: 'Cotton', percentage: 60 }, { name: 'Polyester', percentage: 35 }, { name: 'Elastane', percentage: 5 }); chemicals.push('antimony', 'microplastics', 'formaldehyde', 'phthalates') }

  const brand = extractBrand(q) || 'Unknown Brand'
  const productName = isBarcode ? `Product (Barcode: ${query})` : query.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')

  return {
    product_name: productName, brand,
    category: isAthletic ? 'Athletic' : 'Casual',
    materials, chemicals,
    certifications: hasOrganic ? ['oeko-tex'] : [],
    origin: isSafe ? 'Vietnam' : isFastFashion ? 'China' : 'Unknown',
    health_notes: 'Analysis based on typical materials for this product type. Check your garment label for exact composition.',
    alternatives: [
      { name: 'Organic Cotton Tee', brand: 'Patagonia', reason: 'GOTS certified organic cotton, minimal chemical treatments, transparent supply chain.' },
      { name: 'Merino Wool Base Layer', brand: 'Smartwool', reason: 'Natural temperature regulation without synthetic chemicals.' },
      { name: 'Hemp Blend Tee', brand: 'prAna', reason: 'Hemp is naturally pest-resistant, requiring minimal pesticides and chemical processing.' },
    ],
  }
}

// ========================================
// CATEGORY INFERENCE FROM UPC PRODUCT DATA
// ========================================
function inferCategory(productName, upcCategory) {
  const p = (productName || '').toLowerCase()
  const c = (upcCategory || '').toLowerCase()

  if (/legging|tight|sports?\s*bra|gym|workout|athletic|running|compression|dri-?fit|heatgear|aero/i.test(p + ' ' + c)) return 'Athletic'
  if (/jacket|coat|puffer|rain|windbreaker|outerwear|vest|fleece|parka/i.test(p + ' ' + c)) return 'Outerwear'
  if (/pajama|sleep|lounge|nightgown|robe/i.test(p + ' ' + c)) return 'Sleepwear'
  if (/underwear|boxer|brief|bra(?!celet)|panty|pantie|thong|intimate/i.test(p + ' ' + c)) return 'Underwear'
  if (/kid|baby|infant|toddler|child|boy|girl|newborn|onesie/i.test(p + ' ' + c)) return 'Kids'
  if (/dress\s*shirt|formal|suit|blazer|non-?iron|wrinkle/i.test(p + ' ' + c)) return 'Formal'
  return 'Casual'
}

// ========================================
// MATERIAL INFERENCE FROM PRODUCT/BRAND NAME
// ========================================
function inferMaterials(text, category) {
  const t = (text || '').toLowerCase()
  const materials = []

  if (/organic\s*cotton/.test(t)) materials.push({ name: 'Organic Cotton', percentage: 95 }, { name: 'Spandex', percentage: 5 })
  else if (/merino|wool/.test(t)) materials.push({ name: 'Merino Wool', percentage: 100 })
  else if (/linen|flax/.test(t)) materials.push({ name: 'Linen', percentage: 100 })
  else if (/hemp/.test(t)) materials.push({ name: 'Hemp', percentage: 55 }, { name: 'Cotton', percentage: 45 })
  else if (/silk|satin/.test(t)) materials.push({ name: 'Silk', percentage: 100 })
  else if (/polyester|poly/.test(t) && /spandex|elastane|lycra/.test(t)) materials.push({ name: 'Polyester', percentage: 85 }, { name: 'Elastane', percentage: 15 })
  else if (/nylon/.test(t) && /spandex|elastane|lycra/.test(t)) materials.push({ name: 'Nylon', percentage: 82 }, { name: 'Elastane', percentage: 18 })
  else if (/polyester|poly/.test(t)) materials.push({ name: 'Polyester', percentage: 100 })
  else if (/nylon/.test(t)) materials.push({ name: 'Nylon', percentage: 100 })
  else if (/cotton/.test(t)) materials.push({ name: 'Cotton', percentage: 100 })

  // If we couldn't infer from text, fall back to category defaults
  if (materials.length === 0) {
    if (category === 'Athletic') materials.push({ name: 'Polyester', percentage: 88 }, { name: 'Elastane', percentage: 12 })
    else materials.push({ name: 'Cotton', percentage: 60 }, { name: 'Polyester', percentage: 35 }, { name: 'Elastane', percentage: 5 })
  }

  return materials
}

function extractBrand(q) {
  const brands = {
    'nike': 'Nike', 'adidas': 'Adidas', 'under armour': 'Under Armour', 'lululemon': 'Lululemon',
    'gymshark': 'Gymshark', 'patagonia': 'Patagonia', 'puma': 'Puma', 'reebok': 'Reebok',
    'h&m': 'H&M', 'zara': 'Zara', 'uniqlo': 'Uniqlo', 'gap': 'Gap', 'old navy': 'Old Navy',
    'calvin klein': 'Calvin Klein', 'hanes': 'Hanes', 'champion': 'Champion', 'allbirds': 'Allbirds',
    'pact': 'Pact', '2xu': '2XU', 'smartwool': 'Smartwool', 'north face': 'The North Face',
    "arc'teryx": "Arc'teryx", 'columbia': 'Columbia', "levi's": "Levi's", 'levis': "Levi's",
    'ralph lauren': 'Ralph Lauren', 'tommy hilfiger': 'Tommy Hilfiger',
    'amazon': 'Amazon Essentials', 'shein': 'Shein', 'fruit of the loom': 'Fruit of the Loom',
    'gildan': 'Gildan', 'carhartt': 'Carhartt', "victoria's secret": "Victoria's Secret",
    'target': 'Target', 'walmart': 'Walmart', 'costco': 'Kirkland', 'primark': 'Primark',
    'temu': 'Temu', 'fashion nova': 'Fashion Nova', 'boohoo': 'Boohoo',
    'brooks brothers': 'Brooks Brothers', 'j.crew': 'J.Crew', 'banana republic': 'Banana Republic',
    'american eagle': 'American Eagle', 'aerie': 'Aerie', 'abercrombie': 'Abercrombie & Fitch',
    'hollister': 'Hollister', 'new balance': 'New Balance', 'asics': 'ASICS',
    'on running': 'On Running', 'vuori': 'Vuori', 'alo yoga': 'Alo Yoga', 'fabletics': 'Fabletics',
    'athleta': 'Athleta', 'outdoor voices': 'Outdoor Voices',
  }
  for (const [key, name] of Object.entries(brands)) { if (q.includes(key)) return name }
  return null
}
