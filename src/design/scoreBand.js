// Score band helpers — maps 0–100 score to band metadata.
// Bands per design-handoff.md §3.2 (score hero) and Part 2 tokens.
export function scoreBand(score) {
  if (score >= 70) return "low";
  if (score >= 40) return "mod";
  return "high";
}

export function bandLabel(band) {
  return band === "high" ? "High risk" : band === "mod" ? "Moderate risk" : "Low risk";
}

// Returns { fgDark, fgLight, bg } for the band.
export function bandColors(band) {
  if (band === "high") return { fgDark: "#F87171", fgLight: "#A32D2D", bg: "rgba(248,113,113,0.12)" };
  if (band === "mod") return { fgDark: "#C9A84C", fgLight: "#854F0B", bg: "rgba(201,168,76,0.15)" };
  return { fgDark: "#4ADE80", fgLight: "#166534", bg: "rgba(22,101,52,0.06)" };
}

// Recipient-facing sentence color on dark score hero (per §3.2).
export function bandSentenceColor(band) {
  if (band === "high") return "#fecaca";
  if (band === "mod") return "#fde68a";
  return "#bbf7d0";
}
