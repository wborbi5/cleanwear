import { useState } from "react";

// ============================================================
// Scan Limit Modal — Shown when anonymous user exceeds free scans
// CTAs: "Create Free Account" and "Share for +1 Scan"
// ============================================================

export default function ScanLimitModal({ isOpen, onClose, onSignUp, onShareForCredit, scansUsed }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 10000,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)",
      fontFamily: "'Plus Jakarta Sans',sans-serif",
    }} onClick={onClose}>
      <div style={{
        background: "#0a0f0a", border: "1px solid rgba(74,222,128,0.15)",
        borderRadius: 24, padding: "36px 28px", maxWidth: 380, width: "90%",
        textAlign: "center", position: "relative",
      }} onClick={e => e.stopPropagation()}>

        {/* Close button */}
        <button onClick={onClose} style={{
          position: "absolute", top: 12, right: 16,
          background: "none", border: "none", color: "#71717a",
          fontSize: 22, cursor: "pointer", lineHeight: 1,
        }}>&times;</button>

        {/* Icon */}
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>

        {/* Title */}
        <h2 style={{
          fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700,
          color: "#fff", marginBottom: 8, lineHeight: 1.3,
        }}>
          You've used your {scansUsed || 3} free scans
        </h2>

        {/* Subtitle */}
        <p style={{
          fontSize: 14, color: "#a1a1aa", lineHeight: 1.6, marginBottom: 28,
        }}>
          Create a free account for unlimited scans, or share your last result to earn +1 scan.
        </p>

        {/* CTA: Sign Up */}
        <button onClick={onSignUp} style={{
          width: "100%", padding: "16px 24px", marginBottom: 12,
          background: "linear-gradient(135deg, #16a34a, #15803d)",
          border: "none", borderRadius: 14, cursor: "pointer",
          fontFamily: "inherit", fontSize: 15, fontWeight: 700, color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Create Free Account
        </button>
        <div style={{ fontSize: 11, color: "#52525b", marginBottom: 20 }}>
          Unlimited scans · Wardrobe tracking · No credit card
        </div>

        {/* Divider */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12, marginBottom: 20,
        }}>
          <div style={{ flex: 1, height: 1, background: "rgba(74,222,128,0.1)" }} />
          <span style={{ fontSize: 11, color: "#52525b", fontWeight: 600 }}>OR</span>
          <div style={{ flex: 1, height: 1, background: "rgba(74,222,128,0.1)" }} />
        </div>

        {/* CTA: Share for credit */}
        <button onClick={onShareForCredit} style={{
          width: "100%", padding: "14px 24px",
          background: "rgba(74,222,128,0.06)",
          border: "1px solid rgba(74,222,128,0.2)", borderRadius: 14, cursor: "pointer",
          fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: "#4ade80",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/></svg>
          Share for +1 Scan
        </button>
      </div>
    </div>
  );
}
