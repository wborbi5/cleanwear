import { useState, useMemo } from "react";

function sc(s) { if (s >= 75) return "#4ade80"; if (s >= 60) return "#a3e635"; if (s >= 45) return "#facc15"; if (s >= 30) return "#fb923c"; return "#f87171"; }

const STEPS = [
  {
    id: "feel",
    title: "How does it feel?",
    sub: "Hold the fabric. Pick the closest match.",
    options: [
      { value: "slick_stretchy", label: "Slick & stretchy", desc: "Smooth, almost plastic-like, springs back", icon: "✨", signals: { polyester: 4, nylon: 3, spandex: true } },
      { value: "soft_cotton", label: "Soft & natural", desc: "Matte, breathable, comfortable", icon: "☁️", signals: { cotton: 4, cotton_poly: 2 } },
      { value: "rough_stiff", label: "Rough or textured", desc: "Slightly scratchy, structured", icon: "🪨", signals: { linen: 5, cotton: 1 } },
      { value: "fuzzy_warm", label: "Fuzzy & warm", desc: "Woolly, thick, insulating", icon: "🐑", signals: { wool: 5 } },
      { value: "silky_flowing", label: "Silky & flowing", desc: "Lightweight, drapey, smooth", icon: "🌊", signals: { rayon: 3, nylon: 2, silk: 2 } },
    ],
  },
  {
    id: "type",
    title: "What kind of garment?",
    sub: "This helps narrow down likely materials.",
    options: [
      { value: "athletic", label: "Gym / sports", desc: "Workout, running, compression", icon: "🏃", signals: { polyester: 3, nylon: 2, spandex: true } },
      { value: "casual", label: "Everyday casual", desc: "T-shirts, jeans, hoodies", icon: "👕", signals: { cotton: 2, cotton_poly: 2 } },
      { value: "underwear", label: "Underwear / bra", desc: "Base layer, intimate wear", icon: "🩲", signals: { cotton: 2, nylon: 1, spandex: true } },
      { value: "formal", label: "Dress / office", desc: "Button-down, slacks, blazer", icon: "👔", signals: { cotton: 2, cotton_poly: 2, wool: 1 } },
      { value: "sleep", label: "Sleepwear / lounge", desc: "Pajamas, robes, cozy wear", icon: "😴", signals: { cotton: 2, rayon: 1 } },
      { value: "outerwear", label: "Jacket / coat", desc: "Waterproof, insulated, layering", icon: "🧥", signals: { nylon: 3, polyester: 2 } },
    ],
  },
  {
    id: "wrinkle",
    title: "Scrunch test",
    sub: "Squeeze it in your fist for 3 seconds, release.",
    options: [
      { value: "bounces_back", label: "Springs back smooth", desc: "Barely any wrinkles", icon: "✅", signals: { polyester: 3, nylon: 3, wool: 1 } },
      { value: "some_wrinkles", label: "Wrinkles a bit", desc: "Slowly recovers", icon: "〰️", signals: { cotton_poly: 3, cotton: 1 } },
      { value: "stays_wrinkled", label: "Stays crumpled", desc: "Deep wrinkle lines remain", icon: "📜", signals: { cotton: 3, linen: 4, rayon: 2 } },
    ],
  },
];

const MATERIAL_PROFILES = {
  polyester: { name: "Polyester", safety: 32, chems: ["Antimony trioxide", "Microplastics", "BPA/BPS"], risk: "high" },
  nylon: { name: "Nylon", safety: 38, chems: ["Microplastics"], risk: "moderate-high" },
  cotton: { name: "Cotton", safety: 72, chems: ["Formaldehyde (wrinkle treatment)"], risk: "low" },
  cotton_poly: { name: "Cotton-Poly Blend", safety: 52, chems: ["Antimony", "Microplastics", "Formaldehyde"], risk: "moderate" },
  linen: { name: "Linen", safety: 90, chems: ["Minimal — very low risk"], risk: "minimal" },
  wool: { name: "Wool", safety: 85, chems: ["Minimal — very low risk"], risk: "minimal" },
  rayon: { name: "Rayon/Viscose", safety: 45, chems: ["Carbon disulfide", "Sodium hydroxide"], risk: "moderate" },
  silk: { name: "Silk", safety: 82, chems: ["Minimal — dye chemicals only"], risk: "low" },
};

function predict(answers) {
  const scores = { polyester: 0, nylon: 0, cotton: 0, cotton_poly: 0, linen: 0, wool: 0, rayon: 0, silk: 0 };
  let hasSpandex = false;

  Object.values(answers).forEach(answer => {
    const step = STEPS.find(s => s.options.some(o => o.value === answer));
    if (!step) return;
    const opt = step.options.find(o => o.value === answer);
    if (!opt?.signals) return;
    Object.entries(opt.signals).forEach(([mat, val]) => {
      if (mat === "spandex") { hasSpandex = true; return; }
      scores[mat] = (scores[mat] || 0) + val;
    });
  });

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((sum, [, v]) => sum + v, 0);
  if (total === 0) return null;

  const primary = sorted[0][0];
  const confidence = Math.min(Math.max(Math.round((sorted[0][1] / total) * 100), 30), 95);
  const profile = MATERIAL_PROFILES[primary];

  // Build material composition
  let mats = [];
  if (primary === "cotton_poly") {
    mats = [{ n: "Cotton", p: 60 }, { n: "Polyester", p: hasSpandex ? 35 : 40 }];
    if (hasSpandex) mats.push({ n: "Elastane", p: 5 });
  } else if (hasSpandex && ["polyester", "nylon"].includes(primary)) {
    mats = [{ n: profile.name, p: 85 }, { n: "Elastane", p: 15 }];
  } else if (hasSpandex) {
    mats = [{ n: profile.name, p: 95 }, { n: "Elastane", p: 5 }];
  } else if (sorted.length > 1 && sorted[0][1] - sorted[1][1] <= 2 && sorted[1][1] > 0) {
    const sec = MATERIAL_PROFILES[sorted[1][0]];
    mats = [{ n: profile.name, p: 65 }, { n: sec?.name || sorted[1][0], p: 35 }];
  } else {
    mats = [{ n: profile.name, p: 100 }];
  }

  let safety = profile.safety;
  if (hasSpandex) safety = Math.max(safety - 8, 20);

  return {
    primary: profile.name,
    safety,
    confidence,
    risk: profile.risk,
    chems: profile.chems,
    mats,
    hasSpandex,
    top3: sorted.slice(0, 3).map(([k, v]) => ({
      name: MATERIAL_PROFILES[k]?.name || k,
      pct: total > 0 ? Math.round((v / total) * 100) : 0,
    })),
  };
}

export default function QuickDetective({ onFullScan, onClose }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});

  const currentPrediction = useMemo(() => predict(answers), [answers]);
  const isComplete = step >= STEPS.length;

  const handleAnswer = (stepId, value) => {
    const next = { ...answers, [stepId]: value };
    setAnswers(next);
    // Auto-advance after short delay
    setTimeout(() => {
      if (step < STEPS.length - 1) setStep(step + 1);
      else setStep(STEPS.length); // trigger completion
    }, 250);
  };

  const result = isComplete ? predict(answers) : null;

  // ---- RESULT SCREEN ----
  if (result) {
    return (
      <div style={{ padding: "0 24px" }}>
        <div style={{
          background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 20,
          padding: 24, textAlign: "center", marginBottom: 14
        }}>
          <div style={{
            width: 100, height: 100, borderRadius: "50%", margin: "0 auto 14px",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,.25)", border: `3px solid ${sc(result.safety)}`
          }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 36, fontWeight: 800, color: sc(result.safety), lineHeight: 1 }}>{result.safety}</div>
            <div style={{ fontSize: 10, opacity: .4, marginTop: 2 }}>/100</div>
          </div>

          <div style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
            {result.primary}{result.hasSpandex && !result.primary.includes("Blend") ? " + Spandex" : ""}
          </div>
          <div style={{ fontSize: 13, color: "var(--tx3)", marginBottom: 12 }}>
            {result.confidence}% confidence
          </div>

          {/* Composition bars */}
          <div style={{ textAlign: "left", marginTop: 16 }}>
            {result.mats.map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ fontFamily: "var(--serif)", fontWeight: 800, fontSize: 16, minWidth: 42, textAlign: "right", color: sc(result.safety) }}>{m.p}%</div>
                <div style={{ fontSize: 13, fontWeight: 600, minWidth: 70 }}>{m.n}</div>
                <div style={{ flex: 1, height: 7, borderRadius: 4, background: "var(--bd)", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 4, width: `${m.p}%`, background: sc(result.safety), transition: "width .8s ease-out" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chemical risks */}
        <div style={{
          background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 20,
          padding: 20, marginBottom: 14
        }}>
          <div style={{ fontSize: 10, color: "var(--tx4)", fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>
            Likely Chemical Exposure
          </div>
          {result.chems.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: i < result.chems.length - 1 ? "1px solid var(--bd)" : "none", fontSize: 13, color: "var(--tx2)" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: c.includes("Minimal") ? "var(--g4)" : "var(--r4)" }} />
              {c}
            </div>
          ))}
        </div>

        {/* Actions */}
        <button onClick={() => {
          const matQuery = result.mats.map(m => `${m.p}% ${m.n}`).join(", ") + " garment";
          onFullScan(matQuery);
        }} style={{
          width: "100%", padding: 16, background: "linear-gradient(135deg, var(--g7), var(--g8))",
          border: "1px solid var(--g6)", borderRadius: 14, color: "white",
          fontFamily: "var(--sans)", fontWeight: 700, fontSize: 14, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          marginBottom: 10
        }}>
          🔬 Get Full Safety Analysis →
        </button>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { setStep(0); setAnswers({}); }} style={{
            flex: 1, padding: 12, background: "var(--s1)", border: "1px solid var(--bd)",
            borderRadius: 12, color: "var(--tx3)", fontFamily: "var(--sans)", fontWeight: 600,
            fontSize: 12, cursor: "pointer"
          }}>Test Another</button>
          <button onClick={onClose} style={{
            flex: 1, padding: 12, background: "var(--s1)", border: "1px solid var(--bd)",
            borderRadius: 12, color: "var(--tx3)", fontFamily: "var(--sans)", fontWeight: 600,
            fontSize: 12, cursor: "pointer"
          }}>Close</button>
        </div>
      </div>
    );
  }

  // ---- QUESTION SCREEN ----
  const q = STEPS[step];

  return (
    <div style={{ padding: "0 24px" }}>
      {/* Progress */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {STEPS.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 2, transition: "background .3s",
            background: i < step ? "var(--g5)" : i === step ? "var(--g4)" : "var(--bd)",
            boxShadow: i === step ? "0 0 8px rgba(74,222,128,.3)" : "none"
          }} />
        ))}
      </div>

      {/* Live prediction (shows after first answer) */}
      {currentPrediction && step > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
          background: `${sc(currentPrediction.safety)}08`, border: `1px solid ${sc(currentPrediction.safety)}22`,
          borderRadius: 12, marginBottom: 14, fontSize: 12
        }}>
          <div style={{ fontFamily: "var(--serif)", fontWeight: 800, fontSize: 18, color: sc(currentPrediction.safety) }}>
            {currentPrediction.safety}
          </div>
          <div style={{ color: "var(--tx3)" }}>
            Likely <span style={{ fontWeight: 600, color: "var(--tx2)" }}>{currentPrediction.primary}</span>
            <span style={{ opacity: .5 }}> · {currentPrediction.confidence}% confident</span>
          </div>
        </div>
      )}

      {/* Question card */}
      <div style={{
        background: "var(--s1)", border: "1px solid var(--bd)", borderRadius: 20,
        padding: 24, marginBottom: 14
      }}>
        <div style={{ fontSize: 10, color: "var(--tx4)", fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>
          Step {step + 1} of {STEPS.length}
        </div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 700, marginBottom: 6 }}>{q.title}</div>
        <div style={{ fontSize: 13, color: "var(--tx3)", fontStyle: "italic", marginBottom: 18, lineHeight: 1.5 }}>{q.sub}</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {q.options.map(opt => (
            <button key={opt.value}
              onClick={() => handleAnswer(q.id, opt.value)}
              style={{
                display: "flex", alignItems: "center", gap: 14, padding: "16px 16px",
                background: answers[q.id] === opt.value ? "var(--g9)" : "var(--s2)",
                border: `1.5px solid ${answers[q.id] === opt.value ? "var(--g5)" : "var(--bd)"}`,
                borderRadius: 14, cursor: "pointer", transition: "all .2s",
                color: answers[q.id] === opt.value ? "var(--g4)" : "var(--tx)",
                fontFamily: "var(--sans)", textAlign: "left", width: "100%"
              }}>
              <span style={{ fontSize: 24, minWidth: 36, textAlign: "center" }}>{opt.icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{opt.label}</div>
                <div style={{ fontSize: 12, color: answers[q.id] === opt.value ? "var(--g4)" : "var(--tx4)", marginTop: 2 }}>{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", gap: 8 }}>
        {step > 0 && (
          <button onClick={() => setStep(step - 1)} style={{
            background: "none", border: "none", color: "var(--tx3)",
            fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600,
            cursor: "pointer", padding: "6px 0"
          }}>← Back</button>
        )}
        <button onClick={onClose} style={{
          background: "none", border: "none", color: "var(--tx3)",
          fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600,
          cursor: "pointer", padding: "6px 0"
        }}>Cancel</button>
      </div>
    </div>
  );
}
