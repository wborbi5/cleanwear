import { useState, useEffect } from "react";
import { BRANDS } from "./brandDatabase.js";
import { SOURCES, SWEAT_MULTIPLIERS } from "./scoringEngine.js";

// ═══════════════════════════════════════════════════════════════
// CLEANWEAR RESULTS PAGE v2.0 — Citation-Based Architecture
// ═══════════════════════════════════════════════════════════════

// ── Exposure Calculator Options ──────────────────────────────
const ACTIVITY_OPTIONS = [
  { value: "casual", label: "Casual wear", multiplier: 1, sweatLevel: "Dry contact" },
  { value: "workout", label: "Gym / Workout", multiplier: 3252, sweatLevel: "High sweat" },
  { value: "outdoor", label: "Outdoor / Rain", multiplier: 8, sweatLevel: "Moisture exposure" },
  { value: "sleep", label: "Sleepwear", multiplier: 4, sweatLevel: "Prolonged contact" },
];
const FREQUENCY_OPTIONS = [
  { value: "occasional", label: "Occasionally", wearsPerYear: 20 },
  { value: "weekly", label: "Few times a week", wearsPerYear: 150 },
  { value: "daily", label: "Daily", wearsPerYear: 365 },
];
const SKIN_OPTIONS = [
  { value: "normal", label: "Normal skin", permeabilityMultiplier: 1.0 },
  { value: "sensitive", label: "Sensitive / eczema", permeabilityMultiplier: 1.5 },
  { value: "child", label: "Child's skin", permeabilityMultiplier: 2.0 },
];

function calculateExposure(baseConcentrationPpm, activity, frequency, skin) {
  const absorbed = baseConcentrationPpm * activity.multiplier * skin.permeabilityMultiplier;
  const annualExposure = absorbed * frequency.wearsPerYear;
  return {
    perWear: absorbed,
    annual: annualExposure,
    baselineMultiple: Math.round(activity.multiplier * skin.permeabilityMultiplier),
    methodology: `Based on ${activity.sweatLevel} sweat amplification (Zheng et al., 2025) at standard skin permeability 37°C`,
    citation: SOURCES.ZHENG_2025.url,
  };
}

// ── Confidence Badge ─────────────────────────────────────────
const TIER_STYLES = {
  1: { color: "#4ade80", bg: "rgba(74,222,128,0.12)", border: "rgba(74,222,128,0.3)", label: "Lab Tested" },
  2: { color: "#c9a84c", bg: "rgba(201,168,76,0.12)", border: "rgba(201,168,76,0.3)", label: "Brand + Category Data" },
  3: { color: "#a1a1aa", bg: "rgba(161,161,170,0.12)", border: "rgba(161,161,170,0.3)", label: "Category Data Only" },
  4: { color: "#f87171", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.3)", label: "Data Gap" },
};

// ── Score Color ──────────────────────────────────────────────
function scoreColor(s) {
  if (s >= 70) return { text: "#16a34a", label: "LOWER RISK", glow: "rgba(22,163,74,0.12)" };
  if (s >= 50) return { text: "#ca8a04", label: "MODERATE RISK", glow: "rgba(202,138,4,0.1)" };
  if (s >= 40) return { text: "#c9a84c", label: "MODERATE RISK", glow: "rgba(201,168,76,0.15)" };
  return { text: "#f87171", label: "ELEVATED RISK", glow: "rgba(248,113,113,0.25)" };
}

function getTheme(score) {
  const dark = score < 50;
  return {
    dark,
    bg: dark ? "#030a03" : "#fafaf7",
    cardBg: dark ? "rgba(255,255,255,0.02)" : "#ffffff",
    cardBorder: dark ? "rgba(255,255,255,0.06)" : "#e2e8e0",
    text: dark ? "#e8e8e8" : "#1a2e1a",
    textSub: dark ? "#a1a1aa" : "#666666",
    textMuted: dark ? "#71717a" : "#999999",
    textFaint: dark ? "#52525b" : "#bbbbbb",
    heading: dark ? "#ffffff" : "#1a1a1a",
    backBtnBg: dark ? "rgba(255,255,255,0.06)" : "#ffffff",
    backBtnBorder: dark ? "rgba(255,255,255,0.1)" : "#e2e8e0",
    backBtnColor: dark ? "#a1a1aa" : "#666666",
    tagBg: dark ? "rgba(255,255,255,0.06)" : "#f6f9f4",
    tagBorder: dark ? "rgba(255,255,255,0.08)" : "#e2e8e0",
    tagColor: dark ? "#a1a1aa" : "#3a5c3a",
    altBg: dark ? "rgba(74,222,128,0.04)" : "#f2faf2",
    altBorder: dark ? "rgba(74,222,128,0.12)" : "#dcf5dc",
    altScoreColor: dark ? "#4ade80" : "#16a34a",
    btnPrimaryBg: dark ? "linear-gradient(135deg,#166534,#14532d)" : "linear-gradient(135deg,#16a34a,#15803d)",
    btnPrimaryColor: dark ? "#4ade80" : "#ffffff",
    btnSecBg: dark ? "rgba(255,255,255,0.04)" : "#ffffff",
    btnSecBorder: dark ? "rgba(255,255,255,0.1)" : "#e2e8e0",
    btnSecColor: dark ? "#ffffff" : "#1a2e1a",
    pillBg: dark ? "rgba(255,255,255,0.04)" : "#f6f9f4",
    pillBorder: dark ? "rgba(255,255,255,0.08)" : "#e2e8e0",
    pillActiveBg: dark ? "rgba(74,222,128,0.12)" : "#dcfce7",
    pillActiveBorder: dark ? "rgba(74,222,128,0.3)" : "#86efac",
    pillActiveColor: dark ? "#4ade80" : "#166534",
  };
}

// ── Base Concentration by Category ───────────────────────────
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

// ── Recommendation Engine ────────────────────────────────────
function getRecommendations(scannedProduct, allBrands) {
  const cat = (scannedProduct.category || "Casual").toLowerCase();
  const candidates = [];

  allBrands.forEach(brand => {
    if (brand.confidence_tier === 4) return;
    brand.products?.forEach(p => {
      const pCat = (p.cat || "").toLowerCase();
      // Match same category or "casual" as fallback
      if (pCat === cat || pCat.includes(cat) || cat.includes(pCat) || pCat === "casual") {
        candidates.push({ ...p, brandName: brand.name, brandId: brand.id, brandTier: brand.tier, confidence_tier: brand.confidence_tier, good_on_you_rating: brand.good_on_you_rating, oeko_tex_certified: brand.oeko_tex_certified, gots_certified: brand.gots_certified, bluesign_certified: brand.bluesign_certified, nrdc_pfas_rating: brand.nrdc_pfas_rating });
      }
    });
  });

  // Sort: certified first, then by score descending
  candidates.sort((a, b) => {
    const aCert = (a.gots_certified ? 3 : 0) + (a.oeko_tex_certified ? 2 : 0) + (a.bluesign_certified ? 1 : 0);
    const bCert = (b.gots_certified ? 3 : 0) + (b.oeko_tex_certified ? 2 : 0) + (b.bluesign_certified ? 1 : 0);
    if (aCert !== bCert) return bCert - aCert;
    return (b.score || 0) - (a.score || 0);
  });

  // Take top 3, skip current brand's products
  const scannedBrand = (scannedProduct.brand || "").toLowerCase();
  const results = candidates
    .filter(c => c.brandName.toLowerCase() !== scannedBrand)
    .slice(0, 3);

  return results.map(rec => {
    const reasons = [];
    if (rec.gots_certified) reasons.push("GOTS certified");
    if (rec.oeko_tex_certified) reasons.push("OEKO-TEX certified");
    if (rec.bluesign_certified) reasons.push("bluesign certified");
    if (rec.good_on_you_rating === "great") reasons.push("Good On You 'Great' rating");
    if (rec.good_on_you_rating === "good") reasons.push("Good On You 'Good' rating");
    if (rec.nrdc_pfas_rating === "A+" || rec.nrdc_pfas_rating === "A") reasons.push(`NRDC PFAS rating: ${rec.nrdc_pfas_rating}`);
    if (reasons.length === 0) reasons.push("Lower known chemical risk profile");

    return {
      name: rec.name,
      brand: rec.brandName,
      score: rec.score,
      reason: reasons.join(" + "),
      confidence_tier: rec.confidence_tier,
      fitDisclaimer: "Similar style profile — fit varies by brand and sizing",
    };
  });
}

// ── Pill Selector Component ──────────────────────────────────
function PillRow({ options, value, onChange, T }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button key={opt.value} onClick={() => onChange(opt.value)} style={{
            padding: "8px 16px", borderRadius: 20, border: `1.5px solid ${active ? T.pillActiveBorder : T.pillBorder}`,
            background: active ? T.pillActiveBg : T.pillBg, color: active ? T.pillActiveColor : T.textSub,
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

// ═══════════════════════════════════════════════════════════════
export default function ResultsPage({ result, score, onBack, onAddToWardrobe, onScanAlternative, onShare }) {
  const [mounted, setMounted] = useState(false);
  const [exposureOpen, setExposureOpen] = useState(true);
  const [activity, setActivity] = useState("casual");
  const [frequency, setFrequency] = useState("occasional");
  const [skin, setSkin] = useState("normal");

  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);

  const R = result || { product_name: "Unknown Product", brand: "Unknown Brand", category: "Clothing", materials: [], chemicals: [], certifications: [], origin: "Unknown", alternatives: [] };
  const S = score || { overall: 50, v2: null };
  const ov = typeof S === "number" ? S : S.overall;
  const v2 = S.v2 || null;
  const tier = v2?.confidence_tier || 4;
  const tierStyle = TIER_STYLES[tier];
  const sc = scoreColor(ov);
  const T = getTheme(ov);

  // Exposure calculator
  const activityOpt = ACTIVITY_OPTIONS.find(a => a.value === activity);
  const frequencyOpt = FREQUENCY_OPTIONS.find(f => f.value === frequency);
  const skinOpt = SKIN_OPTIONS.find(s => s.value === skin);
  const basePpm = getBaseConcentration(R.category, R.materials);
  const exposure = calculateExposure(basePpm, activityOpt, frequencyOpt, skinOpt);

  // Recommendations from brand database
  const recommendations = getRecommendations(R, BRANDS);
  const alts = recommendations.length > 0 ? recommendations : (R.alternatives || []);

  const bx = { background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 20, padding: 24, marginBottom: 24, boxShadow: T.dark ? "none" : "0 1px 3px rgba(0,0,0,0.04)" };
  const hd = { fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 800, margin: "0 0 4px 0", color: T.heading };
  const sb = { fontSize: 13, color: T.textMuted, margin: "0 0 20px 0", lineHeight: 1.5 };

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", background: T.bg, color: T.text, minHeight: "100vh", width: "100%", margin: "0 auto", position: "relative", overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* ═══ LAYER 1: SCORE HERO ═══ */}
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative", background: T.bg }}>
        <div style={{ position: "absolute", inset: 0, background: T.dark ? `radial-gradient(ellipse at 50% 20%, ${sc.glow} 0%, rgba(3,10,3,0) 70%)` : `radial-gradient(ellipse at 50% 20%, ${sc.glow} 0%, transparent 70%)`, pointerEvents: "none" }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", position: "relative", zIndex: 2 }}>
          <button onClick={onBack} style={{ background: T.backBtnBg, border: `1px solid ${T.backBtnBorder}`, color: T.backBtnColor, borderRadius: 12, padding: "8px 16px", cursor: "pointer", fontSize: 14, fontFamily: "inherit", boxShadow: T.dark ? "none" : "0 1px 3px rgba(0,0,0,0.04)" }}>← Back</button>
          <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, letterSpacing: 1 }}>
            <span style={{ color: T.heading }}>Clean</span><span style={{ color: T.dark ? "#4ade80" : "#16a34a", fontStyle: "italic" }}>Wear</span>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "0 24px", position: "relative", zIndex: 2, opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(20px)", transition: "all 0.8s cubic-bezier(0.16,1,0.3,1)" }}>
          {/* Score ring */}
          <div style={{ position: "relative", marginBottom: 20 }}>
            <svg width="180" height="180" viewBox="0 0 180 180">
              <circle cx="90" cy="90" r="80" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
              <circle cx="90" cy="90" r="80" fill="none" stroke={sc.text} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(ov / 100) * 502.65} 502.65`} transform="rotate(-90 90 90)" style={{ filter: `drop-shadow(0 0 14px ${sc.text}50)`, transition: "stroke-dasharray 1.2s cubic-bezier(0.16,1,0.3,1)" }} />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 64, fontWeight: 900, color: sc.text, lineHeight: 1, textShadow: T.dark ? `0 0 40px ${sc.text}30` : "none" }}>{ov}</div>
              <div style={{ fontSize: 11, letterSpacing: 2, color: T.textMuted, marginTop: 2, textTransform: "uppercase" }}>out of 100</div>
            </div>
          </div>

          {/* Confidence Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: tierStyle.bg, border: `1px solid ${tierStyle.border}`, borderRadius: 100, padding: "6px 18px", marginBottom: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: tierStyle.color }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: tierStyle.color, letterSpacing: 1 }}>Tier {tier} — {tierStyle.label}</span>
          </div>

          {/* Risk label */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${sc.text}${T.dark ? "15" : "10"}`, border: `1px solid ${sc.text}30`, borderRadius: 100, padding: "8px 24px", marginBottom: 20 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: sc.text, boxShadow: `0 0 8px ${sc.text}` }} />
            <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 800, color: sc.text, letterSpacing: 3, textTransform: "uppercase" }}>{sc.label}</span>
          </div>

          {/* Product info */}
          <div style={{ textAlign: "center", opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(12px)", transition: "all 0.8s cubic-bezier(0.16,1,0.3,1) 0.5s" }}>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Playfair Display',serif", color: T.heading, marginBottom: 4 }}>{R.product_name}</div>
            <div style={{ fontSize: 14, color: T.textMuted, letterSpacing: 1 }}>{R.brand?.toUpperCase()} · {R.category}</div>
            {R.materials?.length > 0 && (
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 12 }}>
                {R.materials.map((m, i) => {
                  const nm = typeof m === "string" ? m : `${m.name}${m.percentage ? " " + m.percentage + "%" : ""}`;
                  return <span key={i} style={{ fontSize: 12, background: T.tagBg, border: `1px solid ${T.tagBorder}`, borderRadius: 8, padding: "4px 12px", color: T.tagColor }}>{nm}</span>;
                })}
              </div>
            )}
            {v2 && <div style={{ fontSize: 12, color: T.textMuted, marginTop: 10 }}>Risk assessed from {v2.components.length} public source{v2.components.length !== 1 ? "s" : ""}</div>}
          </div>

          <div style={{ marginTop: "auto", paddingBottom: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: 0.4, animation: "cwb 2s ease-in-out infinite" }}>
            <span style={{ fontSize: 11, letterSpacing: 2, color: T.textMuted, textTransform: "uppercase" }}>Scroll for details</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
          </div>
        </div>
      </div>

      {/* ═══ LAYER 2: SCORE BREAKDOWN + EXPOSURE ═══ */}
      <div style={{ padding: "40px 20px 20px", maxWidth: 800, margin: "0 auto" }}>

        {/* SCORE BREAKDOWN */}
        {v2 && v2.components.length > 0 && (
          <div style={bx}>
            <h3 style={hd}>Score Breakdown</h3>
            <p style={sb}>Each component traces to a named public source.</p>
            {v2.components.map((comp, i) => (
              <div key={i} style={{ marginBottom: i < v2.components.length - 1 ? 14 : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: T.heading }}>{comp.source === "EU REACH Annex XVII" ? "Regulatory Flags" : comp.source.includes("NRDC") || comp.source.includes("Good On You") || comp.source.includes("OEKO-TEX") || comp.source.includes("GOTS") || comp.source.includes("bluesign") || comp.source.includes("General") ? "Brand Record" : "Category Research"}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 800, fontSize: 18, color: scoreColor(comp.score).text }}>{comp.score}</span>
                    {comp.sourceUrl && <a href={comp.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: T.dark ? "#4ade80" : "#16a34a", textDecoration: "none" }}>Source ↗</a>}
                  </div>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: T.dark ? "rgba(255,255,255,0.06)" : "#e2e8e0", overflow: "hidden", marginBottom: 6 }}>
                  <div style={{ height: "100%", borderRadius: 3, width: `${comp.score}%`, background: scoreColor(comp.score).text, transition: "width 1s ease-out" }} />
                </div>
                <div style={{ fontSize: 12, color: T.textSub, lineHeight: 1.5 }}>{comp.label}</div>
              </div>
            ))}

            {/* Data gaps */}
            {v2.gaps.length > 0 && (
              <div style={{ marginTop: 16, padding: 14, background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)", borderRadius: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#f87171", marginBottom: 6 }}>Data Gaps</div>
                {v2.gaps.map((gap, i) => (
                  <div key={i} style={{ fontSize: 12, color: T.textSub, lineHeight: 1.6 }}>• {gap}</div>
                ))}
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 8, fontStyle: "italic" }}>CleanWear scores reflect available public data. Where data is missing, we say so.</div>
              </div>
            )}
          </div>
        )}

        {/* REGULATORY FLAGS */}
        {v2 && v2.flags.length > 0 && (
          <div style={bx}>
            <h3 style={hd}>Regulatory Flags</h3>
            <p style={sb}>Chemical classes regulated under international frameworks for this garment type.</p>
            {v2.flags.map((flag, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 0", borderBottom: i < v2.flags.length - 1 ? `1px solid ${T.cardBorder}` : "none" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f87171", marginTop: 6, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.heading }}>{flag.chemical}</div>
                  <div style={{ fontSize: 12, color: T.textSub }}>{flag.regulation} — Limit: {flag.limit}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* EXPOSURE CALCULATOR */}
        <div style={bx}>
          <div onClick={() => setExposureOpen(!exposureOpen)} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ ...hd, margin: 0 }}>Your Exposure Profile</h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth="2" style={{ transform: exposureOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s" }}><path d="M6 9l6 6 6-6" /></svg>
          </div>
          {exposureOpen && (
            <div style={{ marginTop: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: T.textMuted, marginBottom: 8 }}>Activity Context</div>
                <PillRow options={ACTIVITY_OPTIONS} value={activity} onChange={setActivity} T={T} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: T.textMuted, marginBottom: 8 }}>Wear Frequency</div>
                <PillRow options={FREQUENCY_OPTIONS} value={frequency} onChange={setFrequency} T={T} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: T.textMuted, marginBottom: 8 }}>Skin Profile</div>
                <PillRow options={SKIN_OPTIONS} value={skin} onChange={setSkin} T={T} />
              </div>

              {/* Exposure statement */}
              <div style={{ background: T.dark ? "rgba(201,168,76,0.08)" : "rgba(202,138,4,0.06)", border: `1px solid ${T.dark ? "rgba(201,168,76,0.2)" : "rgba(202,138,4,0.15)"}`, borderRadius: 14, padding: 18 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.heading, lineHeight: 1.6, marginBottom: 10 }}>
                  If you wear this {R.category?.toLowerCase() || "garment"} {frequencyOpt.label.toLowerCase()} during {activityOpt.label.toLowerCase()}, your estimated annual dermal exposure is approximately <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: 20, color: exposure.baselineMultiple > 100 ? "#f87171" : exposure.baselineMultiple > 5 ? "#c9a84c" : "#16a34a" }}>{exposure.baselineMultiple.toLocaleString()}x</span> baseline.
                </div>
                <div style={{ fontSize: 12, color: T.textSub, lineHeight: 1.6 }}>
                  Based on {activityOpt.sweatLevel.toLowerCase()} at standard skin permeability (37°C).
                  Sweat increases PFAS dermal absorption up to 3,252x versus dry contact (Zheng et al., 2025).
                  {" "}<a href={SOURCES.ZHENG_2025.url} target="_blank" rel="noopener noreferrer" style={{ color: T.dark ? "#4ade80" : "#16a34a", textDecoration: "none", fontWeight: 600 }}>View study ↗</a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═══ SAFER ALTERNATIVES ═══ */}
        {alts.length > 0 && (
          <div style={bx}>
            <h3 style={hd}>Safer Alternatives</h3>
            <p style={sb}>Same garment category with lower known chemical risk profiles.</p>
            {alts.map((alt, i) => {
              const altTier = alt.confidence_tier || 3;
              const altTierStyle = TIER_STYLES[altTier];
              return (
                <div key={i} onClick={() => onScanAlternative?.(alt.name || alt.brand)} style={{ background: T.altBg, border: `1px solid ${T.altBorder}`, borderRadius: 16, padding: 16, marginBottom: i < alts.length - 1 ? 10 : 0, cursor: onScanAlternative ? "pointer" : "default" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: T.heading }}>{alt.name}</div>
                      <div style={{ fontSize: 12, color: T.textMuted }}>{alt.brand}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {alt.score && <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 900, color: T.altScoreColor }}>{alt.score}</div>}
                      {alt.confidence_tier && (
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: altTierStyle.color }} title={`Tier ${altTier}`} />
                      )}
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: T.dark ? "#4ade80" : "#166534", margin: "0 0 4px 0", lineHeight: 1.5, fontWeight: 600 }}>{alt.reason}</p>
                  {alt.fitDisclaimer && <p style={{ fontSize: 11, color: T.textMuted, margin: 0, fontStyle: "italic" }}>{alt.fitDisclaimer}</p>}
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ ACTIONS ═══ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 20 }}>
          <button onClick={onAddToWardrobe} style={{ width: "100%", padding: "18px 24px", background: T.btnPrimaryBg, border: "1px solid rgba(22,101,52,0.3)", borderRadius: 16, cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 700, color: T.btnPrimaryColor, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>Add to Wardrobe
          </button>
          <button onClick={onShare} style={{ width: "100%", padding: "18px 24px", background: T.btnSecBg, border: `1px solid ${T.btnSecBorder}`, borderRadius: 16, cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 16, fontWeight: 700, color: T.btnSecColor, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: T.dark ? "none" : "0 1px 3px rgba(0,0,0,0.04)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" /></svg>Share Results
          </button>
        </div>

        {/* ═══ DISCLAIMER ═══ */}
        <div style={{ textAlign: "center", padding: "0 12px 24px", fontSize: 10, color: T.textFaint, lineHeight: 1.6 }}>
          Scores are based on published regulatory data, NGO research, and peer-reviewed studies. CleanWear does not independently test garments unless CleanWear Certified. All exposure estimates are derived from cited research. © 2026 CleanWear.
        </div>
      </div>

      <style>{`
        @keyframes cwp { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes cwb { 0%,100%{transform:translateY(0)} 50%{transform:translateY(6px)} }
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:0}
      `}</style>
    </div>
  );
}
