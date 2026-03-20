#!/usr/bin/env node
// ============================================================
// CleanWear Product Matrix Generator & Batch Processor
// 
// Usage:
//   node scripts/generate-products.js --generate    # Generate product matrix JSON
//   node scripts/generate-products.js --scan        # Scan all products via API
//   node scripts/generate-products.js --scan --url https://yoursite.vercel.app
//   node scripts/generate-products.js --export      # Export to JS module
// ============================================================

const fs = require("fs");
const path = require("path");

// ─── BRAND × CATEGORY × MATERIAL MATRIX ─────────────────────

const BRANDS = {
  // Safe tier
  patagonia:      { tier: "safe", score: 91, defaultMats: ["Organic Cotton", "Recycled Polyester", "Hemp"] },
  pact:           { tier: "safe", score: 93, defaultMats: ["Organic Cotton", "Organic Cotton/Spandex"] },
  smartwool:      { tier: "safe", score: 88, defaultMats: ["Merino Wool", "Merino Wool/Nylon"] },
  allbirds:       { tier: "safe", score: 82, defaultMats: ["Merino Wool", "Eucalyptus Fiber", "Sugarcane EVA"] },
  organic_basics: { tier: "safe", score: 91, defaultMats: ["Organic Cotton", "Tencel", "Recycled Nylon"] },
  eileen_fisher:  { tier: "safe", score: 89, defaultMats: ["Organic Cotton", "Organic Linen", "Tencel"] },
  tentree:        { tier: "safe", score: 86, defaultMats: ["Organic Cotton", "Tencel", "Hemp"] },
  kotn:           { tier: "safe", score: 88, defaultMats: ["Egyptian Cotton", "Organic Cotton"] },
  mate_the_label: { tier: "safe", score: 90, defaultMats: ["Organic Cotton", "Organic Linen"] },
  nudie_jeans:    { tier: "safe", score: 84, defaultMats: ["Organic Cotton"] },
  coyuchi:        { tier: "safe", score: 90, defaultMats: ["Organic Cotton", "Organic Linen"] },
  icebreaker:     { tier: "safe", score: 86, defaultMats: ["Merino Wool", "Tencel"] },
  prana:          { tier: "safe", score: 78, defaultMats: ["Organic Cotton", "Recycled Polyester", "Hemp"] },

  // Moderate tier
  everlane:       { tier: "moderate", score: 65, defaultMats: ["Cotton", "Organic Cotton", "Recycled Polyester"] },
  reformation:    { tier: "moderate", score: 68, defaultMats: ["Tencel", "Linen", "Recycled Cotton"] },
  levi_s:         { tier: "moderate", score: 62, defaultMats: ["Cotton", "Cotton/Elastane"] },
  gap:            { tier: "moderate", score: 52, defaultMats: ["Cotton", "Polyester", "Cotton/Polyester Blend"] },
  j_crew:         { tier: "moderate", score: 58, defaultMats: ["Cotton", "Linen", "Wool", "Cashmere"] },
  uniqlo:         { tier: "moderate", score: 55, defaultMats: ["Cotton", "Polyester", "AIRism Nylon"] },
  ralph_lauren:   { tier: "moderate", score: 56, defaultMats: ["Cotton", "Wool", "Polyester"] },
  champion:       { tier: "moderate", score: 50, defaultMats: ["Cotton", "Polyester", "Cotton/Polyester Blend"] },
  athleta:        { tier: "moderate", score: 55, defaultMats: ["Nylon", "Recycled Polyester", "Organic Cotton"] },
  columbia:       { tier: "moderate", score: 52, defaultMats: ["Polyester", "Nylon", "Cotton"] },
  brooks_running: { tier: "moderate", score: 50, defaultMats: ["Polyester", "Recycled Polyester", "Nylon"] },
  american_eagle: { tier: "moderate", score: 46, defaultMats: ["Cotton", "Polyester", "Spandex"] },
  abercrombie:    { tier: "moderate", score: 48, defaultMats: ["Cotton", "Polyester", "Viscose"] },
  old_navy:       { tier: "moderate", score: 45, defaultMats: ["Cotton", "Polyester", "Spandex"] },
  target_brand:   { tier: "moderate", score: 48, defaultMats: ["Polyester", "Cotton", "Recycled Polyester"] },
  puma:           { tier: "moderate", score: 48, defaultMats: ["Polyester", "Recycled Polyester", "Cotton"] },
  asics:          { tier: "moderate", score: 45, defaultMats: ["Polyester", "Recycled Polyester", "Nylon"] },

  // High risk tier
  nike:           { tier: "high_risk", score: 36, defaultMats: ["Polyester", "Nylon", "Spandex"] },
  adidas:         { tier: "high_risk", score: 38, defaultMats: ["Polyester", "Recycled Polyester", "Nylon"] },
  lululemon:      { tier: "high_risk", score: 35, defaultMats: ["Nylon", "Lycra", "Polyester"] },
  under_armour:   { tier: "high_risk", score: 34, defaultMats: ["Polyester", "Spandex", "Nylon"] },
  gymshark:       { tier: "high_risk", score: 32, defaultMats: ["Polyester", "Nylon", "Elastane"] },
  h_m:            { tier: "high_risk", score: 35, defaultMats: ["Polyester", "Cotton", "Viscose", "Acrylic"] },
  zara:           { tier: "high_risk", score: 38, defaultMats: ["Polyester", "Cotton", "Viscose"] },
  shein:          { tier: "high_risk", score: 12, defaultMats: ["Polyester", "Spandex", "Acrylic"] },
  temu:           { tier: "high_risk", score: 10, defaultMats: ["Polyester", "Acrylic", "Nylon"] },
  fashion_nova:   { tier: "high_risk", score: 20, defaultMats: ["Polyester", "Spandex", "Rayon"] },
  forever21:      { tier: "high_risk", score: 28, defaultMats: ["Polyester", "Rayon", "Nylon"] },
  boohoo:         { tier: "high_risk", score: 22, defaultMats: ["Polyester", "Viscose", "Acrylic"] },
  primark:        { tier: "high_risk", score: 30, defaultMats: ["Polyester", "Cotton", "Acrylic"] },
  fabletics:      { tier: "high_risk", score: 36, defaultMats: ["Nylon", "Polyester", "Spandex"] },
  alo_yoga:       { tier: "high_risk", score: 40, defaultMats: ["Nylon", "Polyester", "Spandex"] },
  reebok:         { tier: "high_risk", score: 42, defaultMats: ["Polyester", "Nylon", "Spandex"] },
  on_running:     { tier: "high_risk", score: 48, defaultMats: ["Recycled Polyester", "Polyester"] },
  new_balance:    { tier: "high_risk", score: 42, defaultMats: ["Polyester", "Nylon", "Cotton"] },
  hanes:          { tier: "high_risk", score: 44, defaultMats: ["Cotton", "Cotton/Polyester Blend"] },
  fruit_of_loom:  { tier: "high_risk", score: 42, defaultMats: ["Cotton", "Cotton/Polyester Blend"] },
  gildan:         { tier: "high_risk", score: 44, defaultMats: ["Cotton", "Cotton/Polyester Blend"] },
  walmart_brand:  { tier: "high_risk", score: 35, defaultMats: ["Polyester", "Cotton"] },
  skechers:       { tier: "high_risk", score: 38, defaultMats: ["Polyester", "Nylon", "Synthetic Leather"] },
};

const DISPLAY_NAMES = {
  patagonia: "Patagonia", pact: "Pact", smartwool: "Smartwool", allbirds: "Allbirds",
  organic_basics: "Organic Basics", eileen_fisher: "Eileen Fisher", tentree: "tentree",
  kotn: "Kotn", mate_the_label: "MATE the Label", nudie_jeans: "Nudie Jeans",
  coyuchi: "Coyuchi", icebreaker: "Icebreaker", prana: "prAna",
  everlane: "Everlane", reformation: "Reformation", levi_s: "Levi's",
  gap: "Gap", j_crew: "J.Crew", uniqlo: "Uniqlo", ralph_lauren: "Ralph Lauren",
  champion: "Champion", athleta: "Athleta", columbia: "Columbia",
  brooks_running: "Brooks Running", american_eagle: "American Eagle",
  abercrombie: "Abercrombie & Fitch", old_navy: "Old Navy",
  target_brand: "Target", puma: "Puma", asics: "ASICS",
  nike: "Nike", adidas: "Adidas", lululemon: "Lululemon",
  under_armour: "Under Armour", gymshark: "Gymshark", h_m: "H&M",
  zara: "Zara", shein: "SHEIN", temu: "Temu", fashion_nova: "Fashion Nova",
  forever21: "Forever 21", boohoo: "Boohoo", primark: "Primark",
  fabletics: "Fabletics", alo_yoga: "Alo Yoga", reebok: "Reebok",
  on_running: "On Running", new_balance: "New Balance", hanes: "Hanes",
  fruit_of_loom: "Fruit of the Loom", gildan: "Gildan",
  walmart_brand: "Walmart", skechers: "Skechers",
};

// Categories with material overrides
const CATEGORIES = {
  "Training Tee":         { cat: "Athletic", matOverride: null },
  "Running Shorts":       { cat: "Athletic", matOverride: null },
  "Sports Bra":           { cat: "Underwear", matOverride: ["Nylon", "Spandex"] },
  "Compression Leggings": { cat: "Athletic", matOverride: ["Nylon", "Spandex"] },
  "Crew Neck Tee":        { cat: "Casual", matOverride: null },
  "Pullover Hoodie":      { cat: "Casual", matOverride: null },
  "Jogger Pants":         { cat: "Casual", matOverride: null },
  "Boxer Briefs":         { cat: "Underwear", matOverride: ["Cotton", "Spandex"] },
  "Ankle Socks":          { cat: "Underwear", matOverride: null },
  "Quarter-Zip Pullover": { cat: "Athletic", matOverride: null },
  "Tank Top":             { cat: "Casual", matOverride: null },
  "Polo Shirt":           { cat: "Casual", matOverride: ["Cotton", "Polyester"] },
  "Zip-Up Jacket":        { cat: "Outerwear", matOverride: ["Polyester", "Nylon"] },
  "Sweatshirt":           { cat: "Casual", matOverride: null },
  "Yoga Pants":           { cat: "Athletic", matOverride: ["Nylon", "Spandex"] },
};

// ─── GENERATE ────────────────────────────────────────────────

function generateMatrix() {
  const products = [];
  let id = 1;

  for (const [brandId, brand] of Object.entries(BRANDS)) {
    const displayName = DISPLAY_NAMES[brandId] || brandId;

    for (const [productType, catInfo] of Object.entries(CATEGORIES)) {
      // Skip irrelevant combos (e.g., yoga pants for Nudie Jeans)
      if (productType === "Yoga Pants" && !["lululemon", "alo_yoga", "fabletics", "athleta", "nike", "adidas", "gymshark", "pact", "organic_basics", "mate_the_label", "puma", "under_armour"].includes(brandId)) continue;
      if (productType === "Sports Bra" && !["lululemon", "alo_yoga", "fabletics", "athleta", "nike", "adidas", "gymshark", "pact", "organic_basics", "under_armour", "puma", "champion", "target_brand", "walmart_brand", "hanes", "fruit_of_loom"].includes(brandId)) continue;
      if (productType === "Polo Shirt" && !["ralph_lauren", "nike", "puma", "uniqlo", "j_crew", "gap", "old_navy", "abercrombie", "tommy_hilfiger", "columbia", "adidas", "under_armour", "target_brand", "walmart_brand", "hanes", "champion", "lacoste"].includes(brandId)) continue;
      if (productType === "Compression Leggings" && !["nike", "adidas", "under_armour", "gymshark", "lululemon", "fabletics", "alo_yoga", "athleta", "puma", "asics", "brooks_running", "on_running", "reebok", "2xu", "champion", "target_brand"].includes(brandId)) continue;

      const mats = catInfo.matOverride || brand.defaultMats;
      const matStr = mats.slice(0, 2).join(", ");
      const query = `${displayName} ${productType}`;

      products.push({
        id: `prod_${String(id++).padStart(4, "0")}`,
        query,
        brand: displayName,
        brandId,
        name: productType,
        category: catInfo.cat,
        materials: matStr,
        tier: brand.tier,
        estimatedScore: brand.score + (catInfo.cat === "Casual" ? 8 : catInfo.cat === "Underwear" ? -2 : -5),
      });
    }
  }

  return products;
}

// ─── BATCH SCAN ──────────────────────────────────────────────

async function batchScan(products, baseUrl) {
  const results = [];
  const BATCH_SIZE = 3; // concurrent
  const DELAY = 1500; // ms between batches

  console.log(`\nScanning ${products.length} products against ${baseUrl}/api/scan`);
  console.log(`Batches of ${BATCH_SIZE} with ${DELAY}ms delay\n`);

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (p) => {
      try {
        const res = await fetch(`${baseUrl}/api/scan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: p.query }),
        });
        const data = await res.json();
        return { ...p, apiResult: data, scanned: true };
      } catch (err) {
        console.error(`  ✗ Failed: ${p.query} — ${err.message}`);
        return { ...p, apiResult: null, scanned: false };
      }
    });

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);

    const done = Math.min(i + BATCH_SIZE, products.length);
    const pct = ((done / products.length) * 100).toFixed(0);
    console.log(`  [${pct}%] ${done}/${products.length} — ${batch.map(b => b.query).join(", ")}`);

    if (i + BATCH_SIZE < products.length) {
      await new Promise((r) => setTimeout(r, DELAY));
    }
  }

  return results;
}

// ─── EXPORT TO JS MODULE ─────────────────────────────────────

function exportToModule(results) {
  const products = results.map((r) => {
    const api = r.apiResult || {};
    const mats = api.materials || r.materials.split(", ").map((m) => ({ name: m }));
    const chems = api.chemicals || [];

    // Calculate score from brand baseline + material adjustments
    let score = r.estimatedScore;
    if (api.materials) {
      const matNames = (Array.isArray(mats) ? mats : []).map((m) => (typeof m === "string" ? m : m.name || "").toLowerCase());
      if (matNames.some((m) => m.includes("organic"))) score += 10;
      if (matNames.some((m) => m.includes("hemp") || m.includes("linen"))) score += 8;
      if (matNames.some((m) => m.includes("merino"))) score += 6;
      if (matNames.some((m) => m.includes("polyester") && !m.includes("recycled"))) score -= 8;
      if (matNames.some((m) => m.includes("nylon"))) score -= 5;
      if (matNames.some((m) => m.includes("acrylic"))) score -= 10;
    }
    score = Math.max(5, Math.min(98, score));

    return {
      id: r.id,
      brand: r.brand,
      name: `${r.brand} ${r.name}`,
      category: r.category,
      score,
      materials: typeof mats === "string" ? mats : (Array.isArray(mats) ? mats.map((m) => typeof m === "string" ? m : m.name).join(", ") : r.materials),
      chemicals: Array.isArray(chems) ? chems.map((c) => typeof c === "string" ? c : c.id || c.name || c).slice(0, 4) : [],
      tier: score >= 70 ? "safe" : score >= 45 ? "moderate" : "high_risk",
    };
  });

  const js = `// ============================================================
// CleanWear Product Database — Auto-generated
// ${products.length} products across ${new Set(products.map(p => p.brand)).size} brands
// Generated: ${new Date().toISOString().split("T")[0]}
// ============================================================

export const PRODUCTS = ${JSON.stringify(products, null, 2)};

export const PRODUCT_BY_ID = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));
export const PRODUCT_CATEGORIES = [...new Set(PRODUCTS.map(p => p.category))].sort();
export const PRODUCT_BRANDS = [...new Set(PRODUCTS.map(p => p.brand))].sort();
`;

  return { js, products };
}

// ─── CLI ─────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const doGenerate = args.includes("--generate");
  const doScan = args.includes("--scan");
  const doExport = args.includes("--export");
  const urlIdx = args.indexOf("--url");
  const baseUrl = urlIdx !== -1 ? args[urlIdx + 1] : "http://localhost:5173";

  if (!doGenerate && !doScan && !doExport) {
    console.log("Usage:");
    console.log("  node scripts/generate-products.js --generate          # Generate matrix JSON");
    console.log("  node scripts/generate-products.js --scan --url <url>  # Scan via API");
    console.log("  node scripts/generate-products.js --export            # Export JS module");
    console.log("  node scripts/generate-products.js --generate --export # Generate + export (no API)");
    return;
  }

  // Generate matrix
  const products = generateMatrix();
  console.log(`Generated ${products.length} product combinations`);
  console.log(`  Brands: ${new Set(products.map((p) => p.brand)).size}`);
  console.log(`  Categories: ${new Set(products.map((p) => p.category)).size}`);

  if (doGenerate) {
    const outPath = path.join(__dirname, "..", "data", "product-matrix.json");
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(products, null, 2));
    console.log(`\nSaved matrix to ${outPath}`);
  }

  // Scan via API
  let results = products;
  if (doScan) {
    results = await batchScan(products, baseUrl);
    const scanned = results.filter((r) => r.scanned).length;
    console.log(`\nScanned: ${scanned}/${results.length}`);

    const scanPath = path.join(__dirname, "..", "data", "scan-results.json");
    fs.mkdirSync(path.dirname(scanPath), { recursive: true });
    fs.writeFileSync(scanPath, JSON.stringify(results, null, 2));
    console.log(`Saved scan results to ${scanPath}`);
  }

  // Export to JS module
  if (doExport) {
    const { js, products: exported } = exportToModule(results);
    const exportPath = path.join(__dirname, "..", "src", "productDatabase.js");
    fs.writeFileSync(exportPath, js);
    console.log(`\nExported ${exported.length} products to ${exportPath}`);
    console.log(`  Safe: ${exported.filter((p) => p.tier === "safe").length}`);
    console.log(`  Moderate: ${exported.filter((p) => p.tier === "moderate").length}`);
    console.log(`  High Risk: ${exported.filter((p) => p.tier === "high_risk").length}`);
  }
}

main().catch(console.error);
