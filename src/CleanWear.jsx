import { useState, useEffect, useCallback, useRef } from "react";
import { logScan } from "./supabase.js";
import { BarcodeDetector as BarcodeDetectorPolyfill } from "barcode-detector/ponyfill";

// ============================================================
// CLEANWEAR — Clothing Safety Intelligence
// Luxury Health Tech Aesthetic
// ============================================================

const MATERIAL_DB = {
  "organic cotton": { score: 95, category: "natural", risk: "minimal", desc: "Grown without synthetic pesticides or fertilizers. Minimal chemical processing." },
  "cotton": { score: 72, category: "natural", risk: "low", desc: "Natural fiber but conventionally grown with pesticides. Often treated with formaldehyde resins for wrinkle resistance." },
  "merino wool": { score: 90, category: "natural", risk: "minimal", desc: "Natural temperature regulation. Minimal chemical treatment needed." },
  "wool": { score: 85, category: "natural", risk: "low", desc: "Natural fiber with good breathability. Some chemical treatments in processing." },
  "hemp": { score: 93, category: "natural", risk: "minimal", desc: "Naturally pest-resistant, requires minimal chemicals to grow or process." },
  "linen": { score: 90, category: "natural", risk: "minimal", desc: "Made from flax. One of the least chemically-intensive fibers to produce." },
  "silk": { score: 82, category: "natural", risk: "low", desc: "Natural protein fiber. Some chemical treatments in dyeing process." },
  "bamboo lyocell": { score: 85, category: "semi-synthetic", risk: "low", desc: "Closed-loop process recovers solvents. Much safer than bamboo viscose." },
  "tencel": { score: 87, category: "semi-synthetic", risk: "minimal", desc: "Lyocell made by Lenzing. Closed-loop production with non-toxic solvents." },
  "modal": { score: 70, category: "semi-synthetic", risk: "moderate", desc: "Beech tree pulp processed with chemicals. Better than viscose but not chemical-free." },
  "polyester": { score: 32, category: "synthetic", risk: "high", desc: "Petroleum-based. Contains antimony trioxide (catalyst). Releases microplastics. May leach BPA and phthalates, especially when heated during exercise." },
  "recycled polyester": { score: 48, category: "synthetic", risk: "moderate-high", desc: "Better environmentally but still contains antimony trioxide and can leach chemicals. Microplastic shedding remains." },
  "nylon": { score: 38, category: "synthetic", risk: "high", desc: "Petroleum-based. Often treated with formaldehyde. Can release VOCs and contains endocrine-disrupting chemicals." },
  "spandex": { score: 42, category: "synthetic", risk: "moderate-high", desc: "Contains isocyanates and other chemical additives. Releases chemicals when stretched and heated." },
  "elastane": { score: 42, category: "synthetic", risk: "moderate-high", desc: "Same as spandex. Chemical-intensive production with potential endocrine disruptors." },
  "lycra": { score: 42, category: "synthetic", risk: "moderate-high", desc: "Brand name for elastane/spandex. Same chemical profile and health concerns." },
  "acrylic": { score: 28, category: "synthetic", risk: "high", desc: "Made from acrylonitrile, a probable carcinogen. Off-gasses chemicals and releases microplastics." },
  "rayon": { score: 45, category: "semi-synthetic", risk: "moderate-high", desc: "Wood pulp dissolved in harsh chemicals including carbon disulfide." },
  "viscose": { score: 43, category: "semi-synthetic", risk: "moderate-high", desc: "Type of rayon. Carbon disulfide and sodium hydroxide used in production." },
  "polypropylene": { score: 35, category: "synthetic", risk: "high", desc: "Plastic-based fiber. Releases microplastics and may contain chemical additives." },
  "bamboo viscose": { score: 40, category: "semi-synthetic", risk: "moderate-high", desc: "Despite bamboo marketing, heavy chemical processing negates natural benefits." },
  "polyurethane": { score: 30, category: "synthetic", risk: "high", desc: "Plastic coating often used in faux leather. Contains isocyanates and may release VOCs." },
};

const CHEMICAL_RISKS = {
  bpa: { name: "BPA/BPS", severity: 35, icon: "⚠️", desc: "Endocrine disruptor linked to hormonal imbalance, reduced testosterone, reproductive issues, and increased cancer risk.", timeline: "Effects begin accumulating within weeks of daily skin exposure.", cancerLinked: true },
  pfas: { name: "PFAS (Forever Chemicals)", severity: 40, icon: "☠️", desc: "Virtually indestructible chemicals linked to cancer, thyroid disease, immune suppression, and reproductive harm.", timeline: "Bioaccumulates over years. Half-life in body: 2-8 years.", cancerLinked: true },
  formaldehyde: { name: "Formaldehyde Resins", severity: 30, icon: "🧪", desc: "Known carcinogen used for wrinkle resistance. Linked to nasopharyngeal cancer.", timeline: "Cancer risk increases with chronic long-term exposure.", cancerLinked: true },
  phthalates: { name: "Phthalates", severity: 28, icon: "⚠️", desc: "Plasticizers that disrupt hormones. Linked to reduced testosterone and fertility issues.", timeline: "Hormonal effects manifest within months of regular exposure.", cancerLinked: false },
  azo_dyes: { name: "Azo Dyes", severity: 22, icon: "🎨", desc: "Release carcinogenic aromatic amines. Banned in EU but still used globally.", timeline: "Carcinogenic compounds released with sweat and friction.", cancerLinked: true },
  antimony: { name: "Antimony Trioxide", severity: 25, icon: "⚗️", desc: "Catalyst in polyester production. Classified as possibly carcinogenic.", timeline: "Increased leaching during exercise when body temperature rises.", cancerLinked: true },
  heavy_metals: { name: "Heavy Metals in Dyes", severity: 30, icon: "🔬", desc: "Lead, chromium, cadmium in textile dyes. Accumulate in organs.", timeline: "Organ damage is cumulative and often irreversible.", cancerLinked: true },
  microplastics: { name: "Microplastic Shedding", severity: 18, icon: "🔍", desc: "Synthetic fabrics shed microscopic plastic particles absorbed through skin.", timeline: "Microplastics detected in human bloodstream within days.", cancerLinked: false },
};

const CERTIFICATIONS = {
  "oeko-tex": { name: "OEKO-TEX Standard 100", bonus: 15, desc: "Tested for harmful substances at every stage of production." },
  "gots": { name: "GOTS Certified", bonus: 15, desc: "Global Organic Textile Standard — organic fibers, strict chemical limits." },
  "bluesign": { name: "bluesign® Approved", bonus: 12, desc: "Ensures safe chemical management throughout supply chain." },
  "fair_trade": { name: "Fair Trade Certified", bonus: 8, desc: "Ethical labor standards, often correlates with better chemical practices." },
  "cradle_to_cradle": { name: "Cradle to Cradle", bonus: 14, desc: "Comprehensive material health assessment at molecular level." },
};

const COUNTRY_SCORES = {
  "germany": 92, "sweden": 92, "denmark": 90, "eu": 90, "italy": 88, "portugal": 87,
  "japan": 88, "south korea": 78, "usa": 82, "canada": 80, "uk": 85, "australia": 82,
  "turkey": 60, "china": 48, "bangladesh": 42, "vietnam": 52, "india": 50, "indonesia": 48,
  "cambodia": 44, "myanmar": 38, "pakistan": 45, "thailand": 55, "mexico": 58,
};

const FUN_FACTS = [
  { icon: "🧬", fact: "A single polyester gym shirt releases up to 1,900 microplastic fibers per wash — fibers that end up in your bloodstream.", source: "Environmental Science & Technology, 2023" },
  { icon: "🌡️", fact: "BPA in synthetic clothing leaches 15x faster during exercise when skin temperature exceeds 37°C.", source: "Journal of Dermatological Science" },
  { icon: "💪", fact: "Men exposed to high BPA levels showed testosterone levels 30% lower than those with minimal exposure.", source: "Reproductive Toxicology, 2022" },
  { icon: "👕", fact: "The average person absorbs up to 120 different chemicals through their clothing every single day.", source: "Stockholm University Research" },
  { icon: "🏃", fact: "Athletic wear is the highest-risk clothing category — sweat, heat, and friction all accelerate chemical leaching into your body.", source: "Textile Research Journal" },
  { icon: "🧪", fact: "Formaldehyde — the chemical used to preserve lab specimens — is used in 60% of cotton clothing for wrinkle resistance.", source: "Government Accountability Office" },
  { icon: "🌍", fact: "PFAS 'forever chemicals' in waterproof activewear take over 1,000 years to break down. They never leave your body.", source: "Environmental Health Perspectives" },
  { icon: "🔬", fact: "Microplastics from synthetic clothing were found in 80% of human blood samples tested in a landmark 2022 study.", source: "Environment International, 2022" },
  { icon: "🏋️", fact: "Nylon-spandex compression wear creates the highest chemical absorption rate of any clothing type through sustained skin contact.", source: "Journal of Exposure Science" },
  { icon: "🧴", fact: "Anti-odor treatments on athletic wear contain nanosilver particles that accumulate in your liver and kidneys over time.", source: "Nanotoxicology Research" },
];

// --- ENGINE ---
function calculateScore(pd) {
  let ms = 0, tw = 0; const mb = [];
  if (pd.materials?.length > 0) {
    pd.materials.forEach(m => {
      const k = m.name.toLowerCase().trim();
      const d = MATERIAL_DB[k] || Object.entries(MATERIAL_DB).find(([x]) => k.includes(x))?.[1];
      const p = m.percentage / 100, s = d ? d.score : 50;
      ms += s * p; tw += p;
      mb.push({ name: m.name, percentage: m.percentage, score: s, category: d?.category || "unknown", risk: d?.risk || "unknown", desc: d?.desc || "Insufficient data." });
    });
    if (tw > 0) ms /= tw;
  } else ms = 50;
  let cp = 0; const dc = [];
  pd.chemicals?.forEach(c => { const r = CHEMICAL_RISKS[c]; if (r) { cp += r.severity; dc.push(r); } });
  const cs = Math.max(0, 100 - cp);
  let ct = 40; const fc = [];
  pd.certifications?.forEach(c => { const d = CERTIFICATIONS[c]; if (d) { ct += d.bonus; fc.push(d); } });
  ct = Math.min(100, ct);
  let os = 50;
  if (pd.origin) { const k = pd.origin.toLowerCase(); os = COUNTRY_SCORES[k] || Object.entries(COUNTRY_SCORES).find(([x]) => k.includes(x))?.[1] || 50; }
  const f = Math.round(ms * 0.60 + cs * 0.15 + ct * 0.15 + os * 0.10);
  return { overall: Math.max(0, Math.min(100, f)), materialScore: Math.round(ms), chemicalScore: Math.round(cs), certScore: Math.round(ct), originScore: Math.round(os), materialBreakdown: mb, detectedChemicals: dc, foundCerts: fc, origin: pd.origin || "Unknown" };
}

function sc(s) { if (s >= 75) return "#4ade80"; if (s >= 60) return "#a3e635"; if (s >= 45) return "#facc15"; if (s >= 30) return "#fb923c"; return "#f87171"; }
function sg(s) { if (s >= 80) return "Excellent"; if (s >= 65) return "Good"; if (s >= 50) return "Mediocre"; if (s >= 35) return "Poor"; return "Bad"; }
function sbg(s) { if (s >= 75) return "linear-gradient(160deg, #052e16, #14532d 60%, #166534)"; if (s >= 60) return "linear-gradient(160deg, #1a2e05, #365314 60%, #3f6212)"; if (s >= 45) return "linear-gradient(160deg, #2e1f05, #533f14 60%, #624e12)"; if (s >= 30) return "linear-gradient(160deg, #2e1505, #532414 60%, #6e2f0a)"; return "linear-gradient(160deg, #2e0505, #531414 60%, #7f1d1d)"; }

function getCancerRisk(score, chems) {
  const cc = chems.filter(c => c.cancerLinked);
  if (score >= 75) return { level: "Low", mult: "1.0×", color: "#4ade80", desc: "No significant cancer-linked compounds. Risk at baseline.", w: 12 };
  if (score >= 50) return { level: "Moderate", mult: "1.4×", color: "#facc15", desc: `${cc.length} compound${cc.length !== 1 ? "s" : ""} linked to cancer risk. Daily wear amplifies cumulative exposure.`, w: 45 };
  if (score >= 35) return { level: "Elevated", mult: "2.1×", color: "#fb923c", desc: `${cc.length} known or probable carcinogens. Regular wear significantly increases long-term cancer risk.`, w: 68 };
  return { level: "High", mult: "3.2×", color: "#f87171", desc: `${cc.length} carcinogenic compounds detected. Replacement strongly recommended.`, w: 90 };
}

function getTimeline(score) {
  if (score >= 75) return [
    { period: "Daily Wear", icon: "✓", color: "#4ade80", desc: "Minimal chemical exposure. Natural fibers breathe without leaching compounds." },
    { period: "6 Months", icon: "✓", color: "#4ade80", desc: "No accumulation. Your body easily handles trace amounts." },
    { period: "1–5 Years", icon: "✓", color: "#86efac", desc: "No measurable hormonal or cellular impact. Cancer risk at baseline." },
    { period: "Long-term", icon: "✓", color: "#86efac", desc: "Excellent safety profile. A significant exposure source eliminated." },
  ];
  if (score >= 50) return [
    { period: "Daily Wear", icon: "•", color: "#facc15", desc: "Moderate chemical transfer through skin, accelerated during sweating." },
    { period: "6 Months", icon: "•", color: "#facc15", desc: "Synthetic compounds accumulating in bloodstream. Testosterone may decline." },
    { period: "1–5 Years", icon: "!", color: "#fb923c", desc: "Testosterone reduction 5–15%. Microplastics accumulating in organs. Cellular damage begins." },
    { period: "Long-term", icon: "!", color: "#fb923c", desc: "Elevated endocrine disruption and cancer risk. Cumulative chemical stress on organs." },
  ];
  return [
    { period: "Daily Wear", icon: "!", color: "#f87171", desc: "High chemical transfer amplified by exercise. Carcinogens actively leaching through skin." },
    { period: "6 Months", icon: "!!", color: "#f87171", desc: "Carcinogens in blood. Testosterone dropping 10–20%. Endocrine system under assault." },
    { period: "1–5 Years", icon: "!!", color: "#ef4444", desc: "Testosterone reduction up to 30%. Carcinogens accumulating in breast tissue, liver, kidneys." },
    { period: "Long-term", icon: "!!!", color: "#ef4444", desc: "Significantly increased cancer rates. Irreversible organ accumulation. Immediate replacement critical." },
  ];
}

async function researchProduct(q, bc = false) {
  const r = await fetch("/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: q, isBarcode: bc }),
  });
  const data = await r.json();
  if (data.error) throw new Error(data.error);
  if (!data.product_name) throw new Error("Invalid response");
  return data;
}

const EXPLORE_DB = [
  // Athletic
  { name: "Dri-FIT Tee", brand: "Nike", score: 34, materials: "100% Polyester", cat: "Athletic" },
  { name: "HeatGear Compression", brand: "Under Armour", score: 30, materials: "84% Polyester, 16% Elastane", cat: "Athletic" },
  { name: "Aeroready Tee", brand: "Adidas", score: 36, materials: "100% Recycled Polyester", cat: "Athletic" },
  { name: "Merino Base Layer", brand: "Smartwool", score: 87, materials: "100% Merino Wool", cat: "Athletic" },
  { name: "Tech Fleece Hoodie", brand: "Nike", score: 32, materials: "66% Cotton, 34% Polyester", cat: "Athletic" },
  { name: "Align Leggings", brand: "Lululemon", score: 29, materials: "81% Nylon, 19% Lycra", cat: "Athletic" },
  { name: "Gym Shorts", brand: "Gymshark", score: 31, materials: "88% Polyester, 12% Elastane", cat: "Athletic" },
  { name: "Compression Tights", brand: "2XU", score: 28, materials: "70% Nylon, 30% Elastane", cat: "Athletic" },
  { name: "Instinct Shorts", brand: "Gymshark", score: 33, materials: "90% Polyester, 10% Elastane", cat: "Athletic" },
  { name: "Swiftly Tech Tee", brand: "Lululemon", score: 31, materials: "88% Nylon, 12% Elastane", cat: "Athletic" },
  { name: "Wunder Train Leggings", brand: "Lululemon", score: 30, materials: "83% Nylon, 17% Lycra", cat: "Athletic" },
  { name: "Vital Seamless Tee", brand: "Gymshark", score: 32, materials: "92% Nylon, 8% Elastane", cat: "Athletic" },
  // Casual
  { name: "Organic Cotton Tee", brand: "Patagonia", score: 88, materials: "100% Organic Cotton", cat: "Casual" },
  { name: "Better Cotton Tee", brand: "H&M Conscious", score: 65, materials: "100% Cotton (BCI)", cat: "Casual" },
  { name: "Hemp Tee", brand: "prAna", score: 89, materials: "55% Hemp, 45% Organic Cotton", cat: "Casual" },
  { name: "Tencel Modal Tee", brand: "Allbirds", score: 80, materials: "95% TENCEL, 5% Elastane", cat: "Casual" },
  { name: "Linen Camp Shirt", brand: "J.Crew", score: 84, materials: "100% Linen", cat: "Casual" },
  { name: "Essential Tee", brand: "Uniqlo", score: 68, materials: "100% Cotton", cat: "Casual" },
  { name: "Supima Cotton Tee", brand: "Uniqlo", score: 72, materials: "100% Supima Cotton", cat: "Casual" },
  { name: "Fleece Hoodie", brand: "Carhartt", score: 55, materials: "80% Cotton, 20% Polyester", cat: "Casual" },
  { name: "505 Regular Jeans", brand: "Levi's", score: 64, materials: "99% Cotton, 1% Elastane", cat: "Casual" },
  { name: "Classic Oxford Shirt", brand: "Brooks Brothers", score: 70, materials: "100% Cotton", cat: "Casual" },
  // Underwear
  { name: "Organic Boxer Briefs", brand: "Pact", score: 91, materials: "95% Organic Cotton, 5% Spandex", cat: "Underwear" },
  { name: "ExOfficio Boxer", brand: "ExOfficio", score: 33, materials: "94% Nylon, 6% Spandex", cat: "Underwear" },
  { name: "Classic Boxer Brief", brand: "Calvin Klein", score: 62, materials: "92% Cotton, 8% Elastane", cat: "Underwear" },
  { name: "Performance Boxer", brand: "Saxx", score: 34, materials: "95% Polyester, 5% Elastane", cat: "Underwear" },
  { name: "Organic Bralette", brand: "Pact", score: 90, materials: "95% Organic Cotton, 5% Spandex", cat: "Underwear" },
  { name: "Seamless Thong", brand: "Victoria's Secret", score: 35, materials: "82% Nylon, 18% Elastane", cat: "Underwear" },
  // Sleepwear
  { name: "Organic Pajama Set", brand: "Coyuchi", score: 93, materials: "100% Organic Cotton", cat: "Sleepwear" },
  { name: "Bamboo Sleep Set", brand: "Cozy Earth", score: 78, materials: "95% Bamboo Viscose, 5% Spandex", cat: "Sleepwear" },
  { name: "Satin Pajamas", brand: "Victoria's Secret", score: 38, materials: "100% Polyester Satin", cat: "Sleepwear" },
  { name: "Flannel PJ Pants", brand: "L.L.Bean", score: 72, materials: "100% Cotton Flannel", cat: "Sleepwear" },
  // Outerwear
  { name: "Nano Puff Jacket", brand: "Patagonia", score: 45, materials: "100% Recycled Polyester, PFC-free DWR", cat: "Outerwear" },
  { name: "Thermoball Jacket", brand: "The North Face", score: 36, materials: "100% Nylon, Polyester insulation", cat: "Outerwear" },
  { name: "Rain Jacket", brand: "Arc'teryx", score: 38, materials: "100% Nylon, Gore-Tex membrane", cat: "Outerwear" },
  { name: "Wool Overcoat", brand: "J.Crew", score: 82, materials: "80% Wool, 20% Nylon", cat: "Outerwear" },
  // Kids
  { name: "Kids Organic Onesie", brand: "Burt's Bees Baby", score: 92, materials: "100% Organic Cotton", cat: "Kids" },
  { name: "Kids Dri-FIT Tee", brand: "Nike", score: 33, materials: "100% Polyester", cat: "Kids" },
  { name: "Toddler Leggings", brand: "Cat & Jack", score: 58, materials: "57% Cotton, 38% Polyester, 5% Spandex", cat: "Kids" },
  { name: "Baby Bodysuit 5-Pack", brand: "Carter's", score: 63, materials: "100% Cotton", cat: "Kids" },
];

// ======================== STYLES ========================
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --g1:#f0fdf4;--g2:#bbf7d0;--g3:#86efac;--g4:#4ade80;--g5:#22c55e;--g6:#16a34a;--g7:#15803d;--g8:#166534;--g9:#14532d;--g10:#052e16;
  --r4:#f87171;--r5:#ef4444;--r6:#dc2626;--a4:#facc15;--o4:#fb923c;
  --bg:#030a03;--s1:#081408;--s2:#0c1e0c;--s3:#112811;--bd:#183218;--bd2:#1e3e1e;
  --tx:#eaf5ea;--tx2:#c4dcc4;--tx3:#7da67d;--tx4:#4d7a4d;
  --serif:'Playfair Display',Georgia,serif;--sans:'Plus Jakarta Sans','Helvetica Neue',sans-serif;
  --gold:#c9a84c;--gold2:#a68a3a;
}

.app{font-family:var(--sans);background:var(--bg);color:var(--tx);min-height:100vh;max-width:480px;margin:0 auto;position:relative;overflow-x:hidden}

/* Ambient glow */
.app::before{content:'';position:fixed;top:-100px;left:50%;transform:translateX(-50%);width:600px;height:600px;background:radial-gradient(circle,rgba(22,101,52,.08) 0%,rgba(22,101,52,.03) 40%,transparent 70%);pointer-events:none;z-index:0}
.app::after{content:'';position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:480px;height:200px;background:linear-gradient(to top,var(--bg),transparent);pointer-events:none;z-index:90}

/* Header */
.hdr{padding:18px 24px 14px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50;background:rgba(3,10,3,.82);backdrop-filter:blur(24px) saturate(1.4);border-bottom:1px solid rgba(24,50,24,.5)}
.hdr-logo{font-family:var(--serif);font-weight:700;font-size:20px;color:var(--tx);letter-spacing:-.3px}
.hdr-logo em{font-style:italic;color:var(--g4);font-weight:500}
.hdr-badge{font-size:11px;color:var(--tx3);font-weight:500;letter-spacing:.3px}

.cnt{padding:0 0 110px;position:relative;z-index:1}

/* ===== HOME / SCANNER ===== */

/* Hero */
.hero{padding:48px 24px 0;text-align:center;animation:fadeUp .8s ease-out both}
.hero-eyebrow{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--gold);font-weight:600;margin-bottom:16px}
.hero h1{font-family:var(--serif);font-size:32px;font-weight:700;line-height:1.2;letter-spacing:-.5px;margin-bottom:12px;color:var(--tx)}
.hero h1 em{font-style:italic;color:var(--g4)}
.hero-sub{font-size:15px;color:var(--tx3);line-height:1.6;max-width:340px;margin:0 auto;font-weight:400}

@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}

/* Problem Statement */
.problem{padding:40px 24px 0;animation:fadeUp .8s ease-out .15s both}
.problem-label{font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:var(--r4);font-weight:700;margin-bottom:20px}
.problem-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.problem-card{background:var(--s1);border:1px solid var(--bd);border-radius:16px;padding:20px 16px;text-align:center;position:relative;overflow:hidden}
.problem-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--r4),transparent);opacity:.4}
.problem-num{font-family:var(--serif);font-size:28px;font-weight:800;letter-spacing:-1px;margin-bottom:4px}
.problem-unit{font-size:12px;color:var(--tx3);font-weight:500;line-height:1.4}
.problem-full{grid-column:1/-1;background:linear-gradient(135deg,rgba(248,113,113,.06),rgba(248,113,113,.02));border-color:rgba(248,113,113,.15);padding:20px;text-align:left;display:flex;align-items:center;gap:16px}
.problem-full-icon{font-size:32px;min-width:40px;text-align:center}
.problem-full-text{font-size:14px;line-height:1.55;color:var(--tx2)}
.problem-full-text strong{color:var(--r4);font-weight:700}

/* Scan Area */
.scan-area{padding:36px 24px 0;animation:fadeUp .8s ease-out .3s both}
.scan-label{font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:var(--g4);font-weight:700;margin-bottom:16px}
.scan-tabs{display:flex;gap:4px;margin-bottom:16px;background:var(--s1);border-radius:14px;padding:4px;border:1px solid var(--bd)}
.scan-tab{flex:1;padding:11px 8px;border:none;border-radius:11px;font-family:var(--sans);font-size:13px;font-weight:600;cursor:pointer;transition:all .25s;background:transparent;color:var(--tx3)}
.scan-tab:hover{color:var(--tx2)}
.scan-tab.on{background:var(--g9);color:var(--g4);box-shadow:0 2px 8px rgba(22,101,52,.3)}
.scan-field{position:relative;margin-bottom:14px}
.scan-field input{width:100%;padding:18px 56px 18px 20px;background:var(--s1);border:1.5px solid var(--bd);border-radius:16px;color:var(--tx);font-family:var(--sans);font-size:16px;font-weight:400;outline:none;transition:all .25s}
.scan-field input::placeholder{color:var(--tx4);font-weight:400}
.scan-field input:focus{border-color:var(--g5);box-shadow:0 0 0 4px rgba(34,197,94,.08)}
.scan-go{position:absolute;right:8px;top:50%;transform:translateY(-50%);width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,var(--g6),var(--g8));border:none;color:white;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;transition:all .2s;box-shadow:0 2px 8px rgba(22,101,52,.3)}
.scan-go:hover{transform:translateY(-50%) scale(1.05);box-shadow:0 4px 16px rgba(22,101,52,.4)}
.scan-go:active{transform:translateY(-50%) scale(.95)}

/* Camera */
.cam-box{position:relative;width:100%;aspect-ratio:4/3;background:#000;border-radius:16px;overflow:hidden;margin-bottom:14px;border:1px solid var(--bd)}
.cam-vid{width:100%;height:100%;object-fit:cover}
.cam-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none}
.cam-region{width:260px;height:140px;border:2px solid rgba(74,222,128,.6);border-radius:14px;position:relative;box-shadow:0 0 0 9999px rgba(0,0,0,.5)}
.cam-line{position:absolute;left:10px;right:10px;height:2px;background:linear-gradient(90deg,transparent,var(--g4),transparent);top:50%;animation:camScan 2s ease-in-out infinite}
@keyframes camScan{0%,100%{top:15%}50%{top:85%}}
.cam-status{position:absolute;bottom:20px;left:0;right:0;text-align:center;font-size:13px;color:var(--g4);font-weight:500;animation:pulse 1.5s ease-in-out infinite}
.cam-close{position:absolute;top:12px;right:12px;width:36px;height:36px;border-radius:50%;background:rgba(0,0,0,.5);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.1);color:white;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;pointer-events:all;z-index:2}
.cam-err{padding:48px 24px;text-align:center;background:var(--s1);border-radius:16px;margin-bottom:14px;border:1px solid var(--bd)}
.cam-err p{color:var(--tx3);font-size:14px;line-height:1.6}
.cam-fallback{margin-top:16px;padding:11px 24px;background:var(--g8);border:1px solid var(--g7);border-radius:12px;color:var(--g4);font-family:var(--sans);font-weight:600;font-size:13px;cursor:pointer;transition:all .2s}

/* Quick Scans */
.quick{padding:36px 24px 0;animation:fadeUp .8s ease-out .4s both}
.quick-label{font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:var(--tx4);font-weight:700;margin-bottom:14px}
.quick-grid{display:flex;gap:8px;flex-wrap:wrap}
.quick-chip{padding:10px 18px;border-radius:24px;background:var(--s1);border:1px solid var(--bd);color:var(--tx2);font-size:13px;font-weight:500;cursor:pointer;transition:all .25s;font-family:var(--sans)}
.quick-chip:hover{background:var(--s2);border-color:var(--g7);color:var(--g4);transform:translateY(-1px);box-shadow:0 4px 12px rgba(22,101,52,.15)}

/* Facts */
.facts{padding:36px 24px 20px;animation:fadeUp .8s ease-out .5s both}
.facts-label{font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:var(--tx4);font-weight:700;margin-bottom:14px}
.fact-card{background:linear-gradient(135deg,var(--s1),var(--s2));border:1px solid var(--bd);border-radius:20px;padding:24px;position:relative;overflow:hidden}
.fact-card::before{content:'';position:absolute;top:0;right:0;width:120px;height:120px;background:radial-gradient(circle,rgba(74,222,128,.04),transparent);pointer-events:none}
.fact-icon{font-size:32px;margin-bottom:12px}
.fact-text{font-size:15px;line-height:1.65;color:var(--tx);font-weight:400}
.fact-src{font-size:12px;color:var(--tx4);margin-top:12px;font-style:italic;font-weight:400}
.fact-dots{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:16px}
.fact-dot{width:6px;height:6px;border-radius:50%;background:var(--bd2);transition:all .3s;cursor:pointer}
.fact-dot.on{background:var(--g5);width:22px;border-radius:4px}

/* Mission */
.mission{padding:0 24px 20px;animation:fadeUp .8s ease-out .6s both}
.mission-card{background:linear-gradient(135deg,rgba(201,168,76,.05),rgba(201,168,76,.02));border:1px solid rgba(201,168,76,.15);border-radius:20px;padding:28px 24px;text-align:center}
.mission-label{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--gold);font-weight:700;margin-bottom:12px}
.mission-text{font-family:var(--serif);font-size:18px;font-weight:400;line-height:1.6;color:var(--tx2);font-style:italic}

/* ===== RESULTS ===== */
.res-hero{padding:40px 24px 36px;text-align:center;border-radius:0 0 28px 28px;position:relative;overflow:hidden}
.res-hero::after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 80%,rgba(255,255,255,.03),transparent 60%)}
.res-pn{font-family:var(--serif);font-size:20px;font-weight:600;margin-bottom:4px;position:relative;z-index:1}
.res-br{font-size:13px;color:rgba(255,255,255,.5);margin-bottom:28px;position:relative;z-index:1;font-weight:400;letter-spacing:.3px}
.res-circle{width:156px;height:156px;border-radius:50%;margin:0 auto 12px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,.25);border:3px solid;position:relative;z-index:1;backdrop-filter:blur(4px)}
.res-num{font-family:var(--serif);font-size:54px;font-weight:800;line-height:1;letter-spacing:-2px}
.res-grade{font-family:var(--sans);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin-top:6px;opacity:.85}
.res-of{font-size:12px;opacity:.4;margin-top:2px;font-weight:400}

.rs{padding:0 24px;margin-bottom:28px}
.rs-title{font-family:var(--serif);font-size:18px;font-weight:600;margin-bottom:16px;letter-spacing:-.3px}

/* Cancer Banner */
.cr-banner{margin:28px 24px;padding:28px 24px;border-radius:20px;position:relative;overflow:hidden}
.cr-banner::before{content:'';position:absolute;inset:0;opacity:.08;background:repeating-linear-gradient(135deg,transparent,transparent 12px,rgba(255,255,255,.02) 12px,rgba(255,255,255,.02) 24px)}
.cr-eyebrow{font-size:10px;text-transform:uppercase;letter-spacing:2px;font-weight:700;margin-bottom:14px;position:relative}
.cr-level{font-family:var(--serif);font-size:34px;font-weight:800;letter-spacing:-1px;position:relative;margin-bottom:6px}
.cr-mult{font-size:14px;font-weight:600;position:relative;margin-bottom:16px;opacity:.75;letter-spacing:.3px}
.cr-bar{height:6px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden;margin-bottom:16px;position:relative}
.cr-fill{height:100%;border-radius:3px;transition:width 1.2s cubic-bezier(.22,1,.36,1)}
.cr-labels{display:flex;justify-content:space-between;font-size:9px;margin-top:4px;opacity:.4;position:relative;text-transform:uppercase;letter-spacing:1px;font-weight:600}
.cr-desc{font-size:14px;line-height:1.6;position:relative;opacity:.8;margin-top:4px}
.cr-warn{margin-top:16px;padding:14px 16px;background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.15);border-radius:14px;font-size:13px;line-height:1.55;color:rgba(248,113,113,.9);position:relative}

/* Effects */
.eff{background:var(--s1);border-radius:16px;padding:20px;margin-bottom:12px;border-left:3px solid;border-right:1px solid var(--bd);border-top:1px solid var(--bd);border-bottom:1px solid var(--bd)}
.eff-head{display:flex;align-items:center;gap:12px;margin-bottom:10px}
.eff-ic{font-size:22px}
.eff-tl{font-family:var(--sans);font-weight:700;font-size:14px;letter-spacing:-.2px}
.eff-sv{font-size:10px;font-weight:800;padding:3px 10px;border-radius:6px;margin-left:auto;letter-spacing:.5px;text-transform:uppercase}
.eff-desc{font-size:13px;color:var(--tx3);line-height:1.6}

/* Timeline */
.tl-c{padding:0 24px;margin-bottom:28px}
.tl-item{display:flex;gap:16px;padding:14px 0;position:relative}
.tl-line{width:1px;position:absolute;left:16px;top:40px;bottom:0;background:var(--bd)}
.tl-dot{width:34px;height:34px;min-width:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;position:relative;z-index:1;font-family:var(--sans);letter-spacing:-1px}
.tl-con{flex:1;padding-bottom:12px}
.tl-per{font-family:var(--sans);font-weight:700;font-size:13px;margin-bottom:3px;letter-spacing:-.2px}
.tl-desc{font-size:13px;color:var(--tx3);line-height:1.55}

/* Cards */
.card{background:var(--s1);border:1px solid var(--bd);border-radius:16px;padding:18px;margin-bottom:10px}
.card-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
.card-l{font-size:13px;font-weight:600}
.card-s{font-family:var(--serif);font-weight:700;font-size:18px}
.card-bar{height:5px;border-radius:3px;background:rgba(255,255,255,.06);overflow:hidden;margin-bottom:8px}
.card-fill{height:100%;border-radius:3px;transition:width .8s ease-out}
.card-d{font-size:12px;color:var(--tx4);line-height:1.45}

.mat-row{display:flex;align-items:center;gap:14px;padding:14px 0;border-bottom:1px solid var(--bd)}
.mat-row:last-child{border-bottom:none}
.mat-pct{font-family:var(--serif);font-weight:700;font-size:20px;min-width:52px;text-align:right}
.mat-info{flex:1}
.mat-name{font-weight:600;font-size:14px;text-transform:capitalize;letter-spacing:-.2px}
.mat-cat{font-size:11px;color:var(--tx4);text-transform:uppercase;letter-spacing:.5px;margin-top:2px}
.mat-badge{padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700}

.alt{background:var(--s1);border:1px solid var(--bd2);border-radius:16px;padding:18px;margin-bottom:10px;cursor:pointer;transition:all .25s}
.alt:hover{border-color:var(--g6);background:var(--s2);transform:translateY(-1px);box-shadow:0 4px 16px rgba(22,101,52,.1)}
.alt-n{font-weight:700;font-size:14px;color:var(--g4)}
.alt-b{font-size:12px;color:var(--tx4);margin-top:2px}
.alt-r{font-size:13px;margin-top:8px;line-height:1.5;color:var(--tx3)}

/* Wardrobe */
.w-hero{padding:36px 24px 28px;text-align:center}
.w-agg{width:116px;height:116px;border-radius:50%;margin:0 auto 14px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--s1);border:2px solid}
.w-an{font-family:var(--serif);font-size:38px;font-weight:800;line-height:1}
.w-al{font-size:10px;text-transform:uppercase;letter-spacing:1.5px;opacity:.6;margin-top:4px;font-weight:600}
.w-empty{text-align:center;padding:64px 24px;color:var(--tx3)}
.w-item{display:flex;align-items:center;gap:14px;padding:16px 24px;border-bottom:1px solid rgba(24,50,24,.4);cursor:pointer;transition:background .2s}
.w-item:hover{background:var(--s1)}
.w-is{width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-weight:800;font-size:17px}
.w-ii{flex:1}
.w-in{font-weight:600;font-size:14px;letter-spacing:-.2px}
.w-ib{font-size:12px;color:var(--tx4);margin-top:2px}
.w-ir{background:none;border:none;color:var(--tx4);cursor:pointer;font-size:16px;padding:6px;opacity:.4;transition:all .2s;border-radius:8px}
.w-ir:hover{opacity:1;color:var(--r4);background:rgba(248,113,113,.08)}
.streak{display:flex;gap:4px;margin:12px 0}
.streak-d{flex:1;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;letter-spacing:.3px;transition:all .2s}

/* Explore */
.ex-s{padding:20px 24px;position:sticky;top:52px;background:rgba(3,10,3,.9);backdrop-filter:blur(20px);z-index:10}
.ex-s input{width:100%;padding:15px 18px;background:var(--s1);border:1.5px solid var(--bd);border-radius:14px;color:var(--tx);font-family:var(--sans);font-size:15px;outline:none;font-weight:400}
.ex-s input:focus{border-color:var(--g5);box-shadow:0 0 0 4px rgba(34,197,94,.08)}
.ex-g{padding:0 24px;display:flex;flex-direction:column;gap:10px}
.ex-i{display:flex;align-items:center;gap:14px;padding:16px 18px;background:var(--s1);border:1px solid var(--bd);border-radius:14px;cursor:pointer;transition:all .25s}
.ex-i:hover{border-color:var(--g7);transform:translateY(-1px);box-shadow:0 4px 12px rgba(22,101,52,.08)}
.ex-sc{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-weight:800;font-size:15px}
.ex-ii{flex:1}
.ex-in{font-weight:600;font-size:13px;letter-spacing:-.2px}
.ex-id{font-size:11px;color:var(--tx4);margin-top:2px}

/* Learn */
.lrn{padding:24px}
.lrn-c{background:var(--s1);border:1px solid var(--bd);border-radius:20px;padding:24px;margin-bottom:16px}
.lrn-c h3{font-family:var(--serif);font-size:18px;font-weight:600;margin-bottom:12px}
.lrn-c p{font-size:14px;color:var(--tx3);line-height:1.6}
.ds{display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid var(--bd)}
.ds:last-child{border-bottom:none}
.ds-n{font-family:var(--serif);font-weight:800;font-size:24px;min-width:60px;text-align:center}
.ds-l{font-size:13px;color:var(--tx3)}

/* Nav */
.nav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:480px;z-index:100;background:rgba(3,10,3,.88);backdrop-filter:blur(24px) saturate(1.4);border-top:1px solid rgba(24,50,24,.5);display:flex;padding:6px 0 max(8px,env(safe-area-inset-bottom))}
.nav-i{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 4px;cursor:pointer;border:none;background:none;color:var(--tx4);font-family:var(--sans);font-size:10px;font-weight:600;transition:color .2s;letter-spacing:.3px}
.nav-i.on{color:var(--g4)}
.nav-ic{font-size:20px}

/* Misc */
.ld-c{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:100px 24px;gap:24px}
.ld-spin{width:44px;height:44px;border-radius:50%;border:2.5px solid var(--bd);border-top-color:var(--g4);animation:sp .8s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}
.ld-t{font-size:15px;color:var(--tx3);text-align:center;font-weight:400}
.ld-sub{font-size:13px;color:var(--g4);margin-top:4px;animation:pulse 1.5s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
.err-b{margin:24px;padding:24px;background:rgba(220,38,38,.06);border:1px solid rgba(220,38,38,.15);border-radius:16px;text-align:center}
.err-b p{font-size:14px;color:rgba(248,113,113,.8);margin-bottom:14px;line-height:1.5}
.err-btn{padding:12px 28px;background:var(--g8);border:1px solid var(--g7);border-radius:12px;color:var(--g4);font-family:var(--sans);font-weight:600;cursor:pointer;font-size:13px}
.bk-btn{background:none;border:none;color:var(--g4);font-family:var(--sans);font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;padding:0;letter-spacing:.3px}
.aw-btn{width:100%;padding:16px;margin-top:20px;background:linear-gradient(135deg,var(--g7),var(--g8));border:1px solid var(--g6);border-radius:14px;color:white;font-family:var(--sans);font-weight:700;font-size:15px;cursor:pointer;transition:all .25s;letter-spacing:.3px}
.aw-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(22,101,52,.25)}
.aw-done{background:var(--s1)!important;border-color:var(--bd2)!important;color:var(--g4)!important;cursor:default!important;transform:none!important;box-shadow:none!important}
.expand-hint{font-size:12px;color:var(--tx4);padding:4px 0;cursor:pointer;font-weight:500}
.section-toggle{cursor:pointer;display:flex;align-items:center;gap:8px}
.section-toggle .arrow{font-size:12px;color:var(--tx4);transition:transform .2s}
`;

// ====================== APP ======================
export default function CleanWearApp() {
  const [view, setView] = useState("scanner");
  const [scanMode, setScanMode] = useState("search");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState("");
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [score, setScore] = useState(null);
  const [wardrobe, setWardrobe] = useState([]);
  const [exFilter, setExFilter] = useState("");
  const [factIdx, setFactIdx] = useState(0);
  const [expanded, setExpanded] = useState(null);
  const [added, setAdded] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [camErr, setCamErr] = useState(null);
  const vidRef = useRef(null);
  const streamRef = useRef(null);
  const scanRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => { try { const s = localStorage.getItem("cw_wardrobe"); if (s) setWardrobe(JSON.parse(s)); } catch {} }, []);
  useEffect(() => { if (wardrobe.length > 0) localStorage.setItem("cw_wardrobe", JSON.stringify(wardrobe)); }, [wardrobe]);
  useEffect(() => { const i = setInterval(() => setFactIdx(x => (x + 1) % FUN_FACTS.length), 7000); return () => clearInterval(i); }, []);

  // Browser back button support
  useEffect(() => {
    const handlePop = () => {
      if (view === "results") { setView("scanner"); setResult(null); }
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [view]);

  // Push history state when entering results
  const navigateToResults = useCallback(() => {
    window.history.pushState({ view: "results" }, "");
    setView("results");
  }, []);

  const stopCam = useCallback(() => {
    if (scanRef.current) { clearInterval(scanRef.current); scanRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setCamOn(false);
  }, []);

  const doScan = useCallback(async (q, bc = false) => {
    if (!q?.trim()) return;
    setLoading(true); setError(null); setAdded(false);
    const isBc = bc || scanMode === "barcode" || scanMode === "camera";
    const steps = ["Searching product database…", "Analyzing material composition…", "Identifying chemical treatments…", "Evaluating cancer risk profile…", "Calculating safety score…"];
    let si = 0; setLoadStep(steps[0]);
    const iv = setInterval(() => { si = Math.min(si + 1, steps.length - 1); setLoadStep(steps[si]); }, 2200);
    try {
      const pd = await researchProduct(q, isBc); clearInterval(iv);
      setResult(pd); const sc2 = calculateScore(pd); setScore(sc2); navigateToResults();
      // Track scan
      if (window.posthog) window.posthog.capture('scan_completed', { query: q, score: sc2.overall, brand: pd.brand, product: pd.product_name });
      logScan({ query: q, score: sc2.overall, brand: pd.brand, product: pd.product_name, category: pd.category });
    } catch { clearInterval(iv); setError("Could not analyze this product. Try a more specific search."); }
    finally { setLoading(false); setLoadStep(""); }
  }, [scanMode, navigateToResults]);

  const startCam = useCallback(async () => {
    setCamErr(null); setCamOn(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } } });
      streamRef.current = s;
      if (vidRef.current) { vidRef.current.srcObject = s; await vidRef.current.play(); }

      // Use native BarcodeDetector if available, otherwise use polyfill (iPhone/Safari)
      const DetectorClass = ("BarcodeDetector" in window) ? window.BarcodeDetector : BarcodeDetectorPolyfill;
      try {
        const d = new DetectorClass({ formats: ["upc_a","upc_e","ean_13","ean_8","code_128","code_39"] });
        // Create offscreen canvas for frame capture
        if (!canvasRef.current) canvasRef.current = document.createElement("canvas");
        scanRef.current = setInterval(async () => {
          if (vidRef.current?.readyState >= 2) {
            try {
              // Draw video frame to canvas (needed for polyfill on some browsers)
              const v = vidRef.current;
              const c = canvasRef.current;
              c.width = v.videoWidth;
              c.height = v.videoHeight;
              c.getContext("2d").drawImage(v, 0, 0);
              const imgData = c.getContext("2d").getImageData(0, 0, c.width, c.height);
              const b = await d.detect(imgData);
              if (b.length) { stopCam(); setQuery(b[0].rawValue); doScan(b[0].rawValue, true); }
            } catch {}
          }
        }, 350);
      } catch { setCamErr("Barcode scanning not supported on this device. Enter barcode manually."); }
    } catch (e) { setCamOn(false); setCamErr(e.name === "NotAllowedError" ? "Camera access denied. Allow permissions and retry." : "Camera not available. Enter barcode manually."); }
  }, [stopCam, doScan]);

  useEffect(() => () => stopCam(), []);
  useEffect(() => { if (view !== "scanner") stopCam(); }, [view]);

  const addWard = useCallback(() => {
    if (!result || !score) return;
    setWardrobe(p => [{ id: Date.now(), name: result.product_name, brand: result.brand, category: result.category, score: score.overall, at: new Date().toISOString() }, ...p]);
    setAdded(true);
  }, [result, score]);

  const rmWard = useCallback((id) => {
    setWardrobe(p => { const u = p.filter(i => i.id !== id); if (!u.length) localStorage.removeItem("cw_wardrobe"); return u; });
  }, []);

  const avg = wardrobe.length ? Math.round(wardrobe.reduce((s, i) => s + i.score, 0) / wardrobe.length) : 0;

  // ========== SCANNER ==========
  const renderScanner = () => (
    <>
      {/* Brand Hero */}
      <div className="hero">
        <div className="hero-eyebrow">Textile Safety Intelligence</div>
        <h1>Your Clothes Are <em style={{fontFamily:'var(--sans)'}}>Quietly</em> Hurting You</h1>
        <div className="hero-sub">CleanWear scans your clothing for hidden carcinogens, endocrine disruptors, and toxic chemicals — so you can protect your body from what you wear every day.</div>
      </div>

      {/* The Problem */}
      <div className="problem">
        <div className="problem-label">The Problem No One Talks About</div>
        <div className="problem-grid">
          <div className="problem-card">
            <div className="problem-num" style={{ color: "var(--r4)" }}>120+</div>
            <div className="problem-unit">chemicals absorbed through clothing daily</div>
          </div>
          <div className="problem-card">
            <div className="problem-num" style={{ color: "var(--o4)" }}>30%</div>
            <div className="problem-unit">testosterone reduction linked to BPA in synthetics</div>
          </div>
          <div className="problem-card">
            <div className="problem-num" style={{ color: "var(--r4)" }}>80%</div>
            <div className="problem-unit">of human blood samples contain clothing microplastics</div>
          </div>
          <div className="problem-card">
            <div className="problem-num" style={{ color: "var(--o4)" }}>60%</div>
            <div className="problem-unit">of cotton clothing treated with formaldehyde</div>
          </div>
          <div className="problem-full">
            <div className="problem-full-icon">🧬</div>
            <div className="problem-full-text">
              Every time you sweat in synthetic workout gear, <strong>carcinogens leach directly through your skin</strong> at rates up to 15× higher than at rest. Your gym clothes may be the most toxic thing in your routine.
            </div>
          </div>
        </div>
      </div>

      {/* Scan */}
      <div className="scan-area">
        <div className="scan-label">Scan Your Clothing</div>
        <div className="scan-tabs">
          <button className={`scan-tab ${scanMode === "search" ? "on" : ""}`} onClick={() => { setScanMode("search"); stopCam(); }}>Search</button>
          <button className={`scan-tab ${scanMode === "barcode" ? "on" : ""}`} onClick={() => { setScanMode("barcode"); stopCam(); }}>Barcode</button>
          <button className={`scan-tab ${scanMode === "camera" ? "on" : ""}`} onClick={() => { setScanMode("camera"); startCam(); }}>Camera</button>
        </div>

        {scanMode === "camera" && (<>
          {camOn ? (
            <div className="cam-box">
              <video ref={vidRef} className="cam-vid" playsInline muted />
              <div className="cam-overlay">
                <div className="cam-region"><div className="cam-line" /></div>
                <button className="cam-close" onClick={stopCam}>✕</button>
                <div className="cam-status">Scanning for barcode…</div>
              </div>
            </div>
          ) : camErr ? (
            <div className="cam-err"><div style={{ fontSize: 28, marginBottom: 12, opacity: .6 }}>📷</div><p>{camErr}</p><button className="cam-fallback" onClick={() => setScanMode("barcode")}>Enter Manually</button></div>
          ) : <div className="cam-err"><p style={{ opacity: .5 }}>Initializing camera…</p></div>}
          <div className="scan-field">
            <input type="tel" placeholder="Or type barcode number…" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && doScan(query, true)} />
            <button className="scan-go" onClick={() => doScan(query, true)}>→</button>
          </div>
        </>)}

        {scanMode !== "camera" && (
          <div className="scan-field">
            <input type={scanMode === "barcode" ? "tel" : "text"} placeholder={scanMode === "barcode" ? "Enter UPC or EAN barcode…" : "Brand + product name…"} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && doScan(query)} />
            <button className="scan-go" onClick={() => doScan(query)}>→</button>
          </div>
        )}
      </div>

      {/* Quick Scans */}
      <div className="quick">
        <div className="quick-label">Popular Scans</div>
        <div className="quick-grid">
          {["Nike Dri-FIT Tee", "Lululemon Align Leggings", "Under Armour HeatGear", "Patagonia Organic Tee", "Calvin Klein Boxer Brief", "Gymshark Shorts"].map(item => (
            <button key={item} className="quick-chip" onClick={() => { setQuery(item); doScan(item); }}>{item}</button>
          ))}
        </div>
      </div>

      {/* Facts */}
      <div className="facts">
        <div className="facts-label">Research Spotlight</div>
        <div className="fact-card">
          <div className="fact-icon">{FUN_FACTS[factIdx].icon}</div>
          <div className="fact-text">{FUN_FACTS[factIdx].fact}</div>
          <div className="fact-src">{FUN_FACTS[factIdx].source}</div>
        </div>
        <div className="fact-dots">{FUN_FACTS.slice(0, 8).map((_, i) => <div key={i} className={`fact-dot ${i === factIdx % 8 ? "on" : ""}`} onClick={() => setFactIdx(i)} />)}</div>
      </div>

      {/* Mission */}
      <div className="mission">
        <div className="mission-card">
          <div className="mission-label">Our Mission</div>
          <div className="mission-text">"We believe you deserve to know what touches your skin. CleanWear brings radical transparency to the clothing industry — because the most important thing you wear shouldn't be ignorance."</div>
        </div>
      </div>
    </>
  );

  // ========== RESULTS ==========
  const renderResults = () => {
    if (!result || !score) return null;
    const s = score.overall, col = sc(s), grade = sg(s), tl = getTimeline(s), cr = getCancerRisk(s, score.detectedChemicals);
    const isIn = added || wardrobe.some(w => w.name === result.product_name && w.brand === result.brand);
    const ccn = score.detectedChemicals.filter(c => c.cancerLinked).length;
    const hr = s < 50;

    return (<>
      <div className="res-hero" style={{ background: sbg(s) }}>
        <div style={{ padding: "0 20px" }}><button className="bk-btn" onClick={() => window.history.back()} style={{ marginBottom: 20 }}>← Back</button></div>
        <div className="res-pn">{result.product_name}</div>
        <div className="res-br">{result.brand} · {result.category}</div>
        <div className="res-circle" style={{ borderColor: col }}>
          <div className="res-num" style={{ color: col }}>{s}</div>
          <div className="res-grade" style={{ color: col }}>{grade}</div>
          <div className="res-of">/100</div>
        </div>
      </div>

      <div className="cr-banner" style={{
        background: hr ? "linear-gradient(140deg, rgba(127,29,29,.45), rgba(83,20,20,.55))" : s < 75 ? "linear-gradient(140deg, rgba(113,63,18,.35), rgba(83,63,20,.45))" : "linear-gradient(140deg, rgba(20,83,45,.35), rgba(5,46,22,.45))",
        border: `1px solid ${cr.color}33`,
      }}>
        <div className="cr-eyebrow" style={{ color: cr.color }}>Cancer Risk Assessment</div>
        <div className="cr-level" style={{ color: cr.color }}>{cr.level} Risk</div>
        <div className="cr-mult" style={{ color: cr.color }}>{cr.mult} vs. baseline with daily wear</div>
        <div className="cr-bar"><div className="cr-fill" style={{ width: `${cr.w}%`, background: `linear-gradient(90deg, ${cr.color}66, ${cr.color})` }} /></div>
        <div className="cr-labels"><span>Baseline</span><span>Elevated</span><span>High</span></div>
        <div className="cr-desc">{cr.desc}</div>
        {ccn > 0 && hr && (
          <div className="cr-warn">⚠️ <strong>{ccn} carcinogenic compound{ccn !== 1 ? "s" : ""} detected.</strong> Chronic skin exposure — especially during exercise — significantly increases lifetime cancer risk.</div>
        )}
      </div>

      <div className="rs" style={{ marginTop: 28 }}><div className="rs-title">{hr ? "⚠️ What This Does To Your Body" : "Body Impact Timeline"}</div></div>
      <div className="tl-c">
        {tl.map((t, i) => (
          <div key={i} className="tl-item">
            {i < tl.length - 1 && <div className="tl-line" />}
            <div className="tl-dot" style={{ background: `${t.color}18`, color: t.color, border: `1.5px solid ${t.color}44` }}>{t.icon}</div>
            <div className="tl-con"><div className="tl-per" style={{ color: t.color }}>{t.period}</div><div className="tl-desc">{t.desc}</div></div>
          </div>
        ))}
      </div>

      {score.detectedChemicals.length > 0 && (
        <div className="rs">
          <div className="rs-title">Key Health Effects</div>
          {score.detectedChemicals.some(c => ["BPA/BPS","Phthalates"].includes(c.name)) && (
            <div className="eff" style={{ borderColor: "#fb923c" }}>
              <div className="eff-head"><div className="eff-ic">💪</div><div><div className="eff-tl">Testosterone & Hormone Disruption</div></div><div className="eff-sv" style={{ background: "rgba(251,146,60,.12)", color: "#fb923c" }}>High</div></div>
              <div className="eff-desc">Contains endocrine disruptors linked to testosterone reductions of up to 30%, decreased sperm quality, and thyroid disruption. Absorption rates increase 3–5× during exercise.</div>
            </div>
          )}
          {ccn > 0 && (
            <div className="eff" style={{ borderColor: "#f87171" }}>
              <div className="eff-head"><div className="eff-ic">🔬</div><div><div className="eff-tl">Cancer Risk Elevation</div></div><div className="eff-sv" style={{ background: "rgba(248,113,113,.12)", color: "#f87171" }}>Critical</div></div>
              <div className="eff-desc">{ccn} compound{ccn !== 1 ? "s" : ""} classified as known or probable carcinogen{ccn !== 1 ? "s" : ""}. Daily skin contact creates chronic low-dose exposure linked to cancer in breast tissue, liver, kidneys, and bladder.</div>
            </div>
          )}
          {score.detectedChemicals.some(c => c.name === "Microplastic Shedding") && (
            <div className="eff" style={{ borderColor: "#facc15" }}>
              <div className="eff-head"><div className="eff-ic">🩸</div><div><div className="eff-tl">Microplastic Accumulation</div></div><div className="eff-sv" style={{ background: "rgba(250,204,21,.12)", color: "#facc15" }}>Moderate</div></div>
              <div className="eff-desc">Continuously sheds plastic particles absorbed through skin into bloodstream. Found in human lungs, liver, kidneys, and placenta. Linked to inflammation and cellular damage.</div>
            </div>
          )}
        </div>
      )}

      {result.alternatives?.length > 0 && (
        <div className="rs"><div className="rs-title" style={{ color: "var(--g4)" }}>Safer Alternatives</div>
          {result.alternatives.map((a, i) => (
            <div key={i} className="alt" onClick={() => { setQuery(`${a.brand} ${a.name}`); doScan(`${a.brand} ${a.name}`); }}>
              <div className="alt-n">{a.name}</div><div className="alt-b">{a.brand}</div><div className="alt-r">{a.reason}</div>
            </div>
          ))}
        </div>
      )}

      <div className="rs">
        <div className="section-toggle" onClick={() => setExpanded(expanded === "bd" ? null : "bd")}>
          <div className="rs-title" style={{ marginBottom: 0 }}>Score Breakdown</div>
          <span className="arrow" style={{ transform: expanded === "bd" ? "rotate(90deg)" : "" }}>›</span>
        </div>
        {expanded === "bd" ? (
          <div style={{ marginTop: 16 }}>
            {[{ l: "Material Safety", s: score.materialScore, w: "60%", d: "Inherent safety of each material." }, { l: "Chemical Risk", s: score.chemicalScore, w: "15%", d: "Known toxic compounds." }, { l: "Certifications", s: score.certScore, w: "15%", d: "Third-party safety certs." }, { l: "Manufacturing", s: score.originScore, w: "10%", d: `Made in ${score.origin}.` }].map(x => (
              <div key={x.l} className="card">
                <div className="card-h"><div className="card-l">{x.l} <span style={{ fontSize: 11, color: "var(--tx4)", fontWeight: 400 }}>({x.w})</span></div><div className="card-s" style={{ color: sc(x.s) }}>{x.s}</div></div>
                <div className="card-bar"><div className="card-fill" style={{ width: `${x.s}%`, background: sc(x.s) }} /></div>
                <div className="card-d">{x.d}</div>
              </div>
            ))}
          </div>
        ) : <div className="expand-hint" onClick={() => setExpanded("bd")}>Tap to expand</div>}
      </div>

      <div className="rs">
        <div className="section-toggle" onClick={() => setExpanded(expanded === "mat" ? null : "mat")}>
          <div className="rs-title" style={{ marginBottom: 0 }}>Materials</div>
          <span className="arrow" style={{ transform: expanded === "mat" ? "rotate(90deg)" : "" }}>›</span>
        </div>
        {expanded === "mat" ? (
          <div style={{ marginTop: 12 }}>
            {score.materialBreakdown.map((m, i) => (
              <div key={i} className="mat-row">
                <div className="mat-pct" style={{ color: sc(m.score) }}>{m.percentage}%</div>
                <div className="mat-info"><div className="mat-name">{m.name}</div><div className="mat-cat">{m.category} · {m.risk} risk</div><div style={{ fontSize: 12, color: "var(--tx4)", marginTop: 4, lineHeight: 1.45 }}>{m.desc}</div></div>
                <div className="mat-badge" style={{ background: `${sc(m.score)}18`, color: sc(m.score) }}>{m.score}</div>
              </div>
            ))}
          </div>
        ) : <div className="expand-hint" onClick={() => setExpanded("mat")}>Tap to expand</div>}
      </div>

      {score.foundCerts.length > 0 && (
        <div className="rs"><div className="rs-title">Certifications</div>
          {score.foundCerts.map((c, i) => <div key={i} className="card" style={{ borderLeft: "2px solid var(--g5)" }}><div style={{ fontWeight: 700, fontSize: 13, color: "var(--g4)" }}>{c.name}</div><div style={{ fontSize: 12, color: "var(--tx4)", marginTop: 4 }}>{c.desc}</div></div>)}
        </div>
      )}

      <div className="rs"><button className={`aw-btn ${isIn ? "aw-done" : ""}`} onClick={isIn ? undefined : addWard}>{isIn ? "✓ In Your Wardrobe" : "+ Add to Wardrobe"}</button></div>
    </>);
  };

  // ========== WARDROBE ==========
  const renderWardrobe = () => (<>
    <div className="w-hero">
      <h1 style={{ fontFamily: "var(--serif)", fontSize: 24, fontWeight: 700, marginBottom: 20 }}>My Wardrobe</h1>
      {wardrobe.length > 0 && (<><div className="w-agg" style={{ borderColor: sc(avg) }}><div className="w-an" style={{ color: sc(avg) }}>{avg}</div><div className="w-al">Avg Score</div></div><p style={{ fontSize: 13, color: "var(--tx3)" }}>{wardrobe.length} item{wardrobe.length !== 1 ? "s" : ""} · {sg(avg)} overall</p></>)}
    </div>
    {!wardrobe.length ? <div className="w-empty"><div style={{ fontSize: 44, marginBottom: 16, opacity: .4 }}>👕</div><p style={{ fontSize: 15, marginBottom: 8, fontWeight: 500 }}>Your wardrobe is empty</p><p style={{ fontSize: 13 }}>Scan items to build your health profile.</p></div> : (<>
      <div style={{ padding: "0 24px", marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--tx4)", marginBottom: 8, letterSpacing: "1.5px", textTransform: "uppercase" }}>This Week</div>
        <div className="streak">{["M","T","W","T","F","S","S"].map((d, i) => { const h = wardrobe.some(w => new Date(w.at).getDay() === (i + 1) % 7); return <div key={i} className="streak-d" style={{ background: h ? "var(--s2)" : "var(--s1)", color: h ? "var(--g4)" : "var(--tx4)", border: `1px solid ${h ? "var(--g8)" : "var(--bd)"}` }}>{d}</div>; })}</div>
      </div>
      {wardrobe.map(w => (
        <div key={w.id} className="w-item" onClick={() => { setQuery(`${w.brand} ${w.name}`); doScan(`${w.brand} ${w.name}`); }}>
          <div className="w-is" style={{ background: `${sc(w.score)}14`, color: sc(w.score), border: `1px solid ${sc(w.score)}33` }}>{w.score}</div>
          <div className="w-ii"><div className="w-in">{w.name}</div><div className="w-ib">{w.brand} · {w.category}</div></div>
          <button className="w-ir" onClick={e => { e.stopPropagation(); rmWard(w.id); }}>✕</button>
        </div>
      ))}
    </>)}
  </>);

  const [exCat, setExCat] = useState("All");

  // ========== EXPLORE ==========
  const renderExplore = () => {
    const cats = ["All", ...new Set(EXPLORE_DB.map(i => i.cat))];
    const f = EXPLORE_DB.filter(i => {
      const matchCat = exCat === "All" || i.cat === exCat;
      const matchText = !exFilter || [i.name, i.brand, i.cat, i.materials].some(s => s.toLowerCase().includes(exFilter.toLowerCase()));
      return matchCat && matchText;
    });
    return (<>
      <div className="ex-s">
        <input placeholder="Search brands, products, materials…" value={exFilter} onChange={e => setExFilter(e.target.value)} />
        <div style={{ display: "flex", gap: 6, marginTop: 12, overflowX: "auto", paddingBottom: 4 }}>
          {cats.map(c => (
            <button key={c} onClick={() => setExCat(c)} style={{
              padding: "7px 16px", borderRadius: 20, border: `1px solid ${exCat === c ? "var(--g6)" : "var(--bd)"}`,
              background: exCat === c ? "var(--g9)" : "var(--s1)", color: exCat === c ? "var(--g4)" : "var(--tx3)",
              fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", transition: "all .2s"
            }}>{c}</button>
          ))}
        </div>
      </div>
      <div style={{ padding: "14px 24px 8px" }}>
        <div style={{ fontSize: 11, color: "var(--tx4)", fontWeight: 600, letterSpacing: ".5px" }}>{f.length} PRODUCTS · TAP TO SCAN</div>
      </div>
      <div className="ex-g">{f.map((item, i) => (
        <div key={i} className="ex-i" onClick={() => { setQuery(`${item.brand} ${item.name}`); doScan(`${item.brand} ${item.name}`); }}>
          <div className="ex-sc" style={{ background: `${sc(item.score)}14`, color: sc(item.score), border: `1px solid ${sc(item.score)}33` }}>{item.score}</div>
          <div className="ex-ii"><div className="ex-in">{item.brand} {item.name}</div><div className="ex-id">{item.materials}</div></div>
          <div style={{ fontSize: 10, color: "var(--tx4)", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 600 }}>{item.cat}</div>
        </div>
      ))}</div>
    </>);
  };

  // ========== LEARN ==========
  const renderLearn = () => (
    <div className="lrn">
      <h2 style={{ fontFamily: "var(--serif)", fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Learn</h2>
      <div className="lrn-c" style={{ borderLeft: "2px solid var(--g5)" }}>
        <h3>Weekly Digest</h3>
        {wardrobe.length > 0 ? (<>
          <div className="ds"><div className="ds-n" style={{ color: sc(avg) }}>{avg}</div><div className="ds-l">Average wardrobe safety score</div></div>
          <div className="ds"><div className="ds-n">{wardrobe.length}</div><div className="ds-l">Items scanned</div></div>
          <div className="ds"><div className="ds-n" style={{ color: "var(--r4)" }}>{wardrobe.filter(w => w.score < 40).length}</div><div className="ds-l">High-risk items</div></div>
          <div className="ds"><div className="ds-n" style={{ color: "var(--g4)" }}>{wardrobe.filter(w => w.score >= 70).length}</div><div className="ds-l">Safe items</div></div>
          <p style={{ fontSize: 13, color: "var(--tx4)", marginTop: 14, lineHeight: 1.6 }}>Replace your highest-contact, lowest-score items first — underwear and gym shirts create the most chemical exposure.</p>
        </>) : <p>Scan items to get your personalized weekly digest.</p>}
      </div>
      <div className="lrn-c"><h3>Chemical Reference</h3><p style={{ marginBottom: 4 }}>Tap to expand.</p>
        {Object.entries(CHEMICAL_RISKS).map(([k, c]) => (
          <div key={k} style={{ padding: "14px 0", borderBottom: "1px solid var(--bd)", cursor: "pointer" }} onClick={() => setExpanded(expanded === k ? null : k)}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>{c.icon}</span><span style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</span>
              {c.cancerLinked && <span style={{ fontSize: 9, color: "var(--r4)", fontWeight: 800, background: "rgba(248,113,113,.1)", padding: "2px 8px", borderRadius: 4, letterSpacing: ".5px" }}>CARCINOGEN</span>}
            </div>
            {expanded === k && <div style={{ marginTop: 10, fontSize: 13, color: "var(--tx3)", lineHeight: 1.6 }}>{c.desc}<div style={{ marginTop: 6, fontSize: 12, color: "var(--tx4)", fontStyle: "italic" }}>⏱ {c.timeline}</div></div>}
          </div>
        ))}
      </div>
      <div className="lrn-c"><h3>Material Rankings</h3><p style={{ marginBottom: 14 }}>Safest to most concerning:</p>
        {Object.entries(MATERIAL_DB).sort((a, b) => b[1].score - a[1].score).slice(0, 10).map(([n, d], i) => (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: "1px solid var(--bd)" }}>
            <div style={{ fontFamily: "var(--serif)", fontWeight: 800, fontSize: 16, color: "var(--tx4)", minWidth: 24 }}>{i + 1}</div>
            <div style={{ flex: 1, textTransform: "capitalize", fontSize: 13, fontWeight: 600 }}>{n}</div>
            <div style={{ fontFamily: "var(--serif)", fontWeight: 700, color: sc(d.score) }}>{d.score}</div>
          </div>
        ))}
      </div>
      <div className="lrn-c"><h3>Research Library</h3>
        {FUN_FACTS.map((f, i) => (
          <div key={i} style={{ padding: "14px 0", borderBottom: i < FUN_FACTS.length - 1 ? "1px solid var(--bd)" : "none" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}><span style={{ fontSize: 20, minWidth: 28 }}>{f.icon}</span><div><div style={{ fontSize: 14, lineHeight: 1.6 }}>{f.fact}</div><div style={{ fontSize: 11, color: "var(--tx4)", marginTop: 6, fontStyle: "italic" }}>{f.source}</div></div></div>
          </div>
        ))}
      </div>
    </div>
  );

  // ========== SHELL ==========
  return (<>
    <style>{CSS}</style>
    <div className="app">
      <div className="hdr">
        <div className="hdr-logo">Clean<em>Wear</em></div>
        <div className="hdr-badge">{wardrobe.length > 0 && <><span style={{ color: sc(avg), marginRight: 4 }}>●</span>{avg} avg · </>}{wardrobe.length} items</div>
      </div>
      <div className="cnt">
        {loading ? <div className="ld-c"><div className="ld-spin" /><div><div className="ld-t">Analyzing product safety</div><div className="ld-sub">{loadStep}</div></div></div> : (<>
          {error && <div className="err-b"><p>{error}</p><button className="err-btn" onClick={() => { setError(null); setView("scanner"); }}>Try Again</button></div>}
          {view === "scanner" && renderScanner()}
          {view === "results" && renderResults()}
          {view === "wardrobe" && renderWardrobe()}
          {view === "explore" && renderExplore()}
          {view === "learn" && renderLearn()}
        </>)}
      </div>
      <div className="nav">
        {[{ id: "scanner", ic: "◎", l: "SCAN" }, { id: "wardrobe", ic: "▣", l: "WARDROBE" }, { id: "explore", ic: "◈", l: "EXPLORE" }, { id: "learn", ic: "◉", l: "LEARN" }].map(n => (
          <button key={n.id} className={`nav-i ${view === n.id || (view === "results" && n.id === "scanner") ? "on" : ""}`} onClick={() => { setView(n.id); setExpanded(null); }}><span className="nav-ic">{n.ic}</span>{n.l}</button>
        ))}
      </div>
    </div>
  </>);
}
