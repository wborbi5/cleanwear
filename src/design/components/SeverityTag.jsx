// SeverityTag — colored pill showing chemical risk level.
// Per design-handoff.md §3.8. Never "Low" — low-risk chemicals are not flagged.
import { bandColors } from "../scoreBand.js";

export default function SeverityTag({ level = "mod", onDark = false }) {
  const band = level === "high" ? "high" : "mod";
  const colors = bandColors(band);
  const label = band === "high" ? "High" : "Moderate";
  return (
    <span style={{
      display: "inline-block",
      padding: "3px 8px",
      fontFamily: "var(--cw-font-sans)",
      fontSize: 10,
      fontWeight: 500,
      letterSpacing: "0.02em",
      borderRadius: "var(--cw-radius-sm)",
      background: colors.bg,
      color: onDark ? colors.fgDark : colors.fgLight,
      whiteSpace: "nowrap",
    }}>{label}</span>
  );
}
