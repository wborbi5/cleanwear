# CleanWear — Citation audit (v1.0)

**Per design-handoff doc §5.6.** Every citation appearing in `src/` catalogued,
classified, and traced to a verifiable source. Fake citations are worse than
missing ones. When in doubt, render a component without the source line
rather than invent.

Status legend:
- **VERIFIED** — paper/regulation confirmed real, location cited below.
- **VERIFIED (DOI pending)** — paper is real; exact DOI needs to be linked
  in code. Author-facing copy is already defensible.
- **NEEDS AUDIT** — not yet confirmed; treat as suspect until a reviewer
  (research assistant or PI) signs off.
- **FABRICATED** — known fake, must be removed before launch. None currently
  present in `src/` at time of this audit.

---

## Verified citations in production code

### EU REACH Annex XVII
Used in: [LandingPage.jsx](src/LandingPage.jsx), [scoringEngine.js](src/scoringEngine.js)
Status: **VERIFIED**. Real EU regulation. Live index:
https://echa.europa.eu/substances-restricted-under-reach

### NRDC PFAS Brand Scorecard 2023
Used in: [brandDatabase.js](src/brandDatabase.js), [scoringEngine.js](src/scoringEngine.js)
Status: **VERIFIED**. URL in code:
https://www.nrdc.org/press-releases/new-pfas-scorecard-popular-apparel-brands-levi-strauss-earns-outdoor-brands-fail

### Zheng et al. 2025 — sweat-amplified PFAS dermal transfer (3,252×)
Used in: [LandingPage.jsx](src/LandingPage.jsx), [ResultsPage.jsx](src/ResultsPage.jsx), [scoringEngine.js](src/scoringEngine.js)
Status: **VERIFIED**. Full citation:
> Zheng et al. *Sweat-amplified dermal transfer and combined toxicity of
> per- and polyfluoroalkyl substances and organophosphate esters mixtures
> in children's textiles.* **Science of the Total Environment**, Sep 2025.
> PubMed ID 40925318. DOI: https://doi.org/10.1016/j.scitotenv.2025.181066

The 3,252× sweat-amplification figure is in the abstract verbatim.
Safe to display. **Code should prefer the full journal name
"Science of the Total Environment" over the shortened form**.

### Mamavation 2022 — 68% activewear positive for PFAS
Used in: [scoringEngine.js](src/scoringEngine.js) (with 10–284 ppm organic fluorine range)
Status: **VERIFIED**. Real Mamavation/EHN study:
https://www.mamavation.com/beauty/sports-bras-pfas-forever-chemicals.html

### OEKO-TEX Standard 100 + 2026 PFAS limit (25 ppb)
Used in: [scoringEngine.js](src/scoringEngine.js)
Status: **VERIFIED**. Real certification standard. OEKO-TEX 2026 Standard
updates published at https://www.oeko-tex.com/.

### IARC Monograph Vol. 100F (2012) — formaldehyde Group 1 carcinogen
Used in: [SharePage.jsx](src/pages/SharePage.jsx)
Status: **VERIFIED**. Real IARC publication:
https://publications.iarc.fr/Book-And-Report-Series/Iarc-Monographs-On-The-Identification-Of-Carcinogenic-Hazards-To-Humans/Chemical-Agents-And-Related-Occupations-2012

### Good On You brand ratings
Used in: [brandDatabase.js](src/brandDatabase.js)
Status: **VERIFIED**. Live reference: https://goodonyou.eco

---

## Verified (DOI pending) — copy is defensible, link needs confirming

### Whitehead et al. 2021 — PFAS in children's apparel
Used in: [SharePage.jsx](src/pages/SharePage.jsx) as the PFAS citation.
Status: **VERIFIED (DOI pending)**. Per design-handoff §5.6, this is a real
paper. Current code uses a placeholder DOI pattern. Research assistant to
replace with the actual DOI from *Environmental Science & Technology* 2021.

### Rochester & Bolden 2015 — BPA / BPS endocrine disruption
Used in: [SharePage.jsx](src/pages/SharePage.jsx) as the BPA citation.
Status: **VERIFIED (DOI pending)**. Known real paper in *Environmental Health
Perspectives*. Placeholder DOI in code needs swap to the real one.

### Swan et al. 2015 — phthalates and reproductive effects
Used in: [SharePage.jsx](src/pages/SharePage.jsx) as the phthalates citation.
Status: **NEEDS AUDIT — YEAR VERIFICATION**. Shanna Swan has multiple
well-known papers (the famous phthalate-anogenital-distance paper is 2005,
not 2015). Research assistant must confirm whether the 2015 *Human
Reproduction* paper in code is the intended source or if it should point
to Swan 2005 (*Environmental Health Perspectives*) or Levine et al. 2022
*Human Reproduction Update* (which is explicitly mentioned in §5.6 as
verified with the 53.3% sperm-count finding).

---

## Not yet used but flagged for future

Per the design-handoff doc §5.6, these are real papers that may show up as
the product expands. None are currently in code; add only after DOI
verification.

- Biver et al. 2021 · *Env Pollution* (antimony)
- Coperchini 2017 (PFAS thyroid)
- De Falco 2019 (microfibers)
- Franko 2012 (PFOA dermal)
- Levine et al. 2022 · *Human Reproduction Update* — 53.3% sperm count
  decline. Per §5.6, "verified". Save for the hormone-impact landing
  section when it gets built out per §4.1 section 3.

---

## Fabricated / removed

### Ragnarsdóttir et al. 2024
Status: **FABRICATED — flagged in §5.6 and NEVER added to code**.
Confirmed by grep: no occurrence anywhere in `src/`. Body-absorption
timeline currently renders without a source line instead.

### "68× the EU apparel limit" (landing headline stat)
Status: **NOT IN CODE**. Flagged fabricated in §5.6. Never shipped.

### "5× faster when sweating"
Status: **NOT IN CODE** (the 3,252× Zheng figure replaced any earlier
5× placeholder). Current displayed sweat-multiplier in ResultsPage is the
verified Zheng 3,252× value.

---

## Fun-facts content in LandingPage + CleanWear.jsx — needs audit pass

Both files contain a `FUN_FACTS` / `SPOTLIGHTS` array with statements like
"1,900 microplastic fibers per wash" (Env Sci & Tech 2023). These are
individually plausible but use shortened attributions like
"Environmental Science & Technology, 2023" without authors. Status:
**NEEDS AUDIT** — research assistant to replace each with a proper
author-year-journal-DOI citation or drop the stat.

Locations:
- [LandingPage.jsx](src/LandingPage.jsx) `SPOTLIGHTS` array (research carousel)
- [CleanWear.jsx](src/CleanWear.jsx) `FUN_FACTS` array (legacy scanner view — scheduled for removal when Results page rebuild lands)
