// Vercel Serverless Function — /api/vision
// Accepts a camera frame (base64 image) and analyzes it with Claude Vision.
// Two modes: "tag" (read clothing label text) and "fabric" (identify material from texture)
// Returns same product data format as /api/scan for seamless frontend integration.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { image, mode } = req.body
  if (!image || !mode) {
    return res.status(400).json({ error: 'Missing image or mode' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' })
  }

  // Strip data URL prefix if present
  const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, '')

  const systemPrompt = mode === 'tag'
    ? TAG_SYSTEM_PROMPT
    : FABRIC_SYSTEM_PROMPT

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: base64Data },
            },
            {
              type: 'text',
              text: mode === 'tag'
                ? 'Read this clothing tag/label. Extract the brand, material composition (with percentages), care instructions, country of origin, and any certifications visible. Then analyze for chemical safety.'
                : 'Analyze this fabric photo. Based on the visible texture, sheen, weave pattern, and appearance, identify the most likely material composition. Then analyze for chemical safety.',
            },
          ],
        }],
      }),
    })

    if (!response.ok) {
      const errBody = await response.text()
      console.error('Vision API error:', response.status, errBody)
      return res.status(200).json({
        product_name: 'Unknown Garment',
        brand: 'Unknown Brand',
        category: 'Clothing',
        materials: [],
        chemicals: [],
        certifications: [],
        origin: 'Unknown',
        health_notes: 'Could not analyze image. Try taking a clearer photo with good lighting.',
        alternatives: [],
        _source: 'vision_error',
        _mode: mode,
      })
    }

    const data = await response.json()
    const textContent = data.content
      ?.filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')

    if (!textContent) {
      return res.status(200).json(buildVisionFallback(mode))
    }

    // Extract JSON from response
    const jsonMatch = textContent.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return res.status(200).json(buildVisionFallback(mode))
    }

    try {
      const pd = JSON.parse(jsonMatch[0].replace(/```json|```/g, '').trim())

      // Normalize fields
      pd.product_name = pd.product_name || 'Scanned Garment'
      pd.brand = pd.brand || 'Unknown Brand'
      pd.category = pd.category || 'Clothing'
      pd.materials = Array.isArray(pd.materials) ? pd.materials : []
      pd.chemicals = Array.isArray(pd.chemicals) ? pd.chemicals : []
      pd.certifications = Array.isArray(pd.certifications) ? pd.certifications : []
      pd.origin = pd.origin || 'Unknown'
      pd.health_notes = pd.health_notes || ''
      pd.alternatives = Array.isArray(pd.alternatives) ? pd.alternatives : []
      pd.materials = pd.materials.filter(m => m.name && typeof m.percentage === 'number')
      pd._source = `vision_${mode}`
      pd._mode = mode

      // Add confidence indicator for fabric mode
      if (mode === 'fabric') {
        pd.health_notes = (pd.health_notes || '') +
          ' Note: Material identification from photos is approximate. For highest accuracy, check the garment tag.'
      }

      return res.status(200).json(pd)
    } catch {
      return res.status(200).json(buildVisionFallback(mode))
    }
  } catch (err) {
    console.error('Vision error:', err)
    return res.status(200).json(buildVisionFallback(mode))
  }
}

function buildVisionFallback(mode) {
  return {
    product_name: 'Scanned Garment',
    brand: 'Unknown Brand',
    category: 'Clothing',
    materials: [{ name: 'Cotton', percentage: 60 }, { name: 'Polyester', percentage: 35 }, { name: 'Elastane', percentage: 5 }],
    chemicals: ['formaldehyde', 'antimony', 'microplastics', 'phthalates'],
    certifications: [],
    origin: 'Unknown',
    health_notes: mode === 'tag'
      ? 'Could not read tag clearly. Try holding the camera closer with good lighting, or enter the information manually.'
      : 'Could not identify fabric from photo. Try a closer, well-lit photo of the fabric texture, or use the Fabric Detective quiz.',
    alternatives: [
      { name: 'Organic Cotton Tee', brand: 'Patagonia', reason: 'GOTS certified organic cotton, minimal chemical treatments.' },
      { name: 'Merino Wool Base Layer', brand: 'Smartwool', reason: 'Natural fibers without synthetic chemical treatments.' },
    ],
    _source: 'vision_fallback',
    _mode: mode,
  }
}

// ========================================
// TAG OCR PROMPT — reads clothing labels
// ========================================
const TAG_SYSTEM_PROMPT = `You are a clothing tag reader and textile safety analyst. You will receive a photo of a clothing tag or label.

YOUR JOB:
1. Read ALL text visible on the tag — brand name, material composition with percentages, country of origin, care symbols, any certification logos
2. Analyze the materials for chemical safety risk
3. Return structured JSON

MATERIAL → CHEMICAL RULES (always apply based on what you read):
- Polyester → "antimony", "microplastics"
- Spandex/Elastane/Lycra → "phthalates"  
- Nylon → "microplastics"
- "Water repellent" or "waterproof" → "pfas"
- "Wrinkle free" or "non-iron" → "formaldehyde"
- Any synthetic blend for athletics → "bpa"
- Bright/neon colors on synthetics → "azo_dyes"

CERTIFICATION LOGOS to look for:
- OEKO-TEX (green/white checkmark logo) → "oeko-tex"
- GOTS (white shirt on green circle) → "gots"
- bluesign (blue dot pattern) → "bluesign"
- Fair Trade (black and green yin-yang style) → "fair_trade"

If you CANNOT read the tag clearly, still make your best attempt. Partial information is better than none.

Return ONLY this JSON:
{"product_name":"string","brand":"string","category":"string","materials":[{"name":"string","percentage":number}],"chemicals":["only from: bpa,pfas,formaldehyde,phthalates,azo_dyes,antimony,heavy_metals,microplastics"],"certifications":["only from: oeko-tex,gots,bluesign,fair_trade,cradle_to_cradle"],"origin":"string","health_notes":"string describing what you read from the tag and any safety concerns","alternatives":[{"name":"string","brand":"string","reason":"string"}]}

Always include 2-3 safer alternatives.`

// ========================================
// FABRIC CV PROMPT — identifies material from texture
// ========================================
const FABRIC_SYSTEM_PROMPT = `You are a textile material identification expert. You will receive a close-up photo of fabric/clothing material.

YOUR JOB:
1. Analyze the visible texture, sheen, weave pattern, drape, and surface characteristics
2. Identify the most likely material composition with estimated percentages
3. Analyze the identified materials for chemical safety risk
4. Return structured JSON

IDENTIFICATION GUIDE:
- POLYESTER: Slight sheen, smooth surface, doesn't wrinkle easily, synthetic look
- COTTON: Matte, soft appearance, visible fiber texture, natural look, wrinkles
- NYLON: Very smooth, slight shine, lightweight appearance, stretchy look
- LINEN: Visible coarse weave, natural texture, wrinkled appearance
- WOOL: Fuzzy surface, visible fibers, thick appearance
- SILK: High sheen, smooth, lightweight, flowing appearance
- SPANDEX BLEND: Visible stretch, body-conforming, smooth surface with stretch marks
- MESH/ATHLETIC: Open weave, synthetic sheen, designed for breathability

MATERIAL → CHEMICAL RULES:
- Polyester → "antimony", "microplastics"
- Spandex/Elastane/Lycra → "phthalates"
- Nylon → "microplastics"
- Any synthetic blend → "bpa" if athletic-looking
- Cotton (non-organic) → "formaldehyde"

CONFIDENCE: Be honest. If the photo is unclear or the material is ambiguous, say so in health_notes. Estimate your confidence level.

Return ONLY this JSON:
{"product_name":"string (describe the garment type, e.g. 'Athletic T-Shirt' or 'Casual Hoodie')","brand":"Unknown Brand","category":"string","materials":[{"name":"string","percentage":number}],"chemicals":["only from: bpa,pfas,formaldehyde,phthalates,azo_dyes,antimony,heavy_metals,microplastics"],"certifications":[],"origin":"Unknown","health_notes":"string - describe what you see in the fabric, your confidence level, and safety concerns","alternatives":[{"name":"string","brand":"string","reason":"string"}]}

Always include 2-3 safer alternatives.`
