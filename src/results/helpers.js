// ============================================================
// CleanWear — Results helpers (V3-aligned)
// Fixes C-08 (PFAS triggers), C-09 (Zheng note), C-10 (phthalates triggers)
// Architecture: Option A (trace-driven). See plan for details.
// ============================================================

import { BRANDS } from "../brandDatabase.js";
import { createElement as h } from "react";

// ── Chemical Detail Database (12 V3 categories) ──────────────
export const CHEMICAL_INFO = {
  pfas: {
    name: "PFAS (Forever Chemicals)",
    severity: "high",
    // C-09 fix: does NOT start with the 3,252x claim universally.
    // Zheng 2025 studied children's textiles only (methodology §E.4).
    sweatNote: "PFAS dermal transfer increases under heat and sweat conditions. " +
               "For children's garments, studies have measured up to 3,252x amplification " +
               "versus dry contact (Zheng et al. 2025 — children's textiles specifically).",
    citation: { authors:"Whitehead et al.", year:2021, journal:"Env Sci Technol Lett",
                doi:"https://doi.org/10.1021/acs.est.2c02111" },
    healthNote: "Linked to thyroid disease, immune suppression, and certain cancers per EPA assessment. " +
                "EU OEKO-TEX 2026 limit: 25 ppb per compound.",
    // C-08 fix: DWR finish claims only — NOT polyester/nylon alone.
    triggers: ["dwr", "gore-tex", "waterproof", "water-resistant", "outdry", "h2no"],
  },
  formaldehyde: {
    name: "Formaldehyde Resins",
    severity: "high",
    sweatNote: "Heat and moisture increase off-gassing from wrinkle-resistant resin treatments.",
    citation: { authors:"IARC Monograph Vol. 100F", year:2012, journal:"WHO IARC",
                doi:"https://publications.iarc.fr/Book-And-Report-Series/Iarc-Monographs-On-The-Identification-Of-Carcinogenic-Hazards-To-Humans/Chemical-Agents-And-Related-Occupations-2012" },
    healthNote: "Classified as a known human carcinogen (IARC Group 1). " +
                "Used in wrinkle-resistant, non-iron, and easy-care fabric treatments.",
    triggers: ["wrinkle", "non-iron", "easy-care", "crease-resistant", "cotton"],
  },
  azo_dyes: {
    name: "Azo Dyes",
    severity: "high",
    sweatNote: "Aromatic amines released through sweat and friction with dyed synthetic fabrics.",
    citation: { authors:"REACH Annex XVII Entry 43", year:null, journal:"ECHA",
                doi:"https://echa.europa.eu/substances-restricted-under-reach" },
    healthNote: "Some azo dyes release carcinogenic aromatic amines. " +
                "EU REACH Annex XVII restricts specific aromatic amines above 30 mg/kg.",
    triggers: ["polyester", "nylon", "acrylic"],
  },
  flame_retardants: {
    name: "Halogenated Flame Retardants",
    severity: "high",
    sweatNote: "Prolonged skin contact during sleep increases cumulative dermal exposure.",
    citation: { authors:"CPSC 16 CFR Part 1615/1616", year:null, journal:"US CPSC",
                doi:"https://www.cpsc.gov/Business--Manufacturing/Business-Education/Flammability" },
    healthNote: "TCEP classified IARC Group 2A (probable human carcinogen). " +
                "Required in US non-fitted children's sleepwear.",
    triggers: ["flame-resistant"],
  },
  phthalates: {
    name: "Phthalates",
    severity: "mod",
    sweatNote: "Migrate more readily from elastic fabrics in warm, moist conditions.",
    citation: { authors:"REACH Annex XVII Entry 51", year:null, journal:"ECHA",
                doi:"https://echa.europa.eu/substances-restricted-under-reach" },
    healthNote: "Endocrine disruptors restricted under EU REACH Annex XVII (0.1% limit by weight).",
    // C-10 fix: elastane/spandex/lycra ONLY — NOT polyester or nylon.
    triggers: ["spandex", "elastane", "lycra"],
  },
  bpa: {
    name: "BPA / BPS",
    severity: "mod",
    sweatNote: "BPA leaching from polyester increases when skin temperature rises during exercise.",
    citation: { authors:"Rochester & Bolden", year:2015, journal:"Env Health Perspect",
                doi:"https://doi.org/10.1289/ehp.1408989" },
    healthNote: "Endocrine disruptor. Present in some polyester synthesis and finishing processes.",
    triggers: ["stain-resistant"],
  },
  antimony: {
    name: "Antimony Trioxide",
    severity: "mod",
    sweatNote: "Antimony migration from polyester textiles into sweat measured in laboratory studies (Biver et al. 2021).",
    citation: { authors:"Biver et al.", year:2021, journal:"Environ Pollution",
                doi:"https://doi.org/10.1016/j.envpol.2021.117878" },
    healthNote: "Catalyst in PET (polyester) synthesis, classified as possibly carcinogenic (IARC Group 2B).",
    triggers: ["polyester"],
  },
  heavy_metals: {
    name: "Heavy Metals in Dyes",
    severity: "mod",
    sweatNote: "Acidic sweat can leach lead, chromium, and cadmium from textile dyes.",
    citation: null,
    healthNote: "Lead, cadmium, and chromium VI accumulate in organs. Restricted under EU REACH Annex XVII.",
    triggers: [],
  },
  organotins: {
    name: "Organotins",
    severity: "mod",
    sweatNote: null,
    citation: { authors:"REACH Annex XVII Entry 20", year:null, journal:"ECHA",
                doi:"https://echa.europa.eu/substances-restricted-under-reach" },
    healthNote: "Organotin biocides in some antimicrobial treatments. Endocrine disruptors restricted under EU REACH.",
    triggers: ["antimicrobial", "anti-odor", "anti-mold"],
  },
  npes: {
    name: "Nonylphenol Ethoxylates (NPEs)",
    severity: "mod",
    sweatNote: null,
    citation: { authors:"REACH Annex XVII Entry 46", year:null, journal:"ECHA",
                doi:"https://echa.europa.eu/substances-restricted-under-reach" },
    healthNote: "Estrogenic surfactant residues from textile manufacturing. Restricted in EU.",
    triggers: [],
  },
  microplastics: {
    name: "Microplastic Shedding",
    severity: "mod",
    sweatNote: "Friction and moisture accelerate fiber shedding from synthetic fabrics.",
    citation: { authors:"De Falco et al.", year:2019, journal:"Sci Reports",
                doi:"https://doi.org/10.1038/s41598-019-43023-x" },
    healthNote: "Microplastic fibers shed during wear and washing. Detected in human blood, lungs, and placental tissue.",
    // Polyester, nylon, acrylic only — NOT spandex/elastane (aligns with D-6).
    triggers: ["polyester", "nylon", "acrylic"],
  },
  antimicrobial_biocides: {
    name: "Antimicrobial Biocides",
    severity: "mod",
    sweatNote: null,
    citation: { authors:"EU Biocidal Products Regulation 528/2012", year:2012, journal:"EUR-Lex",
                doi:"https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32012R0528" },
    healthNote: "Nano-silver and triclosan in anti-odor treatments. Thyroid disruption and ecotoxicity concerns.",
    triggers: ["antimicrobial", "anti-odor", "silver", "heiq", "polygiene"],
  },
};

// ── getGarmentChemicals ──────────────────────────────────────
export function getGarmentChemicals(product, v3trace = null) {
  // Option A: trace-driven (preferred path for V3 scans)
  if (v3trace?.flags?.length > 0 || v3trace?.disclosures?.length > 0) {
    const flagKeys = (v3trace.flags || []).map(f => f.chemical).filter(k => CHEMICAL_INFO[k]);
    const discKeys = (v3trace.disclosures || []).map(f => f.chemical).filter(k => CHEMICAL_INFO[k]);
    return [...new Set([...flagKeys, ...discKeys])];
  }

  // V2 fallback: fixed trigger lists (used for old scans / no V3 trace)
  const matStr   = (product.materials || []).map(m => (typeof m === "string" ? m : m.name || "").toLowerCase()).join(" ");
  const nameStr  = (product.product_name || product.name || "").toLowerCase();
  const claimStr = (product.finish_claims || []).map(f => (typeof f === "string" ? f : f.value || "").toLowerCase()).join(" ");
  const corpus   = [matStr, nameStr, claimStr].join(" ");
  const cat      = (product.category || "").toLowerCase();
  const found    = [];

  (product.chemicals || []).forEach(c => {
    const key = (typeof c === "string" ? c : c?.id || "").toLowerCase().replace(/[^a-z_]/g, "");
    if (CHEMICAL_INFO[key] && !found.includes(key)) found.push(key);
  });

  Object.entries(CHEMICAL_INFO).forEach(([key, info]) => {
    if (found.includes(key)) return;
    if (!info.triggers?.length) return;
    if (info.triggers.some(t => corpus.includes(t) || cat.includes(t))) found.push(key);
  });

  return [...new Set(found)];
}

// ── Garment type / category inference ────────────────────────
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
  athletic:  ["athletic","gym","sport","workout","running","compression","activewear"],
  casual:    ["casual","tee","t-shirt","shirt","shorts","jeans","pants"],
  outerwear: ["outerwear","jacket","coat","rain","waterproof","puff"],
  underwear: ["underwear","bra","boxer","intimate","brief","lingerie"],
  sleepwear: ["sleepwear","pajama","sleep","lounge","nightwear"],
  kids:      ["kids","baby","infant","toddler","children"],
};

export function getCategoryGroup(category) {
  const cat = (category || "").toLowerCase();
  for (const [group, terms] of Object.entries(CATEGORY_MAP)) {
    if (terms.some(t => cat.includes(t))) return group;
  }
  return "casual";
}

// ── Recommendations ───────────────────────────────────────────
export function getRecommendations(scannedProduct) {
  const targetGroup    = getCategoryGroup(scannedProduct.category);
  const scannedName    = scannedProduct.product_name || scannedProduct.name || "";
  const targetType     = getGarmentType(scannedName);
  const targetTypeGroup = targetType ? getTypeGroup(targetType) : null;
  const scannedBrand   = (scannedProduct.brand || "").toLowerCase();
  const scannedScore   = scannedProduct.score || 0;
  const candidates     = [];

  BRANDS.forEach(brand => {
    if (brand.confidence_tier === 4) return;
    if (brand.name.toLowerCase() === scannedBrand) return;
    if (brand.tier === "high_risk") return;
    brand.products?.forEach(p => {
      if (p.score <= scannedScore) return;
      if (p.score < 60) return;
      const pGroup     = getCategoryGroup(p.category);
      const pType      = getGarmentType(p.name);
      const pTypeGroup = pType ? getTypeGroup(pType) : null;
      const exactTypeMatch = targetType && pType === targetType;
      const groupMatch     = targetTypeGroup && pTypeGroup === targetTypeGroup;
      const categoryMatch  = pGroup === targetGroup;
      if (!exactTypeMatch && !groupMatch && !categoryMatch) return;
      candidates.push({
        name: p.name, brand: brand.name, score: p.score,
        price: p.price || null, materials: p.materials || "",
        matchScore: exactTypeMatch ? 3 : groupMatch ? 2 : 1,
        delta: p.score - scannedScore,
      });
    });
  });

  candidates.sort((a, b) => (b.matchScore - a.matchScore) || (b.score - a.score));
  return candidates.slice(0, 4);
}

// ── pickSplitAlternatives ─────────────────────────────────────
export function pickSplitAlternatives(recs, scannedPrice) {
  if (recs.length === 0) return { sameFit: null, samePrice: null };
  const sameFit = recs[0];
  let samePrice = null;
  if (scannedPrice) {
    const withPrice = recs.filter(r => r.price != null && r !== sameFit);
    withPrice.sort((a, b) => Math.abs(a.price - scannedPrice) - Math.abs(b.price - scannedPrice));
    samePrice = withPrice[0] || null;
  }
  if (!samePrice) samePrice = recs.find(r => r !== sameFit) || null;
  return { sameFit, samePrice };
}

// ── buildChemicalRows (for future surfaces, not currently used by ResultsPage) ──
export function buildChemicalRows(product, v3trace = null, category = null) {
  const ids = getGarmentChemicals(product, v3trace);
  return ids.map(key => {
    const info = CHEMICAL_INFO[key];
    return { name: info.name, severity: info.severity,
             equivalency: buildEquivalency(key, info, category),
             citation: info.citation || null };
  });
}

// ── buildEquivalency ─────────────────────────────────────────
// C-09 fix: PFAS Zheng 3,252x gated to Kids category only.
function buildEquivalency(key, info, category = null) {
  const isKids = (category || "").toLowerCase() === "kids";
  if (key === "pfas") {
    return h("span", null,
      "A ", h("em", { className:"cw-ital" }, "forever chemical"),
      " the EU is phasing out in consumer textiles by 2026. ",
      isKids
        ? h("strong", { style:{ fontWeight:500 } },
            "In children\u2019s textiles, sweat amplifies PFAS dermal absorption up to 3,252\u00d7 versus dry contact (Zheng et al. 2025).")
        : h("strong", { style:{ fontWeight:500 } },
            "Dermal absorption increases significantly under heat and sweat conditions.")
    );
  }
  if (key === "formaldehyde") return h("span", null, "The same compound used to ", h("em", { className:"cw-ital" }, "preserve lab specimens."), " ", h("strong", { style:{ fontWeight:500 } }, "Classified Group 1 carcinogen by IARC."));
  if (key === "bpa") return h("span", null, "A plasticizer that ", h("em", { className:"cw-ital" }, "mimics estrogen."), " ", h("strong", { style:{ fontWeight:500 } }, "Leaches faster when skin temperature rises."));
  if (key === "phthalates") return h("span", null, "Plasticizers that ", h("em", { className:"cw-ital" }, "disrupt hormone signalling."), " ", h("strong", { style:{ fontWeight:500 } }, "Linked to reproductive and developmental effects."));
  if (key === "antimony") return h("span", null, "Polyester production catalyst, ", h("em", { className:"cw-ital" }, "classified possibly carcinogenic"), " by IARC (Group 2B).");
  if (key === "microplastics") return h("span", null, "Synthetic fibers that ", h("em", { className:"cw-ital" }, "shed with friction"), " and have been detected in human blood and lung tissue.");
  if (key === "azo_dyes") return h("span", null, "Dyes that can release ", h("em", { className:"cw-ital" }, "carcinogenic aromatic amines"), " \u2014 banned in EU for skin-contact textiles (REACH Annex XVII).");
  if (key === "heavy_metals") return h("span", null, "Lead, chromium, and cadmium from textile dyes ", h("em", { className:"cw-ital" }, "leach with acidic sweat."));
  if (key === "flame_retardants") return h("span", null, "Halogenated flame retardants applied to children\u2019s sleepwear. TCEP is classified ", h("em", { className:"cw-ital" }, "probable human carcinogen"), " (IARC Group 2A).");
  if (key === "organotins") return h("span", null, "Organotin biocides in ", h("em", { className:"cw-ital" }, "antimicrobial fabric treatments."), " Endocrine disruptors restricted under EU REACH.");
  if (key === "npes") return h("span", null, "Estrogenic surfactant residues from ", h("em", { className:"cw-ital" }, "textile manufacturing processes."), " Restricted in EU.");
  if (key === "antimicrobial_biocides") return h("span", null, "Nano-silver and triclosan in \u2018anti-odor\u2019 treatments. Associated with ", h("em", { className:"cw-ital" }, "thyroid disruption"), " and ecotoxicity.");
  return info.healthNote;
}
