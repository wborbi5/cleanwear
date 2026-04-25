# Certification C2 Score Research
**Purpose:** Determine whether Fair Trade, Cradle to Cradle, MADE SAFE, ZQ Merino, and B Corp  
should produce priority-2 C2 brand signals in `brandRegistryV3.js`.  
**Source:** Agent research + madesafe.org, c2ccertified.org, bcorporation.net, fairtrade.net, discoverzq.com  
**Conclusion:** 2 of 5 get priority-2 C2 signals. 3 are cert-bonus only.

---

## Baseline reference scores (existing)
| Cert | C2 score | Why |
|------|----------|-----|
| GOTS | 80 | Organic fibers + comprehensive chemical RSL + supply chain |
| OEKO-TEX Standard 100 | 78 | Finished-product lab testing against ~100+ parameters with limits |
| bluesign | 75 | Brand partnership + environmental + chemical management system |
| GRS | 75 | Recycled content verification + some chemical restrictions |

---

## MADE SAFE — **Proposed: C2 score 78, priority-2** ✅

**Scope:** Screens every ingredient (raw materials, dyes, finishes, adhesives, coatings, processing aids) against a banned/restricted list of **15,000+ substances** — carcinogens, endocrine disruptors, developmental toxins, reproductive toxins, flame retardants, pesticides, toxic solvents, VOCs. Assessed by toxicologists against IARC, EPA, EU REACH, and peer-reviewed science.

**Mechanism:** Ingredient disclosure + hazard screening upstream (what goes *in* the product). Does NOT physically test finished garment residues the way OEKO-TEX does. However, any banned substance in the ingredient list causes rejection before production.

**Finished garment scope:** Yes. Patagonia, Naturepedic, and other apparel brands hold MADE SAFE on specific textile products.

**Vs OEKO-TEX:** Comparable breadth (broader substance list: 15,000 vs ~100 OEKO-TEX parameters). OEKO-TEX is stronger for *verifying* actual residue levels in finished goods (measured concentrations). MADE SAFE is stronger for upstream prevention. Both are rigorous chemical safety certifications.

**Score rationale:** Equal to OEKO-TEX (78). MADE SAFE's 15,000+ substance screen is broader in principle, but OEKO-TEX's finished-product residue testing is more directly verifiable. Treating them as equivalent at 78 is defensible; the mechanism differs but the safety intent is the same.

---

## Cradle to Cradle — **Proposed: C2 score 72, priority-2** ✅

**Scope:** Five-category certification. Material Health is one category, requiring chemical hazard assessment of every homogeneous material at ≥100 ppm against 21 human and environmental health endpoints (carcinogenicity, mutagenicity, reproductive toxicity, aquatic toxicity, bioaccumulation, etc.). Substances rated A/B/C/X/GREY.

**Tier-dependence:**
- Bronze: 75% of materials characterized
- Silver: 95% characterized
- Gold: 100% of product materials optimized
- Platinum: 100% + all process chemistry (dyes, finishing agents) contacting product in final manufacturing

**Mechanism:** Chemical hazard assessment by accredited third-party assessors. Like MADE SAFE, this is design-phase ingredient control, not finished-product residue testing. Platinum tier adds process chemistry coverage highly relevant to textiles (dyes, finishes).

**Finished garment scope:** Yes. Multiple textile brands hold C2C certification.

**Vs OEKO-TEX:** C2C Gold/Platinum is more comprehensive (21 endpoints, 100% material disclosure, includes process chemistry). Bronze/Silver is less rigorous. Without knowing the tier, we cannot assign a higher score than bluesign (75).

**Score rationale:** 72 — below bluesign (75) because (a) we don't know the tier, and Bronze/Silver represent genuinely lower chemical rigor than bluesign system partnership; (b) the mechanism is hazard assessment rather than finished-product lab testing. A brand with C2C Platinum should arguably score higher, but without tier data in the brand registry, 72 is the appropriate conservative value. This can be refined when tier data is available.

---

## Fair Trade Certified — **NO C2 signal** ❌ (cert bonus only)

**Scope:** Social compliance and supply chain audit. Environmental requirements cover safe chemical handling for **workers** and environmental management systems at the factory level — not chemical content of finished garments.

**No RSL/MRSL:** Does not maintain a restricted substances list comparable to OEKO-TEX or GOTS. Does not test finished products for chemical residues.

**Mechanism:** Factory audit of labor practices, fair wages, environmental procedures. There is no product-level chemical test of any kind.

**Conclusion:** Fair Trade certification provides no chemical safety signal about the garment a consumer will wear. It is a legitimate ethical signal (labor rights, supply chain ethics) and should remain in §B.2's cert list for the +8 cert bonus, but it should not produce a C2 brand safety signal. A brand scoring well on Fair Trade could still produce garments with high chemical load.

---

## B Corp — **NO C2 signal** ❌ (cert bonus only)

**Scope:** Holistic business ethics certification scored on governance, workers, community, environment, and customers via the B Impact Assessment (BIA). The environmental section includes some questions about chemical management systems and hazardous waste reduction — but these are policy questions, not substance-specific restrictions.

**No chemical testing:** No banned substances list, no RSL, no product-level chemical testing whatsoever. A brand can earn B Corp with zero chemical safety controls if its governance and labor scores are high enough.

**Conclusion:** B Corp is ethically meaningful but chemically uninformative. Like Fair Trade, it should remain in §B.2 for cert bonus eligibility only. Including it in lookupPriority2 would produce C2 scores for brands that may have high chemical risk (Allbirds has B Corp + synthetic materials with no chemical testing program).

---

## ZQ Merino — **NO C2 signal** ❌ (cert bonus only)

**Scope:** On-farm certification covering animal welfare (Five Freedoms), land management, environmental stewardship, social responsibility, and fiber traceability. Environmental requirements restrict certain on-farm inputs (specific pesticides, sheep dip chemicals). Does not extend beyond first processing.

**No finished-product scope:** ZQ certifies the raw wool fiber from farm to first processing point. The standard does not govern what chemicals are used in yarn spinning, dyeing, or textile finishing — the stages where most consumer-relevant chemical residues are introduced.

**Conclusion:** ZQ Merino is a traceability and animal welfare signal, not a chemical safety signal for the finished garment. A ZQ-labeled wool jacket attests that the raw fiber came from responsibly farmed sheep; it says nothing about formaldehyde in wrinkle-resistant treatments or azo dyes used in finishing. Cert bonus eligible, no C2 signal.

---

## Summary

| Cert | C2 Priority-2? | Score | Cert Bonus (+8)? |
|------|---------------|-------|-----------------|
| MADE SAFE | ✅ Yes | 78 | ✅ Yes |
| Cradle to Cradle | ✅ Yes | 72 (tier-unspecified) | ✅ Yes |
| Fair Trade | ❌ No | — | ✅ Yes |
| B Corp | ❌ No | — | ✅ Yes |
| ZQ Merino | ❌ No | — | ✅ Yes |

---

## Methodology §B.2 note needed

The distinction between "produces a C2 brand signal" and "contributes cert bonus only" is not currently documented in §B.2. The section lists all 9 certifications as "recognized" without clarifying that recognition for cert bonus ≠ recognition for C2 brand signal. A clarifying note should be added.
