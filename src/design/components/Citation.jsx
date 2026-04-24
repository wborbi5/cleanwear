// Citation — author + year + italic journal, optional DOI link.
// Per design-handoff.md §3.4. The atomic unit of defensibility.
// Hard rule: never invent. If no source, omit this component entirely.
export default function Citation({ authors, year, journal, doi, inverted = false }) {
  if (!authors || !journal) return null;
  const label = (
    <>
      {authors}{year ? ` ${year}` : ""} · <em style={{ fontStyle: "italic" }}>{journal}</em>
    </>
  );
  const base = {
    fontFamily: "var(--cw-font-sans)",
    fontSize: 11,
    fontWeight: 400,
    color: inverted ? "var(--cw-text-inv-tertiary)" : "var(--cw-text-tertiary)",
    lineHeight: 1.5,
  };
  if (doi) {
    return (
      <a href={doi} target="_blank" rel="noopener noreferrer" style={{
        ...base,
        color: inverted ? "var(--cw-text-inv-secondary)" : "var(--cw-text-secondary)",
        textDecoration: "underline",
        textDecorationColor: "rgba(26,26,26,0.08)",
        textUnderlineOffset: 2,
      }}>
        {label}
      </a>
    );
  }
  return <span style={base}>{label}</span>;
}
