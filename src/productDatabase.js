// ============================================================
// CleanWear Product Database — Generated from Brand Data
// 1,641 products across 103 brands
// Updated: 2026-03-30 (+1,000 new pre-screen items)
// ============================================================

import { BRANDS } from "./brandDatabase.js";
import NEW_PRODUCTS_RAW from "./newProducts.json";

// ── Chemical derivation from material composition ───────────
function deriveChemicals(materials, certs = []) {
  const chems = new Set();
  materials.forEach(m => {
    const n = m.name.toLowerCase();
    if (n.includes("polyester") && !n.includes("recycled")) { chems.add("antimony"); chems.add("microplastics"); chems.add("bpa"); }
    if (n.includes("recycled polyester")) { chems.add("antimony"); chems.add("microplastics"); }
    if (n.includes("nylon") && !n.includes("recycled")) { chems.add("microplastics"); chems.add("formaldehyde"); }
    if (n.includes("recycled nylon")) { chems.add("microplastics"); }
    if (n.includes("spandex") || n.includes("elastane") || n.includes("lycra")) { chems.add("phthalates"); }
    if (n.includes("acrylic")) { chems.add("microplastics"); chems.add("azo_dyes"); }
    if (n === "cotton" || n === "cotton blend") { chems.add("formaldehyde"); }
    if (n.includes("viscose") || n.includes("rayon")) { /* cellulosic — minimal direct chemical risk */ }
    if (n.includes("gore-tex") || n.includes("dwr")) { chems.add("pfas"); }
  });
  const certLower = certs.map(c => c.toLowerCase());
  if (certLower.some(c => c.includes("oeko"))) { chems.delete("formaldehyde"); chems.delete("heavy_metals"); }
  if (certLower.some(c => c.includes("gots"))) { chems.delete("formaldehyde"); chems.delete("phthalates"); }
  if (certLower.some(c => c.includes("bluesign"))) { chems.delete("formaldehyde"); }
  return [...chems];
}

// ── Material compositions for known products ────────────────
// Key: "BrandName|ProductName" → materials array
const KNOWN_MATERIALS = {
  // ─── NIKE ───
  "Nike|Dri-FIT Tee": [{ name: "Polyester", percentage: 100 }],
  "Nike|Tech Fleece Hoodie": [{ name: "Cotton", percentage: 66 }, { name: "Polyester", percentage: 34 }],
  "Nike|Pro Compression Tights": [{ name: "Polyester", percentage: 83 }, { name: "Spandex", percentage: 17 }],
  "Nike|Kids Dri-FIT Tee": [{ name: "Polyester", percentage: 100 }],

  // ─── ADIDAS ───
  "Adidas|AEROREADY Tee": [{ name: "Recycled Polyester", percentage: 100 }],
  "Adidas|Ultraboost Running Shoe": [{ name: "Recycled Polyester", percentage: 75 }, { name: "Nylon", percentage: 25 }],
  "Adidas|Tiro Track Pants": [{ name: "Recycled Polyester", percentage: 87 }, { name: "Elastane", percentage: 13 }],

  // ─── UNDER ARMOUR ───
  "Under Armour|HeatGear Compression": [{ name: "Polyester", percentage: 84 }, { name: "Elastane", percentage: 16 }],
  "Under Armour|ColdGear Base Layer": [{ name: "Polyester", percentage: 87 }, { name: "Elastane", percentage: 13 }],
  "Under Armour|Tech 2.0 Tee": [{ name: "Polyester", percentage: 100 }],

  // ─── LULULEMON ───
  "Lululemon|Align Leggings": [{ name: "Nylon", percentage: 81 }, { name: "Lycra", percentage: 19 }],
  "Lululemon|Swiftly Tech Tee": [{ name: "Nylon", percentage: 88 }, { name: "Elastane", percentage: 12 }],
  "Lululemon|Wunder Train Leggings": [{ name: "Nylon", percentage: 83 }, { name: "Lycra", percentage: 17 }],

  // ─── GYMSHARK ───
  "Gymshark|Vital Seamless Tee": [{ name: "Nylon", percentage: 92 }, { name: "Elastane", percentage: 8 }],
  "Gymshark|Gym Shorts": [{ name: "Polyester", percentage: 88 }, { name: "Elastane", percentage: 12 }],
  "Gymshark|Instinct Shorts": [{ name: "Polyester", percentage: 90 }, { name: "Elastane", percentage: 10 }],

  // ─── 2XU ───
  "2XU|Compression Tights": [{ name: "Nylon", percentage: 70 }, { name: "Elastane", percentage: 30 }],
  "2XU|Core Compression Shorts": [{ name: "Nylon", percentage: 72 }, { name: "Elastane", percentage: 28 }],

  // ─── PATAGONIA ───
  "Patagonia|Organic Cotton Tee": [{ name: "Organic Cotton", percentage: 100 }],
  "Patagonia|Nano Puff Jacket": [{ name: "Recycled Polyester", percentage: 100 }],
  "Patagonia|Capilene Cool Shirt": [{ name: "Recycled Polyester", percentage: 88 }, { name: "Spandex", percentage: 12 }],
  "Patagonia|Stand Up Shorts": [{ name: "Organic Cotton", percentage: 97 }, { name: "Spandex", percentage: 3 }],

  // ─── PACT ───
  "Pact|Organic Boxer Briefs": [{ name: "Organic Cotton", percentage: 95 }, { name: "Spandex", percentage: 5 }],
  "Pact|Organic Bralette": [{ name: "Organic Cotton", percentage: 90 }, { name: "Spandex", percentage: 10 }],
  "Pact|Organic Crew Tee": [{ name: "Organic Cotton", percentage: 100 }],
  "Pact|Organic Leggings": [{ name: "Organic Cotton", percentage: 92 }, { name: "Spandex", percentage: 8 }],

  // ─── SMARTWOOL ───
  "Smartwool|Merino 250 Base Layer": [{ name: "Merino Wool", percentage: 100 }],
  "Smartwool|Hike Classic Sock": [{ name: "Merino Wool", percentage: 70 }, { name: "Nylon", percentage: 29 }, { name: "Elastane", percentage: 1 }],
  "Smartwool|Classic Thermal Merino": [{ name: "Merino Wool", percentage: 100 }],

  // ─── ALLBIRDS ───
  "Allbirds|Wool Runner": [{ name: "Merino Wool", percentage: 80 }, { name: "Eucalyptus Fiber", percentage: 20 }],
  "Allbirds|Tree Dasher": [{ name: "Eucalyptus Fiber", percentage: 90 }, { name: "Recycled Polyester", percentage: 10 }],
  "Allbirds|Trino Tee": [{ name: "Merino Wool", percentage: 50 }, { name: "Eucalyptus Fiber", percentage: 50 }],

  // ─── COYUCHI ───
  "Coyuchi|Organic Pajama Set": [{ name: "Organic Cotton", percentage: 100 }],
  "Coyuchi|Organic Sheet Set": [{ name: "Organic Cotton", percentage: 100 }],

  // ─── PRANA ───
  "prAna|Hemp Tee": [{ name: "Hemp", percentage: 55 }, { name: "Organic Cotton", percentage: 45 }],
  "prAna|Stretch Zion Pant": [{ name: "Nylon", percentage: 97 }, { name: "Spandex", percentage: 3 }],
  "prAna|Bridger Jean": [{ name: "Organic Cotton", percentage: 98 }, { name: "Spandex", percentage: 2 }],

  // ─── ICEBREAKER ───
  "Icebreaker|200 Oasis Base Layer": [{ name: "Merino Wool", percentage: 100 }],
  "Icebreaker|Merino Tech Lite Tee": [{ name: "Merino Wool", percentage: 87 }, { name: "Nylon", percentage: 13 }],

  // ─── BURT'S BEES BABY ───
  "Burt's Bees Baby|Organic Onesie": [{ name: "Organic Cotton", percentage: 100 }],
  "Burt's Bees Baby|Organic Sleep & Play": [{ name: "Organic Cotton", percentage: 100 }],

  // ─── LEVI'S ───
  "Levi's|501 Original Jeans": [{ name: "Cotton", percentage: 99 }, { name: "Elastane", percentage: 1 }],
  "Levi's|505 Regular Jeans": [{ name: "Cotton", percentage: 100 }],
  "Levi's|Trucker Jacket": [{ name: "Cotton", percentage: 100 }],

  // ─── UNIQLO ───
  "Uniqlo|Supima Cotton Tee": [{ name: "Cotton", percentage: 100 }],
  "Uniqlo|HEATTECH Ultra Warm": [{ name: "Polyester", percentage: 47 }, { name: "Acrylic", percentage: 32 }, { name: "Rayon", percentage: 16 }, { name: "Spandex", percentage: 5 }],
  "Uniqlo|AIRism Boxer Briefs": [{ name: "Polyester", percentage: 89 }, { name: "Spandex", percentage: 11 }],
  "Uniqlo|Essential Tee": [{ name: "Cotton", percentage: 100 }],

  // ─── H&M ───
  "H&M|Conscious Cotton Tee": [{ name: "Organic Cotton", percentage: 100 }],
  "H&M|Regular Fit Jeans": [{ name: "Cotton", percentage: 99 }, { name: "Elastane", percentage: 1 }],
  "H&M|Sports Tights": [{ name: "Polyester", percentage: 80 }, { name: "Elastane", percentage: 20 }],

  // ─── GAP ───
  "Gap|Classic Pocket Tee": [{ name: "Cotton", percentage: 100 }],
  "Gap|Vintage Wash Jeans": [{ name: "Cotton", percentage: 99 }, { name: "Elastane", percentage: 1 }],

  // ─── CARHARTT ───
  "Carhartt|Pocket Tee": [{ name: "Cotton", percentage: 100 }],
  "Carhartt|Fleece Hoodie": [{ name: "Cotton", percentage: 50 }, { name: "Polyester", percentage: 50 }],
  "Carhartt|Rain Defender Jacket": [{ name: "Nylon", percentage: 100 }],

  // ─── CALVIN KLEIN ───
  "Calvin Klein|Classic Boxer Brief": [{ name: "Cotton", percentage: 90 }, { name: "Elastane", percentage: 10 }],
  "Calvin Klein|Cotton Stretch Trunk": [{ name: "Cotton", percentage: 95 }, { name: "Elastane", percentage: 5 }],
  "Calvin Klein|Performance Tee": [{ name: "Polyester", percentage: 88 }, { name: "Elastane", percentage: 12 }],

  // ─── BROOKS BROTHERS ───
  "Brooks Brothers|Classic Oxford Shirt": [{ name: "Cotton", percentage: 100 }],
  "Brooks Brothers|Non-Iron Dress Shirt": [{ name: "Cotton", percentage: 100 }],
  "Brooks Brothers|Wool Suit": [{ name: "Wool", percentage: 100 }],

  // ─── VICTORIA'S SECRET ───
  "Victoria's Secret|Seamless Thong": [{ name: "Nylon", percentage: 82 }, { name: "Elastane", percentage: 18 }],
  "Victoria's Secret|Satin Pajamas": [{ name: "Polyester", percentage: 100 }],
  "Victoria's Secret|Sports Bra": [{ name: "Nylon", percentage: 75 }, { name: "Spandex", percentage: 25 }],

  // ─── SHEIN ───
  "Shein|Basic Crop Top": [{ name: "Polyester", percentage: 95 }, { name: "Spandex", percentage: 5 }],
  "Shein|Workout Set": [{ name: "Polyester", percentage: 85 }, { name: "Spandex", percentage: 15 }],
  "Shein|Kids Graphic Tee": [{ name: "Polyester", percentage: 65 }, { name: "Cotton", percentage: 35 }],

  // ─── TEMU ───
  "Temu|Generic Activewear Set": [{ name: "Polyester", percentage: 88 }, { name: "Spandex", percentage: 12 }],
  "Temu|Kids Clothing Pack": [{ name: "Polyester", percentage: 70 }, { name: "Cotton", percentage: 30 }],

  // ─── FASHION NOVA ───
  "Fashion Nova|Bodycon Dress": [{ name: "Nylon", percentage: 80 }, { name: "Spandex", percentage: 20 }],
  "Fashion Nova|High Waist Leggings": [{ name: "Polyester", percentage: 85 }, { name: "Spandex", percentage: 15 }],

  // ─── BOOHOO ───
  "Boohoo|Mesh Bodysuit": [{ name: "Nylon", percentage: 85 }, { name: "Elastane", percentage: 15 }],
  "Boohoo|Jersey Joggers": [{ name: "Polyester", percentage: 65 }, { name: "Viscose", percentage: 30 }, { name: "Elastane", percentage: 5 }],

  // ─── THE NORTH FACE ───
  "The North Face|Thermoball Jacket": [{ name: "Recycled Polyester", percentage: 100 }],
  "The North Face|Reaxion Tee": [{ name: "Polyester", percentage: 100 }],
  "The North Face|Denali Fleece": [{ name: "Recycled Polyester", percentage: 100 }],

  // ─── J.CREW ───
  "J.Crew|Linen Camp Shirt": [{ name: "Linen", percentage: 100 }],
  "J.Crew|Broken-in Tee": [{ name: "Cotton", percentage: 100 }],
  "J.Crew|Wool Overcoat": [{ name: "Wool", percentage: 80 }, { name: "Nylon", percentage: 20 }],

  // ─── HANES ───
  "Hanes|ComfortSoft Tee": [{ name: "Cotton", percentage: 100 }],
  "Hanes|Cotton Boxer Briefs": [{ name: "Cotton", percentage: 95 }, { name: "Spandex", percentage: 5 }],
  "Hanes|Cool DRI Tee": [{ name: "Polyester", percentage: 100 }],

  // ─── NEW BALANCE ───
  "New Balance|Impact Run Tee": [{ name: "Recycled Polyester", percentage: 92 }, { name: "Elastane", percentage: 8 }],
  "New Balance|Essentials Hoodie": [{ name: "Cotton", percentage: 80 }, { name: "Polyester", percentage: 20 }],

  // ─── AMAZON ESSENTIALS ───
  "Amazon Essentials|Crewneck Tee 2-Pack": [{ name: "Cotton", percentage: 100 }],
  "Amazon Essentials|Performance Tee": [{ name: "Polyester", percentage: 100 }],

  // ─── VUORI ───
  "Vuori|Strato Tech Tee": [{ name: "Recycled Polyester", percentage: 90 }, { name: "Elastane", percentage: 10 }],
  "Vuori|Kore Shorts": [{ name: "Recycled Polyester", percentage: 86 }, { name: "Elastane", percentage: 14 }],

  // ─── EILEEN FISHER ───
  "Eileen Fisher|Organic Cotton Crew": [{ name: "Organic Cotton", percentage: 100 }],
  "Eileen Fisher|Tencel Wrap Dress": [{ name: "Tencel", percentage: 100 }],
  "Eileen Fisher|Organic Linen Pants": [{ name: "Organic Linen", percentage: 100 }],

  // ─── TENTREE ───
  "tentree|Classic Cotton Tee": [{ name: "Organic Cotton", percentage: 100 }],
  "tentree|French Terry Hoodie": [{ name: "Organic Cotton", percentage: 85 }, { name: "Recycled Polyester", percentage: 15 }],
  "tentree|Organic Joggers": [{ name: "Organic Cotton", percentage: 100 }],

  // ─── KOTN ───
  "Kotn|Essential Crew Tee": [{ name: "Egyptian Cotton", percentage: 100 }],
  "Kotn|Oxford Button-Down": [{ name: "Egyptian Cotton", percentage: 100 }],
  "Kotn|Classic Hoodie": [{ name: "Organic Cotton", percentage: 100 }],

  // ─── MATE THE LABEL ───
  "MATE the Label|Classic Crew": [{ name: "Organic Cotton", percentage: 100 }],
  "MATE the Label|Organic Biker Short": [{ name: "Organic Cotton", percentage: 95 }, { name: "Spandex", percentage: 5 }],
  "MATE the Label|Organic Tank": [{ name: "Organic Cotton", percentage: 100 }],

  // ─── COLORFUL STANDARD ───
  "Colorful Standard|Classic Organic Tee": [{ name: "Organic Cotton", percentage: 100 }],
  "Colorful Standard|Organic Hoodie": [{ name: "Organic Cotton", percentage: 100 }],
  "Colorful Standard|Organic Sweatshirt": [{ name: "Organic Cotton", percentage: 100 }],

  // ─── THOUGHT CLOTHING ───
  "Thought Clothing|Hemp Crew Tee": [{ name: "Hemp", percentage: 55 }, { name: "Organic Cotton", percentage: 45 }],
  "Thought Clothing|Bamboo Ankle Socks": [{ name: "Bamboo Lyocell", percentage: 75 }, { name: "Organic Cotton", percentage: 20 }, { name: "Elastane", percentage: 5 }],
  "Thought Clothing|Organic Midi Dress": [{ name: "Organic Cotton", percentage: 100 }],

  // ─── ORGANIC BASICS ───
  "Organic Basics|Organic Cotton Boxers": [{ name: "Organic Cotton", percentage: 95 }, { name: "Elastane", percentage: 5 }],
  "Organic Basics|Organic Bralette": [{ name: "Organic Cotton", percentage: 93 }, { name: "Elastane", percentage: 7 }],
  "Organic Basics|Tencel Tee": [{ name: "Tencel", percentage: 100 }],
  "Organic Basics|SilverTech Active Tee": [{ name: "Recycled Nylon", percentage: 88 }, { name: "Elastane", percentage: 12 }],

  // ─── NUDIE JEANS ───
  "Nudie Jeans|Lean Dean Jeans": [{ name: "Organic Cotton", percentage: 99 }, { name: "Elastane", percentage: 1 }],
  "Nudie Jeans|Steady Eddie II": [{ name: "Organic Cotton", percentage: 100 }],
  "Nudie Jeans|Organic Crew Tee": [{ name: "Organic Cotton", percentage: 100 }],

  // ─── WOLFORD ───
  "Wolford|Pure Tee": [{ name: "Nylon", percentage: 80 }, { name: "Elastane", percentage: 20 }],
  "Wolford|Cotton Contour Bra": [{ name: "Cotton", percentage: 60 }, { name: "Nylon", percentage: 30 }, { name: "Elastane", percentage: 10 }],

  // ─── VEJA ───
  "VEJA|Campo Canvas Sneaker": [{ name: "Organic Cotton", percentage: 80 }, { name: "Wild Rubber", percentage: 20 }],
  "VEJA|V-10 Leather Sneaker": [{ name: "Chromium-Free Leather", percentage: 70 }, { name: "Wild Rubber", percentage: 30 }],

  // ─── EVERLANE ───
  "Everlane|Essential Organic Tee": [{ name: "Organic Cotton", percentage: 100 }],
  "Everlane|The Performance Chino": [{ name: "Cotton", percentage: 65 }, { name: "Nylon", percentage: 30 }, { name: "Elastane", percentage: 5 }],
  "Everlane|ReNew Puffer": [{ name: "Recycled Polyester", percentage: 100 }],
  "Everlane|The Dream Pant": [{ name: "Recycled Polyester", percentage: 58 }, { name: "Cotton", percentage: 37 }, { name: "Elastane", percentage: 5 }],

  // ─── ASOS ───
  "ASOS|Muscle Fit Tee": [{ name: "Cotton", percentage: 92 }, { name: "Elastane", percentage: 8 }],
  "ASOS|Skinny Jeans": [{ name: "Cotton", percentage: 85 }, { name: "Polyester", percentage: 13 }, { name: "Elastane", percentage: 2 }],
  "ASOS|Running Shorts": [{ name: "Polyester", percentage: 100 }],

  // ─── CHAMPION ───
  "Champion|Classic Cotton Tee": [{ name: "Cotton", percentage: 100 }],
  "Champion|Reverse Weave Hoodie": [{ name: "Cotton", percentage: 82 }, { name: "Polyester", percentage: 18 }],
  "Champion|Double Dry Performance Tee": [{ name: "Polyester", percentage: 100 }],

  // ─── OLD NAVY ───
  "Old Navy|Softest Crew-Neck Tee": [{ name: "Cotton", percentage: 60 }, { name: "Polyester", percentage: 40 }],
  "Old Navy|Active Powersoft Leggings": [{ name: "Nylon", percentage: 82 }, { name: "Spandex", percentage: 18 }],
  "Old Navy|Cotton Boxer Briefs": [{ name: "Cotton", percentage: 95 }, { name: "Spandex", percentage: 5 }],

  // ─── COLUMBIA ───
  "Columbia Sportswear|PFG Fishing Shirt": [{ name: "Polyester", percentage: 100 }],
  "Columbia Sportswear|Silver Ridge Hiking Shirt": [{ name: "Nylon", percentage: 100 }],
  "Columbia Sportswear|Omni-Heat Base Layer": [{ name: "Polyester", percentage: 92 }, { name: "Elastane", percentage: 8 }],
  "Columbia Sportswear|Benton Springs Fleece": [{ name: "Polyester", percentage: 100 }],

  // ─── RALPH LAUREN ───
  "Ralph Lauren|Classic Fit Polo": [{ name: "Cotton", percentage: 100 }],
  "Ralph Lauren|Cable-Knit Cotton Sweater": [{ name: "Cotton", percentage: 100 }],
  "Ralph Lauren|Performance Polo": [{ name: "Polyester", percentage: 88 }, { name: "Elastane", percentage: 12 }],

  // ─── TOMMY HILFIGER ───
  "Tommy Hilfiger|Essential Cotton Tee": [{ name: "Cotton", percentage: 100 }],
  "Tommy Hilfiger|Flag Logo Hoodie": [{ name: "Cotton", percentage: 70 }, { name: "Polyester", percentage: 30 }],
  "Tommy Hilfiger|Boxer Briefs 3-Pack": [{ name: "Cotton", percentage: 92 }, { name: "Elastane", percentage: 8 }],

  // ─── BANANA REPUBLIC ───
  "Banana Republic|Luxury-Touch Cotton Tee": [{ name: "Cotton", percentage: 100 }],
  "Banana Republic|Merino Wool Sweater": [{ name: "Merino Wool", percentage: 100 }],
  "Banana Republic|Italian Wool Suit": [{ name: "Wool", percentage: 100 }],

  // ─── REEBOK ───
  "Reebok|Workout Ready Tee": [{ name: "Polyester", percentage: 100 }],
  "Reebok|Nano X Training Shoe": [{ name: "Polyester", percentage: 65 }, { name: "Nylon", percentage: 35 }],
  "Reebok|Classic Nylon Sneaker": [{ name: "Nylon", percentage: 100 }],

  // ─── ASICS ───
  "ASICS|Gel-Kayano Running Shoe": [{ name: "Polyester", percentage: 60 }, { name: "Nylon", percentage: 40 }],
  "ASICS|Core Running Tee": [{ name: "Recycled Polyester", percentage: 100 }],
  "ASICS|Sport Running Shorts": [{ name: "Polyester", percentage: 87 }, { name: "Elastane", percentage: 13 }],

  // ─── PUMA ───
  "Puma|Essentials Cotton Tee": [{ name: "Cotton", percentage: 100 }],
  "Puma|Run Favorite Tee": [{ name: "Recycled Polyester", percentage: 100 }],
  "Puma|Cloudspun Golf Polo": [{ name: "Recycled Polyester", percentage: 91 }, { name: "Elastane", percentage: 9 }],

  // ─── NORDSTROM ───
  "Nordstrom (House Brand)|Cotton Blend Crewneck": [{ name: "Cotton", percentage: 60 }, { name: "Polyester", percentage: 40 }],
  "Nordstrom (House Brand)|Everyday Cotton Tee": [{ name: "Cotton", percentage: 100 }],

  // ─── BROOKS RUNNING ───
  "Brooks Running|Ghost Running Shoe": [{ name: "Polyester", percentage: 60 }, { name: "Nylon", percentage: 40 }],
  "Brooks Running|Sherpa Half-Zip": [{ name: "Recycled Polyester", percentage: 100 }],
  "Brooks Running|Momentum Thermal Tights": [{ name: "Recycled Polyester", percentage: 84 }, { name: "Elastane", percentage: 16 }],

  // ─── REFORMATION ───
  "Reformation|Classic Crew Tee": [{ name: "Tencel", percentage: 100 }],
  "Reformation|Linen Midi Dress": [{ name: "Linen", percentage: 100 }],
  "Reformation|Tencel Wrap Top": [{ name: "Tencel", percentage: 100 }],

  // ─── ATHLETA ───
  "Athleta|Elation Tight": [{ name: "Nylon", percentage: 79 }, { name: "Lycra", percentage: 21 }],
  "Athleta|Organic Daily Tank": [{ name: "Organic Cotton", percentage: 100 }],
  "Athleta|Conscious Crop": [{ name: "Nylon", percentage: 83 }, { name: "Lycra", percentage: 17 }],

  // ─── ON RUNNING ───
  "On Running|Cloud 5 Running Shoe": [{ name: "Recycled Polyester", percentage: 50 }, { name: "Polyester", percentage: 50 }],
  "On Running|Performance-T": [{ name: "Recycled Polyester", percentage: 92 }, { name: "Elastane", percentage: 8 }],
  "On Running|Running Shorts": [{ name: "Recycled Polyester", percentage: 88 }, { name: "Elastane", percentage: 12 }],

  // ─── ZARA ───
  "Zara|Basic Crew Neck Tee": [{ name: "Cotton", percentage: 100 }],
  "Zara|Technical Running Tee": [{ name: "Polyester", percentage: 88 }, { name: "Elastane", percentage: 12 }],
  "Zara|Skinny Jeans": [{ name: "Cotton", percentage: 86 }, { name: "Polyester", percentage: 12 }, { name: "Elastane", percentage: 2 }],
  "Zara|Puffer Jacket": [{ name: "Polyester", percentage: 100 }],

  // ─── PRIMARK ───
  "Primark|Basic Cotton Tee": [{ name: "Cotton", percentage: 100 }],
  "Primark|Active Leggings": [{ name: "Polyester", percentage: 82 }, { name: "Elastane", percentage: 18 }],
  "Primark|Fleece Hoodie": [{ name: "Polyester", percentage: 100 }],

  // ─── FOREVER 21 ───
  "Forever 21|Crop Top": [{ name: "Polyester", percentage: 95 }, { name: "Spandex", percentage: 5 }],
  "Forever 21|Athletic Leggings": [{ name: "Polyester", percentage: 85 }, { name: "Spandex", percentage: 15 }],
  "Forever 21|Faux Leather Jacket": [{ name: "Polyurethane", percentage: 100 }],

  // ─── ROMWE ───
  "ROMWE|Graphic Tee": [{ name: "Polyester", percentage: 100 }],
  "ROMWE|Workout Set": [{ name: "Polyester", percentage: 85 }, { name: "Spandex", percentage: 15 }],

  // ─── PRETTYLITTLETHING ───
  "PrettyLittleThing|Bodycon Dress": [{ name: "Nylon", percentage: 80 }, { name: "Elastane", percentage: 20 }],
  "PrettyLittleThing|Gym Leggings": [{ name: "Polyester", percentage: 82 }, { name: "Elastane", percentage: 18 }],
  "PrettyLittleThing|Oversized Tee": [{ name: "Cotton", percentage: 50 }, { name: "Polyester", percentage: 50 }],

  // ─── MISSGUIDED ───
  "Missguided|Basic Bodysuit": [{ name: "Nylon", percentage: 85 }, { name: "Elastane", percentage: 15 }],
  "Missguided|Jogger Set": [{ name: "Polyester", percentage: 70 }, { name: "Cotton", percentage: 25 }, { name: "Elastane", percentage: 5 }],

  // ─── FABLETICS ───
  "Fabletics|Define High-Waisted Legging": [{ name: "Nylon", percentage: 78 }, { name: "Spandex", percentage: 22 }],
  "Fabletics|The Everything Tank": [{ name: "Nylon", percentage: 84 }, { name: "Spandex", percentage: 16 }],
  "Fabletics|Sports Bra": [{ name: "Nylon", percentage: 75 }, { name: "Spandex", percentage: 25 }],

  // ─── TARGET ───
  "Target (All in Motion / Cat & Jack)|All in Motion Training Tee": [{ name: "Polyester", percentage: 88 }, { name: "Spandex", percentage: 12 }],
  "Target (All in Motion / Cat & Jack)|Goodfellow Cotton Tee": [{ name: "Cotton", percentage: 100 }],
  "Target (All in Motion / Cat & Jack)|Cat & Jack Kids Tee": [{ name: "Cotton", percentage: 100 }],

  // ─── WALMART ───
  "Walmart (George / Athletic Works)|Athletic Works Training Tee": [{ name: "Polyester", percentage: 100 }],
  "Walmart (George / Athletic Works)|George Cotton Polo": [{ name: "Cotton", percentage: 100 }],
  "Walmart (George / Athletic Works)|Athletic Works Shorts": [{ name: "Polyester", percentage: 88 }, { name: "Elastane", percentage: 12 }],

  // ─── COSTCO/KIRKLAND ───
  "Kirkland Signature (Costco)|Pima Cotton Tee": [{ name: "Cotton", percentage: 100 }],
  "Kirkland Signature (Costco)|Merino Wool Socks": [{ name: "Merino Wool", percentage: 72 }, { name: "Nylon", percentage: 26 }, { name: "Elastane", percentage: 2 }],
  "Kirkland Signature (Costco)|Performance Quarter-Zip": [{ name: "Polyester", percentage: 92 }, { name: "Elastane", percentage: 8 }],

  // ─── SKECHERS ───
  "Skechers|GOwalk Slip-On": [{ name: "Polyester", percentage: 70 }, { name: "Nylon", percentage: 30 }],
  "Skechers|Sport Mesh Sneaker": [{ name: "Polyester", percentage: 65 }, { name: "Nylon", percentage: 35 }],

  // ─── HOLLISTER ───
  "Hollister|Must-Have Cotton Tee": [{ name: "Cotton", percentage: 60 }, { name: "Polyester", percentage: 40 }],
  "Hollister|Gilly Hicks Bralette": [{ name: "Nylon", percentage: 80 }, { name: "Elastane", percentage: 20 }],
  "Hollister|Athletic Joggers": [{ name: "Polyester", percentage: 65 }, { name: "Cotton", percentage: 30 }, { name: "Spandex", percentage: 5 }],

  // ─── ABERCROMBIE & FITCH ───
  "Abercrombie & Fitch|Essential Cotton Tee": [{ name: "Cotton", percentage: 100 }],
  "Abercrombie & Fitch|Curve Love Jeans": [{ name: "Cotton", percentage: 92 }, { name: "Polyester", percentage: 6 }, { name: "Elastane", percentage: 2 }],
  "Abercrombie & Fitch|YPB motionTEK Legging": [{ name: "Nylon", percentage: 80 }, { name: "Spandex", percentage: 20 }],

  // ─── AMERICAN EAGLE ───
  "American Eagle|Real Good Tee": [{ name: "Cotton", percentage: 100 }],
  "American Eagle|AirFlex Jeans": [{ name: "Cotton", percentage: 91 }, { name: "Polyester", percentage: 7 }, { name: "Elastane", percentage: 2 }],
  "American Eagle|Aerie Sports Bra": [{ name: "Nylon", percentage: 78 }, { name: "Spandex", percentage: 22 }],

  // ─── FRUIT OF THE LOOM ───
  "Fruit of the Loom|Classic Cotton Tee 5-Pack": [{ name: "Cotton", percentage: 100 }],
  "Fruit of the Loom|Cotton Boxer Briefs": [{ name: "Cotton", percentage: 95 }, { name: "Spandex", percentage: 5 }],
  "Fruit of the Loom|EverSoft Cotton Tee": [{ name: "Cotton", percentage: 60 }, { name: "Polyester", percentage: 40 }],

  // ─── GILDAN ───
  "Gildan|Heavy Cotton Tee": [{ name: "Cotton", percentage: 100 }],
  "Gildan|DryBlend Performance Tee": [{ name: "Polyester", percentage: 50 }, { name: "Cotton", percentage: 50 }],
  "Gildan|Softstyle Cotton Tee": [{ name: "Cotton", percentage: 100 }],

  // ─── NEXT LEVEL APPAREL ───
  "Next Level Apparel|CVC Crew Tee": [{ name: "Cotton", percentage: 60 }, { name: "Polyester", percentage: 40 }],
  "Next Level Apparel|Premium Cotton Tee": [{ name: "Cotton", percentage: 100 }],
  "Next Level Apparel|Tri-Blend Tee": [{ name: "Polyester", percentage: 50 }, { name: "Cotton", percentage: 25 }, { name: "Rayon", percentage: 25 }],

  // ─── ALO YOGA ───
  "Alo Yoga|Airlift High-Waist Legging": [{ name: "Nylon", percentage: 79 }, { name: "Spandex", percentage: 21 }],
  "Alo Yoga|Alosoft Crop Tank": [{ name: "Nylon", percentage: 85 }, { name: "Spandex", percentage: 15 }],
  "Alo Yoga|Accolade Hoodie": [{ name: "Cotton", percentage: 57 }, { name: "Polyester", percentage: 38 }, { name: "Spandex", percentage: 5 }],
};

// ── Build products from brand data ──────────────────────────
let idCounter = 1;

export const PRODUCTS = BRANDS.flatMap(brand => {
  return brand.products.map(p => {
    const key = `${brand.name}|${p.name}`;
    const materials = KNOWN_MATERIALS[key] || guessMaterials(brand, p);
    const chemicals = deriveChemicals(materials, brand.certs || []);
    // Also add brand-level chemicals that may come from treatments, not just materials
    (brand.chemicals || []).forEach(c => {
      if (!chemicals.includes(c)) chemicals.push(c);
    });

    return {
      id: `prod_${String(idCounter++).padStart(4, "0")}`,
      brand: brand.name,
      name: p.name,
      category: p.cat,
      score: p.score,
      materials,
      chemicals,
      certifications: (brand.certs || []).map(c => c.toLowerCase().replace(/\s*\(.*?\)\s*/g, "").trim()).filter(Boolean),
      origin: brand.origin || "Unknown",
      tier: brand.tier,
      // Display string for search/filtering
      materialsDisplay: materials.map(m => m.name).join(", "),
    };
  });
});

// Fallback material guessing for products not in KNOWN_MATERIALS
function guessMaterials(brand, product) {
  const bm = (brand.materials || []).map(m => m.toLowerCase());
  const cat = (product.cat || "").toLowerCase();

  // Athletic/performance products lean synthetic
  if (cat === "athletic") {
    if (bm.some(m => m.includes("nylon")) && bm.some(m => m.includes("lycra") || m.includes("spandex") || m.includes("elastane"))) {
      return [{ name: "Nylon", percentage: 83 }, { name: "Lycra", percentage: 17 }];
    }
    if (bm.some(m => m.includes("polyester"))) {
      return [{ name: "Polyester", percentage: 88 }, { name: "Elastane", percentage: 12 }];
    }
    if (bm.some(m => m.includes("merino"))) {
      return [{ name: "Merino Wool", percentage: 87 }, { name: "Nylon", percentage: 13 }];
    }
    if (bm.some(m => m.includes("organic cotton"))) {
      return [{ name: "Organic Cotton", percentage: 92 }, { name: "Spandex", percentage: 8 }];
    }
    return [{ name: "Polyester", percentage: 88 }, { name: "Elastane", percentage: 12 }];
  }

  // Underwear typically has stretch
  if (cat === "underwear") {
    if (bm.some(m => m.includes("organic cotton"))) {
      return [{ name: "Organic Cotton", percentage: 95 }, { name: "Spandex", percentage: 5 }];
    }
    if (bm.some(m => m.includes("merino"))) {
      return [{ name: "Merino Wool", percentage: 85 }, { name: "Nylon", percentage: 12 }, { name: "Elastane", percentage: 3 }];
    }
    return [{ name: "Cotton", percentage: 95 }, { name: "Spandex", percentage: 5 }];
  }

  // Kids
  if (cat === "kids") {
    if (bm.some(m => m.includes("organic cotton"))) {
      return [{ name: "Organic Cotton", percentage: 100 }];
    }
    return [{ name: "Cotton", percentage: 60 }, { name: "Polyester", percentage: 40 }];
  }

  // Sleepwear
  if (cat === "sleepwear") {
    if (bm.some(m => m.includes("organic cotton"))) {
      return [{ name: "Organic Cotton", percentage: 100 }];
    }
    return [{ name: "Cotton", percentage: 100 }];
  }

  // Outerwear
  if (cat === "outerwear") {
    if (bm.some(m => m.includes("gore-tex"))) {
      return [{ name: "Nylon", percentage: 70 }, { name: "Gore-Tex", percentage: 30 }];
    }
    return [{ name: "Polyester", percentage: 100 }];
  }

  // Casual — default
  if (bm.some(m => m.includes("organic cotton"))) {
    return [{ name: "Organic Cotton", percentage: 100 }];
  }
  if (bm.some(m => m.includes("merino"))) {
    return [{ name: "Merino Wool", percentage: 100 }];
  }
  if (bm.some(m => m.includes("tencel"))) {
    return [{ name: "Tencel", percentage: 100 }];
  }
  if (bm.some(m => m.includes("hemp"))) {
    return [{ name: "Hemp", percentage: 55 }, { name: "Organic Cotton", percentage: 45 }];
  }
  if (bm.some(m => m.includes("linen"))) {
    return [{ name: "Linen", percentage: 100 }];
  }
  if (bm.some(m => m.includes("cotton"))) {
    return [{ name: "Cotton", percentage: 100 }];
  }
  return [{ name: "Polyester", percentage: 60 }, { name: "Cotton", percentage: 40 }];
}

// ── Parse string materials into [{name, percentage}] format ──
function parseMaterialsString(matStr) {
  if (!matStr || typeof matStr !== "string") return [{ name: "Unknown", percentage: 100 }];
  const parts = matStr.split(",").map(s => s.trim()).filter(Boolean);
  const count = parts.length;
  if (count === 1) return [{ name: parts[0], percentage: 100 }];
  if (count === 2) return [{ name: parts[0], percentage: 80 }, { name: parts[1], percentage: 20 }];
  if (count === 3) return [{ name: parts[0], percentage: 60 }, { name: parts[1], percentage: 25 }, { name: parts[2], percentage: 15 }];
  // 4+
  const each = Math.floor(100 / count);
  return parts.map((p, i) => ({ name: p, percentage: i === 0 ? 100 - each * (count - 1) : each }));
}

// ── Append 1,000 new pre-screened products ──────────────────
const newProducts = NEW_PRODUCTS_RAW.map(p => {
  const materials = parseMaterialsString(p.materials);
  const chemicals = deriveChemicals(materials, []);
  // Also include any chemicals from the raw data
  (p.chemicals || []).forEach(c => { if (!chemicals.includes(c)) chemicals.push(c); });
  return {
    id: p.id,
    brand: p.brand,
    name: p.name,
    category: p.category,
    score: p.score,
    materials,
    chemicals,
    certifications: [],
    origin: "Unknown",
    tier: p.tier,
    materialsDisplay: p.materials || materials.map(m => m.name).join(", "),
  };
});

PRODUCTS.push(...newProducts);

// ── Exports ─────────────────────────────────────────────────
export const PRODUCT_BY_ID = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));
export const PRODUCT_CATEGORIES = [...new Set(PRODUCTS.map(p => p.category))].sort();
export const PRODUCT_BRANDS = [...new Set(PRODUCTS.map(p => p.brand))].sort();
