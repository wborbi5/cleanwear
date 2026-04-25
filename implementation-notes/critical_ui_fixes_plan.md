# Critical UI Fixes — Implementation Plan
**Addresses:** `implementation-notes/ui_copy_audit.md` flags C-01 through C-10  
**Scope:** C-01 through C-07 only. C-08, C-09, C-10 (`results/helpers.js`) deferred to V3 cutover.  
**Files changed:** `src/LandingPage.jsx`, `src/pages/SharePage.jsx`  
**Status: AWAITING APPROVAL — no code has been changed**

---

## Deferred flags note

**C-08, C-09, C-10 — `src/results/helpers.js` — deferred to V3 cutover.**  
These flags require coordinated rewrite with the V3 scoring engine (methodology §I.3 parallel scoring period). Specifically: the PFAS trigger list (C-08) and phthalates trigger list (C-10) must be updated in sync with the V3 inference rules; the Zheng 2025 sweat note (C-09) must be gated by category. Fixing these in isolation, before V3 ships, would cause the display layer to diverge from the current V2 engine in ways that confuse rather than clarify. Deferred.

---

## C-01 — "1,000+ chemicals tracked" → "12 chemical categories tracked"

**File:** `src/LandingPage.jsx`  
**Exact location:** Line 474 (hero trust-row stats array)  
**Diff size:** Tiny — 1 line  

**BEFORE:**
```jsx
{ n: "1,000+", l: "chemicals\ntracked" },
```

**AFTER:**
```jsx
{ n: "12", l: "chemical\ncategories tracked" },
```

**Rationale:** Methodology §A: "CleanWear tracks 12 chemical categories, not 1,000." The 1,000+ figure is the EU REACH list count, which CleanWear references but does not track. No adjacent copy changes needed — the surrounding stats ("1,200+ products in database", "100%  cited sources") remain.

**Side effects:** None. The stat is a display-only value in a `.map()` call. No logic depends on it.

---

## C-02 — Remove fabricated "22×" stat

**File:** `src/LandingPage.jsx`  
**Exact location:** Line 716 (problem stats grid, third item in 4-item array)  
**Diff size:** Tiny — 1 line  

**BEFORE:**
```jsx
{ num: "22×", label: "above safe BPA limits in sportswear", color: "#eab308" },
```

**AFTER:**
```jsx
{ num: "73%", label: "of DWR outerwear tested PFAS-positive", color: "#eab308" },
```

**Rationale:** "22×" has no source in CITATIONS.md or methodology. Replacement is Whitehead et al. 2021, cited in V3 methodology §D-1 (PFAS inference rule) and §G (data source 8).

**Side effects:** None. Same color preserved. Grid layout unchanged (still 2×2).

---

## C-03 — Remove fabricated "5×" stat

**File:** `src/LandingPage.jsx`  
**Exact location:** Line 717 (problem stats grid, fourth item)  
**Diff size:** Tiny — 1 line  

**BEFORE:**
```jsx
{ num: "5×", label: "faster absorption when sweating", color: "#16a34a" },
```

**AFTER:**
```jsx
{ num: "68%", label: "of tested activewear found PFAS-positive", color: "#16a34a" },
```

**Rationale:** "5×" is documented as fabricated in CITATIONS.md: "NOT IN CODE (the 3,252× Zheng figure replaced any earlier 5× placeholder)." It was not in code at the time of CITATIONS.md audit but existed in this grid. Replacement is Mamavation 2022, cited in V3 §E.4 (C3 category benchmark table, Athletic synthetic row) and §G.

**Side effects:** None. Same color preserved.

---

## C-04 — Replace Nike ScanDemo with The North Face Gore-Tex Shell

**File:** `src/LandingPage.jsx`  
**Locations:** Lines 109–112 (camera tag view), 181–205 (result state), 240 (demo label)  
**Diff size:** Medium — ~12 lines changed across 3 sub-sites within ScanDemo component  

### Sub-site 1: Camera tag view (lines 109–112)

**BEFORE:**
```jsx
<div style={{ fontSize: 9, fontWeight: 700, color: "#333", marginBottom: 6, letterSpacing: 0.5 }}>NIKE</div>
<div style={{ fontSize: 7, color: "#666", marginBottom: 3 }}>100% Polyester</div>
<div style={{ fontSize: 7, color: "#666", marginBottom: 3 }}>Made in Vietnam</div>
<div style={{ fontSize: 7, color: "#999", marginBottom: 6 }}>Machine wash cold</div>
```

**AFTER:**
```jsx
<div style={{ fontSize: 9, fontWeight: 700, color: "#333", marginBottom: 6, letterSpacing: 0.5 }}>THE NORTH FACE</div>
<div style={{ fontSize: 7, color: "#666", marginBottom: 3 }}>85% Nylon, 15% Polyester</div>
<div style={{ fontSize: 7, color: "#666", marginBottom: 3 }}>Made in Vietnam</div>
<div style={{ fontSize: 7, color: "#999", marginBottom: 6 }}>Waterproof / DWR treated</div>
```

### Sub-site 2: Result state (lines 181–205)

**BEFORE:**
```jsx
<ScoreCircle score={28} size={80} />
<div style={{ fontSize: 12, fontWeight: 700, color: "#ef4444", letterSpacing: 0.5, textTransform: "uppercase", marginTop: 12, marginBottom: 4 }}>
  Bad · 28/100
</div>
<div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a", marginBottom: 2 }}>
  Dri-FIT Training Tee
</div>
<div style={{ fontSize: 13, color: "#999", marginBottom: 16 }}>
  Nike · Athletic Shirt
</div>

{/* Chemical tags */}
<div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "center", marginBottom: 16 }}>
  {["Formaldehyde", "Antimony", "BPA"].map((c) => (
    <span key={c} style={{
      padding: "3px 9px", background: "#fef2f2", borderRadius: 5,
      fontSize: 11, color: "#b91c1c", fontWeight: 600,
    }}>
      {c}
    </span>
  ))}
</div>

<div style={{ fontSize: 12, color: "#888", lineHeight: 1.5, textAlign: "center" }}>
  3 chemicals linked to cancer and hormone disruption that absorb through your skin.
</div>
```

**AFTER:**
```jsx
<ScoreCircle score={43} size={80} />
<div style={{ fontSize: 12, fontWeight: 700, color: "#f97316", letterSpacing: 0.5, textTransform: "uppercase", marginTop: 12, marginBottom: 4 }}>
  Elevated Risk · 43/100
</div>
<div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a", marginBottom: 2 }}>
  Gore-Tex Shell Jacket
</div>
<div style={{ fontSize: 13, color: "#999", marginBottom: 16 }}>
  The North Face · Outerwear
</div>

{/* Chemical tags */}
<div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "center", marginBottom: 16 }}>
  {["PFAS", "Antimony", "Microplastics"].map((c) => (
    <span key={c} style={{
      padding: "3px 9px", background: "#fef2f2", borderRadius: 5,
      fontSize: 11, color: "#b91c1c", fontWeight: 600,
    }}>
      {c}
    </span>
  ))}
</div>

<div style={{ fontSize: 12, color: "#888", lineHeight: 1.5, textAlign: "center" }}>
  PFAS detected via declared DWR treatment. EU OEKO-TEX limit: 25 ppb per compound.
</div>
```

**Score color note:** `ScoreCircle` maps score 43 to `"#eab308"` (yellow, ≥40 threshold). The result label uses `"#f97316"` (orange) to match the "Elevated Risk" tier language from methodology §H. These two colors intentionally differ — ScoreCircle uses its own gradient; the label text uses the methodology tier palette.

### Sub-site 3: Demo label (line 240)

**BEFORE:**
```jsx
<div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#999" }}>
  Scanning a Nike tag — live demo
</div>
```

**AFTER:**
```jsx
<div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#999" }}>
  Scanning a North Face tag — live demo
</div>
```

**Side effects:** None structural. The ScanDemo is a pure display animation with no data dependencies. The `score` prop to `ScoreCircle` changes from 28 to 43, which changes the ring's color from red to yellow — that is the intended visual change.

---

## C-05 — Replace comparison cards (Nike 28, Lululemon 29)

**File:** `src/LandingPage.jsx`  
**Exact location:** Lines 747–754 (two `bad` objects in the comparison pairs array)  
**Diff size:** Small — 4 lines (2 `bad` objects, each 1 line)  

**BEFORE:**
```jsx
{[
  {
    bad: { name: "Dri-FIT Training Tee", brand: "Nike", score: 28, materials: "100% Polyester" },
    good: { name: "Organic Cotton Tee", brand: "Patagonia", score: 88, materials: "100% Organic Cotton" },
  },
  {
    bad: { name: "Align Leggings", brand: "Lululemon", score: 29, materials: "81% Nylon, 19% Lycra" },
    good: { name: "Organic Leggings", brand: "Pact", score: 87, materials: "95% Organic Cotton, 5% Spandex" },
  },
```

**AFTER:**
```jsx
{[
  {
    bad: { name: "Gore-Tex Shell Jacket", brand: "The North Face", score: 43, materials: "85% Nylon, 15% Polyester" },
    good: { name: "Organic Cotton Tee", brand: "Patagonia", score: 88, materials: "100% Organic Cotton" },
  },
  {
    bad: { name: "HEATTECH Ultra Warm", brand: "Uniqlo", score: 60, materials: "Polyester / Acrylic / Rayon / Spandex" },
    good: { name: "Organic Leggings", brand: "Pact", score: 87, materials: "95% Organic Cotton, 5% Spandex" },
  },
```

**Score source:** North Face 43 = methodology §J Example 4. Uniqlo HEATTECH 60 = methodology §J Example 2. Good-side products (Patagonia 88, Pact 87) are V3-consistent and unchanged.

**Visual note:** The ScoreCircle for score 43 renders yellow; score 60 renders yellow-green (≥60 threshold in ScoreCircle maps to `"#65a30d"` in `CleanWear.jsx`'s `sc()` function). The "bad" styling of the cards uses a red background (`#fef7f7`, `#fde8e8`) regardless of score — it will still look visually "bad" in context.

**Side effects:** None. The comparison section is static data; no logic depends on brand/product names.

---

## C-06 — SharePage default demo product

**File:** `src/pages/SharePage.jsx`  
**Exact location:** Lines 90–95  
**Diff size:** Small — 5 lines  

**BEFORE:**
```js
const brand = q.get("b") || "Nike";
const name = q.get("n") || "Dri-FIT Training Tee";
const score = parseInt(q.get("s") || "28", 10);
const garment = q.get("g") || "athletic tee";
const fromName = q.get("from") || null;
const chemicals = parseChemicals(q.get("ch") || "PFAS:high,Formaldehyde:mod,BPA:mod");
```

**AFTER:**
```js
const brand = q.get("b") || "The North Face";
const name = q.get("n") || "Gore-Tex Shell Jacket";
const score = parseInt(q.get("s") || "43", 10);
const garment = q.get("g") || "outerwear jacket";
const fromName = q.get("from") || null;
const chemicals = parseChemicals(q.get("ch") || "PFAS:high,Antimony:mod,Microplastics:mod");
```

**Rationale:** Default URL parameters define what a user sees when `/s/demo` (or any share URL without query params) loads. Current defaults show Nike at 28 with PFAS:HIGH — a claim V3 does not support (no DWR). New defaults show The North Face Gore-Tex Shell at 43 with PFAS:HIGH — which V3 explicitly supports (declared DWR treatment, methodology §J Example 4).

**Downstream effects to check:**
- `band` (line 98): `score >= 70 ? "low" : score >= 40 ? "mod" : "high"`. Score 43 → `"mod"`. Previously score 28 → `"high"`. The `alarmingSentence` will produce "Moderate-risk chemicals detected. Safer options exist at the same price." for score 43. That's accurate.
- `collective.avg` (line 102): hardcoded "34", unchanged — it's mock data anyway.
- `alt` (lines 105–111): Patagonia Capilene Cool Daily Tee at 82 as safer alternative. The reason says "Same moisture-wicking performance · PFC-free DWR · OEKO-TEX certified." For an outerwear jacket default, "moisture-wicking" is slightly off-brand as the reason. However, the reason copy does mention "PFC-free DWR" which is directly relevant to the PFAS issue on the Gore-Tex jacket. Leave unchanged — the copy is not inaccurate, and changing `alt` is outside this fix's scope.

**Side effects:** The `alarmingSentence` at line 76 for band "mod" and topChemical "PFAS" will produce: `"Moderate-risk chemicals detected. Safer options exist at the same price."` This is appropriate for score 43. Note that `"PFAS"` is the topChemical — but the sentence uses it as a display name, not a chemical claim. Acceptable.

---

## C-07 — SharePage trending rows

**File:** `src/pages/SharePage.jsx`  
**Exact location:** Lines 114–118 (`trending` array, rows 1 and 2 only)  
**Diff size:** Small — 2 lines  

**BEFORE:**
```js
const trending = [
  { rank: 1, thumbnail: "👕", brand: "Lululemon", name: "Align Leggings", scans: 2104, score: 29, chips: [{ label: "PFAS", tone: "bad" }] },
  { rank: 2, thumbnail: "👕", brand: "Nike", name: "Dri-FIT Training Tee", scans: 1247, score: 28, chips: [{ label: "Formaldehyde", tone: "bad" }] },
  { rank: 3, thumbnail: "👕", brand: "Patagonia", name: "Organic Cotton Tee", scans: 612, score: 88, chips: ["bluesign", "GOTS"] },
];
```

**AFTER:**
```js
const trending = [
  { rank: 1, thumbnail: "🧥", brand: "The North Face", name: "Gore-Tex Shell Jacket", scans: 2104, score: 43, chips: [{ label: "PFAS", tone: "bad" }] },
  { rank: 2, thumbnail: "👕", brand: "Uniqlo", name: "HEATTECH Ultra Warm", scans: 1247, score: 60, chips: [{ label: "Antimony", tone: "bad" }, { label: "Phthalates", tone: "bad" }] },
  { rank: 3, thumbnail: "👕", brand: "Patagonia", name: "Organic Cotton Tee", scans: 612, score: 88, chips: ["bluesign", "GOTS"] },
];
```

**Changes:**
- Row 1: Lululemon Align (29, PFAS) → The North Face Gore-Tex Shell (43, PFAS). PFAS chip retained — V3 supports PFAS on declared-DWR outerwear. Thumbnail updated to 🧥.
- Row 2: Nike Dri-FIT (28, Formaldehyde) → Uniqlo HEATTECH Ultra Warm (60, Antimony + Phthalates). Both chemicals are V3-supported: Antimony fires D-5 MEDIUM (polyester), Phthalates fires D-3 MEDIUM (spandex 5%). Score 60 from methodology §J Example 2.
- Row 3: Patagonia (88, bluesign/GOTS) — unchanged. V3-consistent per audit Part 5.

**Side effects:** Trending row data is mock/static — no queries, no state dependencies. `FeedRow` component receives these props as-is.

---

## Execution order and build strategy

Execute fixes in this order, running a build check after each:

1. C-01 → build check
2. C-02 + C-03 together (same array, same file, adjacent lines) → build check
3. C-04 → build check (most lines changed, merits its own check)
4. C-05 → build check
5. C-06 + C-07 together (same file, SharePage.jsx) → build check

**Build command:** `node_modules/.bin/vite build --outDir /tmp/cw-build`  
(The Windows-mounted `dist/` folder is not writable from the Linux sandbox; `/tmp/cw-build` is used throughout.)

If any build fails, that fix is reverted and reported before proceeding.

**Total estimated diff:** ~30 lines changed across 2 files. No imports, no exports, no new components, no logic changes. All edits are string literals within existing JSX expressions and JS arrays.
