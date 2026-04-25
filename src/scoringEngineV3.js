// ============================================================
// CleanWear Scoring Engine V3
// Per methodology/cleanwear_scoring_methodology_v2.2.md
//
// This engine runs in SHADOW MODE during the parallel scoring
// period (§I.3). V2 remains the displayed score. V3 is logged
// to score_v3 / trace_v3 in the scans table.
//
// Do NOT flip displayed score without completing cutover
// prerequisites (methodology §6 rollout staging).
// ============================================================

import {
  ruleD1_PFAS, ruleD2_Formaldehyde, ruleD3_Phthalates,
  ruleD4_BPA, ruleD5_Antimony, ruleD6_Microplastics,
  ruleD7_AzoDyes, ruleD8_HeavyMetals, ruleD9_Organotins,
  ruleD10_NPEs, ruleD11_FlameRetardants, ruleD12_Biocides,
} from "./scoringRulesV3.js";

import { resolveBenchmark } from "./categoryBenchmarksV3.js";
import { lookupBrandC2, STALE_SIGNAL_PRIORITY } from "./brandRegistryV3.js";

// ── Penalty table (§E.2) ─────────────────────────────────────
const PENALTY = {
  HIGH:         { high: 25, medium: 15, low: 0 },
  MODERATE:     { high: 15, medium: 10, low: 0 },
  LOW_MODERATE: { high:  8, medium:  5, low: 0 },
};

// §C — severity classifications
const CHEMICAL_SEVERITY = {
  pfas:                "HIGH",
  formaldehyde:        "HIGH",
  azo_dyes:            "HIGH",
  flame_retardants:    "HIGH",
  phthalates:          "MODERATE",
  bpa:                 "MODERATE",
  antimony:            "MODERATE",
  heavy_metals:        "MODERATE",
  organotins:          "MODERATE",
  npes:                "MODERATE",
  microplastics:       "LOW_MODERATE",
  antimicrobial_biocides: "LOW_MODERATE",
};

const CONF_RANK = { high: 3, medium: 2, low: 1, null: 0 };

// ── Material string parser (§B inline, from productDatabase logic) ──
function parseMaterialsString(matStr) {
  if (!matStr || typeof matStr !== "string") return [{ name: "Unknown", percentage: 100 }];
  const parts = matStr.split(",").map(s => s.trim()).filter(Boolean);
  const count = parts.length;
  if (count === 1) return [{ name: parts[0], percentage: 100 }];
  if (count === 2) return [{ name: parts[0], percentage: 80 }, { name: parts[1], percentage: 20 }];
  if (count === 3) return [
    { name: parts[0], percentage: 60 },
    { name: parts[1], percentage: 25 },
    { name: parts[2], percentage: 15 },
  ];
  const each = Math.floor(100 / count);
  return parts.map((p, i) => ({
    name: p,
    percentage: i === 0 ? 100 - each * (count - 1) : each,
  }));
}

// DWR + wrinkle keywords for finish_claim inference from raw product text
const INFER_CLAIMS = [
  { value: "water-resistant",  re: /water.?resistant|water.?repel/i },
  { value: "waterproof",       re: /\bwaterproof\b/i },
  { value: "dwr",              re: /\bdwr\b/i },
  { value: "gore-tex",         re: /gore.?tex/i },
  { value: "outdry",           re: /\boutdry\b/i },
  { value: "h2no",             re: /\bh2no\b/i },
  { value: "event",            re: /\bevent\b/i },
  { value: "stain-resistant",  re: /stain.?resistant/i },
  { value: "wrinkle-free",     re: /wrinkle.?free|wrinkle.?resistant/i },
  { value: "non-iron",         re: /non.?iron/i },
  { value: "easy-care",        re: /easy.?care/i },
  { value: "crease-resistant", re: /crease.?resistant/i },
  { value: "antimicrobial",    re: /antimicrobial|anti.?microbial/i },
  { value: "anti-odor",        re: /anti.?odor/i },
  { value: "silver",           re: /\bsilver\b/i },
  { value: "heiq",             re: /\bheiq\b/i },
  { value: "polygiene",        re: /polygiene/i },
  { value: "x-static",         re: /x.?static/i },
  { value: "moisture-wicking", re: /moisture.?wicking|sweat.?wicking/i },
  { value: "flame-resistant",  re: /flame.?resistant/i },
];

/**
 * Normalize a raw scan API product into V3 schema (§B).
 * Infers finish_claims from product_name and health_notes at "inferred" confidence.
 */
function normalizeProduct(raw) {
  // Materials
  let materials = raw.materials;
  if (typeof materials === "string") {
    materials = parseMaterialsString(materials);
  } else if (Array.isArray(materials)) {
    materials = materials.map(m =>
      typeof m === "string" ? { name: m, percentage: 100 } : m
    );
  } else {
    materials = [];
  }

  // Certifications — normalize to string array
  const certifications = (raw.certifications || []).map(c =>
    typeof c === "string" ? c : (c.name || "")
  );

  // Finish claims — infer from text fields
  const textToSearch = [
    raw.product_name || "",
    raw.health_notes || "",
  ].join(" ");

  const finish_claims = [];
  for (const { value, re } of INFER_CLAIMS) {
    if (re.test(textToSearch)) {
      finish_claims.push({ value, confidence: "inferred" });
    }
  }
  // Merge any existing finish_claims from raw (already structured)
  if (Array.isArray(raw.finish_claims)) {
    raw.finish_claims.forEach(fc => {
      if (!finish_claims.some(x => x.value === fc.value)) {
        finish_claims.push(fc);
      }
    });
  }

  return {
    product_id:    raw.product_id || null,
    brand_id:      (raw.brand || "").toLowerCase().trim(),
    category:      raw.category || "Unknown",
    subcategory:   raw.subcategory || null,
    materials,
    finish_claims,
    certifications,
    origin_country: raw.origin || null,
  };
}

// ── computeC1 ────────────────────────────────────────────────

export function computeC1(product, brandSafetyTier, brandHasZDHC) {
  const ruleResults = [
    ruleD1_PFAS(product),
    ruleD2_Formaldehyde(product),
    ruleD3_Phthalates(product),
    ruleD4_BPA(product),
    ruleD5_Antimony(product),
    ruleD6_Microplastics(product),
    ruleD7_AzoDyes(product),
    ruleD8_HeavyMetals(product, brandSafetyTier),
    ruleD9_Organotins(product),
    ruleD10_NPEs(product, brandHasZDHC),
    ruleD11_FlameRetardants(product),
    ruleD12_Biocides(product),
  ];

  // Separate data-gap flags from chemical flags
  const dataGaps = [];
  const chemMap = {};

  for (const r of ruleResults) {
    if (!r) continue;
    if (r.data_gap) { dataGaps.push(r.data_gap); continue; }
    const existing = chemMap[r.chemical];
    // Keep highest-confidence flag per chemical
    if (!existing || CONF_RANK[r.confidence] > CONF_RANK[existing.confidence]) {
      chemMap[r.chemical] = r;
    }
  }

  // Apply penalties (§E.2 Step 2)
  let base = 100;
  const scoredFlags = [];   // MEDIUM or HIGH confidence — penalise and show
  const disclosures  = [];  // LOW confidence — disclose only

  for (const flag of Object.values(chemMap)) {
    const sev = CHEMICAL_SEVERITY[flag.chemical] || "MODERATE";
    const conf = flag.confidence;
    const penalty = (PENALTY[sev]?.[conf]) ?? 0;
    if (conf === "low") {
      disclosures.push(flag);
    } else {
      base -= penalty;
      scoredFlags.push({ ...flag, penalty });
    }
  }

  // Cert bonus (§E.2 Step 3): +8 per cert, capped at +20
  const certBonus = Math.min(20, (product.certifications || []).length * 8);
  const c1 = Math.max(0, Math.min(100, base + certBonus));

  return { score: c1, flags: scoredFlags, disclosures, dataGaps, certBonus };
}

// ── computeC2 ────────────────────────────────────────────────

export function computeC2(brandId, productCerts, brandEntry) {
  return lookupBrandC2(brandId, productCerts, brandEntry);
}

// ── computeC3 ────────────────────────────────────────────────

export function computeC3(product) {
  const score = resolveBenchmark(product);
  return score;
}

// ── scoreV3 ─────────────────────────────────────────────────

/**
 * Main V3 scoring function.
 * @param {object} rawProduct — product object from scan API (§B format or raw)
 * @param {object} [brandEntry] — brand record from BRAND_BY_NAME (or test fixture)
 * @returns {{ score, confidence_tier, components, flags, disclosures, dataGaps,
 *             hasDataGaps, trace } | null}
 */
export function scoreV3(rawProduct, brandEntry) {
  // Normalize to V3 schema
  const product = normalizeProduct(rawProduct);

  // Derive brand safety tier for D-8
  const brandSafetyTier = brandEntry?.tier || "unknown";
  const brandHasZDHC   = brandEntry?.zdhc_mrsl || false;

  // C1
  const c1Result = computeC1(product, brandSafetyTier, brandHasZDHC);
  const c1Score  = c1Result.score;

  // C2
  const c2Signal = computeC2(product.brand_id, product.certifications, brandEntry);
  const c2Score  = c2Signal?.score ?? null;

  // C3
  const c3Score = computeC3(product);

  // Re-normalize weights (§E.5)
  const w = { c1: 0.45, c2: 0.35, c3: 0.20 };
  const components = [];

  components.push({
    type: "material_chemical_risk",
    score: c1Score,
    weight: w.c1,
    flags: c1Result.flags,
    certBonus: c1Result.certBonus,
  });

  if (c2Score !== null) {
    components.push({
      type: "brand_safety",
      score: c2Score,
      weight: w.c2,
      source: c2Signal.source,
      sourceUrl: c2Signal.sourceUrl || null,
      signal_key: c2Signal.signal_key,
      priority_level_used: c2Signal.priority_level,
    });
  }

  if (c3Score !== null) {
    components.push({
      type: "category_benchmark",
      score: c3Score,
      weight: w.c3,
      category_resolved: product.category,
    });
  }

  if (components.length === 0) return null;

  // Weighted score with re-normalization
  const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
  const rawScore    = components.reduce((sum, c) => sum + c.score * c.weight, 0) / totalWeight;
  const finalScore  = Math.round(rawScore);

  // Confidence tier
  let confidence_tier;
  if (components.length === 3)    confidence_tier = 2; // Strong Evidence
  else if (components.length === 2) confidence_tier = 3; // Partial Data
  else                             confidence_tier = 4; // Insufficient Data
  // Priority-4 signal (stale) → one tier downgrade
  if (c2Signal?.priority_level === STALE_SIGNAL_PRIORITY) {
    confidence_tier = Math.min(4, confidence_tier + 1);
  }

  const allGaps = [
    ...c1Result.dataGaps,
    ...(c2Score === null ? ["No brand safety data on record"] : []),
    ...(c3Score === null ? ["No published testing data for this category"] : []),
  ];

  const trace = {
    score: finalScore,
    confidence_tier,
    components,
    flags: c1Result.flags,
    disclosures: c1Result.disclosures,
    data_gaps: allGaps,
    has_data_gaps: allGaps.length > 0,
    scored_at: new Date().toISOString(),
    engine_version: "V3",
  };

  return {
    score: finalScore,
    confidence_tier,
    components,
    flags: c1Result.flags,
    disclosures: c1Result.disclosures,
    dataGaps: allGaps,
    hasDataGaps: allGaps.length > 0,
    trace,
  };
}
