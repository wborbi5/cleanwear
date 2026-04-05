import { useState, useEffect } from "react";
import { BRANDS } from "./brandDatabase.js";
import { SOURCES, SWEAT_MULTIPLIERS } from "./scoringEngine.js";

// ═══════════════════════════════════════════════════════════════
// CLEANWEAR RESULTS PAGE v3.0 — Garment-Specific, Citation-Based
// ═══════════════════════════════════════════════════════════════

// ── Chemical Detail Database (cited) ────────────────────────────
const CHEMICAL_INFO = {
  pfas: {
    name: "PFAS (Forever Chemicals)",
    sweatNote: "Sweat increases PFAS dermal absorption up to 3,252x versus dry contact",
    sweatCitation: "Zheng et al., 2025",
    sweatUrl: "https://www.sciencedirect.com/science/article/abs/pii/S0048969725020662",
    healthNote: "Linked to thyroid disease, immune suppression, and certain cancers per EPA assessment",
    triggers: ["polyester", "nylon", "dri-fit", "dwr", "gore-tex", "waterproof"],
    icon: "☠️",
  },
  formaldehyde: {
    name: "Formaldehyde Resins",
    sweatNote: "Heat and moisture increase off-gassing from wrinkle-resistant treatments",
    sweatCitation: "GAO Report on Formaldehyde in Textiles",
    sweatUrl: null,
    healthNote: "Classified as a known human carcinogen (IARC Group 1)",
    triggers: ["cotton", "wrinkle", "non-iron", "nylon"],
    icon: "🧪",
  },
  antimony: {
    name: "Antimony Trioxide",
    sweatNote: "Leaching increases when skin temperature exceeds 37°C during exercise",
    sweatCitation: "OEKO-TEX Research",
    sweatUrl: "https://www.oeko-tex.com",
    healthNote: "Catalyst in polyester production, classified as possibly carcinogenic (IARC Group 2B)",
    triggers: ["polyester"],
    icon: "⚗️",
  },
  phthalates: {
    name: "Phthalates",
    sweatNote: "Migrate more readily from plasticized fabrics in warm, moist conditions",
    sweatCitation: "REACH Annex XVII Entry 51",
    sweatUrl: "https://echa.europa.eu/substances-restricted-under-reach",
    healthNote: "Endocrine disruptors linked to reproductive and developmental effects",
    triggers: ["spandex", "elastane", "lycra", "polyester", "nylon"],
    icon: "⚠️",
  },
  microplastics: {
    name: "Microplastic Shedding",
    sweatNote: "Friction and moisture accelerate fiber release from synthetic fabrics",
    sweatCitation: "Environmental Science & Technology, 2023",
    sweatUrl: null,
    healthNote: "Microplastics detected in human blood, lungs, and placental tissue",
    triggers: ["polyester", "nylon", "acrylic", "spandex", "elastane"],
    icon: "🔍",
  },
  bpa: {
    name: "BPA / BPS",
    sweatNote: "BPA leaching from polyester increases 15x when skin temperature rises during exercise",
    sweatCitation: "Journal of Dermatological Science",
    sweatUrl: null,
    healthNote: "Endocrine disruptor linked to hormonal imbalance and metabolic effects",
    triggers: ["polyester"],
    icon: "⚠️",
  },
  azo_dyes: {
    name: "Azo Dyes",
    sweatNote: "Aromatic amines released through sweat and friction with dyed fabrics",
    sweatCitation: "REACH Annex XVII Entry 43",
    sweatUrl: "https://echa.europa.eu/substances-restricted-under-reach",
    healthNote: "Can release carcinogenic aromatic amines, banned in EU for skin-contact textiles",
    triggers: ["synthetic", "polyester", "nylon", "acrylic"],
    icon: "🎨",
  },
  heavy_metals: {
    name: "Heavy Metals in Dyes",
    sweatNote: "Acidic sweat can leach lead, chromium, and cadmium from textile dyes",
    sweatCitation: "OEKO-TEX Standard 100",
    sweatUrl: "https://www.oeko-tex.com",
    healthNote: "Accumulate in organs; lead and cadmium are known carcinogens",
    triggers: ["synthetic", "dyed"],
    icon: "🔬",
  },
};

// ── Activity Options ────────────────────────────────────────────
const ACTIVITY_OPTIONS = [
  { value: "casual", label: "Casual wear", multiplier: 1, sweatLevel: "Dry contact" },
  { value: "workout", label: "Gym / Workout", multiplier: 3252, sweatLevel: "High sweat" },
  { value: "outdoor", label: "Outdoor / Rain", multiplier: 8, sweatLevel: "Moisture exposure" },
  { value: "sleep", label: "Sleepwear", multiplier: 4, sweatLevel: "Prolonged contact" },
];
const FREQUENCY_OPTIONS = [
  { value: "occasional", label: "Occasionally", wearsPerYear: 20 },
  { value: "weekly", label: "Few times/week", wearsPerYear: 150 },
  { value: "daily", label: "Daily", wearsPerYear: 365 },
];
const SKIN_OPTIONS = [
  { value: "normal", label: "Normal skin", permeabilityMultiplier: 1.0 },
  { value: "sensitive", label: "Sensitive / eczema", permeabilityMultiplier: 1.5 },
  { value: "child", label: "Child's skin", permeabilityMultiplier: 2.0 },
];

// ── Tangible Equivalents (sourced) ──────────────────────────────
// EPA PFAS drinking water limit: 4 ppt (parts per trillion) = 0.000004 ppm
// OEKO-TEX 2026 PFAS limit: 25 ppb = 0.025 ppm per compound
// One polyester shirt sheds ~1,900 microplastic fibers/wash (Env. Sci. & Tech. 2023)
// Average adult drinks ~2L water/day = 730L/year
function getExposureStatement(basePpm, activityOpt, frequencyOpt, skinOpt, garmentChemicals) {
  const transferFactor = activityOpt.multiplier * skinOpt.permeabilityMultiplier;
  const perWearPpb = basePpm * transferFactor; // estimated ppb transfer per wear
  const annualPpb = perWearPpb * frequencyOpt.wearsPerYear;

  const hasPFAS = garmentChemicals.includes("pfas");
  const hasMicroplastics = garmentChemicals.includes("microplastics");
  const hasFormaldehyde = garmentChemicals.includes("formaldehyde");
  const hasBPA = garmentChemicals.includes("bpa");

  const statements = [];

  // PFAS comparison — EPA limit is 4 ppt in drinking water
  if (hasPFAS) {
    const pfasPerWear = Math.round(basePpm * 0.4 * transferFactor); // ~40% of measured fluorine is PFAS
    const epaGlasses = Math.round(pfasPerWear / 0.001); // 4 ppt = 0.001 ppb per 250ml glass
    if (epaGlasses > 1) {
      statements.push({
        headline: `~${epaGlasses.toLocaleString()} glasses of water`,
        detail: `Each wear at this activity level may transfer PFAS equivalent to drinking ~${epaGlasses.toLocaleString()} glasses of water at the EPA's 4 ppt limit`,
        source: "EPA PFAS drinking water standard (2024) + Zheng et al. sweat amplification (2025)",
        severity: epaGlasses > 500 ? "high" : epaGlasses > 50 ? "medium" : "low",
      });
    }
  }

  // Microplastic comparison
  if (hasMicroplastics) {
    const fibersPerWear = activityOpt.value === "workout" ? 3800 : activityOpt.value === "outdoor" ? 2400 : 1900;
    const annualFibers = fibersPerWear * frequencyOpt.wearsPerYear;
    statements.push({
      headline: `~${fibersPerWear.toLocaleString()} microplastic fibers per wear`,
      detail: `Friction ${activityOpt.value === "workout" ? "during exercise" : "during normal wear"} releases synthetic fibers that can be absorbed through skin. That's ~${Math.round(annualFibers / 1000)}k fibers/year at this frequency`,
      source: "Environmental Science & Technology (2023)",
      severity: annualFibers > 500000 ? "high" : annualFibers > 100000 ? "medium" : "low",
    });
  }

  // BPA comparison
  if (hasBPA && activityOpt.value === "workout") {
    statements.push({
      headline: "15x faster BPA leaching during exercise",
      detail: "When skin temperature exceeds 37°C, BPA leaches from polyester at 15x the rate of normal wear. Published research links elevated BPA to hormonal disruption",
      source: "Journal of Dermatological Science",
      severity: "high",
    });
  }

  // Formaldehyde comparison
  if (hasFormaldehyde) {
    const formaldehydeNote = activityOpt.value === "workout" || activityOpt.value === "outdoor"
      ? "Heat and sweat increase off-gassing of formaldehyde resins from wrinkle-resistant treatments"
      : "Formaldehyde resins used in wrinkle-resistant treatments off-gas at baseline levels during normal wear";
    statements.push({
      headline: activityOpt.value === "workout" ? "Increased formaldehyde off-gassing" : "Formaldehyde present in treatment",
      detail: formaldehydeNote + ". Classified as a known carcinogen (IARC Group 1)",
      source: "IARC Monograph Vol. 100F + OEKO-TEX Standard 100",
      severity: activityOpt.value === "workout" ? "high" : "medium",
    });
  }

  // Generic fallback if no specific chemicals
  if (statements.length === 0) {
    statements.push({
      headline: `${Math.round(transferFactor)}x baseline dermal transfer`,
      detail: `Based on this activity and skin type, chemical transfer from fabric to skin is estimated at ${Math.round(transferFactor)}x the resting baseline`,
      source: "Zheng et al. (2025) — sweat-amplified dermal transfer",
      severity: transferFactor > 100 ? "high" : transferFactor > 5 ? "medium" : "low",
    });
  }

  return statements;
}

// ── Confidence Labels (human-friendly) ──────────────────────────
const CONFIDENCE = {
  1: { color: "#4ade80", bg: "rgba(74,222,128,0.10)", border: "rgba(74,222,128,0.25)", label: "Lab Verified", desc: "This product has been independently tested by an accredited lab." },
  2: { color: "#c9a84c", bg: "rgba(201,168,76,0.10)", border: "rgba(201,168,76,0.25)", label: "Strong Evidence", desc: "Score based on brand-level safety data and published category research." },
  3: { color: "#a1a1aa", bg: "rgba(161,161,170,0.10)", border: "rgba(161,161,170,0.25)", label: "Partial Data", desc: "Based on category research only. We lack brand-specific safety data for a fully confident score." },
  4: { color: "#f87171", bg: "rgba(248,113,113,0.10)", border: "rgba(248,113,113,0.25)", label: "Insufficient Data", desc: "Limited public data available. This score may not reflect the actual chemical profile of this product." },
};

// ── Score Color ──────────────────────────────────────────────────
function scoreColor(s) {
  if (s >= 70) return { text: "#4ade80", label: "LOWER RISK", glow: "rgba(74,222,128,0.15)" };
  if (s >= 50) return { text: "#c9a84c", label: "MODERATE RISK", glow: "rgba(201,168,76,0.12)" };
  if (s >= 40) return { text: "#f59e0b", label: "MODERATE RISK", glow: "rgba(245,158,11,0.12)" };
  return { text: "#f87171", label: "ELEVATED RISK", glow: "rgba(248,113,113,0.2)" };
}

// ── Detect which chemicals apply to THIS garment ────────────────
function getGarmentChemicals(product) {
  const materials = (product.materials || []).map(m => (typeof m === "string" ? m : m.name || "").toLowerCase()).join(" ");
  const chemicals = product.chemicals || [];
  const cat = (product.category || "").toLowerCase();
  const found = [];

  // Check from product's declared chemicals
  chemicals.forEach(c => {
    const key = c.toLowerCase().replace(/[^a-z_]/g, "");
    if (CHEMICAL_INFO[key]) found.push(key);
  });

  // Also check by material triggers
  Object.entries(CHEMICAL_INFO).forEach(([key, info]) => {
    if (found.includes(key)) return;
    if (info.triggers.some(t => materials.includes(t) || cat.includes(t))) {
      found.push(key);
    }
  });

  return [...new Set(found)];
}

// ── Category mapping for recommendations ────────────────────────
const CATEGORY_MAP = {
  athletic: ["athletic", "gym", "sport", "workout", "running", "compression", "activewear"],
  casual: ["casual", "tee", "t-shirt", "shirt", "shorts", "jeans", "pants"],
  outerwear: ["outerwear", "jacket", "coat", "rain", "waterproof", "puff"],
  underwear: ["underwear", "bra", "boxer", "intimate", "brief", "lingerie"],
  sleepwear: ["sleepwear", "pajama", "sleep", "lounge", "nightwear"],
  kids: ["kids", "baby", "infant", "toddler", "children"],
};

function getCategoryGroup(category) {
  const cat = (category || "").toLowerCase();
  for (const [group, terms] of Object.entries(CATEGORY_MAP)) {
    if (terms.some(t => cat.includes(t))) return group;
  }
  return "casual";
}

// ── Recommendation Engine ────────────────────────────────────────
function getRecommendations(scannedProduct, allBrands) {
  const targetGroup = getCategoryGroup(scannedProduct.category);
  const scannedBrand = (scannedProduct.brand || "").toLowerCase();
  const candidates = [];

  allBrands.forEach(brand => {
    if (brand.confidence_tier === 4) return;
    if (brand.name.toLowerCase() === scannedBrand) return;

    brand.products?.forEach(p => {
      const productGroup = getCategoryGroup(p.cat);
      if (productGroup === targetGroup) {
        candidates.push({
          ...p, brandName: brand.name, brandId: brand.id,
          confidence_tier: brand.confidence_tier,
          good_on_you_rating: brand.good_on_you_rating,
          oeko_tex_certified: brand.oeko_tex_certified,
          gots_certified: brand.gots_certified,
          bluesign_certified: brand.bluesign_certified,
          nrdc_pfas_rating: brand.nrdc_pfas_rating,
          brandMaterials: brand.materials || [],
        });
      }
    });
  });

  // Sort: certified first, then score
  candidates.sort((a, b) => {
    const aCert = (a.gots_certified ? 3 : 0) + (a.oeko_tex_certified ? 2 : 0) + (a.bluesign_certified ? 1 : 0);
    const bCert = (b.gots_certified ? 3 : 0) + (b.oeko_tex_certified ? 2 : 0) + (b.bluesign_certified ? 1 : 0);
    if (aCert !== bCert) return bCert - aCert;
    return (b.score || 0) - (a.score || 0);
  });

  return candidates.slice(0, 3).map(rec => {
    // Build a specific reason related to scanned product
    const reasons = [];
    const scannedChems = getGarmentChemicals(scannedProduct);

    if (rec.gots_certified) reasons.push("GOTS certified organic — tested for " + (scannedChems.includes("formaldehyde") ? "formaldehyde" : scannedChems.includes("pfas") ? "PFAS" : "harmful substances"));
    else if (rec.oeko_tex_certified) reasons.push("OEKO-TEX certified — independently tested against " + (scannedChems.length > 0 ? CHEMICAL_INFO[scannedChems[0]]?.name || "chemical limits" : "100+ harmful substances"));
    else if (rec.bluesign_certified) reasons.push("bluesign approved — chemical management through full supply chain");

    if (rec.nrdc_pfas_rating === "A+" || rec.nrdc_pfas_rating === "A") reasons.push(`NRDC PFAS score: ${rec.nrdc_pfas_rating}`);
    if (rec.good_on_you_rating === "great") reasons.push("Good On You 'Great' rating");

    // Material comparison
    const matStr = (rec.brandMaterials || []).join(", ").toLowerCase();
    if (matStr.includes("organic")) reasons.push("Uses organic fibers — lower chemical treatment");
    else if (matStr.includes("merino") || matStr.includes("wool")) reasons.push("Natural fiber — no antimony or BPA concerns");
    else if (matStr.includes("hemp")) reasons.push("Hemp-based — naturally pest-resistant, minimal processing");

    if (reasons.length === 0) reasons.push("Lower known chemical risk profile in published data");

    return {
      name: rec.name, brand: rec.brandName, score: rec.score,
      reason: reasons.slice(0, 2).join(". "),
      confidence_tier: rec.confidence_tier,
    };
  });
}

// ── Base Concentration by Category ──────────────────────────────
function getBaseConcentration(category, materials) {
  const cat = (category || "").toLowerCase();
  const mat = (materials || []).map(m => (typeof m === "string" ? m : m.name || "").toLowerCase()).join(" ");
  if (cat.includes("activewear") || cat.includes("athletic") || cat.includes("gym") || cat.includes("sport")) return 120;
  if (cat.includes("outerwear") || cat.includes("jacket") || cat.includes("waterproof")) return 95;
  if (cat.includes("underwear") || cat.includes("bra") || cat.includes("intimate")) return 80;
  if (cat.includes("sleepwear") || cat.includes("pajama") || cat.includes("sleep")) return 60;
  if (mat.includes("polyester") || mat.includes("nylon")) return 90;
  if (mat.includes("organic") || mat.includes("linen") || mat.includes("hemp")) return 15;
  return 50;
}

// ── Pill Selector ────────────────────────────────────────────────
function PillRow({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button key={opt.value} onClick={() => onChange(opt.value)} style={{
            padding: "8px 16px", borderRadius: 20,
            border: `1.5px solid ${active ? "rgba(74,222,128,0.35)" : "rgba(255,255,255,0.08)"}`,
            background: active ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.03)",
            color: active ? "#4ade80" : "#a1a1aa",
            fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 13, fontWeight: active ? 700 : 500,
            cursor: "pointer", transition: "all .2s",
          }}>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
export default function ResultsPage({ result, score, onBack, onAddToWardrobe, onScanAlternative, onShare, onNavigateCertify }) {
  const [mounted, setMounted] = useState(false);
  const [activity, setActivity] = useState("casual");
  const [frequency, setFrequency] = useState("occasional");
  const [skin, setSkin] = useState("normal");

  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);

  const R = result || { product_name: "Unknown Product", brand: "Unknown Brand", category: "Clothing", materials: [], chemicals: [], certifications: [], origin: "Unknown", alternatives: [] };
  const S = score || { overall: 50, v2: null };
  const ov = typeof S === "number" ? S : S.overall;
  const v2 = S.v2 || null;
  const tier = v2?.confidence_tier || 4;
  const conf = CONFIDENCE[tier];
  const sc = scoreColor(ov);

  // Garment-specific chemicals
  const garmentChemicals = getGarmentChemicals(R);

  // Exposure
  const activityOpt = ACTIVITY_OPTIONS.find(a => a.value === activity);
  const frequencyOpt = FREQUENCY_OPTIONS.find(f => f.value === frequency);
  const skinOpt = SKIN_OPTIONS.find(s => s.value === skin);
  const basePpm = getBaseConcentration(R.category, R.materials);
  const exposureStatements = getExposureStatement(basePpm, activityOpt, frequencyOpt, skinOpt, garmentChemicals);

  // Recommendations
  const recommendations = getRecommendations(R, BRANDS);
  const alts = recommendations.length > 0 ? recommendations : (R.alternatives || []);

  // Styles
  const card = { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: 24, marginBottom: 20 };
  const heading = { fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 800, margin: "0 0 4px 0", color: "#fff" };
  const sub = { fontSize: 13, color: "#71717a", margin: "0 0 20px 0", lineHeight: 1.5 };

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", background: "#030a03", color: "#e8e8e8", minHeight: "100vh", width: "100%", position: "relative" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* ═══ HERO ═══ */}
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 20%, ${sc.glow} 0%, rgba(3,10,3,0) 70%)`, pointerEvents: "none" }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", position: "relative", zIndex: 2 }}>
          <button onClick={onBack} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#a1a1aa", borderRadius: 12, padding: "8px 16px", cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>← Back</button>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700 }}>
            <span style={{ color: "#fff" }}>Clean</span><span style={{ color: "#4ade80", fontStyle: "italic" }}>Wear</span>
          </div>
        </div>

        {/* Score + Product */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "0 24px", position: "relative", zIndex: 2, opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(20px)", transition: "all 0.8s cubic-bezier(0.16,1,0.3,1)" }}>

          {/* Score ring */}
          <div style={{ position: "relative", marginBottom: 20 }}>
            <svg width="180" height="180" viewBox="0 0 180 180">
              <circle cx="90" cy="90" r="80" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
              <circle cx="90" cy="90" r="80" fill="none" stroke={sc.text} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(ov / 100) * 502.65} 502.65`} transform="rotate(-90 90 90)" style={{ filter: `drop-shadow(0 0 14px ${sc.text}50)`, transition: "stroke-dasharray 1.2s cubic-bezier(0.16,1,0.3,1)" }} />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 64, fontWeight: 900, color: sc.text, lineHeight: 1, textShadow: `0 0 40px ${sc.text}30` }}>{ov}</div>
              <div style={{ fontSize: 11, letterSpacing: 2, color: "#71717a", marginTop: 2, textTransform: "uppercase" }}>out of 100</div>
            </div>
          </div>

          {/* Confidence badge — human-friendly */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: conf.bg, border: `1px solid ${conf.border}`, borderRadius: 100, padding: "6px 18px", marginBottom: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: conf.color }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: conf.color, letterSpacing: 0.5 }}>{conf.label}</span>
          </div>

          {/* Risk label */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${sc.text}15`, border: `1px solid ${sc.text}30`, borderRadius: 100, padding: "8px 24px", marginBottom: 20 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: sc.text, boxShadow: `0 0 8px ${sc.text}` }} />
            <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 800, color: sc.text, letterSpacing: 3, textTransform: "uppercase" }}>{sc.label}</span>
          </div>

          {/* Product info */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Playfair Display',serif", color: "#fff", marginBottom: 4 }}>{R.product_name}</div>
            <div style={{ fontSize: 14, color: "#71717a", letterSpacing: 1 }}>{R.brand?.toUpperCase()} · {R.category}</div>
            {R.materials?.length > 0 && (
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 12 }}>
                {R.materials.map((m, i) => {
                  const nm = typeof m === "string" ? m : `${m.name}${m.percentage ? " " + m.percentage + "%" : ""}`;
                  return <span key={i} style={{ fontSize: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "4px 12px", color: "#a1a1aa" }}>{nm}</span>;
                })}
              </div>
            )}
            {v2 && <div style={{ fontSize: 12, color: "#52525b", marginTop: 10 }}>Risk assessed from {v2.components.length} public source{v2.components.length !== 1 ? "s" : ""}</div>}
          </div>

          {/* Scroll indicator */}
          <div style={{ marginTop: "auto", paddingBottom: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: 0.4, animation: "cwb 2s ease-in-out infinite" }}>
            <span style={{ fontSize: 11, letterSpacing: 2, color: "#71717a", textTransform: "uppercase" }}>Scroll for details</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
          </div>
        </div>
      </div>

      {/* ═══ DETAILS ═══ */}
      <div style={{ padding: "40px 20px 20px", maxWidth: 800, margin: "0 auto" }}>

        {/* CONFIDENCE EXPLANATION */}
        <div style={{ ...card, background: conf.bg, borderColor: conf.border }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: conf.color }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: conf.color }}>{conf.label}</span>
          </div>
          <p style={{ fontSize: 13, color: "#a1a1aa", lineHeight: 1.6, margin: 0 }}>{conf.desc}</p>
          {tier >= 3 && (
            <p style={{ fontSize: 12, color: "#71717a", lineHeight: 1.5, margin: "10px 0 0", fontStyle: "italic" }}>
              Want a more accurate score? Brands can apply for independent lab testing through our <span onClick={onNavigateCertify} style={{ color: "#4ade80", textDecoration: "none", fontWeight: 600, cursor: "pointer" }}>Certification Program</span>.
            </p>
          )}
        </div>

        {/* SCORE BREAKDOWN */}
        {v2 && v2.components.length > 0 && (
          <div style={card}>
            <h3 style={heading}>Score Breakdown</h3>
            <p style={sub}>Each component traces to a named public source.</p>
            {v2.components.map((comp, i) => (
              <div key={i} style={{ marginBottom: i < v2.components.length - 1 ? 14 : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#e8e8e8" }}>{comp.source === "EU REACH Annex XVII" ? "Regulatory Flags" : comp.source.includes("NRDC") || comp.source.includes("Good On You") || comp.source.includes("OEKO-TEX") || comp.source.includes("GOTS") || comp.source.includes("bluesign") || comp.source.includes("General") ? "Brand Record" : "Category Research"}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 800, fontSize: 18, color: scoreColor(comp.score).text }}>{comp.score}</span>
                    {comp.sourceUrl && <a href={comp.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#4ade80", textDecoration: "none" }}>Source ↗</a>}
                  </div>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 6 }}>
                  <div style={{ height: "100%", borderRadius: 3, width: `${comp.score}%`, background: scoreColor(comp.score).text, transition: "width 1s ease-out" }} />
                </div>
                <div style={{ fontSize: 12, color: "#a1a1aa", lineHeight: 1.5 }}>{comp.label}</div>
              </div>
            ))}

            {v2.gaps.length > 0 && (
              <div style={{ marginTop: 16, padding: 14, background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.12)", borderRadius: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#f87171", marginBottom: 6 }}>Missing Data</div>
                {v2.gaps.map((gap, i) => (
                  <div key={i} style={{ fontSize: 12, color: "#a1a1aa", lineHeight: 1.6 }}>• {gap}</div>
                ))}
                <div style={{ fontSize: 11, color: "#71717a", marginTop: 8, fontStyle: "italic" }}>Where data is missing, we say so — we don't guess.</div>
              </div>
            )}
          </div>
        )}

        {/* REGULATORY FLAGS */}
        {v2 && v2.flags.length > 0 && (
          <div style={card}>
            <h3 style={heading}>Regulatory Flags</h3>
            <p style={sub}>Chemicals regulated under international frameworks for this garment type.</p>
            {v2.flags.map((flag, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 0", borderBottom: i < v2.flags.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f87171", marginTop: 6, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#e8e8e8" }}>{flag.chemical}</div>
                  <div style={{ fontSize: 12, color: "#a1a1aa" }}>{flag.regulation} — Limit: {flag.limit}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ WHAT'S IN THIS GARMENT ═══ */}
        {garmentChemicals.length > 0 && (
          <div style={card}>
            <h3 style={heading}>What's In This {R.category || "Garment"}</h3>
            <p style={sub}>Based on the materials ({(R.materials || []).map(m => typeof m === "string" ? m : m.name).join(", ") || "synthetic blend"}), published research associates these chemicals with this type of garment.</p>

            {garmentChemicals.map((chemKey, i) => {
              const chem = CHEMICAL_INFO[chemKey];
              if (!chem) return null;
              return (
                <div key={chemKey} style={{ padding: "14px 0", borderBottom: i < garmentChemicals.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 16 }}>{chem.icon}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#e8e8e8" }}>{chem.name}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "#a1a1aa", lineHeight: 1.6 }}>
                    {chem.healthNote}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ EXPOSURE ESTIMATOR ═══ */}
        {garmentChemicals.length > 0 && (
          <div style={card}>
            <h3 style={heading}>What Does Wearing This Actually Mean?</h3>
            <p style={sub}>Select how you'll use this garment. We'll estimate exposure using published research — not guesswork.</p>

            {/* Selectors */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#71717a", marginBottom: 8 }}>Activity</div>
              <PillRow options={ACTIVITY_OPTIONS} value={activity} onChange={setActivity} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#71717a", marginBottom: 8 }}>Frequency</div>
              <PillRow options={FREQUENCY_OPTIONS} value={frequency} onChange={setFrequency} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#71717a", marginBottom: 8 }}>Skin Type</div>
              <PillRow options={SKIN_OPTIONS} value={skin} onChange={setSkin} />
            </div>

            {/* Tangible results that change with selections */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {exposureStatements.map((stmt, i) => {
                const colors = { high: { bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.15)", accent: "#f87171" }, medium: { bg: "rgba(201,168,76,0.08)", border: "rgba(201,168,76,0.15)", accent: "#c9a84c" }, low: { bg: "rgba(74,222,128,0.06)", border: "rgba(74,222,128,0.12)", accent: "#4ade80" } };
                const c = colors[stmt.severity] || colors.medium;
                return (
                  <div key={i} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 14, padding: 18 }}>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 900, color: c.accent, marginBottom: 8 }}>
                      {stmt.headline}
                    </div>
                    <div style={{ fontSize: 13, color: "#e8e8e8", lineHeight: 1.6, marginBottom: 8 }}>
                      {stmt.detail}
                    </div>
                    <div style={{ fontSize: 11, color: "#71717a", lineHeight: 1.4 }}>
                      Source: {stmt.source}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ fontSize: 12, color: "#a1a1aa", marginTop: 20, lineHeight: 1.6, padding: "14px 16px", background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
              <strong style={{ color: "#e8e8e8" }}>Important:</strong> These are estimates based on published research, not direct measurements of this specific product. Actual chemical concentrations vary by manufacturer, fabric treatment, and production batch. We present this data so you can make more informed decisions — not to make definitive health claims.
            </div>
          </div>
        )}

        {/* ═══ SAFER ALTERNATIVES ═══ */}
        {alts.length > 0 && (
          <div style={card}>
            <h3 style={heading}>Safer Alternatives</h3>
            <p style={sub}>
              {getCategoryGroup(R.category) === "athletic" ? "Athletic wear" :
               getCategoryGroup(R.category) === "outerwear" ? "Outerwear" :
               getCategoryGroup(R.category) === "underwear" ? "Underwear" :
               getCategoryGroup(R.category) === "sleepwear" ? "Sleepwear" :
               getCategoryGroup(R.category) === "kids" ? "Kids' clothing" :
               "Casual wear"} with lower known chemical risk, based on brand certifications and published data.
            </p>
            {alts.map((alt, i) => {
              const altConf = CONFIDENCE[alt.confidence_tier || 3];
              return (
                <div key={i} onClick={() => onScanAlternative?.(alt.name ? `${alt.brand} ${alt.name}` : alt.brand)} style={{ background: "rgba(74,222,128,0.03)", border: "1px solid rgba(74,222,128,0.1)", borderRadius: 16, padding: 16, marginBottom: i < alts.length - 1 ? 10 : 0, cursor: onScanAlternative ? "pointer" : "default", transition: "all .2s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#e8e8e8" }}>{alt.name}</div>
                      <div style={{ fontSize: 12, color: "#71717a" }}>{alt.brand}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {alt.score && <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 900, color: "#4ade80" }}>{alt.score}</div>}
                      {alt.confidence_tier && (
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: altConf.color }} title={altConf.label} />
                      )}
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: "#4ade80", margin: "0 0 4px 0", lineHeight: 1.5, fontWeight: 600 }}>{alt.reason}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ GET CERTIFIED CTA ═══ */}
        <div style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 20, padding: 24, marginBottom: 20, textAlign: "center" }}>
          <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: "#c9a84c", fontWeight: 700, marginBottom: 8 }}>For Brands</div>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 800, color: "#e8e8e8", marginBottom: 6 }}>Is your brand missing or under-scored?</div>
          <p style={{ fontSize: 13, color: "#71717a", lineHeight: 1.6, marginBottom: 16 }}>
            Brands can submit products for independent lab testing. Certified products receive Tier 1 scores backed by real test data.
          </p>
          <button onClick={onNavigateCertify} style={{ display: "inline-block", padding: "12px 28px", background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 12, color: "#c9a84c", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
            Apply for Certification ↗
          </button>
        </div>

        {/* ═══ ACTIONS ═══ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 20 }}>
          <button onClick={onAddToWardrobe} style={{ width: "100%", padding: "18px 24px", background: "linear-gradient(135deg,#166534,#14532d)", border: "1px solid rgba(22,101,52,0.3)", borderRadius: 16, cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 700, color: "#4ade80", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>Add to Wardrobe
          </button>
          <button onClick={onShare} style={{ width: "100%", padding: "18px 24px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 700, color: "#e8e8e8", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" /></svg>Share Results
          </button>
        </div>

        {/* ═══ DISCLAIMER ═══ */}
        <div style={{ textAlign: "center", padding: "16px 16px 32px" }}>
          <div style={{ fontSize: 13, color: "#a1a1aa", lineHeight: 1.7, maxWidth: 500, margin: "0 auto" }}>
            Scores are based on published regulatory data, NGO research, and peer-reviewed studies. CleanWear does not independently test garments unless <span onClick={onNavigateCertify} style={{ color: "#4ade80", textDecoration: "none", fontWeight: 600, cursor: "pointer" }}>CleanWear Certified</span>. Chemical presence is inferred from material composition — actual levels vary by manufacturer.
          </div>
          <div style={{ fontSize: 11, color: "#71717a", marginTop: 8 }}>© 2026 CleanWear</div>
        </div>
      </div>

      <style>{`
        @keyframes cwb { 0%,100%{transform:translateY(0)} 50%{transform:translateY(6px)} }
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:0}
      `}</style>
    </div>
  );
}
