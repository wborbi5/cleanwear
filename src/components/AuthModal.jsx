import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";

const STATES = { IDLE: "idle", LOADING: "loading", SENT: "sent", ERROR: "error" };

export default function AuthModal({ isOpen, onClose, onSuccess, trigger }) {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [state, setState] = useState(STATES.IDLE);
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setState(STATES.IDLE);
      setEmail("");
      setErrorMsg("");
      window.posthog?.capture("auth_prompted", { trigger });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, trigger]);

  const handleClose = () => {
    if (state !== STATES.SENT) {
      window.posthog?.capture("auth_dismissed", { trigger });
    }
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || state === STATES.LOADING) return;

    setState(STATES.LOADING);
    const { error } = await signInWithEmail(email.trim());
    if (error) {
      setErrorMsg(error.message || "Something went wrong");
      setState(STATES.ERROR);
    } else {
      setState(STATES.SENT);
      onSuccess?.();
    }
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

        {state === STATES.SENT ? (
          /* ── SENT STATE ── */
          <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%", background: "rgba(74,222,128,0.1)",
              border: "2px solid #4ade80", display: "flex", alignItems: "center",
              justifyContent: "center", margin: "0 auto 20px", fontSize: 24,
            }}>
              &#x2713;
            </div>
            <h3 style={{ color: "#fff", fontSize: 20, fontFamily: "Georgia,serif", margin: "0 0 8px" }}>
              Check your email
            </h3>
            <p style={{ color: "#9ca3af", fontSize: 14, margin: "0 0 8px", lineHeight: 1.5 }}>
              We sent a sign-in link to{" "}
              <span style={{ color: "#4ade80", fontWeight: 600 }}>{email}</span>
            </p>
            <p style={{ color: "#6b7280", fontSize: 12, margin: 0 }}>
              Link expires in 1 hour
            </p>
          </div>
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
              Enter your email &mdash; we'll send you a secure link. No password needed.
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

              {state === STATES.ERROR && (
                <p style={{ color: "#f87171", fontSize: 13, margin: "0 0 12px", paddingLeft: 4 }}>
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={state === STATES.LOADING}
                style={{
                  width: "100%", padding: "14px", background: "#166534",
                  border: "none", borderRadius: 10, color: "#fff", fontSize: 15,
                  fontWeight: 700, cursor: state === STATES.LOADING ? "wait" : "pointer",
                  opacity: state === STATES.LOADING ? 0.7 : 1,
                  fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif",
                  transition: "opacity .2s",
                }}
              >
                {state === STATES.LOADING ? "Sending..." : "Send me a sign-in link"}
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
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [state, setState] = useState(STATES.IDLE);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || state === STATES.LOADING) return;
    setState(STATES.LOADING);

    // Store that user wants wardrobe after auth
    sessionStorage.setItem("pendingRoute", "#app");

    const { error } = await signInWithEmail(email.trim());
    if (error) {
      setErrorMsg(error.message || "Something went wrong");
      setState(STATES.ERROR);
    } else {
      setState(STATES.SENT);
    }
  };

  useEffect(() => {
    window.posthog?.capture("auth_prompted", { trigger: "wardrobe_view" });
  }, []);

  return (
    <div style={{
      maxWidth: 380, margin: "60px auto", textAlign: "center", padding: "40px 24px",
      background: "var(--s1,#0f1a0f)", borderRadius: 20, border: "1px solid var(--bd,#1a2a1a)",
      fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif",
    }}>
      {state === STATES.SENT ? (
        <>
          <div style={{
            width: 56, height: 56, borderRadius: "50%", background: "rgba(74,222,128,0.1)",
            border: "2px solid #4ade80", display: "flex", alignItems: "center",
            justifyContent: "center", margin: "0 auto 20px", fontSize: 24, color: "#4ade80",
          }}>
            &#x2713;
          </div>
          <h3 style={{ color: "#fff", fontFamily: "Georgia,serif", fontSize: 18, margin: "0 0 8px" }}>
            Check your email
          </h3>
          <p style={{ color: "#9ca3af", fontSize: 13, margin: 0, lineHeight: 1.5 }}>
            We sent a sign-in link to <span style={{ color: "#4ade80" }}>{email}</span>
          </p>
          <p style={{ color: "#6b7280", fontSize: 12, marginTop: 8 }}>Link expires in 1 hour</p>
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
            <button type="submit" disabled={state === STATES.LOADING} style={{
              width: "100%", padding: "14px", background: "#166534", border: "none",
              borderRadius: 10, color: "#fff", fontSize: 15, fontWeight: 700,
              cursor: state === STATES.LOADING ? "wait" : "pointer",
              opacity: state === STATES.LOADING ? 0.7 : 1,
              fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif",
            }}>
              {state === STATES.LOADING ? "Sending..." : "Send me a sign-in link"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
