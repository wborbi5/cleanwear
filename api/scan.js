// Vercel Serverless Function — /api/scan
// Your ANTHROPIC_API_KEY is set as an environment variable in Vercel dashboard

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { query, isBarcode } = req.body

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({ error: 'Missing query' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' })
  }

  const systemPrompt = `You are a textile safety researcher. When given a clothing product, research it and return ONLY valid JSON. Return: {"product_name":"string","brand":"string","category":"string","materials":[{"name":"string","percentage":number}],"chemicals":["bpa","pfas","formaldehyde","phthalates","azo_dyes","antimony","heavy_metals","microplastics"],"certifications":["oeko-tex","gots","bluesign","fair_trade","cradle_to_cradle"],"origin":"string","health_notes":"string","alternatives":[{"name":"string","brand":"string","reason":"string"}]}
Rules: polyester=always antimony+microplastics. spandex/elastane=phthalates. waterproof=pfas. wrinkle-free cotton=formaldehyde. bright synthetics=azo_dyes. Always 2-3 safer alternatives.`

  const userMessage = isBarcode
    ? `Research clothing barcode/UPC: ${query}`
    : `Research clothing product: ${query}`

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
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Anthropic API error:', response.status, errText)
      return res.status(502).json({ error: 'AI service error' })
    }

    const data = await response.json()
    const textContent = data.content
      ?.filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')

    if (!textContent) {
      return res.status(502).json({ error: 'No response from AI' })
    }

    const jsonMatch = textContent.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return res.status(502).json({ error: 'Could not parse response' })
    }

    const productData = JSON.parse(
      jsonMatch[0].replace(/```json|```/g, '').trim()
    )

    return res.status(200).json(productData)
  } catch (err) {
    console.error('Scan error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
