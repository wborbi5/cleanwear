# V3 Implementation Plan
**Against:** `methodology/cleanwear_scoring_methodology_v2.1.md`  
**Context:** C-01 through C-07 UI fixes already shipped. ISO 17025 fix already shipped. C-08/C-09/C-10 deferred to cutover.  
**Status: AWAITING APPROVAL — no code has been changed**

---

## 1. Files to Create

### `src/scoringRulesV3.js` (~160 lines)

One exported function per rule D-1 through D-12. Each takes a normalized `Product` (§B schema) plus optional brand context, returns a flag object or null.

**Flag object schema:**
```js
{
  chemical: string,           // e.g. "pfas"
  confidence: "high"|"medium"|"low"|null,
  rule: string,               // e.g. "D-1"
  penalty: number,            // applied in C1 computation; 0 for LOW
  source: string,             // citation string
  note: string?,              // explanatory note, optional
  suppressed_to_low: boolean?,// true when cert downgraded MEDIUM→LOW
  data_gap: string?,          // set instead of confidence for D-11 missing subcategory case
}
```

**Key functions:**

| Function | Inputs | Triggers | Returns |
|----------|--------|----------|---------|
| `ruleD1_PFAS(product)` | finish_claims, category | DWR/waterproof/gore-tex finish; Outerwear fallback | flag or null |
| `ruleD2_Formaldehyde(product)` | finish_claims, materials, certifications | wrinkle-free/non-iron claim; cotton processing | flag or null |
| `ruleD3_Phthalates(product)` | materials, certifications | spandex/elastane/lycra | flag or null |
| `ruleD4_BPA(product)` | materials, finish_claims | polyester + stain-resistant (MEDIUM); polyester alone (LOW) | flag or null |
| `ruleD5_Antimony(product)` | materials, certifications | polyester (including recycled) | flag or null |
| `ruleD6_Microplastics(product)` | materials | polyester/nylon/acrylic (any recycled variant too) | flag or null |
| `ruleD7_AzoDyes(product)` | materials, certifications | polyester/nylon/acrylic; suppressed by any RSL cert | flag or null |
| `ruleD8_HeavyMetals(product, brandSafetyTier)` | certifications, materials, brandSafetyTier | uncertified high-risk brands + all-synthetic products | flag or null |
| `ruleD9_Organotins(product)` | finish_claims, certifications | anti-odor/antimicrobial/anti-mold; suppressed by any cert | flag or null |
| `ruleD10_NPEs(product, brandHasZDHC)` | materials, certifications, brandHasZDHC | polyester/nylon, no certs, no ZDHC | flag or null |
| `ruleD11_FlameRetardants(product)` | category, subcategory, finish_claims | Kids Sleepwear without fitted claim; adult Sleepwear LOW | flag or null |
| `ruleD12_Biocides(product)` | finish_claims | antimicrobial/silver/HeiQ/Polygiene/X-Static | flag or null |

**Exports:**
```js
export { ruleD1_PFAS, ..., ruleD12_Biocides };
export const RULES_V3 = [ruleD1_PFAS, ..., ruleD12_Biocides];
```

**D-1 PFAS full spec:**  
The two-level confidence upgrade is the most critical rule to get right. The logic:
```
DWR_KEYWORDS = ["water-resistant","waterproof","dwr","gore-tex","outdry","h2no","event","stain-resistant"]

IF any finish_claim.value is in DWR_KEYWORDS:
  IF that claim has confidence = "declared" → return HIGH
  ELSE                                       → return MEDIUM
ELSE IF category = "outerwear" AND no finish_claims → return LOW
ELSE IF category = "athletic"  AND no finish_claims → return null   ← V3 correction
```

**D-11 Flame Retardants full spec:**  
D-11 requires `subcategory`. When subcategory is absent on a Kids product, the rule cannot evaluate and returns a data_gap flag (not a chemical flag). This data_gap is picked up by `computeC1` and appended to the trace's `data_gaps` array.

**`bluesign (select)` normalization — CRITICAL:**  
The existing `brandDatabase.js` sets `bluesign_certified: true` for brands whose cert array contains `"bluesign (select)"`. V3 treats `(select)` qualifier as product-level only. In `scoringRulesV3.js`, the cert suppression logic for D-3, D-5, D-7 reads from `product.certifications` (the product's own certs), not from the brand record. Rules that take brand context (D-8, D-10) will receive a normalized brand safety tier string, not the raw brand object. This sidesteps the "(select)" problem for rules.

---

### `src/scoringEngineV3.js` (~130 lines)

**Key functions:**

```js
computeC1(product, brandSafetyTier, brandHasZDHC)
  → { score: number, flags: Flag[], disclosures: Flag[], gaps: string[], certBonus: number }

computeC2(brandId, productCerts, brandData)
  → { score: number, source: string, priority_level: 1|2|3|4 } | null

computeC3(category, hasDWR, fiberType)
  → number | null

scoreV3(product, brandEntry)
  → { score: number, confidence_tier: 1|2|3|4, components: Component[], 
      flags: Flag[], disclosures: Flag[], gaps: string[], hasDataGaps: boolean } | null
```

**Penalty table (from §E.2):**
```js
const PENALTY_TABLE = {
  HIGH:         { high: 25, medium: 15, low: 0 },
  MODERATE:     { high: 15, medium: 10, low: 0 },
  LOW_MODERATE: { high:  8, medium:  5, low: 0 },
};

const CHEMICAL_SEVERITY = {
  pfas:                "HIGH",
  formaldehyde:        "HIGH",
  azo_dyes:            "HIGH",
  flame_retardants:    "HIGH",      // Kids/Sleepwear context
  phthalates:          "MODERATE",
  bpa:                 "MODERATE",
  antimony:            "MODERATE",
  heavy_metals:        "MODERATE",
  organotins:          "MODERATE",
  npes:                "MODERATE",
  microplastics:       "LOW_MODERATE",
  antimicrobial_biocides: "LOW_MODERATE",
};
```

**`computeC1` logic:**
1. Run all 12 rules. Collect non-null results.
2. Deduplicate by chemical: when the same chemical is flagged by multiple rules, keep the highest-confidence flag.
3. Accumulate penalties for MEDIUM and HIGH confidence flags only.
4. Apply cert bonus (§E.2 Step 3): +8 per recognized cert, capped at +20. Applied after penalty deduction.
5. Clamp to [0, 100]. Excess bonus above 100 is discarded (not carried forward).
6. LOW-confidence flags go to `disclosures` array; D-11 data gaps go to `gaps` array.

**`scoreV3` final formula:**
```js
const WEIGHTS = { c1: 0.45, c2: 0.35, c3: 0.20 };

// Collect available components
// Re-normalize if a component is null (§E.5)
const total_weight = (c1_available ? 0.45 : 0) + (c2_available ? 0.35 : 0) + (c3_available ? 0.20 : 0);
if (total_weight === 0) return null;
const score = Math.round(
  (c1 * (c1_available ? 0.45 : 0) +
   c2 * (c2_available ? 0.35 : 0) +
   c3 * (c3_available ? 0.20 : 0)) / total_weight
);

// Confidence tier
if (all three present)      → TIER_2 ("Strong Evidence")
if (exactly two present)    → TIER_3 ("Partial Data")
if (exactly one present)    → TIER_4 ("Insufficient Data")
if (any product cert = lab) → TIER_1 ("Lab Verified")
```

**Trace structure (§E.6):**  
`scoreV3` returns a trace object matching the structure specified in §E.6, including `priority_level_used` on the C2 component.

---

### `src/brandRegistryV3.js` (~120 lines)

Implements §E.3 priority order. Imports `BRANDS`, `BRAND_BY_NAME` from `brandDatabase.js` and wraps them with V3 priority logic.

**Key export:**
```js
export function lookupBrandC2(brandId, productCerts)
  → { score: number, source: string, sourceUrl: string,
      priority_level: 1|2|3|4, signal_key: string } | null
```

**Priority implementation:**

```
Priority 1: product.certifications (passed in as productCerts)
  Check: oeko-tex → 78, gots → 80, bluesign → 75 (exact match, no "(select)" qualifier)

Priority 2: brand-level certification (brand record from BRAND_BY_NAME)
  hasBrandwideCert(brand, "bluesign") — returns false if cert contains "(select)"
  hasBrandwideCert(brand, "gots")
  hasBrandwideCert(brand, "oeko-tex")
  Score as table in §E.3.

Priority 3: Independent rating, published ≤ 2 years ago
  NRDC PFAS Scorecard (year tag) and Good On You (year tag)
  When same priority: use most recent; ties broken toward lower (conservative) score.

Priority 4: Independent rating, published > 2 years ago
  Same signals but triggers one confidence tier downgrade on the overall score.
  score returned is the same; calling code in scoreV3 applies downgrade.

Priority 5 (tie-break): median of same-level signals.
```

**`hasBrandwideCert` helper:**
```js
function hasBrandwideCert(brand, certName) {
  // returns false for "(select)" qualifiers — those are product-level only
  return (brand.certs || []).some(c => 
    c.toLowerCase().includes(certName) && !c.toLowerCase().includes("(select)")
  );
}
```

**NRDC and Good On You score tables:**
```js
const NRDC_SCORES  = { "A+": 90, A: 82, B: 68, C: 52, D: 38, F: 28 };
const GOY_SCORES   = { "great": 82, "good": 70, "it's a start": 48,
                       "not good enough": 35, "we avoid": 22 };
```

---

### `src/categoryBenchmarksV3.js` (~70 lines)

Static table of §E.4 constants. One exported function.

```js
export function resolveBenchmark(category, hasDWR, fiberType)
  → number | null
```

**`fiberType`** is derived from materials: `"natural"` if the dominant fiber (highest %) is organic cotton, cotton, linen, hemp, wool, cashmere, silk; `"synthetic"` otherwise.

**`hasDWR`** is `true` if any finish_claim fires Rule D-1 at MEDIUM or HIGH.

**Benchmark table (verbatim from §E.4):**
```js
const BENCHMARKS = {
  "Athletic_synthetic_dwr":   28,
  "Athletic_synthetic_nodwr": 48,
  "Athletic_natural":         65,
  "Outerwear_dwr":            30,
  "Outerwear_nodwr":          55,
  "Casual_synthetic":         50,
  "Casual_natural":           70,
  "Underwear_synthetic":      42,
  "Underwear_natural":        65,
  "Sleepwear_synthetic":      42,
  "Sleepwear_natural":        62,
  "Kids":                     38,  // always 38 regardless of fiber type
  "Formal_wrinkle":           58,  // has wrinkle-free claim
  "Formal_nowrinkle":         68,  // no wrinkle claim
  "Unknown":                  null,
};
```

Resolution fallback: `Unknown` → return null (C3 excluded from score).

---

### `scripts/rescore-new-products.js` (~120 lines)

Node.js script. Run manually; does NOT modify `newProducts.json`.

**Operation:**
1. Read `src/newProducts.json`
2. For each product: normalize material string (`"Nylon, Spandex"` → `[{name:"Nylon", pct:85}, {name:"Spandex", pct:15}]`) using `parseMaterialString()` from `productDatabase.js` logic
3. Construct minimal V3 Product object (no finish_claims, no subcategory from this data)
4. Look up brand from `brandRegistryV3.js`
5. Run `scoreV3(product, brand)`
6. Write each result with both original score and v3 score
7. Write output to `data/newProducts.v3.json`
8. Print distribution report to stdout

**Required output format:**
```
=== newProducts.json V3 Rescore Report ===
Total products:        1000
V3 scored:             NNN (NN%)
V3 null (no data):     NNN (NN%)

Score distribution (V3):
  0–25:  NNN
  26–50: NNN
  51–75: NNN
  76–100: NNN

Divergence (|v2_score - v3_score| > 15):
  NNN products diverge by > 15 pts
  
  Top 20 divergent:
  ID        | Brand           | Product                | V2  | V3  | Delta
  ----------|-----------------|------------------------|-----|-----|------
  prod_XXXX | Brand Name      | Product Name           |  NN |  NN |  NN
  ...
```

---

### `tests/scoringEngineV3.test.js` (~220 lines)

Uses Node.js `assert` or Jest (whichever is installed; check `package.json`). Each test calls `scoreV3(product, brand)` directly with a hardcoded product fixture and asserts against expected values.

**12 test cases with full input fixtures and expected outputs:**

| # | Product | Expected score (±2) | Expected flags | Expected tier |
|---|---------|---------------------|----------------|---------------|
| T1 | Lululemon Align Leggings — Nylon 81%, Lycra 19%, Athletic, no certs | **66** | phthalates MED, microplastics MED, azo LOW (disclosure) | Tier 2 |
| T2 | Uniqlo HEATTECH Ultra Warm — Polyester 47%, Acrylic 32%, Rayon 16%, Spandex 5%, Athletic, finish: moisture-wicking | **60** | phthalates MED, antimony MED, microplastics MED | Tier 2 |
| T3 | Patagonia Capilene Cool Shirt — Recycled Poly 88%, Spandex 12%, Athletic, cert: bluesign | **81** | microplastics MED; phthalates/antimony/azo suppressed to LOW; C2 = 75 (bluesign priority 2) | Tier 2 |
| T4 | TNF Gore-Tex Shell — Nylon 85%, Poly 15%, Outerwear, finish: waterproof (declared) + gore-tex (declared), no certs | **43** | PFAS HIGH, antimony MED, microplastics MED; C2 = NRDC F = 28 | Tier 2 |
| T5 | Kids synthetic pajama — Polyester 100%, category: Kids, subcategory: Sleepwear, no fitted claim | Score varies by brand; **flame_retardants HIGH fires** | flame_retardants HIGH, antimony MED, microplastics MED | — |
| T6 | GOTS organic cotton tee — Organic Cotton 100%, Casual, cert: GOTS | **≥82** | No MEDIUM/HIGH chemical flags; cert bonus +8; phthalates/azo suppressed (no elastane/synthetics to trigger) | Tier 2 |
| T7 | Synthetic product, unknown brand — Polyester 100%, Athletic, no certs | C2 = null; **Tier 3**; final score ~70–75 (C1+C3 only, re-normalized) | antimony MED, microplastics MED | Tier 3 |
| T8 | Declared Gore-Tex jacket — finish: "gore-tex", confidence: "declared" | PFAS fires at **HIGH confidence** (not MEDIUM) | PFAS HIGH | — |
| T9 | Athletic nylon tee, no DWR claim — Nylon 88%, Elastane 12%, Athletic, no finish_claims | **PFAS does NOT fire** | No PFAS flag at any confidence | — |
| T10 | Wrinkle-free cotton dress shirt — Cotton 100%, Formal, finish: "wrinkle-free" (declared) | **Formaldehyde fires at HIGH confidence** | Formaldehyde HIGH; Cotton LOW (overridden by HIGH) | — |
| T11 | OEKO-TEX certified synthetic tee — Polyester 88%, Spandex 12%, cert: OEKO-TEX Standard 100 | C1 = **100** (all suppressed/downgraded; cert bonus applies) | phthalates LOW (downgraded), antimony LOW (downgraded), azo suppressed | Tier 2 |
| T12 | Lululemon redux (same as T1 with explicit brand lookup) — confirms C2 = NRDC C = 52 | **66** | Same as T1; C2 priority path must be priority 3 (NRDC 2023) | Tier 2 |

**Test for T4 note on TNF bluesign:** The test fixture for T4 must set `brand.certs = ["bluesign (select)"]` which `hasBrandwideCert(brand, "bluesign")` returns `false`. The brand registry then falls through to NRDC F = 28. This validates the "(select)" normalization.

---

## 2. Files to Modify

### `src/CleanWear.jsx` — shadow scoring integration

**Location:** Inside `doScan()` callback, after existing V2 `calculateScore(pd)` call (line ~284).

**Change:** Import `scoreV3` and run it in parallel with V2. V2 result continues to drive the displayed UI. V3 result is logged to the scan record only.

```js
// EXISTING (unchanged):
const sc2 = calculateScore(pd);
if (!sc2.v2) {
  setError("Sorry, there is not enough public information to score this product.");
  return;
}
setResult(pd); setScore(sc2); navigateToResults();

// ADD BELOW EXISTING (after setScore):
// V3 shadow scoring — does NOT affect displayed score
import { scoreV3 } from "./scoringEngineV3.js";
import { BRAND_BY_NAME as BRAND_BY_NAME_V3 } from "./brandDatabase.js";
try {
  const brandEntry = BRAND_BY_NAME_V3[(pd.brand || "").toLowerCase().trim()] || null;
  const v3Result = scoreV3(pd, brandEntry);
  // Passed to logScan for persistence only
  sc2._v3 = v3Result;   // attach to score object for logScan consumption
} catch (err) {
  console.warn("[V3 shadow] scoring failed:", err.message);
}
```

**`calculateScore` in CleanWear.jsx (V1):**  
Add deprecation header comment at top of function:
```js
// ⚠️ DEPRECATED — V1 scoring. Do not extend. Remove at V3 cutover.
// V2 result (score.v2) drives displayed score; V3 is shadow-logged.
function calculateScore(pd) {
```

**No other changes to CleanWear.jsx.** Displayed score, result routing, and analytics calls are untouched.

---

### `src/supabase.js` — extend logScan

**Current signature (line 32):**
```js
export async function logScan({ query, score, brand, product, category }) {
```

**New signature:**
```js
export async function logScan({ query, score, brand, product, category,
                                 score_v3, trace_v3, confidence_tier_v3 }) {
```

**Extended insert (add three new fields to the `.insert()` call):**
```js
await supabase.from('scans').insert({
  query, score, brand, product, category,
  posthog_distinct_id: ...,
  user_id: ...,
  scanned_at: ...,
  // V3 shadow fields (nullable; null if V3 not computed or brand not found)
  score_v3:           score_v3 ?? null,
  trace_v3:           trace_v3 ?? null,
  confidence_tier_v3: confidence_tier_v3 ?? null,
})
```

The three new fields are nullable — if V3 produces null (insufficient data), or if the shadow scoring try/catch catches an error, they remain null in the database. This is non-breaking for existing scan records.

---

### `src/scoringEngine.js` (V2) — deprecation header only

**No logic changes.** Add at top of file:
```js
// ⚠️ DEPRECATED — V2 scoring engine. Do not extend.
// Active during parallel scoring period (methodology §I.3).
// Removed at V3 cutover. V3 is in src/scoringEngineV3.js.
```

---

### `supabase/migrations/003_v3_shadow_scoring.sql` (new file)

```sql
-- ============================================================
-- CleanWear: V3 shadow scoring columns
-- Applied as part of V3 parallel scoring period (§I.3).
-- These columns store V3 scores without affecting the displayed
-- V2 score. All three columns are nullable — existing rows and
-- scans where V3 returns null keep NULL here.
-- ============================================================

ALTER TABLE public.scans
  ADD COLUMN IF NOT EXISTS score_v3           INTEGER,
  ADD COLUMN IF NOT EXISTS trace_v3           JSONB,
  ADD COLUMN IF NOT EXISTS confidence_tier_v3 INTEGER;

CREATE INDEX IF NOT EXISTS idx_scans_score_v3
  ON public.scans(score_v3) WHERE score_v3 IS NOT NULL;

-- ============================================================
-- ROLLBACK (run this to undo if needed):
-- ALTER TABLE public.scans DROP COLUMN IF EXISTS score_v3;
-- ALTER TABLE public.scans DROP COLUMN IF EXISTS trace_v3;
-- ALTER TABLE public.scans DROP COLUMN IF EXISTS confidence_tier_v3;
-- DROP INDEX IF EXISTS idx_scans_score_v3;
-- ============================================================
```

**Migration will NOT be executed until explicitly approved.** It will be shown for review before the `mcp__919ca92e__execute_sql` or `mcp__919ca92e__apply_migration` call is made.

---

## 3. Files Explicitly NOT Modified

| File | Status | Reason |
|------|--------|--------|
| `src/results/helpers.js` | **Deferred to cutover** | Must stay V2-aligned during parallel scoring period. Rewriting now would break displayed results before V3 is live. **Requires V3 alignment before cutover can proceed.** |
| `src/newProducts.json` | **Read-only** | Rescore script writes to new file `data/newProducts.v3.json` |
| `api/vision.js` | Out of scope | Vision uses Claude API; prompt changes are a separate decision |
| `src/CleanWear.jsx calculateScore()` (V1) | Deprecation comment only | Still called by the V2 result path |

**`results/helpers.js` cutover prerequisites** (added to Stage 2 checklist):
- Rewrite `CHEMICAL_INFO.pfas.triggers` to match V3 D-1 (remove "polyester", "nylon")
- Rewrite `CHEMICAL_INFO.phthalates.triggers` to match V3 D-3 (remove "polyester", "nylon")
- Gate `pfas.sweatNote` Zheng 3,252× to Kids category only (V3 §E.4)
- Verify all `triggers` arrays align with V3 rules

---

## 4. Test Suite — 12 Cases

See test file design in §1 (`tests/scoringEngineV3.test.js`) above.

**Test runner:** Check for Jest in `package.json`. If not installed, tests will be written using Node.js built-in `assert` module and run with `node tests/scoringEngineV3.test.js`. Report install preference before writing.

**Pass criteria:**
- Each score within ±2 points of expected
- Each expected flag set exact match (chemical + confidence level)
- No unexpected flags at MEDIUM or HIGH confidence
- T4 specifically validates that TNF's "bluesign (select)" does NOT produce priority-2 C2 = 75

---

## 5. Rescore Script Output Requirements

See §1 (`scripts/rescore-new-products.js`) for full format. Key requirements:
- Output file: `data/newProducts.v3.json` — same shape as `newProducts.json` plus a `score_v3`, `trace_v3`, and `v3_null_reason` field on each product
- Products where V3 returns null: mark as `score_v3: null`, `v3_null_reason: "brand not in registry"` or `"materials string unparseable"` or `"category unknown"`
- Do NOT use V3 scores in the UI until the rescore has been reviewed and approved

---

## 6. Rollout Staging

### Stage 0 (this prompt — shadow scoring live)
- Code complete: scoringRulesV3.js, scoringEngineV3.js, brandRegistryV3.js, categoryBenchmarksV3.js
- Tests passing (all 12)
- Shadow scoring wired in CleanWear.jsx — V3 runs on every scan, result logged to `score_v3` column
- V2 score still displayed to users
- Rescore script runs, report generated

### Stage 1 (optional — gated rollout)
- Feature flag `VITE_V3_SCORING=true` enables V3 display for a subset of users
- Monitor: distribution of V3 scores vs V2; user drop-off on rescan
- Not part of this prompt

### Stage 2 — Full cutover (future prompt)
- `helpers.js` rewritten to V3 inference rules (C-08, C-09, C-10 from audit)
- Toxicologist review obtained and feedback incorporated into methodology
- Shadow scoring divergence reviewed — all divergences >15 pts documented
- `newProducts.v3.json` rescore reviewed and approved
- `scan_version: 3` written on new scans
- V2 code deprecated and removed
- Migration: UI uses V3 score as `score` field; `score_v3` shadow column becomes the primary

**Cutover prerequisites checklist:**
- [ ] `results/helpers.js` rewritten (C-08, C-09, C-10)
- [ ] Toxicologist review of methodology v2.1 complete
- [ ] Shadow-scoring divergence report reviewed by Wyatt
- [ ] `newProducts.v3.json` rescore report reviewed by Wyatt
- [ ] Trace persistence verified in Supabase (`trace_v3` populated on live scans)
- [ ] `scan_version: 3` column updated on cutover migration
- [ ] All tests passing after helpers.js rewrite

---

## 7. Major UI Fixes from Audit (M-01 through M-05)

These fixes are independent of the scoring engine. Applied in Step 5, as a separate commit from engine changes.

### M-01 — LandingPage.jsx methodology section weights
**File:** `src/LandingPage.jsx` · ~line 639–682  
**Change:** Update weight badges and step descriptions.

BEFORE (three objects in the methodology steps `.map()`):
```js
{ num: "01", weight: "25%", title: "Regulatory flags", source: "EU REACH Annex XVII",
  desc: "We map each garment's category and materials against restricted chemical classes..." },
{ num: "02", weight: "35%", title: "Brand safety record", source: "NRDC · OEKO-TEX · GOTS · Good On You",
  desc: "Scores pull from independent brand rating databases..." },
{ num: "03", weight: "40%", title: "Category research benchmarks", source: "Mamavation · EWG · Zheng et al. 2025",
  desc: "Published testing data for specific garment types..." },
```

AFTER:
```js
{ num: "01", weight: "45%", title: "Material chemical risk", source: "EU REACH Annex XVII · 12 inference rules",
  desc: "We apply 12 inference rules to declared materials and finish treatments — mapping fiber types and chemical finish claims to regulated chemical categories." },
{ num: "02", weight: "35%", title: "Brand safety record", source: "NRDC · OEKO-TEX · GOTS · Good On You",
  desc: "Scores pull from independent brand rating databases. A brand that earned an A on the NRDC PFAS scorecard outranks one with no public policy — regardless of marketing claims." },
{ num: "03", weight: "20%", title: "Category research benchmarks", source: "Mamavation · EWG · Zheng et al. 2025",
  desc: "Published testing data for specific garment types. Activewear tested at 68% positive for PFAS. Children's textiles show sweat-amplified dermal transfer in published studies." },
```

### M-02 — CleanWear.jsx "lab test results" phrasing
**File:** `src/CleanWear.jsx` · line 351  
BEFORE: `"Materials, certifications, and lab test results from published research and regulatory databases online."`  
AFTER: `"Materials, certifications, and published research from regulatory bodies and peer-reviewed studies — no lab testing required."`

### M-03 — LandingPage.jsx "100% cited sources" hero stat
**File:** `src/LandingPage.jsx` · line 476  
BEFORE: `{ n: "100%", l: "cited\nsources" }`  
AFTER: `{ n: "100%", l: "scores cite\na source" }`

### M-04 — SharePage.jsx "Tested positive for X" phrasing
**File:** `src/pages/SharePage.jsx` · line 76  
BEFORE: `` return topChemical ? `Tested positive for ${topChemical} — the kind of chemical the EU is phasing out.` ``  
AFTER: `` return topChemical ? `Flagged for ${topChemical} — the kind of chemical the EU is phasing out.` ``

### M-05 — QuickDetective.jsx nylon formaldehyde
**File:** `src/QuickDetective.jsx` · line 45  
BEFORE: `nylon: { name: "Nylon", safety: 38, chems: ["Microplastics", "Formaldehyde resins"], risk: "high" },`  
AFTER: `nylon: { name: "Nylon", safety: 38, chems: ["Microplastics"], risk: "moderate-high" },`

(Note: `risk` changed from `"high"` to `"moderate-high"` to align with V3, which does not flag formaldehyde for plain nylon.)

### M-06 — Already shipped (ISO 17025 CertifyPage fix).

---

## 8. Backward Compatibility

- **Existing scans** in the `scans` table have `scan_version = 1`. They display with the existing UI (V2 score). A "scored with original algorithm — re-scan for updated score" notice (per §I.2) is already specified but not yet wired to the UI. This notice is not implemented in this prompt — it is a cutover concern.
- **`score_v3` column** is nullable. All existing rows remain with `score_v3 = null`. No retroactive re-scoring.
- **`brandDatabase.js`** is imported by V3 but not modified. `BRAND_BY_NAME` is used as read-only input to `brandRegistryV3.js`.

---

## 9. Risk Assessment

| # | Risk | Probability | Mitigation |
|---|------|-------------|------------|
| R1 | **V3 shadow scoring throws an uncaught error, breaking the scan flow** | Low-Medium | Entire V3 call is wrapped in try/catch in CleanWear.jsx. Any error is logged as a console.warn and V3 fields are left null. V2 path is unaffected. |
| R2 | **brandRegistryV3.js "(select)" normalization produces wrong C2 for brands like Patagonia** | Medium | T3 explicitly tests Patagonia Capilene: bluesign is product-level (cert in `product.certifications`) not brand-wide. If the test passes, the normalization is correct. The test must be written and must pass before wiring to production. |
| R3 | **Category benchmark resolution returns null for common categories, lowering confidence tier** | Low | Fallback to `"Unknown"` returns null → C3 excluded → Tier 3. This is correct behavior. However, categories from the scan API may come in as free-text strings ("Athletic Shirt", "Clothing") that don't match the enum. Need a normalization step in `resolveBenchmark` that maps common synonyms before lookup. Plan: add synonym map in `categoryBenchmarksV3.js`. |
| R4 | **The new Supabase migration alters the `scans` table in production before the shadow scoring code is deployed, leaving code that tries to write `score_v3` hitting a column-not-found error on older deploys** | Medium | Migration (Step 2) runs AFTER the code changes are deployed (Step 1) and after a build+test pass. The migration adds nullable columns — if the code somehow runs without the columns, the `.insert()` will fail gracefully with a Supabase error, caught by the existing try/catch in `logScan()`. Verify column existence in Supabase dashboard before deploy. |
| R5 | **`newProducts.json` material strings are in non-standard formats ("Recycled Polyester, Spandex" vs "85% Nylon") that the rescore script's `parseMaterialString` function can't parse** | Medium | `parseMaterialString` from `productDatabase.js` already handles comma-separated strings by splitting evenly. The rescore script should log unparseable entries to a separate `v3_null_reason` field rather than crashing. Any product with `v3_null_reason` is excluded from distribution statistics and flagged for manual review. |

---

## Phase 2 Execution Order (after approval)

1. Create `scoringRulesV3.js`, `scoringEngineV3.js`, `brandRegistryV3.js`, `categoryBenchmarksV3.js` → run tests → report
2. **Ask for explicit approval** → run Supabase migration
3. Wire V3 into `CleanWear.jsx` + extend `supabase.js` → build → verify V2 still displays
4. Run `rescore-new-products.js` → report distribution → await review
5. Apply M-01 through M-05 UI fixes → build → report
6. Final summary

**YOU MAY NOT (without further approval):**
- Delete V1 or V2 code (deprecation comments only)
- Change the displayed score from V2 to V3
- Modify `newProducts.json` directly
- Rewrite `results/helpers.js`
- Push to production / merge to main
- Change `api/vision.js` Claude prompts
