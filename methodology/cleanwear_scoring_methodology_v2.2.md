# CleanWear Scoring Methodology v3 — Document Revision 2.1
**Document status:** Draft for review — not yet implemented  
**Prepared:** 2026-04-24  
**Revised:** 2026-04-24 (v2.2)  
**Reviewers:** Product owner, legal counsel, toxicologist/EHS researcher  
**Supersedes:** V1 (CleanWear.jsx `calculateScore()`), V2 (`scoringEngine.js`)  
**Prior version:** `methodology/cleanwear_scoring_methodology_v2.1.md` (retained for version history)

---

## Changelog: v2.1 → v2.2

| Fix | Section(s) changed | Summary |
|-----|--------------------|---------|
| NRDC year correction | §G, §E.6, §J, §K | All references to "NRDC 2023" corrected to "NRDC 2022 ('Going Out of Fashion')" — the scorecard was published April 2022, not 2023 |
| Staleness threshold | §E.3, §E.4 priority rule | Changed from 2-year to 5-year stale threshold; 2-year threshold incorrectly flagged the majority of NRDC 2022 data as stale in 2026 |
| GRS cert note | §B.2 | Added clarifying note that GRS (Global Recycled Standard) is treated equivalently to other listed certifications for cert bonus and rule suppression |

## Changelog: v2 → v2.1

| Fix | Section(s) changed | Summary |
|-----|--------------------|---------|
| A — Lululemon demo contradiction | §J Example 1; §J new Example 4 | Added marketing-alignment note to Example 1. Added Example 4 (North Face Gore-Tex shell, score 43 Elevated Risk) as a V3-compatible high-risk demo product. |
| B — Certification bonus ambiguity | §E.2 Step 3 | Replaced ambiguous Step 3 language with explicit rule covering zero-penalty and ceiling cases. Updated Example 3 narrative to reference the clarified rule. |
| C — C2 brand safety priority rules | §E.3; §J Example 3 | Replaced "most specific and most recent" with an explicit five-level priority order. Updated Example 3 (Patagonia) to resolve bluesign brand-level (priority 2) over Good On You (priority 3). C2 changes 82 → 75; final score changes 83 → 81. |
| D — Flame retardant schema mismatch | §B (schema); §D Rule D-11; §K | Implemented Option 1: extended Product schema with optional `subcategory` field and added "fitted"/"snug-fit" to FinishClaim recognized values. Rewrote Rule D-11 to use these fields. Added subcategory limitation note to §K. |

---

## A. Scope and Honesty Statement

CleanWear produces **category-level chemical risk estimates** for clothing products. A CleanWear score reflects the probability that a garment in a given category, made from declared materials, with stated finish treatments, and manufactured by a brand with a documented safety record, carries elevated levels of specific regulated or flagged chemical classes. It does not measure the actual concentration of any chemical in any specific garment, and it is not a substitute for laboratory testing. No CleanWear score constitutes a medical claim, a product recall recommendation, or a finding that any individual product is unsafe. Scores are computed from published regulatory data, independent brand assessments, and peer-reviewed research on chemical presence rates in garment categories; they are not derived from proprietary testing. Where the underlying data is incomplete, the score carries a lower confidence tier and the data gap is disclosed to the user.

CleanWear tracks **12 chemical categories**, not 1,000. The EU REACH restricted substances list, which contains over 1,000 entries, is used to define the regulatory thresholds applied within those 12 categories. Claiming to "cross-reference 1,000 chemicals" would be false; we do not make that claim.

---

## B. Inputs

The V3 engine accepts a single structured product object. All fields are required unless marked optional.

```
Product {
  product_id        : string           // internal identifier
  brand_id          : string           // matches an entry in the brand registry
  category          : CategoryEnum     // see §B.1
  subcategory       : SubcategoryEnum (optional)  // see §B.1 — required for D-11
  materials         : Material[]       // declared fiber composition
  finish_claims     : FinishClaim[]    // treatment claims from label or product page
  certifications    : CertEnum[]       // validated against official registries
  origin_country    : string (optional, informational only — not scored)
}

Material {
  name              : string           // e.g., "Polyester", "Organic Cotton", "Nylon"
  percentage        : integer (1–100)  // declared weight percentage
}

FinishClaim {
  value             : string           // normalized to lowercase
  // Recognized values: "water-resistant", "waterproof", "dwr", "gore-tex",
  //   "outdry", "h2no", "event", "wrinkle-free", "non-iron", "easy-care",
  //   "crease-resistant", "anti-odor", "antimicrobial", "flame-resistant",
  //   "stain-resistant", "uv-protection", "moisture-wicking",
  //   "fitted", "snug-fit"
  // "fitted" and "snug-fit" are garment-design descriptors (not chemical
  // treatment claims) used by Rule D-11 to identify CPSC flame-resistance
  // alternatives for children's sleepwear.
  // Unrecognized strings are stored but do not trigger rules.
  confidence        : "declared" | "inferred"
  // "declared" = present on physical label or brand product page
  // "inferred" = inferred from product name keywords (e.g., "DWR Jacket")
}
```

### B.1 Category and Subcategory Enums

**CategoryEnum:**  
`Athletic` | `Casual` | `Outerwear` | `Underwear` | `Sleepwear` | `Formal` | `Kids` | `Unknown`

The `Kids` category applies to garments sized for children under 14. It triggers stricter scoring parameters and additional disclosures regardless of other inputs.

**SubcategoryEnum** (optional field; used only where rules explicitly reference it):

| Subcategory | Applicable primary categories | Used by rule |
|-------------|------------------------------|-------------|
| `Sleepwear` | `Kids`, `Casual` | D-11 (Flame Retardants) |
| `Base Layer` | `Athletic`, `Casual` | Informational only in v3 |
| `Sports Bra` | `Athletic`, `Underwear` | Informational only in v3 |
| `Swimwear` | `Athletic` | Informational only in v3 |
| `Pajama` | `Kids`, `Casual` | Alias for `Sleepwear` in D-11 |

If `subcategory` is absent, rules that require it do not fire, and the absence is recorded in the score trace as a data gap. This is intentional: it is better to under-flag than to fabricate a subcategory inference.

### B.2 Certification Enum

Recognized certifications (must be validated against the issuing registry before being accepted as input):

`OEKO-TEX Standard 100` | `GOTS` | `bluesign` | `Fair Trade` | `Cradle to Cradle` | `MADE SAFE` | `ZQ Merino` | `GRS (Global Recycled Standard)` | `B Corp`

Certifications that are not on this list are stored as metadata but do not affect scoring.

**Two tiers of recognition:** Certifications on this list are recognized in two distinct ways, and these are NOT equivalent:

1. **Cert bonus + C2 brand signal (priority-2):** Certifications with genuine chemical safety scope — meaning they restrict or assess specific substances in finished textile products — produce both the C1 cert bonus (+8 per cert, capped at +20) AND a priority-2 C2 brand signal. These are: OEKO-TEX Standard 100, GOTS, bluesign, GRS, MADE SAFE, Cradle to Cradle.

2. **Cert bonus only (no C2 signal):** Certifications whose scope is primarily labor rights, animal welfare, business ethics, or supply chain traceability — not finished-product chemical safety — contribute the C1 cert bonus only. They do NOT produce a priority-2 C2 brand signal. These are: Fair Trade, B Corp, ZQ Merino.

   Rationale: Fair Trade's chemical scope is limited to worker safe-handling practices at factories; it does not test finished garments for chemical residues. B Corp is a business ethics assessment with no substance-specific restrictions. ZQ Merino certifies raw wool fiber at the farm level and does not govern chemical use in spinning, dyeing, or finishing. See `implementation-notes/cert_c2_research.md` for sourced justification.

**GRS and MADE SAFE note:** GRS (Global Recycled Standard) and MADE SAFE use ingredient-level upstream control rather than finished-product residue testing, on the same basis as bluesign. Both are treated equivalently to bluesign/OEKO-TEX for C2 signal purposes. MADE SAFE screens 15,000+ substances; GRS covers recycled content verification plus chemical restrictions.

**Cradle to Cradle tier caveat:** Cradle to Cradle's Material Health category scores from 75% material characterization (Bronze) to 100% including process chemistry (Platinum). The default C2 score of 72 reflects tier-unspecified conservative scoring. When a brand's C2C tier is known and is Gold or Platinum, the registrar may manually assign a higher score. Specifically, GRS (Global Recycled Standard) certification on a recycled fiber product (e.g., recycled cashmere, recycled polyester) contributes the same cert bonus as bluesign or OEKO-TEX, and may suppress chemical flags per the rules in §D, on the same basis as those certifications. GRS verifies recycled content and supply chain traceability; it does not directly test for chemical residues. The equivalence applies to the cert bonus mechanism only; product-specific lab testing (Tier 1 confidence) is not triggered by GRS.

---

## C. Chemical Categories

The V3 engine tracks 12 chemical categories. Eight were tracked in V1/V2; four are new additions in V3 (marked with ▲). For each, the table below provides the primary health concern, the textile pathway that introduces the chemical, the applicable regulatory threshold, and the severity weight used in scoring.

| # | Category | Primary Health Concern | Key Citation | Textile Pathway | EU Threshold | US Threshold | Scoring Severity |
|---|----------|----------------------|-------------|-----------------|-------------|-------------|-----------------|
| 1 | **PFAS** (per- and polyfluoroalkyl substances) | Carcinogen; endocrine disruption; bioaccumulation | Whitehead et al. 2021, *Env Sci Tech Letters* 8:538–544 | DWR coatings (C6/C8 fluoropolymers); Gore-Tex laminates; fluorinated stain guards | 25 ppb per compound (OEKO-TEX 2026) | No federal limit for apparel | **HIGH** |
| 2 | **Formaldehyde** | Group 1 carcinogen (IARC Monograph Vol. 100F, 2012); skin sensitizer | IARC 2012 | Wrinkle-free, non-iron, and easy-care resin finishes (DMDHEU and related agents) | 75 ppm (adult), 20 ppm (infant) (OEKO-TEX Std 100) | No federal adult clothing limit | **HIGH** |
| 3 | **Phthalates** (DEHP, DBP, BBP, DIBP) | Endocrine disruption; reproductive toxicity | Swan & Main 2003, *Environ Health Perspect* 111:1115–1121; REACH Annex XVII Entry 51 | Plasticizers in PVC accessories, screen printing inks; migration into elastane blends | 0.1% by weight (REACH Annex XVII Entry 51) | 0.1% in children's articles (CPSIA); no adult limit | **MODERATE** |
| 4 | **Bisphenols (BPA/BPS/BPF)** | Endocrine disruption; estrogenic activity | Rochester & Bolden 2015, *Environ Health Perspect* 123:643–650 | Polycarbonate coatings; polyester synthesis; thermal prints; some performance finishing agents | BPA restricted under REACH (SVHC, Annex XIV); BPS/BPF under review | EPA candidate for restriction; no apparel-specific limit | **MODERATE** |
| 5 | **Antimony trioxide** | Possibly carcinogenic (IARC Group 2B); toxic by inhalation | Biver et al. 2021, *Environ Pollution* 289:117878 | Catalyst in PET (polyester) polymerization; residues remain in finished fiber | 30 mg/kg (OEKO-TEX Std 100) | No apparel-specific federal limit | **MODERATE** |
| 6 | **Azo dyes (carcinogenic aromatic amines)** | Carcinogenic amines released by reductive cleavage under sweat/friction | REACH Annex XVII Entry 43 | Synthetic-fiber dyeing (nylon, polyester, acrylic); some cotton dyeing | 30 mg/kg per restricted amine (REACH Annex XVII Entry 43) | No federal limit | **HIGH** |
| 7 | **Heavy metals** (lead, cadmium, chromium VI, nickel) | Lead: neurotoxin; Cd: carcinogen; Cr(VI): carcinogen; Ni: sensitizer | EU Regulation 1907/2006 (REACH Annex XVII entries 23, 27, 47, 27) | Dye fixatives, pigments, metal zipper/hardware coatings, leather tanning | Pb < 90 mg/kg; Cd < 50 mg/kg; Cr(VI) < 3 mg/kg; Ni release < 0.5 µg/cm²/week | CPSC 90 ppm Pb (children); no adult limit | **MODERATE–HIGH** |
| 8 | **Microplastics** | Inflammatory response; bioaccumulation; endocrine disruption suspected | Browne et al. 2011, *Environ Sci Technol* 45:9175; De Falco et al. 2019, *Sci Reports* 9:6633 | Fiber shedding from polyester, nylon, acrylic during wear and washing | Under EU regulatory development (EU Microplastics Restriction, 2023 REACH) | No apparel-specific federal limit | **LOW–MODERATE** (emerging science; no established dermal dose-response) |
| 9 ▲ | **Organotins** (TBT, TPT) | Endocrine disruption; immunotoxicity | Kannan et al. 1996, *Environ Sci Technol* 30:1541; REACH Annex XVII Entry 20 | Biocide in antifungal/antimicrobial fabric treatments; PVC stabilizers | ≤ 1 mg/kg total organotins (REACH Annex XVII Entry 20) | No apparel-specific federal limit | **MODERATE** |
| 10 ▲ | **Nonylphenol ethoxylates (NPEs)** | Estrogenic activity; persistent environmental toxicant | Soares et al. 2008, *Environ Int* 34:1002–1011 | Detergent/surfactant residues from textile manufacturing; persist in finished garments | ≥ 0.01% by weight restricted (REACH Annex XVII Entry 46) | No federal apparel limit; California Prop 65 list | **MODERATE** |
| 11 ▲ | **Flame retardants** (halogenated: TCEP, TCPP, TDCP) | TCEP: carcinogen (IARC Group 2A); TDCP: probable carcinogen | CPSC Final Rule 16 CFR 1615/1616; Stapleton et al. 2011, *Environ Sci Technol* 45:5523 | Mandatory in children's sleepwear (US CPSC requirement when non-fitted); also used in outerwear foam padding | TCEP restricted (REACH SVHC); TDCP under review | Required in non-fitted children's sleepwear (CPSC) | **HIGH** (Kids Sleepwear); **LOW** (adult Sleepwear) |
| 12 ▲ | **Antimicrobial biocides** (nano-silver, triclosan, PHMB) | Thyroid disruption (triclosan); ecotoxicity; antimicrobial resistance | Dhillon et al. 2015, *Biomed Res Int* 2015:796914; EU Biocidal Products Regulation 528/2012 | Applied to "anti-odor" and "antimicrobial" labeled textiles | Regulated under EU BPR if active claim; nano-silver: size-dependent restrictions | EPA registered biocide; FTC guides on antimicrobial claims | **LOW–MODERATE** |

**What this list is not:** This is not the EU REACH restricted substances list (which has 1,000+ entries). It is the subset of that broader regulatory landscape for which CleanWear has inference rules, severity weights, and cited pathways. Many regulated substances (e.g., specific disperse dyes, specific PAHs, brominated flame retardants beyond those listed) are not currently tracked because reliable inference rules cannot be written without product-specific test data. Those gaps are acknowledged in §K.

---

## D. Inference Rules

Each rule maps product inputs to a chemical flag at a stated confidence level. **A flag at MEDIUM or HIGH confidence contributes to the chemical component of the score. A flag at LOW confidence is disclosed to the user as a note but does not penalize the score.** Every rule cites its source.

Rules are evaluated in the order listed. A product may trigger multiple rules, and confidence levels do not compound (the highest-confidence flag for a given chemical category wins).

---

### Rule D-1: PFAS
```
IF finish_claims contains any of:
   "water-resistant" | "waterproof" | "dwr" | "gore-tex" | "outdry" |
   "h2no" | "event" | "stain-resistant"
THEN flag PFAS at MEDIUM confidence

IF finish_claims contains any of the above AND confidence = "declared"
   (i.e., present on physical label or official brand product page)
THEN upgrade to HIGH confidence

IF category = "Outerwear" AND finish_claims is empty
THEN flag PFAS at LOW confidence
   [Rationale: the majority of outerwear uses DWR treatments (Whitehead et al.
    2021 found 73% of tested outdoor apparel had detectable PFAS), but without
    an explicit claim, HIGH or MEDIUM confidence is not warranted.]

IF category = "Athletic" AND finish_claims is empty
THEN no PFAS flag
   [Rationale: The 68% positive PFAS rate in Mamavation 2022 was for sports
    bras specifically, in a non-random sample. This does not support a blanket
    rule that all athletic wear contains PFAS. V2's broad "athletic = PFAS flag"
    is not retained here.]
```
**Primary citation:** Whitehead et al. 2021, *Environ Sci Technol Lett* 8:538–544 (73% of outdoor apparel and 54% of athletic wear had detectable PFAS, but PFAS presence was strongly correlated with DWR labeling). OEKO-TEX Standard 100 (2026): 25 ppb per compound limit.

---

### Rule D-2: Formaldehyde
```
IF finish_claims contains any of:
   "wrinkle-free" | "non-iron" | "easy-care" | "crease-resistant" | "wrinkle-resistant"
THEN flag Formaldehyde at HIGH confidence
   [Rationale: these finishes are primarily achieved with DMDHEU (dimethylol
    dihydroxyethyleneurea) and related formaldehyde-releasing resins.]

IF materials contains Cotton (any percentage) AND finish_claims is empty
THEN flag Formaldehyde at LOW confidence
   [Rationale: formaldehyde residue from processing is commonly detected even
    without explicit treatment claims, but at levels below threshold for
    typical cotton basics (EWG 2022 testing). LOW confidence = disclosure only,
    no score penalty.]

IF certifications contains OEKO-TEX Standard 100
THEN suppress any Formaldehyde flag
   [Rationale: OEKO-TEX certification requires testing at the 75 ppm adult /
    20 ppm infant threshold. A certified garment has been verified to pass.]
```
**Primary citations:** IARC Monograph Vol. 100F (2012), Group 1 carcinogen classification. OEKO-TEX Standard 100 (2026 edition), formaldehyde limits. EWG 2022 textile chemical testing.

---

### Rule D-3: Phthalates
```
IF materials contains Spandex OR Elastane OR Lycra (any percentage)
THEN flag Phthalates at MEDIUM confidence

IF certifications contains GOTS OR OEKO-TEX Standard 100
THEN downgrade Phthalates flag to LOW confidence
   [GOTS prohibits phthalates throughout the supply chain; OEKO-TEX tests to
    REACH Annex XVII Entry 51 limit of 0.1% by weight.]
```
**Primary citations:** REACH Annex XVII Entry 51 (as amended 2018, restricting DEHP/DBP/BBP/DIBP). Swan & Main 2003 (reproductive toxicity in phthalate exposure). Note: phthalates in elastane are a known processing concern, though concentrations in finished garments vary widely.

---

### Rule D-4: Bisphenols (BPA/BPS)
```
IF materials contains Polyester (any percentage)
   AND finish_claims is empty
THEN flag BPA at LOW confidence
   [Rationale: BPA is not a direct polyester synthesis catalyst in modern
    production (antimony is), but BPA-based thermal stabilizers and coatings
    are used in some polyester finishing processes. Evidence for dermal transfer
    at scale is limited. Flag at LOW = disclosure only.]

IF finish_claims contains "stain-resistant" AND materials contains Polyester
THEN flag BPA at MEDIUM confidence
   [Rationale: some fluoropolymer and bisphenol-based stain-resistant
    treatments have documented BPA transfer under heat/friction conditions,
    per Rochester & Bolden 2015.]
```
**Primary citation:** Rochester & Bolden 2015, *Environ Health Perspect* 123:643–650.

---

### Rule D-5: Antimony Trioxide
```
IF materials contains Polyester (any percentage)
THEN flag Antimony at MEDIUM confidence
   [Rationale: antimony trioxide is the dominant catalyst in PET synthesis
    and residues transfer to finished fiber. Biver et al. 2021 measured
    antimony migration from polyester textiles into artificial sweat.]

IF certifications contains OEKO-TEX Standard 100 OR bluesign
THEN downgrade Antimony flag to LOW confidence
   [Both certifications require testing against the 30 mg/kg OEKO-TEX limit.]

IF materials contains Recycled Polyester
THEN retain MEDIUM confidence — do not downgrade unless certified
   [Recycled PET retains antimony from original synthesis; some studies find
    similar or higher antimony concentrations in rPET versus virgin PET
    (Biver et al. 2021).]
```
**Primary citation:** Biver et al. 2021, *Environ Pollution* 289:117878. OEKO-TEX Standard 100 (30 mg/kg antimony limit).

---

### Rule D-6: Microplastics
```
IF materials contains any of: Polyester | Recycled Polyester | Nylon |
   Recycled Nylon | Acrylic
THEN flag Microplastics at MEDIUM confidence
   [All synthetic polymer fibers shed microfibers during wear and washing.
    De Falco et al. 2019 quantified shedding rates across fiber types.]

No certifications currently suppress this flag.
   [OEKO-TEX and bluesign do not test for microplastic shedding rates.
    This remains an open regulatory gap.]
```
**Primary citations:** De Falco et al. 2019, *Sci Reports* 9:6633 (shedding quantification by fiber type). Browne et al. 2011, *Environ Sci Technol* 45:9175 (environmental accumulation). Note: health risk from dermal microplastic exposure is not established; this flag is primarily a disclosure flag with LOW–MODERATE severity.

---

### Rule D-7: Azo Dyes
```
IF materials contains Polyester OR Nylon OR Acrylic
   AND certifications is empty
THEN flag Azo Dyes at LOW confidence
   [Rationale: these fibers are commonly dyed with azo dyes; without a
    restricted substance list (RSL) certification, the specific dyes used
    cannot be confirmed safe. LOW confidence = disclosure only.]

IF certifications contains OEKO-TEX Standard 100 OR GOTS OR bluesign
THEN suppress Azo Dye flag
   [All three require testing against REACH Annex XVII Entry 43 limits.]
```
**Primary citation:** REACH Annex XVII Entry 43 (restricts use of azo colorants that may release specific aromatic amines at > 30 mg/kg).

---

### Rule D-8: Heavy Metals
```
IF certifications is empty AND brand safety tier = "high_risk"
   AND materials contains no natural fibers (no Cotton, Wool, Linen, Hemp, Silk)
THEN flag Heavy Metals at LOW confidence
   [Rationale: heavy metal presence in dyes cannot be reliably inferred from
    fiber type alone. This rule fires only for uncertified fast-fashion brands
    where independent testing has documented elevated levels (see Good On You
    "We Avoid" brands and Greenpeace Detox testing). It is LOW confidence
    because most individual products from these brands pass limits, but the
    category-level rate of exceedance is documented.]

IF certifications contains OEKO-TEX Standard 100 OR bluesign
THEN suppress Heavy Metals flag
```
**Primary citation:** REACH Annex XVII (multiple entries on specific metals). Greenpeace Detox Campaign testing reports (2012–2016, independent lab testing of major apparel brands documenting heavy metal exceedances).

---

### Rules D-9 through D-12 (New Categories)

**D-9: Organotins**
```
IF finish_claims contains "antimicrobial" OR "anti-odor" OR "anti-mold"
   AND certifications is empty
THEN flag Organotins at LOW confidence
```
Citation: REACH Annex XVII Entry 20; Kannan et al. 1996.

**D-10: Nonylphenol Ethoxylates (NPEs)**
```
IF brand_id maps to a brand WITHOUT a ZDHC MRSL-compliant supply chain claim
   AND certifications is empty
   AND materials contains Polyester OR Nylon
THEN flag NPEs at LOW confidence
   [NPE residues in finished garments are primarily a function of manufacturing
    process, not fiber type. This rule is a proxy until brand-level MRSL data
    is ingested.]
```
Citation: REACH Annex XVII Entry 46; Soares et al. 2008.

**D-11: Flame Retardants**

*Schema note (Fix D): This rule uses the `subcategory` field and the "fitted"/"snug-fit" FinishClaim values added to the Product schema in §B. Option 1 (schema extension) was chosen over Option 2 (keyword matching on product name) because it is more defensible — it keeps the rule deterministic and auditable rather than dependent on string matching against free-text product names. The trade-off is that data quality depends on correct subcategory entry at ingest time. When `subcategory` is absent for a Kids-category product, the rule cannot fire, and the trace records this as a data gap.*

```
IF category = "Kids" AND subcategory = "Sleepwear" OR subcategory = "Pajama"
   AND finish_claims does NOT contain "fitted" OR "snug-fit"
THEN flag Flame Retardants at HIGH confidence
   [US CPSC 16 CFR 1615/1616 requires flame resistance in non-fitted children's
    sleepwear. Compliance is almost universally achieved through chemical treatment
    in synthetic garments. The "fitted" and "snug-fit" FinishClaim values
    correspond to the CPSC's tight-fitting alternative compliance pathway, which
    does not require chemical treatment. If either is present, the chemical
    flame-retardant flag does not fire.]

IF category = "Kids" AND subcategory is absent
THEN record data gap: "subcategory not provided — D-11 flame retardant
    rule could not be evaluated for this Kids product"

IF category = "Sleepwear" (adult, no Kids category)
THEN flag Flame Retardants at LOW confidence
   [Adult sleepwear is not federally mandated to be treated, but chemical
    flame retardants are commonly applied to synthetic sleepwear as a
    cost-reduction measure versus tight-fit design.]
```
Citation: CPSC 16 CFR Part 1615/1616; Stapleton et al. 2011.

**D-12: Antimicrobial Biocides**
```
IF finish_claims contains "antimicrobial" OR "anti-odor" OR "silver" OR
   "HeiQ" OR "Polygiene" OR "X-Static"
THEN flag Antimicrobial Biocides at MEDIUM confidence
```
Citation: EU BPR 528/2012; Dhillon et al. 2015. Note: "moisture-wicking" alone does not trigger this rule.

---

## E. Scoring Algorithm

### E.1 Overview

The V3 score is a weighted average of three independent components. Each component has a defined computation, a defined source, and a defined weight. If a component cannot be computed (missing data), the remaining components are re-normalized to fill the weight. If only one component can be computed, the score is returned with a LOW confidence tier regardless of the component's own data quality.

| Component | Default Weight | Source |
|-----------|---------------|--------|
| C1: Material Chemical Risk | 45% | Inference rules (§D) applied to declared materials and finish claims |
| C2: Brand Safety Record | 35% | Brand registry (§G sources 2–6) |
| C3: Category Research Benchmark | 20% | Published garment category testing studies (§G sources 7–8) |

### E.2 Component 1: Material Chemical Risk (C1)

**Step 1 — Run all inference rules (§D).** For each rule that fires, record the chemical category, confidence level, and source.

**Step 2 — Apply severity penalties.** Starting from a base of 100, subtract penalty points for each flag that fires at MEDIUM or HIGH confidence. LOW-confidence flags are disclosed but carry no penalty.

| Severity | HIGH confidence | MEDIUM confidence |
|----------|----------------|-------------------|
| HIGH (PFAS, Formaldehyde, Azo Dyes, Flame Retardants) | −25 pts | −15 pts |
| MODERATE (Phthalates, Bisphenols, Antimony, Heavy Metals, Organotins, NPEs) | −15 pts | −10 pts |
| LOW–MODERATE (Microplastics, Antimicrobial Biocides) | −8 pts | −5 pts |

**Step 3 — Apply certification bonus.** Each recognized certification (§B.2) adds +8 points, up to a maximum of +20 per product. The bonus applies regardless of whether chemical flags fired — a clean product with certifications is expected to score at or near the ceiling, and a product with both flags and certifications receives the bonus against the post-penalty base. The bonus is applied after penalties, and the final C1 is clamped to [0, 100]. If the bonus drives C1 above 100, the excess is not carried forward — the ceiling at 100 is accepted as a minor signal loss.

**Step 4 — Clamp to [0, 100].**

```
C1 = max(0, min(100, 100 − Σ(penalties) + Σ(cert_bonuses)))
```

### E.3 Component 2: Brand Safety Record (C2)

Looked up from the brand registry at query time. Brand registry entries are sourced from the databases listed in §G.

| Brand safety data | Score |
|------------------|-------|
| NRDC PFAS rating A+ | 90 |
| NRDC PFAS rating A | 82 |
| GOTS certified brand | 80 |
| OEKO-TEX certified (brand-level) | 78 |
| NRDC PFAS rating B | 68 |
| Good On You: "Great" | 82 |
| Good On You: "Good" | 70 |
| bluesign approved brand | 75 |
| NRDC PFAS rating C | 52 |
| Good On You: "It's a Start" | 48 |
| NRDC PFAS rating D | 38 |
| Good On You: "Not Good Enough" | 35 |
| Good On You: "We Avoid" | 22 |
| NRDC PFAS rating F | 28 |
| No brand safety data on record | C2 = null (component excluded from score) |

**When a brand has multiple available signals, apply them in this priority order:**

1. **Product-level certification applied to this specific product** (bluesign product-approved, OEKO-TEX Standard 100 on this SKU, GOTS on this SKU) — use the score corresponding to that certification. This is the most precise signal and supersedes all others.
2. **Brand-level certification** (brand-wide bluesign approval, brand-wide GOTS). Score as listed in the table above.
3. **Independent third-party brand rating with the most recent publication date.** If NRDC 2022 ('Going Out of Fashion') and Good On You 2024 both exist, use Good On You 2024.
4. **Older independent brand ratings** (data older than 5 years at time of scoring) are disclosed in the score trace but carry a one-tier confidence downgrade to the overall score confidence. The 5-year threshold reflects the typical update cadence of independent brand assessment organizations: NRDC publishes annually but follow-ups track only subsets, and Good On You updates rolling but not all brands every year. A 2-year threshold would falsely flag the majority of brand data as stale.

> **Exception:** If a more recent rating supersedes an older one (e.g., if NRDC publishes a new edition after 2022), the older rating is no longer used regardless of the 5-year threshold. Staleness is only a factor when no newer data exists for the same source.
5. **If multiple signals at the same priority level produce different scores, use the median.**

Ties between signals at the same priority level are resolved in favor of the more conservative (lower) score.

### E.4 Component 3: Category Research Benchmark (C3)

Drawn from published garment category testing studies. These are static constants, updated when new studies are published. Each constant must cite its source.

| Category | Benchmark Score | Study | What it measures |
|----------|----------------|-------|-----------------|
| Athletic (synthetic, with DWR claim) | 28 | Whitehead et al. 2021; Mamavation 2022 | PFAS detection rate in performance athletic wear with DWR |
| Athletic (synthetic, no DWR claim) | 48 | Mamavation 2022 (adjusted for DWR-negative subset) | PFAS/chemical presence in synthetic activewear without coating claims |
| Athletic (natural fiber) | 65 | REACH Annex XVII baseline | Lower chemical finishing risk for natural-fiber athletic wear |
| Outerwear (with DWR claim) | 30 | Whitehead et al. 2021 (73% PFAS positive in DWR outerwear) | PFAS presence in DWR-treated outerwear |
| Outerwear (no DWR claim) | 55 | General synthetic textile baseline | Outerwear without water-treatment claims |
| Casual (synthetic) | 50 | REACH Annex XVII baseline | Synthetic casual wear |
| Casual (natural fiber) | 70 | REACH Annex XVII baseline | Cotton/linen/wool casualwear |
| Underwear (synthetic) | 42 | EWG 2022; chemical transfer risk for high-contact garments | Intimate apparel with high skin contact |
| Underwear (natural fiber) | 65 | EWG 2022 | Natural-fiber intimate apparel |
| Sleepwear (synthetic) | 42 | EWG 2022 | Prolonged skin contact during sleep |
| Sleepwear (natural fiber) | 62 | EWG 2022 | Natural-fiber sleepwear |
| Kids (any) | 38 | Zheng et al. 2025 (children's textiles, PFAS transfer) | **Applies only to Kids category.** Zheng et al. 2025 studied PFAS dermal transfer specifically in children's textiles. The 3,252× sweat amplification figure from that paper applies here and only here. It does not apply to adult garment categories. |
| Formal/Office (natural fiber) | 58 | EWG 2022 (formaldehyde in wrinkle-resistant dress shirts) | Baseline for dress shirts with likely wrinkle-free treatment |
| Formal/Office (no wrinkle claim) | 68 | General textile baseline | Natural-fiber formalwear without treatment claims |

**Note on the Zheng 2025 multiplier:** Zheng et al. 2025 (*Science of the Total Environment*, PMID 40925318) measured PFAS dermal transfer from children's textiles under sweat conditions and found up to 3,252× amplification versus dry contact. This finding is specifically about children's skin and children's textiles. V2 applied this multiplier to adult athletic wear, which the paper does not support. In V3, the 3,252× figure is cited only as the evidentiary basis for the Kids category benchmark penalty, not as a universal sweat multiplier.

### E.5 Final Score Formula

```
# Collect available components
components = []
if C1 is computable: components.append({score: C1, weight: 0.45})
if C2 is not null:   components.append({score: C2, weight: 0.35})
if C3 is computable: components.append({score: C3, weight: 0.20})

# If no components, return null (display "Insufficient Data" to user)
if len(components) == 0: return null

# Re-normalize weights to sum to 1.0 with available components
total_weight = sum(c.weight for c in components)
normalized   = [(c.score * c.weight / total_weight) for c in components]
final_score  = round(sum(normalized))

# Confidence tier based on data completeness
if C1 and C2 and C3:                confidence = TIER_2  # "Strong Evidence"
elif len(components) == 2:          confidence = TIER_3  # "Partial Data"
elif len(components) == 1:          confidence = TIER_4  # "Insufficient Data"
if any cert is "Lab Verified":      confidence = TIER_1  # "Lab Verified"
```

### E.6 Score Trace

Every score must produce a trace object stored alongside the result:

```json
{
  "score": 54,
  "confidence_tier": 2,
  "components": [
    {
      "type": "material_chemical_risk",
      "score": 68,
      "weight": 0.45,
      "flags": [
        {"chemical": "phthalates", "confidence": "medium", "rule": "D-3", "penalty": 10},
        {"chemical": "microplastics", "confidence": "medium", "rule": "D-6", "penalty": 5}
      ],
      "cert_bonus": 0
    },
    {
      "type": "brand_safety",
      "score": 52,
      "weight": 0.35,
      "source": "NRDC PFAS Brand Scorecard 2022 ('Going Out of Fashion')",
      "source_url": "https://www.nrdc.org/...",
      "signal": "nrdc_pfas_rating_C",
      "priority_level_used": 3
    },
    {
      "type": "category_benchmark",
      "score": 48,
      "weight": 0.20,
      "category_resolved": "Athletic (synthetic, no DWR claim)",
      "source": "Mamavation 2022 (adjusted)",
      "source_url": "https://www.mamavation.com/..."
    }
  ],
  "low_confidence_disclosures": [
    {"chemical": "bpa", "rule": "D-4", "note": "Polyester detected; BPA flag at low confidence — no score penalty, disclosed only."}
  ],
  "data_gaps": ["No brand safety data on record for this brand ID"]
}
```

The trace now records `priority_level_used` for C2 signals (see §E.3 priority order). This trace must be stored in the `scans` table alongside the score (the `chemicals` JSONB column can hold this structure). It must be re-producible: running the same inputs through the engine must always produce the same trace.

---

## F. The Stricter-Threshold Rule

When EU and US regulatory thresholds differ, CleanWear applies the stricter (lower) limit, regardless of which market the user is in. Rationale: the EU has the most developed regulatory framework for textile chemicals; applying EU thresholds to all products provides a consistent, conservative baseline.

| Chemical | EU Limit | US Limit | V3 Applies |
|----------|---------|---------|-----------|
| Formaldehyde (adult) | 75 ppm (OEKO-TEX) | None (federal) | **75 ppm** |
| Formaldehyde (infant) | 20 ppm (OEKO-TEX) | None (federal) | **20 ppm** |
| Lead (children's) | 0.5 mg/cm² (REACH) | 90 mg/kg (CPSIA) | **EU** |
| Phthalates (adults) | 0.1% by weight (REACH) | No adult limit | **0.1%** |
| Antimony | 30 mg/kg (OEKO-TEX) | None (federal) | **30 mg/kg** |
| Aromatic amines (azo) | 30 mg/kg per amine (REACH) | None (federal) | **30 mg/kg** |
| PFAS (per compound) | 25 ppb (OEKO-TEX 2026) | EPA advisory (drinking water); no apparel limit | **25 ppb** |

These thresholds are used in the inference rules (§D) to define when a certification suppresses a flag. They are reference thresholds, not measured values — CleanWear does not test products against these thresholds. The thresholds define what "certified safe" means when a product holds a recognized certification.

---

## G. Data Sources

The following table distinguishes between sources that are **referenced** in this methodology (informing constants and rules) and sources that are **operationally ingested** into the runtime system. We do not claim to query sources we do not query.

| # | Source | Access | Update Frequency | Role | Operational? |
|---|--------|--------|-----------------|------|--------------|
| 1 | OEKO-TEX Label Check | Public registry search + bulk download (registered partner) | Continuous | Certification validation at ingest time; threshold reference | **Operational** |
| 2 | NRDC PFAS Brand Scorecard ('Going Out of Fashion', April 2022) | Annual PDF report; manual ingest | Annual (2022 edition is current; subsequent follow-ups cover subsets only) | Brand C2 ratings | **Operational (manual, annual refresh)** |
| 3 | Good On You Brand Ratings | Public profiles + API (tiered access) | Continuous | Brand C2 ratings | **Operational** |
| 4 | GOTS Certification Database | Public search at global-standard.org | Continuous | Certification validation | **Operational** |
| 5 | bluesign Certified Products | Partner database | Periodic | Brand and product certification | **Operational (periodic)** |
| 6 | EU ECHA REACH Annex XVII | Bulk download from echa.europa.eu | Updated with EU legislation; check quarterly | Chemical threshold reference; rule definitions | **Referenced (static constants)** |
| 7 | Mamavation / EHN Testing Database | Published reports; manual review | Irregular (per publication) | C3 category benchmarks | **Referenced (static constants)** |
| 8 | Peer-reviewed literature (Whitehead 2021, Zheng 2025, EWG 2022, etc.) | Publications; DOI-linked | Per publication | C3 category benchmarks; rule rationale | **Referenced (static constants)** |

**Sources 6–8 are not queried at runtime.** They inform the constants embedded in the inference rules and category benchmarks, which are updated manually when new data is published. This is an honest and deliberate architectural choice: live-querying academic literature is not feasible, and pretending otherwise would be dishonest. When major new studies are published, the constants are updated with version notes.

---

## H. Brand Aggregation (Derived View Only)

A brand's displayed score is the **median** of V3 scores across all scored products for that brand, with a minimum of 3 products to compute. Median is used instead of mean because a single outlier product (e.g., a certified organic tee in an otherwise synthetic line) should not disproportionately shift the brand score.

Brand tier is derived from the median score using the same thresholds as product tier:

| Tier | Score Range |
|------|------------|
| Lower Risk | 70–100 |
| Moderate | 45–69 |
| Elevated Risk | 0–44 |

**Brand scores are clearly labeled as "based on N products scored" and are secondary to product-level scores.** A brand score is a summary view, not an independent data point.

---

## I. Transition Plan

### I.1 What happens to the 1,000 pre-assigned scores in `newProducts.json`

Diagnosis (from audit): The 1,000 products in `newProducts.json` were not generated by `generate-products.cjs` and their scores likely originate from an LLM batch process. The `chemicals` field is universally empty on synthetic products, indicating `deriveChemicals()` was not run before the file was written.

Action:

1. **Phase 1 — Batch re-score (before V3 launch):** Write a script that reads every product from `newProducts.json`, constructs a V3 input object from the available fields (`brand`, `category`, `materials` string), and runs it through the V3 engine. Products where V3 returns a score replace their hardcoded score. Products where V3 returns null (insufficient data — brand not in registry, category doesn't match, materials string is malformed) are flagged with `v3_score: null` and displayed to users with a `confidence_tier: 4` ("Insufficient Data") badge rather than a fabricated number.

2. **Phase 2 — Manual review queue:** Any product flagged in Phase 1 enters a review queue. Options: enrich the data (add brand registry entry, fix materials string) and re-score; or retire the product from the database until sufficient data exists.

3. **Do not delete the rows.** The product names and brand associations may still be useful for search and browsing even if we cannot score them yet.

### I.2 What happens to historical scans in the `scans` table

The `scans` table has a `scan_version` column (added in migration 002, currently always 1). Upon V3 launch:

- All existing scans are considered `scan_version: 1` (V1/V2 legacy). They are not retroactively re-scored.
- New scans written by V3 are stored as `scan_version: 3`.
- The results display page checks `scan_version`. For version 1 scans, it renders a notice: "This scan was scored with our original algorithm. Re-scan this item to see the updated score."
- User wardrobe scores are not silently updated. Users see their historical scores alongside a "re-scan" prompt.

### I.3 Parallel scoring period

V3 does not replace V2 on a hard cutover. The following conditions define "V3 is ready to take over":

1. The V3 engine is implemented and unit-tested with all 12 chemical rules.
2. At least 500 products from the existing database have been re-scored through V3, and the score distribution has been reviewed (not just numerically but by category) to check for unexpected patterns.
3. At least one toxicologist or environmental health researcher has reviewed this methodology document and the worked examples in §J, and their feedback has been incorporated or documented.
4. The batch re-score of `newProducts.json` has completed and the results have been reviewed.
5. The V3 score trace is being persisted correctly in the `scans` table.

During the parallel period, V2 runs in production. V3 scores are computed but logged to a shadow column (`score_v3`) without affecting the displayed score. The difference between V2 and V3 scores for the same inputs is monitored. Significant divergences (>15 points on known products) are investigated and documented before V3 goes live.

### I.4 What we tell users during transition

Nothing special during the parallel period — users see V2 scores as always. On V3 launch, a one-time notice: "We've updated our scoring methodology to be more precise. Scores for some products may have changed." Product-level results show the "last scored on [date]" timestamp and the "re-scan for latest score" option.

---

## J. Worked Examples

### Example 1: Lululemon Align Leggings (Moderate-Risk Synthetic Athleisure)

> **Note on marketing alignment (Fix A):** The current CleanWear landing page and share page demos present Lululemon Align at a score of 34 with PFAS flagged. V3 methodology does not support this characterization without a declared DWR treatment. Marketing must either substitute a different demo product or reframe the Lululemon demo with the V3 score (66, moderate risk). The UI copy audit (Prompt 2.7) will surface every location requiring change. See Example 4 below for a V3-compatible high-risk demo product.

**Input:**
- Brand: Lululemon (`brand_id: lululemon`)
- Category: `Athletic`
- Materials: `[{name: "Nylon", pct: 81}, {name: "Lycra", pct: 19}]`
- Finish claims: `[]` (none declared)
- Certifications: `[]`

**Rule firings:**

| Rule | Result |
|------|--------|
| D-1 (PFAS) | No finish claims, category = Athletic → **No flag** (V3 change from V2) |
| D-3 (Phthalates) | Lycra present → flag MEDIUM confidence → **−10 pts** |
| D-5 (Antimony) | No polyester → **No flag** (antimony is a polyester catalyst, not nylon) |
| D-6 (Microplastics) | Nylon present → flag MEDIUM → **−5 pts** |
| D-7 (Azo Dyes) | Nylon present, no certs → flag LOW → **disclosure only** |

**C1 (Material Chemical Risk):** 100 − 10 − 5 = **85**

**C2 (Brand Safety):** Lululemon → NRDC PFAS rating C (priority 3) → **52**

**C3 (Category Benchmark):** Athletic (synthetic, no DWR claim) → **48**

**Final score:** (85 × 0.45) + (52 × 0.35) + (48 × 0.20) = 38.25 + 18.20 + 9.60 = **66** (rounded)

**Confidence:** Tier 2 — "Strong Evidence" (all 3 components present, 2 cited sources)

**Disclosure note to user:** Low-confidence flags: Azo dyes (nylon, no certification on record).

**Score interpretation:** 66/100, Moderate Risk. The dominant driver is the NRDC C rating for PFAS commitment at the brand level and the synthetic activewear category benchmark. The material-only score is 85 because nylon/lycra without a declared DWR treatment has a more limited confirmed-chemical profile than polyester-with-DWR.

*Note: V2 scored Lululemon Align Leggings at 29–31. V3 scores it higher primarily because the broad PFAS flag on all athletic wear is removed. The V3 score reflects what the published evidence actually supports for undeclared DWR-treatment athletic nylon, not a worst-case assumption. This is a deliberate and defensible methodological change.*

---

### Example 2: Uniqlo HEATTECH Ultra Warm (Moderate-Risk Synthetic Base Layer)

**Input:**
- Brand: Uniqlo (`brand_id: uniqlo`)
- Category: `Athletic` (base layer, effectively casual/athletic crossover — use Athletic)
- Materials: `[{name: "Polyester", pct: 47}, {name: "Acrylic", pct: 32}, {name: "Rayon", pct: 16}, {name: "Spandex", pct: 5}]`
- Finish claims: `["moisture-wicking"]` (brand product page)
- Certifications: `[]`

**Rule firings:**

| Rule | Result |
|------|--------|
| D-1 (PFAS) | "moisture-wicking" is not on the DWR trigger list → **No PFAS flag** |
| D-2 (Formaldehyde) | No wrinkle-free/non-iron claim → LOW flag (rayon processing) → **disclosure only** |
| D-3 (Phthalates) | Spandex present → MEDIUM → **−10 pts** |
| D-4 (Bisphenols/BPA) | Polyester present, no stain-resist claim → LOW → **disclosure only** |
| D-5 (Antimony) | Polyester present, no cert → MEDIUM → **−10 pts** |
| D-6 (Microplastics) | Polyester + Acrylic → MEDIUM → **−5 pts** |
| D-7 (Azo Dyes) | Polyester + Acrylic, no certs → LOW → **disclosure only** |

**C1:** 100 − 10 − 10 − 5 = **75**

**C2 (Brand Safety):** Uniqlo → Good On You "It's a Start" (priority 3) → **48**

**C3 (Category Benchmark):** Athletic (synthetic, no DWR claim) → **48**

**Final score:** (75 × 0.45) + (48 × 0.35) + (48 × 0.20) = 33.75 + 16.80 + 9.60 = **60** (rounded)

**Confidence:** Tier 2 — "Strong Evidence"

**Disclosure notes:** Low-confidence flags: Formaldehyde (rayon processing residue), BPA (polyester, no test data), Azo dyes (synthetics, no certification).

**Score interpretation:** 60/100, Moderate Risk. Multiple synthetic fibers with MEDIUM-confidence chemical flags. The brand's modest public safety record and the synthetic activewear baseline drag the score into moderate territory.

---

### Example 3: Patagonia Capilene Cool Shirt (Lower-Risk Certified Product)

**Input:**
- Brand: Patagonia (`brand_id: patagonia`)
- Category: `Athletic`
- Materials: `[{name: "Recycled Polyester", pct: 88}, {name: "Spandex", pct: 12}]`
- Finish claims: `[]` (no DWR claim on Capilene Cool)
- Certifications: `["bluesign"]`

**Rule firings:**

| Rule | Result |
|------|--------|
| D-1 (PFAS) | No DWR claim → **No flag** |
| D-3 (Phthalates) | Spandex present → MEDIUM → downgraded to LOW by bluesign cert → **disclosure only** |
| D-5 (Antimony) | Recycled polyester present → MEDIUM → downgraded to LOW by bluesign cert → **disclosure only** |
| D-6 (Microplastics) | Recycled polyester present → MEDIUM → **no suppression** (no cert covers shedding) → **−5 pts** |
| D-7 (Azo Dyes) | Recycled polyester present → LOW → suppressed by bluesign → **No flag** |

**Certification bonus:** bluesign → +8 pts

**C1:** 100 − 5 + 8 = 103 → **clamped to 100** per §E.2 Step 3 (cert bonus drives above ceiling; excess not carried forward)

**C2 (Brand Safety):** Patagonia has two signals: bluesign brand-approved (§E.3 priority 2) and Good On You "Great" (§E.3 priority 3). Priority 2 supersedes priority 3 → **bluesign brand-approved → C2 = 75** *(changed from 82 in v2; see Fix C)*

**C3 (Category Benchmark):** Athletic (synthetic, no DWR claim) → **48**

**Final score:** (100 × 0.45) + (75 × 0.35) + (48 × 0.20) = 45.00 + 26.25 + 9.60 = **80.85 → 81** *(changed from 83 in v2)*

**Confidence:** Tier 2 — "Strong Evidence"

**Disclosure notes:** Low-confidence flags only: Microplastics (recycled polyester, shedding not addressed by any cert).

**Score interpretation:** 81/100, Lower Risk. The bluesign certification suppresses the phthalates, antimony, and azo dye concerns and drives C1 to the ceiling. The remaining microplastics flag is real and disclosed but carries a low scoring penalty. C2 uses bluesign brand-level approval (priority 2) rather than the Good On You "Great" rating (priority 3) per the §E.3 priority rule — which is the more conservative of the two and therefore also the methodologically correct choice under that rule's tie-breaking provision.

---

### Example 4: The North Face Gore-Tex Shell Jacket (Elevated Risk — V3 High-Risk Demo Product)

*Purpose: This example demonstrates V3's bite on a product with a declared DWR treatment. It is intended as a V3-compatible replacement for the Lululemon demo in marketing materials (see Example 1 note).*

**Input:**
- Brand: The North Face (`brand_id: north_face`)
- Category: `Outerwear`
- Materials: `[{name: "Nylon", pct: 85}, {name: "Polyester", pct: 15}]`
- Finish claims: `["waterproof", "gore-tex"]` — **confidence: declared** (on product page and hang tag)
- Certifications: `[]` (bluesign applies to select TNF products; not applied to this specific product)

**Rule firings:**

| Rule | Result |
|------|--------|
| D-1 (PFAS) | "waterproof" AND "gore-tex" present; confidence = declared → **HIGH confidence** → **−25 pts** |
| D-5 (Antimony) | Polyester (15%) present, no cert → MEDIUM → **−10 pts** |
| D-6 (Microplastics) | Nylon + Polyester → MEDIUM → **−5 pts** |
| D-7 (Azo Dyes) | Nylon + Polyester, no certs → LOW → **disclosure only** |

**C1 (Material Chemical Risk):** 100 − 25 − 10 − 5 = **60**

**C2 (Brand Safety):** The North Face → NRDC PFAS rating F (priority 3; most recent signal) → **28**

> *Priority note: NRDC 2022 ('Going Out of Fashion') is the only independent brand rating on record for TNF. If a bluesign brand-level approval exists for TNF generally, it would be priority 2 and would score 75, substantially changing the result. The trace must record which signal was used and when it was last verified.*

**C3 (Category Benchmark):** Outerwear (with DWR claim) → **30**

**Final score:** (60 × 0.45) + (28 × 0.35) + (30 × 0.20) = 27.00 + 9.80 + 6.00 = **42.80 → 43**

**Confidence:** Tier 2 — "Strong Evidence" (all 3 components present)

**Disclosure notes:** Low-confidence flags: Azo dyes (nylon/polyester, no certification on record).

**Score interpretation:** 43/100, **Elevated Risk.** This product sits below the 44-point threshold that separates Elevated Risk from Moderate. Three factors combine: (1) PFAS flagged at HIGH confidence because the DWR treatment is explicitly declared — unlike athletic wear, which gets no PFAS flag without a declaration, this jacket's hang tag removes all ambiguity; (2) the NRDC PFAS F rating reflects The North Face's historically weak public commitment to PFAS elimination despite selling DWR-treated products; and (3) the outerwear-with-DWR category benchmark reflects the 73% PFAS positive rate found in Whitehead et al. 2021 for this specific product type. All three inputs point the same direction.

**Why this product, not Lululemon Align, is the right V3 demo:** The Gore-Tex jacket scores 43 (Elevated Risk) because the evidence — declared DWR, poor brand PFAS record, validated outerwear testing data — genuinely supports that characterization. The Lululemon Align scores 66 (Moderate) because the evidence does not support a PFAS claim without a declared DWR treatment. V3 makes the distinction between these two cases explicit and traceable. The demo product should reflect real risk, not a manufactured one.

---

## K. Open Gaps and Limitations

This section is part of the methodology, not a disclaimer. Honest acknowledgment of limits is a scientific requirement.

**Chemicals not tracked and why:**

- **Disperse dyes (specific):** Many are allergens; some are restricted under OEKO-TEX and REACH. However, reliable inference rules cannot be written without knowing the specific dye formulations used, which are not disclosed on product labels. Not tracked.
- **Polycyclic aromatic hydrocarbons (PAHs):** Restricted under REACH Annex XVII. Presence in rubber and leather components is a concern, but fiber-type inference is not reliable. Not tracked.
- **Short-chain chlorinated paraffins (SCCPs):** POPs under Stockholm Convention; present in some leather treatments and PVC accessories. Cannot be inferred from typical apparel label information. Not tracked.
- **Residual pesticides (on cotton):** Organophosphate and pyrethroid pesticide residues from cotton farming are a legitimate concern. GOTS certification addresses this; uncertified cotton may carry residues. CleanWear does not currently infer pesticide presence from fiber origin. Not tracked.
- **VOCs from synthetic dyes:** Off-gassing from new synthetic garments is documented but highly variable. Not tracked.

**Known false positives:**

- A brand with an NRDC PFAS "F" rating may sell individual products that pass all relevant chemical tests — the brand score reflects a policy failure, not necessarily a product failure.
- Polyester flagged for antimony at MEDIUM confidence will include products manufactured with low-antimony catalysts or that have been certified but where the cert information has not yet been ingested into the registry.
- Finish treatments declared as "stain-resistant" cover a wide range of chemistries; not all use fluoropolymers. The PFAS flag for stain-resistant claims at MEDIUM confidence will over-flag non-PFAS stain treatments.

**Known false negatives:**

- A garment from an uncertified brand with no public safety record will receive a LOW-data score. If that brand's products actually contain high chemical levels, the score will underestimate risk.
- The microplastics flag is a shedding flag (environmental and dermal exposure). It does not account for microplastic ingestion from textiles, which is a separate and poorly quantified pathway.
- Rule D-11 (Flame Retardants) depends on the `subcategory` field being correctly populated at product ingest time. If a Kids garment is entered without a subcategory, the flame retardant rule cannot fire and the risk is not flagged. This is a data-quality dependency, not a rule gap — the rule is correct; the input must be correct for it to fire. Data ingestion workflows for Kids products must enforce subcategory as a required field.

**Product types not well-supported:**

- Footwear (complex multi-material construction; inference from uppers only is inadequate)
- Accessories (bags, hats) — category benchmarks not defined
- Non-apparel textiles (towels, bedding) — categories not defined in V3; Kids Sleepwear is the only home-textile adjacent category

**Database coverage:**

- The brand registry currently covers ~103 named brands. Brands not in the registry receive a null C2 component and a Tier 3 or 4 confidence score. This is a major coverage gap for the long tail of apparel brands.
- NRDC PFAS scorecard data is from 2022 ('Going Out of Fashion', April 2022). Brands that have changed practices since then are incorrectly scored until the next annual update.

---

*Document prepared 2026-04-24. Revised to v2.1 on 2026-04-24. This methodology replaces all prior scoring descriptions. Any marketing or UI copy that describes CleanWear's scoring must be consistent with this document. Any discrepancy between UI copy and this document should be resolved in favor of this document.*
