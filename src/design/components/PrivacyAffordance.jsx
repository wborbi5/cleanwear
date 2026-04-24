// PrivacyAffordance — public/private toggle.
// Per design-handoff.md §3.7. MUST appear on every Results + Share page top bar —
// this is the load-bearing trust element for the public-by-default posture.
export default function PrivacyAffordance({ isPublic = true, onToggle }) {
  const dotColor = isPublic ? "var(--cw-brand-green)" : "var(--cw-text-tertiary)";
  const color = isPublic ? "var(--cw-brand-emerald)" : "var(--cw-text-secondary)";
  const border = isPublic ? "0.5px solid rgba(22,101,52,0.3)" : "var(--cw-border-tertiary)";
  const label = isPublic ? "Public · make private" : "Private · make public";

  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "5px 11px",
        background: "transparent",
        border,
        borderRadius: "var(--cw-radius-md)",
        fontFamily: "var(--cw-font-sans)",
        fontSize: 11,
        fontWeight: 400,
        color,
        cursor: "pointer",
        lineHeight: 1.3,
      }}
    >
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        background: dotColor,
        display: "inline-block",
      }} />
      {label}
    </button>
  );
}
