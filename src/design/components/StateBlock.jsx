// StateBlock — error, empty, and loading surfaces.
// Per design-handoff.md §5.3 (error/empty) and §5.4 (loading).
// One file, multiple named exports so state handling stays co-located.
import CTAButton from "./CTAButton.jsx";

// ───────────────────────────────────────────────────────────
// ScanFailed — tag unreadable, no network, API error.
// Per §5.3.
// ───────────────────────────────────────────────────────────
export function ScanFailed({ reason, onRetry, onFabricDetective }) {
  return (
    <div style={wrap}>
      <div style={eyebrow}>Scan failed</div>
      <div style={headline}>
        We couldn't read that <em className="cw-ital">cleanly.</em>
      </div>
      <p style={body}>
        {reason || "The image or search didn't resolve to a product we can score. You can try again or let us walk the fabric composition with you manually."}
      </p>
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        {onRetry && <CTAButton variant="secondary" onClick={onRetry}>Try again</CTAButton>}
        {onFabricDetective && <CTAButton variant="primary" onClick={onFabricDetective}>Try Fabric Detective</CTAButton>}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// NotInDatabase — product not yet scored.
// Per §5.3. Invites user contribution (6-question flow not yet wired).
// ───────────────────────────────────────────────────────────
export function NotInDatabase({ productName, onContribute, onSearch }) {
  return (
    <div style={{ ...wrap, background: "var(--cw-bg-dark)", color: "var(--cw-text-inv-primary)" }}>
      <div style={{ ...eyebrow, color: "rgba(245,245,240,0.55)" }}>Product not yet scored</div>
      <div style={{ ...headline, color: "var(--cw-text-inv-primary)" }}>
        We haven't scanned <em className="cw-ital">{productName || "this one"}</em> yet.
      </div>
      <p style={{ ...body, color: "rgba(245,245,240,0.7)" }}>
        No public record matched. You can help us build the first score — tell us what's on the tag and we'll run it through the methodology.
      </p>
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        {onSearch && <CTAButton variant="secondary" onClick={onSearch} style={{
          color: "var(--cw-text-inv-primary)",
          borderColor: "rgba(245,245,240,0.3)",
        }}>Search a different product</CTAButton>}
        {onContribute && <CTAButton variant="primary" onClick={onContribute}>Contribute this scan →</CTAButton>}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// EmptyWardrobe — first-time user state.
// Per §5.3.
// ───────────────────────────────────────────────────────────
export function EmptyWardrobe({ onScan }) {
  return (
    <div style={{ ...wrap, textAlign: "center", padding: "48px 24px" }}>
      <div style={{
        fontSize: 40, marginBottom: 16, opacity: 0.35,
      }}>👕</div>
      <div style={{ ...headline, fontSize: 22, marginBottom: 8 }}>
        Your wardrobe is <em className="cw-ital">empty.</em>
      </div>
      <p style={{ ...body, maxWidth: 320, margin: "0 auto 18px" }}>
        Scan your first garment and we'll start building a chemical profile of what touches your skin.
      </p>
      <CTAButton variant="primary" size="lg" onClick={onScan}>Scan your first garment</CTAButton>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// EmptyFeed — fallback if the public feed has no entries.
// Per §5.3. Should rarely render in production once /feed hits threshold.
// ───────────────────────────────────────────────────────────
export function EmptyFeed({ onScan }) {
  return (
    <div style={{ ...wrap, textAlign: "center" }}>
      <div style={eyebrow}>Public feed</div>
      <div style={headline}>
        The feed is <em className="cw-ital">just getting started.</em>
      </div>
      <p style={body}>
        Your scan will be the first — help the feed fill out with real data from real closets.
      </p>
      {onScan && <CTAButton variant="primary" onClick={onScan}>Add your scan</CTAButton>}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// ScanProgress — animated loading state for scan in flight.
// Per §5.4. "Cross-referencing 14 databases…" cadence.
// ───────────────────────────────────────────────────────────
export function ScanProgress({ step }) {
  const defaultSteps = [
    "Reading fabric composition…",
    "Cross-referencing 14 databases…",
    "Flagging restricted chemicals…",
    "Building safety score…",
  ];
  const currentStep = step || defaultSteps[0];

  return (
    <div style={{ ...wrap, textAlign: "center", padding: "64px 24px" }}>
      <div style={{
        width: 44, height: 44, borderRadius: "50%",
        border: "2.5px solid rgba(26,26,26,0.08)",
        borderTopColor: "var(--cw-brand-emerald)",
        margin: "0 auto 20px",
        animation: "cw-spin 0.8s linear infinite",
      }} />
      <div style={{
        fontFamily: "var(--cw-font-sans)",
        fontSize: 14, fontWeight: 500, color: "var(--cw-text-primary)",
        marginBottom: 6,
      }}>Analyzing this garment</div>
      <div style={{
        fontFamily: "var(--cw-font-sans)",
        fontSize: 12, color: "var(--cw-brand-emerald)",
        animation: "cw-pulse 1.5s ease-in-out infinite",
      }}>{currentStep}</div>
      <style>{`
        @keyframes cw-spin { to { transform: rotate(360deg); } }
        @keyframes cw-pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
      `}</style>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// FeedSkeleton — placeholder rows while feed loads.
// Per §5.4.
// ───────────────────────────────────────────────────────────
export function FeedSkeleton({ rows = 5 }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{
          display: "grid",
          gridTemplateColumns: "22px 44px 1fr 64px 48px",
          gap: 12,
          padding: "16px 4px",
          borderTop: "var(--cw-border-tertiary)",
          alignItems: "center",
        }}>
          <div style={sk(14)} />
          <div style={{ ...sk(54), width: 44 }} />
          <div>
            <div style={{ ...sk(10), width: 60, marginBottom: 6 }} />
            <div style={{ ...sk(14), width: "70%" }} />
          </div>
          <div>
            <div style={{ ...sk(12), width: 52, marginLeft: "auto", marginBottom: 4 }} />
            <div style={{ ...sk(9), width: 70, marginLeft: "auto" }} />
          </div>
          <div style={{ ...sk(20), width: 36 }} />
        </div>
      ))}
      <style>{`@keyframes cw-shimmer { 0% { opacity: 0.5; } 50% { opacity: 0.85; } 100% { opacity: 0.5; } }`}</style>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// ResultsCalculating — dark hero placeholder shaped like ScoreHero.
// Per §5.4.
// ───────────────────────────────────────────────────────────
export function ResultsCalculating() {
  return (
    <div style={{
      background: "var(--cw-bg-dark)",
      borderRadius: "var(--cw-radius-lg)",
      padding: "44px 28px 36px",
      color: "var(--cw-text-inv-primary)",
      fontFamily: "var(--cw-font-sans)",
    }}>
      <div style={{
        fontSize: 11, fontWeight: 500, letterSpacing: "0.14em",
        textTransform: "uppercase", color: "rgba(245,245,240,0.45)", marginBottom: 6,
      }}>CleanWear safety score</div>
      <div style={{
        fontFamily: "var(--cw-font-serif)",
        fontSize: 140, fontWeight: 400, lineHeight: 1,
        letterSpacing: "-0.02em",
        color: "rgba(245,245,240,0.2)",
        animation: "cw-pulse 1.8s ease-in-out infinite",
      }}>—<span style={{ fontSize: 30, opacity: 0.3 }}>/100</span></div>
      <div style={{
        fontFamily: "var(--cw-font-serif)", fontStyle: "italic",
        fontSize: 18, fontWeight: 400,
        color: "rgba(245,245,240,0.55)", marginTop: 10,
      }}>Analyzing…</div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// shared styles
// ───────────────────────────────────────────────────────────
const wrap = {
  background: "var(--cw-bg-primary)",
  border: "var(--cw-border-tertiary)",
  borderRadius: "var(--cw-radius-lg)",
  padding: "28px 32px",
  fontFamily: "var(--cw-font-sans)",
};

const eyebrow = {
  display: "inline-block",
  fontSize: 11, fontWeight: 500, letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--cw-text-tertiary)",
  marginBottom: 12,
};

const headline = {
  fontFamily: "var(--cw-font-serif)",
  fontSize: 26, fontWeight: 400,
  color: "var(--cw-text-primary)",
  letterSpacing: "-0.01em",
  lineHeight: 1.2,
  margin: "0 0 10px",
};

const body = {
  fontSize: 14, lineHeight: 1.6,
  color: "var(--cw-text-secondary)",
  margin: "0 0 16px",
  maxWidth: 440,
};

const sk = (h) => ({
  height: h, borderRadius: 4,
  background: "var(--cw-bg-secondary)",
  animation: "cw-shimmer 1.4s ease-in-out infinite",
});
