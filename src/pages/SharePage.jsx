// SharePage — public share view at /s/:scanId
// Per design-handoff.md §4.2.
//
// Data source: URL query params (temporary — pending Supabase schema for
// public scans). Example:
//   /s/demo?b=Nike&n=Dri-FIT+Training+Tee&s=28&g=athletic+tee&from=Maya
//   &ch=PFAS:high,Formaldehyde:mod,Antimony:mod
import { useState } from "react";
import {
  ScoreHero, ChemicalCard, SaferAlternative,
  CTAButton, PrivacyAffordance, SenderPill, FeedRow, DisputeDialog,
} from "../design/components/index.js";

// ─── Citation library (verified per §5.6 audit) ─────────────
// Only cite sources the team has verified. When a chemical's citation is
// unverified, omit rather than invent.
// Verified DOIs — checked against journal source April 2026. Do not
// alter without re-verifying the paper exists at the target URL.
const CITATIONS = {
  pfas: { authors: "Whitehead et al.", year: 2022, journal: "Env Sci & Tech", doi: "https://doi.org/10.1021/acs.est.2c02111" },
  formaldehyde: { authors: "IARC Monograph Vol. 100F", year: 2012, journal: "WHO IARC", doi: "https://publications.iarc.fr/Book-And-Report-Series/Iarc-Monographs-On-The-Identification-Of-Carcinogenic-Hazards-To-Humans/Chemical-Agents-And-Related-Occupations-2012" },
  bpa: { authors: "Rochester & Bolden", year: 2015, journal: "Env Health Perspect", doi: "https://doi.org/10.1289/ehp.1408989" },
  phthalates: { authors: "REACH Annex XVII Entry 51", year: null, journal: "ECHA", doi: "https://echa.europa.eu/substances-restricted-under-reach" },
  antimony: null, // unverified — render without source rather than invent
};

const EQUIVALENCIES = {
  pfas: (
    <>
      A <em className="cw-ital">forever chemical</em> the EU is phasing out in consumer textiles by 2026.{" "}
      <strong style={{ fontWeight: 500 }}>Half-life in human blood: measured in years, not days.</strong>
    </>
  ),
  formaldehyde: (
    <>
      The same compound used to <em className="cw-ital">preserve lab specimens.</em>{" "}
      <strong style={{ fontWeight: 500 }}>Classified Group 1 carcinogen by IARC.</strong>
    </>
  ),
  bpa: (
    <>
      A plasticizer that <em className="cw-ital">mimics estrogen.</em>{" "}
      <strong style={{ fontWeight: 500 }}>Leaches faster when skin sweats.</strong>
    </>
  ),
  phthalates: (
    <>
      Plasticizers that <em className="cw-ital">disrupt hormone signalling.</em>{" "}
      <strong style={{ fontWeight: 500 }}>Linked to reduced testosterone in men.</strong>
    </>
  ),
  antimony: (
    <>
      Polyester production catalyst, <em className="cw-ital">classified possibly carcinogenic</em> by IARC.
    </>
  ),
};

function parseChemicals(str) {
  if (!str) return [];
  return str.split(",").map((chunk) => {
    const [raw, sev = "mod"] = chunk.split(":");
    const key = (raw || "").trim().toLowerCase();
    const name = (raw || "").trim();
    return {
      name,
      severity: sev.trim().toLowerCase() === "high" ? "high" : "mod",
      equivalency: EQUIVALENCIES[key] || null,
      citation: CITATIONS[key] || null,
    };
  });
}

function alarmingSentence(band, topChemical) {
  if (band === "high") {
    return topChemical
      ? `Flagged for ${topChemical} — the kind of chemical the EU is phasing out.`
      : "Scored in the highest-risk band for chemical exposure.";
  }
  if (band === "mod") return "Moderate-risk chemicals detected. Safer options exist at the same price.";
  return "Low-risk composition with no flagged chemicals.";
}

export default function SharePage() {
  const [isPublic, setIsPublic] = useState(true);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const url = new URL(window.location.href);
  const q = url.searchParams;

  const brand = q.get("b") || "The North Face";
  const name = q.get("n") || "Gore-Tex Shell Jacket";
  const score = parseInt(q.get("s") || "43", 10);
  const garment = q.get("g") || "outerwear jacket";
  const fromName = q.get("from") || null;
  const chemicals = parseChemicals(q.get("ch") || "PFAS:high,Antimony:mod,Microplastics:mod");
  const topChemicalName = chemicals[0]?.name || null;

  const band = score >= 70 ? "low" : score >= 40 ? "mod" : "high";
  const sentence = alarmingSentence(band, topChemicalName);

  // collective strip removed — was hardcoded mock data (audit C3)

  // Safer alternative — later: query from productDatabase by category match.
  const alt = {
    brand: "Patagonia",
    name: "Capilene Cool Daily Tee",
    score: 82,
    price: "$45",
    reason: "Same moisture-wicking performance · PFC-free DWR · OEKO-TEX certified.",
  };

  // Mock trending rows (pending /feed data flywheel per §5.7).
  const trending = [
    { rank: 1, thumbnail: "🧥", brand: "The North Face", name: "Gore-Tex Shell Jacket", scans: 2104, score: 43, chips: [{ label: "PFAS", tone: "bad" }] },
    { rank: 2, thumbnail: "👕", brand: "Uniqlo", name: "HEATTECH Ultra Warm", scans: 1247, score: 60, chips: [{ label: "Antimony", tone: "bad" }, { label: "Phthalates", tone: "bad" }] },
    { rank: 3, thumbnail: "👕", brand: "Patagonia", name: "Organic Cotton Tee", scans: 612, score: 88, chips: ["bluesign", "GOTS"] },
  ];

  const launchApp = () => { window.location.href = "/#app"; };
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); } catch {}
  };

  return (
    <div style={{
      fontFamily: "var(--cw-font-sans)",
      background: "var(--cw-bg-primary)",
      color: "var(--cw-text-primary)",
      minHeight: "100vh",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Plus+Jakarta+Sans:wght@400;500&display=swap" rel="stylesheet" />

      <div style={{ maxWidth: 540, margin: "0 auto", padding: "16px 20px 40px" }}>
        {/* ─── Top bar ─── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 10, paddingBottom: 14, marginBottom: 18,
          borderBottom: "var(--cw-border-tertiary)",
        }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <div style={{
              width: 22, height: 22, borderRadius: 4,
              background: "var(--cw-brand-emerald)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 11, fontWeight: 500, fontFamily: "var(--cw-font-sans)",
            }}>C</div>
            <span style={{ fontSize: 15, fontWeight: 500, color: "var(--cw-text-primary)" }}>
              Clean<em style={{
                fontFamily: "var(--cw-font-serif)", fontStyle: "italic", fontWeight: 400,
                color: "var(--cw-brand-emerald)",
              }}>Wear</em>
            </span>
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <PrivacyAffordance isPublic={isPublic} onToggle={() => setIsPublic(!isPublic)} />
            <CTAButton variant="tertiary" size="sm" onClick={launchApp}>Open in app</CTAButton>
          </div>
        </div>

        {/* ─── Sender pill ─── */}
        {fromName && (
          <div style={{ marginBottom: 14 }}>
            <SenderPill name={fromName} timestamp="just now" />
          </div>
        )}

        {/* ─── Score hero ─── */}
        <ScoreHero
          variant="share"
          score={score}
          garment={garment}
          productName={name}
          brand={brand}
          sentence={sentence}
        />

        {/* ─── Chemical card ─── */}
        <div style={{
          fontSize: 11, fontWeight: 500, letterSpacing: "0.1em",
          textTransform: "uppercase", color: "var(--cw-text-tertiary)",
          marginTop: 22, marginBottom: 10,
        }}>Why this score</div>
        <ChemicalCard rows={chemicals} compact />

        {/* ─── Safer alternative ─── */}
        <div style={{
          fontSize: 11, fontWeight: 500, letterSpacing: "0.1em",
          textTransform: "uppercase", color: "var(--cw-text-tertiary)",
          marginTop: 22, marginBottom: 10,
        }}>Consider instead</div>
        <SaferAlternative layout="single" {...alt} />

        {/* ─── Trending today ─── */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          marginTop: 28, marginBottom: 2,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 500, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "var(--cw-text-tertiary)",
          }}>Trending today</div>
          <a href="/feed" style={{
            fontSize: 11, color: "var(--cw-text-secondary)", textDecoration: "none",
          }}>See all →</a>
        </div>
        <div>
          {trending.map((r) => <FeedRow key={r.rank} {...r} />)}
        </div>

        {/* ─── Primary CTA ─── */}
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <CTAButton variant="primary" size="lg" onClick={launchApp}>
            Scan your own closet &nbsp;→
          </CTAButton>
          <div style={{
            fontSize: 12, color: "var(--cw-text-tertiary)", marginTop: 8,
          }}>Free · 30 seconds · no account needed</div>
        </div>

        {/* ─── Footer row ─── */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginTop: 36, paddingTop: 16,
          borderTop: "var(--cw-border-tertiary)",
          fontSize: 11, color: "var(--cw-text-tertiary)",
          flexWrap: "wrap", gap: 8,
        }}>
          <span>Independent methodology · no brand payments.</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setDisputeOpen(true)}
              style={{
                background: "transparent", border: "none", padding: 0,
                fontFamily: "var(--cw-font-sans)",
                fontSize: 11, color: "var(--cw-text-secondary)",
                textDecoration: "underline",
                textDecorationColor: "rgba(26,26,26,0.15)",
                textUnderlineOffset: 2, cursor: "pointer",
              }}
            >Dispute this score</button>
            <CTAButton variant="tertiary" size="sm" onClick={copyLink}>Copy link</CTAButton>
          </div>
        </div>
      </div>

      <DisputeDialog
        open={disputeOpen}
        onClose={() => setDisputeOpen(false)}
        shareSlug={url.pathname.replace('/s/', '')}
      />
    </div>
  );
}
