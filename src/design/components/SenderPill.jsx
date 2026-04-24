// SenderPill — attribution row for shared scans, above the score hero.
// Per design-handoff.md §3.12.
export default function SenderPill({ name, initials, timestamp }) {
  const init = initials || (name ? name.slice(0, 2).toUpperCase() : "??");
  return (
    <div style={{
      background: "var(--cw-bg-secondary)",
      borderRadius: "var(--cw-radius-md)",
      padding: "10px 14px",
      display: "flex",
      alignItems: "center",
      gap: 10,
      fontFamily: "var(--cw-font-sans)",
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%",
        background: "#C9A84C",
        color: "#4A3C0E",
        fontSize: 11, fontWeight: 500,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>{init}</div>
      <div style={{ flex: 1, fontSize: 13, color: "var(--cw-text-secondary)", lineHeight: 1.4 }}>
        <strong style={{ color: "var(--cw-text-primary)", fontWeight: 500 }}>{name}</strong>{" "}
        scanned this and thought you'd want to see it.
      </div>
      {timestamp && (
        <div style={{ fontSize: 11, color: "var(--cw-text-tertiary)" }}>{timestamp}</div>
      )}
    </div>
  );
}
