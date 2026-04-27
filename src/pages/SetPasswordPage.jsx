import { useState, useEffect } from "react";
import { supabase } from "../supabase.js";

// ============================================================
// Set new password — reached via #reset-password after the user
// clicks the link in a Forgot-password email.
// At this point Supabase has set a temporary recovery session in
// the client; supabase.auth.updateUser({password}) attaches the
// new password to that account.
// ============================================================

const MIN_PW = 8;

export default function SetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [hasSession, setHasSession] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase?.auth.getSession() || {};
      if (cancelled) return;
      setHasSession(!!data?.session);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setErrorMsg("");

    if (password.length < MIN_PW) return setErrorMsg(`Password must be at least ${MIN_PW} characters.`);
    if (password !== confirm) return setErrorMsg("Passwords don't match.");

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("weak") || msg.includes("pwned"))
        return setErrorMsg("That password has been found in a data breach. Please choose a different one.");
      if (msg.includes("auth session") || msg.includes("not authenticated"))
        return setErrorMsg("Your reset session expired. Request a new password-reset email.");
      return setErrorMsg(error.message || "Couldn't update password. Please try again.");
    }

    window.posthog?.capture("password_reset_completed");
    // Drop into the app
    window.location.replace(window.location.origin + "/#app");
  };

  if (hasSession === false) {
    return (
      <Wrapper>
        <h2 style={H2}>Reset session expired</h2>
        <p style={P}>
          This password-reset link has expired or was already used. Request a fresh one from the sign-in screen.
        </p>
        <button onClick={() => window.location.replace("/#app")} style={BtnPrimary}>Back to sign in</button>
      </Wrapper>
    );
  }

  if (hasSession === null) {
    return (
      <Wrapper>
        <Spinner />
        <p style={{ ...P, marginTop: 16 }}>Loading...</p>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <div style={{ marginBottom: 24, textAlign: "center" }}>
        <span style={{ fontFamily: "Georgia,serif", fontSize: 22, fontWeight: 700 }}>
          <span style={{ color: "#fff" }}>Clean</span>
          <span style={{ color: "#4ade80", fontStyle: "italic" }}>Wear</span>
        </span>
      </div>
      <h2 style={H2}>Set your password</h2>
      <p style={P}>
        Create a password for your account. You'll use this to sign in from now on.
      </p>

      <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); if (errorMsg) setErrorMsg(""); }}
          placeholder={`New password (${MIN_PW}+ characters)`}
          required minLength={MIN_PW}
          style={Input}
        />
        <input
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => { setConfirm(e.target.value); if (errorMsg) setErrorMsg(""); }}
          placeholder="Confirm new password"
          required minLength={MIN_PW}
          style={Input}
        />
        {errorMsg && <p style={ErrP}>{errorMsg}</p>}
        <button type="submit" disabled={loading} style={{
          ...BtnPrimary,
          width: "100%",
          opacity: loading ? 0.7 : 1,
          cursor: loading ? "wait" : "pointer",
        }}>
          {loading ? "Saving..." : "Save password & sign in"}
        </button>
      </form>
    </Wrapper>
  );
}

// ── styling helpers ──
function Wrapper({ children }) {
  return (
    <div style={{
      minHeight: "100vh", background: "#030a03", display: "flex",
      alignItems: "center", justifyContent: "center", padding: 24,
      fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif",
    }}>
      <div style={{
        width: "100%", maxWidth: 380, background: "#0f1a0f",
        border: "1px solid #1a2a1a", borderRadius: 20, padding: "40px 28px",
      }}>
        {children}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        width: 36, height: 36, border: "3px solid #166534", borderTopColor: "#4ade80",
        borderRadius: "50%", animation: "authSpin 0.8s linear infinite", margin: "0 auto",
      }} />
      <style>{`@keyframes authSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const H2 = {
  color: "#fff", fontSize: 22, fontFamily: "Georgia,serif",
  fontWeight: 700, margin: "0 0 10px", textAlign: "center",
};
const P = {
  color: "#9ca3af", fontSize: 13, lineHeight: 1.6,
  margin: 0, textAlign: "center",
};
const Input = {
  width: "100%", boxSizing: "border-box", padding: "14px 16px",
  background: "#1a2a1a", border: "1px solid #2d3d2d", borderRadius: 10,
  color: "#fff", fontSize: 15, outline: "none", marginBottom: 12,
  fontFamily: "inherit",
};
const ErrP = { color: "#f87171", fontSize: 13, margin: "0 0 12px", paddingLeft: 4 };
const BtnPrimary = {
  background: "#166534", color: "#fff", border: "none", borderRadius: 10,
  padding: "14px 24px", fontSize: 15, fontWeight: 700, cursor: "pointer",
  fontFamily: "inherit",
};
