import { useState } from "react";
import { BRANDS, BRAND_TIERS } from "./brandDatabase.js";

function sc(s) { if (s >= 75) return "#4ade80"; if (s >= 60) return "#a3e635"; if (s >= 45) return "#facc15"; if (s >= 30) return "#fb923c"; return "#f87171"; }

export default function BrandExplore({ onScanProduct }) {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState(null);

  const filtered = BRANDS.filter(b => {
    const matchTier = tierFilter === "all" || b.tier === tierFilter;
    const matchSearch = !search || b.name.toLowerCase().includes(search.toLowerCase());
    return matchTier && matchSearch;
  }).sort((a, b) => b.score - a.score);

  // ---- BRAND DETAIL VIEW ----
  if (selectedBrand) {
    const b = selectedBrand;
    const catGroups = {};
    b.products.forEach(p => {
      if (!catGroups[p.cat]) catGroups[p.cat] = [];
      catGroups[p.cat].push(p);
    });

    return (
      <div style={{ paddingBottom: 20 }}>
        {/* Back button */}
        <div style={{ padding: "16px 24px 0" }}>
          <button onClick={() => setSelectedBrand(null)} style={{
            background: "none", border: "none", color: "var(--g4)",
            fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600,
            cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 6
          }}>← All Brands</button>
        </div>

        {/* Brand header */}
        <div style={{ padding: "20px 24px 28px", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>{b.logo}</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{b.name}</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", border: `2.5px solid ${sc(b.score)}`,
              background: "rgba(0,0,0,.25)"
            }}>
              <div style={{ fontFamily: "var(--serif)", fontSize: 26, fontWeight: 800, color: sc(b.score), lineHeight: 1 }}>{b.score}</div>
              <div style={{ fontSize: 9, opacity: .4 }}>/100</div>
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{
                fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1,
                color: BRAND_TIERS[b.tier].color, marginBottom: 2
              }}>{BRAND_TIERS[b.tier].label}</div>
              <div style={{ fontSize: 12, color: "var(--tx4)" }}>Health Score</div>
            </div>
          </div>
          <p style={{ fontSize: 14, color: "var(--tx3)", lineHeight: 1.6, maxWidth: 360, margin: "0 auto" }}>{b.summary}</p>
        </div>

        {/* Chemicals detected */}
        {b.chemicals.length > 0 && (
          <div style={{ padding: "0 24px", marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "var(--r4)", marginBottom: 10 }}>
              Chemical Concerns
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {b.chemicals.map(c => (
                <span key={c} style={{
                  padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                  background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.15)",
                  color: "var(--r4)", textTransform: "capitalize"
                }}>{c.replace(/_/g, " ")}</span>
              ))}
            </div>
          </div>
        )}

        {/* Certifications */}
        {b.certs.length > 0 && (
          <div style={{ padding: "0 24px", marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "var(--g4)", marginBottom: 10 }}>
              Certifications
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {b.certs.map(c => (
                <span key={c} style={{
                  padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                  background: "rgba(74,222,128,.08)", border: "1px solid rgba(74,222,128,.15)",
                  color: "var(--g4)"
                }}>{c}</span>
              ))}
            </div>
          </div>
        )}

        {/* Typical materials */}
        <div style={{ padding: "0 24px", marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "var(--tx4)", marginBottom: 10 }}>
            Typical Materials
          </div>
          <div style={{ fontSize: 13, color: "var(--tx3)", lineHeight: 1.6 }}>
            {b.materials.join(" · ")}
          </div>
          <div style={{ fontSize: 12, color: "var(--tx4)", marginTop: 6 }}>
            Made in: {b.origin}
          </div>
        </div>

        {/* Products by category */}
        <div style={{ padding: "0 24px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "var(--tx4)", marginBottom: 14 }}>
            Products — Tap to Scan
          </div>
          {Object.entries(catGroups).map(([cat, products]) => (
            <div key={cat} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "var(--tx4)", fontWeight: 600, letterSpacing: .5, marginBottom: 8, textTransform: "uppercase" }}>{cat}</div>
              {products.map((p, i) => (
                <div key={i} onClick={() => onScanProduct(`${b.name} ${p.name}`)} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
                  background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 14,
                  marginBottom: 8, cursor: "pointer", transition: "all .2s"
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--serif)", fontWeight: 800, fontSize: 14,
                    background: `${sc(p.score)}14`, color: sc(p.score), border: `1px solid ${sc(p.score)}33`
                  }}>{p.score}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--tx4)" }}>→</div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Scan anything from this brand */}
        <div style={{ padding: "16px 24px" }}>
          <button onClick={() => onScanProduct(b.name)} style={{
            width: "100%", padding: 14, background: "var(--s1)", border: "1px solid var(--bd)",
            borderRadius: 14, color: "var(--g4)", fontFamily: "var(--sans)", fontWeight: 600,
            fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", gap: 8
          }}>
            🔍 Scan any {b.name} product
          </button>
        </div>
      </div>
    );
  }

  // ---- BRAND LIST VIEW ----
  return (
    <div>
      {/* Search + filters */}
      <div style={{ padding: "20px 24px", position: "sticky", top: 52, background: "rgba(3,10,3,.9)", backdropFilter: "blur(20px)", zIndex: 10 }}>
        <input
          placeholder="Search brands…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: "100%", padding: "15px 18px", background: "var(--s1)",
            border: "1.5px solid var(--bd)", borderRadius: 14, color: "var(--tx)",
            fontFamily: "var(--sans)", fontSize: 15, outline: "none", fontWeight: 400
          }}
        />
        <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
          {[
            { key: "all", label: "All Brands", color: "var(--tx3)" },
            { key: "safe", label: "✓ Low Risk", color: "#4ade80" },
            { key: "moderate", label: "~ Moderate", color: "#facc15" },
            { key: "high_risk", label: "✕ High Risk", color: "#f87171" },
          ].map(f => (
            <button key={f.key} onClick={() => setTierFilter(f.key)} style={{
              padding: "7px 14px", borderRadius: 20, fontSize: 11, fontWeight: 600,
              fontFamily: "var(--sans)", cursor: "pointer", whiteSpace: "nowrap",
              border: `1px solid ${tierFilter === f.key ? f.color + "66" : "var(--bd)"}`,
              background: tierFilter === f.key ? f.color + "14" : "var(--s1)",
              color: tierFilter === f.key ? f.color : "var(--tx3)",
              transition: "all .2s"
            }}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ padding: "10px 24px 4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 11, color: "var(--tx4)", fontWeight: 600, letterSpacing: .5 }}>
          {filtered.length} BRANDS
        </div>
        <div style={{ fontSize: 10, color: "var(--tx4)", display: "flex", gap: 12 }}>
          <span>🟢 {BRANDS.filter(b => b.tier === "safe").length} safe</span>
          <span>🟡 {BRANDS.filter(b => b.tier === "moderate").length} moderate</span>
          <span>🔴 {BRANDS.filter(b => b.tier === "high_risk").length} risky</span>
        </div>
      </div>

      {/* Brand list */}
      <div style={{ padding: "8px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map(b => (
          <div key={b.id} onClick={() => setSelectedBrand(b)} style={{
            display: "flex", alignItems: "center", gap: 14, padding: "16px 18px",
            background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 14,
            cursor: "pointer", transition: "all .25s"
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--serif)", fontWeight: 800, fontSize: 16,
              background: `${sc(b.score)}14`, color: sc(b.score), border: `1px solid ${sc(b.score)}33`
            }}>{b.score}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, letterSpacing: -.2 }}>{b.logo} {b.name}</div>
              <div style={{
                fontSize: 11, marginTop: 3, color: BRAND_TIERS[b.tier].color,
                fontWeight: 600, textTransform: "uppercase", letterSpacing: .5
              }}>{BRAND_TIERS[b.tier].label} · {b.products.length} products</div>
            </div>
            <div style={{ fontSize: 12, color: "var(--tx4)" }}>→</div>
          </div>
        ))}
      </div>
    </div>
  );
}
