import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
  ? createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
  : null;

const TIERS = [
  { id: "gold", label: "Gold", desc: "Full CleanWear V3 methodology review + planned comprehensive chemical panel (PFAS, formaldehyde, phthalates, heavy metals, azo dyes)" },
  { id: "silver", label: "Silver", desc: "CleanWear V3 methodology review + planned core panel (PFAS, formaldehyde, phthalates)" },
  { id: "bronze", label: "Bronze", desc: "CleanWear V3 methodology review + planned single-chemical screen (e.g. PFAS only)" },
];

const EXISTING_CERTS = ["OEKO-TEX Standard 100", "GOTS", "bluesign", "Fair Trade", "Cradle to Cradle", "None"];

export default function CertifyPage({ onBack }) {
  const [form, setForm] = useState({
    brand_name: "", brand_website: "", contact_name: "", contact_email: "", contact_title: "",
    skus: "", sku_count: "", existing_certifications: [], target_tier: "gold",
    can_ship_samples: true, timeline: "", referral_source: "", agreed_to_terms: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const toggleCert = (cert) => {
    setForm(prev => {
      const certs = prev.existing_certifications.includes(cert)
        ? prev.existing_certifications.filter(c => c !== cert)
        : [...prev.existing_certifications, cert];
      return { ...prev, existing_certifications: certs };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.brand_name || !form.contact_email || !form.contact_name) {
      setError("Please fill in all required fields.");
      return;
    }
    if (!form.agreed_to_terms) {
      setError("Please agree to the certification terms.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      if (supabase) {
        const { error: dbErr } = await supabase.from("certification_applications").insert({
          brand_name: form.brand_name,
          brand_website: form.brand_website,
          contact_name: form.contact_name,
          contact_email: form.contact_email,
          contact_title: form.contact_title,
          skus: form.skus,
          sku_count: form.sku_count ? parseInt(form.sku_count, 10) : null,
          existing_certifications: form.existing_certifications,
          target_tier: form.target_tier,
          can_ship_samples: form.can_ship_samples,
          timeline: form.timeline,
          referral_source: form.referral_source,
          agreed_to_terms: form.agreed_to_terms,
          status: "pending",
        });
        if (dbErr) throw dbErr;
      }
      setSubmitted(true);
      window.posthog?.capture("certification_application_submitted", {
        brand: form.brand_name,
        tier: form.target_tier,
        sku_count: form.sku_count,
      });
    } catch (err) {
      setError("Submission failed. Please try again or email certify@cleanwear.app.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <button onClick={onBack} style={styles.backBtn}>← Back</button>
          <div style={styles.successCard}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
            <h2 style={styles.successTitle}>Application Received</h2>
            <p style={styles.successText}>
              We'll review your application and reach out to <strong>{form.contact_email}</strong> within 5 business days
              with next steps.
            </p>
            <div style={styles.successRef}>
              Reference: {form.brand_name.toUpperCase().replace(/\s+/g, "-")}-{Date.now().toString(36).toUpperCase()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <button onClick={onBack} style={styles.backBtn}>← Back to CleanWear</button>

        <div style={styles.hero}>
          <div style={styles.heroLogo}>Clean<em style={{ fontStyle: "normal", color: "#4ade80" }}>Wear</em></div>
          <div style={styles.heroBadge}>CERTIFICATION PROGRAM</div>
          <h1 style={styles.heroTitle}>Get CleanWear Certified</h1>
          <p style={styles.heroSub}>Join brands that lead with chemical transparency.</p>
        </div>

        <div style={styles.valueProps}>
          {[
            { icon: "🧪", title: "Transparent Methodology Review", desc: "Your materials and certifications are evaluated against the CleanWear V3 methodology. Lab testing partnerships are in development." },
            { icon: "🛡️", title: "Consumer Trust Badge", desc: "Certified products will display a CleanWear trust badge with a linked methodology review. Lab-verified badges will follow when the testing program launches." },
            { icon: "📊", title: "Scored in Our Database", desc: "Certified brands will receive Tier 1 confidence scores — the highest confidence tier in our scoring system." },
          ].map((v, i) => (
            <div key={i} style={styles.valueProp}>
              <div style={{ fontSize: 24 }}>{v.icon}</div>
              <div>
                <div style={styles.vpTitle}>{v.title}</div>
                <div style={styles.vpDesc}>{v.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <h2 style={styles.sectionTitle}>Brand Information</h2>

          <label style={styles.label}>Brand Name *
            <input style={styles.input} value={form.brand_name} onChange={e => set("brand_name", e.target.value)} placeholder="e.g. Patagonia" required />
          </label>

          <label style={styles.label}>Brand Website
            <input style={styles.input} value={form.brand_website} onChange={e => set("brand_website", e.target.value)} placeholder="https://yourbrand.com" type="url" />
          </label>

          <h2 style={styles.sectionTitle}>Contact Details</h2>

          <label style={styles.label}>Contact Name *
            <input style={styles.input} value={form.contact_name} onChange={e => set("contact_name", e.target.value)} placeholder="Jane Smith" required />
          </label>

          <label style={styles.label}>Email *
            <input style={styles.input} value={form.contact_email} onChange={e => set("contact_email", e.target.value)} placeholder="jane@yourbrand.com" type="email" required />
          </label>

          <label style={styles.label}>Title
            <input style={styles.input} value={form.contact_title} onChange={e => set("contact_title", e.target.value)} placeholder="Director of Sustainability" />
          </label>

          <h2 style={styles.sectionTitle}>Products for Certification</h2>

          <label style={styles.label}>SKUs / Product Lines
            <textarea style={{ ...styles.input, minHeight: 80, resize: "vertical" }} value={form.skus} onChange={e => set("skus", e.target.value)} placeholder="List the products or lines you'd like certified (e.g. 'Men's Performance Tee, Women's Yoga Legging')" />
          </label>

          <label style={styles.label}>Approximate SKU Count
            <input style={styles.input} value={form.sku_count} onChange={e => set("sku_count", e.target.value)} placeholder="e.g. 12" type="number" min="1" />
          </label>

          <h2 style={styles.sectionTitle}>Existing Certifications</h2>
          <div style={styles.certGrid}>
            {EXISTING_CERTS.map(cert => (
              <button type="button" key={cert} onClick={() => toggleCert(cert)}
                style={{ ...styles.certChip, ...(form.existing_certifications.includes(cert) ? styles.certChipActive : {}) }}>
                {form.existing_certifications.includes(cert) ? "✓ " : ""}{cert}
              </button>
            ))}
          </div>

          <h2 style={styles.sectionTitle}>Certification Tier</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {TIERS.map(t => (
              <label key={t.id} style={{ ...styles.tierCard, ...(form.target_tier === t.id ? styles.tierCardActive : {}) }}>
                <input type="radio" name="tier" value={t.id} checked={form.target_tier === t.id}
                  onChange={() => set("target_tier", t.id)} style={{ display: "none" }} />
                <div style={styles.tierLabel}>{t.label}</div>
                <div style={styles.tierDesc}>{t.desc}</div>
              </label>
            ))}
          </div>

          <h2 style={styles.sectionTitle}>Logistics</h2>

          <label style={styles.label}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={form.can_ship_samples} onChange={e => set("can_ship_samples", e.target.checked)} />
              We can ship product samples when a lab partnership is confirmed
            </span>
          </label>

          <label style={styles.label}>Target Timeline
            <select style={styles.input} value={form.timeline} onChange={e => set("timeline", e.target.value)}>
              <option value="">Select...</option>
              <option value="asap">As soon as the program launches</option>
              <option value="quarter">This quarter</option>
              <option value="planning">Just planning ahead</option>
            </select>
          </label>

          <label style={styles.label}>How did you hear about CleanWear?
            <input style={styles.input} value={form.referral_source} onChange={e => set("referral_source", e.target.value)} placeholder="e.g. Instagram, partner referral, press" />
          </label>

          <label style={{ ...styles.label, flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16 }}>
            <input type="checkbox" checked={form.agreed_to_terms} onChange={e => set("agreed_to_terms", e.target.checked)} />
            <span style={{ fontSize: 13 }}>I understand that this is an interest registration for the CleanWear certification program, which is currently in development. I will be contacted with details before any testing or fees are confirmed.</span>
          </label>

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" disabled={submitting} style={styles.submitBtn}>
            {submitting ? "Submitting..." : "Submit Application"}
          </button>

          <p style={styles.disclaimer}>
            Certification fees vary by tier and SKU count. We'll provide a detailed quote after reviewing your application.
            Questions? Email certify@cleanwear.app.
          </p>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#030a03", color: "#e8e8e0", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  container: { maxWidth: 600, margin: "0 auto", padding: "16px 16px 80px" },
  backBtn: { background: "none", border: "none", color: "#4ade80", fontSize: 14, cursor: "pointer", padding: "8px 0", marginBottom: 8, fontWeight: 600 },
  hero: { textAlign: "center", padding: "32px 0 24px" },
  heroLogo: { fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 8 },
  heroBadge: { fontSize: 10, letterSpacing: 3, color: "#c9a84c", fontWeight: 700, marginBottom: 16 },
  heroTitle: { fontSize: 28, fontWeight: 800, lineHeight: 1.2, marginBottom: 8 },
  heroSub: { fontSize: 15, color: "rgba(232,232,224,0.6)", lineHeight: 1.5 },
  valueProps: { display: "flex", flexDirection: "column", gap: 16, marginBottom: 32, padding: "20px 16px", background: "rgba(22,101,52,0.08)", borderRadius: 12, border: "1px solid rgba(74,222,128,0.1)" },
  valueProp: { display: "flex", gap: 12, alignItems: "flex-start" },
  vpTitle: { fontWeight: 700, fontSize: 14, marginBottom: 2 },
  vpDesc: { fontSize: 13, color: "rgba(232,232,224,0.55)", lineHeight: 1.5 },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 700, marginTop: 16, marginBottom: 4, color: "#4ade80", letterSpacing: "-0.3px" },
  label: { display: "flex", flexDirection: "column", gap: 4, fontSize: 13, fontWeight: 600, color: "rgba(232,232,224,0.7)" },
  input: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "10px 12px", fontSize: 14, color: "#e8e8e0", outline: "none", fontFamily: "inherit" },
  certGrid: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  certChip: { padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.04)", color: "rgba(232,232,224,0.7)", cursor: "pointer" },
  certChipActive: { background: "rgba(74,222,128,0.15)", borderColor: "#4ade80", color: "#4ade80" },
  tierCard: { padding: "12px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)", cursor: "pointer", transition: "all .15s" },
  tierCardActive: { borderColor: "#4ade80", background: "rgba(74,222,128,0.08)" },
  tierLabel: { fontWeight: 700, fontSize: 15, marginBottom: 2 },
  tierDesc: { fontSize: 12, color: "rgba(232,232,224,0.5)", lineHeight: 1.4 },
  error: { background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#f87171" },
  submitBtn: { marginTop: 12, padding: "14px 0", borderRadius: 10, border: "none", background: "#166534", color: "#e8e8e0", fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: "-0.3px" },
  disclaimer: { fontSize: 11, color: "rgba(232,232,224,0.4)", textAlign: "center", lineHeight: 1.5, marginTop: 8 },
  successCard: { textAlign: "center", padding: "60px 20px", background: "rgba(22,101,52,0.1)", borderRadius: 16, border: "1px solid rgba(74,222,128,0.15)", marginTop: 40 },
  successTitle: { fontSize: 22, fontWeight: 800, marginBottom: 12 },
  successText: { fontSize: 14, color: "rgba(232,232,224,0.65)", lineHeight: 1.6, marginBottom: 20 },
  successRef: { fontSize: 11, color: "rgba(232,232,224,0.35)", fontFamily: "monospace", letterSpacing: 1 },
};
