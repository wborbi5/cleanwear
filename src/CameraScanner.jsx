import { useState, useRef, useEffect, useCallback } from "react";
import { BarcodeDetector as BarcodeDetectorPolyfill } from "barcode-detector";

const MODES = [
  { id: "barcode", label: "Barcode", icon: "📊", desc: "Scan UPC barcode" },
  { id: "tag", label: "Read Tag", icon: "🏷️", desc: "Photo the clothing label" },
  { id: "fabric", label: "Fabric ID", icon: "🔬", desc: "Identify material from texture" },
];

export default function CameraScanner({ onResult, onClose }) {
  const [mode, setMode] = useState("tag");
  const [camOn, setCamOn] = useState(false);
  const [camErr, setCamErr] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const vidRef = useRef(null);
  const streamRef = useRef(null);
  const scanRef = useRef(null);
  const canvasRef = useRef(null);

  const stopCam = useCallback(() => {
    if (scanRef.current) { clearInterval(scanRef.current); scanRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setCamOn(false);
  }, []);

  const startCam = useCallback(async () => {
    setCamErr(null);
    setPreview(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = s;
      setCamOn(true);
      // Wait a tick for ref to be ready
      setTimeout(() => {
        if (vidRef.current) { vidRef.current.srcObject = s; vidRef.current.play().catch(() => {}); }
      }, 100);
    } catch (e) {
      setCamErr(e.name === "NotAllowedError"
        ? "Camera access denied. Allow camera permissions in your browser settings."
        : "Camera not available on this device.");
    }
  }, []);

  // Start camera on mount
  useEffect(() => { startCam(); return () => stopCam(); }, []);

  // Barcode scanning loop
  useEffect(() => {
    if (!camOn || mode !== "barcode") {
      if (scanRef.current) { clearInterval(scanRef.current); scanRef.current = null; }
      return;
    }
    const DetectorClass = ("BarcodeDetector" in window) ? window.BarcodeDetector : BarcodeDetectorPolyfill;
    try {
      const d = new DetectorClass({ formats: ["upc_a", "upc_e", "ean_13", "ean_8", "code_128", "code_39"] });
      if (!canvasRef.current) canvasRef.current = document.createElement("canvas");
      scanRef.current = setInterval(async () => {
        if (vidRef.current?.readyState >= 2) {
          try {
            const v = vidRef.current;
            const c = canvasRef.current;
            c.width = v.videoWidth; c.height = v.videoHeight;
            c.getContext("2d").drawImage(v, 0, 0);
            const imgData = c.getContext("2d").getImageData(0, 0, c.width, c.height);
            const b = await d.detect(imgData);
            if (b.length) {
              clearInterval(scanRef.current); scanRef.current = null;
              stopCam();
              onResult({ type: "barcode", value: b[0].rawValue });
            }
          } catch {}
        }
      }, 350);
    } catch {
      setCamErr("Barcode scanning not supported. Try Tag or Fabric mode.");
    }
    return () => { if (scanRef.current) { clearInterval(scanRef.current); scanRef.current = null; } };
  }, [camOn, mode, stopCam, onResult]);

  // Capture frame for tag/fabric analysis
  const captureFrame = useCallback(() => {
    if (!vidRef.current || vidRef.current.readyState < 2) return;
    setCapturing(true);
    if (!canvasRef.current) canvasRef.current = document.createElement("canvas");
    const v = vidRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    const dataUrl = c.toDataURL("image/jpeg", 0.85);
    setPreview(dataUrl);
    setCapturing(false);
    stopCam();
  }, [stopCam]);

  // Send captured image to vision API
  const analyzeImage = useCallback(async () => {
    if (!preview) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: preview, mode }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onResult({ type: mode, value: data });
    } catch (err) {
      setCamErr("Analysis failed. Try again with better lighting.");
      setPreview(null);
      startCam();
    }
    setAnalyzing(false);
  }, [preview, mode, onResult, startCam]);

  const retake = useCallback(() => {
    setPreview(null);
    setCamErr(null);
    startCam();
  }, [startCam]);

  // ---- ANALYZING STATE ----
  if (analyzing) {
    return (
      <div style={{ padding: "80px 24px", textAlign: "center" }}>
        <div style={{
          width: 48, height: 48, borderRadius: "50%", border: "2.5px solid var(--bd)",
          borderTopColor: "var(--g4)", animation: "sp .8s linear infinite",
          margin: "0 auto 20px"
        }} />
        <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
          {mode === "tag" ? "Reading your clothing tag..." : "Analyzing fabric material..."}
        </div>
        <div style={{ fontSize: 13, color: "var(--g4)", animation: "pulse 1.5s ease-in-out infinite" }}>
          {mode === "tag" ? "Extracting brand, materials, origin" : "Identifying texture, weave, composition"}
        </div>
      </div>
    );
  }

  // ---- PREVIEW STATE (captured photo) ----
  if (preview) {
    return (
      <div style={{ padding: "0 24px" }}>
        <div style={{
          position: "relative", borderRadius: 16, overflow: "hidden",
          marginBottom: 14, border: "1px solid var(--bd)"
        }}>
          <img src={preview} alt="Captured" style={{ width: "100%", display: "block", borderRadius: 16 }} />
          <div style={{
            position: "absolute", bottom: 12, left: 12, right: 12,
            background: "rgba(0,0,0,.7)", backdropFilter: "blur(8px)",
            borderRadius: 12, padding: "10px 14px", display: "flex",
            alignItems: "center", gap: 8
          }}>
            <span style={{ fontSize: 18 }}>{mode === "tag" ? "🏷️" : "🔬"}</span>
            <span style={{ fontSize: 13, color: "var(--tx2)", fontWeight: 500 }}>
              {mode === "tag" ? "Tag photo captured" : "Fabric photo captured"}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={analyzeImage} style={{
            flex: 2, padding: 16, background: "linear-gradient(135deg, var(--g7), var(--g8))",
            border: "1px solid var(--g6)", borderRadius: 14, color: "white",
            fontFamily: "var(--sans)", fontWeight: 700, fontSize: 15, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8
          }}>
            {mode === "tag" ? "🏷️ Read Tag" : "🔬 Identify Fabric"} →
          </button>
          <button onClick={retake} style={{
            flex: 1, padding: 16, background: "var(--s1)", border: "1px solid var(--bd)",
            borderRadius: 14, color: "var(--tx3)", fontFamily: "var(--sans)",
            fontWeight: 600, fontSize: 13, cursor: "pointer"
          }}>Retake</button>
        </div>

        <button onClick={() => { stopCam(); onClose(); }} style={{
          width: "100%", marginTop: 10, padding: 12, background: "none",
          border: "none", color: "var(--tx4)", fontFamily: "var(--sans)",
          fontSize: 12, fontWeight: 600, cursor: "pointer"
        }}>Cancel</button>
      </div>
    );
  }

  // ---- ERROR STATE ----
  if (camErr) {
    return (
      <div style={{ padding: "48px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12, opacity: .6 }}>📷</div>
        <p style={{ color: "var(--tx3)", fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>{camErr}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button onClick={retake} style={{
            padding: "11px 24px", background: "var(--g8)", border: "1px solid var(--g7)",
            borderRadius: 12, color: "var(--g4)", fontFamily: "var(--sans)",
            fontWeight: 600, fontSize: 13, cursor: "pointer"
          }}>Try Again</button>
          <button onClick={() => { stopCam(); onClose(); }} style={{
            padding: "11px 24px", background: "var(--s1)", border: "1px solid var(--bd)",
            borderRadius: 12, color: "var(--tx3)", fontFamily: "var(--sans)",
            fontWeight: 600, fontSize: 13, cursor: "pointer"
          }}>Close</button>
        </div>
      </div>
    );
  }

  // ---- LIVE CAMERA VIEW ----
  return (
    <div>
      {/* Mode tabs */}
      <div style={{ padding: "12px 24px 0" }}>
        <div style={{
          display: "flex", gap: 4, background: "var(--s1)",
          borderRadius: 14, padding: 4, border: "1px solid var(--bd)"
        }}>
          {MODES.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)} style={{
              flex: 1, padding: "10px 6px", border: "none", borderRadius: 11,
              fontFamily: "var(--sans)", fontSize: 11, fontWeight: 600,
              cursor: "pointer", transition: "all .25s",
              background: mode === m.id ? "var(--g9)" : "transparent",
              color: mode === m.id ? "var(--g4)" : "var(--tx3)",
              boxShadow: mode === m.id ? "0 2px 8px rgba(22,101,52,.3)" : "none",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2
            }}>
              <span style={{ fontSize: 16 }}>{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Camera viewport */}
      <div style={{ padding: "12px 24px" }}>
        <div style={{
          position: "relative", width: "100%", aspectRatio: mode === "barcode" ? "4/3" : "3/4",
          background: "#000", borderRadius: 16, overflow: "hidden",
          border: "1px solid var(--bd)"
        }}>
          <video ref={vidRef} playsInline muted style={{
            width: "100%", height: "100%", objectFit: "cover"
          }} />

          {/* Overlay guide */}
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center",
            justifyContent: "center", pointerEvents: "none"
          }}>
            {mode === "barcode" && (
              <div style={{
                width: 260, height: 140, border: "2px solid rgba(74,222,128,.6)",
                borderRadius: 14, position: "relative",
                boxShadow: "0 0 0 9999px rgba(0,0,0,.5)"
              }}>
                <div style={{
                  position: "absolute", left: 10, right: 10, height: 2,
                  background: "linear-gradient(90deg, transparent, var(--g4), transparent)",
                  top: "50%", animation: "camScan 2s ease-in-out infinite"
                }} />
              </div>
            )}
            {mode === "tag" && (
              <div style={{
                width: "75%", height: "60%", border: "2px dashed rgba(74,222,128,.5)",
                borderRadius: 14, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: "0 0 0 9999px rgba(0,0,0,.4)"
              }}>
                <span style={{ fontSize: 28 }}>🏷️</span>
                <span style={{ color: "rgba(255,255,255,.7)", fontSize: 12, fontWeight: 600, textAlign: "center", padding: "0 20px" }}>
                  Position the clothing tag here
                </span>
              </div>
            )}
            {mode === "fabric" && (
              <div style={{
                width: "70%", height: "50%", border: "2px dashed rgba(74,222,128,.5)",
                borderRadius: "50%", display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: "0 0 0 9999px rgba(0,0,0,.4)"
              }}>
                <span style={{ fontSize: 28 }}>🔬</span>
                <span style={{ color: "rgba(255,255,255,.7)", fontSize: 12, fontWeight: 600, textAlign: "center", padding: "0 20px" }}>
                  Get close to the fabric
                </span>
              </div>
            )}
          </div>

          {/* Close button */}
          <button onClick={() => { stopCam(); onClose(); }} style={{
            position: "absolute", top: 12, right: 12, width: 36, height: 36,
            borderRadius: "50%", background: "rgba(0,0,0,.5)", backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,.1)", color: "white", fontSize: 16,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 2
          }}>✕</button>

          {/* Status text */}
          <div style={{
            position: "absolute", bottom: 16, left: 0, right: 0, textAlign: "center",
            fontSize: 13, color: "var(--g4)", fontWeight: 500,
            animation: "pulse 1.5s ease-in-out infinite"
          }}>
            {mode === "barcode" && "Scanning for barcode..."}
            {mode === "tag" && "Position tag in frame, then tap capture"}
            {mode === "fabric" && "Get close to the fabric, then tap capture"}
          </div>
        </div>
      </div>

      {/* Capture button (tag and fabric modes) */}
      {mode !== "barcode" && camOn && (
        <div style={{ padding: "0 24px", display: "flex", justifyContent: "center" }}>
          <button onClick={captureFrame} disabled={capturing} style={{
            width: 72, height: 72, borderRadius: "50%",
            background: "linear-gradient(135deg, var(--g6), var(--g8))",
            border: "4px solid rgba(74,222,128,.3)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 20px rgba(22,101,52,.4)",
            transition: "all .2s"
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              border: "2px solid rgba(255,255,255,.3)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <span style={{ fontSize: 24, color: "white" }}>
                {mode === "tag" ? "🏷️" : "🔬"}
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Mode description */}
      <div style={{
        padding: "12px 24px 0", textAlign: "center",
        fontSize: 12, color: "var(--tx4)", lineHeight: 1.5
      }}>
        {mode === "barcode" && "Point at the barcode on the clothing tag. Auto-detects."}
        {mode === "tag" && "Photograph the composition/care label inside the garment. Our AI reads the text — brand, materials, origin."}
        {mode === "fabric" && "Take a close-up photo of the fabric surface. Our AI identifies the material from texture and weave."}
      </div>
    </div>
  );
}
