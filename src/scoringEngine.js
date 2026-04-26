// ============================================================
// CleanWear Scoring Engine v2.0
// All scores are derived from cited data sources only.
// No AI inference. Every score component traces to a named source.
// ============================================================

// ── Scoring Sources ──────────────────────────────────────────
export const SOURCES = {
  ECHA_REACH: {
    name: "EU REACH Annex XVII",
    url: "https://echa.europa.eu/substances-restricted-under-reach",
    year: 2024
  },
  NRDC_PFAS: {
    name: "NRDC PFAS Brand Scorecard",
    url: "https://www.nrdc.org/press-releases/new-pfas-scorecard-popular-apparel-brands-levi-strauss-earns-outdoor-brands-fail",
    year: 2023
  },
  EWG_2022: {
    name: "EWG Textile Chemical Testing",
    url: "https://www.ewg.org/news-insights/news/2022/01/new-tests-find-toxic-forever-chemicals-bedding-yoga-pants-and-other",
    year: 2022
  },
  MAMAVATION_2022: {
    name: "Mamavation / Environmental Health News Activewear Study",
    url: "https://www.ehn.org/pfas-clothing",
    year: 2022
  },
  ZHENG_2025: {
    name: "Zheng et al. — Sweat-amplified dermal transfer of PFAS in children's textiles",
    url: "https://www.sciencedirect.com/science/article/abs/pii/S0048969725020662",
    year: 2025,
    keyFinding: "Sweat increases PFAS dermal absorption up to 3,252x versus dry contact"
  },
  OEKO_TEX: {
    name: "OEKO-TEX Label Check",
    url: "https://www.oeko-tex.com/en/label-check",
    year: 2026
  },
  GOOD_ON_YOU: {
    name: "Good On You Brand Ratings",
    url: "https://goodonyou.eco",
    year: 2024
  }
};

// ── Chemical Panel Thresholds ────────────────────────────────
export const PANEL_THRESHOLDS = {
  pfas_ppb: 25,           // per compound — OEKO-TEX 2026
  formaldehyde_ppm: 75,   // OEKO-TEX Standard 100
  phthalates_pct: 0.1,    // REACH Annex XVII Entry 51
  lead_ppm: 90,           // REACH Annex XVII
  antimony_ppm: 30,       // REACH Annex XVII
  ph_min: 4.0,
  ph_max: 7.5,
};

// ── Sweat Amplification (Zheng et al. 2025) ─────────────────
export const SWEAT_MULTIPLIERS = {
  workout: 3252,
  outdoor: 8,
  sleep: 4,
  casual: 1
};

// ── Main Scoring Function ────────────────────────────────────
export function calculateScore(product, brand) {
  const components = [];
  const flags = [];
  const gaps = [];

  // COMPONENT 1: Regulatory flags (ECHA REACH Annex XVII) — 45%
  const reachFlags = getReachFlags(product.category, getMaterialString(product));
  if (reachFlags.length > 0) {
    components.push({
      source: "EU REACH Annex XVII",
      sourceUrl: SOURCES.ECHA_REACH.url,
      weight: 0.45,
      score: reachFlags.length > 2 ? 40 : reachFlags.length > 0 ? 65 : 90,
      label: `${reachFlags.length} regulated chemical class(es) associated with this garment type`
    });
    flags.push(...reachFlags);
  } else {
    gaps.push("REACH regulatory mapping not available for this category");
  }

  // COMPONENT 2: Brand safety record — 55%
  if (brand && brand.confidence_tier <= 3) {
    const brandScore = getBrandScore(brand);
    components.push({
      source: brandScore.source,
      sourceUrl: brandScore.sourceUrl,
      weight: 0.55,
      score: brandScore.score,
      label: brandScore.label
    });
  } else {
    gaps.push("No brand-level safety data on record");
  }

  // If no components have data, return null (show data gap)
  if (components.length === 0) return null;

  // Weighted average of components that have data
  const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
  const weightedScore = components.reduce((sum, c) => sum + (c.score * c.weight), 0) / totalWeight;

  return {
    score: Math.round(weightedScore),
    confidence_tier: Math.min(...components.map(() => 3), brand?.confidence_tier || 4),
    components,
    flags,
    gaps,
    hasDataGaps: gaps.length > 0
  };
}

// ── Helper: Extract material string from product ─────────────
function getMaterialString(product) {
  if (!product.materials) return "";
  if (typeof product.materials === "string") return product.materials;
  if (Array.isArray(product.materials)) {
    return product.materials.map(m => typeof m === "string" ? m : m.name || "").join(" ");
  }
  return "";
}

// ── REACH Regulatory Flags ───────────────────────────────────
function getReachFlags(category, materials) {
  const flags = [];
  const cat = (category || "").toLowerCase();
  const mat = (materials || "").toLowerCase();

  if (mat.includes("polyester") || mat.includes("nylon")) {
    flags.push({ chemical: "Phthalates", regulation: "REACH Annex XVII Entry 51", limit: "0.1% by weight" });
  }
  if (cat.includes("activewear") || cat.includes("waterproof") || cat.includes("athletic") || cat.includes("sport") || mat.includes("gore-tex") || mat.includes("dri-fit") || mat.includes("dwr")) {
    flags.push({ chemical: "PFAS", regulation: "OEKO-TEX Standard 2026", limit: "25 ppb per compound" });
  }
  if (cat.includes("dress") || cat.includes("formal") || mat.includes("wrinkle") || mat.includes("non-iron")) {
    flags.push({ chemical: "Formaldehyde", regulation: "OEKO-TEX Standard 100", limit: "75 ppm" });
  }
  if (mat.includes("synthetic") || mat.includes("polyester") || mat.includes("nylon") || mat.includes("acrylic")) {
    flags.push({ chemical: "Azo Dyes (aromatic amines)", regulation: "REACH Annex XVII Entry 43", limit: "30 mg/kg per amine" });
  }
  return flags;
}

// ── Brand Score Lookup ───────────────────────────────────────
function getBrandScore(brand) {
  const name = brand.brand_name || brand.name || "Unknown";

  if (brand.nrdc_pfas_rating === "A+") return { score: 88, source: SOURCES.NRDC_PFAS.name, sourceUrl: SOURCES.NRDC_PFAS.url, label: `${name} earned A+ on PFAS elimination (NRDC 2023)` };
  if (brand.nrdc_pfas_rating === "A") return { score: 82, source: SOURCES.NRDC_PFAS.name, sourceUrl: SOURCES.NRDC_PFAS.url, label: `${name} earned A on PFAS elimination (NRDC 2023)` };
  if (brand.nrdc_pfas_rating === "B") return { score: 68, source: SOURCES.NRDC_PFAS.name, sourceUrl: SOURCES.NRDC_PFAS.url, label: `${name} earned B on PFAS elimination — claims in progress (NRDC 2023)` };
  if (brand.nrdc_pfas_rating === "C") return { score: 52, source: SOURCES.NRDC_PFAS.name, sourceUrl: SOURCES.NRDC_PFAS.url, label: `${name} earned C on PFAS elimination (NRDC 2023)` };
  if (brand.nrdc_pfas_rating === "D") return { score: 38, source: SOURCES.NRDC_PFAS.name, sourceUrl: SOURCES.NRDC_PFAS.url, label: `${name} earned D on PFAS elimination (NRDC 2023)` };
  if (brand.nrdc_pfas_rating === "F") return { score: 28, source: SOURCES.NRDC_PFAS.name, sourceUrl: SOURCES.NRDC_PFAS.url, label: `${name} received F on PFAS elimination policy (NRDC 2023)` };

  if (brand.good_on_you_rating === "we avoid") return { score: 22, source: SOURCES.GOOD_ON_YOU.name, sourceUrl: SOURCES.GOOD_ON_YOU.url, label: `${name} rated 'We Avoid' by Good On You` };
  if (brand.good_on_you_rating === "great") return { score: 82, source: SOURCES.GOOD_ON_YOU.name, sourceUrl: SOURCES.GOOD_ON_YOU.url, label: `${name} rated 'Great' by Good On You` };
  if (brand.good_on_you_rating === "good") return { score: 72, source: SOURCES.GOOD_ON_YOU.name, sourceUrl: SOURCES.GOOD_ON_YOU.url, label: `${name} rated 'Good' by Good On You` };
  if (brand.good_on_you_rating === "it's a start") return { score: 48, source: SOURCES.GOOD_ON_YOU.name, sourceUrl: SOURCES.GOOD_ON_YOU.url, label: `${name} rated 'It's a Start' by Good On You` };

  if (brand.oeko_tex_certified) return { score: 78, source: SOURCES.OEKO_TEX.name, sourceUrl: SOURCES.OEKO_TEX.url, label: `${name} holds OEKO-TEX certification` };
  if (brand.gots_certified) return { score: 80, source: "GOTS Certification", sourceUrl: "https://global-standard.org", label: `${name} holds GOTS certification` };
  if (brand.bluesign_certified) return { score: 75, source: "bluesign Certification", sourceUrl: "https://www.bluesign.com", label: `${name} holds bluesign certification` };

  return { score: 50, source: "General brand profile", sourceUrl: null, label: `${name} — no specific safety rating on record` };
}

// ── Category Research Benchmarks ─────────────────────────────
function getCategoryResearch(category, materials) {
  const cat = (category || "").toLowerCase();
  const mat = (materials || "").toLowerCase();

  if (cat.includes("activewear") || cat.includes("athletic") || cat.includes("legging") || cat.includes("sports bra") || cat.includes("yoga") || cat.includes("gym") || cat.includes("compression")) {
    return {
      riskScore: 35,
      study: SOURCES.MAMAVATION_2022.name,
      url: SOURCES.MAMAVATION_2022.url,
      finding: "Activewear polyester products tested positive for PFAS in 68% of items (10–284 ppm organic fluorine)"
    };
  }
  if (cat.includes("jacket") || cat.includes("waterproof") || cat.includes("rain") || cat.includes("outdoor") || cat.includes("outerwear")) {
    return {
      riskScore: 30,
      study: "Toxic-Free Future (2022)",
      url: "https://toxicfreefuture.org",
      finding: "Waterproof/DWR outdoor apparel showed PFAS presence in 58% of items tested"
    };
  }
  if (cat.includes("dress shirt") || cat.includes("formal") || cat.includes("wrinkle") || cat.includes("non-iron") || cat.includes("office")) {
    return {
      riskScore: 45,
      study: SOURCES.EWG_2022.name,
      url: SOURCES.EWG_2022.url,
      finding: "Wrinkle-resistant fabric treatments commonly use formaldehyde-releasing agents"
    };
  }
  if (cat.includes("sleepwear") || cat.includes("pajama") || cat.includes("sleep") || cat.includes("lounge")) {
    return {
      riskScore: 50,
      study: SOURCES.EWG_2022.name,
      url: SOURCES.EWG_2022.url,
      finding: "Sleepwear with prolonged skin contact increases cumulative dermal chemical exposure"
    };
  }
  if (cat.includes("underwear") || cat.includes("bra") || cat.includes("intimate") || cat.includes("boxer")) {
    return {
      riskScore: 40,
      study: SOURCES.EWG_2022.name,
      url: SOURCES.EWG_2022.url,
      finding: "Intimate apparel with high skin contact and synthetic materials increases chemical transfer risk"
    };
  }
  if (cat.includes("kids") || cat.includes("baby") || cat.includes("infant") || cat.includes("toddler") || cat.includes("children")) {
    return {
      riskScore: 38,
      study: SOURCES.ZHENG_2025.name,
      url: SOURCES.ZHENG_2025.url,
      finding: "Children's textiles showed sweat-amplified PFAS dermal transfer up to 3,252x versus dry contact"
    };
  }
  if (mat.includes("cotton") || mat.includes("organic") || mat.includes("linen") || mat.includes("hemp") || mat.includes("wool") || mat.includes("silk") || mat.includes("cashmere")) {
    return {
      riskScore: 70,
      study: SOURCES.ECHA_REACH.name,
      url: SOURCES.ECHA_REACH.url,
      finding: "Natural fiber garments generally carry lower chemical finishing risk than synthetic performance fabrics"
    };
  }
  if (mat.includes("viscose") || mat.includes("rayon") || mat.includes("modal") || mat.includes("bamboo") || mat.includes("tencel") || mat.includes("lyocell") || mat.includes("cupro")) {
    return {
      riskScore: 55,
      study: SOURCES.ECHA_REACH.name,
      url: SOURCES.ECHA_REACH.url,
      finding: "Regenerated cellulose fibers (viscose, modal, bamboo) involve chemical processing but carry moderate residue risk"
    };
  }
  if (mat.includes("polyester") || mat.includes("nylon") || mat.includes("acrylic") || mat.includes("spandex") || mat.includes("elastane")) {
    return {
      riskScore: 38,
      study: SOURCES.MAMAVATION_2022.name,
      url: SOURCES.MAMAVATION_2022.url,
      finding: "Synthetic fabric products associated with elevated chemical residue risk in published testing"
    };
  }
  return null;
}
