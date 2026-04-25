# CleanWear System Audit
**Prepared:** 2026-04-24  
**Scope:** Full codebase, scoring methodology, data sources, gap analysis  
**Purpose:** Rebuild planning. Accuracy over diplomacy.

---

## 1. REPO STRUCTURE

### Directory Layout

```
cleanwear/
├── CleanWear/                          # Company docs (non-code)
│   ├── CLEANWEAR_REBUILD_PROMPT.md
│   ├── CleanWear_Scoring_Methodology.docx
│   └── CleanWear_Certification_Program.docx
├── MOA_PRES_CLEANWEAR.pdf/.pptx        # Pitch deck
├── cleanwear-app/                      # Main application
│   ├── api/                            # Vercel serverless functions (2 files)
│   │   ├── scan.js                     # ← core scan logic (404 lines)
│   │   └── vision.js                   # ← Claude vision API (215 lines)
│   ├── src/
│   │   ├── CleanWear.jsx               # Main app shell + V1 legacy scoring
│   │   ├── LandingPage.jsx             # Marketing page
│   │   ├── ResultsPage.jsx             # Results display
│   │   ├── CameraScanner.jsx           # Camera + barcode UI
│   │   ├── BrandExplore.jsx            # Browse brands view
│   │   ├── CertifyPage.jsx             # Certification page
│   │   ├── QuickDetective.jsx          # Fabric Detective
│   │   ├── scoringEngine.js            # ← V2 citation-based scoring (264 lines)
│   │   ├── productDatabase.js          # ← 1,641 hardcoded products (556 lines)
│   │   ├── brandDatabase.js            # ← 103 hardcoded brands (882 lines)
│   │   ├── supabase.js                 # Supabase client + logScan/wardrobe helpers
│   │   ├── analytics.js                # PostHog event wrappers
│   │   ├── config.js                   # Constants (FREE_SCAN_LIMIT=5)
│   │   ├── newProducts.json            # 1,000 pre-screened products (10,361 lines)
│   │   ├── design/components/
│   │   │   └── StateBlock.jsx          # ← "Cross-referencing 14 databases…" lives here
│   │   ├── results/helpers.js          # Result display helpers
│   │   ├── utils/scanCredits.js        # Free scan limit enforcement
│   │   ├── contexts/AuthContext.jsx
│   │   └── components/
│   │       ├── AuthModal.jsx
│   │       ├── ShareCard.jsx
│   │       ├── ScanLimitModal.jsx
│   │       └── PWAInstallBanner.jsx
│   ├── data/
│   │   ├── product-matrix.json         # ~641 product query entries (172 KB)
│   │   └── scan-results.json           # Unknown (appears unused in src/)
│   ├── supabase/migrations/
│   │   ├── 001_add_auth_and_wardrobe.sql
│   │   └── 002_public_scans.sql
│   ├── supabase-products-migration.sql # Products table schema
│   ├── scripts/
│   │   ├── generate-products.cjs       # Seed script for newProducts.json
│   │   └── create-posthog-dashboard.js
│   ├── CITATIONS.md                    # ← Citation audit doc (134 lines)
│   ├── DEPLOY.md
│   ├── vercel.json
│   └── vite.config.js
```

### File Counts

| Type       | Count | Notes |
|------------|-------|-------|
| `.jsx`     | 18    | React components |
| `.js`      | 8     | Utilities, API handlers, configs |
| `.json`    | 5     | Data files (newProducts.json is 10K lines) |
| `.sql`     | 3     | Supabase migrations |
| `.md`      | 2     | CITATIONS.md, DEPLOY.md |
| `.css`     | 1     | design/tokens.css |

### Where Scoring Code Lives

- **Primary score output:** `src/scoringEngine.js` — V2 citation-based engine  
- **Legacy backup scorer:** `src/CleanWear.jsx` — `calculateScore()` function (lines 88–129), runs V1 material-weighted formula  
- **Score orchestration:** `src/CleanWear.jsx` — V1 and V2 both run on every scan; V2 wins unless it returns null  
- **Brand data feeding scores:** `src/brandDatabase.js` — hardcoded NRDC/Good On You/OEKO-TEX ratings; scores re-computed via `engineScore()` at module load time  
- **Product data feeding scores:** `src/productDatabase.js` — known material compositions + `deriveChemicals()` helper  
- **API-level chemical inference:** `api/scan.js` — `enrichWithChemicals()` (lines 240–257) and `buildFallback()` (lines 287–337)

---

## 2. THE SCAN PATH

### Path A: Text Search (most common user flow)

1. **User types a product name** → `CleanWear.jsx` state → `handleScan()` function
2. `researchProduct(q, false)` is called (line 134–139 of `CleanWear.jsx`):
   ```js
   const r = await fetch("/api/scan", { method: "POST", ... body: JSON.stringify({ query: q, isBarcode: false }) });
   ```
3. **`/api/scan` serverless function** executes:
   - **Layer 1** — Supabase `products` table: `supabase.from('products').select('data').ilike('search_key', '%${q}%').limit(1)`. If hit, returns cached result immediately.
   - **Layer 5** — For text queries with no barcode, skips layers 2–4 entirely. Calls `buildFallback(query, false)`:
     - Regex-matches query string for material keywords (`polyester`, `nylon`, `cotton`, etc.) and brand names
     - Assigns a hardcoded material array and chemical list based on regex matches
     - If query matches a known brand name (Nike, Adidas, Lululemon, etc.), returns brand-appropriate defaults
     - Calls `cacheProduct()` to write the result to Supabase `products` table
4. API returns: `{ product_name, brand, category, materials, chemicals, certifications, origin, alternatives, _source: "fallback" }`
5. Back in `CleanWear.jsx`:
   - **V1** `calculateScore(pd)` runs: materialScore + chemicalScore + certScore + originScore weighted sum
   - **V2** `calculateScoreV2(pd, brand)` from `scoringEngine.js` runs in parallel
   - If V2 returns a result, `overall = v2.score`; otherwise `overall = v1_formula_result`
6. `logScan({ query, score, brand, product, category })` writes to Supabase `scans` table (fires-and-forgets)
7. Results passed as props to `<ResultsPage />` for display

### Path B: Barcode Scan

1. User taps camera icon → `CameraScanner.jsx` opens device rear camera via `getUserMedia()`
2. Barcode mode: `BarcodeDetector` API polls every 350ms, capturing canvas frames from the live video stream
3. On barcode detected: `onResult({ type: "barcode", value: rawValue })` callback fires → `handleCameraResult()` in `CleanWear.jsx`
4. `researchProduct(barcode, true)` → `POST /api/scan` with `isBarcode: true`
5. **`/api/scan`** runs full 5-layer lookup:
   - Layer 1: Supabase cache (barcode field)
   - Layer 2a: `UPCItemDB` — `https://api.upcitemdb.com/prod/trial/lookup?upc=${q}` (100 req/day free trial)
   - Layer 2b: `Open Products Facts` — `https://world.openproductsfacts.org/api/v3/product/${q}.json`
   - Layer 2c: `Open Food Facts` — `https://world.openfoodfacts.org/api/v2/product/${q}.json` (fallback)
   - Layer 3: If both brand and product name found → `enrichWithChemicals()` → cache → return
   - Layer 4: If only brand found → brand-level result with `_brand_level_only: true` flag → cache → return
   - Layer 5: `buildFallback()` — keyword matching
6. Same scoring and logging path as text search

### Path C: Camera Label Read / Fabric ID

1. User taps "Read Tag" or "Fabric ID" in `CameraScanner.jsx`
2. User taps capture → `analyzeImage()` in `CameraScanner.jsx`
3. Canvas frame captured from video → base64 encoded → `POST /api/vision` with `{ image: base64, mode: "tag"|"fabric" }`
4. **`/api/vision`** calls Claude API directly:
   ```js
   fetch('https://api.anthropic.com/v1/messages', {
     body: JSON.stringify({
       model: 'claude-sonnet-4-20250514',
       max_tokens: 1500,
       system: TAG_SYSTEM_PROMPT | FABRIC_SYSTEM_PROMPT,
       messages: [{ role: "user", content: [image_block, text_block] }]
     })
   })
   ```
5. Claude returns a JSON blob matching the product data schema
6. Response normalized, `pd._source = "vision_tag"|"vision_fabric"`, returned to frontend
7. Same scoring and logging path as text search

**Key data transformation summary for text search (the primary path):**

```
User query string
  → regex pattern matching in buildFallback()
    → inferred materials array (e.g., ["Polyester 88%", "Elastane 12%"])
      → chemical list derived from material names (e.g., ["antimony","microplastics","phthalates"])
        → V2 scoring: REACH flags + brand lookup + category benchmark
          → weighted average → integer 0–100
```

There is no actual product lookup by default for text queries. The Supabase cache is checked first, but on a fresh install it is empty. The fallback path — which is the actual primary path for most queries — does pure regex matching with no external data source.

---

## 3. DATA SOURCES

### Live External API Calls

| Source | Used In | Condition | What It Returns | Rate Limit |
|--------|---------|-----------|-----------------|------------|
| `UPCItemDB` (`api.upcitemdb.com/prod/trial`) | `api/scan.js` Layer 2a | Barcode scans only | brand, title, category | **100 req/day free trial. No API key. Will fail under any real traffic.** |
| `Open Products Facts` (`world.openproductsfacts.org/api/v3`) | `api/scan.js` Layer 2b | Barcode, only if UPCItemDB misses | product_name, brand, materials_tags, labels, origin | Free, no key |
| `Open Food Facts` (`world.openfoodfacts.org/api/v2`) | `api/scan.js` Layer 2c | Barcode, only if both above miss | brand name only | Free, no key |
| **Claude API** (`api.anthropic.com/v1/messages`) | `api/vision.js` | Camera tag/fabric mode only | Full product data JSON (LLM-generated) | Paid per token. Model: `claude-sonnet-4-20250514` |

**Claude prompt locations:**
- `TAG_SYSTEM_PROMPT` — lines 152–179 of `api/vision.js`. Instructs Claude to read a clothing label photo and return structured JSON with materials, chemicals (from a fixed 8-item list), certifications, origin.
- `FABRIC_SYSTEM_PROMPT` — lines 184–213 of `api/vision.js`. Instructs Claude to identify material from fabric texture and return same schema.

**Neither prompt is fed into text search scoring.** Claude is only invoked on camera capture.

### Supabase Tables (Read/Write)

| Table | Reads | Writes |
|-------|-------|--------|
| `products` | Every scan (cache check) | Every scan result (cache write) |
| `scans` | Feed queries (materialized view) | Every completed scan |
| `wardrobe` | Authenticated wardrobe fetch | Authenticated wardrobe add |
| `scan_disputes` | Never from frontend (service_role only) | User dispute submissions |
| `feed_trending_this_week` (materialized view) | `/feed` page | Refreshed by scheduled job |

### Hardcoded Static Data (Not Queried at Runtime)

| Source | Location | Data |
|--------|----------|------|
| NRDC PFAS Brand Scorecard 2023 | `brandDatabase.js` `BRAND_SAFETY_DATA` | Letter grades (A+ through F) for ~30 brands. Hardcoded. |
| Good On You Brand Ratings | `brandDatabase.js` `BRAND_SAFETY_DATA` | "great/good/it's a start/not good enough/we avoid" for ~30 brands. Hardcoded. |
| OEKO-TEX Label Check | `brandDatabase.js` `BRAND_SAFETY_DATA` | Boolean per brand. Hardcoded. |
| EU REACH Annex XVII | `scoringEngine.js` `getReachFlags()` | Chemical categories and limits. Hardcoded as string constants. |
| Mamavation 2022 Study | `scoringEngine.js` `getCategoryResearch()` | "68% PFAS positive / 10–284 ppm" figure. Hardcoded string. |
| Zheng et al. 2025 | `scoringEngine.js` `SWEAT_MULTIPLIERS` | 3,252× sweat multiplier. Hardcoded number. |
| EWG 2022 Study | `scoringEngine.js` | Category risk references. Hardcoded. |
| `newProducts.json` | `src/newProducts.json` | 1,000 products with pre-assigned scores. Origin of those scores unknown (not computed by V2 engine). |
| `data/product-matrix.json` | Not imported in any `src/` file found | 641 product query entries with `estimatedScore` field. Appears unused in production code. |

**Summary: The system does not query any live database of chemical data, regulatory lists, or brand certifications at runtime. All third-party data is either hardcoded constants or barcode-resolved product names from three free APIs.**

### PostHog Analytics

Client-side only. Events defined in `analytics.js` are fired on scan start, scan complete, camera start, barcode detected, alternative clicked, etc. Used for product analytics, not scoring.

---

## 4. SCORE COMPUTATION

### Two Engines, V2 Wins

Both engines run on every scan in `CleanWear.jsx`. If V2 returns a non-null result, it is used. If V2 returns null (no brand data and no matching category), V1 is used.

---

### V1 Legacy Scoring (`CleanWear.jsx`, lines 88–129)

Four components:

1. **Material Score** (60% weight): Weighted average of material scores from `MATERIAL_DB` lookup (hardcoded dictionary, 20 fiber types, scores ranging from acrylic=28 to organic cotton=95). Materials matched by name substring.

2. **Chemical Score** (15% weight): `100 - sum(severity)` where severity comes from `CHEMICAL_RISKS` dictionary (8 chemicals, severities 18–40).

3. **Certification Score** (15% weight): Starts at 40, adds bonus per certification (oeko-tex +15, gots +15, bluesign +12, fair_trade +8, cradle_to_cradle +14), capped at 100.

4. **Origin Score** (10% weight): Country name lookup from `COUNTRY_SCORES` dictionary (Germany=92, China=48, etc.).

```js
const f = Math.round(ms * 0.60 + cs * 0.15 + ct * 0.15 + os * 0.10);
```

---

### V2 Citation-Based Scoring (`scoringEngine.js`, lines 67–130)

Three weighted components:

**Component 1 — REACH Regulatory Flags (25% weight)**

```js
function getReachFlags(category, materials) {
  // Polyester or nylon in materials → phthalates flag
  // Activewear/athletic/waterproof/Gore-Tex → PFAS flag
  // Dress/formal/wrinkle/non-iron → formaldehyde flag
  // Synthetic materials → azo dyes flag
}
```

Score assigned by flag count:
- `>2 flags` → score 40
- `1-2 flags` → score 65
- `0 flags` → score 90 (though gaps array records the miss)

**Component 2 — Brand Safety Record (35% weight)**

Looks up brand in `BRAND_SAFETY_DATA` object using `brand.nrdc_pfas_rating` and `brand.good_on_you_rating`:

```js
if (brand.nrdc_pfas_rating === "A+") return { score: 88, ... }
if (brand.nrdc_pfas_rating === "A")  return { score: 82, ... }
if (brand.nrdc_pfas_rating === "B")  return { score: 68, ... }
if (brand.nrdc_pfas_rating === "C")  return { score: 52, ... }
if (brand.nrdc_pfas_rating === "D")  return { score: 38, ... }
if (brand.nrdc_pfas_rating === "F")  return { score: 28, ... }
if (brand.good_on_you_rating === "great")        return { score: 82, ... }
if (brand.good_on_you_rating === "good")         return { score: 72, ... }
if (brand.good_on_you_rating === "it's a start") return { score: 48, ... }
if (brand.good_on_you_rating === "we avoid")     return { score: 22, ... }
if (brand.oeko_tex_certified)        return { score: 78, ... }
```

This component only fires if `brand.confidence_tier <= 3`. Brands not in `BRAND_SAFETY_DATA` default to `confidence_tier: 4`, which skips this component entirely.

**Component 3 — Category Research Benchmarks (40% weight)**

Hardcoded risk scores per category, derived from published studies:

```js
// activewear/athletic → riskScore: 35 (Mamavation 2022, 68% PFAS positive)
// waterproof/outdoor → riskScore: 30 (Toxic-Free Future 2022, 58% PFAS)
// dress shirt/formal/wrinkle/non-iron → riskScore: 45 (EWG 2022)
// sleepwear/pajama → riskScore: 50 (EWG 2022)
// underwear/intimate → riskScore: 40 (EWG 2022)
// kids/baby/infant → riskScore: 38 (Zheng et al. 2025)
// natural fibers (cotton/wool/linen/hemp) → riskScore: 70 (REACH)
// regenerated cellulose (viscose/modal/bamboo) → riskScore: 55 (REACH)
// synthetic (polyester/nylon/spandex) → riskScore: 38 (Mamavation 2022)
```

**Final V2 Formula:**

```js
const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
const weightedScore = components.reduce((sum, c) => sum + (c.score * c.weight), 0) / totalWeight;
return { score: Math.round(weightedScore), ... }
```

If only 1 or 2 components have data (missing brand or missing category match), weights are renormalized automatically.

---

### Score Worked Example: Nike Dri-FIT Tee (text search)

1. `buildFallback("nike dri-fit tee")` → materials: Polyester 88%, Elastane 12%; chemicals: antimony, microplastics, phthalates, bpa
2. V2 engine runs:
   - REACH flags: polyester → phthalates flag; athletic → PFAS flag. 2 flags → score 65. Weight 0.25.
   - Brand lookup: Nike → nrdc_pfas_rating "B" → score 68. Weight 0.35.
   - Category: "athletic" → riskScore 35. Weight 0.40.
   - Weighted avg: `(65×0.25 + 68×0.35 + 35×0.40) / 1.0 = 16.25 + 23.80 + 14.00 = 54.05` → score **54**

Wait — brandDatabase.js hardcodes Nike score at 35 and re-runs `engineScore()` at module load time. The product score that actually ships is the one computed when `brandDatabase.js` is loaded, stored on `p.score`. The live `calculateScoreV2()` call in `CleanWear.jsx` may produce a slightly different result depending on how the product/brand objects are constructed at runtime vs load time. **Two separate score computations exist and they are not guaranteed to produce identical results.**

---

## 5. METHODOLOGY DOCUMENTATION

### Written methodology found in the repo:

**1. `CITATIONS.md`** (full document, 134 lines) — Documents citation status for every external reference in source code. Categories: VERIFIED, VERIFIED (DOI pending), NEEDS AUDIT, FABRICATED. Explicitly flags several "fun facts" in `SPOTLIGHTS` and `FUN_FACTS` arrays as NEEDS AUDIT. Documents one confirmed-fake citation (Ragnarsdóttir et al. 2024) that was never added to code. This is the most honest document in the repo.

**2. `LandingPage.jsx`, lines 636–686** — Public methodology section. States three components, their weights (25%/35%/40%), and source attributions. Selected quotes:

> "Three weighted components. All from cited sources. No AI guessing, no made-up numbers."

> "Scores pull from independent brand rating databases. A brand that earned an A on the NRDC PFAS scorecard outranks one with no public policy — regardless of marketing claims."

> "Scores are risk estimates, not lab results."

**3. `scoringEngine.js`, lines 1–6** — Code comment:

> "All scores are derived from cited data sources only. No AI inference. Every score component traces to a named source."

**4. `CleanWear/CleanWear_Scoring_Methodology.docx`** — Word document in the repo root. Not readable as plaintext in this audit. Appears to be a more detailed external methodology document. Must be reviewed separately.

**5. `CleanWear/CleanWear_Certification_Program.docx`** — Certification program document. Also not readable as plaintext.

### What's missing:

- No written explanation of how the 1,000 `newProducts.json` scores were generated  
- No documentation of V1 vs V2 engine interaction or when each fires  
- No changelog of score updates  
- No uncertainty quantification or confidence intervals on scores  
- The `data/product-matrix.json` `estimatedScore` values have no documented origin

---

## 6. DATABASE SCHEMA

### `products` Table (`supabase-products-migration.sql`)

This is the product cache — populated by the scan API on every new query result.

```sql
CREATE TABLE products (
  id          BIGSERIAL PRIMARY KEY,
  barcode     TEXT UNIQUE,
  search_key  TEXT UNIQUE,
  brand       TEXT,
  product_name TEXT NOT NULL,
  category    TEXT,
  data        JSONB NOT NULL,  -- full product blob from scan API
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

Indexes: barcode (WHERE NOT NULL), search_key (GIN trigram for ILIKE), brand.  
RLS: anonymous read/insert/update all permitted.

### `scans` Table (pre-existing + migrations 001 + 002)

Core scan log. Initial schema not in migration files (was pre-existing). Columns added by migrations:

```sql
-- Pre-existing columns (inferred from supabase.js logScan call):
id           BIGINT PRIMARY KEY (implied)
query        TEXT
score        INTEGER
brand        TEXT
product      TEXT
category     TEXT
scanned_at   TIMESTAMPTZ

-- Added by migration 001:
user_id      UUID REFERENCES auth.users(id)
posthog_distinct_id TEXT

-- Added by migration 002:
is_public    BOOLEAN DEFAULT true
is_verified  BOOLEAN DEFAULT false   -- NOTE: nothing sets this to true yet
share_slug   TEXT UNIQUE             -- auto-generated by trigger
chemicals    JSONB
scan_version INTEGER DEFAULT 1
disputed_at  TIMESTAMPTZ
disputed_reason TEXT
```

RLS policies: anon insert allowed; authenticated users can read/update own rows; public reads require `is_public = true AND is_verified = true` (effectively empty until a verification pipeline ships).

### `wardrobe` Table (migration 001)

```sql
CREATE TABLE wardrobe (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id   BIGINT REFERENCES products(id),
  scan_id      BIGINT REFERENCES scans(id),
  product_name TEXT NOT NULL,
  brand        TEXT,
  score        INTEGER,
  category     TEXT,
  scan_data    JSONB,
  added_at     TIMESTAMPTZ DEFAULT now()
);
```

RLS: users can only read/insert/delete their own rows.

### `scan_disputes` Table (migration 002)

```sql
CREATE TABLE scan_disputes (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  scan_id               BIGINT REFERENCES scans(id),
  share_slug            TEXT,
  submitter_email       TEXT,
  submitter_affiliation TEXT,
  claim                 TEXT NOT NULL,
  evidence_url          TEXT,
  status                TEXT DEFAULT 'open',
  created_at            TIMESTAMPTZ DEFAULT now(),
  resolved_at           TIMESTAMPTZ
);
```

RLS: anonymous insert allowed; no SELECT policy (only service_role can read disputes queue).

### `feed_trending_this_week` Materialized View (migration 002)

```sql
CREATE MATERIALIZED VIEW feed_trending_this_week AS
SELECT brand, product AS name, category,
       mode() WITHIN GROUP (ORDER BY score) AS score,
       COUNT(*) AS scan_count,
       MAX(scanned_at) AS last_scanned_at
FROM scans
WHERE is_public = true AND is_verified = true
  AND scanned_at >= now() - interval '7 days'
GROUP BY brand, product, category
HAVING COUNT(*) >= 2;
```

**This view will return zero rows at launch** because `is_verified` defaults to false and nothing in the codebase sets it to true. The feed page will be empty on day one and will remain empty until a verification pipeline is built and deployed.

### Score-Related Table Relationships

```
scans ←── FK ──→ wardrobe
products ←── FK ──→ wardrobe
scans ←── FK ──→ scan_disputes

products.data (JSONB): contains full product blob including score
scans.score: integer at time of scan (not linked back to products.data)
wardrobe.score: integer at time of add (not linked back to products.data)
```

There is no referential integrity between score values stored in different tables. If the scoring algorithm changes, existing scan/wardrobe scores are stale and there is no update mechanism.

---

## 7. GAP ANALYSIS

### The "14 Databases" Claim

**Finding: Fabricated. Not defensible.**

The text "Cross-referencing 14 databases…" appears in `src/design/components/StateBlock.jsx` at line 101, inside the `ScanProgress` component shown to users during scan loading. It is displayed as a real-time status message implying active cross-referencing is happening.

**Actual databases queried at scan time:**

For a text search (the primary path):
1. Supabase products cache (internal, often empty)
2. Fallback: zero external databases — `buildFallback()` is pure regex matching

For a barcode scan:
1. Supabase products cache
2. UPCItemDB (100 req/day free trial)
3. Open Products Facts
4. Open Food Facts

For camera label/fabric:
1. Claude API (one call)

**Maximum real count: 4 sources for barcodes, 1 for camera, 0 for text search.** The "14 databases" figure has no basis in the code. It is a loading animation string that was never backed by actual implementation.

This claim must be removed from the UI before any public launch. It is factually false and, depending on jurisdiction, potentially actionable under consumer protection law if presented as a feature.

---

### Marketing Claims vs Code Reality

| Claim (from LandingPage or UI) | Reality |
|-------------------------------|---------|
| "1,000+ chemicals tracked" | **False.** Eight chemical categories are tracked: bpa, pfas, formaldehyde, phthalates, azo_dyes, antimony, heavy_metals, microplastics. The "1,000+" figure is the EU REACH restricted substances count, which is cited as context but not queried or used in scoring. |
| "1,200+ products in database" | **Understated.** The database claims "1,641 products across 103 brands" in the `productDatabase.js` header, plus 1,000 products in `newProducts.json`. Actual count is closer to 2,641. |
| "100% cited sources" | **Partially true.** Core scoring sources (REACH, NRDC, Mamavation, Zheng 2025) are verified. Fun-fact carousel in `LandingPage.jsx` and `CleanWear.jsx` contains multiple unverified or fabricated statistics (see CITATIONS.md, section "NEEDS AUDIT"). |
| "No AI guessing, no made-up numbers" | **False as stated.** Claude is explicitly used for label reading and fabric identification. The `buildFallback()` function assigns chemicals based purely on query keyword matching — "nike dri-fit" gets assigned antimony/microplastics/phthalates/bpa because the word "dri-fit" matches a regex, not because that specific garment has been tested. |
| "No invented numbers" | **Partially false.** The 1,000 products in `newProducts.json` have pre-assigned scores. The origin of those scores is not documented in the codebase. They appear to have been batch-generated, possibly by LLM, as the `generate-products.cjs` script suggests. |
| "Cross-referencing 14 databases" | **Fabricated.** See above. |

---

### Is the Scoring Engine Defensible Against a Toxicologist's Review?

**No. Here are the specific failure points:**

**1. Chemical inference without product testing**  
The system assigns chemical presence based on fiber type (polyester → antimony) or brand name, not on actual product testing. This is valid as categorical risk communication but is presented as if it were product-specific. A toxicologist would immediately ask: "Where is the test data for *this* garment?" There is none.

**2. The chemical panel has 8 buckets, not 1,000**  
Every product in the database can only have some combination of: bpa, pfas, formaldehyde, phthalates, azo_dyes, antimony, heavy_metals, microplastics. This is an extremely coarse representation. EU REACH's 1,000+ restricted substances include alkylphenols, bisphenols beyond BPA, specific dye compounds, biocides, flame retardants, and dozens of other categories not captured here.

**3. The PFAS flag is applied too broadly**  
`getReachFlags()` flags PFAS for any product in a category containing the word "activewear," "waterproof," "athletic," or "sport," or containing "gore-tex" or "dwr" in materials. The 68% Mamavation PFAS finding was from sports bras specifically. Applying it to all athletic wear overstates risk for items not treated with DWR coatings.

**4. The Zheng 2025 (3,252×) multiplier is misapplied**  
Zheng et al. studied PFAS transfer in *children's textiles* specifically. The `SWEAT_MULTIPLIERS.workout: 3252` applies this figure to all synthetic activewear for all ages. This is not supported by the paper.

**5. Fun-facts carousel contains unverifiable claims presented as cited research**  
Examples displayed to users as "peer-reviewed research":
- *"The average person absorbs up to 120 different chemicals through their clothing every single day"* — attributed to "Stockholm University Research." No such study is documented. CITATIONS.md marks this NEEDS AUDIT.
- *"BPA in synthetic clothing leaches 15× faster during exercise when skin temperature exceeds 37°C"* — attributed to "Journal of Dermatological Science." No DOI or author provided. NEEDS AUDIT.
- *"Formaldehyde used in 60% of cotton clothing for wrinkle resistance"* — attributed to "Government Accountability Office." No such GAO report. NEEDS AUDIT.
These are presented in a "Research Spotlight" carousel with a heading "What the peer-reviewed research is saying." They are not peer-reviewed. Several may be fabricated.

**6. V1 and V2 scoring engines coexist without clear dominance logic**  
When V2 returns null (brand not in database, category not matched), V1 fires with no disclosed fallback. A user searching "no-name Chinese gym shirt" gets a V1-formula score with no sources shown. There is no indication to the user which engine produced their score.

**7. `newProducts.json` score origins are undocumented**  
1,000 products have pre-assigned integer scores (e.g., Vuori Performance Tee = 37). The `generate-products.cjs` script suggests these were batch-generated. If they were AI-generated, this directly contradicts the "no AI-generated scores" claim in the methodology.

**8. Origin score (V1) is geopolitical, not chemical**  
Vietnam=52, China=48, Bangladesh=42. These country scores have no peer-reviewed basis. Manufacturing quality varies enormously within a country, and a GOTS-certified factory in Bangladesh makes safer garments than a conventional factory in the EU.

---

## OPEN QUESTIONS

1. What generated the `newProducts.json` scores? The `generate-products.cjs` script exists but was not fully read. Were these LLM-generated scores?

2. What is the current schema of the `scans` table's pre-existing columns? The original table creation SQL is not in the migrations folder.

3. Does `data/product-matrix.json` serve any production purpose? No `import` of this file was found in `src/` files.

4. `CleanWear_Scoring_Methodology.docx` and `CleanWear_Certification_Program.docx` were not read (binary format). These may contain methodology detail that resolves some open questions or introduces new ones.

5. The `scan-results.json` file in `/data/` was not examined. Contents and production use unknown.

6. Is the UPCItemDB free trial the actual production integration, or is there a paid key in environment variables not exposed in the repo? The code comment says "free trial — 100 req/day, no key needed."

7. What is the current Supabase production state? Are there rows in `scans`, `products`, or `wardrobe`? Are there real users?

8. Is there a cron job or Edge Function refreshing the `feed_trending_this_week` materialized view? The code references `refresh_feed_trending()` but no scheduler is visible.

9. Several fun facts reference specific multipliers (BPA leaches 15× faster, 120 chemicals per day). Were these derived from real papers that were lost, or were they invented during product development?

---

## IMMEDIATE RISKS

**Legal / Compliance:**

1. **"Cross-referencing 14 databases" is false advertising.** The claim is displayed as a real-time status message to users. Consumer protection laws in most jurisdictions prohibit material misrepresentations of product functionality. This must be removed before any public launch or marketing.

2. **Fun-facts carousel makes health claims with fabricated citations.** Claims about chemical absorption, testosterone reduction, and cancer links are attributed to named journals without verifiable citations. Health claim misrepresentation is regulated under FTC guidelines and EU consumer law. Publishing fabricated health statistics attributed to peer-reviewed journals could expose the company to significant liability.

3. **Scores could harm specific brands without documented basis.** Nike scoring 35/100, Shein scoring 18/100, Temu scoring 16/100 are presented as data-backed scores. If these companies can demonstrate the scores are based on incorrect or fabricated inputs, defamation or product disparagement claims are possible.

4. **Medical/health framing without disclaimer.** The app presents chemical risk information in ways that could be interpreted as medical advice ("PFAS transfers through skin at baseline rate," "cancer risk increases with chronic exposure"). The footer says "Scores are risk estimates based on peer-reviewed research, not lab test results" — but this single disclaimer may be insufficient given the health claims made elsewhere in the UI.

**Technical:**

5. **UPCItemDB free trial (100 req/day) will break under any real traffic.** Any barcode scan that isn't cached will fail silently after 100 scans per day. The fallback is keyword matching, which produces poor results for barcodes.

6. **Feed page returns empty on launch.** `is_verified` defaults to false, nothing sets it true. The "Public Feed" feature does not work and cannot work until a verification pipeline is built.

7. **Two scoring engines with undocumented interaction.** A score audit is impossible without knowing which engine produced a given score. No engine identifier is stored in the `scans` table.

8. **No score versioning.** `scans.scan_version` exists but is never incremented in code. If the scoring algorithm changes, historical scores cannot be compared to current scores.

---

## RECOMMENDATIONS

**Fix before any public launch (legal exposure):**

1. Remove "Cross-referencing 14 databases" from `StateBlock.jsx`. Replace with something true: "Checking brand safety records…" and "Identifying chemical categories…"

2. Audit every statement in the `SPOTLIGHTS` and `FUN_FACTS` arrays. Remove any claim that cannot be traced to a specific paper with a DOI. The CITATIONS.md file has already done this work — execute on its NEEDS AUDIT flags. Do not launch with the Stockholm University or "60% of cotton" claims.

3. Add a disclaimer to the results page stating that scores are category-level risk estimates based on material composition and brand public records, not product-specific laboratory analysis.

**Fix before meaningful scale:**

4. Replace UPCItemDB free trial with a paid tier or alternative barcode lookup service.

5. Build the `is_verified` pipeline. Until this exists, the feed page does nothing and scan sharing is incoherent.

6. Document and unify the scoring engine. Pick V1 or V2 (V2 is better), deprecate V1, and store which engine version produced each scan score in the `scans` table.

7. Audit the `newProducts.json` scores. If they were AI-generated, either replace them with V2 engine outputs or disclose that they are model-estimated.

**Fix before a toxicologist or regulator reviews the product:**

8. Correct the "1,000+ chemicals tracked" claim to accurately state 8 chemical categories.

9. Add per-product confidence levels and data source disclosure on the results page. Users should see something like "Score for Nike athletic wear is based on: NRDC PFAS rating (B) + activewear category benchmark. Specific garment not tested."

10. Remove the country-of-origin penalty from V1 scoring or replace it with a documented methodology. Scoring Vietnam as 52 vs Germany as 92 is not scientifically grounded.

11. Correct the Zheng 2025 citation usage. The 3,252× figure applies to children's textiles and PFAS specifically. Do not display it as a universal sweat absorption multiplier for all synthetic fabrics.
