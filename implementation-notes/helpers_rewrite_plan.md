# helpers.js Rewrite Plan
**Addresses:** UI Copy Audit flags C-08, C-09, C-10  
**File:** `src/results/helpers.js`  
**Status: AWAITING APPROVAL — no code has been changed**

---

## 1. Current Behavior

### 1a. CHEMICAL_INFO trigger lists (the three violations)

The file defines 8 chemicals. Only the flags relevant to C-08/C-09/C-10 are shown with their violations:

| Chemical | Current triggers | Violation |
|----------|-----------------|-----------|
| `pfas` | `["polyester", "nylon", "dri-fit", "dwr", "gore-tex", "waterproof"]` | **C-08**: "polyester" and "nylon" fire PFAS for any synthetic garment, regardless of DWR claim. V3 Rule D-1 requires explicit DWR/waterproof finish claim. |
| `phthalates` | `["spandex", "elastane", "lycra", "polyester", "nylon"]` | **C-10**: "polyester" and "nylon" fire phthalates without elastane. V3 Rule D-3 triggers only on Spandex/Elastane/Lycra. |
| `formaldehyde` | `["cotton", "wrinkle", "non-iron", "nylon"]` | Minor: "nylon" is in the list but V3 Rule D-2 does not flag formaldehyde for plain nylon without a wrinkle-free claim. (No audit flag raised for this, but it's wrong.) |
| `microplastics` | `["polyester", "nylon", "acrylic", "spandex", "elastane"]` | Minor: "spandex" and "elastane" included but V3 Rule D-6 only covers polyester, nylon, and acrylic. (No audit flag, but inconsistent.) |

**C-09 violation** is in `buildEquivalency("pfas")` at line 231:
```js
h("strong", { style: { fontWeight: 500 } }, "Sweat amplifies dermal transfer up to 3,252\u00d7 dry contact.")
```
This renders for ALL products with PFAS. Zheng et al. 2025 studied children's textiles only. Per methodology §E.4, the 3,252× figure is restricted to the Kids category.

### 1b. All user-facing strings helpers.js produces

The file produces two categories of user-facing output:

**Via `buildEquivalency(key, info)`** — JSX equivalency strings for each chemical in `buildChemicalRows`:
- `pfas`: "A forever chemical the EU is phasing out... **Sweat amplifies dermal transfer up to 3,252× dry contact.**" ← C-09
- `formaldehyde`: "The same compound used to preserve lab specimens. Classified Group 1 carcinogen by IARC."
- `bpa`: "A plasticizer that mimics estrogen. Leaches faster when skin temperature rises."
- `phthalates`: "Plasticizers that disrupt hormone signalling. Linked to reduced testosterone in men."
- `antimony`: "Polyester production catalyst, classified possibly carcinogenic by IARC."
- `microplastics`: "Synthetic fibers that shed with friction and have been detected in human blood and lung tissue."
- `azo_dyes`: "Dyes that can release carcinogenic aromatic amines — banned in EU for skin-contact textiles."
- `heavy_metals`: "Lead, chromium, and cadmium from textile dyes leach with acidic sweat."

**Via `CHEMICAL_INFO[key].healthNote`** — plain-text health notes (used directly in ResultsPage line 383):
- Each chemical has a `healthNote` string rendered as body text beneath the equivalency

**Via `CHEMICAL_INFO[key].sweatNote`** — note text (not currently used in ResultsPage per grep; appears in CHEMICAL_INFO but the only sweatNote use is in `buildEquivalency` for PFAS)

### 1c. Consumers of helpers.js

**Only one file imports from helpers.js: `src/ResultsPage.jsx`**

```js
import {
  CHEMICAL_INFO, getGarmentChemicals, getRecommendations,
  getGarmentType, getCategoryGroup,
} from "./results/helpers.js";
```

Usage in ResultsPage:
- **Line 153**: `const chemicals = getGarmentChemicals({ ...R, score: ov })` — produces the list of chemical keys to display
- **Line 160**: `const recs = getRecommendations({ ...R, score: ov })` — produces alternatives
- **Line 173**: `CHEMICAL_INFO[k]` — used to find the highest-severity chemical for the verdict sentence
- **Line 370**: `const chem = CHEMICAL_INFO[key]` — used to render each chemical card

**Exported but currently unused externally:**
- `buildChemicalRows` — defined and exported, not imported anywhere outside helpers.js
- `buildEquivalency` — defined internally, not exported, only called by `buildChemicalRows`
- `pickSplitAlternatives` — exported but not imported anywhere
- `getGarmentType`, `getTypeGroup`, `getCategoryGroup` — imported by ResultsPage (line 15) for `getGarmentType` and `getCategoryGroup`, but `getTypeGroup` is not actually used in ResultsPage

**SharePage.jsx**: Does NOT import helpers.js. It has its own inline `CITATIONS` and `EQUIVALENCIES` objects. (Those were verified as a separate audit item; this rewrite does not touch SharePage.)

---

## 2. Proposed Architecture

### Recommendation: Option A — Trace-driven rendering

**Why Option A over Option B:**

Option B (aligned trigger lists) is a maintenance trap. Every time the scoring rules change, two places need updating: `scoringRulesV3.js` and `helpers.js`. They will drift again. More fundamentally, Option B cannot support the new chemicals added in V3 (organotins, NPEs, flame_retardants, antimicrobial_biocides) without duplicating all the inference logic.

Option A solves this by construction: `getGarmentChemicals` reads from the V3 engine's own output (the score trace), so display and scoring can never diverge. The V3 engine is already running in shadow mode and already attaches its result to the score object as `sc2._v3` in CleanWear.jsx.

### Option A architecture

**New `getGarmentChemicals(product, v3trace = null)` signature:**

```
if v3trace?.flags is a non-empty array:
  → Return the flag chemical keys from the trace directly.
    These are MEDIUM/HIGH confidence flags — exactly what should be displayed.
    LOW confidence disclosures are in v3trace.disclosures; include those too
    with a visual distinction.

else (no v3trace — V2 scan or engine returned null):
  → Fall back to the current V2 trigger-based logic, but with fixed trigger
    lists (fixes C-08 and C-10 in the fallback path too).
```

**V3 trace availability:**  
In CleanWear.jsx, `doScan()` attaches the V3 result: `sc2._v3 = v3Result`. In ResultsPage, the score object `S` carries `S._v3` with the V3 result including `trace.flags` and `trace.disclosures`. The call in ResultsPage becomes:

```js
// Current:
const chemicals = getGarmentChemicals({ ...R, score: ov });

// New:
const v3trace = S?._v3?.trace || null;
const chemicals = getGarmentChemicals({ ...R, score: ov }, v3trace);
```

**Backward compatibility for V2 scans:**  
For scans where no V3 trace exists (`S._v3` is null — existing scans in the database, or scans where V3 produced no result), `getGarmentChemicals` falls back to V2 trigger logic. The V2 trigger lists are also fixed (C-08/C-10) so old scan display improves too. The UI shows a "Scored with original algorithm — re-scan for updated information" notice per §I.2 (this notice is already specced in the methodology but is a separate UI prompt; this rewrite doesn't add it).

---

## 3. Specific Changes to helpers.js

### 3a. CHEMICAL_INFO — extend to 12 V3 chemicals

Add the four new V3 categories (§C chemicals 9–12) with appropriate copy:

```js
organotins: {
  name: "Organotins",
  severity: "mod",
  sweatNote: null,
  citation: { authors: "REACH Annex XVII Entry 20", year: null, journal: "ECHA",
               doi: "https://echa.europa.eu/substances-restricted-under-reach" },
  healthNote: "Organotin biocides used in antimicrobial fabric treatments; endocrine disruptors.",
  triggers: ["antimicrobial", "anti-odor", "anti-mold"],  // V2 fallback: finish claim triggers
},
npes: {
  name: "Nonylphenol Ethoxylates (NPEs)",
  severity: "mod",
  sweatNote: null,
  citation: { authors: "REACH Annex XVII Entry 46", year: null, journal: "ECHA",
               doi: "https://echa.europa.eu/substances-restricted-under-reach" },
  healthNote: "Estrogenic detergent residues from textile manufacturing; restricted in EU.",
  triggers: [],  // V2 fallback: no reliable material-level trigger; only V3 brand-data rule fires this
},
flame_retardants: {
  name: "Halogenated Flame Retardants",
  severity: "high",
  sweatNote: "Prolonged skin contact during sleep increases cumulative dermal exposure.",
  citation: { authors: "CPSC 16 CFR Part 1615/1616", year: null, journal: "US CPSC",
               doi: "https://www.cpsc.gov/Business--Manufacturing/Business-Education/Flammability" },
  healthNote: "TCEP classified IARC Group 2A (probable human carcinogen). Required in US non-fitted children's sleepwear.",
  triggers: [],  // V2 fallback: requires subcategory=Sleepwear data; no general trigger
},
antimicrobial_biocides: {
  name: "Antimicrobial Biocides",
  severity: "mod",
  sweatNote: null,
  citation: { authors: "EU Biocidal Products Regulation 528/2012", year: 2012, journal: "EUR-Lex",
               doi: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32012R0528" },
  healthNote: "Nano-silver and triclosan used in 'anti-odor' fabric treatments; thyroid disruption and ecotoxicity concerns.",
  triggers: ["antimicrobial", "anti-odor", "silver", "heiq", "polygiene"],  // V2 fallback finish claim triggers
},
```

### 3b. Fix existing trigger lists (V2 fallback path, C-08/C-10)

| Chemical | Current triggers | New triggers | Rationale |
|----------|-----------------|--------------|-----------|
| `pfas` | `["polyester", "nylon", "dri-fit", "dwr", "gore-tex", "waterproof"]` | `["dwr", "gore-tex", "waterproof", "water-resistant", "outdry", "h2no"]` | Remove polyester/nylon/dri-fit. DWR-related keywords only. Mirrors D-1. |
| `phthalates` | `["spandex", "elastane", "lycra", "polyester", "nylon"]` | `["spandex", "elastane", "lycra"]` | Remove polyester/nylon. Mirrors D-3. |
| `formaldehyde` | `["cotton", "wrinkle", "non-iron", "nylon"]` | `["wrinkle", "non-iron", "easy-care", "crease-resistant", "cotton"]` | Remove nylon; add easy-care/crease-resistant. "cotton" retained as LOW-confidence baseline (disclosure only). Mirrors D-2. |
| `microplastics` | `["polyester", "nylon", "acrylic", "spandex", "elastane"]` | `["polyester", "nylon", "acrylic"]` | Remove spandex/elastane. Mirrors D-6. |

### 3c. Gate Zheng 3,252× to Kids category (C-09)

`buildEquivalency` currently receives only `(key, info)`. Add `category` parameter.

**Updated PFAS equivalency (two versions):**

```js
// Kids category:
"A forever chemical the EU is phasing out in consumer textiles by 2026. 
 Sweat amplifies PFAS dermal absorption up to 3,252× in children's textiles 
 (Zheng et al. 2025, Sci Total Environ)."

// All other categories:
"A forever chemical the EU is phasing out in consumer textiles by 2026. 
 Dermal absorption increases significantly under heat and sweat conditions."
```

**Updated sweatNote in CHEMICAL_INFO.pfas** (used if any surface reads it directly):
```js
sweatNote: (category) => category?.toLowerCase() === "kids"
  ? "Sweat amplifies PFAS dermal absorption up to 3,252× versus dry contact in children's textiles (Zheng et al. 2025)"
  : "PFAS dermal transfer increases under heat and sweat conditions",
```
Because making `sweatNote` a function would break any consumer that expects a string, the simpler approach is to keep `sweatNote` as the general adult-safe string, and render the Kids-specific Zheng figure only via `buildEquivalency(key, info, category)`.

**Practical change in ResultsPage**: The `buildEquivalency` call needs `category`:
```js
// In ResultsPage, the equivalency rendering calls:
// Currently: in buildChemicalRows(product) → buildEquivalency(key, info)
// New: buildEquivalency(key, info, product.category)
```

Since `buildEquivalency` is not exported and only called by `buildChemicalRows`, and `buildChemicalRows` is not used externally (ResultsPage builds its own chemical cards inline), this is purely internal to helpers.js. The external-facing change is only updating `CHEMICAL_INFO.pfas.sweatNote`.

Actually, looking at ResultsPage more carefully: it does NOT call `buildChemicalRows`. It calls `getGarmentChemicals` to get the list of keys, then accesses `CHEMICAL_INFO[key]` directly to render each card. The `buildEquivalency` function in helpers.js is dead code for the current ResultsPage. The JSX card rendering is inline in ResultsPage lines ~369–391.

**What actually needs to change in ResultsPage for C-09**: The PFAS sweat amplification note is displayed in ResultsPage via `exposureBullets()` (defined inline in ResultsPage, lines 54–91). It already handles this correctly — the PFAS bullet in `exposureBullets` cites "Zheng et al. 2025" with the 3,252× figure but is context-conditioned by `activity` (workout/outdoor etc.), not by category. This is not the same as gating by Kids category. 

The C-09 violation in helpers.js itself is in `CHEMICAL_INFO.pfas.sweatNote` (line 10) and `buildEquivalency` (line 231). Since `buildChemicalRows` is dead code (not called from ResultsPage), and ResultsPage doesn't use `CHEMICAL_INFO.pfas.sweatNote` anywhere in the current render path, C-09 is a **latent violation** — it exists in code that isn't currently rendering, but would produce the wrong output if anyone called `buildChemicalRows`. We should fix it anyway to prevent future misuse.

**Fix**: Change `CHEMICAL_INFO.pfas.sweatNote` to the adult-safe general string. Store the Kids-specific string separately. Update `buildEquivalency` to accept and use category.

---

## 4. getGarmentChemicals rewrite

### New implementation

```js
export function getGarmentChemicals(product, v3trace = null) {
  // ── Option A path: use V3 trace if available ──────────────
  if (v3trace?.flags?.length > 0 || v3trace?.disclosures?.length > 0) {
    const flagKeys   = (v3trace.flags       || []).map(f => f.chemical).filter(k => CHEMICAL_INFO[k]);
    const discKeys   = (v3trace.disclosures || []).map(f => f.chemical).filter(k => CHEMICAL_INFO[k]);
    // Return flags first (MEDIUM/HIGH), then disclosures (LOW).
    // Callers can distinguish by position if needed; currently ResultsPage renders all.
    return [...new Set([...flagKeys, ...discKeys])];
  }

  // ── Option B fallback: V2 trigger logic with fixed trigger lists ──
  const materials = (product.materials || [])
    .map(m => (typeof m === "string" ? m : m.name || "").toLowerCase())
    .join(" ");
  const productName = (product.product_name || product.name || "").toLowerCase();
  const finishClaims = (product.finish_claims || [])
    .map(f => (f.value || f || "").toLowerCase())
    .join(" ");
  // Text corpus for trigger matching: materials + product name + finish claims
  const corpus = [materials, productName, finishClaims].join(" ");
  const cat = (product.category || "").toLowerCase();
  const found = [];

  // Check explicit chemicals array first (from scan API)
  (product.chemicals || []).forEach(c => {
    const key = (typeof c === "string" ? c : c?.id || "").toLowerCase().replace(/[^a-z_]/g, "");
    if (CHEMICAL_INFO[key] && !found.includes(key)) found.push(key);
  });

  // Then apply fixed trigger lists
  Object.entries(CHEMICAL_INFO).forEach(([key, info]) => {
    if (found.includes(key)) return;
    if (!info.triggers?.length) return;
    if (info.triggers.some(t => corpus.includes(t) || cat.includes(t))) {
      found.push(key);
    }
  });

  return [...new Set(found)];
}
```

### Call site update in ResultsPage (line 153)

```js
// Current:
const chemicals = getGarmentChemicals({ ...R, score: ov });

// New:
const v3trace = S?._v3?.trace || null;
const chemicals = getGarmentChemicals({ ...R, score: ov }, v3trace);
```

This is the only change required in ResultsPage.jsx.

---

## 5. Copy updates for each chemical

Updated user-facing strings (honesty-compliant per §A, citations aligned with methodology):

| Chemical | Updated healthNote | Updated sweatNote | Key change |
|----------|-------------------|-------------------|------------|
| `pfas` | "Linked to thyroid disease, immune suppression, and certain cancers per EPA assessment. EU OEKO-TEX 2026 limit: 25 ppb per compound." | "PFAS dermal transfer increases under heat and sweat conditions. For children's garments, amplification up to 3,252× versus dry contact has been measured (Zheng et al. 2025)." | Zheng figure gated to kids context |
| `formaldehyde` | "Classified as a known human carcinogen (IARC Group 1). Used in wrinkle-resistant fabric treatments (DMDHEU and related resins)." | "Heat and moisture increase off-gassing from wrinkle-resistant resin treatments." | No change needed |
| `phthalates` | "Endocrine disruptors restricted under EU REACH Annex XVII (0.1% limit by weight). Associated with reproductive and developmental effects." | "Migrate more readily from elastic fabrics in warm, moist conditions." | No change needed |
| `antimony` | "Catalyst in PET (polyester) synthesis, classified as possibly carcinogenic (IARC Group 2B). Residues remain in finished fiber." | "Antimony migration from polyester textiles into artificial sweat has been measured in laboratory studies (Biver et al. 2021)." | Add citation |
| `microplastics` | "Microplastic fibers shed during wear and washing. Detected in human blood, lungs, and placental tissue in independent studies." | "Friction and moisture accelerate fiber shedding from synthetic fabrics." | No change needed |
| `bpa` | "Endocrine disruptor. Present in some polyester synthesis and finishing processes; dermal transfer documented under heat and friction." | "BPA leaching from polyester increases when skin temperature rises during exercise." | No change needed |
| `azo_dyes` | "Some azo dyes can release carcinogenic aromatic amines on contact with sweat or friction. EU REACH Annex XVII restricts specific aromatic amines above 30 mg/kg." | "Aromatic amines released through sweat and friction with dyed synthetic fabrics." | No change needed |
| `heavy_metals` | "Lead, cadmium, and chromium VI accumulate in organs. Restricted under EU REACH Annex XVII. Present in some textile dyes, particularly on fast-fashion synthetics." | "Acidic sweat can leach heavy metals from textile dyes." | No change needed |

**buildEquivalency PFAS (the only structural copy change needed):**

```js
// Before:
h("strong", { style: { fontWeight: 500 } }, "Sweat amplifies dermal transfer up to 3,252\u00d7 dry contact.")

// After:
category?.toLowerCase() === "kids"
  ? h("strong", { style: { fontWeight: 500 } },
      "Sweat amplifies PFAS dermal absorption up to 3,252\u00d7 in children\u2019s textiles (Zheng et al. 2025).")
  : h("strong", { style: { fontWeight: 500 } },
      "Dermal absorption increases significantly under heat and sweat conditions.")
```

---

## 6. Backward compatibility

**Decision: V2 scans use the fixed V2 fallback path.**

When `S._v3` is null (existing scan records, or scans where V3 produced no result), `getGarmentChemicals` uses the V2 fallback with fixed trigger lists. The displayed chemicals will be the same or fewer than before (since PFAS and phthalates no longer fire on plain polyester/nylon without DWR), which is an improvement even for old scans.

The "re-scan for updated score" prompt (§I.2) is not added in this rewrite — it is specified for the cutover prompt. For now, old scans get a slightly better chemical display from the fixed fallback trigger lists, without any UI notice change.

**No risk of regression for new scans**: new scans already have `S._v3` because `doScan()` in CleanWear.jsx attaches V3 results synchronously. The Option A trace path will always fire for them.

---

## 7. Test plan

### 7a. Unit test for getGarmentChemicals (new test file: `tests/helpersV3.test.js`)

Run alongside the existing `tests/scoringEngineV3.test.js`. Each test:
1. Builds a product fixture matching a methodology §J example
2. Runs `scoreV3(product, brand)` to get the actual V3 trace
3. Calls `getGarmentChemicals(product, trace)` to get the displayed chemical list
4. Asserts the displayed set matches the trace's flag+disclosure set

**12 test cases matching methodology examples:**

| Case | Product | Expected displayed chemicals |
|------|---------|------------------------------|
| J-1 | Lululemon Align (nylon/lycra, athletic) | phthalates (flag), microplastics (flag), azo_dyes (disclosure) |
| J-2 | Uniqlo HEATTECH (poly/acrylic/rayon/spandex) | phthalates, antimony, microplastics (all flag) |
| J-3 | Patagonia Capilene (recycled poly/spandex, bluesign) | microplastics (flag), phthalates+antimony (disclosures) |
| J-4 | TNF Gore-Tex Shell (nylon/poly, DWR declared) | pfas (flag HIGH), antimony (flag), microplastics (flag) |
| R-1 | Kids synthetic pajama (poly, no fitted claim) | flame_retardants (flag HIGH), antimony (flag), microplastics (flag) |
| R-2 | GOTS organic cotton tee | *(none at MEDIUM/HIGH)*, formaldehyde (disclosure) |
| R-3 | Synthetic, no brand data | antimony, microplastics (flags) |
| R-4 | Declared gore-tex jacket | pfas HIGH (flag) |
| R-5 | Athletic nylon, no DWR | phthalates (flag), microplastics (flag) — NO PFAS |
| R-6 | Wrinkle-free dress shirt | formaldehyde HIGH (flag) |
| R-7 | OEKO-TEX synthetic tee | microplastics (flag only; phthalates/antimony/azo in disclosures) |
| R-8 | Lululemon replica (nylon/lycra, C-rated brand) | phthalates, microplastics (flags) |

### 7b. Regression: V2 fallback path

Verify that removing "polyester" and "nylon" from PFAS triggers in the fallback path does NOT drop any chemical that should still show. Key regression cases:
- `{ materials: "Nylon 100%", category: "Athletic", finish_claims: [], chemicals: [] }` → PFAS should NOT appear (matches V3 D-1: no DWR claim)
- `{ materials: "Nylon 85%", product_name: "Gore-Tex Shell", chemicals: [] }` → PFAS SHOULD appear ("gore-tex" in product name triggers via corpus match)
- `{ materials: "Polyester 88%, Spandex 12%", chemicals: [] }` → phthalates SHOULD appear (spandex trigger), PFAS should NOT

---

## 8. Scope boundaries

| In scope | Out of scope |
|----------|-------------|
| `src/results/helpers.js` — full rewrite | `src/scoringEngine.js` (V2) |
| `src/ResultsPage.jsx` — 1 call site update (line 153) | `src/scoringEngineV3.js` |
| `tests/helpersV3.test.js` — new test file | `src/pages/SharePage.jsx` (has own inline copy) |
| | Displaying V3 score instead of V2 (cutover) |
| | `results/helpers.js` recommendation logic |

**The `getRecommendations`, `getGarmentType`, `getTypeGroup`, `getCategoryGroup`, and `pickSplitAlternatives` functions are not changed.** They don't have display/methodology conflicts.

---

## 9. Files to change and diff estimates

| File | Change | Size |
|------|--------|------|
| `src/results/helpers.js` | CHEMICAL_INFO: 4 new chemicals, fixed trigger lists, sweatNote update; `getGarmentChemicals`: add v3trace param + Option A path; `buildEquivalency`: add category param, gate Zheng figure | ~+80 lines (net, after replacing fixed content) |
| `src/ResultsPage.jsx` | Line 153: add `v3trace` extraction + pass to `getGarmentChemicals` | +2 lines |
| `tests/helpersV3.test.js` | New test file — 12 test cases | ~150 lines |

**Total diff: small — ~230 lines across 3 files.**

---

*Awaiting approval before writing any code.*
