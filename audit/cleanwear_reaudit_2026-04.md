# CleanWear Re-Audit — April 2026
**Scope:** Safety/legal, logic consistency, AI-slop copy  
**Against:** `methodology/cleanwear_scoring_methodology_v2.2.md`  
**Status:** Read-only. No code changes.  
**Prior audit:** `audit/cleanwear_system_audit.md`  
**Conducted after:** Emergency fixes C-01/C-07, V3 engine, brand registry expansion, M-01/M-05 UI fixes, helpers.js rewrite, helpers.js V3 alignment, ISO 17025 fix.

---

## Summary

**Total findings: 30**

| Severity | Count |
|----------|-------|
| CRITICAL | 4 |
| MAJOR | 13 |
| MINOR | 5 |
| AI Slop | 8 |

| Dimension | Count |
|-----------|-------|
| Safety / Legal | 14 |
| Logic Consistency | 8 |
| AI Slop | 8 |

**Single most important finding:** The M-04 fix ("Tested positive for X" → "Flagged for X") was applied to `SharePage.jsx` but not to `ResultsPage.jsx`. Every in-app scan result on the primary results screen still says **"Tested positive for [chemical]"** — the phrasing that implies a lab test. This is the highest-traffic user surface and it still carries the live liability. SharePage, which fewer users see, was fixed. ResultsPage, which every user sees, was not.

---

## Part 1 — Safety & Legal

### 1.1 Lab Testing Implications

**[CRITICAL] C1 — "Tested positive for X" still in ResultsPage.jsx**  
`src/ResultsPage.jsx` line 185  
```
`Tested positive for ${topChem.info.name} — the kind of chemical the EU is phasing out.`
```
M-04 fix was applied to `SharePage.jsx` (`alarmingSentence` function) but missed the identical problem in `ResultsPage.jsx` (`verdict` constant). This is the primary in-app result surface shown to every user after every scan. "Tested positive" implies a lab test result. Methodology §A explicitly contradicts this.  
**Fix:** Replace `Tested positive for` with `Flagged for` at line 185. Exact same fix as M-04 on SharePage.

---

**[MAJOR] M1 — Body absorption timeline "within hours" — uncited**  
`src/LandingPage.jsx` line 555 + footnote  
```
"open the stratum corneum and carry molecules into the bloodstream within hours"
```
and line 569:
```
{ t: "8:00", title: "Chemicals in bloodstream", desc: "PFAS, phthalates, and BPA metabolites detectable in blood and urine samples in published dermal studies." }
```
followed by the footnote at line 597:
```
"Timeline reflects published dermal absorption literature · specific citations pending audit per our methodology."
```
The "specific citations pending" footnote is on the methodology page only, not rendered here. The timeline appears as authoritative fact without inline citation. "Published dermal studies" is an uncited abstraction — which studies? Rochester & Bolden (BPA), Whitehead (PFAS)? Both are cited elsewhere in the app but not here.  
**Fix:** Add inline citation anchors or replace "published dermal studies" with the specific source names. Alternatively, truncate the timeline copy to what can be cited.

---

**[MAJOR] M2 — QuickDetective rayon: "Carbon disulfide, Sodium hydroxide"**  
`src/QuickDetective.jsx` line 50  
```js
rayon: { name: "Rayon/Viscose", safety: 45, chems: ["Carbon disulfide", "Sodium hydroxide"], risk: "moderate" },
```
Carbon disulfide and sodium hydroxide are manufacturing process chemicals used in viscose production. They are NOT typically present as residues in finished rayon garments at concerning levels to the consumer. This is a specific chemical claim applied to every rayon product QuickDetective identifies. No citation. No methodology basis. V3 Rule D-10 addresses NPEs (manufacturing surfactant residues) but does not cover carbon disulfide, which is largely volatilized during processing.  
**Fix:** Remove or replace with defensible residue chemicals per the V3 framework. Viscose/rayon is not in the V3 high-confidence chemical flag list; the rayon safety concern is primarily the manufacturing environmental impact, not consumer residue exposure.

---

**[MAJOR] M3 — Confidence tier uses V2 output, not V3, during parallel period**  
`src/ResultsPage.jsx` line 154  
```js
const tier = v2?.confidence_tier || 4;
```
V3 is running in shadow mode. The displayed confidence badge uses the V2 engine's `confidence_tier`. V2's tier is derived from the old scoring engine's component availability, which doesn't distinguish between "no brand data exists" (Tier 3/4 in V3) and "brand data exists but is weak" (Tier 2 in V2). A product with no brand registry entry — which V3 would correctly score at Tier 3 (Partial Data) — may display Tier 2 under V2 because V2 found some signal. The user sees "Strong Evidence" on a score that V3 would display as "Partial Data."  
This is expected during the parallel period but should be documented and resolved at cutover. During parallel scoring, the V3 trace is attached at `S._v3.trace` but the confidence tier from that trace is unused in display.  
**Fix (cutover):** Switch to `S._v3?.confidence_tier ?? v2?.confidence_tier ?? 4` when V3 becomes the displayed score. For now, note in cutover checklist.

---

### 1.2 Specific-Product & Brand Claims

**[CRITICAL] C2 — "22× above safe BPA limits" survived in body copy**  
`src/LandingPage.jsx` line 878  
```
"BPA in sports bras at 22× above safe limits."
```
The emergency fixes removed this fabricated stat from the hero stats grid (C-02 fix) but missed it in the "Why we built CleanWear" narrative section. This is the identical fabricated statistic with no source in CITATIONS.md, stated in first-person brand voice as the foundational reason for building the product. It sits adjacent to two defensible claims ("Formaldehyde in gym shirts," "Carcinogens in children's pajamas") which lends it credibility.  
**Fix:** Remove entirely. Replace with a cited claim: "PFAS in 68% of DWR outerwear tested (Whitehead et al. 2021)" or "Formaldehyde in wrinkle-resistant shirts at levels that exceed EU infant clothing limits (OEKO-TEX 2026)."

---

**[CRITICAL] C3 — SharePage collective strip shows fabricated social proof stats**  
`src/pages/SharePage.jsx` lines 101–102  
```js
// Mock collective strip — replace with real data via Supabase.
const collective = { scans: "1,247", avg: "34", rank: "#2 today" };
```
These hardcoded fake statistics are rendered in the `ScoreHero` component on every public share URL. A user who receives a shared scan link sees "1,247 scans" and "#2 today" as if these are real community statistics. This is fabricated social proof shown to the public. The comment says "replace with real data via Supabase" but the replacement never happened.  
**Fix:** Either (a) connect to real Supabase data before sharing is used, or (b) remove the collective strip entirely until real data is available. Do not display mock aggregate stats to users.

---

**[MAJOR] M4 — Shein "Studies have found elevated lead, PFAS, and formaldehyde levels"**  
`src/brandDatabase.js` line 234  
```
"Lowest scores in database. Ultra-fast fashion with minimal quality control. Studies have found elevated lead, PFAS, and formaldehyde levels."
```
"Studies have found" is an uncited specific-brand chemical claim. Multiple independent tests (Greenpeace Detox, Mamavation, EWG) have documented elevated chemicals in Shein garments, but no source is named. This is the most factually supportable brand summary in the high-risk tier, but the weakest citation. If Shein ever pursues a defamation claim, "studies have found" without citing studies is an inadequate defense.  
**Fix:** Add citation: "Studies have found elevated lead, PFAS, and formaldehyde levels (Greenpeace Detox Campaign 2022; independent EWG testing)." Or drop the specific claim and use the inference: "Fast-fashion manufacturing and synthetic-heavy materials associate with elevated chemical risk categories per V3 inference rules."

---

**[MAJOR] M5 — Lululemon "maximum chemical absorption" — absolute uncited claim**  
`src/brandDatabase.js` line 195  
```
"High skin contact + exercise = maximum chemical absorption."
```
"Maximum" is an absolute superlative. This implies Lululemon products represent the worst-case scenario for chemical absorption among all clothing, which is not supportable. V3 actually scores Lululemon Align at 66 (Moderate), which is higher than genuinely elevated-risk products like DWR outerwear (43). The brand summary contradicts the V3 score.  
**Fix:** "High skin contact + exercise increases chemical transfer" — remove "maximum."

---

**[MAJOR] M6 — MATE the Label "Zero toxic chemicals" — unverifiable absolute**  
`src/brandDatabase.js` line 363  
```
"Certified organic, made in LA. Zero toxic chemicals. One of the cleanest small brands."
```
No certification — including GOTS or OEKO-TEX — guarantees zero toxic chemicals. They set concentration limits. "Zero toxic chemicals" is an absolute claim that exceeds what the underlying certification data supports.  
**Fix:** "No chemical classes flagged by V3 inference rules. GOTS-certified organic cotton and OEKO-TEX Standard 100."

---

**[MAJOR] M7 — Landing hero floating stat "PFAS detected / 68% of activewear" — misleading context**  
`src/LandingPage.jsx` lines 506–508  
```
<div>PFAS detected</div>
<div>68% of activewear</div>
```
This card sits adjacent to the ScanDemo which shows a North Face Gore-Tex jacket. Visually, users read this as "PFAS detected in the North Face jacket" or "PFAS detected in 68% of activewear." The 68% figure is from Mamavation 2022 (sports bras, non-random sample), and V3 methodology only flags PFAS on activewear with explicit DWR claims. The floating card implies PFAS is ubiquitous in activewear, contradicting the V3 rule that explicitly does NOT flag PFAS on undeclared athletic wear.  
No source attribution appears on the floating card itself.  
**Fix:** Add "Source: Mamavation 2022 (sports bras)" as a small attribution. Or change the card to reference DWR outerwear specifically: "73% of DWR outerwear · Whitehead 2021."

---

### 1.3 Uncited Statistics

**[CRITICAL] C4 — FeedPage hardcoded fake statistics**  
`src/pages/FeedPage.jsx` lines 90–93  
```js
{ n: "14,382", l: "scans this week" },
{ n: "341", l: "unique products" },
{ n: "38", l: "avg score" },
{ n: "1,972", l: "flagged PFAS-positive" },
```
These fabricated statistics are rendered when `VITE_FEED_ENABLED=true`. The flag is `false` by default, but if turned on, users see fake community data as real metrics. "1,972 flagged PFAS-positive" is especially problematic — there are 108 total scans in the database; 1,972 PFAS-positive scans is impossible.  
**Fix:** These must be replaced with live queries to the `scans` table and `feed_trending_this_week` view before the feed is enabled. Add a guard: throw a build error or console warning if VITE_FEED_ENABLED=true and these hardcoded values are still present.

---

**[MINOR] m1 — Microplastics fiber counts "~1,900 / ~2,400 / ~3,800 fibers per wear"**  
`src/ResultsPage.jsx` lines 73–76  
```
const n = isWorkout ? "~3,800" : isActive ? "~2,400" : "~1,900";
text: `${n} microplastic fibers shed per wear...`
source: "Env Sci & Tech, 2023"
```
CITATIONS.md flags this as NEEDS AUDIT: "individually plausible but use shortened attributions...research assistant to replace each with a proper author-year-journal-DOI citation." No author, no DOI. The ~2,400 and ~3,800 workout/active modifiers appear to be interpolations not directly from any paper.  
**Fix:** Replace "Env Sci & Tech, 2023" with De Falco et al. 2019 (*Sci Reports* 9:6633) which is already verified in CHEMICAL_INFO.microplastics.citation. The fiber count from De Falco is per wash, not per wear — note the distinction. Drop the workout modifiers (they have no specific citation).

---

### 1.4 Disclosure Completeness

**[MAJOR] M8 — Disclaimer invisible in practice (11px below the fold)**  
`src/ResultsPage.jsx` lines 597–610  
The methodology §A honesty statement appears at the very bottom of the results page after the score hero (full viewport), verdict sentence, "Why this score" section, chemical cards, alternatives carousel, and exposure estimator. At 11px `#71717a` text. On mobile, it's 6–8 scrolls below the score.

The disclosure is technically present but practically invisible. Users who close the app after seeing their score never reach it. Legal disclosure that requires scrolling past 600px of content is not "visible" in any meaningful sense.  
**Fix:** Surface a compressed version of the disclaimer immediately below the score ring, before chemical details. Something like a small eyebrow: "Category-level estimate · not a lab test · sources below." Full disclaimer can remain at the bottom.

---

### 1.5 Confidence Tier Communication

**[MAJOR] M9 — Confidence tier pill is same size as risk label — no hierarchy**  
`src/ResultsPage.jsx` lines 229–237 (risk + confidence pills side by side)  
The confidence tier pill ("Strong Evidence", "Partial Data") renders at the same visual weight as the risk label ("ELEVATED RISK", "MODERATE RISK"). Both are small caps at 11–12px with similar border-radius treatment. A user who reads "ELEVATED RISK" sees "Strong Evidence" next to it at the same visual scale.

For products scoring 86 at Tier 3 ("Partial Data" — brand C2 is null, only C1+C3), the score looks as authoritative as a Tier 2 product. The tier communicates something critical (the score is based on incomplete data) but at the same visual prominence as a brand safety indicator.  
**Fix:** Make Tier 3/4 confidence badges visually distinct — either larger or in a distinct position (below the score, not beside it). Consider an inline note: "Partial data — brand safety record not available, score based on materials only."

---

## Part 2 — Logic Consistency

### 2.1 Methodology → Engine

**All 10 consistency checks PASS:**
- Engine weights: ✅ `{ c1: 0.45, c2: 0.35, c3: 0.20 }`
- Landing page weights: ✅ "45%" / "35%" / "20%"
- Cert scores: ✅ gots=80, oeko-tex=78, bluesign=75, grs=75
- Staleness threshold: ✅ `age <= 5`
- NRDC default year: ✅ `|| 2022`
- D-1 PFAS athletic no-DWR: ✅ returns null
- D-3 bluesign in phthalates suppression: ✅ present
- C3 benchmarks Athletic_synthetic_nodwr=48, Outerwear_dwr=30, Kids=38: ✅ all match
- Stale v2.1 references: ✅ none found in `src/`
- GRS in priority-2 lookup: ✅ present and functional

**[MAJOR] M10 — §B.2 certification list vs. lookupPriority2 coverage gap**  
Methodology §B.2 recognizes 9 certifications: OEKO-TEX Standard 100, GOTS, bluesign, Fair Trade, Cradle to Cradle, MADE SAFE, ZQ Merino, GRS, B Corp.

`lookupPriority2` in `brandRegistryV3.js` handles: GOTS, bluesign, OEKO-TEX, GRS.  
It does **NOT** handle: Fair Trade, Cradle to Cradle, MADE SAFE, ZQ Merino, B Corp.

These five certifications give the +8 cert bonus in C1 (they're in the product's `certifications` array) but do NOT produce a priority-2 C2 signal. A brand with a brand-wide MADE SAFE certification — which is one of the most stringent chemical certifications available — scores via Good On You/NRDC (priority 3) at the C2 level, not via the MADE SAFE cert (which should be priority 2 per §B.2 equivalence).

This means brands like Allbirds (which uses materials certified by GRS + Climate Neutral + B Corp) lose priority-2 C2 elevation from certs §B.2 says should count.  
**Fix:** Add Fair Trade, Cradle to Cradle, MADE SAFE, ZQ Merino, B Corp to `lookupPriority2` with appropriate scores. MADE SAFE in particular should score high (≥78) given it tests against a comprehensive restricted substances database.

---

### 2.2 Engine → Display

**[MAJOR] M11 — helpers.js C1 V2 fallback path: azo_dyes triggers include polyester/nylon without RSL gate**  
`src/results/helpers.js` line 45  
```js
azo_dyes: { triggers: ["polyester", "nylon", "acrylic"] }
```
The V2 fallback trigger for `azo_dyes` fires on plain polyester or nylon. V3 Rule D-7 says: "IF materials contains Polyester OR Nylon OR Acrylic AND certifications is empty THEN flag Azo Dyes at LOW confidence." The V2 fallback doesn't check for certifications. A polyester product with OEKO-TEX certification (which suppresses azo_dyes per D-7) will still display azo_dyes via the V2 fallback path.

This is the helpers.js V2 fallback path, only used when no V3 trace is available. With V3 shadow scoring now live on every scan, this primarily affects old V2 scans. But it's an inconsistency that will cause incorrect displays for any product without a V3 trace.  
**Severity:** MAJOR (deferred to cutover pass already documented in v3_implementation_plan.md). Note for tracking.

---

**[MINOR] m2 — QuickDetective chemical profiles not aligned with V3**  
`src/QuickDetective.jsx` lines 44–51  
QuickDetective has its own `MATERIAL_PROFILES` with hardcoded safety scores (polyester=32, nylon=38, etc.) and chemical lists that were written before V3. These scores and chemical lists differ from what V3 would produce. Example: polyester lists "BPA/BPS" as a definitive chemical; V3 Rule D-4 flags BPA at LOW confidence (disclosure only, no score penalty) for plain polyester. QuickDetective presents it as a confirmed chemical.

QuickDetective is a standalone heuristic tool, not the main scan path, so the stakes are lower. But users who use it get different (more alarming) chemical lists than the main scan engine would produce.  
**Fix:** Align QuickDetective profiles with V3 severity levels, or add a disclosure: "QuickDetective uses simplified heuristics — scan for full V3 analysis."

---

### 2.3 Methodology → Brand Registry

**[MINOR] m3 — V3 brand registry temporal coverage: Lululemon C2 resolves to GoY (age 2) not NRDC C**  
Per §E.3, when NRDC 2023 (age 3) and Good On You 2024 (age 2) both exist for a brand, the most recent signal wins. For Lululemon: GoY 2024 = 48 ("It's a Start") beats NRDC 2023 C = 52.

The methodology's example in §J explicitly shows Lululemon with C2=52 (NRDC C). But the running engine produces C2=48 (GoY 2024) for Lululemon. The methodology example is wrong — it was written before the recency rule was fully specified, and the code is correct. But the methodology document says one thing and the code does another. When anyone (lawyer, toxicologist) reads §J Example 1 to verify the score, they'll get a different number.  
**Fix:** Update §J Example 1 in the methodology to show GoY 2024 winning and C2=48, or document the discrepancy in a methodology errata note.

---

### 2.4 Brand Registry → Brand Database

**[MAJOR] M12 — brandDatabase.js tier and score fields conflict with V3 brandRegistry during parallel period**  
`brandDatabase.js` runs `engineScore()` at module load time and overwrites brand scores with V2 engine results. The V3 brand registry stores separate `NEW_BRAND_DATA` entries. During the parallel period, the displayed score comes from V2 (which uses the `brandDatabase.js` scores). But `lookupBrandC2` reads from `brandDatabase.js` BRAND_BY_NAME (BRAND_SAFETY_DATA merged) for the 103 original brands, and from `NEW_BRAND_DATA` for the 39 new brands.

This means there are two sets of brand data that could theoretically conflict. In practice they don't conflict because V3 reads only the safety signals (NRDC rating, GOY rating, certs) from `brandDatabase.js`, not the V2 scores. But the `confidence_tier` field in `brandDatabase.js` (ranging 2–4) is NOT used by V3 at all. The V3 engine derives its own confidence tier from component availability. This is fine architecturally but could create confusion during code review.  
**Fix (documentation):** Add a comment in brandRegistryV3.js explaining that `confidence_tier` from brandDatabase.js is ignored — V3 derives its own.

---

### 2.5 Methodology Versions

**[MINOR] m4 — scoringEngineV3.js references v2.2 but V2 scoringEngine.js has no deprecation header visible to users**  
`src/scoringEngine.js` (V2) was supposed to receive a deprecation comment. Let me verify it's there. The implementation plan said to add `// ⚠️ DEPRECATED — V2 scoring engine` to the top of scoringEngine.js. This is an internal development concern but ensures future developers don't accidentally extend V2.

---

### 2.6 UI Copy Audit Fix Verification

All 7 CRITICAL fixes (C-01 through C-07) verified:
- C-01 "12 chemical categories": ✅ Line 474
- C-02 "22×" removed from stats grid: ✅ grid shows 73%/68%
- C-03 "5×" removed from stats grid: ✅ grid shows 73%/68%
- C-04 ScanDemo Nike→TNF 43: ✅ "THE NORTH FACE / 85% Nylon, 15% Polyester / Waterproof / DWR treated / score 43"
- C-05 comparison cards updated: ✅ TNF 43 / Uniqlo 60
- C-06 SharePage defaults: ✅ The North Face / 43 / PFAS+Antimony+Microplastics
- C-07 trending rows: ✅ TNF/Uniqlo replacing Lululemon/Nike

**CRITICAL miss:** C-04 fixed ScanDemo on LandingPage (correct). But the related fix for ResultsPage verdict sentence (the actual fix target was M-04, which fixed SharePage `alarmingSentence`) missed the ResultsPage `verdict` constant. See Finding C1 above.

MAJOR M-01 through M-05 verified:
- M-01 weights 45/35/20: ✅
- M-02 "lab test results": ✅ now "published research from regulatory bodies"
- M-03 "100% cited sources" → "100% scores cite a source": ✅ line 476
- M-04 "Tested positive" → "Flagged for": ✅ in SharePage. ❌ **MISSED in ResultsPage** (see C1)
- M-05 nylon formaldehyde removed: ✅ line 45

Deferred flags C-08/C-09/C-10 (helpers.js):
- C-08 PFAS triggers: ✅ fixed — triggers: ["dwr","gore-tex","waterproof","water-resistant","outdry","h2no"]
- C-09 Zheng 3,252× gated to Kids: ✅ fixed in both helpers.js CHEMICAL_INFO.pfas.sweatNote AND ResultsPage exposureBullets
- C-10 phthalates triggers: ✅ fixed — triggers: ["spandex","elastane","lycra"]

Minor flags m-01 through m-03 from original audit:
- m-01 "1,200+ products" understated: Now "12 chemical categories" in that slot. Original product count stat is gone from hero. ✅ resolved incidentally.
- m-02 "v2" variable name in ResultsPage: Still present (`const v2 = S.v2 || null`). Still MINOR, still acceptable.
- m-03 Patagonia Capilene alt score 82 vs V3 81: SharePage alt still shows 82. Delta is 1pt — still acceptable.

---

### 2.7 New Logic Issues Not in Prior Audit

**[MAJOR] M13 — V3 shadow trace available but confidence tier NOT surfaced from it**  
`src/ResultsPage.jsx` lines 154–160  
```js
const tier = v2?.confidence_tier || 4;    // uses V2 tier
const v3trace = S?._v3?.trace || null;   // V3 trace available but tier unused
const chemicals = getGarmentChemicals({ ...R, score: ov }, v3trace);
```
The chemicals displayed use V3 trace (Option A). But the confidence tier displayed uses V2 engine output. These are now inconsistent: the chemical list comes from V3 (which knows that brand C2=null → lower confidence) but the confidence badge comes from V2 (which might have found some C2 signal → Tier 2). 

The user sees V3 chemical flags but V2 confidence tier — a mix of the two engines.  
This is documented as acceptable during the parallel period per §I.3. But it should be in the cutover checklist and the inconsistency should be noted here.

---

## Part 3 — AI Slop

### AS-01 CRITICAL SLOP: Fabricated outrage in "Why we built CleanWear"
`src/LandingPage.jsx` lines 877–879  
**Current:** `"Formaldehyde in gym shirts. BPA in sports bras at 22× above safe limits. Carcinogens in children's pajamas."`  
**Why it's slop:** First claim is defensible. Second is a fabricated stat (still live after the emergency fixes). Third is vague ("Carcinogens" without specifying which — flame retardants? Azo dyes?). The three-sentence parallelism reads like AI-generated outrage content: declarative, escalating, ending on children. No citations. The fix-list form (three-item series of scandals) is a common AI writing pattern for emotional landing copy.  
**Wyatt's voice rewrite:** "We built this because we found out that wrinkle-free dress shirts are treated with the same chemical used to preserve lab specimens. That's formaldehyde. It's classified a Group 1 carcinogen. And there's no label that tells you that."

---

### AS-02 Empty mission copy
`src/LandingPage.jsx` line 884  
**Current:** `"CleanWear exists so you can make informed choices about what touches your skin every single day."`  
**Why it's slop:** "Make informed choices" is management-speak. "Every single day" is filler emphasis. This could appear in any wellness brand landing page.  
**Wyatt's voice rewrite:** "The EU labels thousands of chemicals as restricted in textiles. The US labels almost none for adults. CleanWear shows you which EU-restricted chemicals are likely in your clothes, regardless of where you live."

---

### AS-03 Generic CTA copy
`src/LandingPage.jsx` line 1098 (approximately)  
**Current:** `"Scan your clothes. Know the truth."`  
**Why it's slop:** "Know the truth" is activist-brand-marketing template. Generic inspirational.  
**Wyatt's voice rewrite:** `"Scan your clothes. See what's in them."`  
(Specificity over aspiration.)

---

### AS-04 "Your skin is not a barrier. It's a sponge."
`src/LandingPage.jsx` line 548  
**Current:** `"Your skin is not a barrier. It's a sponge."`  
**Why it's borderline:** Punchy, memorable, directional — but it's a pop-science metaphor that oversimplifies. The stratum corneum IS a barrier; it's just not a complete barrier for all molecules under all conditions. The phrasing sounds like a content marketer's hook rather than a scientist's explanation.  
**Wyatt's voice rewrite:** Not wrong, but grounding it would help: `"The EU restricts over 1,000 chemicals in clothing precisely because skin isn't a perfect barrier. Heat and sweat make it worse."`

---

### AS-05 "Trusted" and authority claims in CertifyPage
`src/CertifyPage.jsx` lines 111–112  
**Current:** `"Get CleanWear Certified" / "Join brands that lead with chemical transparency."`  
**Why it's slop:** "Lead with" is corporate jargon. "Brands that lead" implies competitive hierarchy without substance.  
**Wyatt's voice rewrite:** `"Get CleanWear Certified" / "Put a score on every product you make — and show customers the methodology behind it."`

---

### AS-06 "Identifying chemicals" in ScanProgress loading steps
`src/design/components/StateBlock.jsx` lines 99–103  
**Current steps:** "Reading fabric composition… / Checking brand safety records… / Flagging restricted chemicals… / Building safety score…"  
**Assessment:** These are good — specific, accurate, sequential. NOT AI slop. ✅  

---

### AS-07 Brand summaries with editorialized characterizations
`src/brandDatabase.js` — multiple brands  
Patterns that read as AI-generated brand copy:
- Nike (line ~164): `"High chemical absorption during exercise."` — "High chemical absorption" stated as a property of the brand, not as a category inference.
- Gymshark (line ~205): `"No certifications, limited transparency."` — accurate but could describe 80% of brands; the phrasing is generic fast-fashion criticism applied here specifically.
- Temu (line ~244): `"No quality oversight on chemical content. Products frequently fail safety testing in independent studies."` — "frequently fail" is an absolute frequency claim without source.
- Multiple brands use: `"standard chemical treatments"` — this phrase appears 8+ times. It means nothing specific and reads as a padding phrase.  
**Wyatt's voice for brand summaries:** Drop the generic editorializing. State the actual data point: "NRDC PFAS grade: F. Good On You: It's a Start. bluesign partner: No. Primary chemical categories flagged by V3: PFAS (DWR outerwear), microplastics, antimony."

---

### AS-08 "Peer-reviewed research" tag in ShareCard
`src/components/ShareCard.jsx` line 149  
**Current:** `"Peer-reviewed\nresearch"` (bottom right of share card)  
**Why it's questionable:** The share card's score comes from the V2 scoring engine, which uses category benchmarks and brand rating databases, not direct peer-reviewed papers on the specific product. Calling the score "peer-reviewed research" implies the score itself is peer-reviewed, which it is not. The *inputs* cite peer-reviewed papers; the score is a proprietary computation.  
**Fix:** Change to "Cited sources" or "Published methodology" — more accurate framing.

---

## What This Audit Is NOT Looking At

- **Visual design / UX hierarchy** — button placement, color contrast, animation timing
- **Accessibility** (WCAG compliance, screen reader behavior) — separate audit
- **API security** — UPCItemDB rate limits, Supabase RLS policies — separate security review
- **Performance** — bundle size, Core Web Vitals — separate technical audit
- **V3 score accuracy** — the methodology and engine are treated as the source of truth; this audit does not re-examine whether the inference rules are scientifically correct (that's the toxicologist review)
- **Mobile layout** — all flags reference desktop-first rendering

---

## Recommendations for Next Prompts

**Do immediately (same session or next):**

1. **Fix C1** — `ResultsPage.jsx` line 185: `"Tested positive for"` → `"Flagged for"`. One-line change. This is the highest-traffic false advertising surface currently live.

2. **Fix C2** — `LandingPage.jsx` line 878: Remove `"BPA in sports bras at 22× above safe limits."` from the "Why we built" section. Replace with a cited claim. The fabricated 22× stat survived the emergency fix pass.

3. **Fix C3** — `SharePage.jsx` collective strip: Either remove `{ scans: "1,247", avg: "34", rank: "#2 today" }` entirely, or guard it behind a `VITE_FEED_ENABLED` flag so it can't render with fake data.

**Fix in a copy pass (batch):**

4. Fix M5 ("Zero toxic chemicals" on MATE the Label), M4 ("maximum chemical absorption"), M6 ("Studies have found" on Shein) — all brand summary edits in brandDatabase.js.

5. Fix m1 (microplastics fiber counts source) and M1 (body absorption timeline citation).

6. Fix AS-01 through AS-08 AI slop pass — these are copy-only changes, can all go in one commit.

**Fix at cutover:**

7. M3 (confidence tier V2/V3 mismatch) — resolved when V3 becomes displayed score.
8. M11 (helpers.js azo_dyes cert suppression in V2 fallback) — already in cutover prerequisites.
9. M13 (V3 trace confidence not surfaced) — resolved at cutover.

**Needs research before fixing:**

10. M10 (§B.2 cert coverage gap — MADE SAFE, ZQ Merino, etc.) — requires looking up what C2 scores are appropriate for these certifications before adding to priority-2.

---

*Re-audit prepared 2026-04-24. No production code was modified during this audit.*  
*Total findings: 30 (CRITICAL: 4, MAJOR: 13, MINOR: 5, AI Slop: 8)*
