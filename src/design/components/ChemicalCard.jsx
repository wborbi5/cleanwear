// ChemicalCard — rows of chemical findings with equivalency + citation.
// Per design-handoff.md §3.3. Does most of the persuasive work on Results + Share.
//
// Each row expects:
//   { name, severity: "high"|"mod", equivalency?: JSX, citation?: {authors, year, journal, doi} }
// Equivalency supports <em> for metaphor and <strong> for factual anchor.
import Citation from "./Citation.jsx";
import SeverityTag from "./SeverityTag.jsx";

export default function ChemicalCard({ rows = [], compact = false }) {
  const rowPadV = compact ? 9 : 14;

  return (
    <div style={{
      background: "var(--cw-bg-primary)",
      border: "var(--cw-border-tertiary)",
      borderRadius: "var(--cw-radius-lg)",
      padding: "4px 18px",
    }}>
      {rows.map((r, i) => (
        <div key={i} style={{
          padding: `${rowPadV}px 0`,
          borderTop: i === 0 ? "none" : "var(--cw-border-tertiary)",
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 12,
            marginBottom: r.equivalency ? 8 : 0,
          }}>
            <div style={{
              fontFamily: "var(--cw-font-sans)",
              fontSize: compact ? 13 : 15,
              fontWeight: 500,
              color: "var(--cw-text-primary)",
              letterSpacing: "-0.005em",
            }}>{r.name}</div>
            <SeverityTag level={r.severity} />
          </div>
          {r.equivalency && (
            <div style={{
              fontFamily: "var(--cw-font-sans)",
              fontSize: 13,
              fontWeight: 400,
              color: "var(--cw-text-primary)",
              lineHeight: 1.5,
              marginBottom: r.citation ? 8 : 0,
            }}>{r.equivalency}</div>
          )}
          {r.citation && <Citation {...r.citation} />}
        </div>
      ))}
    </div>
  );
}
