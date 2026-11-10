# Angelina 2.1 — two-charola correction, November 10, 2026

## Required invariant

Hector explicitly corrected the yield: the complete supplied batch makes TWO
charolas/trays. Default2, minimum1, whole-tray ±1; factor=targetTrays/2.
1=half,2=original,3=1.5x,4=double. Neither taquitos nor adult meal portions are
the primary scaling unit. Restoring2 restores every original preparation amount.
No guess about adult portions is made.

The current vessel target is9×13in, per Hector's latest instruction. Original
11×9in and18/layer remain historical; no new fit/cooking validation is claimed.
The historical72-tortilla reference is approximate, including in the grocery
name; count as needed for assembly, not to an exact finished-taquito requirement.

## Small backward-compatible implementation

- Existing servings math is unchanged; this recipe now authors servings2.
- Optional singular yield labels opt this recipe into charola/charolas and
  tray/trays across selector, accessible buttons, shopping, nutrition, cards,
  print-media rendering and structured Recipe yield/nutrition servingSize.
  Other recipes retain their wording and numeric timing/yield contracts.
- All preparation ingredient amounts and per-ingredient allocated nutrient
  contributions remain unchanged. Raw shopping1000g chicken still represents
  cooked750g once; no second cooked-chicken shopping/nutrition input.
- Per-tray partial macros=unchanged consumed full-batch estimates/2. Sauce still
  uses2094/2462, excludes368g reserve and retains all omissions/uncertainty.
- Unknown duration representation, family attribution, Version2.1, original
  proven90min covered and experimental85%sauce/uncovered finish are retained.
- Generated cover is reused unchanged and remains disclosed, not a family photo.
- Original combined-source section SHA256:
  `5493544f34ab8c98d9851613641caa7817423ef34e0bd9e09fdc76ee1a1d7a74`.
  A deterministic regression locks that complete verbatim section.

## Local validation

- Node24 Astro build: passed.
- Full native Node suite:75passed,0failed,0skipped.
- Established coverage scope `src/lib/nutrition.ts`:100%lines/branches/functions;
  enforced80/75/80 thresholds. Not a whole-project coverage claim.
- Recorded Playwright:8passed,0failed, desktop and Pixel7, ES/EN.
  Four correction tests exercise actual2→3→2→1→2→3→4→3→2, minimum1,
  all ingredient/grocery/nutrient values, singular/plural, print media,
  JSON-LD, unknown times and localized listing cards.
  Four existing-recipe tests retain numeric timings and the50upper bound.
- Built-client VM regressions cover1/2/3/4/restored2/max and retain the generic
  72-count fixture for unaffected high-yield recipes.
- `coverage/lcov.info`, `playwright-report/`, `test-results/` contain local
  evidence; existing CI retains the equivalent `recipe-test-evidence` artifact.
- Public content claims are scoped to Hector's source and dated correction.
  No new measurements, photos, cooking trials, nutrition profiles or density
  conversions were introduced; arithmetic is checked independently in tests.
  Official food-safety endpoint was rechecked:165°F/74°C for poultry/casseroles.

## Release boundary

Local success is not a PR, approval, merge or deployment claim. Release requires
the current governed PR, green CI, current-HEAD recipe reviewer and supported
merge_pr handler. Vercel preview sign-in remains enabled; no anonymous preview
verification or public S3 availability is claimed or required by assumption.
Final actual PR/SHA/deployment outcome is recorded in the owned domain handoff.
