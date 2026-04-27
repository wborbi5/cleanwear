import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";

// ============================================================
// CleanWear sign-in modal — email + password.
// Modes: 'signin' | 'signup' | 'forgot' | 'forgot_sent'
// ============================================================

const MIN_PW = 8;

function mapAuthError(err) {
  if (!err) return "";
  const msg = (err.message || "").toLowerCase();
  if (msg.includes("invalid login credentials")) return "Wrong email or password.";
  if (msg.includes("email not confirmed")) return "Please confirm your email — check your inbox.";
  if (msg.includes("user already registered")) return "An account already exists. Try signing in instead.";
  if (msg.includes("rate") || msg.includes("limit") || msg.includes("too many"))
    return "Too many attempts. Please wait a few minutes and try again.";
  if (msg.includes("password should be at least"))
    return `Password must be at least ${MIN_PW} characters.`;
  if (msg.includes("weak password") || msg.includes("pwned"))
    return "That password has been found in a data breach. Please choose a different one.";
  return err.message || "Something went wrong. Try again.";
}

export default function AuthModal({ isOpen, onClose, onSuccess, trigger }) {
  const { signInWithPassword, signUpWithPassword, resetPasswordForEmail } = useAuth();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const emailRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setMode("signin");
      setEmail("");
      setPassword("");
      setLoading(false);
      setErrorMsg("");
      window.posthog?.capture("auth_prompted", { trigger });
      setTimeout(() => emailRef.current?.focus(), 100);
    }
  }, [isOpen, trigger]);

  const handleClose = () => {
    if (!loading) window.posthog?.capture("auth_dismissed", { trigger });
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setErrorMsg("");

    const em = email.trim();
    if (!em) return setErrorMsg("Enter your email.");

    if (mode === "forgot") {
      setLoading(true);
      const { error } = await resetPasswordForEmail(em);
      setLoading(false);
      if (error) return setErrorMsg(mapAuthError(error));
      setMode("forgot_sent");
      return;
    }

    if (!password) return setErrorMsg("Enter your password.");
    if (mode === "signup" && password.length < MIN_PW)
      return setErrorMsg(`Password must be at least ${MIN_PW} characters.`);

    setLoading(true);
    const { data, error } =
      mode === "signup"
        ? await signUpWithPassword(em, password)
        : await signInWithPassword(em, password);
    setLoading(false);

    if (error) return setErrorMsg(mapAuthError(error));

    // signUp returns user but no session if email confirmation is required.
    if (!data?.session && mode === "signup") {
      setErrorMsg("Account created — check your email to confirm before signing in.");
      return;
    }

    window.posthog?.capture("auth_completed", { trigger, method: mode === "signup" ? "signup_password" : "signin_password" });
    onSuccess?.();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)", zIndex: 9998,
          animation: "authFadeIn .2s ease",
        }}
      />

      {/* Modal */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999,
        background: "#0f1a0f", borderRadius: "20px 20px 0 0",
        padding: "32px 24px env(safe-area-inset-bottom, 24px)",
        maxWidth: 480, margin: "0 auto",
        animation: "authSlideUp .3s ease",
        fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif",
      }}>
        <button
          onClick={handleClose}
          style={{
            position: "absolute", top: 16, right: 16, background: "none",
            border: "none", color: "#6b7280", fontSize: 20, cursor: "pointer",
            width: 32, height: 32, display: "flex", alignItems: "center",
            justifyContent: "center", borderRadius: 8,
          }}
        >&#x2715;</button>

        {/* Wordmark */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <span style={{ fontFamily: "Georgia,serif", fontSize: 18, fontWeight: 700 }}>
            <span style={{ color: "#fff" }}>Clean</span>
            <span style={{ color: "#4ade80", fontStyle: "italic" }}>Wear</span>
          </span>
        </div>

        {mode === "forgot_sent" ? (
          <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%", background: "rgba(74,222,128,0.1)",
              border: "2px solid #4ade80", display: "flex", alignItems: "center",
              justifyContent: "center", margin: "0 auto 20px", fontSize: 24,
            }}>&#x2713;</div>
            <h3 style={{ color: "#fff", fontSize: 20, fontFamily: "Georgia,serif", margin: "0 0 8px" }}>
              Check your email
            </h3>
            <p style={{ color: "#9ca3af", fontSize: 14, margin: "0 0 8px", lineHeight: 1.5 }}>
              We sent a password-reset link to{" "}
              <span style={{ color: "#4ade80", fontWeight: 600 }}>{email}</span>
            </p>
            <p style={{ color: "#6b7280", fontSize: 12, margin: 0 }}>Link expires in 1 hour</p>
            <button
              type="button"
              onClick={() => setMode("signin")}
              style={{
                marginTop: 20, background: "none", border: "none", color: "#6b7280",
                fontSize: 12, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline",
              }}
            >Back to sign in</button>
          </div>
        ) : (
          <>
            <h3 style={{
              color: "#fff", fontSize: 20, fontFamily: "Georgia,serif",
              fontWeight: 700, margin: "0 0 8px", textAlign: "center",
            }}>
              {mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Sign in"}
            </h3>
            <p style={{
              color: "#9ca3af", fontSize: 13, textAlign: "center",
              margin: "0 0 24px", lineHeight: 1.5,
            }}>
              {mode === "signup"
                ? "Save your scan history, track your wardrobe."
                : mode === "forgot"
                ? "We'll email you a link to set a new password."
                : "Welcome back."}
            </p>

            <form onSubmit={handleSubmit}>
              <input
                ref={emailRef}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (errorMsg) setErrorMsg(""); }}
                placeholder="you@example.com"
                required
                style={{
                  width: "100%", boxSizing: "border-box", padding: "14px 16px",
                  background: "#1a2a1a", border: "1px solid #2d3d2d", borderRadius: 10,
                  color: "#fff", fontSize: 15, outline: "none",
                  fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif",
                  marginBottom: 12,
                  transition: "border-color .2s",
                }}
                onFocus={(e) => e.target.style.borderColor = "#166534"}
                onBlur={(e) => e.target.style.borderColor = "#2d3d2d"}
              />

              {mode !== "forgot" && (
                <input
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (errorMsg) setErrorMsg(""); }}
                  placeholder={mode === "signup" ? `Password (${MIN_PW}+ characters)` : "Password"}
                  required
                  minLength={mode === "signup" ? MIN_PW : undefined}
                  style={{
                    width: "100%", boxSizing: "border-box", padding: "14px 16px",
                    background: "#1a2a1a", border: "1px solid #2d3d2d", borderRadius: 10,
                    color: "#fff", fontSize: 15, outline: "none",
                    fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif",
                    marginBottom: 12,
                    transition: "border-color .2s",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#166534"}
                  onBlur={(e) => e.target.style.borderColor = "#2d3d2d"}
                />
              )}

              {errorMsg && (
                <p style={{ color: "#f87171", fontSize: 13, margin: "0 0 12px", paddingLeft: 4 }}>
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%", padding: "14px", background: "#166534",
                  border: "none", borderRadius: 10, color: "#fff", fontSize: 15,
                  fontWeight: 700, cursor: loading ? "wait" : "pointer",
                  opacity: loading ? 0.7 : 1,
                  fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif",
                  transition: "opacity .2s",
                }}
              >
                {loading
                  ? mode === "signup" ? "Creating account..." : mode === "forgot" ? "Sending..." : "Signing in..."
                  : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
              </button>
            </form>

            {/* Mode-switch links */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginTop: 16, fontSize: 12, color: "#6b7280",
            }}>
              {mode === "signin" && (
                <>
                  <button
                    type="button"
                    onClick={() => { setMode("forgot"); setErrorMsg(""); }}
                    style={{ background: "none", border: "none", color: "#6b7280", fontSize: 12, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline", padding: 0 }}
                  >Forgot password?</button>
                  <button
                    type="button"
                    onClick={() => { setMode("signup"); setErrorMsg(""); }}
                    style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: 0 }}
                  >New here? <span style={{ color: "#4ade80", textDecoration: "underline", fontWeight: 600 }}>Create account</span></button>
                </>
              )}
              {mode === "signup" && (
                <button
                  type="button"
                  onClick={() => { setMode("signin"); setErrorMsg(""); }}
                  style={{ margin: "0 auto", background: "none", border: "none", color: "#9ca3af", fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: 0 }}
                >Already have an account? <span style={{ color: "#4ade80", textDecoration: "underline", fontWeight: 600 }}>Sign in</span></button>
              )}
              {mode === "forgot" && (
                <button
                  type="button"
                  onClick={() => { setMode("signin"); setErrorMsg(""); }}
                  style={{ margin: "0 auto", background: "none", border: "none", color: "#9ca3af", fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: 0, textDecoration: "underline" }}
                >Back to sign in</button>
              )}
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes authFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes authSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </>
  );
}

/**
 * Inline sign-in shown on the wardrobe / profile page when not authenticated.
 * Uses the same email+password flow with mode toggle, just inline (not modal).
 */
export function InlineSignIn() {
  const { signInWithPassword, signUpWithPassword, resetPasswordForEmail } = useAuth();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    window.posthog?.capture("auth_prompted", { trigger: "wardrobe_view" });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setErrorMsg("");
    setInfo("");
    const em = email.trim();
    if (!em) return setErrorMsg("Enter your email.");

    if (mode === "forgot") {
      setLoading(true);
      const { error } = await resetPasswordForEmail(em);
      setLoading(false);
      if (error) return setErrorMsg(mapAuthError(error));
      setInfo(`Password-reset link sent to ${em}. Check your inbox.`);
      setMode("signin");
      return;
    }

    if (!password) return setErrorMsg("Enter your password.");
    if (mode === "signup" && password.length < MIN_PW)
      return setErrorMsg(`Password must be at least ${MIN_PW} characters.`);

    setLoading(true);
    const { data, error } =
      mode === "signup"
        ? await signUpWithPassword(em, password)
        : await signInWithPassword(em, password);
    setLoading(false);

    if (error) return setErrorMsg(mapAuthError(error));
    if (!data?.session && mode === "signup") {
      setInfo("Account created — check your email to confirm before signing in.");
      return;
    }
    window.posthog?.capture("auth_completed", { trigger: "wardrobe_view", method: mode === "signup" ? "signup_password" : "signin_password" });
    // AuthContext picks up the session; component re-renders with logged-in state.
  };

  return (
    <div style={{
      maxWidth: 380, margin: "60px auto", padding: "40px 24px",
      background: "var(--s1,#0f1a0f)", borderRadius: 20, border: "1px solid var(--bd,#1a2a1a)",
      fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif",
    }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.6 }}>&#x1F6E1;</div>
        <h3 style={{ color: "#fff", fontFamily: "Georgia,serif", fontSize: 20, margin: "0 0 8px" }}>
          {mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Sign in"}
        </h3>
        <p style={{ color: "#9ca3af", fontSize: 13, margin: 0, lineHeight: 1.5 }}>
          {mode === "signup"
            ? "Your wardrobe saves across devices."
            : mode === "forgot"
            ? "We'll email you a link to set a new password."
            : "Welcome back."}
        </p>
      </div>

      {info && (
        <p style={{ color: "#4ade80", fontSize: 12, margin: "0 0 12px", textAlign: "center" }}>
          {info}
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <input
          type="email" autoComplete="email" value={email}
          onChange={(e) => { setEmail(e.target.value); if (errorMsg) setErrorMsg(""); }}
          placeholder="you@example.com" required
          style={{
            width: "100%", boxSizing: "border-box", padding: "14px 16px",
            background: "#1a2a1a", border: "1px solid #2d3d2d", borderRadius: 10,
            color: "#fff", fontSize: 15, outline: "none", marginBottom: 12,
            fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif",
          }}
        />
        {mode !== "forgot" && (
          <input
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => { setPassword(e.target.value); if (errorMsg) setErrorMsg(""); }}
            placeholder={mode === "signup" ? `Password (${MIN_PW}+ characters)` : "Password"}
            required
            minLength={mode === "signup" ? MIN_PW : undefined}
            style={{
              width: "100%", boxSizing: "border-box", padding: "14px 16px",
              background: "#1a2a1a", border: "1px solid #2d3d2d", borderRadius: 10,
              color: "#fff", fontSize: 15, outline: "none", marginBottom: 12,
              fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif",
            }}
          />
        )}
        {errorMsg && (
          <p style={{ color: "#f87171", fontSize: 13, margin: "0 0 12px" }}>{errorMsg}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%", padding: "14px", background: "#166534", border: "none",
            borderRadius: 10, color: "#fff", fontSize: 15, fontWeight: 700,
            cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.7 : 1,
            fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif",
          }}
        >
          {loading
            ? mode === "signup" ? "Creating account..." : mode === "forgot" ? "Sending..." : "Signing in..."
            : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
        </button>
      </form>

      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginTop: 16, fontSize: 12, color: "#6b7280",
      }}>
        {mode === "signin" && (
          <>
            <button
              type="button"
              onClick={() => { setMode("forgot"); setErrorMsg(""); setInfo(""); }}
              style={{ background: "none", border: "none", color: "#6b7280", fontSize: 12, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline", padding: 0 }}
            >Forgot password?</button>
            <button
              type="button"
              onClick={() => { setMode("signup"); setErrorMsg(""); setInfo(""); }}
              style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: 0 }}
            >New here? <span style={{ color: "#4ade80", textDecoration: "underline", fontWeight: 600 }}>Create account</span></button>
          </>
        )}
        {mode === "signup" && (
          <button
            type="button"
            onClick={() => { setMode("signin"); setErrorMsg(""); setInfo(""); }}
            style={{ margin: "0 auto", background: "none", border: "none", color: "#9ca3af", fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: 0 }}
          >Already have an account? <span style={{ color: "#4ade80", textDecoration: "underline", fontWeight: 600 }}>Sign in</span></button>
        )}
        {mode === "forgot" && (
          <button
            type="button"
            onClick={() => { setMode("signin"); setErrorMsg(""); setInfo(""); }}
            style={{ margin: "0 auto", background: "none", border: "none", color: "#9ca3af", fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: 0, textDecoration: "underline" }}
          >Back to sign in</button>
        )}
      </div>
    </div>
  );
}
