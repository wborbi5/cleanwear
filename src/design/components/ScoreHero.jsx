// ScoreHero — dark block with the 0-100 score. The single most important
// component in the system. Used on Results (in-app) and Share (public).
// Per design-handoff.md §3.2.
import { scoreBand, bandLabel, bandColors, bandSentenceColor } from "../scoreBand.js";

export default function ScoreHero({
  score,
  variant = "results",            // "results" | "share"
  garment,                        // optional pill text at top of hero ("athletic tee")
  productName,                    // appears above the score number on Share
  brand,                          // small tertiary line on Share
  sentence,                       // optional alarming sentence (Share only)
  collective,                     // optional {scans, avg, rank} strip (Share only)
  children,                       // optional extras after the verdict block
}) {
  const band = scoreBand(score);
  const colors = bandColors(band);
  const scoreColor = colors.fgDark;
  const verdict = bandLabel(band);
  const sentenceColor = bandSentenceColor(band);

  const isShare = variant === "share";
  const padding = isShare ? "24px 24px 18px" : "44px 28px 36px";
  const numeralSize = isShare ? 92 : 140;

  return (
    <div style={{
      background: "var(--cw-bg-dark)",
      borderRadius: "var(--cw-radius-lg)",
      padding,
      color: "var(--cw-text-inv-primary)",
      fontFamily: "var(--cw-font-sans)",
      overflow: "hidden",
    }}>
      {garment && (
        <div style={{
          display: "inline-block",
          padding: "4px 10px",
          borderRadius: "var(--cw-radius-pill)",
          background: "rgba(245,245,240,0.08)",
          border: "var(--cw-border-inv-tertiary)",
          color: "var(--cw-text-inv-secondary)",
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          marginBottom: 14,
        }}>{garment}</div>
      )}

      {isShare && productName && (
        <div style={{
          fontFamily: "var(--cw-font-serif)",
          fontSize: 20,
          fontWeight: 400,
          color: "var(--cw-text-inv-primary)",
          margin: "0 0 2px",
          letterSpacing: "-0.01em",
          lineHeight: 1.2,
        }}>{productName}</div>
      )}
      {isShare && brand && (
        <div style={{
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "var(--cw-text-inv-tertiary)",
          marginBottom: 14,
        }}>{brand}</div>
      )}

      <div style={{
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "rgba(245,245,240,0.45)",
        marginBottom: 6,
      }}>CleanWear safety score</div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{
          fontFamily: "var(--cw-font-serif)",
          fontSize: numeralSize,
          fontWeight: 400,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          color: scoreColor,
        }}>{score}</span>
        <span style={{
          fontFamily: "var(--cw-font-serif)",
          fontSize: numeralSize * 0.22,
          fontWeight: 400,
          color: scoreColor,
          opacity: 0.4,
        }}>/100</span>
      </div>

      <div style={{
        fontFamily: isShare ? "var(--cw-font-sans)" : "var(--cw-font-serif)",
        fontStyle: isShare ? "normal" : "italic",
        fontSize: isShare ? 15 : 18,
        fontWeight: isShare ? 500 : 400,
        color: scoreColor,
        marginTop: 10,
        letterSpacing: "-0.005em",
      }}>{verdict}</div>

      {sentence && (
        <p style={{
          fontSize: 14,
          fontWeight: 400,
          lineHeight: 1.5,
          color: sentenceColor,
          margin: "12px 0 0",
          maxWidth: 380,
        }}>{sentence}</p>
      )}

      {children}

      {collective && (
        <div style={{
          display: "flex",
          justifyContent: "space-around",
          gap: 20,
          marginTop: 18,
          paddingTop: 14,
          borderTop: "var(--cw-border-inv-tertiary)",
        }}>
          {[
            { n: collective.scans, l: "scans this week" },
            { n: collective.avg, l: "avg score" },
            { n: collective.rank, l: "most-scanned" },
          ].filter(x => x.n).map((x, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{
                fontFamily: "var(--cw-font-serif)",
                fontSize: 15,
                fontWeight: 400,
                color: "var(--cw-text-inv-primary)",
                lineHeight: 1,
              }}>{x.n}</div>
              <div style={{
                fontSize: 11,
                fontWeight: 400,
                color: "rgba(245,245,240,0.55)",
                marginTop: 4,
              }}>{x.l}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
