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

/** The visual card rendered in DOM (captured by html2canvas). 1080x1080 IG-ready. */
function CardContent({ result, score }) {
  const s = score?.overall ?? 0;
  const color = getScoreColor(s);
  const grade = getGrade(s);
  // Always dark theme for maximum visual impact across all scores
  const bg = "#030a03";
  const textMain = "#ffffff";
  const textSub = "#9ca3af";
  const textFaint = "#6b8f6b";

  const brand = result?.brand || "";
  const product = result?.product_name || "Unknown product";

  // Pick up to 3 sources actually cited
  const sources = (score?.v2?.components || [])
    .map((c) => c.source)
    .filter(Boolean)
    .slice(0, 3);

  return (
    <div style={{
      width: 1080, height: 1080, background: bg,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      position: "relative", overflow: "hidden",
      color: textMain,
    }}>
      {/* Decorative glow */}
      <div style={{
        position: "absolute", top: -300, right: -300,
        width: 900, height: 900, borderRadius: "50%",
        background: `radial-gradient(circle, ${color}22, transparent 70%)`,
      }} />
      {/* Subtle grid */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.06,
        backgroundImage: "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)",
        backgroundSize: "80px 80px",
      }} />

      <div style={{ position: "relative", zIndex: 1, padding: 80, height: "100%", display: "flex", flexDirection: "column" }}>
        {/* Top: wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: "linear-gradient(135deg, #22c55e, #166534)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 32, fontWeight: 900,
            boxShadow: "0 8px 32px rgba(34,197,94,0.35)",
          }}>C</div>
          <div>
            <div style={{ fontSize: 34, fontWeight: 800, color: textMain, fontFamily: "'Playfair Display', Georgia, serif", letterSpacing: "-0.5px" }}>
              Clean<em style={{ fontWeight: 500, color: "#4ade80" }}>Wear</em>
            </div>
            <div style={{ fontSize: 14, color: textFaint, letterSpacing: "3px", textTransform: "uppercase", fontWeight: 700, marginTop: 2 }}>
              Chemical Safety Scanner
            </div>
          </div>
        </div>

        {/* Middle: score block, left-aligned editorial */}
        <div style={{ marginTop: 90, flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: textFaint, letterSpacing: "4px", textTransform: "uppercase", marginBottom: 20 }}>
            Safety Score
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 36 }}>
            <div style={{
              fontSize: 320, fontWeight: 900, color, lineHeight: 0.85,
              fontFamily: "'Playfair Display', Georgia, serif",
              textShadow: `0 0 120px ${color}55`,
            }}>{s}</div>
            <div style={{ paddingBottom: 40 }}>
              <div style={{ fontSize: 64, fontWeight: 800, color, lineHeight: 1, fontFamily: "'Playfair Display', Georgia, serif" }}>{grade}</div>
              <div style={{ fontSize: 20, color: textSub, marginTop: 4, letterSpacing: "2px", textTransform: "uppercase", fontWeight: 700 }}>/ 100</div>
            </div>
          </div>

          <div style={{ height: 2, background: `linear-gradient(90deg, ${color}, transparent)`, marginTop: 40, marginBottom: 40, maxWidth: 640 }} />

          {brand && (
            <div style={{ fontSize: 24, color: color, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 10 }}>
              {brand}
            </div>
          )}
          <div style={{ fontSize: 44, fontWeight: 800, color: textMain, lineHeight: 1.2, maxWidth: 900 }}>
            {product}
          </div>
          <div style={{ fontSize: 22, color: textSub, marginTop: 20, lineHeight: 1.5, maxWidth: 900 }}>
            {getVerdict(s)}
          </div>
        </div>

        {/* Bottom: sources + CTA */}
        <div>
          {sources.length > 0 && (
            <div style={{ marginBottom: 30 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: textFaint, letterSpacing: "3px", textTransform: "uppercase", marginBottom: 10 }}>
                Sources
              </div>
              <div style={{ fontSize: 16, color: textSub, lineHeight: 1.4 }}>
                {sources.join("  ·  ")}
              </div>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{
              padding: "18px 36px",
              background: "rgba(74,222,128,0.08)",
              border: "1px solid rgba(74,222,128,0.25)",
              borderRadius: 18,
            }}>
              <span style={{ fontSize: 22, color: "#4ade80", fontWeight: 700 }}>
                Scan yours at cleanwear.app
              </span>
            </div>
            <div style={{ fontSize: 14, color: textFaint, letterSpacing: "2px", textTransform: "uppercase", fontWeight: 700 }}>
              Peer-reviewed<br/>research
            </div>
          </div>
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

  const shareText = `My ${result?.brand || ""} ${result?.product_name || "item"} scored ${score?.overall}/100 on CleanWear — a chemical-safety score built from peer-reviewed research. Scan yours at https://cleanwear.app`.replace(/\s+/g," ").trim();

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

        {/* Card preview — properly contained so it doesn't collapse the modal */}
        <div style={{
          width: "100%", aspectRatio: "1 / 1", borderRadius: 16,
          overflow: "hidden", marginBottom: 20, position: "relative",
          background: "#030a03", border: "1px solid rgba(74,222,128,0.15)",
        }}>
          <div style={{
            position: "absolute", top: 0, left: 0,
            width: 1080, height: 1080,
            transform: "scale(0.33)", transformOrigin: "top left",
          }}>
            <div ref={cardRef}>
              <CardContent result={result} score={score} />
            </div>
          </div>
        </div>

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
    const shareText = `My ${result?.brand || ""} ${result?.product_name || "item"} scored ${score?.overall}/100 on CleanWear — a chemical-safety score built from peer-reviewed research. Scan yours at https://cleanwear.app`.replace(/\s+/g," ").trim();

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
