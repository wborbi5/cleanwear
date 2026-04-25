// ============================================================
// CleanWear V3 — Brand Registry (§E.3)
// Priority-ordered C2 signal lookup.
// Imports brand records from brandDatabase.js (read-only).
//
// Priority order (§E.3):
//  1. Product-level certification on the specific SKU
//  2. Brand-level certification (brand-wide, no "(select)" qualifier)
//  3. Independent third-party rating, published ≤ 5 years ago
//  4. Independent rating, published > 5 years ago (one confidence downgrade)
//  5. Multiple same-level signals → median; ties → conservative (lower)
// ============================================================

import { BRAND_BY_NAME } from "./brandDatabase.js";

const CURRENT_YEAR = 2026;

// §E.3 score tables
const NRDC_SCORES = {
  "A+": 90, "A": 82, "B": 68, "C": 52, "D": 38, "F": 28,
};

const GOY_SCORES = {
  "great": 82,
  "good": 70,
  "it's a start": 48,
  "not good enough": 35,
  "we avoid": 22,
};

const CERT_SCORES = {
  "gots": 80,
  "oeko-tex": 78,
  "oeko-tex standard 100": 78,
  "made safe": 78, // 15,000+ banned substances; ingredient-level hazard screening; comparable to OEKO-TEX
  "bluesign": 75,
  "grs": 75,  // Global Recycled Standard — treated equivalently per §B.2 note (v2.2)
  "cradle to cradle": 72, // Material Health category; tier-unspecified; design-phase hazard assessment
};

// ── "(select)" normalization ──────────────────────────────────
// A cert with "(select)" in the name is product-level only,
// not brand-wide. Returns false for brand-level priority-2 lookup.
function hasBrandwideCert(brand, certNameLower) {
  return (brand.certs || []).some(c => {
    const cl = c.toLowerCase();
    return cl.includes(certNameLower) && !cl.includes("(select)");
  });
}

// ── Priority 1: product-level certifications ─────────────────
function lookupPriority1(productCerts) {
  for (const cert of (productCerts || [])) {
    const cl = (typeof cert === "string" ? cert : "").toLowerCase().trim();
    // Must be explicit cert string, not a "(select)" brand qualifier
    if (cl.includes("(select)")) continue;
    for (const [name, score] of Object.entries(CERT_SCORES)) {
      if (cl.includes(name)) {
        return {
          score, source: cert, sourceUrl: certUrl(name),
          priority_level: 1, signal_key: `cert_${name}`,
        };
      }
    }
  }
  return null;
}

function certUrl(name) {
  if (name.includes("gots"))       return "https://global-standard.org";
  if (name.includes("oeko"))       return "https://www.oeko-tex.com/en/label-check";
  if (name.includes("bluesign"))   return "https://www.bluesign.com";
  if (name.includes("grs"))        return "https://textileexchange.org/grs";
  if (name.includes("made safe"))  return "https://madesafe.org";
  if (name.includes("cradle"))     return "https://c2ccertified.org";
  return null;
}

// ── Priority 2: brand-level certifications ────────────────────
function lookupPriority2(brand) {
  if (hasBrandwideCert(brand, "gots")) {
    return { score: CERT_SCORES["gots"], source: "GOTS (brand-level)", sourceUrl: "https://global-standard.org", priority_level: 2, signal_key: "brand_gots" };
  }
  if (hasBrandwideCert(brand, "bluesign")) {
    return { score: CERT_SCORES["bluesign"], source: "bluesign (brand-level)", sourceUrl: "https://www.bluesign.com", priority_level: 2, signal_key: "brand_bluesign" };
  }
  if (hasBrandwideCert(brand, "oeko-tex") || hasBrandwideCert(brand, "oeko-tex standard 100")) {
    return { score: CERT_SCORES["oeko-tex"], source: "OEKO-TEX (brand-level)", sourceUrl: "https://www.oeko-tex.com/en/label-check", priority_level: 2, signal_key: "brand_oekotex" };
  }
  if (hasBrandwideCert(brand, "grs")) {
    return { score: CERT_SCORES["grs"], source: "GRS (Global Recycled Standard, brand-level)", sourceUrl: "https://textileexchange.org/grs", priority_level: 2, signal_key: "brand_grs" };
  }
  // MADE SAFE: 15,000+ substance screen; comparable to OEKO-TEX for chemical safety purposes
  if (hasBrandwideCert(brand, "made safe")) {
    return { score: CERT_SCORES["made safe"], source: "MADE SAFE (brand-level)", sourceUrl: "https://madesafe.org", priority_level: 2, signal_key: "brand_made_safe" };
  }
  // Cradle to Cradle: Material Health category covers 21 human/environmental endpoints
  // Score is tier-unspecified (Bronze=low, Platinum=very high); 72 is conservative
  if (hasBrandwideCert(brand, "cradle to cradle") || hasBrandwideCert(brand, "c2c")) {
    return { score: CERT_SCORES["cradle to cradle"], source: "Cradle to Cradle (brand-level)", sourceUrl: "https://c2ccertified.org", priority_level: 2, signal_key: "brand_c2c" };
  }
  // NOTE: Fair Trade, B Corp, ZQ Merino do NOT produce C2 priority-2 signals.
  // They contribute to the cert bonus in C1 (+8 per cert, capped at +20) but their
  // scope is labor/ethics/traceability, not finished-product chemical safety.
  // See implementation-notes/cert_c2_research.md for rationale.
  return null;
}

// ── Priority 3 + 4: independent third-party ratings ──────────
function lookupIndependentRatings(brand) {
  const signals = [];

  if (brand.nrdc_pfas_rating && NRDC_SCORES[brand.nrdc_pfas_rating] !== undefined) {
    const year = brand.nrdc_year || 2022;  // NRDC scorecard published April 2022 ('Going Out of Fashion')
    const age = CURRENT_YEAR - year;
    signals.push({
      score: NRDC_SCORES[brand.nrdc_pfas_rating],
      source: `NRDC PFAS Brand Scorecard ${year} ('Going Out of Fashion')`,  // April 2022 edition
      sourceUrl: "https://www.nrdc.org/press-releases/new-pfas-scorecard-popular-apparel-brands-levi-strauss-earns-outdoor-brands-fail",
      priority_level: age <= 5 ? 3 : 4,
      signal_key: `nrdc_${brand.nrdc_pfas_rating}`,
      age,
    });
  }

  if (brand.good_on_you_rating && GOY_SCORES[brand.good_on_you_rating] !== undefined) {
    const year = brand.goy_year || 2024;
    const age = CURRENT_YEAR - year;
    signals.push({
      score: GOY_SCORES[brand.good_on_you_rating],
      source: `Good On You ${year}`,
      sourceUrl: "https://goodonyou.eco",
      priority_level: age <= 5 ? 3 : 4,
      signal_key: `goy_${brand.good_on_you_rating.replace(/\s+/g,"_")}`,
      age,
    });
  }

  if (signals.length === 0) return null;

  // Sort: lowest priority_level first, then most recent (lowest age), then conservative
  // (lowest score). §E.3 example: "If NRDC 2022 and Good On You 2024 both exist, use GoY"
  // — recency wins within the same priority tier; exact ties use the conservative score.
  signals.sort((a, b) =>
    a.priority_level - b.priority_level ||
    a.age - b.age ||
    a.score - b.score
  );

  // signals[0] is now the best: highest priority, most recent, then most conservative.
  // The "median" language in §E.3 §5 was intended for unresolvable multi-signal ties;
  // in practice age+score sort resolves before we need a median.
  return signals[0];
}


// ── Extended brand registry for newProducts.json brands ──────
// These brands are not in brandDatabase.js. Added in v2.2 pass
// after brand_registry_research.md was verified.
// Data shape mirrors the brandDatabase.js brand object subset
// that lookupBrandC2 needs: certs, nrdc_pfas_rating, nrdc_year,
// good_on_you_rating, goy_year, tier.
const NEW_BRAND_DATA = {
  // ── Clean entries (no flags) ──
  anthropologie:      { certs: [], nrdc_pfas_rating: null, good_on_you_rating: "not good enough", goy_year: 2026, tier: "high_risk" },
  arc_teryx:          { certs: ["bluesign"], nrdc_pfas_rating: null, good_on_you_rating: "it's a start", goy_year: 2026, tier: "moderate" },
  bombas:             { certs: [], nrdc_pfas_rating: null, good_on_you_rating: "not good enough", goy_year: 2023, tier: "high_risk" },
  club_monaco:        { certs: [], nrdc_pfas_rating: null, good_on_you_rating: "we avoid",         goy_year: 2025, tier: "high_risk" },
  cuyana:             { certs: [], nrdc_pfas_rating: null, good_on_you_rating: "it's a start",     goy_year: 2025, tier: "moderate" },
  express:            { certs: [], nrdc_pfas_rating: null, good_on_you_rating: "we avoid",         goy_year: 2024, tier: "high_risk" },
  free_people:        { certs: [], nrdc_pfas_rating: null, good_on_you_rating: "not good enough",  goy_year: 2026, tier: "high_risk" },
  hurley:             { certs: [], nrdc_pfas_rating: null, good_on_you_rating: "we avoid",         goy_year: 2024, tier: "high_risk" },
  l_l_bean:           { certs: ["bluesign"], nrdc_pfas_rating: "D", nrdc_year: 2022, good_on_you_rating: "not good enough", goy_year: 2026, tier: "moderate" },
  mango:              { certs: [], nrdc_pfas_rating: null, good_on_you_rating: "it's a start",     goy_year: 2025, tier: "moderate" },
  massimo_dutti:      { certs: [], nrdc_pfas_rating: null, good_on_you_rating: "it's a start",     goy_year: 2026, tier: "moderate" },
  mizuno:             { certs: [], nrdc_pfas_rating: null, good_on_you_rating: "not good enough",  goy_year: 2025, tier: "high_risk" },
  o_neill:            { certs: [], nrdc_pfas_rating: null, good_on_you_rating: "not good enough",  goy_year: 2021, tier: "high_risk" },
  outdoor_voices:     { certs: [], nrdc_pfas_rating: null, good_on_you_rating: "not good enough",  goy_year: 2022, tier: "high_risk" },
  prettylittlething:  { certs: [], nrdc_pfas_rating: null, good_on_you_rating: "not good enough",  goy_year: 2022, tier: "high_risk" },
  public_rec:         null,  // no data found on any source
  quiksilver:         { certs: [], nrdc_pfas_rating: null, good_on_you_rating: "not good enough",  goy_year: 2025, tier: "high_risk" },
  rei_co_op:          { certs: ["bluesign"], nrdc_pfas_rating: "F", nrdc_year: 2022, good_on_you_rating: "not good enough", goy_year: 2026, tier: "high_risk" },
  rhone:              { certs: [], nrdc_pfas_rating: null, good_on_you_rating: "not good enough",  goy_year: 2025, tier: "high_risk" },
  rip_curl:           { certs: [], nrdc_pfas_rating: null, good_on_you_rating: "it's a start",     goy_year: 2024, tier: "moderate" },
  salomon:            { certs: ["bluesign"], nrdc_pfas_rating: null, good_on_you_rating: "it's a start", goy_year: 2025, tier: "moderate" },
  saucony:            { certs: [], nrdc_pfas_rating: null, good_on_you_rating: "not good enough",  goy_year: 2026, tier: "high_risk" },
  stance:             { certs: [], nrdc_pfas_rating: null, good_on_you_rating: "we avoid",         goy_year: 2024, tier: "high_risk" },
  toad_co:            { certs: ["bluesign", "GOTS", "OEKO-TEX Standard 100"], nrdc_pfas_rating: null, good_on_you_rating: "good", goy_year: 2025, tier: "safe" },
  tyr:                null,  // no data found on any source
  urban_outfitters:   { certs: [], nrdc_pfas_rating: null, good_on_you_rating: "not good enough",  goy_year: 2025, tier: "high_risk" },
  wrangler:           { certs: [], nrdc_pfas_rating: null, good_on_you_rating: "it's a start",     goy_year: 2026, tier: "moderate" },

  // ── Flagged entries — resolved with judgment call ──
  // Altra: GOY Good; VF Corp NRDC D NOT inherited (ownership transition)
  altra:              { certs: [], nrdc_pfas_rating: null, good_on_you_rating: "good",             goy_year: 2024, tier: "safe" },
  // Billabong: GOY Not Good Enough; claimed bluesign/GOTS/OEKO-TEX NOT imported (unverified on registries)
  billabong:          { certs: [], nrdc_pfas_rating: null, good_on_you_rating: "not good enough",  goy_year: 2023, tier: "high_risk" },
  // Cotopaxi: GOY It's a Start; product-level bluesign NOT brand-level — no cert flags
  cotopaxi:           { certs: [], nrdc_pfas_rating: null, good_on_you_rating: "it's a start",     goy_year: 2026, tier: "moderate" },
  // Dickies: GOY Good; Bluestar Alliance owner post-2024; VF Corp NRDC D NOT applied
  dickies:            { certs: [], nrdc_pfas_rating: null, good_on_you_rating: "good",             goy_year: 2024, tier: "safe" },
  // Eddie Bauer: GOY Not Good Enough; post-ABG bluesign unconfirmed — no cert imported
  eddie_bauer:        { certs: [], nrdc_pfas_rating: null, good_on_you_rating: "not good enough",  goy_year: 2024, tier: "high_risk" },
  // Hoka: GOY It's a Start; Deckers PFAS leader but exact NRDC grade unconfirmed — no NRDC imported
  hoka:               { certs: [], nrdc_pfas_rating: null, good_on_you_rating: "it's a start",     goy_year: 2025, tier: "moderate" },
  // Merrell: GOY Not Good Enough; NRDC F via parent Wolverine; Merrell FW2024 PFAS commitment noted
  merrell:            { certs: [], nrdc_pfas_rating: "F", nrdc_year: 2022, good_on_you_rating: "not good enough", goy_year: 2024, tier: "high_risk" },
  // Naadam: GOY Not Good Enough; GRS confirmed for recycled cashmere line
  naadam:             { certs: ["GRS"], nrdc_pfas_rating: null, good_on_you_rating: "not good enough", goy_year: 2024, tier: "high_risk" },
  // Outerknown: GOY Good; bluesign confirmed; GOTS NOT imported (factory-level only, not brand registration)
  outerknown:         { certs: ["bluesign"], nrdc_pfas_rating: null, good_on_you_rating: "good",   goy_year: 2024, tier: "safe" },
  // Quince: GOY Not Good Enough; OEKO-TEX product claims not verified on registry — no cert imported
  quince:             { certs: [], nrdc_pfas_rating: null, good_on_you_rating: "not good enough",  goy_year: 2023, tier: "high_risk" },
  // Taylor Stitch: GOY It's a Start; GOTS at factory-level only — no cert imported
  taylor_stitch:      { certs: [], nrdc_pfas_rating: null, good_on_you_rating: "it's a start",     goy_year: 2023, tier: "moderate" },
  // United By Blue: GOY Good; all certs at mfr partner level only — no brand-level cert flags
  united_by_blue:     { certs: [], nrdc_pfas_rating: null, good_on_you_rating: "good",             goy_year: 2023, tier: "safe" },
};

// Normalize brand ID for NEW_BRAND_DATA lookup
function normalizeNewBrandId(brandId) {
  return (brandId || "").toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

/**
 * Look up C2 brand safety signal for a given brand, applying §E.3 priority order.
 *
 * @param {string} brandId — lowercase brand id (e.g. "lululemon")
 * @param {string[]} productCerts — certifications on the specific product being scored
 * @param {object} [brandOverride] — optional: pass a pre-fetched brand object (used by tests)
 * @returns {{ score, source, sourceUrl, priority_level, signal_key } | null}
 */
export function lookupBrandC2(brandId, productCerts, brandOverride) {
  // Priority 1: product-level certs take precedence over everything
  const p1 = lookupPriority1(productCerts);
  if (p1) return p1;

  // Check brandDatabase.js first, then NEW_BRAND_DATA for extended brands
  const normalizedId = normalizeNewBrandId(brandId);
  const brand = brandOverride
    || BRAND_BY_NAME[(brandId || "").toLowerCase().trim()]
    || (NEW_BRAND_DATA[normalizedId] !== undefined ? NEW_BRAND_DATA[normalizedId] : undefined);
  if (!brand) return null;

  // Priority 2: brand-wide certs
  const p2 = lookupPriority2(brand);
  if (p2) return p2;

  // Priority 3/4: independent ratings
  return lookupIndependentRatings(brand);
}

// Confidence downgrade flag — caller in scoreV3 checks if signal.priority_level === 4
// and applies one tier downgrade to overall confidence.
export const STALE_SIGNAL_PRIORITY = 4;
