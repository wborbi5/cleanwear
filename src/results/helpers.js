// Extracted from the legacy ResultsPage so both the rebuilt page and
// any future surfaces can share the same chemical/recommendation logic.
import { BRANDS } from "../brandDatabase.js";

// ── Chemical Detail Database (cited) ────────────────────────────
export const CHEMICAL_INFO = {
  pfas: {
    name: "PFAS (Forever Chemicals)",
    severity: "high",
    sweatNote: "Sweat increases PFAS dermal absorption up to 3,252x versus dry contact",
    citation: { authors: "Zheng et al.", year: 2025, journal: "Sci Total Environ", doi: "https://doi.org/10.1016/j.scitotenv.2025.181066" },
    healthNote: "Linked to thyroid disease, immune suppression, and certain cancers per EPA assessment",
    triggers: ["polyester", "nylon", "dri-fit", "dwr", "gore-tex", "waterproof"],
  },
  formaldehyde: {
    name: "Formaldehyde Resins",
    severity: "high",
    sweatNote: "Heat and moisture increase off-gassing from wrinkle-resistant treatments",
    citation: { authors: "IARC Monograph Vol. 100F", year: 2012, journal: "WHO IARC" },
    healthNote: "Classified as a known human carcinogen (IARC Group 1)",
    triggers: ["cotton", "wrinkle", "non-iron", "nylon"],
  },
  antimony: {
    name: "Antimony Trioxide",
    severity: "mod",
    sweatNote: "Leaching increases when skin temperature exceeds 37\u00b0C during exercise",
    citation: null,
    healthNote: "Catalyst in polyester production, classified as possibly carcinogenic (IARC Group 2B)",
    triggers: ["polyester"],
  },
  phthalates: {
    name: "Phthalates",
    severity: "mod",
    sweatNote: "Migrate more readily from plasticized fabrics in warm, moist conditions",
    citation: { authors: "REACH Annex XVII Entry 51", year: null, journal: "EU regulatory" },
    healthNote: "Endocrine disruptors linked to reproductive and developmental effects",
    triggers: ["spandex", "elastane", "lycra", "polyester", "nylon"],
  },
  microplastics: {
    name: "Microplastic Shedding",
    severity: "mod",
    sweatNote: "Friction and moisture accelerate fiber release from synthetic fabrics",
    citation: null,
    healthNote: "Microplastics detected in human blood, lungs, and placental tissue",
    triggers: ["polyester", "nylon", "acrylic", "spandex", "elastane"],
  },
  bpa: {
    name: "BPA / BPS",
    severity: "mod",
    sweatNote: "BPA leaching from polyester increases when skin temperature rises during exercise",
    citation: { authors: "Rochester & Bolden", year: 2015, journal: "Env Health Perspect" },
    healthNote: "Endocrine disruptor linked to hormonal imbalance and metabolic effects",
    triggers: ["polyester"],
  },
  azo_dyes: {
    name: "Azo Dyes",
    severity: "high",
    sweatNote: "Aromatic amines released through sweat and friction with dyed fabrics",
    citation: { authors: "REACH Annex XVII Entry 43", year: null, journal: "EU regulatory" },
    healthNote: "Can release carcinogenic aromatic amines, banned in EU for skin-contact textiles",
    triggers: ["synthetic", "polyester", "nylon", "acrylic"],
  },
  heavy_metals: {
    name: "Heavy Metals in Dyes",
    severity: "mod",
    sweatNote: "Acidic sweat can leach lead, chromium, and cadmium from textile dyes",
    citation: null,
    healthNote: "Accumulate in organs; lead and cadmium are known carcinogens",
    triggers: ["synthetic", "dyed"],
  },
};

// ── Detect which chemicals apply to this garment ─────────────
export function getGarmentChemicals(product) {
  const materials = (product.materials || []).map(m => (typeof m === "string" ? m : m.name || "").toLowerCase()).join(" ");
  const chemicals = product.chemicals || [];
  const cat = (product.category || "").toLowerCase();
  const found = [];

  chemicals.forEach(c => {
    const key = (typeof c === "string" ? c : c?.id || "").toLowerCase().replace(/[^a-z_]/g, "");
    if (CHEMICAL_INFO[key]) found.push(key);
  });

  Object.entries(CHEMICAL_INFO).forEach(([key, info]) => {
    if (found.includes(key)) return;
    if (info.triggers.some(t => materials.includes(t) || cat.includes(t))) {
      found.push(key);
    }
  });

  return [...new Set(found)];
}

// ── Garment type inference for recommendation matching ───────
export function getGarmentType(productName) {
  const n = (productName || "").toLowerCase();
  if (/\b(tee|t-shirt|crew\s*(neck)?|tank|henley)\b/.test(n) && !/dress/.test(n)) return "tee";
  if (/\b(polo)\b/.test(n)) return "tee";
  if (/\b(hoodie|sweatshirt|pullover)\b/.test(n)) return "hoodie";
  if (/\b(shirt|button|oxford|camp)\b/.test(n) && !/t-shirt/.test(n)) return "shirt";
  if (/\b(leggings?|tights?|compression\s*(tights?|pants?))\b/.test(n)) return "leggings";
  if (/\b(shorts?)\b/.test(n)) return "shorts";
  if (/\b(pants?|joggers?|chinos?|trousers?|jeans?|denim)\b/.test(n) && !/shorts/.test(n)) return "pants";
  if (/\b(jacket|puff|coat|parka|anorak|rain\s*defender)\b/.test(n)) return "jacket";
  if (/\b(fleece|denali)\b/.test(n)) return "jacket";
  if (/\b(boxers?|briefs?|trunks?|thongs?|underwear|panty|panties)\b/.test(n)) return "underwear";
  if (/\b(bras?|bralettes?)\b/.test(n)) return "bra";
  return null;
}

const TYPE_GROUPS = {
  tops: ["tee", "shirt", "baselayer"],
  bottoms: ["leggings", "pants", "shorts"],
  layers: ["jacket", "hoodie"],
  intimates: ["underwear", "bra"],
};

export function getTypeGroup(type) {
  for (const [group, types] of Object.entries(TYPE_GROUPS)) {
    if (types.includes(type)) return group;
  }
  return null;
}

const CATEGORY_MAP = {
  athletic: ["athletic", "gym", "sport", "workout", "running", "compression", "activewear"],
  casual: ["casual", "tee", "t-shirt", "shirt", "shorts", "jeans", "pants"],
  outerwear: ["outerwear", "jacket", "coat", "rain", "waterproof", "puff"],
  underwear: ["underwear", "bra", "boxer", "intimate", "brief", "lingerie"],
  sleepwear: ["sleepwear", "pajama", "sleep", "lounge", "nightwear"],
  kids: ["kids", "baby", "infant", "toddler", "children"],
};

export function getCategoryGroup(category) {
  const cat = (category || "").toLowerCase();
  for (const [group, terms] of Object.entries(CATEGORY_MAP)) {
    if (terms.some(t => cat.includes(t))) return group;
  }
  return "casual";
}

// ── Recommendations: type-aware, must score higher than scanned ──
export function getRecommendations(scannedProduct) {
  const targetGroup = getCategoryGroup(scannedProduct.category);
  const scannedName = scannedProduct.product_name || scannedProduct.name || "";
  const targetType = getGarmentType(scannedName);
  const targetTypeGroup = targetType ? getTypeGroup(targetType) : null;
  const scannedBrand = (scannedProduct.brand || "").toLowerCase();
  const scannedScore = scannedProduct.score || 0;
  const candidates = [];

  BRANDS.forEach(brand => {
    if (brand.confidence_tier === 4) return;
    if (brand.name.toLowerCase() === scannedBrand) return;
    if (brand.tier === "high_risk") return;

    brand.products?.forEach(p => {
      if (p.score <= scannedScore) return;
      if (p.score < 60) return;

      const pGroup = getCategoryGroup(p.category);
      const pType = getGarmentType(p.name);
      const pTypeGroup = pType ? getTypeGroup(pType) : null;

      const exactTypeMatch = targetType && pType === targetType;
      const groupMatch = targetTypeGroup && pTypeGroup === targetTypeGroup;
      const categoryMatch = pGroup === targetGroup;

      if (!exactTypeMatch && !groupMatch && !categoryMatch) return;

      candidates.push({
        name: p.name,
        brand: brand.name,
        score: p.score,
        price: p.price || null,
        materials: p.materials || "",
        matchScore: exactTypeMatch ? 3 : groupMatch ? 2 : 1,
        delta: p.score - scannedScore,
      });
    });
  });

  candidates.sort((a, b) => (b.matchScore - a.matchScore) || (b.score - a.score));
  return candidates.slice(0, 4);
}

// ── Axis picker: split alternatives by "Same fit" vs "Same price" ──
export function pickSplitAlternatives(recs, scannedPrice) {
  if (recs.length === 0) return { sameFit: null, samePrice: null };

  // Same fit = highest matchScore (exact type match if available)
  const sameFit = recs[0];

  // Same price = nearest-price alternative, else second-best score
  let samePrice = null;
  if (scannedPrice) {
    const withPrice = recs.filter(r => r.price != null && r !== sameFit);
    withPrice.sort((a, b) => Math.abs(a.price - scannedPrice) - Math.abs(b.price - scannedPrice));
    samePrice = withPrice[0] || null;
  }
  if (!samePrice) {
    samePrice = recs.find(r => r !== sameFit) || null;
  }
  return { sameFit, samePrice };
}

// ── Build chemical card rows from the garment ─────────────────
export function buildChemicalRows(product) {
  const ids = getGarmentChemicals(product);
  return ids.map(key => {
    const info = CHEMICAL_INFO[key];
    const equivalency = buildEquivalency(key, info);
    return {
      name: info.name,
      severity: info.severity,
      equivalency,
      citation: info.citation || null,
    };
  });
}

// Equivalency sentences use serif italic for the metaphor and 500-weight
// for the factual anchor — per design-handoff.md §3.3.
import { createElement as h } from "react";

function buildEquivalency(key, info) {
  if (key === "pfas") {
    return h("span", null,
      "A ", h("em", { className: "cw-ital" }, "forever chemical"), " the EU is phasing out in consumer textiles by 2026. ",
      h("strong", { style: { fontWeight: 500 } }, "Sweat amplifies dermal transfer up to 3,252\u00d7 dry contact.")
    );
  }
  if (key === "formaldehyde") {
    return h("span", null,
      "The same compound used to ", h("em", { className: "cw-ital" }, "preserve lab specimens."), " ",
      h("strong", { style: { fontWeight: 500 } }, "Classified Group 1 carcinogen by IARC.")
    );
  }
  if (key === "bpa") {
    return h("span", null,
      "A plasticizer that ", h("em", { className: "cw-ital" }, "mimics estrogen."), " ",
      h("strong", { style: { fontWeight: 500 } }, "Leaches faster when skin temperature rises.")
    );
  }
  if (key === "phthalates") {
    return h("span", null,
      "Plasticizers that ", h("em", { className: "cw-ital" }, "disrupt hormone signalling."), " ",
      h("strong", { style: { fontWeight: 500 } }, "Linked to reduced testosterone in men.")
    );
  }
  if (key === "antimony") {
    return h("span", null,
      "Polyester production catalyst, ",
      h("em", { className: "cw-ital" }, "classified possibly carcinogenic"),
      " by IARC."
    );
  }
  if (key === "microplastics") {
    return h("span", null,
      "Synthetic fibers that ", h("em", { className: "cw-ital" }, "shed with friction"), " and have been detected in human blood and lung tissue."
    );
  }
  if (key === "azo_dyes") {
    return h("span", null,
      "Dyes that can release ", h("em", { className: "cw-ital" }, "carcinogenic aromatic amines"),
      " — banned in EU for skin-contact textiles."
    );
  }
  if (key === "heavy_metals") {
    return h("span", null,
      "Lead, chromium, and cadmium from textile dyes ", h("em", { className: "cw-ital" }, "leach with acidic sweat.")
    );
  }
  return info.healthNote;
}
