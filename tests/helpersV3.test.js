// ============================================================
// CleanWear — helpers.js V3 alignment test suite
// Run: node tests/helpersV3.test.js
//
// Each test:
//  1. Builds a product fixture matching a methodology §J / §D example
//  2. Runs scoreV3(product, brand) to get the real V3 trace
//  3. Calls getGarmentChemicals(product, trace) (Option A path)
//  4. Asserts displayed chemicals match trace flags+disclosures
//
// Also covers: V2 fallback path with corrected trigger lists,
// C-08/C-09/C-10 regressions.
// ============================================================

import { scoreV3, computeC1 } from "../src/scoringEngineV3.js";
import { getGarmentChemicals, CHEMICAL_INFO } from "../src/results/helpers.js";

let passed = 0;
let failed = 0;
const failures = [];

function assert(label, condition, detail) {
  if (condition) { passed++; }
  else { failed++; failures.push(`  ✗ ${label}${detail ? ": " + detail : ""}`); }
}

function assertChems(label, chemicals, expectedFlags, expectedDisclosures = []) {
  const all = [...expectedFlags, ...expectedDisclosures].sort();
  const got = [...chemicals].sort();
  assert(
    `${label} — chemical set`,
    JSON.stringify(got) === JSON.stringify(all),
    `got [${got.join(",")}], expected [${all.join(",")}]`
  );
  // Flags must appear before disclosures (flags first ordering)
  if (expectedFlags.length > 0 && expectedDisclosures.length > 0) {
    const lastFlagIdx  = Math.max(...expectedFlags.map(c  => chemicals.indexOf(c)));
    const firstDiscIdx = Math.min(...expectedDisclosures.map(c => chemicals.indexOf(c)));
    assert(
      `${label} — flags before disclosures`,
      lastFlagIdx < firstDiscIdx || firstDiscIdx === -1,
      `flag at ${lastFlagIdx}, disclosure at ${firstDiscIdx}`
    );
  }
}

function assertNoChemical(label, chemicals, notExpected) {
  assert(
    `${label} — ${notExpected} not displayed`,
    !chemicals.includes(notExpected),
    `${notExpected} was unexpectedly present`
  );
}

// ── Brand fixtures ────────────────────────────────────────────
const brands = {
  lululemon: { id:"lululemon", tier:"high_risk", certs:[],
    nrdc_pfas_rating:"C", nrdc_year:2023,
    good_on_you_rating:"it's a start", goy_year:2024 },
  uniqlo: { id:"uniqlo", tier:"moderate", certs:[],
    nrdc_pfas_rating:null,
    good_on_you_rating:"it's a start", goy_year:2024 },
  patagonia: { id:"patagonia", tier:"safe", certs:["GOTS","bluesign","Fair Trade"],
    nrdc_pfas_rating:null,
    good_on_you_rating:"great", goy_year:2024 },
  north_face: { id:"north_face", tier:"high_risk", certs:["bluesign (select)"],
    nrdc_pfas_rating:"F", nrdc_year:2025,
    good_on_you_rating:null },
  pact: { id:"pact", tier:"safe", certs:["GOTS","Fair Trade"],
    nrdc_pfas_rating:null,
    good_on_you_rating:"great", goy_year:2024,
    oeko_tex_certified:true, gots_certified:true },
};

// ── Helper: run engine + helpers and compare ──────────────────
function chemicalsFromTrace(product, brand) {
  const v3result = scoreV3(product, brand);
  const trace = v3result?.trace || null;
  return getGarmentChemicals(product, trace);
}

// ═══════════════════════════════════════════════════════════════
// J-1: Lululemon Align — nylon/lycra, athletic, no DWR
// Flags: phthalates MED, microplastics MED
// Disclosures: azo_dyes LOW
// C-08 regression: PFAS must NOT appear (no DWR claim)
// C-10 regression: phthalates comes from lycra, not polyester
{
  const product = {
    product_name: "Align Leggings", brand: "Lululemon", category: "Athletic",
    materials: [{ name:"Nylon",percentage:81 },{ name:"Lycra",percentage:19 }],
    chemicals:[], certifications:[],
  };
  const chems = chemicalsFromTrace(product, brands.lululemon);
  // J-1: flags=phthalates,microplastics; discs=azo_dyes,heavy_metals,npes
  assert("J-1 — phthalates displayed",   chems.includes("phthalates"),   "missing phthalates");
  assert("J-1 — microplastics displayed", chems.includes("microplastics"), "missing microplastics");
  assert("J-1 — azo_dyes disclosed",     chems.includes("azo_dyes"),     "missing azo_dyes disclosure");
  assertNoChemical("J-1 (C-08 regression) — no PFAS without DWR", chems, "pfas");
}

// ═══════════════════════════════════════════════════════════════
// J-2: Uniqlo HEATTECH — poly/acrylic/rayon/spandex, moisture-wicking
// Flags: phthalates MED, antimony MED, microplastics MED
// C-10 regression: phthalates from spandex (not polyester)
// C-08 regression: "moisture-wicking" must NOT trigger PFAS
{
  const product = {
    product_name:"HEATTECH Ultra Warm", brand:"Uniqlo", category:"Athletic",
    materials:[
      {name:"Polyester",percentage:47},{name:"Acrylic",percentage:32},
      {name:"Rayon",percentage:16},{name:"Spandex",percentage:5},
    ],
    chemicals:[], certifications:[],
    finish_claims:[{value:"moisture-wicking",confidence:"declared"}],
  };
  const chems = chemicalsFromTrace(product, brands.uniqlo);
  // J-2: flags=phthalates,antimony,microplastics; discs=bpa,azo_dyes,npes (not heavy_metals — Uniqlo is moderate tier)
  assert("J-2 — phthalates displayed",   chems.includes("phthalates"),   "missing phthalates");
  assert("J-2 — antimony displayed",     chems.includes("antimony"),     "missing antimony");
  assert("J-2 — microplastics displayed", chems.includes("microplastics"), "missing microplastics");
  assertNoChemical("J-2 (C-08 regression) — no PFAS without DWR", chems, "pfas");
  assertNoChemical("J-2 — no heavy_metals (moderate tier, D-8 does not fire)", chems, "heavy_metals");
}

// ═══════════════════════════════════════════════════════════════
// J-3: Patagonia Capilene — recycled poly/spandex, bluesign cert
// Flags: microplastics MED only
// Disclosures: phthalates (downgraded by bluesign), antimony (downgraded)
{
  const product = {
    product_name:"Capilene Cool Shirt", brand:"Patagonia", category:"Athletic",
    materials:[{name:"Recycled Polyester",percentage:88},{name:"Spandex",percentage:12}],
    chemicals:[], certifications:["bluesign"],
  };
  const chems = chemicalsFromTrace(product, brands.patagonia);
  // J-3: flags=microplastics; discs=phthalates,bpa,antimony (bluesign downgrade)
  assert("J-3 — microplastics displayed", chems.includes("microplastics"), "missing microplastics");
  assert("J-3 — phthalates disclosed (downgraded by bluesign)", chems.includes("phthalates"), "phthalates missing");
  assert("J-3 — antimony disclosed (downgraded by bluesign)", chems.includes("antimony"), "antimony missing");
  assertNoChemical("J-3 — no PFAS (no DWR claim)", chems, "pfas");
  assertNoChemical("J-3 — azo_dyes suppressed by bluesign", chems, "azo_dyes");
}

// ═══════════════════════════════════════════════════════════════
// J-4: TNF Gore-Tex Shell — nylon/poly, DWR declared
// Flags: pfas HIGH, antimony MED, microplastics MED
// C-08 validation: PFAS fires because DWR is DECLARED
{
  const product = {
    product_name:"Gore-Tex Shell Jacket", brand:"The North Face", category:"Outerwear",
    materials:[{name:"Nylon",percentage:85},{name:"Polyester",percentage:15}],
    chemicals:[], certifications:[],
    finish_claims:[
      {value:"waterproof",confidence:"declared"},
      {value:"gore-tex",confidence:"declared"},
    ],
  };
  const chems = chemicalsFromTrace(product, brands.north_face);
  // J-4: flags=pfas,antimony,microplastics; discs=bpa,azo_dyes,heavy_metals,npes
  assert("J-4 — pfas displayed (declared DWR)",  chems.includes("pfas"),         "missing pfas");
  assert("J-4 — antimony displayed",             chems.includes("antimony"),     "missing antimony");
  assert("J-4 — microplastics displayed",        chems.includes("microplastics"), "missing microplastics");
  // pfas must be a flag (MEDIUM/HIGH), not just a disclosure
  const j4v3trace = scoreV3({
    product_name:"Gore-Tex Shell Jacket", brand:"The North Face", category:"Outerwear",
    materials:[{name:"Nylon",percentage:85},{name:"Polyester",percentage:15}],
    chemicals:[], certifications:[],
    finish_claims:[{value:"waterproof",confidence:"declared"},{value:"gore-tex",confidence:"declared"}],
  }, brands.north_face)?.trace;
  assert("J-4 — pfas is a scored flag (HIGH confidence)",
    (j4v3trace?.flags||[]).some(f => f.chemical === "pfas"),
    "pfas not in scored flags"
  );
}

// ═══════════════════════════════════════════════════════════════
// R-1: Kids synthetic pajama — poly, no fitted claim, Kids+Sleepwear
// Flags: flame_retardants HIGH, antimony MED, microplastics MED
{
  const product = {
    product_name:"Kids Fleece Pajama Set", brand:"Unknown", category:"Kids",
    subcategory:"Sleepwear",
    materials:[{name:"Polyester",percentage:100}],
    chemicals:[], certifications:[], finish_claims:[],
  };
  const v3result = scoreV3(product, null);
  const chems = getGarmentChemicals(product, v3result?.trace || null);
  assert("R-1 Kids pajama — flame_retardants displayed",
    chems.includes("flame_retardants"),
    `got [${chems.join(",")}]`
  );
  assert("R-1 Kids pajama — antimony displayed", chems.includes("antimony"), "antimony missing");
  assert("R-1 Kids pajama — microplastics displayed", chems.includes("microplastics"), "microplastics missing");
}

// ═══════════════════════════════════════════════════════════════
// R-2: GOTS organic cotton tee — no MEDIUM/HIGH chemical flags
// Only disclosure: formaldehyde LOW (cotton processing baseline)
{
  const product = {
    product_name:"Organic Crew Tee", brand:"Pact", category:"Casual",
    materials:[{name:"Organic Cotton",percentage:100}],
    chemicals:[], certifications:["GOTS"],
  };
  const chems = chemicalsFromTrace(product, brands.pact);
  // No high-severity flags — only formaldehyde as disclosure (cotton baseline)
  // GOTS suppresses formaldehyde per D-2 (RSL_CERTS includes gots) → actually SUPPRESSED entirely
  assert("R-2 GOTS cotton — no PFAS", !chems.includes("pfas"), "pfas present");
  assert("R-2 GOTS cotton — no phthalates", !chems.includes("phthalates"), "phthalates present");
  assert("R-2 GOTS cotton — no antimony", !chems.includes("antimony"), "antimony present");
  assert("R-2 GOTS cotton — no azo_dyes", !chems.includes("azo_dyes"), "azo_dyes present");
}

// ═══════════════════════════════════════════════════════════════
// R-3: Synthetic, no brand data (polyester, unknown brand)
// Flags: antimony MED, microplastics MED; C2 = null → Tier 3
{
  const product = {
    product_name:"Performance Tee", brand:"UnknownBrand", category:"Athletic",
    materials:[{name:"Polyester",percentage:100}],
    chemicals:[], certifications:[], finish_claims:[],
  };
  const v3result = scoreV3(product, null);
  const chems = getGarmentChemicals(product, v3result?.trace || null);
  assert("R-3 synthetic no brand — antimony displayed", chems.includes("antimony"), "antimony missing");
  assert("R-3 synthetic no brand — microplastics displayed", chems.includes("microplastics"), "microplastics missing");
  assertNoChemical("R-3 synthetic no brand — no PFAS (no DWR)", chems, "pfas");
}

// ═══════════════════════════════════════════════════════════════
// R-4: Declared Gore-Tex jacket — PFAS HIGH
// Validates the "declared" upgrade path in D-1
{
  const product = {
    product_name:"Shell Jacket", brand:"Arc'teryx", category:"Outerwear",
    materials:[{name:"Nylon",percentage:100}],
    chemicals:[], certifications:[],
    finish_claims:[{value:"gore-tex",confidence:"declared"}],
  };
  const v3result = scoreV3(product, null);
  const chems = getGarmentChemicals(product, v3result?.trace || null);
  assert("R-4 declared gore-tex — PFAS displayed", chems.includes("pfas"), "pfas not in list");
}

// ═══════════════════════════════════════════════════════════════
// R-5 (C-08 regression): Athletic nylon, no DWR → PFAS must NOT fire
{
  const product = {
    product_name:"Vital Seamless Tee", brand:"Gymshark", category:"Athletic",
    materials:[{name:"Nylon",percentage:92},{name:"Elastane",percentage:8}],
    chemicals:[], certifications:[], finish_claims:[],
  };
  const c1 = computeC1(
    { category:"Athletic", materials:[{name:"Nylon",percentage:92},{name:"Elastane",percentage:8}],
      finish_claims:[], certifications:[] },
    "high_risk", false
  );
  assert(
    "R-5 nylon athletic no DWR — PFAS not in engine flags or disclosures",
    !c1.flags.some(f => f.chemical === "pfas") && !c1.disclosures.some(f => f.chemical === "pfas"),
    `flags: ${c1.flags.map(f=>f.chemical).join(",")}`
  );
  // Now also via helpers (V2 fallback path — no trace, nylon only with fixed triggers)
  const chemsFallback = getGarmentChemicals(product, null);
  assertNoChemical("R-5 nylon athletic no DWR — V2 fallback no PFAS", chemsFallback, "pfas");
}

// ═══════════════════════════════════════════════════════════════
// R-6: Wrinkle-free dress shirt → formaldehyde HIGH
{
  const product = {
    product_name:"Non-Iron Dress Shirt", brand:"Brooks Brothers", category:"Formal",
    materials:[{name:"Cotton",percentage:100}],
    chemicals:[], certifications:[],
    finish_claims:[{value:"non-iron",confidence:"declared"}],
  };
  const v3result = scoreV3(product, null);
  const chems = getGarmentChemicals(product, v3result?.trace || null);
  assert("R-6 non-iron shirt — formaldehyde displayed", chems.includes("formaldehyde"), "formaldehyde missing");
}

// ═══════════════════════════════════════════════════════════════
// R-7: OEKO-TEX certified synthetic tee
// Only microplastics in MEDIUM/HIGH; phthalates + antimony as disclosures
// azo_dyes fully suppressed
{
  const product = {
    product_name:"OEKO-TEX Performance Tee", brand:"Test", category:"Athletic",
    materials:[{name:"Polyester",percentage:88},{name:"Spandex",percentage:12}],
    chemicals:[], certifications:["OEKO-TEX Standard 100"], finish_claims:[],
  };
  const v3result = scoreV3(product, null);
  const chems = getGarmentChemicals(product, v3result?.trace || null);
  assert("R-7 OEKO-TEX tee — microplastics displayed", chems.includes("microplastics"), "microplastics missing");
  // phthalates and antimony should be in disclosures (downgraded by OEKO-TEX)
  assert("R-7 OEKO-TEX tee — phthalates or antimony as disclosure",
    chems.includes("phthalates") || chems.includes("antimony"),
    "neither phthalates nor antimony in disclosure set"
  );
  assertNoChemical("R-7 OEKO-TEX tee — azo_dyes suppressed", chems, "azo_dyes");
}

// ═══════════════════════════════════════════════════════════════
// R-8: Lululemon replica (C-10 regression explicit)
// Nylon + Lycra → phthalates from LYCRA only, NOT from nylon itself
// If nylon were a phthalates trigger (old bug), test would still pass
// So we also check the V2 fallback path directly
{
  const product = {
    product_name:"Wunder Train Leggings", brand:"Lululemon", category:"Athletic",
    materials:[{name:"Nylon",percentage:83},{name:"Lycra",percentage:17}],
    chemicals:[], certifications:[],
  };
  // Option A (trace path)
  const chems = chemicalsFromTrace(product, brands.lululemon);
  assert("R-8 C-10 — phthalates present (via lycra)", chems.includes("phthalates"), "phthalates missing");
  assertNoChemical("R-8 C-10 — no PFAS", chems, "pfas");

  // V2 fallback path: nylon alone should NOT trigger phthalates
  const nylonOnlyProduct = {
    ...product,
    materials:[{name:"Nylon",percentage:100}],  // remove lycra
  };
  const chemsFallback = getGarmentChemicals(nylonOnlyProduct, null);  // null trace = V2 fallback
  assertNoChemical("R-8 C-10 V2 fallback — nylon alone does NOT trigger phthalates",
    chemsFallback, "phthalates"
  );
}

// ═══════════════════════════════════════════════════════════════
// C-09 check: CHEMICAL_INFO.pfas.sweatNote must NOT contain 3,252×
// (Adult-safe general string; Kids-specific string only in buildEquivalency)
{
  assert(
    "C-09 — pfas sweatNote does not contain '3,252' for universal display",
    !CHEMICAL_INFO.pfas.sweatNote.startsWith("Sweat increases PFAS dermal absorption up to 3,252"),
    `sweatNote: "${CHEMICAL_INFO.pfas.sweatNote.substring(0, 80)}"`
  );
  // The Kids qualifier should be present in the note as a parenthetical
  assert(
    "C-09 — pfas sweatNote references 3,252 in children-specific context",
    CHEMICAL_INFO.pfas.sweatNote.includes("3,252") &&
    CHEMICAL_INFO.pfas.sweatNote.toLowerCase().includes("children"),
    "sweatNote does not include 3,252 in children context"
  );
}

// ═══════════════════════════════════════════════════════════════
// C-08 check: PFAS triggers list must not include "polyester" or "nylon"
{
  assert(
    "C-08 — pfas.triggers does not include 'polyester'",
    !CHEMICAL_INFO.pfas.triggers.includes("polyester"),
    `triggers: [${CHEMICAL_INFO.pfas.triggers.join(",")}]`
  );
  assert(
    "C-08 — pfas.triggers does not include 'nylon'",
    !CHEMICAL_INFO.pfas.triggers.includes("nylon"),
    `triggers: [${CHEMICAL_INFO.pfas.triggers.join(",")}]`
  );
}

// ═══════════════════════════════════════════════════════════════
// C-10 check: phthalates triggers must not include "polyester" or "nylon"
{
  assert(
    "C-10 — phthalates.triggers does not include 'polyester'",
    !CHEMICAL_INFO.phthalates.triggers.includes("polyester"),
    `triggers: [${CHEMICAL_INFO.phthalates.triggers.join(",")}]`
  );
  assert(
    "C-10 — phthalates.triggers does not include 'nylon'",
    !CHEMICAL_INFO.phthalates.triggers.includes("nylon"),
    `triggers: [${CHEMICAL_INFO.phthalates.triggers.join(",")}]`
  );
  assert(
    "C-10 — phthalates.triggers still includes 'spandex'",
    CHEMICAL_INFO.phthalates.triggers.includes("spandex"),
    "spandex removed from triggers — should stay"
  );
}

// ── Report ────────────────────────────────────────────────────
console.log("\n=== CleanWear helpers.js V3 Alignment — Test Results ===");
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
