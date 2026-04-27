import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";

const STATES = {
  IDLE: "idle",
  SENDING: "sending",
  CODE_INPUT: "code_input",
  VERIFYING: "verifying",
  ERROR: "error",
};

export default function AuthModal({ isOpen, onClose, onSuccess, trigger }) {
  const { signInWithEmail, verifyEmailOtp } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [state, setState] = useState(STATES.IDLE);
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef(null);
  const codeRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Restore pending email if user requested a code earlier and reopened
      // the modal — codes are valid 1 hour, no point making them re-request.
      const pendingEmail = sessionStorage.getItem("cw_auth_pending_email") || "";
      if (pendingEmail) {
        setEmail(pendingEmail);
        setCode("");
        setErrorMsg("");
        setState(STATES.CODE_INPUT);
      } else {
        setState(STATES.IDLE);
        setEmail("");
        setCode("");
        setErrorMsg("");
      }
      window.posthog?.capture("auth_prompted", { trigger });
      setTimeout(() => (pendingEmail ? codeRef : inputRef).current?.focus(), 100);
    }
  }, [isOpen, trigger]);

  useEffect(() => {
    if (state === STATES.CODE_INPUT) {
      setTimeout(() => codeRef.current?.focus(), 50);
    }
  }, [state]);

  const handleClose = () => {
    if (state !== STATES.CODE_INPUT && state !== STATES.VERIFYING) {
      window.posthog?.capture("auth_dismissed", { trigger });
    }
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || state === STATES.SENDING) return;

    setState(STATES.SENDING);
    setErrorMsg("");
    const { error } = await signInWithEmail(email.trim());
    if (error) {
      const msg = error.message || "Something went wrong";
      if (msg.toLowerCase().includes("rate") || msg.toLowerCase().includes("limit") || msg.toLowerCase().includes("too many")) {
        setErrorMsg("Too many sign-in attempts. Please wait a few minutes and try again.");
      } else {
        setErrorMsg(msg);
      }
      setState(STATES.ERROR);
    } else {
      sessionStorage.setItem("cw_auth_pending_email", email.trim());
      setState(STATES.CODE_INPUT);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (trimmed.length < 6 || state === STATES.VERIFYING) return;

    setState(STATES.VERIFYING);
    setErrorMsg("");
    const { error } = await verifyEmailOtp(email.trim(), trimmed);
    if (error) {
      const msg = error.message || "Invalid or expired code";
      setErrorMsg(msg.toLowerCase().includes("expired") || msg.toLowerCase().includes("invalid")
        ? "That code is invalid or expired. Check the latest email or request a new one."
        : msg);
      setState(STATES.ERROR);
    } else {
      sessionStorage.removeItem("cw_auth_pending_email");
      window.posthog?.capture("auth_completed", { trigger, method: "otp_code" });
      onSuccess?.();
      onClose();
    }
  };

  const handleResend = async () => {
    setCode("");
    setErrorMsg("");
    setState(STATES.SENDING);
    const { error } = await signInWithEmail(email.trim());
    if (error) {
      setErrorMsg(error.message || "Couldn't resend. Try again.");
      setState(STATES.ERROR);
    } else {
      sessionStorage.setItem("cw_auth_pending_email", email.trim());
      setState(STATES.CODE_INPUT);
    }
  };

  const handleUseDifferentEmail = () => {
    sessionStorage.removeItem("cw_auth_pending_email");
    setEmail("");
    setCode("");
    setErrorMsg("");
    setState(STATES.IDLE);
    setTimeout(() => inputRef.current?.focus(), 50);
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
        {/* Close button */}
        <button
          onClick={handleClose}
          style={{
            position: "absolute", top: 16, right: 16, background: "none",
            border: "none", color: "#6b7280", fontSize: 20, cursor: "pointer",
            width: 32, height: 32, display: "flex", alignItems: "center",
            justifyContent: "center", borderRadius: 8,
          }}
        >
          &#x2715;
        </button>

        {/* Wordmark */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <span style={{ fontFamily: "Georgia,serif", fontSize: 18, fontWeight: 700 }}>
            <span style={{ color: "#fff" }}>Clean</span>
            <span style={{ color: "#4ade80", fontStyle: "italic" }}>Wear</span>
          </span>
        </div>

        {state === STATES.CODE_INPUT || (state === STATES.ERROR && code) || state === STATES.VERIFYING ? (
          /* ── CODE INPUT STATE ── */
          <>
            <h3 style={{
              color: "#fff", fontSize: 20, fontFamily: "Georgia,serif",
              fontWeight: 700, margin: "0 0 8px", textAlign: "center",
            }}>
              Enter your code
            </h3>
            <p style={{
              color: "#9ca3af", fontSize: 13, textAlign: "center",
              margin: "0 0 24px", lineHeight: 1.5,
            }}>
              We sent a 6-digit code to{" "}
              <span style={{ color: "#4ade80", fontWeight: 600 }}>{email}</span>
            </p>

            <form onSubmit={handleVerifyCode}>
              <input
                ref={codeRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                value={code}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setCode(v);
                  if (state === STATES.ERROR) setState(STATES.CODE_INPUT);
                }}
                placeholder="123456"
                maxLength={6}
                style={{
                  width: "100%", boxSizing: "border-box", padding: "14px 16px",
                  background: "#1a2a1a", border: "1px solid #2d3d2d", borderRadius: 10,
                  color: "#fff", fontSize: 22, letterSpacing: "0.5em", textAlign: "center",
                  fontWeight: 700, outline: "none",
                  fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif",
                  marginBottom: state === STATES.ERROR ? 8 : 16,
                  transition: "border-color .2s",
                }}
                onFocus={(e) => e.target.style.borderColor = "#166534"}
                onBlur={(e) => e.target.style.borderColor = "#2d3d2d"}
              />

              {state === STATES.ERROR && (
                <p style={{ color: "#f87171", fontSize: 13, margin: "0 0 12px", paddingLeft: 4 }}>
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={code.length < 6 || state === STATES.VERIFYING}
                style={{
                  width: "100%", padding: "14px", background: "#166534",
                  border: "none", borderRadius: 10, color: "#fff", fontSize: 15,
                  fontWeight: 700,
                  cursor: state === STATES.VERIFYING ? "wait" : (code.length < 6 ? "not-allowed" : "pointer"),
                  opacity: state === STATES.VERIFYING ? 0.7 : (code.length < 6 ? 0.5 : 1),
                  fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif",
                  transition: "opacity .2s",
                }}
              >
                {state === STATES.VERIFYING ? "Verifying..." : "Verify code"}
              </button>
            </form>

            <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 16 }}>
              <button
                type="button"
                onClick={handleResend}
                disabled={state === STATES.SENDING || state === STATES.VERIFYING}
                style={{
                  background: "none", border: "none", color: "#6b7280", fontSize: 12,
                  cursor: "pointer", fontFamily: "inherit", textDecoration: "underline",
                }}
              >
                Resend code
              </button>
              <button
                type="button"
                onClick={handleUseDifferentEmail}
                disabled={state === STATES.VERIFYING}
                style={{
                  background: "none", border: "none", color: "#6b7280", fontSize: 12,
                  cursor: "pointer", fontFamily: "inherit", textDecoration: "underline",
                }}
              >
                Use different email
              </button>
            </div>
          </>
        ) : (
          /* ── FORM STATE ── */
          <>
            <h3 style={{
              color: "#fff", fontSize: 20, fontFamily: "Georgia,serif",
              fontWeight: 700, margin: "0 0 8px", textAlign: "center",
            }}>
              Save your scan history
            </h3>
            <p style={{
              color: "#9ca3af", fontSize: 13, textAlign: "center",
              margin: "0 0 24px", lineHeight: 1.5,
            }}>
              Enter your email &mdash; we'll send you a 6-digit code. No password needed.
            </p>

            <form onSubmit={handleSubmit}>
              <input
                ref={inputRef}
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (state === STATES.ERROR) setState(STATES.IDLE); }}
                placeholder="you@example.com"
                required
                style={{
                  width: "100%", boxSizing: "border-box", padding: "14px 16px",
                  background: "#1a2a1a", border: "1px solid #2d3d2d", borderRadius: 10,
                  color: "#fff", fontSize: 15, outline: "none",
                  fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif",
                  marginBottom: state === STATES.ERROR ? 8 : 16,
                  transition: "border-color .2s",
                }}
                onFocus={(e) => e.target.style.borderColor = "#166534"}
                onBlur={(e) => e.target.style.borderColor = "#2d3d2d"}
              />

              {state === STATES.ERROR && !code && (
                <p style={{ color: "#f87171", fontSize: 13, margin: "0 0 12px", paddingLeft: 4 }}>
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={state === STATES.SENDING}
                style={{
                  width: "100%", padding: "14px", background: "#166534",
                  border: "none", borderRadius: 10, color: "#fff", fontSize: 15,
                  fontWeight: 700, cursor: state === STATES.SENDING ? "wait" : "pointer",
                  opacity: state === STATES.SENDING ? 0.7 : 1,
                  fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif",
                  transition: "opacity .2s",
                }}
              >
                {state === STATES.SENDING ? "Sending..." : "Email me a code"}
              </button>
            </form>
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
 * Inline sign-in prompt for the wardrobe page (not a modal).
 * Used when an anonymous user visits /wardrobe directly.
 */
export function InlineSignIn() {
  const { signInWithEmail, verifyEmailOtp } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [state, setState] = useState(STATES.IDLE);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || state === STATES.SENDING) return;
    setState(STATES.SENDING);
    setErrorMsg("");

    const { error } = await signInWithEmail(email.trim());
    if (error) {
      setErrorMsg(error.message || "Something went wrong");
      setState(STATES.ERROR);
    } else {
      setState(STATES.CODE_INPUT);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (trimmed.length < 6 || state === STATES.VERIFYING) return;

    setState(STATES.VERIFYING);
    setErrorMsg("");
    const { error } = await verifyEmailOtp(email.trim(), trimmed);
    if (error) {
      const msg = error.message || "Invalid or expired code";
      setErrorMsg(msg.toLowerCase().includes("expired") || msg.toLowerCase().includes("invalid")
        ? "That code is invalid or expired. Check the latest email or request a new one."
        : msg);
      setState(STATES.ERROR);
    } else {
      window.posthog?.capture("auth_completed", { trigger: "wardrobe_view", method: "otp_code" });
      // AuthContext picks up the session; component re-renders with logged-in state.
    }
  };

  useEffect(() => {
    window.posthog?.capture("auth_prompted", { trigger: "wardrobe_view" });
  }, []);

  const showingCode = state === STATES.CODE_INPUT || state === STATES.VERIFYING || (state === STATES.ERROR && code);

  return (
    <div style={{
      maxWidth: 380, margin: "60px auto", textAlign: "center", padding: "40px 24px",
      background: "var(--s1,#0f1a0f)", borderRadius: 20, border: "1px solid var(--bd,#1a2a1a)",
      fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif",
    }}>
      {showingCode ? (
        <>
          <h3 style={{ color: "#fff", fontFamily: "Georgia,serif", fontSize: 20, margin: "0 0 8px" }}>
            Enter your code
          </h3>
          <p style={{ color: "#9ca3af", fontSize: 13, margin: "0 0 24px", lineHeight: 1.5 }}>
            We sent a 6-digit code to <span style={{ color: "#4ade80" }}>{email}</span>
          </p>
          <form onSubmit={handleVerifyCode}>
            <input
              type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*"
              value={code}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                setCode(v);
                if (state === STATES.ERROR) setState(STATES.CODE_INPUT);
              }}
              placeholder="123456" maxLength={6}
              style={{
                width: "100%", boxSizing: "border-box", padding: "14px 16px",
                background: "#1a2a1a", border: "1px solid #2d3d2d", borderRadius: 10,
                color: "#fff", fontSize: 22, letterSpacing: "0.5em", textAlign: "center",
                fontWeight: 700, outline: "none", marginBottom: state === STATES.ERROR ? 8 : 16,
                fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif",
              }}
            />
            {state === STATES.ERROR && (
              <p style={{ color: "#f87171", fontSize: 13, margin: "0 0 12px" }}>{errorMsg}</p>
            )}
            <button
              type="submit"
              disabled={code.length < 6 || state === STATES.VERIFYING}
              style={{
                width: "100%", padding: "14px", background: "#166534", border: "none",
                borderRadius: 10, color: "#fff", fontSize: 15, fontWeight: 700,
                cursor: state === STATES.VERIFYING ? "wait" : (code.length < 6 ? "not-allowed" : "pointer"),
                opacity: state === STATES.VERIFYING ? 0.7 : (code.length < 6 ? 0.5 : 1),
                fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif",
              }}
            >
              {state === STATES.VERIFYING ? "Verifying..." : "Verify code"}
            </button>
          </form>
        </>
      ) : (
        <>
          <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.6 }}>&#x1F6E1;</div>
          <h3 style={{ color: "#fff", fontFamily: "Georgia,serif", fontSize: 20, margin: "0 0 8px" }}>
            Sign in to see your saved items
          </h3>
          <p style={{ color: "#9ca3af", fontSize: 13, margin: "0 0 24px", lineHeight: 1.5 }}>
            Your wardrobe saves across devices
          </p>
          <form onSubmit={handleSubmit}>
            <input
              type="email" value={email}
              onChange={(e) => { setEmail(e.target.value); if (state === STATES.ERROR) setState(STATES.IDLE); }}
              placeholder="you@example.com" required
              style={{
                width: "100%", boxSizing: "border-box", padding: "14px 16px",
                background: "#1a2a1a", border: "1px solid #2d3d2d", borderRadius: 10,
                color: "#fff", fontSize: 15, outline: "none", marginBottom: state === STATES.ERROR ? 8 : 16,
                fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif",
              }}
            />
            {state === STATES.ERROR && (
              <p style={{ color: "#f87171", fontSize: 13, margin: "0 0 12px" }}>{errorMsg}</p>
            )}
            <button type="submit" disabled={state === STATES.SENDING} style={{
              width: "100%", padding: "14px", background: "#166534", border: "none",
              borderRadius: 10, color: "#fff", fontSize: 15, fontWeight: 700,
              cursor: state === STATES.SENDING ? "wait" : "pointer",
              opacity: state === STATES.SENDING ? 0.7 : 1,
              fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif",
            }}>
              {state === STATES.SENDING ? "Sending..." : "Email me a code"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
