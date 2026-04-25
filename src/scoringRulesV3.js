// ============================================================
// CleanWear V3 — Inference Rules D-1 through D-12
// Per methodology §D. Each function returns a RuleResult or null.
// LOW-confidence flags are disclosures only (no score penalty).
// MEDIUM/HIGH confidence flags apply score penalties (§E.2).
//
// RuleResult shape:
//   { chemical, confidence, rule, source, note?,
//     suppressed_to_low?, data_gap? }
// ============================================================

// ── Shared constants ────────────────────────────────────────

const DWR_CLAIMS = new Set([
  "water-resistant", "waterproof", "dwr", "gore-tex",
  "outdry", "h2no", "event", "stain-resistant",
]);

const WRINKLE_CLAIMS = new Set([
  "wrinkle-free", "non-iron", "easy-care",
  "crease-resistant", "wrinkle-resistant",
]);

const SPANDEX_FIBERS = new Set(["spandex", "elastane", "lycra"]);

const POLYESTER_FIBERS = new Set(["polyester", "recycled polyester"]);

const NYLON_FIBERS = new Set(["nylon", "recycled nylon"]);

const SYNTHETIC_FIBERS = new Set([
  "polyester", "recycled polyester", "nylon", "recycled nylon", "acrylic",
]);

const NATURAL_FIBERS = new Set([
  "cotton", "organic cotton", "egyptian cotton", "supima cotton",
  "merino wool", "wool", "cashmere", "recycled cashmere",
  "linen", "organic linen", "hemp", "silk",
  "bamboo lyocell", "tencel", "lyocell", "modal", "eucalyptus fiber",
]);

const RSL_CERTS = new Set(["oeko-tex standard 100", "oeko-tex", "gots", "bluesign"]);

// ── Helpers ─────────────────────────────────────────────────

function hasMaterial(materials, nameSet) {
  return (materials || []).some(m => {
    const n = (m.name || "").toLowerCase().trim();
    return nameSet.has(n) || [...nameSet].some(s => n.includes(s));
  });
}

function hasClaim(finish_claims, claimSet) {
  return (finish_claims || []).some(f => claimSet.has((f.value || "").toLowerCase().trim()));
}

function hasDeclaredClaim(finish_claims, claimSet) {
  return (finish_claims || []).some(f =>
    claimSet.has((f.value || "").toLowerCase().trim()) && f.confidence === "declared"
  );
}

function hasCert(certifications, certSet) {
  return (certifications || []).some(c => {
    const lower = (typeof c === "string" ? c : "").toLowerCase();
    return [...certSet].some(s => lower.includes(s));
  });
}

// ── Rule D-1: PFAS ──────────────────────────────────────────

export function ruleD1_PFAS(product) {
  const { finish_claims, category } = product;

  if (hasDeclaredClaim(finish_claims, DWR_CLAIMS)) {
    return {
      chemical: "pfas", confidence: "high", rule: "D-1",
      source: "Whitehead et al. 2021 · Env Sci Technol Lett 8:538 / OEKO-TEX 2026 (25 ppb limit)",
    };
  }

  if (hasClaim(finish_claims, DWR_CLAIMS)) {
    return {
      chemical: "pfas", confidence: "medium", rule: "D-1",
      source: "Whitehead et al. 2021 · Env Sci Technol Lett 8:538",
    };
  }

  const cat = (category || "").toLowerCase();
  if (cat === "outerwear") {
    return {
      chemical: "pfas", confidence: "low", rule: "D-1",
      note: "Outerwear — no explicit DWR claim; LOW confidence, disclosure only",
      source: "Whitehead et al. 2021 (73% of DWR outerwear PFAS-positive)",
    };
  }

  // §D-1 explicit: Athletic without DWR claim → NO flag (V2 correction)
  return null;
}

// ── Rule D-2: Formaldehyde ───────────────────────────────────

export function ruleD2_Formaldehyde(product) {
  const { finish_claims, materials, certifications } = product;

  // OEKO-TEX suppresses entirely (tested at 75 ppm threshold)
  if (hasCert(certifications, RSL_CERTS)) return null;

  if (hasClaim(finish_claims, WRINKLE_CLAIMS)) {
    return {
      chemical: "formaldehyde", confidence: "high", rule: "D-2",
      source: "IARC Monograph Vol. 100F (2012, Group 1 carcinogen) / OEKO-TEX Std 100",
    };
  }

  if (hasMaterial(materials, new Set(["cotton", "organic cotton", "egyptian cotton", "supima cotton"]))) {
    return {
      chemical: "formaldehyde", confidence: "low", rule: "D-2",
      note: "Cotton processing residue — LOW confidence, disclosure only (EWG 2022 finds sub-threshold levels in untreated cotton basics)",
      source: "EWG 2022 Textile Chemical Testing",
    };
  }

  return null;
}

// ── Rule D-3: Phthalates ─────────────────────────────────────

export function ruleD3_Phthalates(product) {
  const { materials, certifications } = product;

  if (!hasMaterial(materials, SPANDEX_FIBERS)) return null;

  // GOTS or OEKO-TEX downgrade to LOW
  if (hasCert(certifications, new Set(["gots", "oeko-tex standard 100", "oeko-tex", "bluesign"]))) {
    return {
      chemical: "phthalates", confidence: "low", rule: "D-3",
      suppressed_to_low: true,
      note: "Downgraded to LOW by GOTS/OEKO-TEX/bluesign certification (tested to REACH Annex XVII Entry 51 limit). bluesign's restricted substances list covers DEHP/phthalate plasticizers.",
      source: "REACH Annex XVII Entry 51 / Swan & Main 2003 · Environ Health Perspect 111:1115",
    };
  }

  return {
    chemical: "phthalates", confidence: "medium", rule: "D-3",
    source: "REACH Annex XVII Entry 51 / Swan & Main 2003 · Environ Health Perspect 111:1115",
  };
}

// ── Rule D-4: Bisphenols (BPA/BPS) ───────────────────────────

export function ruleD4_BPA(product) {
  const { materials, finish_claims } = product;

  if (!hasMaterial(materials, POLYESTER_FIBERS)) return null;

  if (hasClaim(finish_claims, new Set(["stain-resistant"]))) {
    return {
      chemical: "bpa", confidence: "medium", rule: "D-4",
      source: "Rochester & Bolden 2015 · Environ Health Perspect 123:643",
      note: "Stain-resistant polyester — bisphenol-based coatings document dermal transfer",
    };
  }

  return {
    chemical: "bpa", confidence: "low", rule: "D-4",
    note: "Polyester present — BPA at LOW confidence, disclosure only (limited dermal-transfer evidence without coating claim)",
    source: "Rochester & Bolden 2015 · Environ Health Perspect 123:643",
  };
}

// ── Rule D-5: Antimony Trioxide ───────────────────────────────

export function ruleD5_Antimony(product) {
  const { materials, certifications } = product;

  if (!hasMaterial(materials, POLYESTER_FIBERS)) return null;

  // OEKO-TEX or bluesign downgrade to LOW (tested at 30 mg/kg)
  if (hasCert(certifications, new Set(["oeko-tex standard 100", "oeko-tex", "bluesign"]))) {
    return {
      chemical: "antimony", confidence: "low", rule: "D-5",
      suppressed_to_low: true,
      note: "Downgraded to LOW by OEKO-TEX/bluesign (tested at 30 mg/kg OEKO-TEX limit)",
      source: "Biver et al. 2021 · Regul Toxicol Pharmacol 119:104824 / OEKO-TEX Std 100",
    };
  }

  // Recycled polyester: retain MEDIUM even if would otherwise downgrade
  return {
    chemical: "antimony", confidence: "medium", rule: "D-5",
    source: "Biver et al. 2021 · Regul Toxicol Pharmacol 119:104824 / OEKO-TEX Std 100 (30 mg/kg limit)",
  };
}

// ── Rule D-6: Microplastics ────────────────────────────────────

export function ruleD6_Microplastics(product) {
  const { materials } = product;

  if (!hasMaterial(materials, SYNTHETIC_FIBERS)) return null;

  // No cert currently suppresses microplastics shedding (§D-6)
  return {
    chemical: "microplastics", confidence: "medium", rule: "D-6",
    source: "De Falco et al. 2019 · Sci Reports 9:6633 / Browne et al. 2011 · Environ Sci Technol 45:9175",
    note: "Fiber shedding during wear and washing; no cert currently covers shedding rates",
  };
}

// ── Rule D-7: Azo Dyes ────────────────────────────────────────

export function ruleD7_AzoDyes(product) {
  const { materials, certifications } = product;

  if (!hasMaterial(materials, SYNTHETIC_FIBERS)) return null;

  // Any RSL cert suppresses
  if (hasCert(certifications, RSL_CERTS)) return null;

  return {
    chemical: "azo_dyes", confidence: "low", rule: "D-7",
    note: "Synthetic-fiber dyeing — without RSL certification, dye safety cannot be confirmed. LOW confidence, disclosure only.",
    source: "REACH Annex XVII Entry 43 (30 mg/kg per restricted aromatic amine)",
  };
}

// ── Rule D-8: Heavy Metals ────────────────────────────────────

export function ruleD8_HeavyMetals(product, brandSafetyTier) {
  const { materials, certifications } = product;

  if (hasCert(certifications, new Set(["oeko-tex standard 100", "oeko-tex", "bluesign"]))) return null;

  // Only fire for all-synthetic uncertified high-risk brands
  const hasAnyNatural = hasMaterial(materials, NATURAL_FIBERS);
  if (hasAnyNatural) return null;

  if (brandSafetyTier === "high_risk") {
    return {
      chemical: "heavy_metals", confidence: "low", rule: "D-8",
      note: "Uncertified fast-fashion brand + all-synthetic materials — category-level rate of exceedance documented in independent testing. LOW confidence, disclosure only.",
      source: "REACH Annex XVII / Greenpeace Detox Campaign testing reports 2012–2016",
    };
  }

  return null;
}

// ── Rule D-9: Organotins ──────────────────────────────────────

export function ruleD9_Organotins(product) {
  const { finish_claims, certifications } = product;

  const ORGANOTIN_TRIGGERS = new Set(["antimicrobial", "anti-odor", "anti-mold"]);
  if (!hasClaim(finish_claims, ORGANOTIN_TRIGGERS)) return null;

  // Any certification suppresses
  if ((certifications || []).length > 0) return null;

  return {
    chemical: "organotins", confidence: "low", rule: "D-9",
    note: "Antimicrobial/anti-odor claim without certification — organotins used as biocides in some treated fabrics. LOW confidence.",
    source: "REACH Annex XVII Entry 20 / Kannan et al. 1996 · Environ Sci Technol 30:1541",
  };
}

// ── Rule D-10: Nonylphenol Ethoxylates (NPEs) ─────────────────

export function ruleD10_NPEs(product, brandHasZDHC) {
  if (brandHasZDHC) return null;

  const { materials, certifications } = product;
  if ((certifications || []).length > 0) return null;

  const NPE_MATERIALS = new Set(["polyester", "recycled polyester", "nylon", "recycled nylon"]);
  if (!hasMaterial(materials, NPE_MATERIALS)) return null;

  return {
    chemical: "npes", confidence: "low", rule: "D-10",
    note: "NPE residues are a manufacturing process concern, not fiber-type specific. Proxy rule until ZDHC MRSL data is ingested. LOW confidence.",
    source: "REACH Annex XVII Entry 46 / Soares et al. 2008 · Environ Int 34:1002",
  };
}

// ── Rule D-11: Flame Retardants ────────────────────────────────

export function ruleD11_FlameRetardants(product) {
  const { category, subcategory, finish_claims } = product;
  const cat = (category || "").toLowerCase().trim();
  const subcat = (subcategory || "").toLowerCase().trim();

  const FITTED_CLAIMS = new Set(["fitted", "snug-fit"]);

  // Kids sleepwear — HIGH confidence unless fitted (CPSC compliance alternative)
  if (cat === "kids" && (subcat === "sleepwear" || subcat === "pajama")) {
    if (hasClaim(finish_claims, FITTED_CLAIMS)) return null;
    return {
      chemical: "flame_retardants", confidence: "high", rule: "D-11",
      source: "CPSC 16 CFR Part 1615/1616 / Stapleton et al. 2011 · Environ Sci Technol 45:5523",
      note: "Non-fitted kids sleepwear — chemical flame resistance required by US CPSC",
    };
  }

  // Kids product without subcategory — data gap, cannot evaluate
  if (cat === "kids" && !subcat) {
    return {
      chemical: "flame_retardants", confidence: null, rule: "D-11",
      data_gap: "subcategory not provided — D-11 flame retardant rule could not be evaluated for this Kids product",
    };
  }

  // Adult sleepwear — LOW confidence
  if (cat === "sleepwear") {
    return {
      chemical: "flame_retardants", confidence: "low", rule: "D-11",
      note: "Adult sleepwear — chemical flame retardants commonly applied to synthetics. LOW confidence, disclosure only.",
      source: "CPSC 16 CFR Part 1615/1616 / Stapleton et al. 2011",
    };
  }

  return null;
}

// ── Rule D-12: Antimicrobial Biocides ─────────────────────────

export function ruleD12_Biocides(product) {
  const BIOCIDE_TRIGGERS = new Set([
    "antimicrobial", "anti-odor", "silver", "heiq", "polygiene", "x-static",
  ]);

  if (!hasClaim(product.finish_claims, BIOCIDE_TRIGGERS)) return null;

  // Distinguish from D-9: D-12 fires regardless of certs (biocide claim is the trigger)
  return {
    chemical: "antimicrobial_biocides", confidence: "medium", rule: "D-12",
    source: "EU Biocidal Products Regulation 528/2012 / Dhillon et al. 2015 · Biomed Res Int 2015:796914",
  };
}

// ── Ordered rule set (evaluated in this order) ────────────────

export const RULES_V3 = [
  ruleD1_PFAS,
  ruleD2_Formaldehyde,
  ruleD3_Phthalates,
  ruleD4_BPA,
  ruleD5_Antimony,
  ruleD6_Microplastics,
  ruleD7_AzoDyes,
  ruleD8_HeavyMetals,
  ruleD9_Organotins,
  ruleD10_NPEs,
  ruleD11_FlameRetardants,
  ruleD12_Biocides,
];
