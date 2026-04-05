import { useRef, useState, useEffect } from "react";

// ============================================================
// ShareCard — Branded 1080x1080 share image + share flow
// Renders a visual card, captures via html2canvas, shares via
// native share sheet (mobile) or modal (desktop)
// ============================================================

function getScoreColor(s) {
  if (s >= 70) return "#22c55e";
  if (s >= 50) return "#eab308";
  if (s >= 30) return "#f97316";
  return "#ef4444";
}

function getVerdict(s) {
  if (s >= 80) return "Excellent — minimal chemical exposure risk based on published data";
  if (s >= 60) return "Good — low chemical exposure risk based on category research";
  if (s >= 40) return "Caution — moderate chemical concerns per regulatory data";
  if (s >= 20) return "Warning — significant chemical risks per published studies";
  return "High risk — elevated chemical exposure based on regulatory and research data";
}

function getGrade(s) {
  if (s >= 90) return "A+";
  if (s >= 80) return "A";
  if (s >= 70) return "B";
  if (s >= 60) return "C";
  if (s >= 50) return "D";
  return "F";
}

/** The visual card rendered in DOM (captured by html2canvas) */
function CardContent({ result, score }) {
  const s = score?.overall ?? 0;
  const color = getScoreColor(s);
  const dark = s < 50;
  const bg = dark ? "#030a03" : "#fafaf7";
  const textMain = dark ? "#f4f4f5" : "#18181b";
  const textSub = dark ? "#a1a1aa" : "#52525b";

  return (
    <div style={{
      width: 1080, height: 1080, background: bg,
      display: "flex", flexDirection: "column", justifyContent: "space-between",
      padding: 80, fontFamily: "'Plus Jakarta Sans', sans-serif",
      position: "relative", overflow: "hidden",
    }}>
      {/* Decorative glow */}
      <div style={{
        position: "absolute", top: -200, right: -200,
        width: 600, height: 600, borderRadius: "50%",
        background: `radial-gradient(circle, ${color}15, transparent 70%)`,
      }} />

      {/* Top: Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, zIndex: 1 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 12,
          background: "linear-gradient(135deg, #22c55e, #166534)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 24, fontWeight: 900,
        }}>C</div>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, color: textMain, letterSpacing: "-0.5px" }}>
            Clean<em style={{ fontWeight: 400 }}>Wear</em>
          </div>
          <div style={{ fontSize: 14, color: textSub, letterSpacing: "2px", textTransform: "uppercase" }}>
            Chemical Safety Scanner
          </div>
        </div>
      </div>

      {/* Middle: Score + Product */}
      <div style={{ textAlign: "center", zIndex: 1 }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: textSub, marginBottom: 20, letterSpacing: "3px", textTransform: "uppercase" }}>
          Safety Score
        </div>
        <div style={{
          fontSize: 220, fontWeight: 900, color, lineHeight: 1,
          fontFamily: "'Playfair Display', serif",
          textShadow: `0 0 80px ${color}40`,
        }}>{s}</div>
        <div style={{
          fontSize: 40, fontWeight: 800, color,
          marginTop: 8, letterSpacing: "4px",
        }}>{getGrade(s)}</div>
        <div style={{
          fontSize: 36, fontWeight: 700, color: textMain,
          marginTop: 40, lineHeight: 1.3,
        }}>
          {result?.brand} {result?.product_name}
        </div>
        <div style={{
          fontSize: 22, color: textSub, marginTop: 12, lineHeight: 1.5,
        }}>
          {getVerdict(s)}
        </div>
      </div>

      {/* Bottom: CTA */}
      <div style={{ textAlign: "center", zIndex: 1 }}>
        <div style={{
          display: "inline-block", padding: "16px 40px",
          background: dark ? "rgba(74,222,128,0.08)" : "rgba(22,101,52,0.06)",
          border: `1px solid ${dark ? "rgba(74,222,128,0.2)" : "rgba(22,101,52,0.15)"}`,
          borderRadius: 16,
        }}>
          <span style={{ fontSize: 20, color: dark ? "#4ade80" : "#166534", fontWeight: 600 }}>
            Scan yours at cleanwear.app
          </span>
        </div>
      </div>
    </div>
  );
}

/** Desktop share modal */
function ShareModal({ isOpen, onClose, cardRef, result, score, onShareComplete }) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  const shareText = `My ${result?.brand} ${result?.product_name} scored ${score?.overall}/100 on CleanWear for chemical safety. Scan yours: https://cleanwear.app`;

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(shareText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onShareComplete?.();
    });
  };

  const handleDownloadImage = async () => {
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, { scale: 1, useCORS: true, backgroundColor: null });
      const link = document.createElement("a");
      link.download = `cleanwear-${result?.product_name?.replace(/\s+/g, "-").toLowerCase() || "score"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      onShareComplete?.();
    } catch (e) {
      console.error("Failed to capture share card:", e);
    }
    setDownloading(false);
  };

  const handleTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, "_blank");
    onShareComplete?.();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 10000,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)",
      fontFamily: "'Plus Jakarta Sans',sans-serif",
    }} onClick={onClose}>
      <div style={{
        background: "#0a0f0a", border: "1px solid rgba(74,222,128,0.15)",
        borderRadius: 24, padding: "28px", maxWidth: 420, width: "92%",
        maxHeight: "90vh", overflowY: "auto",
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: 0 }}>Share Results</h3>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "#71717a",
            fontSize: 22, cursor: "pointer", lineHeight: 1,
          }}>&times;</button>
        </div>

        {/* Card preview (scaled down) */}
        <div style={{
          borderRadius: 16, overflow: "hidden", marginBottom: 20,
          transform: "scale(0.3)", transformOrigin: "top left",
          width: 1080, height: 1080,
        }}>
          <div ref={cardRef}>
            <CardContent result={result} score={score} />
          </div>
        </div>
        {/* Spacer to account for scaled card */}
        <div style={{ height: 0, marginTop: -756 + 324 }} />

        {/* Share buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={handleDownloadImage} disabled={downloading} style={{
            width: "100%", padding: "14px", background: "linear-gradient(135deg, #16a34a, #15803d)",
            border: "none", borderRadius: 12, cursor: "pointer",
            fontFamily: "inherit", fontSize: 14, fontWeight: 700, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            opacity: downloading ? 0.6 : 1,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            {downloading ? "Generating..." : "Download Image"}
          </button>
          <button onClick={handleCopyLink} style={{
            width: "100%", padding: "14px",
            background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)",
            borderRadius: 12, cursor: "pointer",
            fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: "#4ade80",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            {copied ? "Copied!" : "Copy Share Text"}
          </button>
          <button onClick={handleTwitter} style={{
            width: "100%", padding: "14px",
            background: "rgba(29,155,240,0.08)", border: "1px solid rgba(29,155,240,0.2)",
            borderRadius: 12, cursor: "pointer",
            fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: "#1d9bf0",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            Share on X
          </button>
        </div>
      </div>
    </div>
  );
}

/** Main ShareCard component — handles native share vs modal */
export default function ShareCard({ result, score, isOpen, onClose, onShareComplete }) {
  const cardRef = useRef(null);
  const hiddenCardRef = useRef(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!isOpen) { setShowModal(false); return; }
    handleShare();
  }, [isOpen]);

  const handleShare = async () => {
    const shareText = `My ${result?.brand} ${result?.product_name} scored ${score?.overall}/100 on CleanWear for chemical safety. Scan yours: https://cleanwear.app`;

    // Try native share on mobile
    if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
      try {
        // Try to share with image
        if (hiddenCardRef.current) {
          try {
            const html2canvas = (await import("html2canvas")).default;
            const canvas = await html2canvas(hiddenCardRef.current, { scale: 1, useCORS: true, backgroundColor: null });
            const blob = await new Promise(r => canvas.toBlob(r, "image/png"));
            const file = new File([blob], "cleanwear-score.png", { type: "image/png" });
            await navigator.share({
              title: `CleanWear: ${result?.product_name} scored ${score?.overall}/100`,
              text: shareText,
              url: "https://cleanwear.app",
              files: [file],
            });
            onShareComplete?.();
            onClose?.();
            return;
          } catch {
            // Fall back to text-only share
          }
        }
        await navigator.share({
          title: `CleanWear: ${result?.product_name} scored ${score?.overall}/100`,
          text: shareText,
          url: "https://cleanwear.app",
        });
        onShareComplete?.();
        onClose?.();
        return;
      } catch {
        // User cancelled — just close
        onClose?.();
        return;
      }
    }

    // Desktop: show modal
    setShowModal(true);
  };

  return (
    <>
      {/* Hidden card for rendering */}
      <div style={{ position: "fixed", left: -9999, top: -9999, zIndex: -1 }}>
        <div ref={hiddenCardRef}>
          <CardContent result={result} score={score} />
        </div>
      </div>

      {/* Desktop modal */}
      <ShareModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); onClose?.(); }}
        cardRef={hiddenCardRef}
        result={result}
        score={score}
        onShareComplete={onShareComplete}
      />
    </>
  );
}
