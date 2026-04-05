import { useState, useMemo } from "react";
import { BRANDS, BRAND_TIERS } from "./brandDatabase.js";
import { PRODUCTS, PRODUCT_CATEGORIES } from "./productDatabase.js";

function sc(s) { if (s >= 75) return "#16a34a"; if (s >= 60) return "#65a30d"; if (s >= 45) return "#ca8a04"; if (s >= 30) return "#ea580c"; return "#dc2626"; }
function tierOf(s) { return s >= 70 ? "safe" : s >= 45 ? "moderate" : "high_risk"; }

export default function BrandExplore({ onScanProduct, onScanProductDirect }) {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("all");
  const [mode, setMode] = useState("products");
  const [selectedBrand, setSelectedBrand] = useState(null);

  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter(p => {
      const t = tierOf(p.score);
      const matchTier = tierFilter === "all" || t === tierFilter;
      const matchCat = catFilter === "all" || p.category === catFilter;
      const matchSearch = !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.brand.toLowerCase().includes(search.toLowerCase()) ||
        (p.materialsDisplay || "").toLowerCase().includes(search.toLowerCase());
      return matchTier && matchCat && matchSearch;
    }).sort((a, b) => b.score - a.score);
  }, [search, tierFilter, catFilter]);

  const filteredBrands = useMemo(() => {
    return BRANDS.filter(b => {
      const matchTier = tierFilter === "all" || b.tier === tierFilter;
      const matchSearch = !search || b.name.toLowerCase().includes(search.toLowerCase());
      return matchTier && matchSearch;
    }).sort((a, b) => b.score - a.score);
  }, [search, tierFilter]);

  const productCounts = useMemo(() => ({
    safe: PRODUCTS.filter(p => p.score >= 70).length,
    moderate: PRODUCTS.filter(p => p.score >= 45 && p.score < 70).length,
    high_risk: PRODUCTS.filter(p => p.score < 45).length,
  }), []);

  // ---- BRAND DETAIL VIEW ----
  if (selectedBrand) {
    const b = selectedBrand;
    const catGroups = {};
    const brandProducts = [...(b.products || [])];
    PRODUCTS.filter(p => p.brand.toLowerCase() === b.name.toLowerCase()).forEach(p => {
      if (!brandProducts.some(bp => bp.name === p.name.replace(b.name + " ", ""))) {
        brandProducts.push({ name: p.name.replace(b.name + " ", ""), score: p.score, cat: p.category });
      }
    });
    brandProducts.forEach(p => {
      if (!catGroups[p.cat]) catGroups[p.cat] = [];
      catGroups[p.cat].push(p);
    });

    return (
      <div style={{ paddingBottom: 20 }}>
        <div style={{ padding: "16px 24px 0" }}>
          <button onClick={() => setSelectedBrand(null)} style={{
            background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 12,
            padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "var(--g6)",
            cursor: "pointer", fontFamily: "var(--sans)"
          }}>&#8592; All Brands</button>
        </div>

        <div style={{ padding: "24px 24px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>{b.logo}</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{b.name}</div>
          <div style={{
            display: "inline-block", padding: "4px 16px", borderRadius: 20,
            background: sc(b.score) + "12", color: sc(b.score),
            fontSize: 13, fontWeight: 700, marginBottom: 12
          }}>{b.score}/100 &#183; {BRAND_TIERS[b.tier].label}</div>
          <p style={{ fontSize: 14, color: "var(--tx3)", lineHeight: 1.6, maxWidth: 400, margin: "0 auto" }}>{b.summary}</p>
        </div>

        {b.certs && b.certs.length > 0 && (
          <div style={{ padding: "0 24px", marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {b.certs.map((c, i) => (
                <span key={i} style={{
                  padding: "4px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                  background: "#f0fdf4", border: "1px solid #dcfce7", color: "#16a34a"
                }}>{c}</span>
              ))}
            </div>
          </div>
        )}

        <div style={{ padding: "0 24px", marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "var(--tx4)", marginBottom: 10 }}>
            Typical Materials
          </div>
          <div style={{ fontSize: 13, color: "var(--tx3)", lineHeight: 1.6 }}>
            {b.materials.join(" \u00b7 ")}
          </div>
          <div style={{ fontSize: 12, color: "var(--tx4)", marginTop: 6 }}>
            Made in: {b.origin}
          </div>
        </div>

        <div style={{ padding: "0 24px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "var(--tx4)", marginBottom: 14 }}>
            {brandProducts.length} Products &#8212; Tap to Scan
          </div>
          {Object.entries(catGroups).map(([cat, products]) => (
            <div key={cat} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "var(--tx4)", fontWeight: 600, letterSpacing: .5, marginBottom: 8, textTransform: "uppercase" }}>{cat}</div>
              {products.map((p, i) => (
                <div key={i} onClick={() => {
                  const fullProduct = PRODUCTS.find(fp => fp.brand.toLowerCase() === b.name.toLowerCase() && fp.name === p.name);
                  if (fullProduct && onScanProductDirect) onScanProductDirect(fullProduct);
                  else onScanProduct(b.name + " " + p.name);
                }} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
                  background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 14,
                  marginBottom: 8, cursor: "pointer", transition: "all .2s"
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--serif)", fontWeight: 800, fontSize: 14,
                    background: sc(p.score) + "12", color: sc(p.score), border: "1px solid " + sc(p.score) + "25"
                  }}>{p.score}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--tx4)" }}>&#8594;</div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ padding: "16px 24px" }}>
          <button onClick={() => onScanProduct(b.name)} style={{
            width: "100%", padding: 14, background: "var(--s1)", border: "1px solid var(--bd)",
            borderRadius: 14, color: "var(--g6)", fontFamily: "var(--sans)", fontWeight: 600,
            fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", gap: 8
          }}>
            &#128269; Scan any {b.name} product
          </button>
        </div>
      </div>
    );
  }

  // ---- LIST VIEW ----
  return (
    <div>
      <div style={{ padding: "20px 24px 12px", position: "sticky", top: 52, background: "rgba(250,250,247,0.92)", backdropFilter: "blur(20px)", zIndex: 10 }}>
        <input
          placeholder={mode === "products" ? "Search products, brands, materials..." : "Search brands..."}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: "100%", padding: "15px 18px", background: "var(--s1)",
            border: "1.5px solid var(--bd)", borderRadius: 14, color: "var(--tx)",
            fontFamily: "var(--sans)", fontSize: 15, outline: "none", fontWeight: 400
          }}
        />

        <div style={{ display: "flex", gap: 4, marginTop: 12, background: "var(--s1)", borderRadius: 12, padding: 3, border: "1px solid var(--bd)" }}>
          <button onClick={() => setMode("products")} style={{
            flex: 1, padding: "9px 12px", borderRadius: 10, fontSize: 12, fontWeight: 600,
            fontFamily: "var(--sans)", cursor: "pointer", border: "none", transition: "all .2s",
            background: mode === "products" ? "var(--g5)" : "transparent",
            color: mode === "products" ? "#fff" : "var(--tx3)",
          }}>Products ({PRODUCTS.length})</button>
          <button onClick={() => setMode("brands")} style={{
            flex: 1, padding: "9px 12px", borderRadius: 10, fontSize: 12, fontWeight: 600,
            fontFamily: "var(--sans)", cursor: "pointer", border: "none", transition: "all .2s",
            background: mode === "brands" ? "var(--g5)" : "transparent",
            color: mode === "brands" ? "#fff" : "var(--tx3)",
          }}>Brands ({BRANDS.length})</button>
        </div>

        <div style={{ display: "flex", gap: 6, marginTop: 10, overflowX: "auto", paddingBottom: 2 }}>
          {[
            { key: "all", label: "All", color: "var(--tx3)" },
            { key: "safe", label: "Low Risk", color: "#16a34a" },
            { key: "moderate", label: "Moderate", color: "#ca8a04" },
            { key: "high_risk", label: "High Risk", color: "#dc2626" },
          ].map(f => (
            <button key={f.key} onClick={() => setTierFilter(f.key)} style={{
              padding: "6px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600,
              fontFamily: "var(--sans)", cursor: "pointer", whiteSpace: "nowrap",
              border: "1px solid " + (tierFilter === f.key ? f.color + "44" : "var(--bd)"),
              background: tierFilter === f.key ? f.color + "10" : "var(--s1)",
              color: tierFilter === f.key ? f.color : "var(--tx4)",
              transition: "all .2s"
            }}>{f.label}</button>
          ))}
          {mode === "products" && (
            <>
              <div style={{ width: 1, background: "var(--bd)", margin: "2px 4px" }} />
              {["all", ...PRODUCT_CATEGORIES].map(cat => (
                <button key={cat} onClick={() => setCatFilter(cat)} style={{
                  padding: "6px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                  fontFamily: "var(--sans)", cursor: "pointer", whiteSpace: "nowrap",
                  border: "1px solid " + (catFilter === cat ? "#16a34a44" : "var(--bd)"),
                  background: catFilter === cat ? "#16a34a10" : "var(--s1)",
                  color: catFilter === cat ? "#16a34a" : "var(--tx4)",
                  transition: "all .2s"
                }}>{cat === "all" ? "All Types" : cat}</button>
              ))}
            </>
          )}
        </div>
      </div>

      <div style={{ padding: "10px 24px 4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 11, color: "var(--tx4)", fontWeight: 600, letterSpacing: .5 }}>
          {mode === "products" ? filteredProducts.length + " PRODUCTS" : filteredBrands.length + " BRANDS"}
        </div>
        <div style={{ fontSize: 10, color: "var(--tx4)", display: "flex", gap: 12 }}>
          {mode === "products" ? (<>
            <span style={{ color: "#16a34a" }}>&#9679; {productCounts.safe} safe</span>
            <span style={{ color: "#ca8a04" }}>&#9679; {productCounts.moderate} moderate</span>
            <span style={{ color: "#dc2626" }}>&#9679; {productCounts.high_risk} risky</span>
          </>) : (<>
            <span style={{ color: "#16a34a" }}>&#9679; {BRANDS.filter(b => b.tier === "safe").length} safe</span>
            <span style={{ color: "#ca8a04" }}>&#9679; {BRANDS.filter(b => b.tier === "moderate").length} moderate</span>
            <span style={{ color: "#dc2626" }}>&#9679; {BRANDS.filter(b => b.tier === "high_risk").length} risky</span>
          </>)}
        </div>
      </div>

      {mode === "products" && (
        <div style={{ padding: "8px 24px", display: "flex", flexDirection: "column", gap: 6 }}>
          {filteredProducts.slice(0, 100).map(p => (
            <div key={p.id} onClick={() => {
              if (onScanProductDirect) onScanProductDirect(p);
              else onScanProduct(p.name);
            }} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
              background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 14,
              cursor: "pointer", transition: "all .2s"
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--serif)", fontWeight: 800, fontSize: 15,
                background: sc(p.score) + "12", color: sc(p.score), border: "1px solid " + sc(p.score) + "25"
              }}>{p.score}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                <div style={{ fontSize: 11, color: "var(--tx4)", marginTop: 2 }}>
                  {p.brand} {"\u00b7"} {p.category}{p.materialsDisplay ? ` \u00b7 ${p.materialsDisplay.split(",")[0].trim()}` : ""}
                </div>
              </div>
              <div style={{ fontSize: 12, color: "var(--tx4)" }}>&#8594;</div>
            </div>
          ))}
          {filteredProducts.length > 100 && (
            <div style={{ textAlign: "center", padding: 16, fontSize: 13, color: "var(--tx4)" }}>
              Showing 100 of {filteredProducts.length} products. Use search to narrow results.
            </div>
          )}
          {filteredProducts.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "var(--tx4)", fontSize: 14 }}>
              No products match your filters.
            </div>
          )}
        </div>
      )}

      {mode === "brands" && (
        <div style={{ padding: "8px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
          {filteredBrands.map(b => (
            <div key={b.id} onClick={() => setSelectedBrand(b)} style={{
              display: "flex", alignItems: "center", gap: 14, padding: "16px 18px",
              background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 14,
              cursor: "pointer", transition: "all .25s"
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--serif)", fontWeight: 800, fontSize: 16,
                background: sc(b.score) + "12", color: sc(b.score), border: "1px solid " + sc(b.score) + "25"
              }}>{b.score}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, letterSpacing: -.2 }}>{b.logo} {b.name}</div>
                <div style={{
                  fontSize: 11, marginTop: 3, color: BRAND_TIERS[b.tier].color,
                  fontWeight: 600, textTransform: "uppercase", letterSpacing: .5
                }}>{BRAND_TIERS[b.tier].label} &#183; {b.products.length} products</div>
              </div>
              <div style={{ fontSize: 12, color: "var(--tx4)" }}>&#8594;</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
