// ═══════════════════════════════════════════════════════════════
// CleanWear — Results page (v4.0, design-system rebuild)
// Per design-handoff.md §4.4
//
// Props contract preserved from v3 so CleanWear.jsx plugs in unchanged:
//   { result, score, onBack, onAddToWardrobe, onScanAlternative, onShare,
//     onNavigateCertify }  // onNavigateCertify is accepted but unused —
//                          // certify is out of scope per the product pivot.
// ═══════════════════════════════════════════════════════════════
import { useState } from "react";
import {
  ScoreHero, ChemicalCard, SaferAlternative,
  CTAButton, PrivacyAffordance, SectionEyebrow, Citation,
} from "./design/components/index.js";
import { buildChemicalRows, getRecommendations, pickSplitAlternatives } from "./results/helpers.js";
import { getScanStatus } from "./utils/scanCredits.js";

export default function ResultsPage({
  result,
  score,
  onBack,
  onAddToWardrobe,
  onScanAlternative,
  onShare,
}) {
  const [isPublic, setIsPublic] = useState(true);
  const [scienceOpen, setScienceOpen] = useState(false);
  const [wardrobeSaved, setWardrobeSaved] = useState(false);

  const R = result || { product_name: "Unknown Product", brand: "Unknown Brand", category: "Clothing", materials: [], chemicals: [] };
  const S = score || { overall: 50, v2: null };
  const overall = typeof S === "number" ? S : S.overall;

  // §5.1 — primary action depends on how many scans the user has.
  const scanStatus = getScanStatus();
  const primaryAction = scanStatus.used <= 1 ? "alternatives" : "wardrobe";

  // Chemical card rows — derived via shared helper.
  const chemicalRows = buildChemicalRows({ ...R, score: overall });

  // Split alternatives — "Same fit" + "Same price".
  const recs = getRecommendations({ ...R, score: overall });
  const { sameFit, samePrice } = pickSplitAlternatives(recs, null);

  // Materials summary for the garment strip.
  const materialsStr = (R.materials || [])
    .map(m => typeof m === "string" ? m : (m.percentage ? `${m.percentage}% ${m.name}` : m.name))
    .filter(Boolean)
    .join(" · ") || R.materials_text || "";

  const handleSave = () => {
    if (!onAddToWardrobe) return;
    onAddToWardrobe();
    setWardrobeSaved(true);
  };

  return (
    <div style={{
      fontFamily: "var(--cw-font-sans)",
      background: "var(--cw-bg-primary)",
      color: "var(--cw-text-primary)",
      minHeight: "100vh",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Plus+Jakarta+Sans:wght@400;500&display=swap" rel="stylesheet" />

      <div style={{ maxWidth: 520, margin: "0 auto", padding: "16px 20px 40px" }}>

        {/* ─── Back bar ─── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 8, marginBottom: 14,
        }}>
          <button onClick={onBack} style={{
            background: "transparent",
            border: "none",
            color: "var(--cw-text-secondary)",
            fontFamily: "var(--cw-font-sans)",
            fontSize: 12, fontWeight: 400,
            cursor: "pointer",
            padding: "6px 0",
          }}>← Scan another</button>
          <div style={{ display: "flex", gap: 8 }}>
            <CTAButton variant="tertiary" size="sm" onClick={handleSave}>
              {wardrobeSaved ? "Saved ✓" : "Save"}
            </CTAButton>
            <CTAButton variant="tertiary" size="sm" onClick={onShare}>Share</CTAButton>
          </div>
        </div>

        {/* ─── Garment strip ─── */}
        <div style={{
          display: "grid", gridTemplateColumns: "52px 1fr", gap: 14,
          alignItems: "center", marginBottom: 16,
        }}>
          <div style={{
            width: 52, height: 64, borderRadius: "var(--cw-radius-md)",
            background: "var(--cw-bg-secondary)",
            border: "var(--cw-border-tertiary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24,
          }}>👕</div>
          <div>
            <div style={{
              fontSize: 10, fontWeight: 500, letterSpacing: "0.04em",
              textTransform: "uppercase", color: "var(--cw-text-tertiary)",
            }}>{R.brand || "Unknown brand"}</div>
            <div style={{
              fontFamily: "var(--cw-font-sans)",
              fontSize: 16, fontWeight: 500, color: "var(--cw-text-primary)",
              letterSpacing: "-0.005em", marginTop: 2, lineHeight: 1.25,
            }}>{R.product_name}</div>
            {materialsStr && (
              <div style={{
                fontSize: 11, color: "var(--cw-text-secondary)", marginTop: 4,
                lineHeight: 1.4,
              }}>{materialsStr}</div>
            )}
          </div>
        </div>

        {/* ─── Score hero ─── */}
        <ScoreHero variant="results" score={overall} />

        {/* ─── Why this score ─── */}
        {chemicalRows.length > 0 && (
          <>
            <div style={{ marginTop: 22, marginBottom: 10 }}>
              <SectionEyebrow>Why this score</SectionEyebrow>
            </div>
            <ChemicalCard rows={chemicalRows} />
          </>
        )}

        {/* ─── View the science dropdown ─── */}
        <button
          onClick={() => setScienceOpen(!scienceOpen)}
          style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            width: "100%", marginTop: 14,
            padding: "14px 18px",
            background: "var(--cw-bg-secondary)",
            border: "var(--cw-border-tertiary)",
            borderRadius: "var(--cw-radius-lg)",
            fontFamily: "var(--cw-font-sans)",
            fontSize: 13, fontWeight: 500,
            color: "var(--cw-text-primary)",
            cursor: "pointer", textAlign: "left",
          }}
        >
          <span>View the science</span>
          <span style={{
            fontSize: 14, color: "var(--cw-text-tertiary)",
            transform: scienceOpen ? "rotate(180deg)" : "rotate(0)",
            transition: "transform 0.2s ease",
          }}>▾</span>
        </button>
        {scienceOpen && (
          <div style={{
            padding: "18px 20px",
            background: "var(--cw-bg-tertiary)",
            border: "var(--cw-border-tertiary)",
            borderTop: "none",
            borderRadius: "0 0 var(--cw-radius-lg) var(--cw-radius-lg)",
            marginTop: -8,
          }}>
            <div style={{
              fontSize: 13, lineHeight: 1.7, color: "var(--cw-text-secondary)",
              marginBottom: 14,
            }}>
              This score combines three weighted components, each traced to a
              public source. We never generate numbers we can't cite.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { num: "01", weight: "25%", title: "Regulatory flags", src: "EU REACH Annex XVII" },
                { num: "02", weight: "35%", title: "Brand safety record", src: "NRDC · OEKO-TEX · Good On You" },
                { num: "03", weight: "40%", title: "Category research", src: "Mamavation · EWG · Zheng et al. 2025" },
              ].map((s) => (
                <div key={s.num} style={{
                  display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12,
                  alignItems: "center",
                  padding: "10px 0",
                  borderTop: "var(--cw-border-tertiary)",
                }}>
                  <span style={{
                    fontFamily: "var(--cw-font-serif)", fontSize: 18, fontWeight: 400,
                    color: "var(--cw-brand-emerald)", lineHeight: 1, minWidth: 28,
                  }}>{s.num}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--cw-text-primary)" }}>{s.title}</div>
                    <div style={{ fontSize: 11, color: "var(--cw-text-tertiary)", marginTop: 2 }}>{s.src}</div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 500, color: "var(--cw-brand-emerald)",
                    background: "var(--cw-brand-green-tint)",
                    padding: "3px 8px", borderRadius: "var(--cw-radius-sm)",
                  }}>{s.weight}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Safer alternatives (split) ─── */}
        {(sameFit || samePrice) && (
          <>
            <div style={{ marginTop: 24, marginBottom: 10 }}>
              <SectionEyebrow>Safer alternatives</SectionEyebrow>
            </div>
            <div style={{
              display: "grid", gridTemplateColumns: sameFit && samePrice ? "1fr 1fr" : "1fr",
              gap: 10,
            }} className="cw-split-alts">
              {sameFit && (
                <div onClick={() => onScanAlternative?.(`${sameFit.brand} ${sameFit.name}`)}
                     style={{ cursor: "pointer" }}>
                  <SaferAlternative
                    axis="Same fit"
                    brand={sameFit.brand}
                    name={sameFit.name}
                    score={sameFit.score}
                    price={sameFit.price ? `$${sameFit.price}` : null}
                    reason={`+${sameFit.delta} points · ${sameFit.materials || "safer composition"}`}
                  />
                </div>
              )}
              {samePrice && samePrice !== sameFit && (
                <div onClick={() => onScanAlternative?.(`${samePrice.brand} ${samePrice.name}`)}
                     style={{ cursor: "pointer" }}>
                  <SaferAlternative
                    axis="Same price"
                    brand={samePrice.brand}
                    name={samePrice.name}
                    score={samePrice.score}
                    price={samePrice.price ? `$${samePrice.price}` : null}
                    reason={`+${samePrice.delta} points · ${samePrice.materials || "safer composition"}`}
                  />
                </div>
              )}
            </div>
          </>
        )}

        {/* ─── Action bar ─── */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr auto",
          gap: 8, marginTop: 24,
        }}>
          {primaryAction === "wardrobe" ? (
            <CTAButton variant="inApp" onClick={handleSave}>
              {wardrobeSaved ? "Added to wardrobe ✓" : "Add to wardrobe"}
            </CTAButton>
          ) : (
            <CTAButton variant="inApp" onClick={() => {
              const el = document.querySelector('[data-section="alternatives"]') ||
                         document.querySelector('.cw-split-alts');
              el?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}>
              See safer alternatives
            </CTAButton>
          )}
          <CTAButton variant="secondary" onClick={onBack}>
            Scan another
          </CTAButton>
        </div>

        {/* ─── Footer row ─── */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          gap: 12, marginTop: 28, paddingTop: 16,
          borderTop: "var(--cw-border-tertiary)",
          flexWrap: "wrap",
        }}>
          <PrivacyAffordance isPublic={isPublic} onToggle={() => setIsPublic(!isPublic)} />
          <div style={{
            fontSize: 11, color: "var(--cw-text-tertiary)", textAlign: "right",
          }}>CleanWear methodology · updated weekly</div>
        </div>
      </div>

      <style>{`
        @media (max-width: 420px) {
          .cw-split-alts { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
