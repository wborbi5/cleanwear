#!/usr/bin/env node
// ============================================================
// CleanWear V3 — Rescore newProducts.json via V3 engine
//
// Usage: node scripts/rescore-new-products.js
//
// Reads:  src/newProducts.json
// Writes: data/newProducts.v3.json  (does NOT overwrite source)
// Prints: distribution report and top-20 divergences to stdout
//
// Per methodology §I.1 — batch re-score before V3 cutover.
// Do NOT use the output file in the UI until reviewed and approved.
// ============================================================

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Dynamic import so we don't need to bundle
const { scoreV3 } = await import(join(ROOT, "src/scoringEngineV3.js"));
const { BRAND_BY_NAME } = await import(join(ROOT, "src/brandDatabase.js"));

// ── Load source ───────────────────────────────────────────────
const srcPath = join(ROOT, "src/newProducts.json");
const raw = JSON.parse(readFileSync(srcPath, "utf-8"));
console.log(`\n=== CleanWear V3 Rescore: newProducts.json ===`);
console.log(`Loaded ${raw.length} products from ${srcPath}`);

// ── Score each product ────────────────────────────────────────
const results = [];
let nullCount = 0;
let scoredCount = 0;

for (const p of raw) {
  const brand = BRAND_BY_NAME[(p.brand || "").toLowerCase().trim()] || null;
  let v3Result = null;
  let nullReason = null;

  try {
    v3Result = scoreV3(p, brand);
    if (v3Result === null) {
      nullReason = !brand
        ? "brand not in registry"
        : "engine returned null (insufficient data)";
    }
  } catch (err) {
    nullReason = `engine error: ${err.message}`;
  }

  if (v3Result) {
    scoredCount++;
  } else {
    nullCount++;
  }

  results.push({
    ...p,
    score_v3:      v3Result?.score ?? null,
    confidence_tier_v3: v3Result?.confidence_tier ?? null,
    trace_v3:      v3Result?.trace ?? null,
    v3_null_reason: nullReason,
  });
}

// ── Distribution ──────────────────────────────────────────────
const buckets = { "0–25": 0, "26–50": 0, "51–75": 0, "76–100": 0 };
for (const r of results) {
  if (r.score_v3 === null) continue;
  if (r.score_v3 <= 25)       buckets["0–25"]++;
  else if (r.score_v3 <= 50)  buckets["26–50"]++;
  else if (r.score_v3 <= 75)  buckets["51–75"]++;
  else                         buckets["76–100"]++;
}

// ── Divergences (|v2 – v3| > 15) ─────────────────────────────
const divergences = results
  .filter(r => r.score_v3 !== null && r.score !== null)
  .map(r => ({ ...r, delta: Math.abs(r.score - r.score_v3) }))
  .filter(r => r.delta > 15)
  .sort((a, b) => b.delta - a.delta)
  .slice(0, 20);

// ── Write output ──────────────────────────────────────────────
const outDir = join(ROOT, "data");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "newProducts.v3.json");
writeFileSync(outPath, JSON.stringify(results, null, 2));

// ── Print report ──────────────────────────────────────────────
const totalDiv = results.filter(r => r.score_v3 !== null && r.score !== null && Math.abs(r.score - r.score_v3) > 15).length;

console.log(`
Total products:         ${raw.length}
V3 scored:              ${scoredCount} (${pct(scoredCount, raw.length)})
V3 null (no data):      ${nullCount} (${pct(nullCount, raw.length)})

Score distribution (V3):
  0–25:    ${buckets["0–25"]}
  26–50:   ${buckets["26–50"]}
  51–75:   ${buckets["51–75"]}
  76–100:  ${buckets["76–100"]}

Divergence (|v2 - v3| > 15):
  ${totalDiv} products diverge by > 15 pts
`);

if (divergences.length > 0) {
  console.log("Top divergences (showing up to 20):");
  console.log(
    "  " +
    "ID".padEnd(12) + "Brand".padEnd(22) + "Product".padEnd(36) +
    "V2".padEnd(6) + "V3".padEnd(6) + "Delta"
  );
  console.log("  " + "-".repeat(85));
  for (const r of divergences) {
    console.log(
      "  " +
      (r.id || "").padEnd(12) +
      (r.brand || "").slice(0, 20).padEnd(22) +
      (r.name || "").slice(0, 34).padEnd(36) +
      String(r.score ?? "—").padEnd(6) +
      String(r.score_v3 ?? "—").padEnd(6) +
      r.delta
    );
  }
}

console.log(`\nOutput written to: ${outPath}`);
console.log("⚠️  Do NOT use this file in UI until reviewed and approved per methodology §I.1.\n");

function pct(n, total) {
  return total ? `${((n / total) * 100).toFixed(1)}%` : "0%";
}
