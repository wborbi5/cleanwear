import { useState, useEffect, useRef } from "react";
import { LS_PWA_DISMISSED } from "../config.js";

// Shows "Add to Home Screen" banner ONLY after first scan result is viewed.
// Stores the beforeinstallprompt event and dismissal in localStorage.
export default function PWAInstallBanner({ hasViewedResult }) {
  const [show, setShow] = useState(false);
  const deferredPrompt = useRef(null);

  useEffect(() => {
    if (localStorage.getItem(LS_PWA_DISMISSED)) return;

    const handler = (e) => {
      e.preventDefault();
      deferredPrompt.current = e;
      // Only show if user has already viewed a scan result
      if (hasViewedResult) setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [hasViewedResult]);

  // If hasViewedResult changes and we have a deferred prompt, show it
  useEffect(() => {
    if (hasViewedResult && deferredPrompt.current && !localStorage.getItem(LS_PWA_DISMISSED)) {
      setShow(true);
    }
  }, [hasViewedResult]);

  const handleInstall = async () => {
    if (!deferredPrompt.current) return;
    deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    window.posthog?.capture("pwa_install_prompt", { outcome });
    deferredPrompt.current = null;
    setShow(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(LS_PWA_DISMISSED, "1");
    window.posthog?.capture("pwa_install_dismissed");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999,
      padding: "12px 20px", display: "flex", alignItems: "center", gap: 12,
      background: "rgba(3,10,3,0.95)", backdropFilter: "blur(12px)",
      borderTop: "1px solid rgba(74,222,128,0.15)",
      fontFamily: "'Plus Jakarta Sans',sans-serif",
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 2 }}>
          Add CleanWear to your home screen
        </div>
        <div style={{ fontSize: 12, color: "#a1a1aa" }}>Quick access to scan any garment</div>
      </div>
      <button onClick={handleInstall} style={{
        padding: "10px 20px", borderRadius: 12, border: "none",
        background: "#16a34a", color: "#fff", fontSize: 13, fontWeight: 700,
        cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
      }}>Install</button>
      <button onClick={handleDismiss} style={{
        background: "none", border: "none", color: "#71717a",
        fontSize: 18, cursor: "pointer", padding: "4px 8px", lineHeight: 1,
      }}>&times;</button>
    </div>
  );
}
