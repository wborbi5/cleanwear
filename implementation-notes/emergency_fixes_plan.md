# Emergency Fixes Implementation Plan
**Prepared:** 2026-04-24  
**Status: AWAITING APPROVAL — no code has been changed**  
**Execution order after approval:** Fix 1 → Fix 3 → Fix 2 → Fix 4

---

## FIX 1 — Remove "Cross-referencing 14 databases" claim

### Files changing
- `src/design/components/StateBlock.jsx` — one string replacement, one comment update

### Full codebase search results for "14 databases" and numerical database claims

Searched the entire `src/`, `api/`, and `scripts/` directories for `14 database`, `14 sources`, and numeric database count patterns.

**Findings:**

| File | Line | Content | Action needed? |
|------|------|---------|----------------|
| `src/design/components/StateBlock.jsx` | 95 | `// Per §5.4. "Cross-referencing 14 databases…" cadence.` | Yes — update comment |
| `src/design/components/StateBlock.jsx` | 100 | `"Cross-referencing 14 databases…",` | **Yes — replace string** |
| `src/CleanWear.jsx` | 279 | `"Searching product database..."` | No — refers to internal DB, no count claim |
| `src/CleanWear.jsx` | 358 | `"...lab test results from published research and regulatory databases online."` | No — vague plural with no count, defensible |
| `src/CleanWear.jsx` | 118 | `"Specific product not in database — score reflects brand-level safety data only"` | No — data gap message, accurate |
| `src/LandingPage.jsx` | 480 | `{ n: "1,200+", l: "products\nin database" }` | No — refers to their own product DB, count is actually understated (2,641 exist). Accurate. |
| `src/LandingPage.jsx` | 651 | `"brand rating databases"` | No — general plural reference in methodology, no count |
| `src/LandingPage.jsx` | 1016 | `"score poorly in our database"` | No — own DB, accurate |

**Only one change required: `StateBlock.jsx` line 100.**

### Before/after

**`src/design/components/StateBlock.jsx` lines 94–103:**

BEFORE:
```jsx
// ───────────────────────────────────────────────────────────
// ScanProgress — animated loading state for scan in flight.
// Per §5.4. "Cross-referencing 14 databases…" cadence.
// ───────────────────────────────────────────────────────────
export function ScanProgress({ step }) {
  const defaultSteps = [
    "Reading fabric composition…",
    "Cross-referencing 14 databases…",
    "Flagging restricted chemicals…",
    "Building safety score…",
  ];
```

AFTER:
```jsx
// ───────────────────────────────────────────────────────────
// ScanProgress — animated loading state for scan in flight.
// Per §5.4.
// ───────────────────────────────────────────────────────────
export function ScanProgress({ step }) {
  const defaultSteps = [
    "Reading fabric composition…",
    "Checking brand safety records…",
    "Flagging restricted chemicals…",
    "Building safety score…",
  ];
```

**Rationale for chosen replacement:** "Checking brand safety records…" is what the system actually does — lookups against `BRAND_SAFETY_DATA` (NRDC ratings, Good On You, OEKO-TEX). It's accurate, fits the same slot in the animation cadence, and matches the user's mental model of what "analysis" means here.

**Diff size:** Tiny. 2 lines changed.  
**Side effects:** None. `ScanProgress` is a pure display component. The string change has no downstream logic dependency.

---

## FIX 2 — Audit and clean SPOTLIGHTS and FUN_FACTS

### Files changing
- `src/LandingPage.jsx` — empty the SPOTLIGHTS array; comment out `<ResearchSpotlight>` render site
- `src/CleanWear.jsx` — empty the FUN_FACTS array; guard the useEffect; comment out Research Library render site

---

### SPOTLIGHTS analysis (`src/LandingPage.jsx`, lines 247–256)

Cross-referencing every item against `CITATIONS.md`:

| # | Fact snippet | Source attribution | CITATIONS.md status | Action |
|---|-------------|-------------------|---------------------|--------|
| 1 | "…1,900 microplastic fibers per wash — fibers that end up in your bloodstream." | "Environmental Science & Technology, 2023" | **NEEDS AUDIT** — "individually plausible but use shortened attributions…research assistant to replace each with a proper author-year-journal-DOI citation or drop the stat." | **REMOVE** |
| 2 | "BPA in synthetic clothing leaches 15× faster during exercise when skin temperature exceeds 37°C." | "Journal of Dermatological Science" | **NEEDS AUDIT** — no author, no year, no DOI | **REMOVE** |
| 3 | "Men exposed to high BPA levels showed testosterone levels 30% lower…" | "Reproductive Toxicology, 2022" | **NEEDS AUDIT** — no author, no DOI | **REMOVE** |
| 4 | "The average person absorbs up to 120 different chemicals through their clothing every single day." | "Stockholm University Research" | **NEEDS AUDIT** — no paper, no DOI | **REMOVE** |
| 5 | "Athletic wear is the highest-risk clothing category…" | "Textile Research Journal" | **NEEDS AUDIT** — no author, no year, no DOI | **REMOVE** |
| 6 | "Formaldehyde…is used in 60% of cotton clothing for wrinkle resistance." | "Government Accountability Office" | **NEEDS AUDIT** — no GAO report with this finding | **REMOVE** |
| 7 | "PFAS 'forever chemicals' in waterproof activewear take over 1,000 years to break down." | "Environmental Health Perspectives" | **NEEDS AUDIT** — no author, no year, no DOI | **REMOVE** |
| 8 | "Microplastics from synthetic clothing were found in 80% of human blood samples…" | "Environment International, 2022" | **NEEDS AUDIT** — no author, no DOI | **REMOVE** |

**Result: 0 items pass. All 8 removed. Carousel will be empty.**

### SPOTLIGHTS before/after

**`src/LandingPage.jsx` lines 247–256:**

BEFORE:
```js
const SPOTLIGHTS = [
  { icon: "🧬", fact: "A single polyester gym shirt releases up to 1,900 microplastic fibers per wash — fibers that end up in your bloodstream.", source: "Environmental Science & Technology, 2023" },
  { icon: "🌡️", fact: "BPA in synthetic clothing leaches 15× faster during exercise when skin temperature exceeds 37°C.", source: "Journal of Dermatological Science" },
  { icon: "💪", fact: "Men exposed to high BPA levels showed testosterone levels 30% lower than those with minimal exposure.", source: "Reproductive Toxicology, 2022" },
  { icon: "👕", fact: "The average person absorbs up to 120 different chemicals through their clothing every single day.", source: "Stockholm University Research" },
  { icon: "🏃", fact: "Athletic wear is the highest-risk clothing category — sweat, heat, and friction all accelerate chemical leaching into your body.", source: "Textile Research Journal" },
  { icon: "🧪", fact: "Formaldehyde — the chemical used to preserve lab specimens — is used in 60% of cotton clothing for wrinkle resistance.", source: "Government Accountability Office" },
  { icon: "🌍", fact: "PFAS 'forever chemicals' in waterproof activewear take over 1,000 years to break down. They never leave your body.", source: "Environmental Health Perspectives" },
  { icon: "🔬", fact: "Microplastics from synthetic clothing were found in 80% of human blood samples tested in a landmark 2022 study.", source: "Environment International, 2022" },
];
```

AFTER:
```js
// CITATIONS AUDIT (2026-04-24): All prior SPOTLIGHTS items were flagged NEEDS AUDIT
// in CITATIONS.md — no DOI, no author, unverifiable shortened attributions.
// Removed per emergency-fixes plan. Rebuild with verified DOI-linked citations only.
// See: audit/cleanwear_system_audit.md, CITATIONS.md §"fun-facts content"
const SPOTLIGHTS = [];
```

**`src/LandingPage.jsx` line 734 — render site:**

BEFORE:
```jsx
      <ResearchSpotlight F={F} S={S} />
```

AFTER:
```jsx
      {/* TODO: ResearchSpotlight carousel disabled 2026-04-24 — all items removed by
          citations audit. Carousel will be rebuilt when verified DOI-linked citations
          are available. See CITATIONS.md and implementation-notes/emergency_fixes_plan.md */}
      {/* <ResearchSpotlight F={F} S={S} /> */}
```

---

### FUN_FACTS analysis (`src/CleanWear.jsx`, lines 75–86)

| # | Fact snippet | Source attribution | CITATIONS.md status | Action |
|---|-------------|-------------------|---------------------|--------|
| 1 | "…1,900 microplastic fibers per wash…" | "Environmental Science & Technology, 2023" | **NEEDS AUDIT** | **REMOVE** |
| 2 | "BPA…leaches 15x faster during exercise…" | "Journal of Dermatological Science" | **NEEDS AUDIT** | **REMOVE** |
| 3 | "Men…testosterone 30% lower…" | "Reproductive Toxicology, 2022" | **NEEDS AUDIT** | **REMOVE** |
| 4 | "…120 different chemicals…every single day." | "Stockholm University Research" | **NEEDS AUDIT** | **REMOVE** |
| 5 | "Athletic wear is the highest-risk…" | "Textile Research Journal" | **NEEDS AUDIT** | **REMOVE** |
| 6 | "Formaldehyde…60% of cotton clothing…" | "Government Accountability Office" | **NEEDS AUDIT** | **REMOVE** |
| 7 | "PFAS…take over 1,000 years to break down." | "Environmental Health Perspectives" | **NEEDS AUDIT** | **REMOVE** |
| 8 | "Microplastics…80% of human blood samples…" | "Environment International, 2022" | **NEEDS AUDIT** | **REMOVE** |
| 9 | "Nylon-spandex compression wear creates the highest chemical absorption rate…" | "Journal of Exposure Science" | **NOT IN CITATIONS.md** | **REMOVE** |
| 10 | "Anti-odor treatments…nanosilver particles that accumulate in your liver and kidneys…" | "Nanotoxicology Research" | **NOT IN CITATIONS.md** | **REMOVE** |

**Result: 0 items pass. All 10 removed. Two render sites affected.**

### FUN_FACTS changes in `src/CleanWear.jsx`

**Lines 75–86 (array definition):**

BEFORE:
```js
const FUN_FACTS = [
  { icon: "🧬", fact: "A single polyester gym shirt releases up to 1,900 microplastic fibers per wash...", source: "Environmental Science & Technology, 2023" },
  ...  // (10 items total)
];
```

AFTER:
```js
// CITATIONS AUDIT (2026-04-24): All prior FUN_FACTS items were flagged NEEDS AUDIT
// in CITATIONS.md — no DOI, no author, unverifiable attributions. Items 9-10 were
// not in CITATIONS.md at all. Removed per emergency-fixes plan.
// See: audit/cleanwear_system_audit.md, CITATIONS.md §"fun-facts content"
const FUN_FACTS = [];
```

**Line 235 (useEffect guard — prevents divide-by-zero / NaN modulo on empty array):**

BEFORE:
```js
useEffect(() => { const i = setInterval(() => setFactIdx(x => (x + 1) % FUN_FACTS.length), 7000); return () => clearInterval(i); }, []);
```

AFTER:
```js
useEffect(() => { if (!FUN_FACTS.length) return; const i = setInterval(() => setFactIdx(x => (x + 1) % FUN_FACTS.length), 7000); return () => clearInterval(i); }, []);
```

**Line 443 — Research Library section inside `renderLearn()`:**

The Research Library JSX is embedded in the massive single-line `renderLearn` function. The target section is:

```jsx
<div className="lrn-c"><h3>Research Library</h3>{FUN_FACTS.map((f, i) => (...)}</div>
```

Because `renderLearn` is a single minified line, the surgical change is to replace the FUN_FACTS `.map()` call with a commented placeholder note:

BEFORE (within renderLearn, the Research Library div):
```jsx
<div className="lrn-c"><h3>Research Library</h3>{FUN_FACTS.map((f, i) => (<div key={i} style={{ padding: "14px 0", borderBottom: i < FUN_FACTS.length - 1 ? "1px solid var(--bd)" : "none" }}><div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}><span style={{ fontSize: 20, minWidth: 28 }}>{f.icon}</span><div><div style={{ fontSize: 14, lineHeight: 1.6 }}>{f.fact}</div><div style={{ fontSize: 11, color: "var(--tx4)", marginTop: 6, fontStyle: "italic" }}>{f.source}</div></div></div></div>))}</div>
```

AFTER:
```jsx
{/* TODO: Research Library hidden 2026-04-24 — FUN_FACTS emptied by citations audit.
    Rebuild with DOI-verified citations. See emergency_fixes_plan.md */}
```

**Note on fact card carousel in scanner view:** The `factIdx` state is advanced by the line 235 useEffect but the rotating card may have already been removed from `renderScanner()` — it does not appear in the scanner JSX at lines 341–371. The CSS classes `.facts`, `.fact-card` etc. are defined but no matching JSX was found in the scanner render path during this audit. The useEffect guard added above ensures no error occurs if the state setter runs against an empty array. At execution time, confirm no `factIdx`-consuming JSX exists outside `renderLearn` before proceeding.

**Diff size:** Medium. 3 targeted edits in 2 files. The renderLearn change replaces a large block with a short comment.  
**Side effects:** Research Library tab in Learn will show no "Research Library" section. The rotating fact card (if still present in scanner view) will stop rotating since the array is empty and the interval is guarded. Both are correct and intentional.

---

## FIX 3 — Add disclaimer to ResultsPage

### File changing
- `src/ResultsPage.jsx`

### Placement

The results page has this structure:
1. Hero (score ring, full screen) — ends around line 264
2. Verdict sentence — lines 266–286
3. Details container opens — line 289
4. "Why this score" section — lines 292–351
5. "What's in this fabric" section — lines 355–392
6. **← INSERT DISCLAIMER HERE** (between chemicals and alternatives)
7. "Safer alternatives" section — lines 395–456
8. "Customize exposure" section — line 459+

The insertion point is between the closing `</div>` of the chemicals section (line ~393) and the `{/* ── SAFER ALTERNATIVES ── */}` comment (line ~395).

### Before/after

BEFORE (lines 393–396):
```jsx
          )}
        )}

        {/* ── SAFER ALTERNATIVES ── */}
```

AFTER:
```jsx
          )}
        )}

        {/* ── METHODOLOGY FOOTNOTE ── */}
        <div style={{
          padding: "16px 0",
          borderTop: "0.5px solid rgba(255,255,255,0.06)",
          fontSize: 12,
          color: "#52525b",
          lineHeight: 1.6,
        }}>
          CleanWear scores are category-level risk estimates based on material composition
          and brand public records. They are not product-specific laboratory test results.
        </div>

        {/* ── SAFER ALTERNATIVES ── */}
```

**Styling rationale:**
- `fontSize: 12` — footnote scale, below body text
- `color: "#52525b"` — matches the existing muted text color used throughout ResultsPage (e.g. "out of 100" subtitle, source attribution text). Already in use at line 255 (`v2` source count line) and line 436 (alt score "Score" label).
- `borderTop` — matches the `section` style primitive used for all other section dividers in this file (`0.5px solid rgba(255,255,255,0.06)`)
- No warning icon, no colored background, no badge — purely a footnote
- Always visible (not conditional on any state), not hidden in a dropdown

**Check for existing disclaimer:** Searched the file. The footer disclaimer "Scores are risk estimates based on peer-reviewed research, not lab test results" exists only in `LandingPage.jsx` footer (line ~1137), not in `ResultsPage.jsx`. The "Partial Data" and "Insufficient Data" confidence badges in `CONFIDENCE` (lines 125–127) convey uncertainty about data completeness, but none state explicitly that scores are not lab results. No merge needed — this is additive.

**Diff size:** Small. 10 lines added.  
**Side effects:** None. Purely additive. No state, no logic.

---

## FIX 4 — newProducts.json Investigation (Diagnose Only — No Code Changes)

### a) What `scripts/generate-products.cjs` does

The script generates a product matrix by crossing a hardcoded `BRANDS` dictionary (52 brands) against a `CATEGORIES` dictionary (15 product types). Scores are assigned as follows:

1. **Brand baseline score** — each brand in the script has a hardcoded integer (e.g., `nike: 36`, `patagonia: 91`, `shein: 12`). These were manually set by a developer, not computed by the scoring engine.

2. **Category adjustment** — `estimatedScore = brand.score + (category === "Casual" ? +8 : category === "Underwear" ? -2 : -5)`

3. **Material adjustment** (in `exportToModule()`) — further adjusts `estimatedScore` by keyword matching on the resolved material string:
   - organic → +10
   - hemp/linen → +8
   - merino → +6
   - polyester (non-recycled) → -8
   - nylon → -5
   - acrylic → -10
   - Final score clamped to 5–98

4. The script's `--export` flag writes to `src/productDatabase.js` — which is the **main static brand database**, not `newProducts.json`.

### b) Does the script produce `newProducts.json`?

**No.** The script generates `data/product-matrix.json` (via `--generate`) and `src/productDatabase.js` (via `--export`). It does not write to `src/newProducts.json`. The two files serve different content:

- `data/product-matrix.json`: ~641 products, brands like Nike/Patagonia/Shein from the script's BRANDS list
- `src/newProducts.json`: 1,000 products with entirely different brands (Naadam, Quince, Outerknown, REI Co-op, Eddie Bauer, Tommy Hilfiger, Outdoor Voices, Amazon Essentials Sports Bra, etc.)

None of the 10 sampled `newProducts.json` brands appear in `generate-products.cjs`'s BRANDS dictionary. The script did not generate this file.

### c) Spot-check of 10 random products (seed=42)

| ID | Brand | Product | Category | Score | Materials | Chemicals |
|----|-------|---------|----------|-------|-----------|-----------|
| prod_1296 | Amazon Essentials | Sports Bra | Athletic | **47** | Cotton | `[]` |
| prod_0756 | Naadam | Turtleneck | Casual | **70** | Cashmere | `[]` |
| prod_0667 | Outdoor Voices | Crew Neck Tee | Casual | **48** | Recycled Polyester, Spandex | `[]` |
| prod_1401 | Quince | Long Sleeve Tee | Casual | **70** | Merino Wool | `[]` |
| prod_0923 | Tommy Hilfiger | Polo Shirt | Casual | **74** | Cotton | `[]` |
| prod_0892 | REI Co-op | Insulated Jacket | Outerwear | **43** | Merino Wool, Nylon | `[]` |
| prod_0870 | Eddie Bauer | Rain Jacket | Outerwear | **43** | Cotton, Polyester | `[]` |
| prod_0784 | Outerknown | Boardshort | Casual | **55** | TENCEL Lyocell | `[]` |
| prod_1396 | Quince | Crew Neck Tee | Casual | **70** | Cashmere | `[]` |
| prod_0746 | Naadam | Turtleneck | Casual | **70** | Merino Wool | `[]` |

**Anomalies flagged:**

1. **`chemicals` is always `[]`** across all 10 samples. The deterministic `deriveChemicals()` function in `productDatabase.js` would produce non-empty chemicals for Recycled Polyester/Spandex (prod_0667: antimony, microplastics, phthalates), Cotton/Polyester (prod_0870: antimony, microplastics, bpa, formaldehyde), Merino Wool/Nylon (prod_0892: microplastics). An empty chemicals array on these products indicates `deriveChemicals()` was never run.

2. **Amazon Essentials Sports Bra scores 47** — Cotton Sports Bra, Athletic category. The V2 scoring engine running on Cotton + Athletic would produce something around 38–50 depending on brand data. But `brandDatabase.js` has Amazon Essentials at `confidence_tier: 3` with no NRDC or Good On You data — the brand component would score 50, category benchmark 35, REACH 65. Weighted avg ≈ 47. This is plausible but coincidental-looking.

3. **Tommy Hilfiger Polo Shirt scores 74** — Cotton, Casual. `brandDatabase.js` has Tommy Hilfiger `good_on_you_rating: null, nrdc_pfas_rating: null, oeko_tex_certified: true (select)`. The V2 engine without brand data would score mainly on category (cotton casual = ~70). 74 is close but slightly high. `brandDatabase.js` Tommy Hilfiger actual score is 52 overall.

4. **Two "Naadam Turtleneck" entries** (prod_0756 score 70 with Cashmere, prod_0746 score 70 with Merino Wool) — same brand, same product name, different materials, same score. A deterministic formula would produce different scores for cashmere vs merino.

5. **REI Co-op Insulated Jacket scores 43** despite Merino Wool/Nylon materials — the deterministic V2 engine for a brand with no recorded data and mixed natural/synthetic materials would likely produce 50–60 range. 43 seems low.

### d) Consumers of `newProducts.json` in `src/`

One consumer only:

**`src/productDatabase.js`, lines 7 and 530–550:**
```js
import NEW_PRODUCTS_RAW from "./newProducts.json";
// ...
const newProducts = NEW_PRODUCTS_RAW.map(p => {
  const materials = parseMaterialsString(p.materials);
  const chemicals = deriveChemicals(materials, []);
  (p.chemicals || []).forEach(c => { if (!chemicals.includes(c)) chemicals.push(c); });
  return {
    id: p.id, brand: p.brand, name: p.name, category: p.category,
    score: p.score,          // ← raw score from JSON, NOT recomputed
    materials,
    chemicals,               // ← deriveChemicals() DOES run here
    certifications: [],
    origin: "Unknown",
    tier: p.tier,
    materialsDisplay: p.materials || materials.map(m => m.name).join(", "),
  };
});
PRODUCTS.push(...newProducts);
```

Key finding: `productDatabase.js` **does** run `deriveChemicals()` on the materials when building the product objects. So the displayed chemicals at runtime will be correct. But the **score** (`p.score`) is used as-is from the JSON — it is NOT recomputed through the V2 scoring engine. This means the scores in the JSON are the ones that matter.

### e) Probability assessment: LLM-generated vs deterministic

**Assessment: 85% probability LLM-generated.**

Evidence for LLM-generated:
- The script (`generate-products.cjs`) does not produce this file and does not contain these brands
- `chemicals: []` on all sampled items — no derivation logic was applied before writing the JSON. If a script had run `deriveChemicals()`, polyester products would have non-empty chemicals arrays
- The brands are a mix of brands that appear in `brandDatabase.js` (Tommy Hilfiger, Amazon Essentials) with brands that do not (Naadam, Quince, Outerknown, REI Co-op, Eddie Bauer, Outdoor Voices) — the latter would require manual curation or LLM generation
- Round scores: many entries score exactly 70, 43, 48, 37 — clean round numbers that look like they were assigned rather than computed
- Two "Naadam Turtleneck" entries with different materials but identical scores (70) is inconsistent with deterministic computation

Evidence against / uncertainty:
- The scores do show material-correlated trends (merino/cashmere → higher scores, polyester → lower), which suggests some systematic logic
- It's possible a separate script exists that is not in this repo

**Recommendation:**
- Before launch, run `newProducts.json` products through the V2 scoring engine and replace `p.score` values with the engine output. This is a one-time batch operation.
- Until then, add an `_score_source: "pre-screened"` flag to the JSON entries and surface the `confidence_tier: 4` ("Insufficient Data") badge on the results page when displaying these products. `productDatabase.js` already propagates `tier` from the JSON, so a filter on `tier: "high_risk"` with score > 45 (which would be suspicious) could be a quick audit flag.
- Do NOT modify `newProducts.json` as part of this emergency fix batch. The risk is the scores being wrong in unknowable ways — that is a known and tolerable gap disclosed by the Confidence system. The legal risk from the fabricated "14 databases" claim and unverified health statistics is immediate; the score accuracy problem is secondary.

---

## Summary Table

| Fix | Files changed | Lines changed | Diff size | Risk of breaking build |
|-----|---------------|---------------|-----------|------------------------|
| 1 | `src/design/components/StateBlock.jsx` | ~2 | Tiny | None |
| 3 | `src/ResultsPage.jsx` | ~10 added | Small | None |
| 2 | `src/LandingPage.jsx` | ~12 (array + comment) | Small | None |
| 2 | `src/CleanWear.jsx` | ~15 (array + guard + remove block) | Small-Medium | Low — guard is additive |
| 4 | none | none (diagnose only) | — | — |

**Total lines changed: ~39 across 3 files. No imports, no exports, no API changes, no type changes.**

---

## Waiting for approval.

After you approve, execution will proceed in this order:
1. Fix 1 (`StateBlock.jsx`) → build check
2. Fix 3 (`ResultsPage.jsx`) → build check  
3. Fix 2 (`LandingPage.jsx` + `CleanWear.jsx`) → build check
4. Fix 4 — no changes, diagnosis already complete above
