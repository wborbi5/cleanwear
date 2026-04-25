import { useState, useEffect } from "react";

// ═══════════════════════════════════════════════════════════════
// CLEANWEAR LANDING — Yuka-inspired. Warm, human, direct.
// ═══════════════════════════════════════════════════════════════

const Shield = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" style={{ display: "block" }}>
    <defs><linearGradient id="shd" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22c55e" /><stop offset="100%" stopColor="#166534" /></linearGradient></defs>
    <path d="M16 2 C16 2 4 5 4 14 C4 20.5 8 26 16 30 C24 26 28 20.5 28 14 C28 5 16 2 16 2Z" fill="url(#shd)" />
    <path d="M16 10 C16 10 13.5 13 13.5 17 C13.5 19.5 15 21 16 22 C17 21 18.5 19.5 18.5 17 C18.5 13 16 10 16 10Z" fill="#f0fdf4" opacity="0.9" />
    <line x1="16" y1="13" x2="16" y2="21" stroke="#166534" strokeWidth="0.7" opacity="0.5" />
    <line x1="14.5" y1="15.5" x2="16" y2="17" stroke="#166534" strokeWidth="0.5" opacity="0.4" />
    <line x1="17.5" y1="15.5" x2="16" y2="17" stroke="#166534" strokeWidth="0.5" opacity="0.4" />
    <line x1="14.2" y1="17.5" x2="16" y2="19" stroke="#166534" strokeWidth="0.5" opacity="0.4" />
    <line x1="17.8" y1="17.5" x2="16" y2="19" stroke="#166534" strokeWidth="0.5" opacity="0.4" />
  </svg>
);

// Score circle component — like Yuka's colored circles
const ScoreCircle = ({ score, size = 64 }) => {
  const color = score >= 70 ? "#22c55e" : score >= 40 ? "#eab308" : "#ef4444";
  const label = score >= 70 ? "Good" : score >= 40 ? "Mediocre" : "Bad";
  const r = (size / 2) - 4;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f0f0ee" strokeWidth="5" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontWeight: 800, fontSize: size * 0.3, color, lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: size * 0.14, color: "#888", fontWeight: 500 }}>/100</div>
      </div>
    </div>
  );
};

// ─── ANIMATED SCAN DEMO ───────────────────────────────────────
// Loops: camera → tag detected → analyzing → score result → pause → restart
const SCAN_STAGES = [
  { id: "camera", duration: 2200 },    // Camera viewfinder
  { id: "detected", duration: 1000 },  // Tag detected flash
  { id: "analyzing", duration: 2000 }, // Analyzing spinner
  { id: "result", duration: 4000 },    // Score reveal + hold
];
const TOTAL_CYCLE = SCAN_STAGES.reduce((a, s) => a + s.duration, 0);

function ScanDemo() {
  const [stage, setStage] = useState("camera");
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    let elapsed = 0;
    const timers = SCAN_STAGES.map((s) => {
      const t = setTimeout(() => setStage(s.id), elapsed);
      elapsed += s.duration;
      return t;
    });
    const loopTimer = setTimeout(() => setCycle((c) => c + 1), TOTAL_CYCLE);
    return () => { timers.forEach(clearTimeout); clearTimeout(loopTimer); };
  }, [cycle]);

  const isCamera = stage === "camera";
  const isDetected = stage === "detected";
  const isAnalyzing = stage === "analyzing";
  const isResult = stage === "result";

  return (
    <div style={{ maxWidth: 280, margin: "0 auto", position: "relative" }}>
      {/* Phone frame */}
      <div style={{
        background: "#1a1a1a", borderRadius: 32, padding: "12px 10px",
        boxShadow: "0 12px 48px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08)",
      }}>
        {/* Notch */}
        <div style={{ width: 80, height: 6, background: "#333", borderRadius: 3, margin: "0 auto 8px" }} />

        {/* Screen */}
        <div style={{
          borderRadius: 22, overflow: "hidden", position: "relative",
          background: isResult ? "#fff" : "#111",
          height: 380, transition: "background 0.4s ease",
        }}>

          {/* ── CAMERA STAGE ── */}
          <div style={{
            position: "absolute", inset: 0,
            opacity: (isCamera || isDetected) ? 1 : 0,
            transition: "opacity 0.4s ease",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          }}>
            {/* Fake camera bg */}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(145deg, #1a1a18, #2a2820, #1e1e1a)", opacity: 0.95 }} />

            {/* Tag shape */}
            <div style={{
              position: "relative", width: 160, height: 100,
              background: "#f5f0e8", borderRadius: 6, padding: "10px 14px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              transform: isDetected ? "scale(1.02)" : "scale(1)",
              transition: "transform 0.3s ease",
            }}>
              {/* Tag content lines */}
              <div style={{ fontSize: 9, fontWeight: 700, color: "#333", marginBottom: 6, letterSpacing: 0.5 }}>THE NORTH FACE</div>
              <div style={{ fontSize: 7, color: "#666", marginBottom: 3 }}>85% Nylon, 15% Polyester</div>
              <div style={{ fontSize: 7, color: "#666", marginBottom: 3 }}>Made in Vietnam</div>
              <div style={{ fontSize: 7, color: "#999", marginBottom: 6 }}>Waterproof / DWR treated</div>
              <div style={{ display: "flex", gap: 3, marginTop: 4 }}>
                {[28, 28, 28, 16, 16].map((w, i) => (
                  <div key={i} style={{ width: w, height: 3, background: "#ccc", borderRadius: 1 }} />
                ))}
              </div>
              {/* Detection border */}
              <div style={{
                position: "absolute", inset: -4, borderRadius: 10,
                border: isDetected ? "2.5px solid #22c55e" : "2px solid rgba(74,222,128,0.3)",
                boxShadow: isDetected ? "0 0 16px rgba(34,197,94,0.4)" : "none",
                transition: "all 0.3s ease",
              }} />
            </div>

            {/* Scan line */}
            <div style={{
              position: "absolute", left: 40, right: 40,
              height: 2, background: "linear-gradient(90deg, transparent, #4ade80, transparent)",
              top: isCamera ? "30%" : "65%",
              opacity: isCamera ? 0.8 : 0,
              transition: "top 2s ease-in-out, opacity 0.3s",
            }} />

            {/* Status text */}
            <div style={{
              position: "absolute", bottom: 24, left: 0, right: 0,
              textAlign: "center", fontSize: 12, fontWeight: 600,
              color: isDetected ? "#4ade80" : "#888",
              transition: "color 0.3s",
            }}>
              {isDetected ? "✓ Tag detected" : "Point camera at clothing tag"}
            </div>
          </div>

          {/* ── ANALYZING STAGE ── */}
          <div style={{
            position: "absolute", inset: 0,
            opacity: isAnalyzing ? 1 : 0,
            transition: "opacity 0.4s ease",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: "#111",
          }}>
            {/* Spinner */}
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              border: "3px solid #333", borderTopColor: "#4ade80",
              animation: isAnalyzing ? "cw-spin 0.8s linear infinite" : "none",
              marginBottom: 16,
            }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: "#ccc", marginBottom: 6 }}>
              Analyzing...
            </div>
            <div style={{ fontSize: 11, color: "#666" }}>
              Identifying chemicals
            </div>
          </div>

          {/* ── RESULT STAGE ── */}
          <div style={{
            position: "absolute", inset: 0,
            opacity: isResult ? 1 : 0,
            transform: isResult ? "translateY(0)" : "translateY(12px)",
            transition: "all 0.5s cubic-bezier(0.16,1,0.3,1)",
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "28px 20px",
            background: "#fff",
          }}>
            {/* Score circle */}
            <ScoreCircle score={43} size={80} />
            <div style={{ fontSize: 12, fontWeight: 700, color: "#f97316", letterSpacing: 0.5, textTransform: "uppercase", marginTop: 12, marginBottom: 4 }}>
              Elevated Risk · 43/100
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a", marginBottom: 2 }}>
              Gore-Tex Shell Jacket
            </div>
            <div style={{ fontSize: 13, color: "#999", marginBottom: 16 }}>
              The North Face · Outerwear
            </div>

            {/* Chemical tags */}
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "center", marginBottom: 16 }}>
              {["PFAS", "Antimony", "Microplastics"].map((c) => (
                <span key={c} style={{
                  padding: "3px 9px", background: "#fef2f2", borderRadius: 5,
                  fontSize: 11, color: "#b91c1c", fontWeight: 600,
                }}>
                  {c}
                </span>
              ))}
            </div>

            <div style={{ fontSize: 12, color: "#888", lineHeight: 1.5, textAlign: "center" }}>
              PFAS detected via declared DWR treatment. EU OEKO-TEX limit: 25 ppb per compound.
            </div>
          </div>

          {/* CleanWear header bar */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0,
            padding: "10px 16px", display: "flex", alignItems: "center",
            justifyContent: "space-between", zIndex: 5,
            background: isResult ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.4)",
            backdropFilter: "blur(8px)",
            transition: "background 0.4s",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Shield size={14} />
              <span style={{
                fontSize: 12, fontWeight: 700,
                color: isResult ? "#1a1a1a" : "#fff",
                transition: "color 0.4s",
              }}>
                Clean<em style={{ fontStyle: "italic", color: "#16a34a", fontWeight: 500 }}>Wear</em>
              </span>
            </div>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: isResult ? "#ef4444" : "#22c55e",
              boxShadow: isResult ? "0 0 6px #ef4444" : "0 0 6px #22c55e",
              transition: "all 0.4s",
            }} />
          </div>
        </div>
      </div>

      {/* "Live demo" label under phone */}
      <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#999" }}>
        Scanning a North Face tag — live demo
      </div>
    </div>
  );
}

// ─── RESEARCH SPOTLIGHT CAROUSEL ─────────────────────────────
// CITATIONS AUDIT (2026-04-24): All prior SPOTLIGHTS items were flagged NEEDS AUDIT
// in CITATIONS.md — no DOI, no author, unverifiable shortened attributions.
// Removed per emergency-fixes plan. Rebuild with verified DOI-linked citations only.
// See: audit/cleanwear_system_audit.md and CITATIONS.md §"fun-facts content"
const SPOTLIGHTS = [];

function ResearchSpotlight({ F, S }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % SPOTLIGHTS.length), 6500);
    return () => clearInterval(t);
  }, [paused]);

  const prev = () => { setIdx((i) => (i - 1 + SPOTLIGHTS.length) % SPOTLIGHTS.length); setPaused(true); };
  const next = () => { setIdx((i) => (i + 1) % SPOTLIGHTS.length); setPaused(true); };
  const go = (i) => { setIdx(i); setPaused(true); };
  const current = SPOTLIGHTS[idx];

  return (
    <section style={{ padding: "80px 24px", background: "#fff" }}>
      <div style={{ maxWidth: 820, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
          Research spotlight
        </div>
        <h2 style={{ fontFamily: S, fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 800, color: "#0f1a0f", margin: "0 0 36px", letterSpacing: "-0.02em" }}>
          What the peer-reviewed research is saying
        </h2>

        <div
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          style={{ position: "relative" }}
        >
          {/* Arrows */}
          <button onClick={prev} aria-label="Previous" style={{
            position: "absolute", left: -8, top: "50%", transform: "translateY(-50%)",
            width: 44, height: 44, borderRadius: "50%", border: "1px solid #e4ece1",
            background: "#fff", cursor: "pointer", fontSize: 18, color: "#16a34a",
            boxShadow: "0 2px 8px rgba(15,26,15,0.06)", fontWeight: 700, zIndex: 2,
          }}>‹</button>
          <button onClick={next} aria-label="Next" style={{
            position: "absolute", right: -8, top: "50%", transform: "translateY(-50%)",
            width: 44, height: 44, borderRadius: "50%", border: "1px solid #e4ece1",
            background: "#fff", cursor: "pointer", fontSize: 18, color: "#16a34a",
            boxShadow: "0 2px 8px rgba(15,26,15,0.06)", fontWeight: 700, zIndex: 2,
          }}>›</button>

          {/* Card */}
          <div key={idx} style={{
            padding: "44px 48px", background: "linear-gradient(155deg, #f6f9f4, #fff)",
            border: "1px solid #e4ece1", borderRadius: 24, margin: "0 32px",
            minHeight: 240, display: "flex", flexDirection: "column", justifyContent: "center",
            boxShadow: "0 12px 40px rgba(15,26,15,0.04)",
            animation: "cw-fade-up .5s ease-out both",
          }}>
            <div style={{ fontSize: 42, marginBottom: 18 }}>{current.icon}</div>
            <p style={{ fontFamily: S, fontSize: "clamp(17px, 2.1vw, 22px)", fontWeight: 500, color: "#0f1a0f", lineHeight: 1.5, margin: "0 0 20px", letterSpacing: "-0.01em" }}>
              "{current.fact}"
            </p>
            <div style={{ fontSize: 12, color: "#16a34a", fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>
              {current.source}
            </div>
          </div>
        </div>

        {/* Dots */}
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 24 }}>
          {SPOTLIGHTS.map((_, i) => (
            <button key={i} onClick={() => go(i)} aria-label={`Slide ${i + 1}`} style={{
              width: i === idx ? 26 : 7, height: 7, borderRadius: 4, border: "none",
              background: i === idx ? "#16a34a" : "#d4e4d0", cursor: "pointer",
              transition: "all .3s ease", padding: 0,
            }} />
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .cw-spotlight-card { margin: 0 44px !important; padding: 32px 24px !important; }
        }
      `}</style>
    </section>
  );
}

export default function LandingPage({ onLaunchApp }) {
  const [scrolled, setScrolled] = useState(false);
  const [demoQuery, setDemoQuery] = useState("");
  const [demoLoading] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const handleDemo = () => {
    if (!demoQuery.trim()) return;
    // Route directly into the app with query pre-loaded — uses the real scoring engine
    sessionStorage.setItem("cw_demo_query", demoQuery.trim());
    window.location.hash = "#app";
  };

  const F = "'Plus Jakarta Sans',sans-serif";
  const S = "'Playfair Display',serif";

  return (
    <div style={{ fontFamily: F, background: "#fafaf7", color: "#2c2c2c", minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* NAV */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? "rgba(250,250,247,0.95)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? "1px solid #e8e8e4" : "1px solid transparent",
        transition: "all 0.3s",
      }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", cursor: "pointer" }}>
            <Shield size={28} />
            <span style={{ fontFamily: S, fontSize: 19, fontWeight: 700, color: "#1a1a1a" }}>
              Clean<em style={{ fontStyle: "italic", color: "#16a34a", fontWeight: 500 }}>Wear</em>
            </span>
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <a href="#methodology" style={{
              padding: "8px 14px", fontSize: 14, fontWeight: 600, color: "#1a1a1a",
              textDecoration: "none", borderRadius: 20, fontFamily: F,
            }} className="cw-nav-link">The Science</a>
            <button onClick={onLaunchApp} style={{
              padding: "10px 24px", background: "#16a34a", color: "#fff",
              border: "none", borderRadius: 24, fontSize: 14, fontWeight: 600,
              fontFamily: F, cursor: "pointer",
            }}>
              Scan now
            </button>
          </div>
        </div>
        <style>{`
          @media (max-width: 560px) { .cw-nav-link { display: none !important; } }
        `}</style>
      </nav>

      {/* ═══ HERO — split layout, asymmetric, editorial ═══ */}
      <section style={{
        paddingTop: 120, paddingBottom: 80,
        background: "linear-gradient(180deg, #f2f7f0 0%, #fafaf7 100%)",
        position: "relative", overflow: "hidden",
      }}>
        {/* Soft decorative blobs */}
        <div style={{ position: "absolute", top: -120, right: -160, width: 520, height: 520, borderRadius: "50%", background: "rgba(74,222,128,0.1)", pointerEvents: "none", filter: "blur(10px)" }} />
        <div style={{ position: "absolute", bottom: -100, left: -120, width: 380, height: 380, borderRadius: "50%", background: "rgba(74,222,128,0.07)", pointerEvents: "none", filter: "blur(10px)" }} />
        {/* Subtle dot grid */}
        <div aria-hidden style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(#16a34a22 1px, transparent 1px)",
          backgroundSize: "28px 28px", opacity: 0.4, pointerEvents: "none",
        }} />

        <div style={{
          maxWidth: 1180, margin: "0 auto", padding: "0 24px", position: "relative",
          display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr)",
          gap: 56, alignItems: "center",
        }} className="cw-hero-grid">
          {/* LEFT: headline + CTA */}
          <div style={{ position: "relative" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "6px 14px", borderRadius: 20,
              background: "#fff", border: "1px solid #d4e4d0",
              fontSize: 12, fontWeight: 700, color: "#166534",
              letterSpacing: 1, textTransform: "uppercase", marginBottom: 24,
              boxShadow: "0 2px 12px rgba(22,101,52,0.06)",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e" }} />
              A 100% independent project
            </div>
            <h1 style={{
              fontFamily: S, fontSize: "clamp(38px, 6vw, 72px)", fontWeight: 800,
              lineHeight: 1.02, color: "#0f1a0f", marginBottom: 20, letterSpacing: "-0.02em",
            }}>
              Know What's<br/>
              <span style={{ position: "relative", display: "inline-block" }}>
                Really In Your
                <span style={{
                  position: "absolute", left: 0, right: 0, bottom: 4, height: 12,
                  background: "linear-gradient(90deg, #22c55e55, #22c55e00)",
                  borderRadius: 4, zIndex: -1,
                }} />
              </span><br/>
              <em style={{ fontStyle: "italic", color: "#16a34a", fontWeight: 500 }}>Clothes.</em>
            </h1>
            <p style={{
              fontSize: "clamp(16px, 1.6vw, 20px)", lineHeight: 1.6,
              color: "#52525b", maxWidth: 560, marginBottom: 36,
            }}>
              CleanWear uses published research to show you which chemicals in your clothing may be absorbing into your body — so you can find safer clothing alternatives.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <button onClick={onLaunchApp} style={{
                padding: "18px 44px", background: "#16a34a", color: "#fff",
                border: "none", borderRadius: 32, fontSize: 17, fontWeight: 700,
                fontFamily: F, cursor: "pointer",
                boxShadow: "0 12px 32px rgba(22,163,74,0.3)",
                transition: "transform .15s ease, box-shadow .15s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 16px 40px rgba(22,163,74,0.4)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(22,163,74,0.3)"; }}
              >
                Scan your first item &nbsp;→
              </button>
              <div style={{ fontSize: 13, color: "#888" }}>
                Free · No sign-up required
              </div>
            </div>

            {/* Mini trust row */}
            <div style={{
              marginTop: 44, paddingTop: 28, borderTop: "1px solid #e4ece1",
              display: "flex", gap: 32, flexWrap: "wrap",
            }}>
              {[
                { n: "12", l: "chemical\ncategories tracked" },
                { n: "1,200+", l: "products\nin database" },
                { n: "100%", l: "scores cite\na source" },
              ].map((s, i) => (
                <div key={i}>
                  <div style={{ fontFamily: S, fontSize: 26, fontWeight: 800, color: "#166534", lineHeight: 1 }}>{s.n}</div>
                  <div style={{ fontSize: 12, color: "#888", marginTop: 4, whiteSpace: "pre-line", lineHeight: 1.3 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: angled phone demo */}
          <div style={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <div style={{
              position: "absolute", width: 360, height: 360, borderRadius: "50%",
              background: "radial-gradient(circle, #22c55e22, transparent 70%)",
              filter: "blur(20px)",
            }} />
            <div style={{ transform: "rotate(2deg)", transformOrigin: "center center" }}>
              <ScanDemo />
            </div>
            {/* Floating stat card */}
            <div style={{
              position: "absolute", top: "8%", left: "0%",
              background: "#fff", padding: "12px 16px", borderRadius: 14,
              boxShadow: "0 12px 36px rgba(15,26,15,0.12)", border: "1px solid #ecf2ea",
              transform: "rotate(-4deg)",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 6px #ef4444" }} />
              <div>
                <div style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>PFAS detected</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#1a1a1a" }}>68% of activewear</div>
              </div>
            </div>
            {/* Floating source card */}
            <div style={{
              position: "absolute", bottom: "10%", right: "-4%",
              background: "#fff", padding: "12px 16px", borderRadius: 14,
              boxShadow: "0 12px 36px rgba(15,26,15,0.12)", border: "1px solid #ecf2ea",
              transform: "rotate(3deg)",
            }}>
              <div style={{ fontSize: 10, color: "#888", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Source</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#166534" }}>EU REACH Annex XVII</div>
            </div>
          </div>
        </div>

        <style>{`
          @media (max-width: 860px) {
            .cw-hero-grid { grid-template-columns: 1fr !important; gap: 48px !important; text-align: center; }
            .cw-hero-grid > div:first-child { text-align: left; }
          }
        `}</style>
      </section>

      {/* ═══ BODY ABSORPTION — editorial, "what most people get wrong" ═══ */}
      <section style={{ padding: "96px 24px 0", background: "var(--cw-bg-primary, #fff)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            fontFamily: F, fontSize: 11, fontWeight: 500,
            letterSpacing: "0.1em", textTransform: "uppercase",
            color: "var(--cw-text-tertiary, #9B9A92)", marginBottom: 14,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--cw-brand-emerald, #166534)" }} />
            What most people get wrong
          </div>
          <h2 style={{
            fontFamily: S, fontSize: "clamp(28px, 4.2vw, 40px)", fontWeight: 400,
            color: "var(--cw-text-primary, #1a1a1a)", margin: "0 0 18px",
            letterSpacing: "-0.01em", lineHeight: 1.15,
          }}>
            Your skin is not a barrier.{" "}
            <em style={{ fontStyle: "italic", color: "var(--cw-brand-emerald, #166534)" }}>It's a sponge.</em>
          </h2>
          <p style={{
            fontSize: 16, lineHeight: 1.7, color: "var(--cw-text-secondary, #6A6A66)",
            margin: "0 0 28px", maxWidth: 620,
          }}>
            Clothing chemicals don't just sit on the surface. Heat, sweat, and friction — exactly what happens when you exercise, sleep, or carry a baby — open the stratum corneum and carry molecules into the bloodstream within hours.
          </p>

          {/* Dark editorial timeline */}
          <div style={{
            background: "var(--cw-bg-dark, #030A03)", borderRadius: 12,
            padding: "32px 36px", color: "var(--cw-text-inv-primary, #F5F5F0)",
            fontFamily: F,
          }}>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32,
            }} className="cw-timeline-grid">
              {[
                { t: "0:00", title: "You put on the shirt", desc: "Contact begins. Molecules on fabric surface start diffusing into the outer skin layer." },
                { t: "0:30", title: "Sweat opens the barrier", desc: "Perspiration softens the stratum corneum. Dermal absorption rate climbs — up to several times baseline." },
                { t: "8:00", title: "Chemicals in bloodstream", desc: "PFAS, phthalates, and BPA metabolites detectable in blood and urine samples in published dermal studies." },
              ].map((s, i) => (
                <div key={i} style={{
                  paddingLeft: i === 0 ? 0 : 24,
                  borderLeft: i === 0 ? "none" : "0.5px solid rgba(245,245,240,0.12)",
                }}>
                  <div style={{
                    fontFamily: S, fontSize: 24, fontWeight: 400,
                    color: "var(--cw-text-inv-primary, #F5F5F0)", letterSpacing: "-0.02em", lineHeight: 1,
                    marginBottom: 10,
                  }}>{s.t}</div>
                  <div style={{
                    fontSize: 14, fontWeight: 500, color: "var(--cw-text-inv-primary, #F5F5F0)",
                    marginBottom: 6,
                  }}>{s.title}</div>
                  <div style={{
                    fontSize: 12, lineHeight: 1.6, color: "rgba(245,245,240,0.7)",
                  }}>{s.desc}</div>
                </div>
              ))}
            </div>
            <div style={{
              marginTop: 24, paddingTop: 16,
              borderTop: "0.5px solid rgba(245,245,240,0.08)",
              fontSize: 11, color: "rgba(245,245,240,0.5)",
              fontStyle: "italic",
            }}>
              Timeline reflects published dermal absorption literature · specific citations pending audit per our methodology.
            </div>
          </div>
        </div>
        <style>{`
          @media (max-width: 720px) {
            .cw-timeline-grid { grid-template-columns: 1fr !important; gap: 20px !important; }
            .cw-timeline-grid > div { padding-left: 0 !important; border-left: none !important; padding-top: 20px; border-top: 0.5px solid rgba(245,245,240,0.12); }
            .cw-timeline-grid > div:first-child { padding-top: 0; border-top: none; }
          }
        `}</style>
      </section>

      {/* ═══ METHODOLOGY — editorial, numbered, offset ═══ */}
      <section id="methodology" style={{ padding: "100px 24px", background: "#f6f9f4", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 40, right: -100, width: 360, height: 360, borderRadius: "50%", background: "rgba(22,163,74,0.06)", filter: "blur(10px)" }} />
        <div style={{ maxWidth: 1080, margin: "0 auto", position: "relative" }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.3fr)", gap: 64, alignItems: "flex-start" }} className="cw-method-grid">
            <div style={{ position: "sticky", top: 96 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
                Our methodology
              </div>
              <h2 style={{ fontFamily: S, fontSize: "clamp(32px, 4.5vw, 52px)", fontWeight: 800, color: "#0f1a0f", lineHeight: 1.05, margin: "0 0 20px", letterSpacing: "-0.02em" }}>
                How we<br/>build a score.
              </h2>
              <p style={{ fontSize: 16, color: "#555", lineHeight: 1.7, margin: 0, maxWidth: 380 }}>
                Three weighted components. All from cited sources. No AI guessing, no made-up numbers.
              </p>
              <a href="mailto:hello@cleanwear.app" style={{
                display: "inline-block", marginTop: 24,
                fontSize: 14, fontWeight: 700, color: "#16a34a", textDecoration: "none",
                borderBottom: "2px solid #16a34a", paddingBottom: 2,
              }}>Ask about our methodology →</a>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                {
                  num: "01",
                  weight: "45%",
                  title: "Material chemical risk",
                  source: "EU REACH Annex XVII · 12 inference rules",
                  desc: "We apply 12 inference rules to declared materials and finish treatments — mapping fiber types and chemical finish claims to regulated chemical categories.",
                },
                {
                  num: "02",
                  weight: "35%",
                  title: "Brand safety record",
                  source: "NRDC · OEKO-TEX · GOTS · Good On You",
                  desc: "Scores pull from independent brand rating databases. A brand that earned an A on the NRDC PFAS scorecard outranks one with no public policy — regardless of marketing claims.",
                },
                {
                  num: "03",
                  weight: "20%",
                  title: "Category research benchmarks",
                  source: "Mamavation · EWG · Zheng et al. 2025",
                  desc: "Published testing data for specific garment types. Activewear tested at 68% positive for PFAS. Children's textiles show elevated chemical transfer risk in published studies.",
                },
              ].map((step, i) => (
                <div key={i} style={{
                  padding: "28px 30px", background: "#fff", borderRadius: 20,
                  border: "1px solid #e4ece1",
                  display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 24, alignItems: "flex-start",
                  transition: "transform .2s, box-shadow .2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateX(6px)"; e.currentTarget.style.boxShadow = "0 20px 40px rgba(15,26,15,0.06)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <div style={{
                    fontFamily: S, fontSize: 44, fontWeight: 800, color: "#16a34a",
                    lineHeight: 1, width: 60,
                  }}>{step.num}</div>
                  <div>
                    <div style={{ fontSize: 19, fontWeight: 800, color: "#0f1a0f", marginBottom: 6 }}>{step.title}</div>
                    <div style={{ fontSize: 12, color: "#16a34a", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
                      Source: {step.source}
                    </div>
                    <p style={{ fontSize: 14, color: "#666", lineHeight: 1.7, margin: 0 }}>{step.desc}</p>
                  </div>
                  <div style={{
                    fontSize: 13, fontWeight: 800, color: "#16a34a",
                    background: "#e8f5e4", padding: "6px 12px", borderRadius: 10,
                    whiteSpace: "nowrap",
                  }}>{step.weight}</div>
                </div>
              ))}

              <div style={{
                padding: "20px 24px", background: "transparent",
                borderRadius: 16, border: "1px dashed #c8d6c4",
                fontSize: 13, color: "#666", lineHeight: 1.6,
              }}>
                <strong style={{ color: "#166534" }}>Scores are risk estimates</strong>, not lab results. They reflect the best-available published research for each brand and category — and we always flag missing data instead of filling it in.
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @media (max-width: 860px) {
            .cw-method-grid { grid-template-columns: 1fr !important; gap: 36px !important; }
            .cw-method-grid > div:first-child { position: static !important; }
          }
        `}</style>
      </section>

      {/* ═══ THE PROBLEM — simple, human ═══ */}
      <section style={{ padding: "72px 24px", background: "#f6f9f4" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontFamily: S, fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 800, color: "#1a1a1a", marginBottom: 16 }}>
            Your clothes aren't just on your body
          </h2>
          <p style={{ fontSize: "clamp(15px, 2vw, 18px)", color: "#666", lineHeight: 1.7, marginBottom: 36 }}>
            Chemicals in clothing absorb through your skin — especially when you sweat. The EU restricts over 1,000 chemicals in textiles. The US restricts almost none for adults. Most people have no idea what they're wearing.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 440, margin: "0 auto" }}>
            {[
              { num: "1,000+", label: "chemicals the EU restricts", color: "#16a34a" },
              { num: "~0", label: "restricted in the US for adults", color: "#ef4444" },
              { num: "73%", label: "of DWR outerwear tested PFAS-positive", color: "#eab308" },
              { num: "68%", label: "of tested activewear found PFAS-positive", color: "#16a34a" },
            ].map((s, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: 16, padding: "20px 16px", textAlign: "center", border: "1px solid #e8e8e4" }}>
                <div style={{ fontFamily: S, fontSize: 32, fontWeight: 800, color: s.color, lineHeight: 1, marginBottom: 6 }}>{s.num}</div>
                <div style={{ fontSize: 13, color: "#888", lineHeight: 1.4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ RESEARCH SPOTLIGHT — auto-rotating carousel ═══ */}
      {/* TODO: ResearchSpotlight carousel disabled 2026-04-24 — all items removed by
      citations audit (NEEDS AUDIT / no DOI). Rebuild when verified DOI-linked
      citations are available. See CITATIONS.md and emergency_fixes_plan.md */}
{/* <ResearchSpotlight F={F} S={S} /> */}

      {/* ═══ GET RECOMMENDATIONS — Yuka-style bad→good comparison ═══ */}
      <section style={{ padding: "72px 24px", background: "#fff" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontFamily: S, fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 800, color: "#1a1a1a", marginBottom: 16 }}>
            Find Safer Clothing Alternatives
          </h2>
          <p style={{ fontSize: 16, color: "#777", lineHeight: 1.6, marginBottom: 40 }}>
            When a garment scores poorly, CleanWear recommends similar items with fewer chemicals — so you don't have to guess.
          </p>

          {/* Product comparison cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 520, margin: "0 auto" }}>
            {[
              {
                bad: { name: "Gore-Tex Shell Jacket", brand: "The North Face", score: 43, materials: "85% Nylon, 15% Polyester" },
                good: { name: "Organic Cotton Tee", brand: "Patagonia", score: 88, materials: "100% Organic Cotton" },
              },
              {
                bad: { name: "HEATTECH Ultra Warm", brand: "Uniqlo", score: 60, materials: "Polyester / Acrylic / Rayon / Spandex" },
                good: { name: "Organic Leggings", brand: "Pact", score: 87, materials: "95% Organic Cotton, 5% Spandex" },
              },
            ].map((pair, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* Bad product */}
                <div style={{ flex: 1, background: "#fef7f7", borderRadius: 18, padding: "18px 16px", border: "1px solid #fde8e8", textAlign: "center" }}>
                  <ScoreCircle score={pair.bad.score} size={52} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", marginTop: 8 }}>{pair.bad.name}</div>
                  <div style={{ fontSize: 12, color: "#999" }}>{pair.bad.brand}</div>
                  <div style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>{pair.bad.materials}</div>
                </div>

                {/* Arrow */}
                <div style={{ fontSize: 24, color: "#ccc", flexShrink: 0 }}>→</div>

                {/* Good product */}
                <div style={{ flex: 1, background: "#f2faf2", borderRadius: 18, padding: "18px 16px", border: "1px solid #dcf5dc", textAlign: "center" }}>
                  <ScoreCircle score={pair.good.score} size={52} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", marginTop: 8 }}>{pair.good.name}</div>
                  <div style={{ fontSize: 12, color: "#999" }}>{pair.good.brand}</div>
                  <div style={{ fontSize: 11, color: "#bbb", marginTop: 4 }}>{pair.good.materials}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TRY IT NOW — live scan demo ═══ */}
      <section style={{ padding: "72px 24px", background: "#f6f9f4" }}>
        <div style={{ maxWidth: 540, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontFamily: S, fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 800, color: "#1a1a1a", marginBottom: 12 }}>
            Try it right now
          </h2>
          <p style={{ fontSize: 16, color: "#777", lineHeight: 1.6, marginBottom: 32 }}>
            Type any brand and product. See what comes back.
          </p>

          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <input
              type="text"
              placeholder="e.g. Nike Dri-FIT Tee"
              value={demoQuery}
              onChange={(e) => setDemoQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleDemo(); }}
              style={{
                flex: 1, padding: "14px 18px",
                background: "#fff", border: "2px solid #d4e4d0",
                borderRadius: 14, fontSize: 16, fontFamily: F,
                color: "#1a1a1a", outline: "none",
              }}
              onFocus={(e) => { e.target.style.borderColor = "#22c55e"; }}
              onBlur={(e) => { e.target.style.borderColor = "#d4e4d0"; }}
            />
            <button
              onClick={handleDemo}
              disabled={demoLoading}
              style={{
                padding: "14px 24px", background: "#16a34a", color: "#fff",
                border: "none", borderRadius: 14, fontSize: 15, fontWeight: 700,
                fontFamily: F, cursor: demoLoading ? "wait" : "pointer",
                opacity: demoLoading ? 0.7 : 1, whiteSpace: "nowrap",
              }}
            >
              {demoLoading ? "Scanning..." : "Scan"}
            </button>
          </div>

          {/* Quick try chips */}
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 28 }}>
            {["Nike Dri-FIT Tee", "Lululemon Align Leggings", "Patagonia Organic Tee"].map((item) => (
              <button
                key={item}
                onClick={() => { sessionStorage.setItem("cw_demo_query", item); window.location.hash = "#app"; }}
                style={{
                  padding: "6px 14px", background: "#fff",
                  border: "1px solid #d4e4d0", borderRadius: 20,
                  fontSize: 13, color: "#555", fontFamily: F,
                  fontWeight: 500, cursor: "pointer",
                }}
              >
                {item}
              </button>
            ))}
          </div>

          {/* Results now show in the actual app via routing */}
        </div>
      </section>

      {/* ═══ HOW IT WORKS — dead simple ═══ */}
      <section style={{ padding: "72px 24px", background: "#fff" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontFamily: S, fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 800, color: "#1a1a1a", marginBottom: 48 }}>
            How it works
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 32 }}>
            {[
              { num: "1", icon: "📷", title: "Scan", desc: "Search a product, scan a barcode, or take a photo of the clothing tag." },
              { num: "2", icon: "📊", title: "Understand", desc: "See which chemicals are present, how they affect your body, and the research behind it." },
              { num: "3", icon: "✅", title: "Switch", desc: "Find safer clothing alternatives instantly — same type of garment, fewer harmful chemicals." },
            ].map((step, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%",
                  background: "#e8f5e4", display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 14px", fontSize: 28,
                }}>
                  {step.icon}
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#1a1a1a", marginBottom: 6 }}>{step.title}</div>
                <p style={{ fontSize: 15, color: "#777", lineHeight: 1.6, margin: 0 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ WHY WE BUILT THIS ═══ */}
      <section style={{ padding: "72px 24px", background: "#f6f9f4" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontFamily: S, fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 800, color: "#1a1a1a", marginBottom: 16 }}>
            Why we built CleanWear
          </h2>
          <p style={{ fontSize: 16, color: "#666", lineHeight: 1.75, marginBottom: 24 }}>
            We started CleanWear because we were shocked to learn what's in the clothes we wear every day. Formaldehyde in gym shirts. Formaldehyde in dress shirts at levels EU infant clothing limits prohibit. Carcinogens in children's pajamas.
          </p>
          <p style={{ fontSize: 16, color: "#666", lineHeight: 1.75, marginBottom: 24 }}>
            The EU protects its citizens with strict chemical regulations. The US has almost nothing for adult clothing. We believe that needs to change — and it starts with awareness.
          </p>
          <p style={{ fontSize: 16, color: "#444", lineHeight: 1.75, fontWeight: 600 }}>
            CleanWear exists so you can make informed choices about what touches your skin every single day.
          </p>
        </div>
      </section>

      {/* ═══ THE REGULATORY GAP ═══ */}
      <section style={{ padding: "96px 24px", background: "var(--cw-bg-primary, #fff)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            fontFamily: F, fontSize: 11, fontWeight: 500,
            letterSpacing: "0.1em", textTransform: "uppercase",
            color: "var(--cw-text-tertiary, #9B9A92)", marginBottom: 14,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--cw-brand-emerald, #166534)" }} />
            The regulatory gap
          </div>
          <h2 style={{
            fontFamily: S, fontSize: "clamp(28px, 4.2vw, 40px)", fontWeight: 400,
            color: "var(--cw-text-primary, #1a1a1a)", margin: "0 0 36px",
            letterSpacing: "-0.01em", lineHeight: 1.15, maxWidth: 720,
          }}>
            The EU has banned over 1,000 chemicals in clothing.{" "}
            <em style={{ fontStyle: "italic", color: "var(--cw-brand-emerald, #166534)" }}>The US has banned almost none.</em>
          </h2>

          {/* Bar chart */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 28 }}>
            {[
              { country: "European Union", authority: "EU REACH · Annex XVII", count: 1000, pct: 100, label: "1,000+" },
              { country: "Canada", authority: "CEPA · Prohibition of Certain Toxic Substances", count: 87, pct: 9, label: "87" },
              { country: "Japan", authority: "Act on the Control of Household Products", count: 42, pct: 4, label: "42" },
              { country: "United States", authority: "CPSIA · scattered state-level additions", count: 5, pct: 1, label: "~5" },
            ].map((row, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "200px 1fr 72px", gap: 18, alignItems: "center" }} className="cw-gap-row">
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--cw-text-primary, #1a1a1a)" }}>{row.country}</div>
                  <div style={{ fontSize: 11, color: "var(--cw-text-tertiary, #9B9A92)", marginTop: 2 }}>{row.authority}</div>
                </div>
                <div style={{ height: 28, background: "var(--cw-bg-secondary, #F5F3E8)", borderRadius: 4, position: "relative", overflow: "hidden" }}>
                  <div style={{
                    position: "absolute", inset: 0, width: `${Math.max(row.pct, 1.5)}%`,
                    background: i === 0 ? "var(--cw-brand-emerald, #166534)" : i === 3 ? "#A32D2D" : "#6A6A66",
                    borderRadius: 4, transition: "width 0.8s ease",
                  }} />
                </div>
                <div style={{
                  fontFamily: S, fontSize: 22, fontWeight: 400,
                  color: i === 0 ? "var(--cw-brand-emerald, #166534)" : i === 3 ? "#A32D2D" : "var(--cw-text-primary, #1a1a1a)",
                  textAlign: "right", letterSpacing: "-0.01em",
                }}>{row.label}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "var(--cw-text-tertiary, #9B9A92)", marginBottom: 36, fontStyle: "italic" }}>
            Restricted-substance counts compiled from each jurisdiction's textile regulation · figures reflect adult apparel scope.
          </div>

          {/* Closing dark block */}
          <div style={{
            background: "var(--cw-bg-dark, #030A03)", borderRadius: 12,
            padding: "28px 32px", color: "var(--cw-text-inv-primary, #F5F5F0)",
            fontFamily: F,
          }}>
            <div style={{
              fontFamily: S, fontSize: 22, fontWeight: 400, color: "var(--cw-text-inv-primary, #F5F5F0)",
              lineHeight: 1.35, letterSpacing: "-0.01em",
            }}>
              CleanWear scores use <em style={{ fontStyle: "italic" }}>EU standards</em>, not US ones.
            </div>
            <div style={{
              fontSize: 14, lineHeight: 1.7, color: "rgba(245,245,240,0.7)", marginTop: 10,
            }}>
              If a chemical would be banned or restricted in Germany, France, or Sweden, we count it against the garment's score — regardless of whether the US has decided to act yet.
            </div>
          </div>
        </div>
        <style>{`
          @media (max-width: 640px) {
            .cw-gap-row { grid-template-columns: 1fr auto !important; }
            .cw-gap-row > div:nth-child(2) { grid-column: 1 / -1; order: 3; }
          }
        `}</style>
      </section>

      {/* ═══ A 100% INDEPENDENT PROJECT — asymmetric card grid ═══ */}
      <section style={{ padding: "100px 24px", background: "#fff", position: "relative" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "minmax(0, 0.9fr) minmax(0, 1.1fr)",
            gap: 56, alignItems: "flex-start", marginBottom: 56,
          }} className="cw-indep-grid">
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
                Our promise
              </div>
              <h2 style={{ fontFamily: S, fontSize: "clamp(32px, 4.5vw, 52px)", fontWeight: 800, color: "#0f1a0f", lineHeight: 1.05, margin: 0, letterSpacing: "-0.02em" }}>
                A 100%<br/><em style={{ color: "#16a34a", fontWeight: 500 }}>independent</em><br/>project.
              </h2>
            </div>
            <p style={{ fontSize: 18, color: "#555", lineHeight: 1.7, margin: 0, paddingTop: 12 }}>
              CleanWear is not owned by a retailer, a brand, or a marketing agency. We don't take sponsorship money, we don't accept ads, and we don't tune scores to protect anyone's catalog. Every rating you see traces back to a citable source — and we show you which one.
            </p>
          </div>

          {/* Asymmetric card grid — one tall card on left, two stacked on right */}
          <div style={{
            display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: 20,
          }} className="cw-indep-cards">
            {/* Tall left card */}
            <div style={{
              gridRow: "span 2",
              padding: "36px 32px",
              background: "linear-gradient(155deg, #0f1a0f, #1a2e1a)",
              borderRadius: 24, color: "#fff",
              display: "flex", flexDirection: "column", justifyContent: "space-between",
              minHeight: 340, position: "relative", overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", top: -60, right: -60,
                width: 240, height: 240, borderRadius: "50%",
                background: "radial-gradient(circle, #22c55e33, transparent 70%)",
              }} />
              <div style={{ position: "relative" }}>
                <div style={{ fontSize: 12, color: "#6b8f6b", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>01 &nbsp;/&nbsp; No brand influence</div>
                <div style={{ fontFamily: S, fontSize: 30, fontWeight: 800, lineHeight: 1.2, marginBottom: 16 }}>
                  Brands can't pay us to<br/>change a score.
                </div>
                <p style={{ fontSize: 15, color: "#9fb8a0", lineHeight: 1.7, margin: 0 }}>
                  No sponsorships, no affiliate deals, no "preferred partner" programs. If a brand's products score poorly in our database, they score poorly — full stop.
                </p>
              </div>
              <div style={{ position: "relative", display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
                {["Ad-free forever", "No sponsorships", "No paid reviews"].map((t) => (
                  <span key={t} style={{
                    padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                    background: "rgba(74,222,128,0.1)", color: "#4ade80",
                    border: "1px solid rgba(74,222,128,0.2)",
                  }}>{t}</span>
                ))}
              </div>
            </div>

            {/* Top right card */}
            <div style={{
              padding: "28px", background: "#f6f9f4", borderRadius: 24,
              border: "1px solid #e4ece1", display: "flex", gap: 20, alignItems: "flex-start",
              transition: "transform .2s, box-shadow .2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 20px 40px rgba(15,26,15,0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div style={{
                width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                background: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 26, border: "1px solid #e4ece1",
              }}>🔬</div>
              <div>
                <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>02 · Peer-reviewed</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0f1a0f", marginBottom: 6 }}>Every score traces to a source</div>
                <p style={{ fontSize: 14, color: "#666", lineHeight: 1.6, margin: 0 }}>
                  EU REACH, OEKO-TEX, NRDC, EWG, Zheng et al. 2025. We cite every study and link directly to it.
                </p>
              </div>
            </div>

            {/* Bottom right card */}
            <div style={{
              padding: "28px", background: "#f6f9f4", borderRadius: 24,
              border: "1px solid #e4ece1", display: "flex", gap: 20, alignItems: "flex-start",
              transition: "transform .2s, box-shadow .2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 20px 40px rgba(15,26,15,0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div style={{
                width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                background: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 26, border: "1px solid #e4ece1",
              }}>📖</div>
              <div>
                <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>03 · Transparent</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0f1a0f", marginBottom: 6 }}>Data gaps are disclosed</div>
                <p style={{ fontSize: 14, color: "#666", lineHeight: 1.6, margin: 0 }}>
                  When we don't have data, we say so. No invented numbers, no AI-generated scores, no guesses.
                </p>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @media (max-width: 860px) {
            .cw-indep-grid { grid-template-columns: 1fr !important; gap: 24px !important; }
            .cw-indep-cards { grid-template-columns: 1fr !important; }
            .cw-indep-cards > div:first-child { grid-row: auto !important; min-height: auto !important; }
          }
        `}</style>
      </section>

      {/* ═══ CTA ═══ */}
      <section style={{
        padding: "72px 24px",
        background: "linear-gradient(180deg, #f2f7f0, #e4f0df)",
        textAlign: "center",
      }}>
        <Shield size={44} />
        <h2 style={{ fontFamily: S, fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 800, color: "#1a1a1a", margin: "16px 0 12px" }}>
          Scan your clothes. Know the truth.
        </h2>
        <p style={{ fontSize: 17, color: "#555", marginBottom: 28 }}>
          It's free and takes three seconds.
        </p>
        <button onClick={onLaunchApp} style={{
          padding: "16px 44px", background: "#16a34a", color: "#fff",
          border: "none", borderRadius: 28, fontSize: 17, fontWeight: 700,
          fontFamily: F, cursor: "pointer",
          boxShadow: "0 4px 16px rgba(22,163,74,0.25)",
        }}>
          Scan now
        </button>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ padding: "40px 24px 28px", background: "#1a2e1a", color: "#8aab8a" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 32 }}>
          <div style={{ maxWidth: 320 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Shield size={24} />
              <span style={{ fontFamily: S, fontSize: 18, fontWeight: 700, color: "#d4e8d4" }}>
                Clean<em style={{ fontStyle: "italic", color: "#4ade80", fontWeight: 500 }}>Wear</em>
              </span>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "#6b8f6b", margin: 0 }}>
              The most dangerous thing in your closet shouldn't be invisible.
            </p>
          </div>
          <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#5a7d5a", marginBottom: 12 }}>App</div>
              <div onClick={onLaunchApp} style={{ fontSize: 14, color: "#8aab8a", marginBottom: 8, cursor: "pointer" }}>Scan your clothes</div>
              <a href="#" style={{ fontSize: 14, color: "#8aab8a", textDecoration: "none", display: "block" }}>How it works</a>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#5a7d5a", marginBottom: 12 }}>Project</div>
              <a href="mailto:hello@cleanwear.app" style={{ fontSize: 14, color: "#8aab8a", textDecoration: "none", display: "block", marginBottom: 8 }}>Contact</a>
              <a href="#methodology" style={{ fontSize: 14, color: "#8aab8a", textDecoration: "none", display: "block" }}>Methodology</a>
            </div>
          </div>
        </div>
        <div style={{ maxWidth: 800, margin: "24px auto 0", borderTop: "1px solid #2a4a2a", paddingTop: 16, fontSize: 12, color: "#5a7d5a" }}>
          © 2026 CleanWear · Scores are risk estimates based on peer-reviewed research, not lab test results.
        </div>
      </footer>

      <style>{`
        html{scroll-behavior:smooth}
        @keyframes cw-spin{to{transform:rotate(360deg)}}
        @keyframes cw-fade-up{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes cw-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
        h1,h2{animation: cw-fade-up .7s ease-out both;}
      `}</style>
    </div>
  );
}
