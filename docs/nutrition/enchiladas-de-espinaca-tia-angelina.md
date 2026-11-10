# Angelina 2.1 — partial estimate, not measured nutrition

Verified 2026-11-09/10. Complete source remains in the recipe-drafts document.
All quantities are unchanged. No actual tortilla/onion/clove/oil/cilantro masses
were invented. Counts remain counts. Salt/aromatics are cooking-stage inputs.

Metric order below: kcal, protein g, carbohydrate g, fat g, fiber g.
Primary USDA API data were read directly with public DEMO_KEY; no private key.
FDC IDs and official manufacturer references are linked in the public recipe.

| Reference | Basis | Profile |
|---|---|---|
| USDA171477, breast meat cooked roasted | per100g, proxy for750g cooked boiled yield |165,31.02,0,3.57,0|
| Velveeta Original, GTIN00021000081844 official Kraft Heinz label | per28g |70,4,3,4,0|
| USDA170005 scallions raw | per100g |32,1.83,7.34,0.19,2.6|
| USDA174536 ready-to-serve chicken broth | per100g, not actual cooking broth analysis |6,0.64,0.44,0.21,0|
| USDA169287 frozen spinach unprepared | per100g, draining uncertainty |29,3.63,4.21,0.57,2.9|
| Campbell's current condensed cream of chicken | perlabel serving;4cans ×about2.5servings |120,2,9,8,0|
| USDA171257 sour cultured cream | per100g, unknown actual brand |198,2.44,4.63,19.35,0|
| Guerrero official low-calorie label image | per4tortillas, NOT each |90,2,18,1,2|

Guerrero's marketing name “25 calories” is faithfully retained, while the current
label is90kcal/4tortillas. Image viewed directly:
https://guerrerotortillas.com/wp-content/uploads/2021/06/low-cal-white-corn-nf-0226.jpg
Its43g labeled serving does not establish the masses of Hector's tortillas.
72/4=18label servings. Never multiply90 by72 or replace the source count by grams.

Soup current official page gives120mL servings. We do NOT assume120mL=120g.
The source independently states4cans/1192g, so estimate uses4×about2.5 label
servings, a disclosed count-based proxy, not exact volumetric conversion.

Excluded (NOT assumed zero): unspecified spray/cilantro, unconfirmed drained
chile product and exact Knorr Suiza formulation. The public Knorr US page
does not supply sufficient basis/complete nutrient data to safely extrapolate
the actual10g formulation; no manufactured profile was inserted. USDA's canned
chile API request hit DEMO_KEY rate limit; did not retry/bypass or use an
unverified remembered profile. No sodium/sugar estimate, particularly because
10g cooking salt's retention is unmeasured. Onion/garlic/bay are boiling-only,
not eaten filling quantities; generic broth stands in for transferred liquid.

Allocation:
- raw1000g chicken is a shopping/cooking input. Nutrition uses cooked750g once,
  attached to that ingredient with a visible yield/proxy explanation. No second
  cooked-chicken shopping ingredient or second nutrient count.
- filling1765g=750+907+50+28+30; optional cilantro not weighed.
- sauce2462g=560+1192+460+240+10 BEFORE losses.
- r=2094/2462=0.8505280259951259; reserve368g excluded.
- each sauce nutrient contribution uses FULL input profile ×r; ingredient
  amounts still show FULL preparation quantities. This allocation exception
  is explicitly explained per ingredient and in BOTH public languages.
- no claim the reserved cooked sauce is exactly368g after losses; actual
  evaporation/draining/yield/food left behind are not known.
- rounding1765g versus882g×2=1764g preserved, not silently corrected.

All allocated ingredient estimates sum to:
7088.467912266451 kcal / P444.4812604154579 / C540.5928460020889 /
F321.3957218289428 / fiber51.11257514216084.
Divide by72 TAQUITOS:
98.45094322592293 kcal / P6.173350839103581 / C7.508233972251235 /
F4.463829469846427 / fiber0.7098968769744561.
Unrounded storage ensures reconciliation; displayed precision is not measurement
accuracy. Partial estimate is not a complete food-log value.
