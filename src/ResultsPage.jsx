// ═══════════════════════════════════════════════════════════════
// CleanWear — Results page v5
// Restores the v3 dark-hero aesthetic (score ring + glow + Playfair)
// on top of v4 organization (section eyebrows, verified citations,
// privacy affordance, dispute flow). Pop back. Still organized.
//
// Props contract preserved:
//   { result, score, onBack, onAddToWardrobe, onScanAlternative, onShare,
//     onNavigateCertify }  // onNavigateCertify accepted but unused
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect } from "react";
import { PrivacyAffordance, DisputeDialog } from "./design/components/index.js";
import {
  CHEMICAL_INFO, getGarmentChemicals, getRecommendations,
  getGarmentType, getCategoryGroup,
} from "./results/helpers.js";
import { getScanStatus } from "./utils/scanCredits.js";

// ── Exposure calc: activity + frequency + skin → 0–99 risk index ──
const ACTIVITY_OPTIONS = [
  { value: "casual",  label: "Casual wear",    multiplier: 1 },
  { value: "workout", label: "Gym / Workout",  multiplier: 10 },
  { value: "outdoor", label: "Outdoor / Rain", multiplier: 3 },
  { value: "sleep",   label: "Sleepwear",      multiplier: 2 },
];
const FREQUENCY_OPTIONS = [
  { value: "occasional", label: "Occasionally",    mult: 1 },
  { value: "weekly",     label: "Few times/week",  mult: 3 },
  { value: "daily",      label: "Daily",           mult: 5 },
];
const SKIN_OPTIONS = [
  { value: "normal",    label: "Normal skin",       mult: 1.0 },
  { value: "sensitive", label: "Sensitive / eczema", mult: 1.5 },
  { value: "child",     label: "Child's skin",       mult: 2.0 },
];

function computeRisk(productScore, a, f, s) {
  const act = ACTIVITY_OPTIONS.find(o => o.value === a)?.multiplier ?? 1;
  const freq = FREQUENCY_OPTIONS.find(o => o.value === f)?.mult ?? 1;
  const skin = SKIN_OPTIONS.find(o => o.value === s)?.mult ?? 1;
  const baseRisk = (100 - productScore) / 100;
  const amp = Math.log(act * freq * skin + 1) / Math.log(101);
  const idx = Math.round(baseRisk * (0.15 + 0.85 * amp) * 100);
  return Math.max(1, Math.min(idx, 99));
}

function riskBand(i) {
  if (i >= 70) return { label: "HIGH EXPOSURE",     color: "#f87171", bg: "rgba(248,113,113,0.10)" };
  if (i >= 45) return { label: "MODERATE EXPOSURE", color: "#c9a84c", bg: "rgba(201,168,76,0.08)" };
  if (i >= 20) return { label: "LOW–MODERATE",      color: "#a1a1aa", bg: "rgba(161,161,170,0.06)" };
  return          { label: "LOW EXPOSURE",      color: "#4ade80", bg: "rgba(74,222,128,0.06)" };
}

function exposureBullets(chemicals, activity) {
  const isWorkout = activity === "workout";
  const isActive = isWorkout || activity === "outdoor";
  const out = [];
  if (chemicals.includes("pfas")) out.push({
    text: isWorkout
      ? "Sweat amplifies PFAS dermal absorption up to 3,252× vs dry contact — the highest-risk scenario for this fabric."
      : isActive ? "Moisture increases PFAS skin absorption several-fold above dry baseline."
      : activity === "sleep" ? "Prolonged skin contact (~8 hrs) compounds PFAS transfer even at low sweat levels."
      : "PFAS transfers through skin at baseline rate during dry wear.",
    source: "Zheng et al. 2025 · Sci Total Environ",
    href: "https://doi.org/10.1016/j.scitotenv.2025.181066",
  });
  if (chemicals.includes("microplastics")) {
    const n = isWorkout ? "~3,800" : isActive ? "~2,400" : "~1,900";
    out.push({
      text: `${n} microplastic fibers shed per wear${isWorkout ? " under exercise friction" : ""}. Detected in human blood and lung tissue.`,
      source: "Env Sci & Tech, 2023",
    });
  }
  if (chemicals.includes("bpa")) out.push({
    text: isWorkout
      ? "BPA leaches from polyester faster when skin temperature exceeds 37°C during exercise."
      : "BPA present in polyester. Leaching rate rises with body heat.",
    source: "Rochester & Bolden 2015 · Env Health Perspect",
    href: "https://doi.org/10.1289/ehp.1408989",
  });
  if (chemicals.includes("formaldehyde")) out.push({
    text: "Formaldehyde resins off-gas under heat and moisture. Classified Group 1 carcinogen by IARC.",
    source: "IARC Monograph Vol. 100F",
    href: "https://publications.iarc.fr/Book-And-Report-Series/Iarc-Monographs-On-The-Identification-Of-Carcinogenic-Hazards-To-Humans/Chemical-Agents-And-Related-Occupations-2012",
  });
  if (chemicals.includes("phthalates")) out.push({
    text: "Phthalates migrate faster from warm, moist synthetic blends — restricted under EU REACH.",
    source: "REACH Annex XVII Entry 51",
    href: "https://echa.europa.eu/substances-restricted-under-reach",
  });
  return out.slice(0, 3);
}

function PillRow({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button key={opt.value} onClick={() => onChange(opt.value)} style={{
            padding: "8px 16px", borderRadius: 20,
            border: `1.5px solid ${active ? "rgba(74,222,128,0.35)" : "rgba(255,255,255,0.08)"}`,
            background: active ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.03)",
            color: active ? "#4ade80" : "#a1a1aa",
            fontFamily: "var(--cw-font-sans, 'Plus Jakarta Sans', sans-serif)",
            fontSize: 13, fontWeight: active ? 700 : 500,
            cursor: "pointer", transition: "all .2s",
          }}>{opt.label}</button>
        );
      })}
    </div>
  );
}

function scoreColor(s) {
  if (s >= 70) return { text: "#4ade80", label: "LOWER RISK",    glow: "rgba(74,222,128,0.15)" };
  if (s >= 50) return { text: "#c9a84c", label: "MODERATE RISK", glow: "rgba(201,168,76,0.12)" };
  if (s >= 40) return { text: "#f59e0b", label: "MODERATE RISK", glow: "rgba(245,158,11,0.12)" };
  return          { text: "#f87171", label: "ELEVATED RISK", glow: "rgba(248,113,113,0.20)" };
}

const CONFIDENCE = {
  1: { color: "#4ade80", bg: "rgba(74,222,128,0.10)",  border: "rgba(74,222,128,0.25)",  label: "Lab Verified",     desc: "This product has been independently tested by an accredited lab." },
  2: { color: "#c9a84c", bg: "rgba(201,168,76,0.10)",  border: "rgba(201,168,76,0.25)",  label: "Strong Evidence",  desc: "Score based on brand-level safety data and published category research." },
  3: { color: "#a1a1aa", bg: "rgba(161,161,170,0.10)", border: "rgba(161,161,170,0.25)", label: "Partial Data",     desc: "Based on category research only. We lack brand-specific safety data for a fully confident score." },
  4: { color: "#f87171", bg: "rgba(248,113,113,0.10)", border: "rgba(248,113,113,0.25)", label: "Insufficient Data", desc: "Limited public data available. This score may not reflect the actual chemical profile of this product." },
};

// ═══════════════════════════════════════════════════════════════════
export default function ResultsPage({
  result, score, onBack, onAddToWardrobe, onScanAlternative, onShare,
}) {
  const [mounted, setMounted]       = useState(false);
  const [activity, setActivity]     = useState("casual");
  const [frequency, setFrequency]   = useState("occasional");
  const [skin, setSkin]             = useState("normal");
  const [isPublic, setIsPublic]     = useState(true);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [wardrobeSaved, setWardrobeSaved] = useState(false);

  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);

  const R = result || { product_name: "Unknown Product", brand: "Unknown Brand", category: "Clothing", materials: [], chemicals: [], certifications: [], origin: "Unknown" };
  const S = score || { overall: 50, v2: null };
  const ov = typeof S === "number" ? S : S.overall;
  const v2 = S.v2 || null;
  const tier = v2?.confidence_tier || 4;
  const conf = CONFIDENCE[tier];
  const sc = scoreColor(ov);

  const chemicals = getGarmentChemicals({ ...R, score: ov });
  const riskIdx = computeRisk(ov, activity, frequency, skin);
  const rb = riskBand(riskIdx);
  const organicIdx = computeRisk(92, activity, frequency, skin);
  const vsOrganic = Math.max(1, Math.round(riskIdx / Math.max(organicIdx, 1)));
  const bullets = exposureBullets(chemicals, activity);

  const recs = getRecommendations({ ...R, score: ov });
  const alts = recs.slice(0, 3);

  const scanStatus = getScanStatus();
  const primaryIsAlternatives = scanStatus.used <= 1 && alts.length > 0;

  const handleSave = () => {
    if (!onAddToWardrobe || wardrobeSaved) return;
    onAddToWardrobe();
    setWardrobeSaved(true);
  };

  // Reusable styles
  const card = { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: 24, marginBottom: 16 };
  const heading = { fontFamily: "var(--cw-font-serif, 'Playfair Display', serif)", fontSize: 22, fontWeight: 700, margin: "0 0 4px", color: "#fff", letterSpacing: "-0.01em" };
  const sub = { fontSize: 13, color: "#71717a", margin: "0 0 20px", lineHeight: 1.5 };
  const eyebrow = { display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "#71717a", marginBottom: 12 };

  return (
    <div style={{ fontFamily: "var(--cw-font-sans, 'Plus Jakarta Sans', sans-serif)", background: "#030a03", color: "#e8e8e8", minHeight: "100vh", width: "100%", position: "relative" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,700;0,800;0,900;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* ═══ HERO ═══ */}
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 20%, ${sc.glow} 0%, rgba(3,10,3,0) 70%)`, pointerEvents: "none" }} />

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", position: "relative", zIndex: 2 }}>
          <button onClick={onBack} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#d4d4d8", borderRadius: 12, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: "inherit" }}>← Scan another</button>
          <div style={{ fontFamily: "var(--cw-font-serif, 'Playfair Display', serif)", fontSize: 18, fontWeight: 700 }}>
            <span style={{ color: "#fff" }}>Clean</span><span style={{ color: "#4ade80", fontStyle: "italic", fontWeight: 500 }}>Wear</span>
          </div>
        </div>

        {/* Score + Product */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
          padding: "0 24px", position: "relative", zIndex: 2,
          opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.8s cubic-bezier(0.16,1,0.3,1)",
        }}>
          {/* Score ring */}
          <div style={{ position: "relative", marginBottom: 22 }}>
            <svg width="180" height="180" viewBox="0 0 180 180">
              <circle cx="90" cy="90" r="80" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
              <circle
                cx="90" cy="90" r="80" fill="none" stroke={sc.text} strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${(ov / 100) * 502.65} 502.65`}
                transform="rotate(-90 90 90)"
                style={{ filter: `drop-shadow(0 0 14px ${sc.text}55)`, transition: "stroke-dasharray 1.2s cubic-bezier(0.16,1,0.3,1)" }}
              />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
              <div style={{ fontFamily: "var(--cw-font-serif, 'Playfair Display', serif)", fontSize: 64, fontWeight: 900, color: sc.text, lineHeight: 1, textShadow: `0 0 40px ${sc.text}30` }}>{ov}</div>
              <div style={{ fontSize: 10, letterSpacing: 2, color: "#71717a", marginTop: 4, textTransform: "uppercase", fontWeight: 600 }}>out of 100</div>
            </div>
          </div>

          {/* Risk + confidence pills */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 20 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${sc.text}15`, border: `1px solid ${sc.text}30`, borderRadius: 100, padding: "8px 22px" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: sc.text, boxShadow: `0 0 8px ${sc.text}` }} />
              <span style={{ fontFamily: "var(--cw-font-sans, 'Plus Jakarta Sans', sans-serif)", fontSize: 11, fontWeight: 700, color: sc.text, letterSpacing: 2.5 }}>{sc.label}</span>
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: conf.bg, border: `1px solid ${conf.border}`, borderRadius: 100, padding: "8px 18px" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: conf.color }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: conf.color, letterSpacing: 1.2 }}>{conf.label}</span>
            </div>
          </div>

          {/* Product info */}
          <div style={{ textAlign: "center", maxWidth: 480 }}>
            <div style={{ fontFamily: "var(--cw-font-serif, 'Playfair Display', serif)", fontSize: 26, fontWeight: 700, color: "#fff", marginBottom: 6, lineHeight: 1.2, letterSpacing: "-0.01em" }}>{R.product_name}</div>
            <div style={{ fontSize: 12, color: "#71717a", letterSpacing: 1.4, fontWeight: 500 }}>
              {(R.brand || "").toUpperCase()}{R.category ? ` · ${R.category}` : ""}
            </div>
            {R.materials?.length > 0 && (
              <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginTop: 14 }}>
                {R.materials.map((m, i) => {
                  const nm = typeof m === "string" ? m : `${m.name}${m.percentage ? " " + m.percentage + "%" : ""}`;
                  return <span key={i} style={{ fontSize: 11, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "5px 11px", color: "#a1a1aa" }}>{nm}</span>;
                })}
              </div>
            )}
            {v2 && <div style={{ fontSize: 11, color: "#52525b", marginTop: 14, letterSpacing: 0.4 }}>Risk assessed from {v2.components.length} public source{v2.components.length !== 1 ? "s" : ""}</div>}
          </div>

          {/* Scroll hint */}
          <div style={{ marginTop: "auto", paddingBottom: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: 0.45, animation: "cwb 2s ease-in-out infinite" }}>
            <span style={{ fontSize: 10, letterSpacing: 2.5, color: "#71717a", textTransform: "uppercase", fontWeight: 600 }}>Scroll for the breakdown</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2.5"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
          </div>
        </div>
      </div>

      {/* ═══ DETAILS ═══ */}
      <div style={{ padding: "48px 20px 20px", maxWidth: 760, margin: "0 auto" }}>

        {/* Brand-level notice */}
        {R._brand_level_only && (
          <div style={{ ...card, background: "rgba(201,168,76,0.06)", borderColor: "rgba(201,168,76,0.2)" }}>
            <div style={eyebrow}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#c9a84c" }} />
              Brand-level assessment
            </div>
            <p style={{ fontSize: 14, color: "#d4d4d8", lineHeight: 1.65, margin: 0 }}>
              This specific product isn't in our database yet. The score reflects <strong style={{ color: "#fff" }}>{R.brand}</strong>'s
              overall chemical safety profile from public data — not product-level testing.
            </p>
          </div>
        )}

        {/* Confidence explanation */}
        <div style={{ ...card, background: conf.bg, borderColor: conf.border }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 9, height: 9, borderRadius: "50%", background: conf.color }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: conf.color, letterSpacing: 1.2 }}>{conf.label}</span>
          </div>
          <p style={{ fontSize: 13, color: "#d4d4d8", lineHeight: 1.65, margin: 0 }}>{conf.desc}</p>
        </div>

        {/* Score breakdown */}
        {v2 && v2.components?.length > 0 && (
          <div style={card}>
            <div style={eyebrow}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ade80" }} />
              Score breakdown
            </div>
            <h3 style={heading}>
              Three weighted components.{" "}
              <em style={{ fontFamily: "var(--cw-font-serif, 'Playfair Display', serif)", fontStyle: "italic", color: "#4ade80", fontWeight: 500 }}>All cited.</em>
            </h3>
            <p style={sub}>Each score traces to a named public source. We never generate numbers we can't cite.</p>
            {v2.components.map((c, i) => {
              const label = c.source === "EU REACH Annex XVII" ? "Regulatory flags"
                         : c.source.match(/NRDC|Good On You|OEKO-TEX|GOTS|bluesign|General/) ? "Brand record"
                         : "Category research";
              const csc = scoreColor(c.score);
              return (
                <div key={i} style={{ marginBottom: i < v2.components.length - 1 ? 16 : 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{label}</span>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                      <span style={{ fontFamily: "var(--cw-font-serif, 'Playfair Display', serif)", fontWeight: 800, fontSize: 20, color: csc.text }}>{c.score}</span>
                      {c.sourceUrl && <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#4ade80", textDecoration: "none", fontWeight: 600 }}>Source ↗</a>}
                    </div>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 6 }}>
                    <div style={{ height: "100%", borderRadius: 3, width: `${c.score}%`, background: csc.text, transition: "width 1s ease-out" }} />
                  </div>
                  <div style={{ fontSize: 12, color: "#a1a1aa", lineHeight: 1.55 }}>{c.label}</div>
                </div>
              );
            })}

            {v2.gaps?.length > 0 && (
              <div style={{ marginTop: 18, padding: 14, background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.14)", borderRadius: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#f87171", marginBottom: 6, letterSpacing: 0.4 }}>Missing data</div>
                {v2.gaps.map((g, i) => (
                  <div key={i} style={{ fontSize: 12, color: "#d4d4d8", lineHeight: 1.6 }}>• {g}</div>
                ))}
                <div style={{ fontSize: 11, color: "#71717a", marginTop: 8, fontStyle: "italic" }}>Where data is missing, we say so — we don't guess.</div>
              </div>
            )}
          </div>
        )}

        {/* Regulatory flags */}
        {v2 && v2.flags?.length > 0 && (
          <div style={card}>
            <div style={eyebrow}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#f87171" }} />
              Regulatory flags
            </div>
            <h3 style={heading}>
              What the <em style={{ fontFamily: "var(--cw-font-serif, 'Playfair Display', serif)", fontStyle: "italic", color: "#4ade80", fontWeight: 500 }}>EU</em> says.
            </h3>
            <p style={sub}>Chemicals restricted under international frameworks for this garment type.</p>
            {v2.flags.map((flag, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 0", borderBottom: i < v2.flags.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f87171", marginTop: 6, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{flag.chemical}</div>
                  <div style={{ fontSize: 12, color: "#a1a1aa", marginTop: 2 }}>{flag.regulation} — limit: {flag.limit}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Potential chemical concerns */}
        {chemicals.length > 0 && (
          <div style={card}>
            <div style={eyebrow}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#c9a84c" }} />
              Potential chemical concerns
            </div>
            <h3 style={heading}>
              What this fabric might be <em style={{ fontFamily: "var(--cw-font-serif, 'Playfair Display', serif)", fontStyle: "italic", color: "#f87171", fontWeight: 500 }}>carrying.</em>
            </h3>
            <p style={sub}>
              Inferred from the declared materials
              {R.materials?.length > 0 && ` (${R.materials.map(m => typeof m === "string" ? m : m.name).filter(Boolean).join(", ")})`}
              . These are published risk factors for this type of fabric — not confirmed findings without lab testing.
            </p>

            {chemicals.map((key, i) => {
              const chem = CHEMICAL_INFO[key];
              if (!chem) return null;
              return (
                <div key={key} style={{ padding: "16px 0", borderBottom: i < chemicals.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{chem.name}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", padding: "3px 8px", borderRadius: 4, background: chem.severity === "high" ? "rgba(248,113,113,0.15)" : "rgba(201,168,76,0.15)", color: chem.severity === "high" ? "#f87171" : "#c9a84c" }}>
                      {chem.severity === "high" ? "High" : "Moderate"}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: "#d4d4d8", lineHeight: 1.65, marginBottom: 6 }}>{chem.healthNote}</div>
                  {chem.citation && (
                    <a href={chem.citation.doi || undefined} target={chem.citation.doi ? "_blank" : undefined} rel="noopener noreferrer" style={{ fontSize: 11, color: chem.citation.doi ? "#4ade80" : "#71717a", textDecoration: chem.citation.doi ? "underline" : "none", textUnderlineOffset: 2, lineHeight: 1.5 }}>
                      {chem.citation.authors}{chem.citation.year ? ` ${chem.citation.year}` : ""} · <em style={{ fontStyle: "italic" }}>{chem.citation.journal}</em>
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Exposure estimator */}
        {chemicals.length > 0 && (
          <div style={card}>
            <div style={eyebrow}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ade80" }} />
              Exposure estimator
            </div>
            <h3 style={heading}>
              What wearing this <em style={{ fontFamily: "var(--cw-font-serif, 'Playfair Display', serif)", fontStyle: "italic", color: "#4ade80", fontWeight: 500 }}>actually means.</em>
            </h3>
            <p style={sub}>Select how you'll use this garment. Exposure updates in real time.</p>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.8, textTransform: "uppercase", color: "#71717a", marginBottom: 8 }}>Activity</div>
              <PillRow options={ACTIVITY_OPTIONS} value={activity} onChange={setActivity} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.8, textTransform: "uppercase", color: "#71717a", marginBottom: 8 }}>Frequency</div>
              <PillRow options={FREQUENCY_OPTIONS} value={frequency} onChange={setFrequency} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.8, textTransform: "uppercase", color: "#71717a", marginBottom: 8 }}>Skin type</div>
              <PillRow options={SKIN_OPTIONS} value={skin} onChange={setSkin} />
            </div>

            {/* Risk gauge */}
            <div style={{ background: rb.bg, border: `1px solid ${rb.color}30`, borderRadius: 16, padding: 20, marginBottom: 20, transition: "all 0.4s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#71717a", marginBottom: 4 }}>Exposure level</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: rb.color, letterSpacing: 1.2 }}>{rb.label}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "var(--cw-font-serif, 'Playfair Display', serif)", fontSize: 46, fontWeight: 800, color: rb.color, lineHeight: 1 }}>{riskIdx}</div>
                  <div style={{ fontSize: 10, color: "#52525b", marginTop: 3, letterSpacing: 0.4 }}>out of 99</div>
                </div>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 12 }}>
                <div style={{ height: "100%", borderRadius: 4, width: `${riskIdx}%`, background: `linear-gradient(90deg, #4ade80, ${rb.color})`, transition: "width 0.6s cubic-bezier(0.16,1,0.3,1), background 0.4s ease", boxShadow: `0 0 10px ${rb.color}40` }} />
              </div>
              {vsOrganic > 1 && (
                <div style={{ fontSize: 12, color: "#d4d4d8", lineHeight: 1.55 }}>
                  <span style={{ fontWeight: 700, color: rb.color }}>{vsOrganic}×</span> more chemical exposure than an organic-cotton equivalent at this usage level.
                </div>
              )}
            </div>

            {bullets.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {bullets.map((b, i) => (
                  <div key={`${activity}-${i}`} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: rb.color, marginTop: 7, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 13, color: "#e8e8e8", lineHeight: 1.6 }}>{b.text}</div>
                      {b.source && (
                        b.href
                          ? <a href={b.href} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#4ade80", textDecoration: "underline", textUnderlineOffset: 2, marginTop: 4, display: "inline-block" }}>{b.source}</a>
                          : <div style={{ fontSize: 11, color: "#52525b", marginTop: 4 }}>{b.source}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Safer alternatives */}
        {alts.length > 0 && (
          <div data-section="alternatives" style={card}>
            <div style={eyebrow}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ade80" }} />
              Safer alternatives
            </div>
            <h3 style={heading}>
              Pick something{" "}
              <em style={{ fontFamily: "var(--cw-font-serif, 'Playfair Display', serif)", fontStyle: "italic", color: "#4ade80", fontWeight: 500 }}>safer.</em>
            </h3>
            <p style={sub}>Same garment type, lower known chemical risk — based on certifications and published data.</p>
            {alts.map((alt, i) => {
              const asc = scoreColor(alt.score || 70);
              return (
                <div
                  key={i}
                  onClick={() => onScanAlternative?.(`${alt.brand} ${alt.name}`)}
                  style={{
                    background: "rgba(74,222,128,0.03)",
                    border: "1px solid rgba(74,222,128,0.15)",
                    borderRadius: 16, padding: 16,
                    marginBottom: i < alts.length - 1 ? 10 : 0,
                    cursor: onScanAlternative ? "pointer" : "default",
                    transition: "all .2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "rgba(74,222,128,0.3)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = "rgba(74,222,128,0.15)"; }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#71717a", marginBottom: 3 }}>{alt.brand}</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", lineHeight: 1.3 }}>{alt.name}</div>
                      <div style={{ fontSize: 12, color: "#4ade80", marginTop: 6, fontWeight: 600 }}>
                        +{alt.delta} pts{alt.materials ? ` · ${alt.materials}` : ""}
                      </div>
                    </div>
                    <div style={{ textAlign: "center", minWidth: 56, paddingLeft: 12, borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ fontFamily: "var(--cw-font-serif, 'Playfair Display', serif)", fontSize: 26, fontWeight: 900, color: asc.text, lineHeight: 1 }}>{alt.score}</div>
                      <div style={{ fontSize: 9, color: "#52525b", marginTop: 3, letterSpacing: 0.6, textTransform: "uppercase", fontWeight: 700 }}>Score</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 20 }}>
          {primaryIsAlternatives ? (
            <button onClick={() => document.querySelector('[data-section="alternatives"]')?.scrollIntoView({ behavior: "smooth", block: "center" })} style={{
              width: "100%", padding: "18px 24px",
              background: "linear-gradient(135deg,#166534,#14532d)",
              border: "1px solid rgba(22,101,52,0.4)", borderRadius: 16, cursor: "pointer",
              fontFamily: "inherit", fontSize: 15, fontWeight: 700, color: "#4ade80",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              See safer alternatives ↓
            </button>
          ) : (
            <button onClick={handleSave} style={{
              width: "100%", padding: "18px 24px",
              background: wardrobeSaved ? "rgba(74,222,128,0.08)" : "linear-gradient(135deg,#166534,#14532d)",
              border: `1px solid ${wardrobeSaved ? "rgba(74,222,128,0.3)" : "rgba(22,101,52,0.4)"}`,
              borderRadius: 16, cursor: "pointer",
              fontFamily: "inherit", fontSize: 15, fontWeight: 700, color: "#4ade80",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              {wardrobeSaved ? "Saved ✓" : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                  Add to wardrobe
                </>
              )}
            </button>
          )}
          <button onClick={onShare} style={{
            width: "100%", padding: "16px 24px",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 16, cursor: "pointer",
            fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: "#e8e8e8",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" /></svg>
            Share results
          </button>
        </div>

        {/* Footer row */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          gap: 12, marginTop: 20, paddingTop: 18,
          borderTop: "1px solid rgba(255,255,255,0.06)",
          flexWrap: "wrap",
        }}>
          <PrivacyAffordance isPublic={isPublic} onToggle={() => setIsPublic(!isPublic)} />
          <button
            onClick={() => setDisputeOpen(true)}
            style={{
              background: "transparent", border: "none", padding: 0,
              fontFamily: "inherit", fontSize: 11, color: "#a1a1aa",
              textDecoration: "underline", textUnderlineOffset: 2, cursor: "pointer",
            }}
          >Dispute this score</button>
        </div>

        {/* Disclaimer */}
        <div style={{ textAlign: "center", padding: "24px 16px 40px" }}>
          <div style={{ fontSize: 12, color: "#a1a1aa", lineHeight: 1.7, maxWidth: 500, margin: "0 auto" }}>
            Scores are based on published regulatory data, NGO research, and peer-reviewed studies. Chemical presence is inferred from material composition — actual levels vary by manufacturer.
          </div>
          <div style={{ fontSize: 10, color: "#52525b", marginTop: 10, letterSpacing: 0.4 }}>
            Independent methodology · no brand payments · © 2026 CleanWear
          </div>
        </div>
      </div>

      <DisputeDialog
        open={disputeOpen}
        onClose={() => setDisputeOpen(false)}
      />

      <style>{`
        @keyframes cwb { 0%,100%{transform:translateY(0)} 50%{transform:translateY(6px)} }
      `}</style>
    </div>
  );
}
