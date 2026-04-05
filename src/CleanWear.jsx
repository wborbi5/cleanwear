import { useState, useEffect, useCallback, useRef } from "react";
import { logScan, addToWardrobe, fetchWardrobe, removeFromWardrobe } from "./supabase.js";
import { BarcodeDetector as BarcodeDetectorPolyfill } from "barcode-detector";
import * as analytics from "./analytics.js";
import BrandExplore from "./BrandExplore.jsx";
import CameraScanner from "./CameraScanner.jsx";
import { calculateScore as calculateScoreV2 } from "./scoringEngine.js";
import { BRAND_BY_NAME } from "./brandDatabase.js";
import ResultsPage from "./ResultsPage.jsx";
import CertifyPage from "./CertifyPage.jsx";
import { useAuth } from "./contexts/AuthContext.jsx";
import AuthModal from "./components/AuthModal.jsx";
import { InlineSignIn } from "./components/AuthModal.jsx";
import PWAInstallBanner from "./components/PWAInstallBanner.jsx";
import ShareCard from "./components/ShareCard.jsx";
import ScanLimitModal from "./components/ScanLimitModal.jsx";
import { canScan, incrementScanCount, addScanCredit, getScanStatus } from "./utils/scanCredits.js";

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
  bpa: { name: "BPA/BPS", severity: 35, icon: "\u26a0\ufe0f", desc: "Endocrine disruptor linked to hormonal imbalance, reduced testosterone, reproductive issues, and increased cancer risk.", timeline: "Effects begin accumulating within weeks of daily skin exposure.", cancerLinked: true },
  pfas: { name: "PFAS (Forever Chemicals)", severity: 40, icon: "\u2620\ufe0f", desc: "Virtually indestructible chemicals linked to cancer, thyroid disease, immune suppression, and reproductive harm.", timeline: "Bioaccumulates over years. Half-life in body: 2-8 years.", cancerLinked: true },
  formaldehyde: { name: "Formaldehyde Resins", severity: 30, icon: "\ud83e\uddea", desc: "Known carcinogen used for wrinkle resistance. Linked to nasopharyngeal cancer.", timeline: "Cancer risk increases with chronic long-term exposure.", cancerLinked: true },
  phthalates: { name: "Phthalates", severity: 28, icon: "\u26a0\ufe0f", desc: "Plasticizers that disrupt hormones. Linked to reduced testosterone and fertility issues.", timeline: "Hormonal effects manifest within months of regular exposure.", cancerLinked: false },
  azo_dyes: { name: "Azo Dyes", severity: 22, icon: "\ud83c\udfa8", desc: "Release carcinogenic aromatic amines. Banned in EU but still used globally.", timeline: "Carcinogenic compounds released with sweat and friction.", cancerLinked: true },
  antimony: { name: "Antimony Trioxide", severity: 25, icon: "\u2697\ufe0f", desc: "Catalyst in polyester production. Classified as possibly carcinogenic.", timeline: "Increased leaching during exercise when body temperature rises.", cancerLinked: true },
  heavy_metals: { name: "Heavy Metals in Dyes", severity: 30, icon: "\ud83d\udd2c", desc: "Lead, chromium, cadmium in textile dyes. Accumulate in organs.", timeline: "Organ damage is cumulative and often irreversible.", cancerLinked: true },
  microplastics: { name: "Microplastic Shedding", severity: 18, icon: "\ud83d\udd0d", desc: "Synthetic fabrics shed microscopic plastic particles absorbed through skin.", timeline: "Microplastics detected in human bloodstream within days.", cancerLinked: false },
};

const CERTIFICATIONS = {
  "oeko-tex": { name: "OEKO-TEX Standard 100", bonus: 15, desc: "Tested for harmful substances at every stage of production." },
  "gots": { name: "GOTS Certified", bonus: 15, desc: "Global Organic Textile Standard \u2014 organic fibers, strict chemical limits." },
  "bluesign": { name: "bluesign\u00ae Approved", bonus: 12, desc: "Ensures safe chemical management throughout supply chain." },
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
  { icon: "\ud83e\uddec", fact: "A single polyester gym shirt releases up to 1,900 microplastic fibers per wash \u2014 fibers that end up in your bloodstream.", source: "Environmental Science & Technology, 2023" },
  { icon: "\ud83c\udf21\ufe0f", fact: "BPA in synthetic clothing leaches 15x faster during exercise when skin temperature exceeds 37\u00b0C.", source: "Journal of Dermatological Science" },
  { icon: "\ud83d\udcaa", fact: "Men exposed to high BPA levels showed testosterone levels 30% lower than those with minimal exposure.", source: "Reproductive Toxicology, 2022" },
  { icon: "\ud83d\udc55", fact: "The average person absorbs up to 120 different chemicals through their clothing every single day.", source: "Stockholm University Research" },
  { icon: "\ud83c\udfc3", fact: "Athletic wear is the highest-risk clothing category \u2014 sweat, heat, and friction all accelerate chemical leaching into your body.", source: "Textile Research Journal" },
  { icon: "\ud83e\uddea", fact: "Formaldehyde \u2014 the chemical used to preserve lab specimens \u2014 is used in 60% of cotton clothing for wrinkle resistance.", source: "Government Accountability Office" },
  { icon: "\ud83c\udf0d", fact: "PFAS 'forever chemicals' in waterproof activewear take over 1,000 years to break down. They never leave your body.", source: "Environmental Health Perspectives" },
  { icon: "\ud83d\udd2c", fact: "Microplastics from synthetic clothing were found in 80% of human blood samples tested in a landmark 2022 study.", source: "Environment International, 2022" },
  { icon: "\ud83c\udfcb\ufe0f", fact: "Nylon-spandex compression wear creates the highest chemical absorption rate of any clothing type through sustained skin contact.", source: "Journal of Exposure Science" },
  { icon: "\ud83e\uddf4", fact: "Anti-odor treatments on athletic wear contain nanosilver particles that accumulate in your liver and kidneys over time.", source: "Nanotoxicology Research" },
];

function calculateScore(pd) {
  // Legacy scoring (material DB + chemical penalties) for backward compat
  let ms = 0, tw = 0; const mb = [];
  if (pd.materials?.length > 0) {
    pd.materials.forEach(m => {
      const k = (typeof m === "string" ? m : m.name || "").toLowerCase().trim();
      const d = MATERIAL_DB[k] || Object.entries(MATERIAL_DB).find(([x]) => k.includes(x))?.[1];
      const p = (typeof m === "string" ? 100 : m.percentage || 100) / 100, s = d ? d.score : 50;
      ms += s * p; tw += p;
      mb.push({ name: typeof m === "string" ? m : m.name, percentage: typeof m === "string" ? 100 : m.percentage, score: s, category: d?.category || "unknown", risk: d?.risk || "unknown", desc: d?.desc || "Insufficient data." });
    });
    if (tw > 0) ms /= tw;
  } else ms = 50;
  let cp = 0; const dc = [];
  pd.chemicals?.forEach(c => { const id = typeof c === "string" ? c : c?.id; const r = CHEMICAL_RISKS[id]; if (r) { cp += r.severity; dc.push(r); } });
  const cs = Math.max(0, 100 - cp);
  let ct = 40; const fc = [];
  pd.certifications?.forEach(c => { const d = CERTIFICATIONS[c]; if (d) { ct += d.bonus; fc.push(d); } });
  ct = Math.min(100, ct);
  let os = 50;
  if (pd.origin) { const k = pd.origin.toLowerCase(); os = COUNTRY_SCORES[k] || Object.entries(COUNTRY_SCORES).find(([x]) => k.includes(x))?.[1] || 50; }
  const f = Math.round(ms * 0.60 + cs * 0.15 + ct * 0.15 + os * 0.10);

  // V2 scoring engine — citation-based, attached for new ResultsPage
  const brandKey = (pd.brand || "").toLowerCase().trim();
  const brand = BRAND_BY_NAME[brandKey] || null;
  const v2 = calculateScoreV2(pd, brand);

  return {
    overall: v2 ? v2.score : Math.max(0, Math.min(100, f)),
    materialScore: Math.round(ms), chemicalScore: Math.round(cs), certScore: Math.round(ct), originScore: Math.round(os),
    materialBreakdown: mb, detectedChemicals: dc, foundCerts: fc, origin: pd.origin || "Unknown",
    // V2 scoring data for new results page
    v2: v2 || null,
  };
}

function sc(s) { if (s >= 75) return "#16a34a"; if (s >= 60) return "#65a30d"; if (s >= 45) return "#ca8a04"; if (s >= 30) return "#ea580c"; return "#dc2626"; }
function sg(s) { if (s >= 80) return "Excellent"; if (s >= 65) return "Good"; if (s >= 50) return "Mediocre"; if (s >= 35) return "Poor"; return "Bad"; }

async function researchProduct(q, bc = false) {
  const r = await fetch("/api/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: q, isBarcode: bc }) });
  const data = await r.json();
  if (data.error) throw new Error(data.error);
  if (!data.product_name) throw new Error("Invalid response");
  return data;
}

const EXPLORE_DB = [
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
  { name: "Organic Boxer Briefs", brand: "Pact", score: 91, materials: "95% Organic Cotton, 5% Spandex", cat: "Underwear" },
  { name: "ExOfficio Boxer", brand: "ExOfficio", score: 33, materials: "94% Nylon, 6% Spandex", cat: "Underwear" },
  { name: "Classic Boxer Brief", brand: "Calvin Klein", score: 62, materials: "92% Cotton, 8% Elastane", cat: "Underwear" },
  { name: "Performance Boxer", brand: "Saxx", score: 34, materials: "95% Polyester, 5% Elastane", cat: "Underwear" },
  { name: "Organic Bralette", brand: "Pact", score: 90, materials: "95% Organic Cotton, 5% Spandex", cat: "Underwear" },
  { name: "Seamless Thong", brand: "Victoria's Secret", score: 35, materials: "82% Nylon, 18% Elastane", cat: "Underwear" },
  { name: "Organic Pajama Set", brand: "Coyuchi", score: 93, materials: "100% Organic Cotton", cat: "Sleepwear" },
  { name: "Bamboo Sleep Set", brand: "Cozy Earth", score: 78, materials: "95% Bamboo Viscose, 5% Spandex", cat: "Sleepwear" },
  { name: "Satin Pajamas", brand: "Victoria's Secret", score: 38, materials: "100% Polyester Satin", cat: "Sleepwear" },
  { name: "Flannel PJ Pants", brand: "L.L.Bean", score: 72, materials: "100% Cotton Flannel", cat: "Sleepwear" },
  { name: "Nano Puff Jacket", brand: "Patagonia", score: 45, materials: "100% Recycled Polyester, PFC-free DWR", cat: "Outerwear" },
  { name: "Thermoball Jacket", brand: "The North Face", score: 36, materials: "100% Nylon, Polyester insulation", cat: "Outerwear" },
  { name: "Rain Jacket", brand: "Arc'teryx", score: 38, materials: "100% Nylon, Gore-Tex membrane", cat: "Outerwear" },
  { name: "Wool Overcoat", brand: "J.Crew", score: 82, materials: "80% Wool, 20% Nylon", cat: "Outerwear" },
  { name: "Kids Organic Onesie", brand: "Burt's Bees Baby", score: 92, materials: "100% Organic Cotton", cat: "Kids" },
  { name: "Kids Dri-FIT Tee", brand: "Nike", score: 33, materials: "100% Polyester", cat: "Kids" },
  { name: "Toddler Leggings", brand: "Cat & Jack", score: 58, materials: "57% Cotton, 38% Polyester, 5% Spandex", cat: "Kids" },
  { name: "Baby Bodysuit 5-Pack", brand: "Carter's", score: 63, materials: "100% Cotton", cat: "Kids" },
];


const CSS = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,500&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0}:root{--g1:#f0fdf4;--g2:#bbf7d0;--g3:#86efac;--g4:#4ade80;--g5:#22c55e;--g6:#16a34a;--g7:#15803d;--g8:#166534;--g9:#14532d;--g10:#052e16;--r4:#f87171;--r5:#ef4444;--r6:#dc2626;--a4:#facc15;--o4:#fb923c;--bg:#fafaf7;--s1:#ffffff;--s2:#f6f9f4;--s3:#eef4ee;--bd:#e2e8e0;--bd2:#d4dcd2;--tx:#1a2e1a;--tx2:#3a5c3a;--tx3:#666666;--tx4:#999999;--serif:'Playfair Display',Georgia,serif;--sans:'Plus Jakarta Sans','Helvetica Neue',sans-serif;--gold:#92400e;--gold2:#78350f}.app{font-family:var(--sans);background:var(--bg);color:var(--tx);min-height:100vh;width:100%;margin:0 auto;position:relative;overflow-x:hidden}.app::before{content:'';position:fixed;top:-100px;left:50%;transform:translateX(-50%);width:600px;height:600px;background:radial-gradient(circle,rgba(22,101,52,.04) 0%,rgba(22,101,52,.02) 40%,transparent 70%);pointer-events:none;z-index:0}.app::after{content:'';position:fixed;bottom:0;left:0;right:0;height:200px;background:linear-gradient(to top,var(--bg),transparent);pointer-events:none;z-index:90}.hdr{padding:18px 24px 14px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50;background:rgba(250,250,247,0.92);backdrop-filter:blur(24px) saturate(1.3);border-bottom:1px solid #e2e8e0}.hdr-logo{font-family:var(--serif);font-weight:700;font-size:20px;color:var(--tx);letter-spacing:-.3px}.hdr-logo em{font-style:italic;color:var(--g6);font-weight:500}.hdr-badge{font-size:11px;color:var(--tx3);font-weight:500;letter-spacing:.3px}.cnt{padding:0 0 110px;position:relative;z-index:1}.hero{padding:48px 24px 0;text-align:center;animation:fadeUp .8s ease-out both}.hero-eyebrow{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--gold);font-weight:600;margin-bottom:16px}.hero h1{font-family:var(--serif);font-size:32px;font-weight:700;line-height:1.2;letter-spacing:-.5px;margin-bottom:12px;color:var(--tx)}.hero h1 em{font-style:italic;color:var(--g6)}.hero-sub{font-size:15px;color:var(--tx3);line-height:1.6;max-width:340px;margin:0 auto;font-weight:400}@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}.problem{padding:40px 24px 0;animation:fadeUp .8s ease-out .15s both}.problem-label{font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:var(--r4);font-weight:700;margin-bottom:20px}.problem-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.problem-card{background:var(--s1);border:1px solid var(--bd);border-radius:16px;padding:20px 16px;text-align:center;position:relative;overflow:hidden}.problem-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--r4),transparent);opacity:.4}.problem-num{font-family:var(--serif);font-size:28px;font-weight:800;letter-spacing:-1px;margin-bottom:4px}.problem-unit{font-size:12px;color:var(--tx3);font-weight:500;line-height:1.4}.problem-full{grid-column:1/-1;background:linear-gradient(135deg,rgba(248,113,113,.06),rgba(248,113,113,.03));border-color:rgba(248,113,113,.2);padding:20px;text-align:left;display:flex;align-items:center;gap:16px}.problem-full-icon{font-size:32px;min-width:40px;text-align:center}.problem-full-text{font-size:14px;line-height:1.55;color:var(--tx2)}.problem-full-text strong{color:var(--r4);font-weight:700}.scan-area{padding:36px 24px 0;animation:fadeUp .8s ease-out .3s both}.scan-label{font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:var(--g6);font-weight:700;margin-bottom:16px}.scan-tabs{display:flex;gap:4px;margin-bottom:16px;background:var(--s1);border-radius:14px;padding:4px;border:1px solid var(--bd)}.scan-tab{flex:1;padding:11px 8px;border:none;border-radius:11px;font-family:var(--sans);font-size:13px;font-weight:600;cursor:pointer;transition:all .25s;background:transparent;color:var(--tx3)}.scan-tab:hover{color:var(--tx2)}.scan-tab.on{background:var(--g5);color:#fff;box-shadow:0 2px 8px rgba(22,101,52,.2)}.scan-field{position:relative;margin-bottom:14px}.scan-field input{width:100%;padding:18px 56px 18px 20px;background:var(--s1);border:1.5px solid var(--bd);border-radius:16px;color:var(--tx);font-family:var(--sans);font-size:16px;font-weight:400;outline:none;transition:all .25s}.scan-field input::placeholder{color:var(--tx4);font-weight:400}.scan-field input:focus{border-color:var(--g5);box-shadow:0 0 0 4px rgba(34,197,94,.08)}.scan-go{position:absolute;right:8px;top:50%;transform:translateY(-50%);width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,var(--g6),var(--g8));border:none;color:white;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;transition:all .2s;box-shadow:0 2px 8px rgba(22,101,52,.3)}.scan-go:hover{transform:translateY(-50%) scale(1.05);box-shadow:0 4px 16px rgba(22,101,52,.4)}.scan-go:active{transform:translateY(-50%) scale(.95)}.cam-box{position:relative;width:100%;aspect-ratio:4/3;background:#000;border-radius:16px;overflow:hidden;margin-bottom:14px;border:1px solid var(--bd)}.cam-vid{width:100%;height:100%;object-fit:cover}.cam-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none}.cam-region{width:260px;height:140px;border:2px solid rgba(74,222,128,.6);border-radius:14px;position:relative;box-shadow:0 0 0 9999px rgba(0,0,0,.5)}.cam-line{position:absolute;left:10px;right:10px;height:2px;background:linear-gradient(90deg,transparent,var(--g4),transparent);top:50%;animation:camScan 2s ease-in-out infinite}@keyframes camScan{0%,100%{top:15%}50%{top:85%}}.cam-status{position:absolute;bottom:20px;left:0;right:0;text-align:center;font-size:13px;color:var(--g6);font-weight:500;animation:pulse 1.5s ease-in-out infinite}.cam-close{position:absolute;top:12px;right:12px;width:36px;height:36px;border-radius:50%;background:rgba(0,0,0,.5);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.1);color:white;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;pointer-events:all;z-index:2}.cam-err{padding:48px 24px;text-align:center;background:var(--s1);border-radius:16px;margin-bottom:14px;border:1px solid var(--bd)}.cam-err p{color:var(--tx3);font-size:14px;line-height:1.6}.cam-fallback{margin-top:16px;padding:11px 24px;background:var(--g8);border:1px solid var(--g7);border-radius:12px;color:#fff;font-family:var(--sans);font-weight:600;font-size:13px;cursor:pointer;transition:all .2s}.quick{padding:36px 24px 0;animation:fadeUp .8s ease-out .4s both}.quick-label{font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:var(--tx4);font-weight:700;margin-bottom:14px}.quick-grid{display:flex;gap:8px;flex-wrap:wrap}.quick-chip{padding:10px 18px;border-radius:24px;background:var(--s1);border:1px solid var(--bd);color:var(--tx2);font-size:13px;font-weight:500;cursor:pointer;transition:all .25s;font-family:var(--sans)}.quick-chip:hover{background:#eef4ee;border-color:var(--g6);color:var(--g7);transform:translateY(-1px);box-shadow:0 4px 12px rgba(22,101,52,.08)}.facts{padding:36px 24px 20px;animation:fadeUp .8s ease-out .5s both}.facts-label{font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:var(--tx4);font-weight:700;margin-bottom:14px}.fact-card{background:#fff;border:1px solid var(--bd);border-radius:20px;padding:24px;position:relative;overflow:hidden}.fact-card::before{content:'';position:absolute;top:0;right:0;width:120px;height:120px;background:radial-gradient(circle,rgba(22,101,52,.04),transparent);pointer-events:none}.fact-icon{font-size:32px;margin-bottom:12px}.fact-text{font-size:15px;line-height:1.65;color:var(--tx);font-weight:400}.fact-src{font-size:12px;color:var(--tx4);margin-top:12px;font-style:italic;font-weight:400}.fact-dots{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:16px}.fact-dot{width:6px;height:6px;border-radius:50%;background:var(--bd2);transition:all .3s;cursor:pointer}.fact-dot.on{background:var(--g5);width:22px;border-radius:4px}.mission{padding:0 24px 20px;animation:fadeUp .8s ease-out .6s both}.mission-card{background:linear-gradient(135deg,rgba(201,168,76,.06),rgba(201,168,76,.03));border:1px solid rgba(201,168,76,.2);border-radius:20px;padding:28px 24px;text-align:center}.mission-label{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--gold);font-weight:700;margin-bottom:12px}.mission-text{font-family:var(--serif);font-size:18px;font-weight:400;line-height:1.6;color:var(--tx2);font-style:italic}.res-hero{padding:40px 24px 36px;text-align:center;border-radius:0 0 28px 28px;position:relative;overflow:hidden}.res-hero::after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 80%,rgba(255,255,255,.03),transparent 60%)}.res-pn{font-family:var(--serif);font-size:20px;font-weight:600;margin-bottom:4px;position:relative;z-index:1}.res-br{font-size:13px;color:rgba(255,255,255,.5);margin-bottom:28px;position:relative;z-index:1;font-weight:400;letter-spacing:.3px}.res-circle{width:156px;height:156px;border-radius:50%;margin:0 auto 12px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,.25);border:3px solid;position:relative;z-index:1;backdrop-filter:blur(4px)}.res-num{font-family:var(--serif);font-size:54px;font-weight:800;line-height:1;letter-spacing:-2px}.res-grade{font-family:var(--sans);font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin-top:6px;opacity:.85}.res-of{font-size:12px;opacity:.4;margin-top:2px;font-weight:400}.rs{padding:0 24px;margin-bottom:28px}.rs-title{font-family:var(--serif);font-size:18px;font-weight:600;margin-bottom:16px;letter-spacing:-.3px}.cr-banner{margin:28px 24px;padding:28px 24px;border-radius:20px;position:relative;overflow:hidden}.cr-banner::before{content:'';position:absolute;inset:0;opacity:.08;background:repeating-linear-gradient(135deg,transparent,transparent 12px,rgba(255,255,255,.02) 12px,rgba(255,255,255,.02) 24px)}.cr-eyebrow{font-size:10px;text-transform:uppercase;letter-spacing:2px;font-weight:700;margin-bottom:14px;position:relative}.cr-level{font-family:var(--serif);font-size:34px;font-weight:800;letter-spacing:-1px;position:relative;margin-bottom:6px}.cr-mult{font-size:14px;font-weight:600;position:relative;margin-bottom:16px;opacity:.75;letter-spacing:.3px}.cr-bar{height:6px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden;margin-bottom:16px;position:relative}.cr-fill{height:100%;border-radius:3px;transition:width 1.2s cubic-bezier(.22,1,.36,1)}.cr-labels{display:flex;justify-content:space-between;font-size:9px;margin-top:4px;opacity:.4;position:relative;text-transform:uppercase;letter-spacing:1px;font-weight:600}.cr-desc{font-size:14px;line-height:1.6;position:relative;opacity:.8;margin-top:4px}.cr-warn{margin-top:16px;padding:14px 16px;background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.15);border-radius:14px;font-size:13px;line-height:1.55;color:rgba(248,113,113,.9);position:relative}.eff{background:var(--s1);border-radius:16px;padding:20px;margin-bottom:12px;border-left:3px solid;border-right:1px solid var(--bd);border-top:1px solid var(--bd);border-bottom:1px solid var(--bd)}.eff-head{display:flex;align-items:center;gap:12px;margin-bottom:10px}.eff-ic{font-size:22px}.eff-tl{font-family:var(--sans);font-weight:700;font-size:14px;letter-spacing:-.2px}.eff-sv{font-size:10px;font-weight:800;padding:3px 10px;border-radius:6px;margin-left:auto;letter-spacing:.5px;text-transform:uppercase}.eff-desc{font-size:13px;color:var(--tx3);line-height:1.6}.tl-c{padding:0 24px;margin-bottom:28px}.tl-item{display:flex;gap:16px;padding:14px 0;position:relative}.tl-line{width:1px;position:absolute;left:16px;top:40px;bottom:0;background:var(--bd)}.tl-dot{width:34px;height:34px;min-width:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;position:relative;z-index:1;font-family:var(--sans);letter-spacing:-1px}.tl-con{flex:1;padding-bottom:12px}.tl-per{font-family:var(--sans);font-weight:700;font-size:13px;margin-bottom:3px;letter-spacing:-.2px}.tl-desc{font-size:13px;color:var(--tx3);line-height:1.55}.card{background:var(--s1);border:1px solid var(--bd);border-radius:16px;padding:18px;margin-bottom:10px}.card-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.card-l{font-size:13px;font-weight:600}.card-s{font-family:var(--serif);font-weight:700;font-size:18px}.card-bar{height:5px;border-radius:3px;background:rgba(255,255,255,.06);overflow:hidden;margin-bottom:8px}.card-fill{height:100%;border-radius:3px;transition:width .8s ease-out}.card-d{font-size:12px;color:var(--tx4);line-height:1.45}.mat-row{display:flex;align-items:center;gap:14px;padding:14px 0;border-bottom:1px solid var(--bd)}.mat-row:last-child{border-bottom:none}.mat-pct{font-family:var(--serif);font-weight:700;font-size:20px;min-width:52px;text-align:right}.mat-info{flex:1}.mat-name{font-weight:600;font-size:14px;text-transform:capitalize;letter-spacing:-.2px}.mat-cat{font-size:11px;color:var(--tx4);text-transform:uppercase;letter-spacing:.5px;margin-top:2px}.mat-badge{padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700}.alt{background:var(--s1);border:1px solid var(--bd2);border-radius:16px;padding:18px;margin-bottom:10px;cursor:pointer;transition:all .25s}.alt:hover{border-color:var(--g6);background:#f2faf2;transform:translateY(-1px);box-shadow:0 4px 16px rgba(22,101,52,.06)}.alt-n{font-weight:700;font-size:14px;color:var(--g7)}.alt-b{font-size:12px;color:var(--tx4);margin-top:2px}.alt-r{font-size:13px;margin-top:8px;line-height:1.5;color:var(--tx3)}.w-hero{padding:36px 24px 28px;text-align:center}.w-agg{width:116px;height:116px;border-radius:50%;margin:0 auto 14px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--s1);border:2px solid}.w-an{font-family:var(--serif);font-size:38px;font-weight:800;line-height:1}.w-al{font-size:10px;text-transform:uppercase;letter-spacing:1.5px;opacity:.6;margin-top:4px;font-weight:600}.w-empty{text-align:center;padding:64px 24px;color:var(--tx3)}.w-item{display:flex;align-items:center;gap:14px;padding:16px 24px;border-bottom:1px solid #e2e8e0;cursor:pointer;transition:background .2s}.w-item:hover{background:#f6f9f4}.w-is{width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-weight:800;font-size:17px}.w-ii{flex:1}.w-in{font-weight:600;font-size:14px;letter-spacing:-.2px}.w-ib{font-size:12px;color:var(--tx4);margin-top:2px}.w-ir{background:none;border:none;color:var(--tx4);cursor:pointer;font-size:16px;padding:6px;opacity:.4;transition:all .2s;border-radius:8px}.w-ir:hover{opacity:1;color:var(--r4);background:rgba(248,113,113,.08)}.streak{display:flex;gap:4px;margin:12px 0}.streak-d{flex:1;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;letter-spacing:.3px;transition:all .2s}.ex-s{padding:20px 24px;position:sticky;top:52px;background:rgba(250,250,247,0.92);backdrop-filter:blur(20px);z-index:10}.ex-s input{width:100%;padding:15px 18px;background:var(--s1);border:1.5px solid var(--bd);border-radius:14px;color:var(--tx);font-family:var(--sans);font-size:15px;outline:none;font-weight:400}.ex-s input:focus{border-color:var(--g5);box-shadow:0 0 0 4px rgba(34,197,94,.08)}.ex-g{padding:0 24px;display:flex;flex-direction:column;gap:10px}.ex-i{display:flex;align-items:center;gap:14px;padding:16px 18px;background:var(--s1);border:1px solid var(--bd);border-radius:14px;cursor:pointer;transition:all .25s}.ex-i:hover{border-color:var(--g6);transform:translateY(-1px);box-shadow:0 4px 12px rgba(22,101,52,.06)}.ex-sc{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-family:var(--serif);font-weight:800;font-size:15px}.ex-ii{flex:1}.ex-in{font-weight:600;font-size:13px;letter-spacing:-.2px}.ex-id{font-size:11px;color:var(--tx4);margin-top:2px}.lrn{padding:24px}.lrn-c{background:var(--s1);border:1px solid var(--bd);border-radius:20px;padding:24px;margin-bottom:16px}.lrn-c h3{font-family:var(--serif);font-size:18px;font-weight:600;margin-bottom:12px}.lrn-c p{font-size:14px;color:var(--tx3);line-height:1.6}.ds{display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid var(--bd)}.ds:last-child{border-bottom:none}.ds-n{font-family:var(--serif);font-weight:800;font-size:24px;min-width:60px;text-align:center}.ds-l{font-size:13px;color:var(--tx3)}.nav{position:fixed;bottom:0;left:0;right:0;z-index:100;background:rgba(250,250,247,0.92);backdrop-filter:blur(24px) saturate(1.3);border-top:1px solid #e2e8e0;display:flex;justify-content:center;padding:6px 0 max(8px,env(safe-area-inset-bottom))}.nav-i{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 4px;cursor:pointer;border:none;background:none;color:var(--tx4);font-family:var(--sans);font-size:10px;font-weight:600;transition:color .2s;letter-spacing:.3px}.nav-i.on{color:var(--g6)}.nav-ic{font-size:20px}.fd-sec{padding:36px 24px 0;animation:fadeUp .8s ease-out .35s both}.fd-label{font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:var(--gold);font-weight:700;margin-bottom:6px}.fd-sub{font-size:13px;color:var(--tx3);margin-bottom:16px;line-height:1.5}.fd-start{width:100%;padding:16px;background:linear-gradient(135deg,rgba(201,168,76,.12),rgba(201,168,76,.05));border:1.5px solid rgba(201,168,76,.25);border-radius:16px;color:var(--gold);font-family:var(--sans);font-weight:700;font-size:14px;cursor:pointer;transition:all .25s;display:flex;align-items:center;justify-content:center;gap:10px}.fd-start:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(201,168,76,.12);border-color:rgba(201,168,76,.4)}.fd-prog{display:flex;gap:4px;margin-bottom:16px}.fd-prog-d{flex:1;height:4px;border-radius:2px;background:var(--bd);transition:background .3s}.fd-prog-d.done{background:var(--g5)}.fd-prog-d.cur{background:var(--g4);box-shadow:0 0 8px rgba(74,222,128,.3)}.fd-card{background:var(--s1);border:1px solid var(--bd);border-radius:20px;padding:24px;margin-bottom:14px}.fd-qnum{font-size:10px;color:var(--tx4);font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px}.fd-qtxt{font-family:var(--serif);font-size:19px;font-weight:700;margin-bottom:6px}.fd-inst{font-size:13px;color:var(--tx3);font-style:italic;margin-bottom:16px;line-height:1.5}.fd-opt{display:flex;flex-direction:column;gap:8px}.fd-btn{display:flex;align-items:center;gap:12px;padding:14px 16px;background:#f6f9f4;border:1.5px solid var(--bd);border-radius:14px;cursor:pointer;transition:all .2s;color:var(--tx);font-family:var(--sans);font-size:13px;font-weight:500;text-align:left}.fd-btn:hover{border-color:var(--g6);background:#eef4ee;transform:translateY(-1px)}.fd-btn.sel{border-color:var(--g5);background:#dcfce7;color:var(--g7)}.fd-ic{font-size:20px;min-width:28px;text-align:center}.fd-res{animation:fadeUp .5s ease-out both}.fd-circ{width:110px;height:110px;border-radius:50%;margin:0 auto 14px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,.25);border:3px solid}.fd-sc{font-family:var(--serif);font-size:38px;font-weight:800;line-height:1}.fd-mat-name{font-family:var(--serif);font-size:20px;font-weight:700;margin-bottom:4px}.fd-conf{font-size:13px;color:var(--tx3)}.fd-comp{margin-top:16px}.fd-comp-r{display:flex;align-items:center;gap:10px;margin-bottom:8px}.fd-comp-pct{font-family:var(--serif);font-weight:800;font-size:17px;min-width:44px;text-align:right}.fd-comp-nm{font-size:13px;font-weight:600;min-width:70px}.fd-comp-bar{flex:1;height:7px;border-radius:4px;background:var(--bd);overflow:hidden}.fd-comp-fill{height:100%;border-radius:4px;transition:width .8s ease-out}.fd-chem{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--bd);font-size:12px;color:var(--tx2)}.fd-chem:last-child{border-bottom:none}.fd-chem-dot{width:6px;height:6px;border-radius:50%}.fd-top{display:flex;gap:6px;margin-top:14px}.fd-top-item{flex:1;text-align:center;padding:10px 6px;background:var(--s2);border-radius:10px}.fd-top-nm{font-size:9px;color:var(--tx4);font-weight:600;margin-bottom:4px;letter-spacing:.3px}.fd-top-v{font-size:12px;font-weight:700}.fd-back{background:none;border:none;color:var(--tx3);font-family:var(--sans);font-size:12px;font-weight:600;cursor:pointer;padding:6px 0;margin-top:4px}.ld-c{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:100px 24px;gap:24px}.ld-spin{width:44px;height:44px;border-radius:50%;border:2.5px solid var(--bd);border-top-color:var(--g6);animation:sp .8s linear infinite}@keyframes sp{to{transform:rotate(360deg)}}.ld-t{font-size:15px;color:var(--tx3);text-align:center;font-weight:400}.ld-sub{font-size:13px;color:var(--g6);margin-top:4px;animation:pulse 1.5s ease-in-out infinite}@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}.err-b{margin:24px;padding:24px;background:rgba(220,38,38,.06);border:1px solid rgba(220,38,38,.15);border-radius:16px;text-align:center}.err-b p{font-size:14px;color:rgba(248,113,113,.8);margin-bottom:14px;line-height:1.5}.err-btn{padding:12px 28px;background:var(--g8);border:1px solid var(--g7);border-radius:12px;color:#fff;font-family:var(--sans);font-weight:600;cursor:pointer;font-size:13px}.bk-btn{background:none;border:none;color:var(--g6);font-family:var(--sans);font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;padding:0;letter-spacing:.3px}.aw-btn{width:100%;padding:16px;margin-top:20px;background:linear-gradient(135deg,var(--g6),var(--g7));border:1px solid var(--g6);border-radius:14px;color:white;font-family:var(--sans);font-weight:700;font-size:15px;cursor:pointer;transition:all .25s;letter-spacing:.3px}.aw-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(22,101,52,.2)}.aw-done{background:#f6f9f4!important;border-color:var(--bd)!important;color:var(--g6)!important;cursor:default!important;transform:none!important;box-shadow:none!important}.expand-hint{font-size:12px;color:var(--tx4);padding:4px 0;cursor:pointer;font-weight:500}.section-toggle{cursor:pointer;display:flex;align-items:center;gap:8px}.section-toggle .arrow{font-size:12px;color:var(--tx4);transition:transform .2s}.nav-inner{display:flex;width:100%;max-width:600px}@media(min-width:768px){.hero{padding:64px 0 0}.hero h1{font-size:44px}.hero-sub{max-width:520px;font-size:17px}.problem{padding:48px 0 0}.problem-grid{grid-template-columns:1fr 1fr 1fr 1fr;gap:16px}.problem-full{grid-column:1/-1}.scan-area{padding:44px 0 0}.scan-field input{font-size:17px;padding:20px 60px 20px 24px}.quick{padding:44px 0 0}.quick-chip{padding:12px 22px;font-size:14px}.facts{padding:44px 0 20px}.fact-text{font-size:16px}.mission{padding:0 0 20px}.fd-sec{padding:44px 0 0}.cnt{max-width:800px;margin:0 auto;padding:0 40px 100px}.hdr{padding:18px 40px 14px}.rs,.tl-c{padding:0;margin-left:0;margin-right:0;max-width:800px}.cr-banner{margin:28px 0;max-width:800px}.w-hero{padding:48px 0 28px}.w-item{padding:16px 0}.ex-s{padding:20px 0}.ex-g{padding:0}.lrn{padding:24px 0}.nav-inner{max-width:600px}.nav-i{padding:12px 16px;font-size:11px;gap:6px}.nav-ic{font-size:22px}.problem-num{font-size:32px}.fact-card{padding:32px}.mission-card{padding:36px 32px}.lrn-c{padding:32px}}@media(max-width:767px){.cnt{padding:0 0 110px}}`;

export default function CleanWearApp() {
  const { user, loading: authLoading } = useAuth();
  const [view, setView] = useState(() => { const p = window.location.pathname; if (p === "/certify" || p === "/brand-certification") return "certify"; return "scanner"; });
  const [scanMode, setScanMode] = useState("search");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState("");
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [score, setScore] = useState(null);
  const [wardrobe, setWardrobe] = useState([]);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTrigger, setAuthTrigger] = useState("wardrobe_save");
  const [exFilter, setExFilter] = useState("");
  const [factIdx, setFactIdx] = useState(0);
  const [expanded, setExpanded] = useState(null);
  const [added, setAdded] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [camErr, setCamErr] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [scanLimitOpen, setScanLimitOpen] = useState(false);
  const [hasViewedResult, setHasViewedResult] = useState(false);
  const vidRef = useRef(null);
  const streamRef = useRef(null);
  const scanRef = useRef(null);
  const canvasRef = useRef(null);
  const scanSourceRef = useRef("search");
  const [exCat, setExCat] = useState("All");
  const exSearchTimer = useRef(null);

  // Load wardrobe: from Supabase if authenticated, localStorage if anonymous
  useEffect(() => {
    if (authLoading) return;
    if (user) {
      fetchWardrobe(user.id).then(({ data }) => {
        if (data?.length) {
          const mapped = data.map(w => ({ id: w.id, name: w.product_name, brand: w.brand, category: w.category, score: w.score, at: w.added_at }));
          setWardrobe(mapped);
          analytics.syncWardrobeProfile(mapped);
        }
      });
    } else {
      try { const s = localStorage.getItem("cw_wardrobe"); if (s) setWardrobe(JSON.parse(s)); } catch {}
    }
  }, [user, authLoading]);
  useEffect(() => { if (!user && wardrobe.length > 0) { localStorage.setItem("cw_wardrobe", JSON.stringify(wardrobe)); } if (wardrobe.length > 0) analytics.syncWardrobeProfile(wardrobe); }, [wardrobe, user]);
  useEffect(() => { const i = setInterval(() => setFactIdx(x => (x + 1) % FUN_FACTS.length), 7000); return () => clearInterval(i); }, []);
  useEffect(() => { const handlePop = (e) => { const state = e.state; if (state?.view) { setView(state.view); if (state.view !== "results") { setResult(null); setScore(null); } setExpanded(null); } else { setView("scanner"); setResult(null); setScore(null); } }; window.addEventListener("popstate", handlePop); return () => window.removeEventListener("popstate", handlePop); }, []);

  // Push history on initial load
  useEffect(() => { window.history.replaceState({ view: "scanner" }, ""); }, []);

  // Sync body background with dark/light results theme
  useEffect(() => {
    const body = document.getElementById("cw-body") || document.body;
    if (view === "results" && score && score.overall < 50) {
      body.style.background = "#030a03";
    } else {
      body.style.background = "#fafaf7";
    }
  }, [view, score]);

  const navigateToResults = useCallback(() => { window.history.pushState({ view: "results" }, ""); setView("results"); }, []);

  const navigateTo = useCallback((newView) => { if (newView !== view) { window.history.pushState({ view: newView }, ""); setView(newView); setExpanded(null); } }, [view]);

  const stopCam = useCallback(() => { if (scanRef.current) { clearInterval(scanRef.current); scanRef.current = null; } if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; } setCamOn(false); }, []);

  const doScan = useCallback(async (q, bc = false) => {
    if (!q?.trim()) return;
    // Check scan limit for anonymous users
    if (!canScan(user)) {
      setScanLimitOpen(true);
      window.posthog?.capture("scan_limit_reached", { scans_used: getScanStatus(user).used });
      return;
    }
    setLoading(true); setError(null); setAdded(false);
    const isBc = bc || scanMode === "barcode" || scanMode === "camera";
    analytics.trackScanStarted(q, isBc, scanSourceRef.current);
    const steps = ["Searching product database...", "Analyzing material composition...", "Identifying chemical treatments...", "Evaluating cancer risk profile...", "Calculating safety score..."];
    let si = 0; setLoadStep(steps[0]);
    const iv = setInterval(() => { si = Math.min(si + 1, steps.length - 1); setLoadStep(steps[si]); }, 2200);
    try {
      const pd = await researchProduct(q, isBc); clearInterval(iv);
      setResult(pd); const sc2 = calculateScore(pd); setScore(sc2); navigateToResults();
      if (!user) incrementScanCount();
      setHasViewedResult(true);
      analytics.trackScanCompleted(q, sc2.overall, pd.brand, pd.product_name, pd.category);
      logScan({ query: q, score: sc2.overall, brand: pd.brand, product: pd.product_name, category: pd.category });
    } catch (err) { clearInterval(iv); setError("Could not analyze this product. Try a more specific search."); analytics.trackScanFailed(q, err?.message || "unknown"); }
    finally { setLoading(false); setLoadStep(""); scanSourceRef.current = "search"; }
  }, [scanMode, navigateToResults, user]);

  const startCam = useCallback(async () => {
    setCamErr(null); setCamOn(true); analytics.trackCameraStarted();
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } } });
      streamRef.current = s; if (vidRef.current) { vidRef.current.srcObject = s; await vidRef.current.play(); }
      const DetectorClass = ("BarcodeDetector" in window) ? window.BarcodeDetector : BarcodeDetectorPolyfill;
      try {
        const d = new DetectorClass({ formats: ["upc_a","upc_e","ean_13","ean_8","code_128","code_39"] });
        if (!canvasRef.current) canvasRef.current = document.createElement("canvas");
        scanRef.current = setInterval(async () => { if (vidRef.current?.readyState >= 2) { try { const v = vidRef.current; const c = canvasRef.current; c.width = v.videoWidth; c.height = v.videoHeight; c.getContext("2d").drawImage(v, 0, 0); const imgData = c.getContext("2d").getImageData(0, 0, c.width, c.height); const b = await d.detect(imgData); if (b.length) { stopCam(); analytics.trackBarcodeDetected(b[0].rawValue); setQuery(b[0].rawValue); scanSourceRef.current = "camera"; doScan(b[0].rawValue, true); } } catch {} } }, 350);
      } catch { setCamErr("Barcode scanning not supported on this device. Enter barcode manually."); analytics.trackCameraFailed("barcode_detector_unsupported"); }
    } catch (e) { setCamOn(false); const reason = e.name === "NotAllowedError" ? "permission_denied" : "unavailable"; setCamErr(e.name === "NotAllowedError" ? "Camera access denied. Allow permissions and retry." : "Camera not available. Enter barcode manually."); analytics.trackCameraFailed(reason); }
  }, [stopCam, doScan]);

  useEffect(() => () => stopCam(), []);
  useEffect(() => { if (view !== "scanner") stopCam(); }, [view]);

  const addWard = useCallback(async () => {
    if (!result || !score) return;
    const item = { id: Date.now(), name: result.product_name, brand: result.brand, category: result.category, score: score.overall, at: new Date().toISOString() };
    if (user) {
      // Authenticated: save to Supabase
      const { error: err } = await addToWardrobe({ userId: user.id, productName: result.product_name, brand: result.brand, score: score.overall, category: result.category, scanData: result });
      if (!err) { setWardrobe(p => [item, ...p]); setAdded(true); analytics.trackWardrobeAdd(result.product_name, result.brand, score.overall); }
    } else {
      // Anonymous: store pending item and prompt auth
      sessionStorage.setItem("pendingWardrobeSave", JSON.stringify(item));
      setAuthTrigger("wardrobe_save");
      setAuthModalOpen(true);
    }
  }, [result, score, user]);
  const rmWard = useCallback(async (id) => {
    const item = wardrobe.find(i => i.id === id);
    if (item) analytics.trackWardrobeRemove(item.name, item.brand, item.score);
    setWardrobe(p => { const u = p.filter(i => i.id !== id); if (!u.length && !user) localStorage.removeItem("cw_wardrobe"); return u; });
    if (user) { await removeFromWardrobe(id, user.id); }
  }, [wardrobe, user]);
  const avg = wardrobe.length ? Math.round(wardrobe.reduce((s, i) => s + i.score, 0) / wardrobe.length) : 0;

  const renderScanner = () => (<>
    <div className="hero"><div className="hero-eyebrow">Textile Safety Intelligence</div><h1>Your Clothes Are <em style={{fontFamily:'var(--sans)'}}>Quietly</em> Hurting You</h1><div className="hero-sub">CleanWear uses published research and regulatory data to reveal the hidden carcinogens, endocrine disruptors, and toxic chemicals in your clothing — so you can protect your body from what you wear every day.</div></div>
    <div className="problem"><div className="problem-label">The Problem No One Talks About</div><div className="problem-grid"><div className="problem-card"><div className="problem-num" style={{ color: "var(--r4)" }}>120+</div><div className="problem-unit">chemicals absorbed through clothing daily</div></div><div className="problem-card"><div className="problem-num" style={{ color: "var(--o4)" }}>30%</div><div className="problem-unit">testosterone reduction linked to BPA in synthetics</div></div><div className="problem-card"><div className="problem-num" style={{ color: "var(--r4)" }}>80%</div><div className="problem-unit">of human blood samples contain clothing microplastics</div></div><div className="problem-card"><div className="problem-num" style={{ color: "var(--o4)" }}>60%</div><div className="problem-unit">of cotton clothing treated with formaldehyde</div></div><div className="problem-full"><div className="problem-full-icon">{"\ud83e\uddec"}</div><div className="problem-full-text">Every time you sweat in synthetic workout gear, <strong>carcinogens leach directly through your skin</strong> at rates up to 15\u00d7 higher than at rest. Your gym clothes may be the most toxic thing in your routine.</div></div></div></div>
    <div className="scan-area"><div className="scan-label">Scan Your Clothing</div>
      {showCamera ? (<CameraScanner onResult={(r) => { setShowCamera(false); if (r.type === "barcode") { setQuery(r.value); scanSourceRef.current = "camera"; analytics.trackBarcodeDetected(r.value); doScan(r.value, true); } else { if (!canScan(user)) { setScanLimitOpen(true); return; } setResult(r.value); const sc2 = calculateScore(r.value); setScore(sc2); navigateToResults(); if (!user) incrementScanCount(); setHasViewedResult(true); analytics.trackScanCompleted(r.value.product_name, sc2.overall, r.value.brand, r.value.product_name, r.value.category); logScan({ query: r.value.product_name, score: sc2.overall, brand: r.value.brand, product: r.value.product_name, category: r.value.category }); } }} onClose={() => setShowCamera(false)} />) : (<>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => setShowCamera(true)} style={{ flex: 1, padding: "16px 12px", background: "linear-gradient(135deg, rgba(74,222,128,.08), rgba(74,222,128,.03))", border: "1.5px solid rgba(74,222,128,.2)", borderRadius: 16, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, fontFamily: "var(--sans)", transition: "all .25s" }}>
          <span style={{ fontSize: 28 }}>{"\ud83d\udcf7"}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--g6)" }}>Open Camera</span>
          <span style={{ fontSize: 10, color: "var(--tx4)" }}>Tag · Barcode · Fabric</span>
        </button>
      </div>
      <div className="scan-field"><input type="text" placeholder="Search brand + product name..." value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { scanSourceRef.current = "search"; doScan(query); } }} /><button className="scan-go" onClick={() => { scanSourceRef.current = "search"; doScan(query); }}>{"\u2192"}</button></div>
      </>)}</div>
    <div className="quick"><div className="quick-label">Popular Scans</div><div className="quick-grid">{["Nike Dri-FIT Tee", "Lululemon Align Leggings", "Under Armour HeatGear", "Patagonia Organic Tee", "Calvin Klein Boxer Brief", "Gymshark Shorts"].map(item => (<button key={item} className="quick-chip" onClick={() => { setQuery(item); scanSourceRef.current = "quick_scan"; analytics.trackQuickScan(item); doScan(item); }}>{item}</button>))}</div></div>
    <div className="facts"><div className="facts-label">Research Spotlight</div><div className="fact-card"><div className="fact-icon">{FUN_FACTS[factIdx].icon}</div><div className="fact-text">{FUN_FACTS[factIdx].fact}</div><div className="fact-src">{FUN_FACTS[factIdx].source}</div></div><div className="fact-dots">{FUN_FACTS.slice(0, 8).map((_, i) => <div key={i} className={`fact-dot ${i === factIdx % 8 ? "on" : ""}`} onClick={() => setFactIdx(i)} />)}</div></div>
    <div className="mission"><div className="mission-card"><div className="mission-label">Our Mission</div><div className="mission-text">"We believe you deserve to know what touches your skin. CleanWear brings radical transparency to the clothing industry — because the most important thing you wear shouldn't be ignorance."</div></div></div>
  </>);

  const renderResults = () => {
    if (!result || !score) return null;
    return (
      <ResultsPage
        result={result}
        score={score}
        onBack={() => window.history.back()}
        onAddToWardrobe={addWard}
        onScanAlternative={(name) => {
          analytics.trackAlternativeClicked(name, "", result.product_name);
          setQuery(name);
          scanSourceRef.current = "alternative";
          doScan(name);
        }}
        onShare={() => {
          setShareOpen(true);
          window.posthog?.capture("share_initiated", { product: result.product_name, score: score.overall });
        }}
      />
    );
  };

  const renderWardrobe = () => {
    // If not authenticated, show inline sign-in prompt
    if (!user && !authLoading) {
      return <><div className="w-hero"><h1 style={{ fontFamily: "var(--serif)", fontSize: 24, fontWeight: 700, marginBottom: 20 }}>My Wardrobe</h1></div><InlineSignIn /></>;
    }
    if (authLoading) {
      return <div className="ld-c"><div className="ld-spin" /><div><div className="ld-t">Loading wardrobe...</div></div></div>;
    }
    return (<><div className="w-hero"><h1 style={{ fontFamily: "var(--serif)", fontSize: 24, fontWeight: 700, marginBottom: 20 }}>My Wardrobe</h1>{wardrobe.length > 0 && (<><div className="w-agg" style={{ borderColor: sc(avg) }}><div className="w-an" style={{ color: sc(avg) }}>{avg}</div><div className="w-al">Avg Score</div></div><p style={{ fontSize: 13, color: "var(--tx3)" }}>{wardrobe.length} item{wardrobe.length !== 1 ? "s" : ""} {"\u00b7"} {sg(avg)} overall</p></>)}</div>{!wardrobe.length ? <div className="w-empty"><div style={{ fontSize: 44, marginBottom: 16, opacity: .4 }}>{"\ud83d\udc55"}</div><p style={{ fontSize: 15, marginBottom: 8, fontWeight: 500 }}>Your wardrobe is empty</p><p style={{ fontSize: 13 }}>Scan items to build your health profile.</p></div> : (<><div style={{ padding: "0 24px", marginBottom: 16 }}><div style={{ fontSize: 10, fontWeight: 700, color: "var(--tx4)", marginBottom: 8, letterSpacing: "1.5px", textTransform: "uppercase" }}>This Week</div><div className="streak">{["M","T","W","T","F","S","S"].map((d, i) => { const h = wardrobe.some(w => new Date(w.at).getDay() === (i + 1) % 7); return <div key={i} className="streak-d" style={{ background: h ? "var(--s2)" : "var(--s1)", color: h ? "var(--g6)" : "var(--tx4)", border: `1px solid ${h ? "var(--g8)" : "var(--bd)"}` }}>{d}</div>; })}</div></div>{wardrobe.map(w => (<div key={w.id} className="w-item" onClick={() => { setQuery(`${w.brand} ${w.name}`); scanSourceRef.current = "wardrobe_rescan"; doScan(`${w.brand} ${w.name}`); }}><div className="w-is" style={{ background: `${sc(w.score)}14`, color: sc(w.score), border: `1px solid ${sc(w.score)}33` }}>{w.score}</div><div className="w-ii"><div className="w-in">{w.name}</div><div className="w-ib">{w.brand} {"\u00b7"} {w.category}</div></div><button className="w-ir" onClick={e => { e.stopPropagation(); rmWard(w.id); }}>{"\u2715"}</button></div>))}</>)}</>);
  };

  const doScanDirect = useCallback((product) => {
    // Check scan limit for anonymous users
    if (!canScan(user)) {
      setScanLimitOpen(true);
      window.posthog?.capture("scan_limit_reached", { scans_used: getScanStatus(user).used });
      return;
    }
    setLoading(true); setError(null); setAdded(false);
    analytics.trackScanStarted(product.name, false, "brand_browse_direct");
    const pd = {
      product_name: product.name,
      brand: product.brand,
      category: product.category,
      materials: product.materials,
      chemicals: product.chemicals || [],
      certifications: product.certifications || [],
      origin: product.origin || "Unknown",
    };
    setResult(pd);
    const sc2 = calculateScore(pd);
    setScore(sc2);
    navigateToResults();
    if (!user) incrementScanCount();
    setHasViewedResult(true);
    analytics.trackScanCompleted(product.name, sc2.overall, pd.brand, pd.product_name, pd.category);
    logScan({ query: product.name, score: sc2.overall, brand: pd.brand, product: pd.product_name, category: pd.category });
    setLoading(false); setLoadStep("");
  }, [navigateToResults, user]);

  const renderBrands = () => (<BrandExplore onScanProduct={(productQuery) => { setQuery(productQuery); scanSourceRef.current = "brand_browse"; doScan(productQuery); }} onScanProductDirect={(product) => { scanSourceRef.current = "brand_browse"; doScanDirect(product); }} />);

  const renderLearn = () => (<div className="lrn"><h2 style={{ fontFamily: "var(--serif)", fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Learn</h2><div className="lrn-c" style={{ borderLeft: "2px solid var(--g5)" }}><h3>Weekly Digest</h3>{wardrobe.length > 0 ? (<><div className="ds"><div className="ds-n" style={{ color: sc(avg) }}>{avg}</div><div className="ds-l">Average wardrobe safety score</div></div><div className="ds"><div className="ds-n">{wardrobe.length}</div><div className="ds-l">Items scanned</div></div><div className="ds"><div className="ds-n" style={{ color: "var(--r4)" }}>{wardrobe.filter(w => w.score < 40).length}</div><div className="ds-l">High-risk items</div></div><div className="ds"><div className="ds-n" style={{ color: "var(--g6)" }}>{wardrobe.filter(w => w.score >= 70).length}</div><div className="ds-l">Safe items</div></div><p style={{ fontSize: 13, color: "var(--tx4)", marginTop: 14, lineHeight: 1.6 }}>Replace your highest-contact, lowest-score items first — underwear and gym shirts create the most chemical exposure.</p></>) : <p>Scan items to get your personalized weekly digest.</p>}</div><div className="lrn-c"><h3>Chemical Reference</h3><p style={{ marginBottom: 4 }}>Tap to expand.</p>{Object.entries(CHEMICAL_RISKS).map(([k, c]) => (<div key={k} style={{ padding: "14px 0", borderBottom: "1px solid var(--bd)", cursor: "pointer" }} onClick={() => { const next = expanded === k ? null : k; setExpanded(next); if (next) analytics.trackChemicalReferenceExpanded(c.name); }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 16 }}>{c.icon}</span><span style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</span>{c.cancerLinked && <span style={{ fontSize: 9, color: "var(--r4)", fontWeight: 800, background: "rgba(248,113,113,.1)", padding: "2px 8px", borderRadius: 4, letterSpacing: ".5px" }}>CARCINOGEN</span>}</div>{expanded === k && <div style={{ marginTop: 10, fontSize: 13, color: "var(--tx3)", lineHeight: 1.6 }}>{c.desc}<div style={{ marginTop: 6, fontSize: 12, color: "var(--tx4)", fontStyle: "italic" }}>{"\u23f1"} {c.timeline}</div></div>}</div>))}</div><div className="lrn-c"><h3>Material Rankings</h3><p style={{ marginBottom: 14 }}>Safest to most concerning:</p>{Object.entries(MATERIAL_DB).sort((a, b) => b[1].score - a[1].score).slice(0, 10).map(([n, d], i) => (<div key={n} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: "1px solid var(--bd)" }}><div style={{ fontFamily: "var(--serif)", fontWeight: 800, fontSize: 16, color: "var(--tx4)", minWidth: 24 }}>{i + 1}</div><div style={{ flex: 1, textTransform: "capitalize", fontSize: 13, fontWeight: 600 }}>{n}</div><div style={{ fontFamily: "var(--serif)", fontWeight: 700, color: sc(d.score) }}>{d.score}</div></div>))}</div><div className="lrn-c"><h3>Research Library</h3>{FUN_FACTS.map((f, i) => (<div key={i} style={{ padding: "14px 0", borderBottom: i < FUN_FACTS.length - 1 ? "1px solid var(--bd)" : "none" }}><div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}><span style={{ fontSize: 20, minWidth: 28 }}>{f.icon}</span><div><div style={{ fontSize: 14, lineHeight: 1.6 }}>{f.fact}</div><div style={{ fontSize: 11, color: "var(--tx4)", marginTop: 6, fontStyle: "italic" }}>{f.source}</div></div></div></div>))}</div></div>);

  return (<><style>{CSS}</style>{view === "certify" ? (<CertifyPage onBack={() => navigateTo("scanner")} />) : view === "results" ? (<div className="app" style={{ padding: 0 }}>{loading ? <div className="ld-c"><div className="ld-spin" /><div><div className="ld-t">Analyzing product safety</div><div className="ld-sub">{loadStep}</div></div></div> : renderResults()}</div>) : (<div className="app"><div className="hdr"><div className="hdr-logo">Clean<em>Wear</em></div><div className="hdr-badge">{wardrobe.length > 0 && <><span style={{ color: sc(avg), marginRight: 4 }}>{"\u25cf"}</span>{avg} avg {"\u00b7"} </>}{wardrobe.length} items</div></div><div className="cnt">{loading ? <div className="ld-c"><div className="ld-spin" /><div><div className="ld-t">Analyzing product safety</div><div className="ld-sub">{loadStep}</div></div></div> : (<>{error && <div className="err-b"><p>{error}</p><button className="err-btn" onClick={() => { setError(null); setView("scanner"); }}>Try Again</button></div>}{view === "scanner" && renderScanner()}{view === "wardrobe" && renderWardrobe()}{view === "brands" && renderBrands()}{view === "learn" && renderLearn()}</>)}</div><div className="nav"><div className="nav-inner">{[{ id: "scanner", ic: "\u25ce", l: "SCAN" }, { id: "wardrobe", ic: "\u25a3", l: "WARDROBE" }, { id: "brands", ic: "\u25c8", l: "BRANDS" }, { id: "learn", ic: "\u25c9", l: "LEARN" }].map(n => (<button key={n.id} className={`nav-i ${view === n.id ? "on" : ""}`} onClick={() => { const prevView = view; navigateTo(n.id); analytics.trackTabSwitch(n.id, prevView); }}><span className="nav-ic">{n.ic}</span>{n.l}</button>))}</div></div></div>)}<AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} trigger={authTrigger} />
    <ShareCard
      result={result}
      score={score}
      isOpen={shareOpen}
      onClose={() => setShareOpen(false)}
      onShareComplete={() => {
        if (!user) addScanCredit();
        window.posthog?.capture("results_shared", { product: result?.product_name, score: score?.overall });
      }}
    />
    <ScanLimitModal
      isOpen={scanLimitOpen}
      onClose={() => setScanLimitOpen(false)}
      scansUsed={getScanStatus(user).used}
      onSignUp={() => { setScanLimitOpen(false); setAuthTrigger("scan_limit"); setAuthModalOpen(true); }}
      onShareForCredit={() => {
        setScanLimitOpen(false);
        if (result && score) {
          setShareOpen(true);
        } else {
          // No result to share, prompt sign up instead
          setAuthTrigger("scan_limit");
          setAuthModalOpen(true);
        }
      }}
    />
    <PWAInstallBanner hasViewedResult={hasViewedResult} />
  </>);
}