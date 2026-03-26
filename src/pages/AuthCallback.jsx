import { useEffect, useState } from "react";
import { supabase } from "../supabase.js";

export default function AuthCallback() {
  const [error, setError] = useState(null);

  useEffect(() => {
    async function handleCallback() {
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        );
        if (error) {
          setError(error.message);
          return;
        }

        // Check for pending wardrobe save
        const pending = sessionStorage.getItem("pendingWardrobeSave");
        if (pending) {
          try {
            const item = JSON.parse(pending);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase.from("wardrobe").insert({
                user_id: user.id,
                product_name: item.name,
                brand: item.brand || null,
                score: item.score || null,
                category: item.category || null,
                scan_data: item,
              });
            }
          } catch (e) {
            console.warn("Pending wardrobe save failed:", e);
          }
          sessionStorage.removeItem("pendingWardrobeSave");
        }

        // Redirect to stored route or wardrobe
        const pendingRoute = sessionStorage.getItem("pendingRoute") || "#app";
        sessionStorage.removeItem("pendingRoute");
        window.location.replace(window.location.origin + "/" + pendingRoute);
      } catch (e) {
        setError("Something went wrong. Please try again.");
      }
    }

    handleCallback();
  }, []);

  if (error) {
    return (
      <div style={{
        minHeight: "100vh", background: "#030a03", display: "flex",
        alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif",
      }}>
        <div style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>&#x1F6E1;</div>
          <h2 style={{ color: "#f87171", fontFamily: "Georgia,serif", fontSize: 22, marginBottom: 12 }}>
            Link expired
          </h2>
          <p style={{ color: "#9ca3af", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
            {error}
          </p>
          <button
            onClick={() => window.location.replace("/#app")}
            style={{
              background: "#166534", color: "#fff", border: "none", borderRadius: 8,
              padding: "12px 28px", fontSize: 14, fontWeight: 600, cursor: "pointer",
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
