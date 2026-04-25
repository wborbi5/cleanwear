// ============================================================
// CleanWear V3 — Category Research Benchmarks (§E.4)
// Static constants from published garment-category testing.
// Updated manually when new studies are published.
// ============================================================

// §E.4 benchmark table (source citations embedded per methodology)
const BENCHMARKS = {
  "Athletic_synthetic_dwr":   28, // Whitehead 2021 + Mamavation 2022
  "Athletic_synthetic_nodwr": 48, // Mamavation 2022 (DWR-negative subset)
  "Athletic_natural":         65, // REACH Annex XVII baseline
  "Outerwear_dwr":            30, // Whitehead 2021 (73% PFAS positive, DWR outerwear)
  "Outerwear_nodwr":          55, // General synthetic textile baseline
  "Casual_synthetic":         50, // REACH Annex XVII baseline
  "Casual_natural":           70, // REACH Annex XVII baseline
  "Underwear_synthetic":      42, // EWG 2022 — high skin contact
  "Underwear_natural":        65, // EWG 2022
  "Sleepwear_synthetic":      42, // EWG 2022 — prolonged skin contact
  "Sleepwear_natural":        62, // EWG 2022
  "Kids":                     38, // Zheng et al. 2025 — children's PFAS dermal transfer
  "Formal_wrinkle":           58, // EWG 2022 — wrinkle-resistant dress shirts
  "Formal_nowrinkle":         68, // General textile baseline — no treatment claim
};

// Natural fibers that determine fiber_type classification
const NATURAL_FIBER_NAMES = new Set([
  "cotton", "organic cotton", "egyptian cotton", "supima cotton",
  "merino wool", "wool", "cashmere", "recycled cashmere",
  "linen", "organic linen",
  "hemp",
  "silk",
  "bamboo lyocell", "tencel", "lyocell", "modal",
  "eucalyptus fiber",
  "wild rubber",
]);

/**
 * Returns "natural" if the dominant fiber (highest %) is in the natural list,
 * "synthetic" otherwise. Defaults to "synthetic" when materials is empty.
 */
function getFiberType(materials) {
  if (!Array.isArray(materials) || materials.length === 0) return "synthetic";
  const sorted = [...materials].sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
  const dominant = (sorted[0]?.name || "").toLowerCase().trim();
  for (const nat of NATURAL_FIBER_NAMES) {
    if (dominant === nat || dominant.includes(nat)) return "natural";
  }
  return "synthetic";
}

// Canonical category names + aliases from raw strings
const CATEGORY_ALIASES = {
  "athletic":    "Athletic",  "activewear": "Athletic", "gym":     "Athletic",
  "sport":       "Athletic",  "workout":    "Athletic",
  "casual":      "Casual",    "everyday":   "Casual",
  "outerwear":   "Outerwear", "jacket":     "Outerwear", "coat":   "Outerwear",
  "underwear":   "Underwear", "intimate":   "Underwear", "bra":    "Underwear",
  "sleepwear":   "Sleepwear", "pajama":     "Sleepwear", "sleep":  "Sleepwear",
  "kids":        "Kids",      "baby":       "Kids",      "infant": "Kids",
  "children":    "Kids",      "toddler":    "Kids",
  "formal":      "Formal",    "office":     "Formal",
  "unknown":     null,
};

export function normalizeCategory(raw) {
  const lower = (raw || "").toLowerCase().trim();
  if (CATEGORY_ALIASES[lower] !== undefined) return CATEGORY_ALIASES[lower];
  // Substring match fallback
  for (const [alias, canon] of Object.entries(CATEGORY_ALIASES)) {
    if (lower.includes(alias)) return canon;
  }
  return null;
}

const WRINKLE_CLAIMS = new Set([
  "wrinkle-free", "non-iron", "easy-care", "crease-resistant", "wrinkle-resistant",
]);

/**
 * Resolve category benchmark per §E.4.
 * @param {object} product — V3-normalized product (must have category, materials, finish_claims)
 * @returns {number|null} benchmark score, or null when category unknown
 */
export function resolveBenchmark(product) {
  const cat = normalizeCategory(product.category);
  if (!cat) return null;

  const fiber = getFiberType(product.materials || []);
  const claims = (product.finish_claims || []).map(f => (f.value || "").toLowerCase());

  const DWR_CLAIMS = new Set([
    "water-resistant", "waterproof", "dwr", "gore-tex",
    "outdry", "h2no", "event", "stain-resistant",
  ]);
  const hasDWR = claims.some(c => DWR_CLAIMS.has(c));
  const hasWrinkleClaim = claims.some(c => WRINKLE_CLAIMS.has(c));

  switch (cat) {
    case "Kids":       return BENCHMARKS["Kids"];
    case "Athletic":
      if (hasDWR)             return BENCHMARKS["Athletic_synthetic_dwr"];
      if (fiber === "natural") return BENCHMARKS["Athletic_natural"];
      return BENCHMARKS["Athletic_synthetic_nodwr"];
    case "Outerwear":
      return hasDWR ? BENCHMARKS["Outerwear_dwr"] : BENCHMARKS["Outerwear_nodwr"];
    case "Casual":
      return fiber === "natural" ? BENCHMARKS["Casual_natural"] : BENCHMARKS["Casual_synthetic"];
    case "Underwear":
      return fiber === "natural" ? BENCHMARKS["Underwear_natural"] : BENCHMARKS["Underwear_synthetic"];
    case "Sleepwear":
      return fiber === "natural" ? BENCHMARKS["Sleepwear_natural"] : BENCHMARKS["Sleepwear_synthetic"];
    case "Formal":
      return hasWrinkleClaim ? BENCHMARKS["Formal_wrinkle"] : BENCHMARKS["Formal_nowrinkle"];
    default:
      return null;
  }
}
