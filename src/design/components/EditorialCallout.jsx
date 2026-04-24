// EditorialCallout — dark publication-weight block.
// Per design-handoff.md §3.10. Used for stat displays, timelines, pull quotes.
export default function EditorialCallout({
  displayNumber,       // optional serif numeral ("53%", "3", etc.)
  displayLabel,        // optional small label under the numeral
  children,            // body content on the right (when displayNumber) or full width
  padding = "28px 32px",
}) {
  return (
    <div style={{
      background: "var(--cw-bg-dark)",
      borderRadius: "var(--cw-radius-lg)",
      padding,
      color: "var(--cw-text-inv-primary)",
      fontFamily: "var(--cw-font-sans)",
      display: displayNumber ? "grid" : "block",
      gridTemplateColumns: displayNumber ? "auto 1fr" : undefined,
      gap: displayNumber ? 28 : undefined,
      alignItems: displayNumber ? "center" : undefined,
    }}>
      {displayNumber && (
        <div style={{
          paddingRight: 28,
          borderRight: "0.5px solid rgba(245,245,240,0.12)",
          textAlign: "center",
        }}>
          <div style={{
            fontFamily: "var(--cw-font-serif)",
            fontSize: 56,
            fontWeight: 400,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            color: "var(--cw-text-inv-primary)",
          }}>{displayNumber}</div>
          {displayLabel && (
            <div style={{
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--cw-text-inv-tertiary)",
              marginTop: 8,
            }}>{displayLabel}</div>
          )}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}
