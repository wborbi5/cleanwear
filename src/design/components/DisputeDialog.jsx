// DisputeDialog — per design-handoff.md §5.9: "Add a visible 'Dispute
// this score' link for brands on every Share/Feed entry linking to a
// process." This is the client side; server persistence lives in the
// `scan_disputes` table (migration 002) with anon-insert allowed.
import { useState } from "react";
import CTAButton from "./CTAButton.jsx";
import { submitScanDispute } from "../../supabase.js";

export default function DisputeDialog({ open, onClose, scanId, shareSlug }) {
  const [affiliation, setAffiliation] = useState("brand");
  const [email, setEmail] = useState("");
  const [claim, setClaim] = useState("");
  const [evidence, setEvidence] = useState("");
  const [status, setStatus] = useState("idle"); // idle | submitting | sent | error
  const [errorMsg, setErrorMsg] = useState(null);

  if (!open) return null;

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!claim.trim()) { setErrorMsg("Tell us what's wrong with the score."); return; }
    setStatus("submitting"); setErrorMsg(null);
    const { error } = await submitScanDispute({
      scanId, shareSlug,
      email: email.trim() || null,
      affiliation,
      claim: claim.trim(),
      evidenceUrl: evidence.trim() || null,
    });
    if (error) { setStatus("error"); setErrorMsg(typeof error === "string" ? error : error.message || "Submission failed."); return; }
    setStatus("sent");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(3, 10, 3, 0.55)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        padding: 0,
        fontFamily: "var(--cw-font-sans)",
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "var(--cw-bg-primary)",
        width: "100%", maxWidth: 520,
        borderRadius: "var(--cw-radius-lg) var(--cw-radius-lg) 0 0",
        padding: "24px 24px 28px",
        border: "var(--cw-border-tertiary)",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{
          fontSize: 11, fontWeight: 500, letterSpacing: "0.1em",
          textTransform: "uppercase", color: "var(--cw-text-tertiary)",
          marginBottom: 8,
        }}>Dispute this score</div>
        <div style={{
          fontFamily: "var(--cw-font-serif)",
          fontSize: 22, fontWeight: 400, color: "var(--cw-text-primary)",
          letterSpacing: "-0.01em", marginBottom: 10, lineHeight: 1.2,
        }}>
          Think we got it <em className="cw-ital">wrong?</em>
        </div>
        <p style={{
          fontSize: 13, lineHeight: 1.6, color: "var(--cw-text-secondary)",
          margin: "0 0 18px",
        }}>
          Every CleanWear score traces back to a public source. If one of them is
          wrong, out of date, or missing context, tell us. Submissions go to the
          review queue; we'll reply within 5 business days.
        </p>

        {status === "sent" ? (
          <div style={{
            padding: "18px 20px",
            background: "var(--cw-brand-green-tint)",
            border: "var(--cw-border-accent)",
            borderRadius: "var(--cw-radius-md)",
            fontSize: 14, color: "var(--cw-brand-emerald)", fontWeight: 500,
          }}>
            Got it. We'll be in touch.
            <div style={{ marginTop: 14 }}>
              <CTAButton variant="tertiary" size="sm" onClick={onClose}>Close</CTAButton>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Who are you?">
              <select value={affiliation} onChange={(e) => setAffiliation(e.target.value)} style={inputStyle}>
                <option value="brand">Brand representative</option>
                <option value="consumer">Consumer</option>
                <option value="lab">Independent lab</option>
                <option value="research">Researcher</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Email (optional — so we can follow up)">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                style={inputStyle}
              />
            </Field>
            <Field label="What's incorrect about this score?" required>
              <textarea
                value={claim}
                onChange={(e) => setClaim(e.target.value)}
                rows={4}
                placeholder="e.g. The PFAS detection is outdated — we reformulated in 2025."
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </Field>
            <Field label="Supporting evidence URL (optional)">
              <input
                type="url"
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                placeholder="https://..."
                style={inputStyle}
              />
            </Field>

            {errorMsg && (
              <div style={{ fontSize: 12, color: "var(--cw-score-high-light)" }}>{errorMsg}</div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <CTAButton
                variant="primary"
                onClick={submit}
                style={{ flex: 1, opacity: status === "submitting" ? 0.6 : 1 }}
              >{status === "submitting" ? "Submitting..." : "Submit dispute"}</CTAButton>
              <CTAButton variant="secondary" onClick={onClose}>Cancel</CTAButton>
            </div>

            <p style={{ fontSize: 11, color: "var(--cw-text-tertiary)", lineHeight: 1.5, marginTop: 4 }}>
              CleanWear does not take payment to adjust scores. Dispute review is free and transparent.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, children, required }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{
        fontSize: 11, fontWeight: 500, letterSpacing: "0.04em",
        textTransform: "uppercase", color: "var(--cw-text-tertiary)",
      }}>{label}{required && <span style={{ color: "var(--cw-score-high-light)" }}> *</span>}</span>
      {children}
    </label>
  );
}

const inputStyle = {
  padding: "10px 12px",
  border: "var(--cw-border-tertiary)",
  borderRadius: "var(--cw-radius-md)",
  background: "var(--cw-bg-primary)",
  fontFamily: "var(--cw-font-sans)",
  fontSize: 14, fontWeight: 400,
  color: "var(--cw-text-primary)",
  outline: "none",
};
