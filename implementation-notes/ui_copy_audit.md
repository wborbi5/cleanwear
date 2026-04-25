# CleanWear UI Copy Audit
**Against:** `methodology/cleanwear_scoring_methodology_v2.1.md` (V3 methodology)  
**Audit date:** 2026-04-24  
**Status:** Read-only. No code was modified.

---

## Part 1 — Summary

**Files audited (13 total):**
`LandingPage.jsx` · `ResultsPage.jsx` · `CleanWear.jsx` · `BrandExplore.jsx` · `CertifyPage.jsx` · `QuickDetective.jsx` · `design/components/StateBlock.jsx` · `components/AuthModal.jsx` · `components/ScanLimitModal.jsx` · `components/ShareCard.jsx` · `components/PWAInstallBanner.jsx` · `pages/SharePage.jsx` · `pages/FeedPage.jsx` · `results/helpers.js`

**Approximate user-visible strings evaluated:** ~300

**Total flags raised: 19**

| Severity | Count | Definition |
|----------|-------|-----------|
| **CRITICAL** | 10 | False factual claims, fabricated stats, specific-product claims contradicted by V3, or display-layer logic that violates V3 inference rules |
| **MAJOR** | 6 | Inconsistency with V3 methodology that would mislead users or become actively wrong when V3 ships |
| **MINOR** | 3 | Phrasing that should be tightened; not actively misleading |

---

## Part 2 — Critical Flags

### C-01 · Chemical count claim in hero stats
**File:** `src/LandingPage.jsx` · ~line 479  
**Test failed:** TEST 2 (chemical count)  
**Current copy:**
```
{ n: "1,000+", l: "chemicals\ntracked" }
```
**Problem:** V3 methodology §A is explicit: "CleanWear tracks 12 chemical categories, not 1,000." The 1,000+ figure refers to EU REACH restricted substances, which CleanWear references but does not track or query. This stat directly contradicts the opening honesty statement of the methodology.  
**Proposed replacement:**
```
{ n: "12", l: "chemical\ncategories tracked" }
```
Or if the EU REACH angle is preferred:
```
{ n: "12", l: "chemical classes\nscored" }
```
**Severity:** CRITICAL — is a direct factual misrepresentation per the methodology's own §A.

---

### C-02 · Fabricated statistic: "22× above safe BPA limits in sportswear"
**File:** `src/LandingPage.jsx` · ~line 722 (problem stats grid)  
**Test failed:** TEST 4 (fabricated statistics)  
**Current copy:**
```
{ num: "22×", label: "above safe BPA limits in sportswear", color: "#eab308" }
```
**Problem:** This statistic does not appear in CITATIONS.md (under any status), does not appear in the V3 methodology §C or §D, and has no attributed source in the UI. It is not in any VERIFIED, DOI-pending, or even NEEDS AUDIT category in CITATIONS.md. It is fabricated.  
**Proposed replacement:** Remove this stat from the grid entirely. Replace with a verifiable figure from the methodology, for example:
```
{ num: "73%", label: "of DWR outerwear tested PFAS-positive", color: "#eab308" }
```
Source: Whitehead et al. 2021, cited in V3 §D-1 and §G.  
**Severity:** CRITICAL — fabricated statistic with no source.

---

### C-03 · Fabricated statistic: "5× faster absorption when sweating"
**File:** `src/LandingPage.jsx` · ~line 724 (problem stats grid)  
**Test failed:** TEST 4 (fabricated statistics)  
**Current copy:**
```
{ num: "5×", label: "faster absorption when sweating", color: "#16a34a" }
```
**Problem:** CITATIONS.md explicitly documents this figure under "Fabricated / removed": `"5× faster when sweating: NOT IN CODE (the 3,252× Zheng figure replaced any earlier 5× placeholder)."` The CITATIONS.md audit treated it as already gone. It is not gone — it is in the problem stats grid and was missed during the earlier emergency fix because it was not in the SPOTLIGHTS or FUN_FACTS arrays. This figure has no source and contradicts the documented methodology.  
**Proposed replacement:** Remove. The Zheng 2025 3,252× figure is verified but applies only to children's textiles (per V3 §E.4). For this context, a general statement is safer:
```
{ num: "8 hrs", label: "skin contact during sleep amplifies transfer", color: "#16a34a" }
```
(Based on EWG 2022 sleepwear findings, cited in V3 §E.4 C3 table.) Or omit and replace with the verified "68% of activewear PFAS-positive" from Mamavation 2022.  
**Severity:** CRITICAL — was explicitly flagged as fabricated in CITATIONS.md yet survived the emergency fix pass.

---

### C-04 · Demo scan shows Nike Dri-FIT at score 28 with PFAS flagged
**File:** `src/LandingPage.jsx` · lines 181–190 (ScanDemo component result state)  
**Test failed:** TEST 7 (marketing demo contradiction)  
**Current copy (hardcoded in JSX):**
```jsx
<div>Bad · 28/100</div>
<div>Dri-FIT Training Tee</div>
<div>Nike · Athletic Shirt</div>
{["Formaldehyde", "Antimony", "BPA"].map((c) => ...)}
```
**Problem:** V3 Example 1 note and Example 4 show that Nike Dri-FIT (polyester, athletic, no declared DWR treatment) does not receive a PFAS flag under V3 Rule D-1. A rough V3 computation for 100% polyester athletic tee, NRDC B brand rating, no DWR: C1 ≈ 85 (antimony −10, microplastics −5), C2 = 68 (NRDC B), C3 = 48 (Athletic synthetic, no DWR). Final ≈ **72**, not 28. The demo also shows Formaldehyde and BPA as prominent chemical tags — neither fires at MEDIUM or HIGH confidence for plain polyester without a treatment claim.  
**Proposed replacement:** Update demo product to the V3 high-risk demo product from methodology Example 4: The North Face Gore-Tex Shell, score 43, PFAS flagged (declared waterproof/gore-tex). Or use a Shein product. The current demo product actively contradicts V3 methodology when it ships.  
**Severity:** CRITICAL — the landing page's hero demo product produces a score V3 cannot support.

---

### C-05 · Product comparison cards show contradicted V2 scores
**File:** `src/LandingPage.jsx` · lines 750–779 (comparison section)  
**Test failed:** TEST 7 (marketing demo contradiction)  
**Current copy (hardcoded pairs):**
```
Nike Dri-FIT Training Tee: 28 / "100% Polyester"
Lululemon Align Leggings:  29 / "81% Nylon, 19% Lycra"
```
**Problem:**
- Nike Dri-FIT: V3 ≈ 72 (see C-04 above). Delta: 44 points.
- Lululemon Align: V3 = 66 (methodology §J Example 1 v2.1). Delta: 37 points.

Both scores are materially wrong under V3. These cards are the primary visual comparison example on the landing page and will be actively misleading once V3 ships.  
**Proposed replacement:** Replace Nike Dri-FIT (28) with The North Face Gore-Tex Shell (43) — the new V3 high-risk demo from methodology Example 4. Replace Lululemon Align (29) with Uniqlo HEATTECH Ultra Warm (60, from methodology Example 2) or another genuinely moderate product. The Nike/Lululemon pair no longer represents V3 bottom-of-range.  
**Severity:** CRITICAL — both scores wrong by 37–44 points.

---

### C-06 · SharePage default demo: Nike score 28, PFAS:HIGH
**File:** `src/pages/SharePage.jsx` · lines 90–95  
**Test failed:** TEST 5 + TEST 7  
**Current copy:**
```js
const brand = q.get("b") || "Nike";
const name = q.get("n") || "Dri-FIT Training Tee";
const score = parseInt(q.get("s") || "28", 10);
const chemicals = parseChemicals(q.get("ch") || "PFAS:high,Formaldehyde:mod,BPA:mod");
```
**Problem:** When this page is loaded without URL parameters (e.g., from a direct link to `/s/demo`), it displays Nike Dri-FIT at score 28 with PFAS flagged at HIGH. V3 does not flag PFAS on Nike Dri-FIT (no declared DWR treatment). V3 produces ~72. This is the first thing a user sees when viewing any share link without scan data in the URL. It is presenting a specific-product PFAS claim that is unsupported by V3.  
**Proposed replacement:** Change the defaults to a product V3 actually scores as high-risk with PFAS. Suggested:
```js
const brand = q.get("b") || "The North Face";
const name = q.get("n") || "Gore-Tex Shell Jacket";
const score = parseInt(q.get("s") || "43", 10);
const chemicals = parseChemicals(q.get("ch") || "PFAS:high,Antimony:mod,Microplastics:mod");
```
**Severity:** CRITICAL — presents a PFAS:HIGH claim on a specific named product V3 methodology does not support.

---

### C-07 · SharePage trending rows: Lululemon 29 + PFAS, Nike 28
**File:** `src/pages/SharePage.jsx` · lines 114–117  
**Test failed:** TEST 5 + TEST 7  
**Current copy (hardcoded trending rows):**
```js
{ rank: 1, brand: "Lululemon", name: "Align Leggings", score: 29, chips: [{ label: "PFAS", tone: "bad" }] },
{ rank: 2, brand: "Nike", name: "Dri-FIT Training Tee", score: 28, chips: [{ label: "Formaldehyde", tone: "bad" }] },
{ rank: 3, brand: "Patagonia", name: "Organic Cotton Tee", score: 88, chips: ["bluesign", "GOTS"] },
```
**Problem:**
- Lululemon Align at 29 with PFAS chip: V3 = 66, no PFAS flag (Rule D-1 requires declared DWR). Delta 37 points, PFAS claim unsupported.
- Nike Dri-FIT at 28 with Formaldehyde chip: V3 ≈ 72, no Formaldehyde flag at MEDIUM/HIGH (plain polyester, no wrinkle-free claim). Delta 44 points.
- Patagonia Organic Cotton Tee at 88: V3 rough estimate — Organic cotton, Casual, no flags, GOTS/bluesign → C1 ~100, C2 ~80 (Good On You Great, priority 3 — Patagonia has no NRDC entry for cotton products specifically), C3 ~70 (Casual, natural fiber). Final ≈ 88. **Consistent**. ✓

The first two rows display scores and chemical claims that V3 methodology does not support.  
**Proposed replacement:** Replace rows 1 and 2 with V3-consistent examples. Suggested:
```js
{ rank: 1, brand: "The North Face", name: "Gore-Tex Shell Jacket", score: 43, chips: [{ label: "PFAS", tone: "bad" }] },
{ rank: 2, brand: "Uniqlo", name: "HEATTECH Ultra Warm", score: 60, chips: [{ label: "Antimony", tone: "bad" }, { label: "Phthalates", tone: "bad" }] },
```
**Severity:** CRITICAL — hardcoded PFAS claim on Lululemon Align is directly contradicted by V3 methodology Example 1.

---

### C-08 · `results/helpers.js` PFAS triggers fire on plain polyester/nylon without DWR gate
**File:** `src/results/helpers.js` · line 13  
**Test failed:** TEST 5 (specific-product chemical claims unsupported by V3)  
**Current copy:**
```js
pfas: {
  triggers: ["polyester", "nylon", "dri-fit", "dwr", "gore-tex", "waterproof"],
```
**Problem:** The `getGarmentChemicals()` function in this file runs on the results page and fires PFAS display for ANY product containing polyester or nylon, regardless of whether a DWR or waterproofing treatment was declared. V3 Rule D-1 is explicit: athletic wear without an explicit DWR/waterproof claim does NOT trigger a PFAS flag. The trigger list conflates materials (polyester, nylon — which alone are insufficient per V3) with treatment claims (dwr, gore-tex, waterproof — which are the actual V3 triggers). As a result, Lululemon Align Leggings (nylon, no DWR claim) would still display PFAS to users on the results page, contradicting V3 §J Example 1 which shows no PFAS flag for that product.  
**Proposed replacement:** Remove "polyester" and "nylon" from the pfas triggers list. Keep treatment-claim keywords only:
```js
pfas: {
  triggers: ["dri-fit", "dwr", "gore-tex", "waterproof", "water-resistant", "outdry", "h2no", "event", "stain-resistant"],
```
Note: "dri-fit" is a brand term; it does not necessarily imply DWR. Consider removing it too unless Nike Dri-FIT is verified to carry PFAS treatments. Per V3, Dri-FIT is moisture-wicking, not DWR-treated — remove "dri-fit" from the trigger list as well.  
**Severity:** CRITICAL — causes PFAS to be displayed on specific named products in violation of V3 Rule D-1, producing chemical claims that are unsupported at MEDIUM/HIGH confidence.

---

### C-09 · `results/helpers.js` Zheng 2025 (3,252×) sweat note displayed universally
**File:** `src/results/helpers.js` · line 10  
**Test failed:** TEST 6 (Zheng 2025 figure applied outside Kids context)  
**Current copy:**
```js
pfas: {
  sweatNote: "Sweat increases PFAS dermal absorption up to 3,252x versus dry contact",
  citation: { authors: "Zheng et al.", year: 2025, journal: "Sci Total Environ", ... }
```
**Problem:** This sweatNote is displayed on the results page for any product the PFAS flag fires on, regardless of category. V3 methodology §E.4 is unambiguous: "The 3,252× figure is cited only as the evidentiary basis for the Kids category benchmark penalty, not as a universal sweat multiplier." Zheng et al. 2025 studied PFAS transfer in children's textiles specifically. Displaying "3,252× dermal absorption" to an adult scanning a Gore-Tex jacket overstates the risk by misapplying a children's-textile finding.  
**Proposed replacement:** Gate the sweat note by category, or replace with a more general statement:
```js
pfas: {
  sweatNote: "PFAS dermal transfer increases significantly under heat and sweat conditions. "
           + "Children's skin is especially vulnerable — studies show up to 3,252× amplification "
           + "in children's textiles (Zheng et al. 2025).",
```
This way the figure is cited accurately (children's context) while adult exposure is still noted.  
**Severity:** CRITICAL — misapplies a children's-specific finding as a universal fact.

---

### C-10 · `results/helpers.js` phthalates triggers fire on polyester and nylon
**File:** `src/results/helpers.js` · line 35  
**Test failed:** TEST 5  
**Current copy:**
```js
phthalates: {
  triggers: ["spandex", "elastane", "lycra", "polyester", "nylon"],
```
**Problem:** V3 Rule D-3 states: "IF materials contains Spandex OR Elastane OR Lycra (any percentage) THEN flag Phthalates at MEDIUM confidence." Polyester and nylon alone do not trigger phthalates under V3. Having polyester and nylon as triggers means phthalates is displayed for every synthetic garment — including plain polyester tees — at the display layer. This contradicts the methodology (phthalates in elastane/spandex are the defensible inference; phthalates in polyester/nylon is a separate mechanism not supported by Rule D-3).  
**Proposed replacement:**
```js
phthalates: {
  triggers: ["spandex", "elastane", "lycra"],
```
**Severity:** CRITICAL — causes phthalates to be asserted for specific products where V3 methodology Rule D-3 does not support it.

---

## Part 3 — Major Flags

### M-01 · Landing page methodology section shows wrong V3 weights
**File:** `src/LandingPage.jsx` · lines ~639–682 (methodology steps)  
**Test failed:** TEST 6 (score explanation consistency)  
**Current copy:**
```
Step 01 · 25% · Regulatory flags · EU REACH Annex XVII
Step 02 · 35% · Brand safety record · NRDC · OEKO-TEX · GOTS · Good On You
Step 03 · 40% · Category research benchmarks · Mamavation · EWG · Zheng et al. 2025
```
**Problem:** V3 methodology §E.1 weights are: **C1 (Material Chemical Risk) 45%, C2 (Brand Safety) 35%, C3 (Category Benchmark) 20%**. The landing page shows the V2 engine weights (25%/35%/40%), which were taken from the old `scoringEngine.js` constants. Once V3 ships, these weights are wrong by 20 percentage points on two of three components. Category benchmarks drop from 40% to 20%; material chemical risk rises from 25% to 45%.  
**Proposed replacement:**
```
Step 01 · 45% · Material chemical risk · Inference rules applied to declared fibers + finish claims
Step 02 · 35% · Brand safety record   · NRDC · OEKO-TEX · GOTS · Good On You
Step 03 · 20% · Category benchmarks   · Mamavation · EWG · Zheng et al. 2025
```
**Severity:** MAJOR — will be factually incorrect when V3 ships, and will create user confusion about how the score is built.

---

### M-02 · "Lab test results" phrasing in How It Works
**File:** `src/CleanWear.jsx` · line 351 (renderScanner, How It Works step 2)  
**Test failed:** TEST 3 (lab testing implications)  
**Current copy:**
```
"Materials, certifications, and lab test results from published research and regulatory databases online."
```
**Problem:** V3 methodology §A: "It does not measure the actual concentration of any chemical in any specific garment, and it is not a substitute for laboratory testing." The phrase "lab test results" strongly implies CleanWear retrieves actual product-specific test data. It does not. It infers from published category research and regulatory databases.  
**Proposed replacement:**
```
"Declared materials, brand certifications, and published regulatory data — no testing required."
```
Or:
```
"Materials, certifications, and published research from regulatory bodies and peer-reviewed studies."
```
**Severity:** MAJOR — implies a capability (product-specific lab test data retrieval) that CleanWear does not have.

---

### M-03 · "100% cited sources" hero stat no longer accurate
**File:** `src/LandingPage.jsx` · ~line 481  
**Test failed:** TEST 4  
**Current copy:**
```
{ n: "100%", l: "cited\nsources" }
```
**Problem:** The "22×" (C-02) and "5×" (C-03) statistics remain in the page's problem stats section without any source attribution. These are the first substantive statistics users encounter after the hero. The "100% cited sources" claim was never fully true (CITATIONS.md flagged many NEEDS AUDIT items), and it is clearly false as long as C-02 and C-03 remain in the page. Fixing C-02 and C-03 is a prerequisite for this claim to hold. After those are fixed, the claim needs to be re-evaluated.  
**Proposed replacement:** After fixing C-02 and C-03, consider replacing with a more defensible claim:
```
{ n: "100%", l: "scores cite\na source" }
```
Which is accurate — every V3 score trace cites its source per §E.6.  
**Severity:** MAJOR — a specific accuracy claim that is self-refuting as long as uncited stats remain on the same page.

---

### M-04 · `SharePage.jsx` "Tested positive for {chemical}" phrasing implies lab result
**File:** `src/pages/SharePage.jsx` · line 76  
**Test failed:** TEST 3 (lab testing implications)  
**Current copy:**
```js
return topChemical
  ? `Tested positive for ${topChemical} — the kind of chemical the EU is phasing out.`
  : "Scored in the highest-risk band for chemical exposure.";
```
**Problem:** "Tested positive for X" is laboratory language. CleanWear does not test products — it infers chemical risk. A user sharing a scan link sees "Tested positive for PFAS" displayed for the scanned garment. This phrasing implies a product-specific test result. Per §A, no such result exists.  
**Proposed replacement:**
```js
return topChemical
  ? `Flagged for ${topChemical} — the kind of chemical the EU is phasing out.`
  : "Scored in the highest-risk band for chemical exposure.";
```
**Severity:** MAJOR — "tested positive" will be read by users as meaning an actual lab test was run on the product.

---

### M-05 · `QuickDetective.jsx`: nylon listed with "Formaldehyde resins"
**File:** `src/QuickDetective.jsx` · line 45  
**Test failed:** TEST 5 (specific-product chemical claims)  
**Current copy:**
```js
nylon: { name: "Nylon", safety: 38, chems: ["Microplastics", "Formaldehyde resins"], risk: "high" },
```
**Problem:** V3 Rule D-2 fires Formaldehyde at HIGH confidence only when the product has explicit "wrinkle-free", "non-iron", or "easy-care" finish claims. Plain nylon does not trigger the formaldehyde rule. Nylon's chemical profile per V3 is: Microplastics (D-6, MEDIUM) and potentially Phthalates if elastane is present (D-3). Listing "Formaldehyde resins" as a characteristic chemical of nylon misleads users who use the QuickDetective on a nylon garment with no treatment claims.  
**Proposed replacement:**
```js
nylon: { name: "Nylon", safety: 38, chems: ["Microplastics"], risk: "moderate-high" },
```
**Severity:** MAJOR — attributing formaldehyde to plain nylon is not supported by V3 Rule D-2 and creates a false specific-material claim.

---

### M-06 · `CertifyPage.jsx`: "ISO 17025-accredited labs test your products" — program not confirmed active
**File:** `src/CertifyPage.jsx` · line 117  
**Test failed:** TEST 3 (lab testing implications — for this program specifically)  
**Current copy:**
```
{ icon: "🧪", title: "Independent Lab Testing", desc: "ISO 17025-accredited labs test your products against OEKO-TEX 2026 thresholds." }
```
**Problem:** This is the Certification Program page for brands seeking CleanWear's "Lab Verified" (Tier 1) status. The claim is factually appropriate IF this program is operational with actual ISO 17025 lab partnerships in place. However, no evidence in the codebase confirms a lab partnership exists. The form collects applications but there is no logic connecting submissions to a lab workflow. If CleanWear does not currently have an active ISO 17025 lab partnership, this is a false advertising claim. This should be verified before the page is shown to brands.  
**Note:** If the program IS active with a real lab partner, this flag is resolved. This is flagged to prompt verification, not as a definitive finding.  
**Severity:** MAJOR — potential false advertising if lab partnership is not operational.

---

## Part 4 — Minor Flags

### m-01 · "1,200+ products in database" is understated
**File:** `src/LandingPage.jsx` · ~line 480  
**Test failed:** None (not actively misleading)  
**Current copy:**
```
{ n: "1,200+", l: "products\nin database" }
```
**Note:** `productDatabase.js` header states "1,641 products across 103 brands" plus `newProducts.json` adds 1,000 more = ~2,641 total. Saying 1,200+ is conservative but not harmful. Update when convenient.  
**Proposed replacement:** `{ n: "2,600+", l: "products\nin database" }` — or defer until post-V3 when the `newProducts.json` re-score is complete.  
**Severity:** MINOR.

---

### m-02 · ResultsPage references "v2" in the score source count
**File:** `src/ResultsPage.jsx` · line 255  
**Test failed:** None (internal label)  
**Current copy:**
```jsx
{v2 && <div style={...}>Risk assessed from {v2.components.length} public source{...}</div>}
```
The variable is named `v2` (originally for scoring engine V2). Once V3 ships, this variable will hold V3 results but still be named `v2` in the code. This is not user-visible text, but the object path `score.v2` is passed down from CleanWear.jsx and the string "Risk assessed from..." is user-visible.  
**Note:** The user-visible text itself ("Risk assessed from N public sources") is fine. The internal variable naming is a developer concern, not a copy issue. Noting here for engineering awareness.  
**Severity:** MINOR.

---

### m-03 · SharePage Patagonia Capilene alt score: 82 vs V3 81
**File:** `src/pages/SharePage.jsx` · line 109  
**Test failed:** TEST 7 (trivial delta)  
**Current copy:**
```js
const alt = { brand: "Patagonia", name: "Capilene Cool Daily Tee", score: 82, ... }
```
V3 methodology Example 3 produces 81 for Patagonia Capilene Cool Shirt. Delta is 1 point — within any rounding tolerance. No action required; noting for completeness.  
**Severity:** MINOR — acceptable rounding delta.

---

## Part 5 — Strings That Are Already Consistent

The following user-visible claims passed all seven tests and require no changes:

1. **Footer disclaimer** (`LandingPage.jsx`, `ResultsPage.jsx`): "Scores are risk estimates based on peer-reviewed research, not lab test results." — Consistent with §A. ✓

2. **Methodology step descriptions** (`LandingPage.jsx`): The *descriptions* of what each step does (checking brand PFAS commitments, category research benchmarks, etc.) are accurate even though the *weights* are wrong (see M-01). The source attributions (NRDC, Mamavation, Zheng 2025) match §G. ✓

3. **StateBlock.jsx loading steps** (post-Fix 1): "Reading fabric composition… / Checking brand safety records… / Flagging restricted chemicals… / Building safety score…" — Accurately describes V3 operations. ✓

4. **ResultsPage.jsx confidence tier descriptions**: "Strong Evidence: Score based on brand-level safety data and published category research." / "Partial Data: Based on category research only..." / "Insufficient Data: Limited public data available..." — Consistent with V3 §E.5 confidence tiers. ✓

5. **ResultsPage.jsx PFAS exposure bullet** (when workout + PFAS): "Sweat amplifies PFAS dermal absorption up to 3,252× vs dry contact — the highest-risk scenario for this fabric. (Zheng et al. 2025)" — This is conditionally displayed only for workout activity with PFAS flagged. C-09 flags that the sweatNote in `helpers.js` applies this universally; the *ResultsPage.jsx* exposure bullets (lines 58–65) are more careful — they contextualize the 3,252× within workout activity. These bullets themselves are better than the helpers.js sweatNote. ✓

6. **ShareCard.jsx verdict strings**: "Excellent — minimal chemical exposure risk based on published data" / "Good — low chemical exposure risk based on category research" — "Based on published data" and "based on category research" are accurate framings. ✓

7. **CertifyPage.jsx terms**: "I agree that submitted products will be independently tested and results published on CleanWear regardless of pass/fail outcome." — Appropriate; this is a consent form, not a product claim. ✓

8. **AuthModal.jsx**: Entirely free of product claims, chemical assertions, or methodology references. ✓

9. **ScanLimitModal.jsx**: "Create a free account for unlimited scans, or share your last result to earn +1 scan." — No product or methodology claims. ✓

10. **PWAInstallBanner.jsx**: "Quick access to scan any garment." — No claims. ✓

11. **FeedPage.jsx** ("coming soon" state): "We hold the public feed closed until there's enough real-world volume to make it honest. A sparse feed would make a few scans look like consensus." — Honest and consistent with methodology. ✓

12. **BrandExplore.jsx score/tier display**: Brand tier labels ("Lower Risk 70–100", "Moderate 45–69", "Elevated Risk 0–44") are consistent with V3 §H brand tier definitions. ✓

13. **LandingPage.jsx EU regulatory bar chart**: "EU: 1,000+" (REACH restricted substances), "Canada: 87", "Japan: 42", "US: ~5" — These describe EU/US regulatory gaps, not CleanWear's tracked categories. Appropriate context; not a claim about CleanWear's capabilities. ✓

14. **ResultsPage.jsx methodology footnote** (post-Fix 3): "CleanWear scores are category-level risk estimates based on material composition and brand public records. They are not product-specific laboratory test results." — Fully consistent with §A. ✓

15. **SharePage.jsx footer**: "Independent methodology · no brand payments." — Accurate. ✓

---

## Part 6 — Open Questions

**OQ-1: BrandDatabase summaries displayed in BrandExplore.jsx**  
Brand summaries (e.g., Lululemon: "Premium price, but Nulu/Luon/Everlux fabrics are nylon-spandex blends. High skin contact + exercise = maximum chemical absorption.") are user-visible strings stored in `brandDatabase.js` and rendered via `BrandExplore.jsx`. The phrase "maximum chemical absorption" is an uncited characterization. However, auditing all ~103 brand summary strings was outside scope of this pass. Recommend a targeted review of brand summaries for brands scoring ≤35 where claims are most likely to be the basis for defamation exposure.

**OQ-2: FeedPage.jsx hardcoded stats**  
`FeedPage.jsx` line 90–94 contains hardcoded feed statistics: "14,382 scans this week", "341 unique products", "38 avg score", "1,972 flagged PFAS-positive". These are rendered inside the FEED_ENABLED=true branch, which is off by default. When the feed goes live, these will need to be replaced by live database queries. Flag this for the feed launch checklist, not the V3 scoring launch.

**OQ-3: QuickDetective scores (safety: 32, 38, etc.) vs V3**  
QuickDetective (`QuickDetective.jsx`) uses hardcoded MATERIAL_PROFILES scores (polyester: 32, nylon: 38, cotton: 72, etc.) that were derived from V1 material scoring, not V3. These are displayed to users who use the "quick detect" flow before doing a full scan. They are generally directionally correct but not V3-aligned. Flagged M-05 covers the formaldehyde/nylon issue specifically. A broader question: should QuickDetective scores align with V3 methodology, or is it acceptable for this tool to use simplified heuristics? The tool itself says "{N}% confidence" which implies estimation, but the displayed scores look authoritative.

**OQ-4: `results/helpers.js` microplastics triggers include spandex/elastane**  
`helpers.js` line 44: `microplastics triggers: ["polyester", "nylon", "acrylic", "spandex", "elastane"]`. V3 Rule D-6 lists Polyester, Recycled Polyester, Nylon, Recycled Nylon, and Acrylic — not spandex or elastane. Whether elastane sheds microplastics in meaningful quantities is contested. Flagging for methodology review, but not escalating to CRITICAL because it is directionally defensible and the severity weight for microplastics is LOW–MODERATE.

**OQ-5: CertifyPage "Gold tier" chemical panel**  
CertifyPage.jsx describes Gold tier as "Full chemical panel — PFAS, formaldehyde, phthalates, heavy metals, azo dyes, pH". This lists 6 categories; V3 has 12. Is the certification program's lab testing scope aligned with the full V3 panel? If Certified products receive Tier 1 confidence scores (per CertifyPage and the methodology), the certification should cover at minimum the categories CleanWear would infer for the product type. Requires alignment between the certification program scope and §C.

---

*Audit prepared 2026-04-24. Read-only — no production code modified.*  
*Reference methodology: `methodology/cleanwear_scoring_methodology_v2.1.md`*
