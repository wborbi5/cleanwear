// CTAButton — primary / secondary / tertiary / inApp variants.
// Per design-handoff.md §3.6.
export default function CTAButton({
  variant = "primary",
  size = "md",
  children,
  onClick,
  href,
  style: extra = {},
  ...props
}) {
  const base = {
    fontFamily: "var(--cw-font-sans)",
    fontWeight: 500,
    borderRadius: "var(--cw-radius-md)",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    transition: "background 0.15s ease, opacity 0.15s ease",
    border: "none",
    textDecoration: "none",
  };

  const sizes = {
    sm: { padding: "6px 12px", fontSize: 11 },
    md: { padding: "10px 20px", fontSize: 13 },
    lg: { padding: "14px 24px", fontSize: 14 },
  };

  const variants = {
    primary: {
      background: "var(--cw-brand-emerald)",
      color: "#fff",
    },
    secondary: {
      background: "transparent",
      color: "var(--cw-text-primary)",
      border: "var(--cw-border-secondary)",
    },
    tertiary: {
      background: "transparent",
      color: "var(--cw-text-secondary)",
      border: "var(--cw-border-tertiary)",
      padding: size === "sm" ? "5px 10px" : "6px 12px",
      fontSize: size === "sm" ? 11 : 12,
      fontWeight: 400,
    },
    inApp: {
      background: "var(--cw-text-primary)",
      color: "var(--cw-bg-primary)",
      padding: "14px 20px",
      width: "100%",
    },
  };

  const styles = {
    ...base,
    ...sizes[size],
    ...variants[variant],
    ...extra,
  };

  const onEnter = (e) => {
    if (variant === "primary") e.currentTarget.style.background = "var(--cw-brand-emerald-hover)";
    if (variant === "secondary" || variant === "tertiary") e.currentTarget.style.background = "var(--cw-bg-secondary)";
  };
  const onLeave = (e) => {
    if (variant === "primary") e.currentTarget.style.background = "var(--cw-brand-emerald)";
    if (variant === "secondary" || variant === "tertiary") e.currentTarget.style.background = "transparent";
  };

  const Tag = href ? "a" : "button";
  return (
    <Tag
      href={href}
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={styles}
      {...props}
    >
      {children}
    </Tag>
  );
}
