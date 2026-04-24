// SectionEyebrow — small uppercase label above a section headline.
// Per design-handoff.md §3.11.
export default function SectionEyebrow({ children, dot = true, inverted = false }) {
  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      fontFamily: "var(--cw-font-sans)",
      fontSize: 11,
      fontWeight: 500,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: inverted ? "var(--cw-text-inv-tertiary)" : "var(--cw-text-tertiary)",
      marginBottom: 12,
    }}>
      {dot && <span style={{
        width: 5, height: 5, borderRadius: "50%",
        background: "var(--cw-brand-emerald)",
        display: "inline-block",
      }} />}
      <span>{children}</span>
    </div>
  );
}
