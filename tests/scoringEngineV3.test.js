// ============================================================
// CleanWear V3 — Test Suite (12 cases)
// Run: node tests/scoringEngineV3.test.js
// All brand fixtures are inline mocks — no brandDatabase import.
// Pass criteria: score within ±2, flag sets exact.
// ============================================================

import { scoreV3, computeC1 } from "../src/scoringEngineV3.js";

// ── Test helpers ─────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function assert(label, condition, detail) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(`  ✗ ${label}${detail ? ": " + detail : ""}`);
  }
}

function assertScore(label, result, expectedScore) {
  const actual = result?.score ?? null;
  assert(
    `${label} — score`,
    actual !== null && Math.abs(actual - expectedScore) <= 2,
    `got ${actual}, expected ${expectedScore} ±2`
  );
}

function assertFlags(label, result, expectedChemicals) {
  const actual = (result?.flags || []).map(f => f.chemical).sort();
  const expected = [...expectedChemicals].sort();
  assert(
    `${label} — flags`,
    JSON.stringify(actual) === JSON.stringify(expected),
    `got [${actual.join(",")}], expected [${expected.join(",")}]`
  );
}

function assertNoFlag(label, result, chemical) {
  const hasFlag = (result?.flags || []).some(f => f.chemical === chemical);
  assert(`${label} — no ${chemical} flag`, !hasFlag, `${chemical} was unexpectedly flagged at MEDIUM/HIGH`);
}

function assertFlagConfidence(label, result, chemical, expectedConf) {
  const flag = (result?.flags || []).find(f => f.chemical === chemical);
  assert(
    `${label} — ${chemical} confidence`,
    flag?.confidence === expectedConf,
    `got ${flag?.confidence}, expected ${expectedConf}`
  );
}

function assertTier(label, result, expectedTier) {
  assert(
    `${label} — confidence tier`,
    result?.confidence_tier === expectedTier,
    `got ${result?.confidence_tier}, expected ${expectedTier}`
  );
}

function assertDisclosure(label, result, chemical) {
  const hasDisc = (result?.disclosures || []).some(f => f.chemical === chemical);
  assert(`${label} — ${chemical} in disclosures`, hasDisc, `${chemical} not found in disclosures`);
}

// ── Brand fixtures (inline mocks — no brandDatabase import) ──

const brands = {
  lululemon: {
    id: "lululemon", name: "Lululemon", tier: "high_risk",
    certs: [], nrdc_pfas_rating: "C", nrdc_year: 2023,
    good_on_you_rating: "it's a start", goy_year: 2024,
    oeko_tex_certified: false, gots_certified: false, bluesign_certified: false,
  },
  uniqlo: {
    id: "uniqlo", name: "Uniqlo", tier: "moderate",
    certs: [], nrdc_pfas_rating: null,
    good_on_you_rating: "it's a start", goy_year: 2024,
    oeko_tex_certified: false, gots_certified: false, bluesign_certified: false,
  },
  patagonia: {
    id: "patagonia", name: "Patagonia", tier: "safe",
    certs: ["GOTS", "bluesign", "Fair Trade"],  // brand-wide, no "(select)"
    nrdc_pfas_rating: null,
    good_on_you_rating: "great", goy_year: 2024,
    oeko_tex_certified: false, gots_certified: true, bluesign_certified: true,
  },
  north_face: {
    id: "north_face", name: "The North Face", tier: "high_risk",
    certs: ["bluesign (select)"],  // "(select)" — NOT brand-wide
    nrdc_pfas_rating: "F", nrdc_year: 2025,  // age 1 in 2026 → priority 3 (not stale)
    // good_on_you_rating omitted — methodology Example 4 note: "NRDC 2023 is the only
    // independent brand rating on record for TNF" → C2 = NRDC F = 28
    good_on_you_rating: null,
    oeko_tex_certified: false, gots_certified: false, bluesign_certified: false,
  },
  pact: {
    id: "pact", name: "Pact", tier: "safe",
    certs: ["GOTS", "Fair Trade"],
    nrdc_pfas_rating: null,
    good_on_you_rating: "great", goy_year: 2024,
    oeko_tex_certified: true, gots_certified: true, bluesign_certified: false,
  },
  unknown_brand: null,
  oekotex_brand: {
    id: "oekotex_co", name: "OEKO-TEX Brand", tier: "moderate",
    certs: ["OEKO-TEX Standard 100"],
    nrdc_pfas_rating: null, good_on_you_rating: null,
    oeko_tex_certified: true, gots_certified: false, bluesign_certified: false,
  },
};

// ── T1: Lululemon Align Leggings (§J Example 1) ──────────────
// Expected: score 66 ±2, phthalates MED, microplastics MED, azo LOW, NO PFAS, Tier 2
{
  const product = {
    product_name: "Align Leggings",
    brand: "Lululemon",
    category: "Athletic",
    materials: [{ name: "Nylon", percentage: 81 }, { name: "Lycra", percentage: 19 }],
    chemicals: [], certifications: [], origin: "Vietnam",
  };
  const result = scoreV3(product, brands.lululemon);
  assertScore("T1 Lululemon Align", result, 66);
  assertFlags("T1 Lululemon Align", result, ["phthalates", "microplastics"]);
  assertNoFlag("T1 Lululemon Align", result, "pfas");
  assertDisclosure("T1 Lululemon Align", result, "azo_dyes");
  assertTier("T1 Lululemon Align", result, 2);
}

// ── T2: Uniqlo HEATTECH Ultra Warm (§J Example 2) ─────────────
// Expected: score 60 ±2, phthalates MED, antimony MED, microplastics MED, Tier 2
{
  const product = {
    product_name: "HEATTECH Ultra Warm",
    brand: "Uniqlo",
    category: "Athletic",
    materials: [
      { name: "Polyester", percentage: 47 }, { name: "Acrylic", percentage: 32 },
      { name: "Rayon", percentage: 16 },      { name: "Spandex", percentage: 5 },
    ],
    chemicals: [], certifications: [], health_notes: "moisture-wicking",
    finish_claims: [{ value: "moisture-wicking", confidence: "declared" }],
  };
  const result = scoreV3(product, brands.uniqlo);
  assertScore("T2 Uniqlo HEATTECH", result, 60);
  assertFlags("T2 Uniqlo HEATTECH", result, ["phthalates", "antimony", "microplastics"]);
  assertNoFlag("T2 Uniqlo HEATTECH", result, "pfas");
  assertTier("T2 Uniqlo HEATTECH", result, 2);
}

// ── T3: Patagonia Capilene (§J Example 3) ────────────────────
// Expected: score 81 ±2, microplastics MED, phthalates/antimony/azo suppressed to LOW
// C2: bluesign brand-level (priority 2) = 75, NOT Good On You (priority 3)
{
  const product = {
    product_name: "Capilene Cool Shirt",
    brand: "Patagonia",
    category: "Athletic",
    materials: [{ name: "Recycled Polyester", percentage: 88 }, { name: "Spandex", percentage: 12 }],
    chemicals: [], certifications: ["bluesign"],
  };
  const result = scoreV3(product, brands.patagonia);
  assertScore("T3 Patagonia Capilene", result, 81);
  assertFlags("T3 Patagonia Capilene", result, ["microplastics"]);
  assertNoFlag("T3 Patagonia Capilene", result, "pfas");
  // phthalates downgraded to LOW by bluesign → in disclosures not flags
  assertDisclosure("T3 Patagonia Capilene", result, "phthalates");
  assertTier("T3 Patagonia Capilene", result, 2);
  // C2 must be priority 2 (bluesign brand-level), NOT priority 3
  const c2comp = result?.components?.find(c => c.type === "brand_safety");
  assert(
    "T3 Patagonia Capilene — C2 priority 1 or 2 (bluesign)",
    c2comp?.priority_level_used === 1 || c2comp?.priority_level_used === 2,
    `got priority ${c2comp?.priority_level_used} — expected 1 (product cert) or 2 (brand cert)`
  );
  assert(
    "T3 Patagonia Capilene — C2 score 75",
    Math.abs((c2comp?.score ?? 0) - 75) <= 1,
    `got C2 score ${c2comp?.score}`
  );
}

// ── T4: The North Face Gore-Tex Shell (§J Example 4) ──────────
// Expected: score 43 ±2, PFAS HIGH, antimony MED, microplastics MED
// TNF has bluesign (select) → priority 2 NOT triggered → falls to NRDC F = 28
{
  const product = {
    product_name: "Gore-Tex Shell Jacket",
    brand: "The North Face",
    category: "Outerwear",
    materials: [{ name: "Nylon", percentage: 85 }, { name: "Polyester", percentage: 15 }],
    chemicals: [], certifications: [],
    finish_claims: [
      { value: "waterproof", confidence: "declared" },
      { value: "gore-tex",   confidence: "declared" },
    ],
  };
  const result = scoreV3(product, brands.north_face);
  assertScore("T4 TNF Gore-Tex", result, 43);
  assertFlags("T4 TNF Gore-Tex", result, ["pfas", "antimony", "microplastics"]);
  assertFlagConfidence("T4 TNF Gore-Tex", result, "pfas", "high");
  assertTier("T4 TNF Gore-Tex", result, 2);
  // Validate "(select)" normalization: C2 must NOT be priority 2 (bluesign brand-level)
  const c2comp = result?.components?.find(c => c.type === "brand_safety");
  assert(
    "T4 TNF — bluesign (select) NOT priority 2",
    c2comp?.priority_level_used !== 2,
    `priority_level_used was 2 — (select) normalization failed`
  );
}

// ── T5: Kids synthetic pajama, no fitted claim ────────────────
// Expected: flame_retardants HIGH fires via D-11
{
  const product = {
    product_name: "Kids Fleece Pajama Set",
    brand: "Carter's",
    category: "Kids",
    subcategory: "Sleepwear",
    materials: [{ name: "Polyester", percentage: 100 }],
    chemicals: [], certifications: [], finish_claims: [],
  };
  const c1 = computeC1(product, "moderate", false);
  const frFlag = c1.flags.find(f => f.chemical === "flame_retardants");
  assert("T5 Kids pajama — flame_retardants fires", !!frFlag, "flame_retardants not in flags");
  assert("T5 Kids pajama — HIGH confidence", frFlag?.confidence === "high", `got ${frFlag?.confidence}`);
}

// ── T6: GOTS organic cotton tee ────────────────────────────────
// Expected: no MEDIUM/HIGH chemical flags; score high; cert bonus applied
{
  const product = {
    product_name: "Organic Crew Tee",
    brand: "Pact",
    category: "Casual",
    materials: [{ name: "Organic Cotton", percentage: 100 }],
    chemicals: [], certifications: ["GOTS"],
    finish_claims: [],
  };
  const result = scoreV3(product, brands.pact);
  assertScore("T6 GOTS cotton tee", result, 87); // C1~100, C2~80(GOTS brand p2), C3~70
  assertFlags("T6 GOTS cotton tee", result, []);  // no MEDIUM/HIGH flags
  assertTier("T6 GOTS cotton tee", result, 2);
}

// ── T7: Synthetic, no brand data ──────────────────────────────
// Expected: C2 = null, weights re-normalized, Tier 3
{
  const product = {
    product_name: "Performance Tee",
    brand: "UnknownBrand",
    category: "Athletic",
    materials: [{ name: "Polyester", percentage: 100 }],
    chemicals: [], certifications: [], finish_claims: [],
  };
  const result = scoreV3(product, null);
  assert("T7 unknown brand — no C2 component", !result?.components?.find(c => c.type === "brand_safety"), "C2 component present unexpectedly");
  assertTier("T7 unknown brand — Tier 3", result, 3);
  assert("T7 unknown brand — score > 0", (result?.score ?? 0) > 0, "score is 0 or null");
}

// ── T8: Declared Gore-Tex → PFAS HIGH confidence ─────────────
// Tests the "declared" upgrade path in D-1
{
  const product = {
    product_name: "Shell Jacket",
    brand: "Arc'teryx",
    category: "Outerwear",
    materials: [{ name: "Nylon", percentage: 100 }],
    chemicals: [], certifications: [],
    finish_claims: [{ value: "gore-tex", confidence: "declared" }],
  };
  const c1 = computeC1(product, "moderate", false);
  const pfasFlag = c1.flags.find(f => f.chemical === "pfas");
  assert("T8 declared gore-tex — PFAS fires", !!pfasFlag, "PFAS not in flags");
  assert("T8 declared gore-tex — HIGH confidence", pfasFlag?.confidence === "high", `got ${pfasFlag?.confidence}`);
}

// ── T9: Athletic nylon, no DWR claim → PFAS does NOT fire ────
// Regression test for V2→V3 correction (§D-1)
{
  const product = {
    product_name: "Vital Seamless Tee",
    brand: "Gymshark",
    category: "Athletic",
    materials: [{ name: "Nylon", percentage: 92 }, { name: "Elastane", percentage: 8 }],
    chemicals: [], certifications: [], finish_claims: [],
  };
  const c1 = computeC1(product, "high_risk", false);
  const pfasFlag = c1.flags.find(f => f.chemical === "pfas");
  const pfasDisc = c1.disclosures.find(f => f.chemical === "pfas");
  assert(
    "T9 athletic nylon no DWR — PFAS does NOT fire at any confidence",
    !pfasFlag && !pfasDisc,
    pfasFlag ? `PFAS in flags at ${pfasFlag.confidence}` : pfasDisc ? "PFAS in disclosures" : "ok"
  );
}

// ── T10: Wrinkle-free dress shirt → formaldehyde HIGH ─────────
{
  const product = {
    product_name: "Non-Iron Dress Shirt",
    brand: "Brooks Brothers",
    category: "Formal",
    materials: [{ name: "Cotton", percentage: 100 }],
    chemicals: [], certifications: [],
    finish_claims: [{ value: "non-iron", confidence: "declared" }],
  };
  const c1 = computeC1(product, "moderate", false);
  const fFlag = c1.flags.find(f => f.chemical === "formaldehyde");
  assert("T10 non-iron shirt — formaldehyde fires", !!fFlag, "formaldehyde not in flags");
  assert("T10 non-iron shirt — HIGH confidence", fFlag?.confidence === "high", `got ${fFlag?.confidence}`);
}

// ── T11: OEKO-TEX certified synthetic → all suppressed/downgraded ──
// Expected: C1 = 100 (cert bonus drives to ceiling), all key flags LOW or null
{
  const product = {
    product_name: "OEKO-TEX Performance Tee",
    brand: "OEKO-TEX Brand",
    category: "Athletic",
    materials: [{ name: "Polyester", percentage: 88 }, { name: "Spandex", percentage: 12 }],
    chemicals: [], certifications: ["OEKO-TEX Standard 100"], finish_claims: [],
  };
  const c1 = computeC1(product, "moderate", false);
  assert("T11 OEKO-TEX — C1 = 100 (no MEDIUM/HIGH penalties + cert bonus)", c1.score === 100, `C1 = ${c1.score}`);
  // D-6 (microplastics) explicitly states no cert suppresses it — OEKO-TEX included.
  // Only microplastics should be in MEDIUM/HIGH flags; all other chemicals suppressed.
  assert("T11 OEKO-TEX — only microplastics in MEDIUM/HIGH flags",
    c1.flags.length === 1 && c1.flags[0].chemical === "microplastics",
    `flags: ${c1.flags.map(f=>f.chemical).join(",")}`
  );
  // phthalates and antimony should be downgraded to LOW (in disclosures)
  assert("T11 OEKO-TEX — phthalates in disclosures", c1.disclosures.some(f => f.chemical === "phthalates"), "phthalates not in disclosures");
  assert("T11 OEKO-TEX — antimony in disclosures", c1.disclosures.some(f => f.chemical === "antimony"), "antimony not in disclosures");
  // azo_dyes should be suppressed entirely (null, not even LOW)
  const azoDyes = [...c1.flags, ...c1.disclosures].find(f => f.chemical === "azo_dyes");
  assert("T11 OEKO-TEX — azo_dyes fully suppressed", !azoDyes, "azo_dyes still present");
}

// ── T12: Lululemon redux with explicit C2 priority trace ──────
// Same inputs as T1; confirm C2 priority path is priority 3 (NRDC C, not bluesign p2)
{
  const product = {
    product_name: "Wunder Train Leggings",
    brand: "Lululemon",
    category: "Athletic",
    materials: [{ name: "Nylon", percentage: 83 }, { name: "Lycra", percentage: 17 }],
    chemicals: [], certifications: [],
  };
  const result = scoreV3(product, brands.lululemon);
  assertScore("T12 Lululemon redux", result, 66);
  const c2comp = result?.components?.find(c => c.type === "brand_safety");
  assert(
    "T12 Lululemon redux — C2 priority 3 (NRDC, not cert)",
    c2comp?.priority_level_used === 3,
    `got priority ${c2comp?.priority_level_used}`
  );
  // §E.3: Good On You 2024 (age 2) is more recent than NRDC 2023 (age 3) → C2 = GoY = 48
  // Both are priority 3 signals; recency tie-break selects GoY.
  assert(
    "T12 Lululemon redux — C2 score 48 (GoY 2024, most recent signal)",
    Math.abs((c2comp?.score ?? 0) - 48) <= 1,
    `got C2 score ${c2comp?.score} — expected 48 (GoY 2024 beats NRDC 2023 by recency)`
  );
}


// ═══════════════════════════════════════════════════════════════
// M10 cert tests: 5 certifications newly assessed for C2 priority-2
// ═══════════════════════════════════════════════════════════════

// TC-1: MADE SAFE — brand-wide cert → C2 priority-2, score 78
{
  const brand = { id:"made_safe_brand", name:"MADE SAFE Brand", tier:"safe",
    certs:["MADE SAFE"], nrdc_pfas_rating:null, good_on_you_rating:null };
  const product = { product_name:"MADE SAFE Organic Tee", brand:"MADE SAFE Brand",
    category:"Casual", materials:[{name:"Organic Cotton",percentage:100}],
    chemicals:[], certifications:[] };
  const result = scoreV3(product, brand);
  const c2 = result?.components?.find(c => c.type === "brand_safety");
  assert("TC-1 MADE SAFE — C2 fires at priority 2",
    c2?.priority_level_used === 2, `got priority ${c2?.priority_level_used}`);
  assert("TC-1 MADE SAFE — C2 score 78",
    Math.abs((c2?.score ?? 0) - 78) <= 1, `got ${c2?.score}`);
  assert("TC-1 MADE SAFE — signal key contains made_safe",
    (c2?.signal_key || "").includes("made_safe"), `got ${c2?.signal_key}`);
}

// TC-2: Cradle to Cradle — brand-wide cert → C2 priority-2, score 72
{
  const brand = { id:"c2c_brand", name:"C2C Brand", tier:"safe",
    certs:["Cradle to Cradle"], nrdc_pfas_rating:null, good_on_you_rating:null };
  const product = { product_name:"C2C Certified Tee", brand:"C2C Brand",
    category:"Casual", materials:[{name:"Organic Cotton",percentage:100}],
    chemicals:[], certifications:[] };
  const result = scoreV3(product, brand);
  const c2 = result?.components?.find(c => c.type === "brand_safety");
  assert("TC-2 C2C — C2 fires at priority 2",
    c2?.priority_level_used === 2, `got priority ${c2?.priority_level_used}`);
  assert("TC-2 C2C — C2 score 72",
    Math.abs((c2?.score ?? 0) - 72) <= 1, `got ${c2?.score}`);
}

// TC-3: Fair Trade only — must NOT produce priority-2 C2
// Fair Trade has no chemical scope; should fall to GOY/NRDC (priority 3) or null
{
  const brand = { id:"fair_trade_only", name:"Fair Trade Only Brand", tier:"moderate",
    certs:["Fair Trade"], nrdc_pfas_rating:null,
    good_on_you_rating:"good", goy_year:2024 };
  const product = { product_name:"Fair Trade Tee", brand:"Fair Trade Only Brand",
    category:"Casual", materials:[{name:"Cotton",percentage:100}],
    chemicals:[], certifications:[] };
  const result = scoreV3(product, brand);
  const c2 = result?.components?.find(c => c.type === "brand_safety");
  assert("TC-3 Fair Trade — does NOT fire at priority 2 (no chemical scope)",
    c2?.priority_level_used !== 2,
    `priority_level_used was 2 — Fair Trade should not produce C2 priority-2`);
  // Should fall to GOY (priority 3)
  assert("TC-3 Fair Trade — falls through to GOY priority 3",
    c2?.priority_level_used === 3, `got priority ${c2?.priority_level_used}`);
}

// TC-4: B Corp only — must NOT produce priority-2 C2
{
  const brand = { id:"bcorp_only", name:"B Corp Only Brand", tier:"safe",
    certs:["B Corp"], nrdc_pfas_rating:null,
    good_on_you_rating:"great", goy_year:2024 };
  const product = { product_name:"B Corp Tee", brand:"B Corp Only Brand",
    category:"Casual", materials:[{name:"Cotton",percentage:100}],
    chemicals:[], certifications:[] };
  const result = scoreV3(product, brand);
  const c2 = result?.components?.find(c => c.type === "brand_safety");
  assert("TC-4 B Corp — does NOT fire at priority 2 (no chemical scope)",
    c2?.priority_level_used !== 2,
    `priority_level_used was 2 — B Corp should not produce C2 priority-2`);
}

// TC-5: ZQ Merino only — must NOT produce priority-2 C2
{
  const brand = { id:"zq_only", name:"ZQ Merino Brand", tier:"moderate",
    certs:["ZQ Merino"], nrdc_pfas_rating:null, good_on_you_rating:null };
  const product = { product_name:"ZQ Merino Base Layer", brand:"ZQ Merino Brand",
    category:"Athletic", materials:[{name:"Merino Wool",percentage:100}],
    chemicals:[], certifications:[] };
  const result = scoreV3(product, brand);
  const c2 = result?.components?.find(c => c.type === "brand_safety");
  // ZQ Merino: no GOY or NRDC → C2 should be null (Tier 3)
  assert("TC-5 ZQ Merino — does NOT fire at priority 2 (farm-level only, no finished-garment chemical scope)",
    c2?.priority_level_used !== 2,
    `priority_level_used was 2 — ZQ Merino should not produce C2 priority-2`);
  assert("TC-5 ZQ Merino — C2 is null (no independent rating signals)",
    c2 === undefined || c2 === null,
    `C2 component present: priority ${c2?.priority_level_used}`);
}
// ── Report ────────────────────────────────────────────────────
console.log("\n=== CleanWear V3 Scoring Engine — Test Results ===");
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
if (failures.length) {
  console.log("\nFailures:");
  failures.forEach(f => console.log(f));
  process.exit(1);
} else {
  console.log("\n✓ All tests passed.");
  process.exit(0);
}
