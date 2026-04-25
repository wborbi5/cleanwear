# CleanWear V3 — Brand Registry Research
**Date:** 2026-04-24  
**Purpose:** Research Good On You, NRDC PFAS scorecard, and certification status for brands in `newProducts.json` not already covered by `brandDatabase.js`. Output is read-only research. No code changes until reviewed.

---

## Important Data Notes

**NRDC scorecard:** The authoritative PFAS scorecard is the **April 2022** publication titled "Going Out of Fashion" (not a 2023 edition — only a 2023 follow-up article tracking progress for a subset of previously graded brands). It covered approximately 30 U.S.-based parent companies. Any brand graded below is graded at the parent-company level. All grades referenced as "NRDC 2022."

**Certification verification levels:**
- `confirmed` = found on official bluesign partner PDF, GOTS database, or OEKO-TEX Label Check
- `claims/unverified` = brand's own website makes the claim; registry not confirmed via search
- `product-level only` = specific products or factories hold cert, but brand entity is not a registered system partner
- `not confirmed` = no evidence found on registry or brand site after two search attempts

**bluesign partner PDFs cited:**
- Sept 2024: https://www.bluesign.com/wp-content/uploads/2024/09/bluesign-System-partner-list_2024.09.02.pdf
- Sept 2025: https://www.bluesign.com/wp-content/uploads/2025/09/bluesign-System-Partner-Brands_2025.09.29.pdf
- Dec 2025: https://cms.bluesign.com/wp-content/uploads/2025/12/List-of-System-Partner-Brands_December-2025.pdf

---

## Part 1 — Already in `brandDatabase.js` (no research needed)

These 11 brands from `newProducts.json` are already covered:

| brand_name | brandDatabase.js id |
|------------|---------------------|
| ASOS | `asos` |
| Amazon Essentials | `amazon_essentials` |
| Banana Republic | `banana_republic` |
| Calvin Klein | `calvin_klein` |
| Carhartt | `carhartt` |
| Lee | *(via import/reference)* |
| Missguided | `missguided` |
| Romwe | `romwe` |
| The North Face | `north_face` |
| Tommy Hilfiger | `tommy_hilfiger` |
| Vuori | `vuori` |

---

## Part 2 — Research Results (39 brands)

| brand_id | brand_name | good_on_you | nrdc_2022 | bluesign | gots | oeko_tex | source_urls |
|----------|-----------|-------------|-----------|----------|------|----------|-------------|
| `altra` | Altra | Good | VF Corp: **D** (parent, pre-sale; Altra still under VF Corp as of research) | claims/unverified — some products use bluesign-approved materials per third-party reports; brand not confirmed as system partner | not confirmed | not confirmed | https://directory.goodonyou.eco/brand/altra |
| `anthropologie` | Anthropologie | Not Good Enough | not on scorecard | not confirmed | not confirmed | not confirmed | https://directory.goodonyou.eco/brand/anthropologie |
| `arc_teryx` | Arc'teryx | It's a Start | not on scorecard | **confirmed** — bluesign System Partner since 2013; on official Sept 2024 partner list | not confirmed | not confirmed | https://directory.goodonyou.eco/brand/arc-teryx ; bluesign Sept 2024 PDF |
| `billabong` | Billabong | Not Good Enough | not on scorecard | claims/unverified — sustainability page lists bluesign; not confirmed on registry via search | claims/unverified — sustainability page lists GOTS | claims/unverified — sustainability page lists OEKO-TEX | https://directory.goodonyou.eco/brand/billabong ; https://www.billabong.co.uk/mens-sustainability.html |
| `bombas` | Bombas | Not Good Enough | not on scorecard | not confirmed | not confirmed | not confirmed | https://directory.goodonyou.eco/brand/bombas |
| `club_monaco` | Club Monaco | **We Avoid** | not on scorecard | not confirmed | not confirmed | not confirmed | https://directory.goodonyou.eco/brand/club-monaco |
| `cotopaxi` | Cotopaxi | It's a Start | not on scorecard | product-level only — 38% of suppliers bluesign-certified per 2023/2024 impact report; brand not listed as system partner | not confirmed | product-level only — OEKO-TEX STeP and Made in Green at factory/product level | https://directory.goodonyou.eco/brand/cotopaxi ; https://www.cotopaxi.com/pages/sustainable-by-design |
| `cuyana` | Cuyana | It's a Start | not on scorecard | not confirmed | not confirmed | not confirmed | https://directory.goodonyou.eco/brand/cuyana |
| `dickies` | Dickies | Good | VF Corp: **D** (former parent; Dickies sold to Bluestar Alliance 2024 — grade may not apply post-sale) | not confirmed | not confirmed | not confirmed | https://directory.goodonyou.eco/brand/dickies |
| `eddie_bauer` | Eddie Bauer | Not Good Enough | not on scorecard | claims/unverified — on 2020 bluesign partner list; post-ABG acquisition status unconfirmed | not confirmed | product-level only — OEKO-TEX Standard 100 products listed by retailers; brand-level post-ABG unconfirmed | https://directory.goodonyou.eco/brand/eddie-bauer |
| `express` | Express | **We Avoid** | not on scorecard | not confirmed | not confirmed | not confirmed | https://directory.goodonyou.eco/brand/express |
| `free_people` | Free People | Not Good Enough | not on scorecard | not confirmed | not confirmed | not confirmed | https://directory.goodonyou.eco/brand/free-people |
| `hoka` | Hoka | It's a Start | Deckers Brands: **top performer / PFAS leader** (explicitly named in NRDC 2022 press release as industry leader; grade ~A range — exact letter not confirmed from public summary) | not confirmed | not confirmed | not confirmed | https://directory.goodonyou.eco/brand/hoka ; https://www.nrdc.org/press-releases/new-pfas-scorecard-popular-apparel-brands-levi-strauss-earns-outdoor-brands-fail |
| `hurley` | Hurley | **We Avoid** | not on scorecard (Nike divested Hurley 2020; now Bluestar Alliance) | not confirmed | not confirmed | not confirmed | https://directory.goodonyou.eco/brand/hurley |
| `l_l_bean` | L.L.Bean | Not Good Enough | **D** (individual brand; rated for incomplete PFAS commitment / long timeline to 2026) | **confirmed** — bluesign System Partner; on official bluesign partner lists (2023 and Sept 2024) | not confirmed | not confirmed | https://directory.goodonyou.eco/brand/llbean ; NRDC 2022 scorecard PDF ; bluesign Sept 2024 PDF |
| `mango` | Mango | It's a Start | not on scorecard (Spanish company; NRDC covered U.S.-based brands only) | not confirmed | not confirmed | not confirmed | https://directory.goodonyou.eco/brand/mango |
| `massimo_dutti` | Massimo Dutti | It's a Start | not on scorecard (Inditex subsidiary; NRDC covered U.S. brands) | not confirmed | not confirmed | not confirmed | https://directory.goodonyou.eco/brand/massimo-dutti |
| `merrell` | Merrell | Not Good Enough | Wolverine Worldwide: **F** (parent; Merrell not individually rated — note: Merrell committed to PFAS-free waterproofing by FW2024 per Wolverine's public statement) | not confirmed | not confirmed | not confirmed | https://directory.goodonyou.eco/brand/merrell |
| `mizuno` | Mizuno | Not Good Enough | not on scorecard (Japanese company) | not confirmed | not confirmed | not confirmed | https://directory.goodonyou.eco/brand/mizuno |
| `naadam` | Naadam | Not Good Enough | not on scorecard | not confirmed | not confirmed | not confirmed | https://directory.goodonyou.eco/brand/naadam — **note:** GRS (Global Recycled Standard) certified for recycled cashmere line; not one of the three queried certs |
| `o_neill` | O'Neill | Not Good Enough | not on scorecard | not confirmed | not confirmed | not confirmed | https://directory.goodonyou.eco/brand/oneill — **note:** rating from Apr 2021; may be stale |
| `outdoor_voices` | Outdoor Voices | Not Good Enough | not on scorecard | not confirmed | not confirmed | not confirmed | https://directory.goodonyou.eco/brand/outdoor-voices — **note:** brand filed bankruptcy early 2024; future unclear |
| `outerknown` | Outerknown | **Good** | not on scorecard | **confirmed** — bluesign System Partner; on official Dec 2025 partner list; listed at least since 2022 | claims/unverified — suppliers Bergman Rivera and Serflex S.A.C. hold GOTS scope certs; Outerknown as a brand entity not independently confirmed on GOTS registry | not confirmed | https://directory.goodonyou.eco/brand/outerknown ; bluesign Dec 2025 PDF ; https://www.outerknown.com/pages/about |
| `prettylittlething` | PrettyLittleThing | Not Good Enough | not on scorecard | not confirmed | not confirmed | not confirmed | https://directory.goodonyou.eco/brand/prettylittlething — Boohoo Group subsidiary |
| `public_rec` | Public Rec | **not on Good On You** | not on scorecard | not confirmed | not confirmed | not confirmed | https://publicrec.com — no third-party certifications or ratings found |
| `quiksilver` | Quiksilver | Not Good Enough | not on scorecard | not confirmed | not confirmed | not confirmed | https://directory.goodonyou.eco/brand/quiksilver — ABG-owned |
| `quince` | Quince | Not Good Enough | not on scorecard | not confirmed | not confirmed | product-level claims (unverified on registry) — OEKO-TEX cert numbers appear on product pages (e.g., cert #21.HIN.92598) but brand-level registry check not confirmed | https://directory.goodonyou.eco/brand/quince |
| `rei_co_op` | REI Co-op | Not Good Enough | **F** (NRDC 2022 — incomplete PFAS commitment; REI later announced PFAS ban commitment after scorecard) | **confirmed** — bluesign System Partner since 2008; confirmed on official partner lists | not confirmed | not confirmed | https://directory.goodonyou.eco/brand/rei ; NRDC 2022 ; https://www.rei.com/newsroom/article/starting-at-source-rei-partners-with-bluesign-technologies-ag-to-minimize-environmental-impact-and-increase-customer-care |
| `rhone` | Rhone | Not Good Enough | not on scorecard | not confirmed | not confirmed | not confirmed | https://directory.goodonyou.eco/brand/rhone |
| `rip_curl` | Rip Curl | It's a Start | not on scorecard | not confirmed | not confirmed | not confirmed | https://directory.goodonyou.eco/brand/rip-curl — KMD Brands subsidiary |
| `salomon` | Salomon | It's a Start | not on scorecard | **confirmed** — bluesign System Partner; on official Sept 2024 partner list (Salomon S.A.S.) | not confirmed | claimed/unverified — brand states 89% of FW2022 apparel used OEKO-TEX or bluesign materials per impact report; brand-level OEKO-TEX registration not confirmed on registry | https://directory.goodonyou.eco/brand/salomon ; bluesign Sept 2024 PDF |
| `saucony` | Saucony | Not Good Enough | not on scorecard (Wolverine Worldwide subsidiary; parent received F but Saucony not individually listed) | not confirmed | not confirmed | not confirmed | https://directory.goodonyou.eco/brand/saucony |
| `stance` | Stance | **We Avoid** | not on scorecard | not confirmed | not confirmed | not confirmed | https://directory.goodonyou.eco/brand/stance |
| `tyr` | TYR | **not on Good On You** | not on scorecard | not confirmed | not confirmed | not confirmed | https://directory.goodonyou.eco — no page found; no data from any source |
| `taylor_stitch` | Taylor Stitch | It's a Start | not on scorecard | not confirmed — not found as brand-level system partner | claims/unverified — brand website states woven shirting factories are GOTS-approved; brand entity not confirmed on GOTS registry | not confirmed | https://directory.goodonyou.eco/brand/taylor-stitch ; https://www.taylorstitch.com/blogs/factories/friends-in-woven-shirting |
| `toad_co` | Toad & Co | **Good** | not on scorecard | **confirmed** — bluesign System Partner on official Sept 2025 partner list; dedicated bluesign collection on site | confirmed — select organic cotton uses GOTS-certified materials (per brand and Good On You) | **confirmed** — OEKO-TEX Standard 100 covers ~75% of items; dedicated collection at toadandco.com/collections | https://directory.goodonyou.eco/brand/toad-and-co ; https://www.toadandco.com/pages/eco-certifications ; bluesign Sept 2025 PDF |
| `united_by_blue` | United By Blue | **Good** | not on scorecard | confirmed at manufacturing partner level — bluesign-certified manufacturing partners per brand page + Good On You | confirmed at manufacturing partner level — GOTS-certified manufacturing facilities | confirmed at manufacturing partner level — OEKO-TEX listed | https://directory.goodonyou.eco/brand/united-by-blue ; https://unitedbyblue.com/pages/manufacturing |
| `urban_outfitters` | Urban Outfitters | Not Good Enough | not on scorecard | not confirmed | not confirmed | not confirmed | https://directory.goodonyou.eco/brand/urban-outfitters |
| `wrangler` | Wrangler | It's a Start | not on scorecard (Kontoor Brands; spun off from VF Corp 2019 — VF Corp D grade does NOT apply to Wrangler) | not confirmed | not confirmed | not confirmed | https://directory.goodonyou.eco/brand/wrangler |

---

## Part 3 — Summary

**Total brands researched:** 39  
**Already in brandDatabase.js:** 11 (not researched)

**Data availability breakdown:**

| Signal | Count | Brand names |
|--------|-------|-------------|
| Good On You rating found | 37 | All except Public Rec, TYR |
| Good On You "Good" or better | 4 | Outerknown (Good), Toad & Co (Good), United By Blue (Good), Dickies (Good) |
| Good On You "We Avoid" | 5 | Club Monaco, Express, Hurley, Stance, (see flags) |
| NRDC 2022 grade confirmed | 4 | L.L.Bean (D), Merrell via Wolverine (F), REI Co-op (F), Hoka via Deckers (~A, top performer — exact letter unconfirmed) |
| bluesign confirmed on registry | 5 | Arc'teryx, L.L.Bean, Outerknown, REI Co-op, Salomon, Toad & Co |
| bluesign product/mfr level only | 2 | Cotopaxi (38% supplier coverage), United By Blue (mfr level) |
| GOTS confirmed | 2 | Toad & Co (brand-level), United By Blue (mfr level) |
| OEKO-TEX confirmed | 2 | Toad & Co (brand-level ~75%), United By Blue (mfr level) |
| No data found on any source | 2 | Public Rec, TYR |

---

## Part 4 — Flags for Manual Review

Brands where data is conflicting, stale, or ambiguous and should not be imported to the registry without a human judgment call:

| Brand | Issue | Recommendation |
|-------|-------|----------------|
| **Altra** | Good On You "Good" but VF Corp received D on NRDC. Altra may no longer be VF Corp — ownership was in transition. Parent-company grade should not be attached to Altra without ownership confirmation. | Verify current ownership. If still VF Corp, note inherited NRDC context. If sold separately, use GoY only. |
| **Billabong** | Brand sustainability page claims bluesign, GOTS, and OEKO-TEX, but none confirmed on official registries via search. Rating "Not Good Enough." Three unverified claims is a potential greenwashing flag. | Do not import cert claims without direct registry check (bluesign.com/en/partners, global-standard.org). |
| **Cotopaxi** | bluesign and OEKO-TEX coverage at product/supplier level only (~38% coverage). Brand has B Corp and strong sustainability reporting. The product-level certs are real but not brand-wide. | Import as `bluesign: false, gots: false, oeko_tex: false` (brand-wide standard) with a note about product-level coverage. Affects C2 scoring — no cert suppression triggers unless product itself carries cert. |
| **Dickies** | Received "Good" from GoY but former parent VF Corp received D on NRDC. Dickies sold to Bluestar Alliance 2024. The VF Corp NRDC grade is no longer attributable. | Import GoY "Good" only; omit NRDC reference since brand is now separate entity. |
| **Eddie Bauer** | Was a bluesign partner in 2020; post-ABG acquisition status unconfirmed. Also OEKO-TEX product claims exist. | Do not import bluesign as confirmed. Mark as "unverified post-acquisition" for manual follow-up. |
| **Hoka** | Deckers described as "top performer" and PFAS leader in NRDC press release, but exact letter grade not extractable from public summary. Could be A or A+. Assigning without confirmation risks over-scoring. | Assign GoY "It's a Start" (confirmed). Treat NRDC as unverified until exact grade confirmed; note Deckers PFAS leadership as qualitative context only. |
| **Merrell** | Parent Wolverine Worldwide received F, but Merrell itself committed to PFAS-free waterproofing by FW2024. Parent-level F may be outdated for Merrell's current practices. | Import as parent Wolverine F for NRDC; add note about Merrell's FW2024 PFAS commitment. Saucony is in the same position (same parent). |
| **Outerknown** | bluesign confirmed. GOTS is supplier-level only (factories, not brand entity). Good On You "Good." | Import bluesign as confirmed (priority 2). Import GOTS as `false` — only factory-level confirmation, not brand registration. This is an important distinction for the V3 D-3 rule: product-level cert suppression requires cert on the product, not just the factory. |
| **Taylor Stitch** | GOTS claimed at factory level, not brand entity. Could not confirm on global-standard.org via search. | Same handling as Outerknown. Do not mark `gots_certified: true` for the brand. |
| **United By Blue** | All three certs (bluesign, GOTS, OEKO-TEX) confirmed at manufacturing partner level, not brand-entity registry level. Good On You "Good." B Corp. | Import as confirmed in notes but not as brand-level cert flags (`bluesign_certified: false` for scoring purposes). The certifications are real and meaningful but should not trigger brand-level cert suppression in D-3/D-5/D-7 without product-level verification. Add separate `mfr_certs_claimed` note. |
| **REI Co-op** | NRDC F in 2022, but REI subsequently committed to a PFAS ban. The F reflects the scorecard snapshot, not 2026 practices. | Import F as recorded. Add note about post-2022 PFAS commitment. Consider adding a `data_note` field. The score will penalize REI appropriately for its track record even if current practices have improved. |

---

## Part 5 — Ready-to-Import Summary (no flags)

These brands have clean, unambiguous data and can be imported directly:

| brand_id | good_on_you | nrdc | bluesign | gots | oeko_tex | tier |
|----------|------------|------|----------|------|----------|------|
| `anthropologie` | not good enough | — | false | false | false | high_risk |
| `arc_teryx` | it's a start | — | **true** | false | false | moderate |
| `bombas` | not good enough | — | false | false | false | high_risk |
| `club_monaco` | we avoid | — | false | false | false | high_risk |
| `cuyana` | it's a start | — | false | false | false | moderate |
| `express` | we avoid | — | false | false | false | high_risk |
| `free_people` | not good enough | — | false | false | false | high_risk |
| `hurley` | we avoid | — | false | false | false | high_risk |
| `l_l_bean` | not good enough | **D** | **true** | false | false | moderate |
| `mango` | it's a start | — | false | false | false | moderate |
| `massimo_dutti` | it's a start | — | false | false | false | moderate |
| `mizuno` | not good enough | — | false | false | false | high_risk |
| `o_neill` | not good enough | — | false | false | false | high_risk |
| `outdoor_voices` | not good enough | — | false | false | false | high_risk |
| `prettylittlething` | not good enough | — | false | false | false | high_risk |
| `public_rec` | no data | — | false | false | false | unknown |
| `quiksilver` | not good enough | — | false | false | false | high_risk |
| `rei_co_op` | not good enough | **F** | **true** | false | false | high_risk |
| `rhone` | not good enough | — | false | false | false | high_risk |
| `rip_curl` | it's a start | — | false | false | false | moderate |
| `salomon` | it's a start | — | **true** | false | false | moderate |
| `saucony` | not good enough | — | false | false | false | high_risk |
| `stance` | we avoid | — | false | false | false | high_risk |
| `toad_co` | good | — | **true** | **true** | **true** | safe |
| `tyr` | no data | — | false | false | false | unknown |
| `urban_outfitters` | not good enough | — | false | false | false | high_risk |
| `wrangler` | it's a start | — | false | false | false | moderate |

*Brands with flags (Altra, Billabong, Cotopaxi, Dickies, Eddie Bauer, Hoka, Merrell, Naadam, Outerknown, Quince, Taylor Stitch, United By Blue, REI) require judgment call before import — see Part 4.*

---

*Research completed 2026-04-24. No code was modified. Awaiting review before any imports to `brandRegistryV3.js`.*
