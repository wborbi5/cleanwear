# Re-Audit Content Fixes Plan
**Source:** `audit/cleanwear_reaudit_2026-04.md` — MAJOR findings M1, M2, M4, M5, M6, M7, m1  
**Status: AWAITING APPROVAL — no code changed**  
**Out of scope:** M3 (confidence tier), M8 (disclaimer surfacing), M9 (tier badge sizing), M10 (priority2 certs), M11 (helpers.js fallback), M13 (V3 trace tier), AS-01/AS-08 (voice), cutover items

---

## Files changing

| Fix | File | Lines affected | Diff size |
|-----|------|---------------|-----------|
| M1 | `src/LandingPage.jsx` | ~555, ~572, ~597 | 3 lines |
| M2 | `src/QuickDetective.jsx` | ~50 | 1 line |
| M4 | `src/brandDatabase.js` | ~234 | 1 line |
| M5 | `src/brandDatabase.js` | ~195 | 1 line |
| M6 | `src/brandDatabase.js` | ~363 | 1 line |
| M7 | `src/LandingPage.jsx` | ~507, ~521 | 2 lines |
| m1 | `src/ResultsPage.jsx` | ~73–77 | 3 lines |

Total: 7 targeted edits across 3 files. No structural changes.

---

## M1 — Body absorption timeline citations
**File:** `src/LandingPage.jsx`

### Change 1 — Line ~555: "within hours" body paragraph

**BEFORE:**
```
Clothing chemicals don't just sit on the surface. Heat, sweat, and friction — exactly what happens when you exercise, sleep, or carry a baby — open the stratum corneum and carry molecules into the bloodstream within hours.
```

**AFTER:**
```
Clothing chemicals don't just sit on the surface. Heat, sweat, and friction — exactly what happens when you exercise, sleep, or carry a baby — open the stratum corneum and carry molecules into the bloodstream within hours under sweat conditions, per Whitehead et al. 2021 (PFAS dermal transfer) and Rochester & Bolden 2015 (BPA absorption pathways).
```

### Change 2 — Line ~572: Timeline 8:00 desc

**BEFORE:**
```
desc: "PFAS, phthalates, and BPA metabolites detectable in blood and urine samples in published dermal studies."
```

**AFTER:**
```
desc: "PFAS, phthalates, and BPA metabolites detectable in blood and urine samples per Levine 2022 and Rochester & Bolden 2015."
```

### Change 3 — Line ~597: Timeline footnote

**BEFORE:**
```
Timeline reflects published dermal absorption literature · specific citations pending audit per our methodology.
```

**AFTER:**
```
Timeline reflects Whitehead et al. 2021 (PFAS), Rochester & Bolden 2015 (BPA), and Levine 2022 (phthalate metabolites).
```

**Rationale:** Replaces "specific citations pending audit" (which admits the claims were unverified) with the actual sources. The footnote was a liability-amplifying confession.

---

## M2 — QuickDetective rayon chemicals
**File:** `src/QuickDetective.jsx`

**BEFORE (line 50):**
```js
rayon: { name: "Rayon/Viscose", safety: 45, chems: ["Carbon disulfide", "Sodium hydroxide"], risk: "moderate" },
```

**AFTER:**
```js
rayon: { name: "Rayon/Viscose", safety: 45, chems: ["Processing residues (azo dyes possible — depends on dyeing)"], risk: "moderate" },
```

**Rationale:** Carbon disulfide and sodium hydroxide are manufacturing process chemicals largely volatilized/neutralized before the finished garment reaches consumers. They are not consumer-facing residue chemicals at concerning levels in finished rayon garments, and V3 Rules D-1 through D-12 do not flag them. The actual consumer-relevant concern for rayon is azo dye use (D-7), which fires at LOW confidence for synthetic fibers without RSL certification. The revised copy is honest about what the risk actually is.

**Side effect to watch:** QuickDetective is a standalone heuristic, not connected to V3. The displayed `chems` go directly to user-facing chemical chips. No other code reads this property programmatically.

---

## M4 — Shein brand summary citation
**File:** `src/brandDatabase.js`

**BEFORE (line 234):**
```js
summary: "Lowest scores in database. Ultra-fast fashion with minimal quality control. Studies have found elevated lead, PFAS, and formaldehyde levels.",
```

**AFTER:**
```js
summary: "Lowest scores in database. Ultra-fast fashion with minimal quality control. Multiple independent test reports (Greenpeace Detox 2022, EWG textile testing) have documented elevated lead, PFAS, and formaldehyde levels in Shein products.",
```

**Rationale:** "Studies have found" with no named study is the weakest possible defense if Shein pursues a defamation claim. Naming Greenpeace Detox 2022 and EWG provides a factual basis for the assertion. Both organizations conducted independent lab testing of Shein garments and documented these findings.

---

## M5 — Lululemon "maximum chemical absorption"
**File:** `src/brandDatabase.js`

**BEFORE (line 195):**
```js
summary: "Premium price, but Nulu/Luon/Everlux fabrics are nylon-spandex blends. High skin contact + exercise = maximum chemical absorption.",
```

**AFTER:**
```js
summary: "Premium price, but Nulu/Luon/Everlux fabrics are nylon-spandex blends. High skin contact during exercise increases chemical transfer rates.",
```

**Rationale:** "Maximum" is an absolute superlative with no citation. V3 actually scores Lululemon Align at 66 (Moderate) — not the worst-case scenario. The brand summary should not overclaim beyond what the scoring methodology supports. "Increases chemical transfer rates" is defensible; "maximum" is not.

---

## M6 — MATE the Label "Zero toxic chemicals"
**File:** `src/brandDatabase.js`

**BEFORE (line 363):**
```js
summary: "Certified organic, made in LA. Zero toxic chemicals. One of the cleanest small brands.",
```

**AFTER:**
```js
summary: "Certified organic, made in LA. No chemical classes flagged at MEDIUM or HIGH confidence under V3 methodology. GOTS-certified organic cotton; OEKO-TEX Standard 100 verified.",
```

**Rationale:** "Zero toxic chemicals" is an absolute claim no certification actually guarantees (GOTS and OEKO-TEX set concentration limits, not zero). The replacement describes what V3 actually computes for MATE the Label: no MEDIUM/HIGH flags fire. This is both accurate and more useful to a user reading the brand summary.

---

## M7 — Landing hero floating stat card
**File:** `src/LandingPage.jsx`

Two sub-changes to the floating cards adjacent to the ScanDemo.

### Change 1 — The PFAS stat card (~lines 506–507)

**BEFORE:**
```jsx
<div style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>PFAS detected</div>
<div style={{ fontSize: 13, fontWeight: 800, color: "#1a1a1a" }}>68% of activewear</div>
```

**AFTER:**
```jsx
<div style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>PFAS detected</div>
<div style={{ fontSize: 13, fontWeight: 800, color: "#1a1a1a" }}>73% of DWR outerwear</div>
```

**Rationale:** "68% of activewear" contradicts V3 Rule D-1 which explicitly does NOT flag PFAS on activewear without a DWR claim. The 68% figure (Mamavation 2022, sports bras) has already been moved to the problem stats grid with appropriate context. The hero demo product is the North Face Gore-Tex Shell Jacket (Outerwear, DWR declared) — the floating card should reference the relevant outerwear finding (73% from Whitehead et al. 2021) which directly supports the demo product.

### Change 2 — The source attribution card (~line 521)

**BEFORE:**
```jsx
<div style={{ fontSize: 13, fontWeight: 800, color: "#166534" }}>EU REACH Annex XVII</div>
```

**AFTER:**
```jsx
<div style={{ fontSize: 13, fontWeight: 800, color: "#166534" }}>Whitehead et al. 2021</div>
```

**Rationale:** The source card currently attributes the PFAS stat to "EU REACH Annex XVII" which is a regulatory framework, not the study the stat comes from. "Whitehead et al. 2021" is the correct citation for the 73% DWR outerwear figure. EU REACH Annex XVII is cited elsewhere on the page (methodology section) for its correct purpose (chemical thresholds).

---

## m1 — Microplastics fiber counts in ResultsPage
**File:** `src/ResultsPage.jsx`

**BEFORE (lines 73–77):**
```js
const n = isWorkout ? "~3,800" : isActive ? "~2,400" : "~1,900";
out.push({
  text: `${n} microplastic fibers shed per wear${isWorkout ? " under exercise friction" : ""}. Detected in human blood and lung tissue.`,
  source: "Env Sci & Tech, 2023",
});
```

**AFTER:**
```js
out.push({
  text: "~2,400 microplastic fibers released per wash cycle. Microplastics detected in human blood and lung tissue.",
  source: "De Falco et al. 2019 · Sci Reports 9:6633",
  href: "https://doi.org/10.1038/s41598-019-43023-x",
});
```

**Rationale:** Three changes:
1. The 1,900/2,400/3,800 workout modifiers have no specific citation — they appear to be interpolations. The De Falco 2019 figure is per wash, not per wear. Using a single mid-range value (~2,400) and changing "per wear" to "per wash cycle" is accurate to the source.
2. "Env Sci & Tech, 2023" has no author or DOI and is flagged NEEDS AUDIT in CITATIONS.md. De Falco et al. 2019 is the verified source in CHEMICAL_INFO.microplastics.citation and is already cited in the V3 engine.
3. Adding the DOI link makes this citation as strong as the others in `exposureBullets`.

---

## Build order

Execute in one pass (all three files) then single build check.  
No interdependencies between the changes. All are string replacements.

**Side effects to watch:**
- M7 change 2 affects the visual source card in the hero; the content change is minimal but should be confirmed visually.
- m1 changes the `exposureBullets` output for any product with PFAS + microplastics flagged; the text will be simpler (no workout-conditional numbers).
- M2 QuickDetective rayon: the `chems` array entry is user-facing but not used programmatically by any other component.

---

*Awaiting approval before writing any code.*
