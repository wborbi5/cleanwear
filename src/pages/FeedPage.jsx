// FeedPage — public feed at /feed.
// Per design-handoff.md §4.3.
//
// Gated behind VITE_FEED_ENABLED per §5.7: "Until you hit 5K cumulative scans
// across >50 unique products, keep /feed behind a feature flag." When the
// flag is off, we render an explanatory "coming soon" state rather than
// leaking sparse data as a public endorsement.
import { useState, useEffect } from "react";
import {
  FeedRow, CTAButton, FeedSkeleton, EmptyFeed,
} from "../design/components/index.js";

const FEED_ENABLED = import.meta.env.VITE_FEED_ENABLED === "true";

// Mock data until Supabase public-scan table lands (see supabase/migrations/0002_public_scans.sql).
const MOCK_FEED = [
  { rank: 1, brand: "Lululemon", name: "Align Leggings", score: 29, scans: 2104, thumbnail: "👖", chips: [{ label: "PFAS", tone: "bad" }] },
  { rank: 2, brand: "Nike", name: "Dri-FIT Training Tee", score: 28, scans: 1247, thumbnail: "👕", chips: [{ label: "Formaldehyde", tone: "bad" }] },
  { rank: 3, brand: "Patagonia", name: "Organic Cotton Tee", score: 88, scans: 612, thumbnail: "👕", chips: ["bluesign", "GOTS"] },
  { rank: 4, brand: "Under Armour", name: "HeatGear Compression", score: 30, scans: 548, thumbnail: "👕", chips: [{ label: "Antimony", tone: "bad" }] },
  { rank: 5, brand: "Uniqlo", name: "Supima Cotton Tee", score: 72, scans: 489, thumbnail: "👕", chips: ["OEKO-TEX"] },
  { rank: 6, brand: "Gymshark", name: "Vital Seamless Tee", score: 32, scans: 412, thumbnail: "👕", chips: [{ label: "PFAS", tone: "bad" }] },
];

const FILTERS = ["All", "Activewear", "Underwear", "Outerwear", "Kids"];

export default function FeedPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [sort, setSort] = useState("trending");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    // Simulate fetch — replace with Supabase query.
    const t = setTimeout(() => {
      setRows(FEED_ENABLED ? MOCK_FEED : []);
      setLoading(false);
    }, 700);
    return () => clearTimeout(t);
  }, []);

  const launchApp = () => { window.location.href = "/#app"; };

  // Flag off: explain why feed is hidden instead of rendering sparse data.
  if (!FEED_ENABLED) {
    return (
      <Shell>
        <div style={{ padding: "48px 20px 24px" }}>
          <Eyebrow>Public feed · coming soon</Eyebrow>
          <Headline>The feed <em className="cw-ital">opens up</em> at 5,000 scans.</Headline>
          <Subcopy>
            We hold the public feed closed until there's enough real-world
            volume to make it honest. A sparse feed would make a few scans
            look like consensus. When cumulative scans cross the threshold,
            the feed goes live here — across every verified product that has
            been scanned more than once.
          </Subcopy>
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <CTAButton variant="primary" size="lg" onClick={launchApp}>Scan something now →</CTAButton>
          </div>
          <div style={{
            marginTop: 12, fontSize: 12, color: "var(--cw-text-tertiary)",
          }}>Your scans help the feed.</div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div style={{ padding: "32px 20px 24px" }}>
        <Eyebrow>Public feed · updated hourly</Eyebrow>
        <Headline>
          What the community is <em className="cw-ital">actually scanning.</em>
        </Headline>
        <Subcopy>
          Every row is a real scan from a real CleanWear user. We never
          editorialize the list — the order below is pure volume.
        </Subcopy>

        {/* Stats strip */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12,
          padding: "18px 0", marginTop: 24,
          borderTop: "var(--cw-border-tertiary)", borderBottom: "var(--cw-border-tertiary)",
        }} className="cw-feed-stats">
          {[
            { n: "14,382", l: "scans this week" },
            { n: "341", l: "unique products" },
            { n: "38", l: "avg score" },
            { n: "1,972", l: "flagged PFAS-positive" },
          ].map((s, i) => (
            <div key={i}>
              <div style={{
                fontFamily: "var(--cw-font-serif)", fontSize: 24, fontWeight: 400,
                color: "var(--cw-text-primary)", letterSpacing: "-0.02em", lineHeight: 1,
              }}>{s.n}</div>
              <div style={{
                fontSize: 11, color: "var(--cw-text-tertiary)", marginTop: 4,
                letterSpacing: "0.02em",
              }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Filters + sort */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginTop: 18, marginBottom: 4, gap: 12, flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {FILTERS.map((f) => {
              const active = f === activeFilter;
              return (
                <button key={f} onClick={() => setActiveFilter(f)} style={{
                  padding: "6px 14px",
                  borderRadius: "var(--cw-radius-pill)",
                  background: active ? "var(--cw-text-primary)" : "transparent",
                  color: active ? "var(--cw-bg-primary)" : "var(--cw-text-secondary)",
                  border: active ? "0.5px solid var(--cw-text-primary)" : "var(--cw-border-tertiary)",
                  fontFamily: "var(--cw-font-sans)",
                  fontSize: 12, fontWeight: 500, cursor: "pointer",
                  transition: "all 0.15s ease",
                }}>{f}</button>
              );
            })}
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value)} style={{
            padding: "6px 10px",
            border: "var(--cw-border-tertiary)",
            borderRadius: "var(--cw-radius-md)",
            background: "var(--cw-bg-primary)",
            color: "var(--cw-text-secondary)",
            fontFamily: "var(--cw-font-sans)",
            fontSize: 12, fontWeight: 400,
            cursor: "pointer",
          }}>
            <option value="trending">Trending</option>
            <option value="worst">Worst first</option>
            <option value="best">Best first</option>
          </select>
        </div>

        {/* Rows */}
        <div style={{ marginTop: 4 }}>
          {loading && <FeedSkeleton rows={6} />}
          {!loading && rows.length === 0 && <EmptyFeed onScan={launchApp} />}
          {!loading && rows.length > 0 && rows.map((r) => <FeedRow key={r.rank} {...r} />)}
        </div>

        {/* Footer CTA */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "36px 0 0", marginTop: 24,
          borderTop: "var(--cw-border-tertiary)",
          flexWrap: "wrap", gap: 16,
        }}>
          <div style={{
            fontFamily: "var(--cw-font-serif)", fontSize: 20, fontWeight: 400,
            color: "var(--cw-text-primary)", letterSpacing: "-0.01em",
          }}>Your scans <em className="cw-ital">help the feed.</em></div>
          <CTAButton variant="primary" onClick={launchApp}>Add your scan</CTAButton>
        </div>

        <div style={{
          marginTop: 36, paddingTop: 16,
          borderTop: "var(--cw-border-tertiary)",
          fontSize: 11, color: "var(--cw-text-tertiary)",
        }}>
          Independent methodology · no brand payments. Only verified-product scans are shown.
        </div>
      </div>

      <style>{`
        @media (max-width: 560px) {
          .cw-feed-stats { grid-template-columns: repeat(2, 1fr) !important; gap: 14px 20px !important; }
        }
      `}</style>
    </Shell>
  );
}

// ───────────────────────────────────────────────────────────
// Layout primitives — kept local; landing/share have their own top bars.
// ───────────────────────────────────────────────────────────
function Shell({ children }) {
  return (
    <div style={{
      fontFamily: "var(--cw-font-sans)",
      background: "var(--cw-bg-primary)",
      color: "var(--cw-text-primary)",
      minHeight: "100vh",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Plus+Jakarta+Sans:wght@400;500&display=swap" rel="stylesheet" />
      <TopBar />
      <div style={{ maxWidth: 820, margin: "0 auto" }}>{children}</div>
    </div>
  );
}

function TopBar() {
  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 20,
      background: "rgba(255,255,255,0.92)",
      backdropFilter: "blur(18px)",
      borderBottom: "var(--cw-border-tertiary)",
      padding: "14px 20px",
    }}>
      <div style={{
        maxWidth: 820, margin: "0 auto",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div style={{
            width: 22, height: 22, borderRadius: 4,
            background: "var(--cw-brand-emerald)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 11, fontWeight: 500,
          }}>C</div>
          <span style={{ fontSize: 15, fontWeight: 500, color: "var(--cw-text-primary)" }}>
            Clean<em style={{
              fontFamily: "var(--cw-font-serif)", fontStyle: "italic", fontWeight: 400,
              color: "var(--cw-brand-emerald)",
            }}>Wear</em>
          </span>
        </a>
        <a href="/#app" style={{
          fontFamily: "var(--cw-font-sans)", fontSize: 13, fontWeight: 500,
          color: "#fff", background: "var(--cw-brand-emerald)",
          padding: "8px 16px", borderRadius: "var(--cw-radius-pill)",
          textDecoration: "none",
        }}>Scan now</a>
      </div>
    </div>
  );
}

function Eyebrow({ children }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      fontSize: 11, fontWeight: 500, letterSpacing: "0.1em",
      textTransform: "uppercase", color: "var(--cw-text-tertiary)",
      marginBottom: 14,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--cw-brand-emerald)" }} />
      {children}
    </div>
  );
}

function Headline({ children }) {
  return (
    <h1 style={{
      fontFamily: "var(--cw-font-serif)",
      fontSize: "clamp(28px, 4.2vw, 40px)",
      fontWeight: 400, color: "var(--cw-text-primary)",
      letterSpacing: "-0.01em", lineHeight: 1.15,
      margin: "0 0 16px",
    }}>{children}</h1>
  );
}

function Subcopy({ children }) {
  return (
    <p style={{
      fontSize: 15, lineHeight: 1.7, color: "var(--cw-text-secondary)",
      maxWidth: 560, margin: "0 0 20px",
    }}>{children}</p>
  );
}
