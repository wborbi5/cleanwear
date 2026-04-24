// FeedRow — single row in the public feed.
// Per design-handoff.md §3.9.
import { bandColors, scoreBand } from "../scoreBand.js";

export default function FeedRow({ rank, thumbnail, brand, name, chips = [], scans, score }) {
  const band = scoreBand(score);
  const colors = bandColors(band);
  const scoreColor = band === "low" ? "var(--cw-brand-emerald)" : colors.fgLight;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "22px 44px 1fr auto auto",
        gap: 12,
        alignItems: "center",
        padding: "16px 4px",
        borderTop: "var(--cw-border-tertiary)",
        fontFamily: "var(--cw-font-sans)",
        cursor: "pointer",
        transition: "background 0.15s ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--cw-bg-secondary)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      <div style={{
        fontFamily: "var(--cw-font-serif)",
        fontSize: 14, fontWeight: 400,
        color: "var(--cw-text-tertiary)",
        textAlign: "center",
      }}>{rank}</div>
      <div style={{
        width: 44, height: 54, borderRadius: 4,
        background: "var(--cw-bg-secondary)",
        border: "var(--cw-border-tertiary)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22,
      }}>{thumbnail || "👕"}</div>
      <div>
        {brand && <div style={{
          fontSize: 10, fontWeight: 500, letterSpacing: "0.04em",
          textTransform: "uppercase", color: "var(--cw-text-tertiary)",
        }}>{brand}</div>}
        <div style={{
          fontSize: 14, fontWeight: 500, color: "var(--cw-text-primary)",
          letterSpacing: "-0.005em", marginTop: 2,
        }}>{name}</div>
        {chips.length > 0 && (
          <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
            {chips.map((c, i) => {
              const isBad = c.tone === "bad";
              return (
                <span key={i} style={{
                  padding: "3px 7px",
                  fontSize: 9, fontWeight: 500,
                  letterSpacing: "0.02em",
                  borderRadius: "var(--cw-radius-sm)",
                  background: isBad ? "var(--cw-score-high-bg)" : "var(--cw-bg-secondary)",
                  color: isBad ? "var(--cw-score-high-light)" : "var(--cw-text-secondary)",
                }}>{c.label || c}</span>
              );
            })}
          </div>
        )}
      </div>
      <div style={{ textAlign: "right", minWidth: 64 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--cw-text-primary)" }}>
          {typeof scans === "number" ? scans.toLocaleString() : scans}
        </div>
        <div style={{
          fontSize: 10, color: "var(--cw-text-tertiary)",
        }}>scans this week</div>
      </div>
      <div style={{
        paddingLeft: 12, borderLeft: "var(--cw-border-tertiary)",
        textAlign: "center", minWidth: 48,
      }}>
        <div style={{
          fontFamily: "var(--cw-font-serif)",
          fontSize: 24, fontWeight: 400, color: scoreColor, lineHeight: 1,
        }}>{score}</div>
        <div style={{
          fontSize: 9, fontWeight: 500, color: "var(--cw-text-tertiary)",
          letterSpacing: "0.04em", textTransform: "uppercase", marginTop: 4,
        }}>Score</div>
      </div>
    </div>
  );
}
