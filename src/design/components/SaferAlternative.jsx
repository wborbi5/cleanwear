// SaferAlternative — card showing a better-scoring product.
// Per design-handoff.md §3.5. Split view (Results) or single view (Share).
import { bandColors, scoreBand } from "../scoreBand.js";

export default function SaferAlternative({
  axis,          // "Same fit" | "Same price" | undefined
  brand,
  name,
  score,
  price,
  reason,
  layout = "split", // "split" | "single"
}) {
  const band = scoreBand(score);
  const colors = bandColors(band);
  const scoreColor = band === "low" ? "var(--cw-brand-emerald)" : colors.fgLight;

  if (layout === "single") {
    return (
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 18,
        alignItems: "center",
        background: "var(--cw-brand-green-tint)",
        border: "var(--cw-border-accent)",
        borderRadius: "var(--cw-radius-lg)",
        padding: "16px 18px",
      }}>
        <div>
          {brand && <div style={{
            fontSize: 10, fontWeight: 500, letterSpacing: "0.04em",
            textTransform: "uppercase", color: "var(--cw-text-tertiary)", marginBottom: 4,
          }}>{brand}</div>}
          <div style={{
            fontFamily: "var(--cw-font-sans)",
            fontSize: 14, fontWeight: 500, color: "var(--cw-text-primary)",
            letterSpacing: "-0.005em", marginBottom: 6,
          }}>{name}</div>
          {reason && <div style={{
            fontSize: 11, color: "var(--cw-text-secondary)", lineHeight: 1.4,
          }}>{reason}</div>}
        </div>
        <div style={{
          paddingLeft: 18,
          borderLeft: "var(--cw-border-accent)",
          textAlign: "center",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
        }}>
          <span style={{
            fontFamily: "var(--cw-font-serif)", fontSize: 26, fontWeight: 400,
            color: scoreColor, lineHeight: 1,
          }}>{score}</span>
          <span style={{
            fontSize: 9, fontWeight: 500, color: "var(--cw-text-tertiary)",
            letterSpacing: "0.08em", textTransform: "uppercase",
          }}>Score</span>
          {price && <span style={{
            fontSize: 12, fontWeight: 500, color: "var(--cw-text-primary)", marginTop: 4,
          }}>{price}</span>}
        </div>
      </div>
    );
  }

  // split layout
  return (
    <div style={{
      background: "var(--cw-brand-green-tint)",
      border: "var(--cw-border-accent)",
      borderRadius: "var(--cw-radius-lg)",
      padding: "16px 16px 18px",
    }}>
      {axis && <div style={{
        fontSize: 10, fontWeight: 500, letterSpacing: "0.08em",
        textTransform: "uppercase", color: "var(--cw-brand-emerald)", marginBottom: 10,
      }}>{axis}</div>}
      {brand && <div style={{
        fontSize: 10, fontWeight: 500, letterSpacing: "0.04em",
        textTransform: "uppercase", color: "var(--cw-text-tertiary)", marginBottom: 4,
      }}>{brand}</div>}
      <div style={{
        fontFamily: "var(--cw-font-sans)",
        fontSize: 14, fontWeight: 500, color: "var(--cw-text-primary)",
        minHeight: 36, lineHeight: 1.25,
      }}>{name}</div>

      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        marginTop: 10,
      }}>
        <span style={{ fontSize: 11, color: "var(--cw-text-secondary)" }}>Safety score</span>
        <span style={{
          fontFamily: "var(--cw-font-serif)", fontSize: 26, fontWeight: 400,
          color: scoreColor, lineHeight: 1,
        }}>{score}</span>
      </div>

      {price && (
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          marginTop: 4,
        }}>
          <span style={{ fontSize: 11, color: "var(--cw-text-secondary)" }}>Price</span>
          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--cw-text-primary)" }}>{price}</span>
        </div>
      )}

      {reason && (
        <div style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: "0.5px solid rgba(22,101,52,0.15)",
          fontSize: 11, color: "var(--cw-text-secondary)", lineHeight: 1.4,
        }}>{reason}</div>
      )}
    </div>
  );
}
