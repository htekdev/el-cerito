# Enchiladas de espinaca de Tía Angelina — versión familiar 2.1

## Estado de recepción / Intake status

Received from Hector on 2026-11-09 at approximately 23:15 CT, as two consecutive
messages constituting ONE COMPLETE recipe. No missing-method clarification is
needed. Family provenance and all quantities, approximations, trials and notes
are preserved below. This is an intake document, NOT a published recipe.

**Resumen en español:** taquitos de pollo deshebrado con Velveeta dentro del
relleno, acomodados en dos capas como lasaña, con salsa cremosa de espinaca
debajo, entre capas y encima. Receta de Tía Angelina, refinada en la cocina
familiar. Rinde 72 taquitos, 36 por charola; NO 72 comidas para adultos.
El método probado es hornear tapado 90 minutos a 177 °C (350 °F). La dosificación
de 24–25 g de relleno, usar aproximadamente el 85 % de la salsa en proporción
1:2:1 y el acabado destapado siguen siendo pruebas de la versión 2.1.

**English title:** Aunt Angelina's Creamy Spinach and Chicken Enchilada Lasagna.
Two pans, 72 rolled taquitos, not 72 adult meal portions. The original source
below is authoritative; this synopsis does not replace it.

## Continuation status — source preserved, implementation complete locally

Hector explicitly authorized the two narrowly necessary fixes on 2026-11-09.
Both are implemented: optional unmeasured times render localized unknown labels
and omit unknown JSON-LD durations; the stepper supports1..max(50,base), restoring72.
Existing numeric durations and real zero remain unchanged. The clarification
does not require a guessed time. Source below remains verbatim.

The public bilingual recipe is now authored at
`src/content/recipes/enchiladas-de-espinaca-tia-angelina.md`.
Cover is an approved generated illustration, explicitly NOT a family photo.
`docs/nutrition/enchiladas-de-espinaca-tia-angelina.md` records researched PARTIAL
estimates, omitted unknowns, cooked-chicken single-count and reserved-salsa
allocation. No lighter sibling invented or linked.

Local validation: build passed;71 Node24 tests passed;nutrition.ts100% lines,
branches and functions (helper-only scope);8 recorded Playwright tests passed
across Spanish/English desktop/mobile, including original72→71→72,1and72
boundaries, real ingredient/grocery/nutrient restoration and an unchanged known
recipe. Artifacts: `coverage/lcov.info`, `playwright-report/`, `test-results/`.
No PR/review/merge/production success is implied by these LOCAL checks; release
status must be read from the actual PR and current deployment.

## Historical delivery blockers — checked against original main

Main inspected: `cc7c48ce6d773d9579002dcbec1cd87c6158a4c3`.

1. `src/content.config.ts:179` requires numeric, nonnegative integer `prepTime`.
   The source supplies cooking/rest intervals but NO active preparation duration
   for shredding, mixing, blending, warming/rolling 72 tortillas and assembly.
   The public renderer (`src/components/sections/RecipeDetail.astro`) displays
   that numeric value as preparation minutes and emits `PT${d.prepTime}M` in
   JSON-LD. Although the AI intake prompt uses zero for unknown, the published
   renderer does NOT distinguish unknown from actual zero preparation minutes.
   No zero, estimate, or invented total has been authored to satisfy the field.
   Resolution: a source-supported prep duration, or authorization for a small
   schema/rendering change to represent unknown times honestly.
2. The existing serving adjuster only increments while `servings < 50`.
   With the faithful default of 72 taquitos, decrementing to 71 cannot be undone
   with plus. Do not relabel the yield as adult portions, silently choose a
   different default, or claim working 72-taquito scaling. A scoped fix and
   regression/E2E proof are needed before this recipe can pass UI delivery.

No application/schema/approval-policy changes were made. No recipe frontmatter
was created with fabricated measurements, nutrition or timing.

Clarification task: `may-el-cerito-display-prep-time-not-measured-for-t-a-angelin`.
This asks about honest site representation, not missing recipe instructions.

## Historical initial-intake validation and release state

- Locked dependencies installed with `npm ci`; existing Astro build passed.
- All 53 Node tests passed: 49 existing regressions plus 4 intake-preservation
  checks, including explicit assertions of the actual current blockers.
- `src/lib/nutrition.ts` coverage: 100 % lines, branches and functions; command
  enforced 80 % lines, 75 % branches and 80 % functions. This is coverage of that
  tested helper ONLY, not a claim of whole-project coverage or recipe E2E proof.
- Machine-readable report generated locally at
  `node_modules/.cache/angelina-intake/coverage.lcov` (ignored build artifact).
- No application source changes; no new UI or E2E pass claimed.
- No PR, Vercel preview, recipe review, merge or production recipe deployment.
  Public-content/image/nutrition gates remain pending, NOT passed.
- Existing site homepage returned HTTP 200 on 2026-11-09; this does not mean
  the new recipe is available there.
- No proactive jobs, schedules, unrelated recipes, or runtime changes resumed.

## Authoring guardrails for resumption

- Keep the raw chicken cooking stage separate from the 750 g cooked filling.
  Do not count both raw and cooked chicken as consumed nutrition.
- Preserve source counts for 72 tortillas, half an onion, 3 cloves and optional
  1 bay leaf. Their masses are unknown. Existing `piece`/`cloves` units support
  counts; never invent grams to satisfy a grams preference.
- Water to cover, avocado-oil spray and optional cilantro have no measured
  quantities. Existing `to taste` handling can disclose unspecified quantity;
  its numeric sentinel is not a measured weight.
- Known broth allocations: 30 g filling + 240 g salsa = at least 270 g reserved.
- Filling arithmetic: 750 + 907 + 50 + 28 + 30 = 1765 g, excluding optional
  unweighed cilantro. Keep the user's approximate 441 g/layer and 882 g/pan:
  882 × 2 = 1764 g reflects rounding, not a source correction.
- 1765 ÷ 72 = approximately 24.51 g, consistent with the experimental 24–25 g
  reference per taquito. Weigh the first 5–6; do not imply this was validated.
- Salsa: 560 + 1192 + 460 + 240 + 10 = 2462 g before cooking losses.
  262 + 523 + 262 = 1047 g/pan; 2094 g both pans; approximately 368 g reserved.
  2094 ÷ 2462 is approximately 85.05 %, not a precisely measured 85 % yield.
  The rounded 262:523:262 allocations approximate 1:2:1.
- Never count all 2462 g salsa as eaten when 368 g is reserved. Future nutrition
  must disclose proportional allocation assumptions and cooking-loss uncertainty.
- Required nutrition has NOT been calculated. Before a publishable recipe, use
  verified official labels/primary data, transparent product assumptions and
  explicit omissions for unweighed oil/aromatics/cilantro. The tortilla preference
  is not proof of actual tortilla brand or mass. No measured macros are supplied.
- No cover was supplied. No generated image has been commissioned at this
  blocked intake stage. On resumption use the approved recipe cover workflow,
  label it as a generated illustration, and do not imply it is a cooked-batch
  photograph or portray the experimental browned finish as proven.
- No lighter sibling invented or linked. Preserve the requested family scope.
- The source version number 2.1 and historical V2 notes are real family revision
  metadata, not placeholders to remove under a generic banned-token check.
- Required reviewer remains `el-cerito-recipe-reviewer`, at current PR HEAD.
  An `auto_merge_triggered` result is not proof of merge. The exposed
  `execute_approved_merge` description currently requires an approval-ledger
  entry; do not fabricate one or change policy if its runtime cannot honor the
  configured review-based autonomous contract.

## Safety verification

The source's 165 °F endpoint for chicken and the casserole agrees with the
official FoodSafety.gov chart (165 °F / 74 °C), verified 2026-11-09.
Use a thermometer; the family time intervals are not guarantees of doneness.
Source: https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures

## Complete combined user recipe source — preserved verbatim

Tía Angelina's Enchiladas de Espinaca. Family Recipe Version 2.1. Creamy spinach enchilada lasagna with shredded chicken and Velveeta. Yield 2 aluminum charolas, each 11x9 inches; 72 rolled taquitos total, 36/pan. Oven 350 F (177 C). Bake 90 minutes covered; optional experimental 5-10 minutes uncovered.
1 BOILED CHICKEN: 4 large boneless skinless chicken breasts approx 1kg raw; half white onion; 3 garlic cloves; 10g salt; optional 1 bay leaf; water enough to cover. Put chicken/onion/garlic/salt/bay in pot, add water to submerge, bring gentle simmer medium-high, reduce/simmer approx 15-25min or longer for thickness, cook thickest part to 165 F, remove/rest 5min/shred finely. Reserve at least 270g broth for fill+salsa. Target cooked shredded chicken750g. Original four breasts produced approx750g cooked.
2 CHICKEN VELVEETA FILL: cooked shredded chicken750g; Velveeta Original907g (2lb); finely chopped green onions50g; mild diced green chiles drained28g; reserved broth30g; optional fresh cilantro (no amount supplied). Total approx1765g. Finely shred chicken for easy rolling; cube cheese; finely chop scallions white+green; combine chicken/Velveeta/scallions/chiles/broth in large bowl, mix distributed. Velveeta goes DIRECTLY IN CHICKEN filling per Tia Angelina, not salsa. For72 taquitos use24-25g each, approx441g fill/layer and882g/pan. Weigh first5-6 as visual reference, prevent first pan overfilled/last short.
3 CREAMY SPINACH SALSA DOUBLE BATCH: frozen chopped spinach560g; condensed cream chicken soup1192g (4 cans); sour cream460g; reserved broth240g; Knorr Suiza chicken bouillon10g. Total2462g before cooking losses. Thaw spinach/drain excess WITHOUT squeezing completely dry. Blend broth/sour cream/soup/spinach/Knorr in SMALL BATCHES until completely smooth, avoid overloading especially frozen spinach. Transfer saucepan; heat gently medium-low stirring frequently until steaming throughout; taste/adjust only necessary. Creamy pourable not watery. Original estimate roughly9 cups, not measured density. Proposed V2.1: reserve approx15% salsa to preserve tortilla texture. Per pan bottom262g, middle523g, top262g, total1047g; both pans bottom524g/middle1046g/top524g,total2094g. Reserve approx368g. Ratio1:2:1, reduction EXPERIMENTAL, goal distinct not saturated layers. Don't present 15% as validated improvement.
4 TORTILLAS:72 thin corn tortillas preferably Guerrero25-calorie; avocado oil cooking spray (quantity unspecified); buy extras for tearing. Heat nonstick skillet medium, lightly coat with spray, warm each tortilla briefly BOTH SIDES until soft/flexible; place24-25g chicken fill along side, roll tightly thin flauta/taquito, set seam down. DON'T fry crispy, only soften against breaking.
5 ASSEMBLY:2 aluminum11x9 pans. Each36 taquitos,18/layer,2 layers,approx882g filling/1047g proposed salsa. Repeat each pan: spread262g salsa bottom; arrange18 tight rolled taquitos, nine each side, closely packed; spread523g middle (thickest application); second18 taquitos; spread262g top, coat exposed tortillas WITHOUT flooding. Repeat second pan.
6 BAKE proven method:preheat350F177C; tightly foil cover each pan; put on sturdy baking sheets; bake approx90min until heated throughout center165F; carefully uncover. Optional EXPERIMENTAL golden finish per Tia suggestion:uncovered5-10min at350F watch slight edge browning/finished top, remove/rest10-15min before serve. Uncovered finish NOT YET TESTED; proven method90min covered.
7 FAMILY NOTES:Worked:4 breasts=>750g cooked;2 pans each2 layers18;warming tortillas with oil spray;smooth blending;covered baking;350F90min juicy/tender. V2 refinements:Velveeta increased907g following aunt recollection2lb block;Knorr8=>10g;scallions35=>50g per Frankie's feedback. V2.1 STILL TESTING precise24-25g fill;85% salsa distributed1:2:1;5-10min uncovered finish. Not traditional single-layer enchiladas: tightly packed rolled chicken taquitos layered like lasagna, creamy spinach salsa below/between/above. Balance sauce+fill to keep tender but distinguishable layers. Family recipe from Tia Angelina refined through home-kitchen testing.
