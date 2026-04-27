import { useEffect, useState } from "react";
import { supabase } from "../supabase.js";

// ============================================================
// Auth Callback — handles BOTH magic-link redirect formats:
//   1. PKCE flow: ?code=xxx (newer Supabase default)
//   2. Implicit flow: #access_token=xxx&refresh_token=xxx
//
// Supabase JS v2 with `detectSessionInUrl: true` (default) auto-
// handles the implicit flow on page load. For PKCE we manually
// call exchangeCodeForSession. We then wait for getSession() to
// confirm — if it fails, we redirect to the app and let the user
// try again, instead of getting stuck on a blank screen.
// ============================================================

export default function AuthCallback() {
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function handleCallback() {
      if (!supabase) {
        setError("Authentication service is not configured.");
        return;
      }

      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const errParam = url.searchParams.get("error_description") || url.searchParams.get("error");

        // Capture flow type BEFORE detectSessionInUrl strips the hash. Implicit-
        // flow recovery emails land with #access_token=...&type=recovery, and
        // PKCE recovery emails land with ?type=recovery&code=...
        const hashParams = new URLSearchParams(window.location.hash.slice(1));
        const isRecovery =
          hashParams.get("type") === "recovery" ||
          url.searchParams.get("type") === "recovery";

        if (errParam) {
          setError(decodeURIComponent(errParam));
          return;
        }

        // PKCE flow: exchange the code for a session
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (exchangeError && !exchangeError.message?.toLowerCase().includes("already")) {
            setError(exchangeError.message);
            return;
          }
        }

        // Wait briefly for either: PKCE exchange to settle OR
        // detectSessionInUrl to handle the hash-token flow.
        let session = null;
        for (let i = 0; i < 20; i++) {
          if (cancelled) return;
          const { data } = await supabase.auth.getSession();
          if (data?.session) { session = data.session; break; }
          await new Promise((r) => setTimeout(r, 150));
        }

        if (!session) {
          setError("This sign-in link has expired or already been used. Please request a new one.");
          return;
        }

        // Migrate any pending wardrobe save
        try {
          const pending = sessionStorage.getItem("pendingWardrobeSave");
          if (pending) {
            const item = JSON.parse(pending);
            await supabase.from("wardrobe").insert({
              user_id: session.user.id,
              product_name: item.name,
              brand: item.brand || null,
              score: item.score || null,
              category: item.category || null,
              scan_data: item,
            });
            sessionStorage.removeItem("pendingWardrobeSave");
          }
        } catch (e) {
          console.warn("Pending wardrobe save failed:", e);
        }

        // Recovery: send the user to the "set new password" screen before
        // dropping them into the app, so they don't end up signed in but
        // password-less and have to come back here to do it.
        if (isRecovery) {
          window.location.replace(window.location.origin + "/#reset-password");
          return;
        }

        // Regular sign-in — redirect into the app — strip query/hash so it's clean
        const pendingRoute = sessionStorage.getItem("pendingRoute") || "#app";
        sessionStorage.removeItem("pendingRoute");
        window.location.replace(window.location.origin + "/" + pendingRoute);
      } catch (e) {
        console.error("Auth callback error:", e);
        setError("Something went wrong signing you in. Please try again.");
      }
    }

    handleCallback();
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div style={{
        minHeight: "100vh", background: "#030a03", display: "flex",
        alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif",
        padding: 24,
      }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>&#x1F6E1;</div>
          <h2 style={{ color: "#f87171", fontFamily: "Georgia,serif", fontSize: 22, marginBottom: 12 }}>
            Sign-in link expired
          </h2>
          <p style={{ color: "#9ca3af", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
            {error}
          </p>
          <button
            onClick={() => window.location.replace("/#app")}
            style={{
              background: "#166534", color: "#fff", border: "none", borderRadius: 10,
              padding: "12px 28px", fontSize: 14, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Back to CleanWear
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#030a03", display: "flex",
      alignItems: "center", justifyContent: "center",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 40, height: 40, border: "3px solid #166534", borderTopColor: "#4ade80",
          borderRadius: "50%", animation: "authSpin 0.8s linear infinite", margin: "0 auto 16px",
        }} />
        <p style={{ color: "#9ca3af", fontSize: 14, fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>
          Signing you in...
        </p>
        <style>{`@keyframes authSpin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
