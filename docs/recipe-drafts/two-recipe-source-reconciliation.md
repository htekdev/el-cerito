# Green mole and Angelina source reconciliation

## Scope and release boundary

This task belongs to the existing **El Cerito** recipe website. Base main:
`8caeb53695d699b1c27d3f84fff3f6dcb3759232`.
Prepare content, tests and a reviewed PR/preview only. Publication remains on
hold; no merge, production deployment or unrelated recipe change is authorized.

Original source images were inspected privately and are **not committed,
uploaded or republished**. Only their food-recipe transcription is used.
No named approving relatives, contact details, private archive paths or
unrelated intake/application schema are introduced into public content.

Source fingerprints:
- Green mole: `b2507130870bd101abb08b4927861dd269d11384736f2c2df9ffaca2bff6ce0d`.
- Angelina infographic: `911cab77491785a165b5666d2ea2d5c384a16171021610813a96c31aa95b7805`.

## Created: green mole, not the existing red tomato salsa

Canonical content: `src/content/recipes/costillas-de-puerco-en-mole-verde.md`.
Spanish `/recetas/costillas-de-puerco-en-mole-verde`; English
`/en/recipes/costillas-de-puerco-en-mole-verde`.
`costillas-de-puerco-en-salsa.md` is unchanged.

All 21 ingredient/use lines, nine ordered steps, six key techniques, source
notes and the source-described flavor transformation/result are retained.
The metric batch is the image's 6350 g, not a new conversion of its paired
14 lb / 6.35 kg. Lettuce185 g, spinach approximately200 g, pepitas80 g,
sesame30 g, peanuts63 g and broth442 g are source masses.

Garlic approximately5 cloves, scallions4 and jalapeños2 retain counts and
unmeasured-mass notes. Cumin literally says `≈ 2 pinzas`; celery leaves a
handful, parsley1 bunch, cilantro1 bunch and radish leaves2 bunches. Those
uncountable units use the existing unspecified-quantity marker, NOT invented
grams. Water, oil, serranos and salts remain unmeasured. Notes quoting source
units are provenance, not new kitchen-scale conversions. No added lard: ribs
brown in their own rendered fat after all water evaporates. Both seeds and
peanuts fry together; ALL greens blend raw and the raw mole cooks on the ribs.

One batch is a **scaling basis**, not a claim that one person eats the batch.
No diner count, preparation total or whole cooking time is invented. Source
10–20-minute marinade and45–90-minute final simmer remain in the steps only.
No nutrition was supplied, so macros are omitted rather than fabricated.
Medium difficulty is explicitly disclosed as an editorial classification.

Cover: authored SVG **ingredient diagram**, not a photograph, a newly generated
food result or the private source image. The actual schema permits an image
path without requiring JPEG. No image-model generation or source-photo upload.

Remaining narrow wording question: does the literal cumin `≈ 2 pinzas` mean
two pinches? It is not silently corrected. Exact unmeasured masses remain
unknown; the preview does not claim a fully gram-normalized formula.

## Updated: existing Angelina slug, no duplicate recipe

Canonical content remains
`src/content/recipes/enchiladas-de-espinaca-tia-angelina.md`.
Original main blob: `53c81f6bbd3a036d979594a148b4608f60dc290b`.
Spanish `/recetas/enchiladas-de-espinaca-tia-angelina`; English
`/en/recipes/enchiladas-de-espinaca-tia-angelina`.

Only a clearly headed original-infographic source section in BOTH languages
and the update date are added. The current recipe's title, ingredients,
instructions, rich steps, macro calculations and cover remain unchanged.
Whole TWO-tray batch, minimum1, factor=chosenTrays/2 and the November10
9×13 target remain authoritative. The source figures in the appended section
are explicitly **fixed original two-pan references**, not live-scaled figures
or replacements for Version2.1.

The complete original source section includes every ingredient, all seven
steps, immersion-blender/frying/no-cheese tips, paddle/Speed2/~30second tip,
ingredient flexibility and24h/3–4days/2months storage-panel transcription.
All of those tips/storage claims are attributed to the supplied image, not
newly tested results or recommendations.

| Difference | Resupplied infographic | Curated current recipe, retained |
| --- | --- | --- |
| Chicken | ~3 lb raw; ~750 g cooked, separate assertions |1000 g raw; ~750 g cooked once |
| Sour cream |454 g, whole1 lb/16 oz container |460 g |
| Soup |4×10.5 oz cans; no source grams |1192 g curated amount |
| Additional inputs |No cooking aromatics, filling broth or cilantro |Existing additions retained |
| Spinach |Frozen directly in pot; immersion blender |Thaw/drain excess; small blender batches |
| Tortillas |Purchase/fry ALL116; assemble72;44extras |72historical approximate guide, count as needed |
| Sauce |Use all, fully cover |85% allocation remains EXPERIMENTAL |
| Pans |Two11×9,18/layer,36/pan,72total |Two-tray scaling; current9×13 target, not new fit proof |
| Bake |90covered +5uncovered;95min is oven-only |90covered proven;5–10finish still UNTESTED |

Panel conflicts remain explicit: sour cream/soup are under filling but step3
uses sauce; scallions/chilies are under sauce but step2 uses filling. No
melting method for cubed Velveeta or use for44extras is fabricated.
The image's approval badge is **image-attributed only**, not owner consent,
pipeline approval, reviewer signature or a new cooking trial. Named approving
relatives are not repeated.

Existing records `enchiladas-de-espinaca-tia-angelina-v2-1.md`,
`angelina-two-tray-correction.md` and `angelina-v2-1-validation.md` are not
rewritten or rolled back. Original combined-source hash remains locked.

## Small required unknown-nutrition support

- `macros` becomes optional; all fields of a supplied object remain required
  as before. No zero-filled nutrition is synthesized.
- Known values, genuine zero, existing per-tray nutrition and existing scaling
  math remain unchanged.
- Unknown nutrition has localized text on detail/cards; no numeric table,
  calories/protein badge or `NutritionInformation` JSON-LD is emitted.
- Healthier-link calorie access is guarded; no lighter sibling is invented.
- Existing unknown-time support and explicit batch/tray labels are reused.

Official implementation references:
- Astro content schemas: https://docs.astro.build/en/guides/content-collections/
- Recipe structured-data properties:
  https://developers.google.com/search/docs/appearance/structured-data/recipe
- Schema.org nutrition: https://schema.org/nutrition
- Primer empty-state content:
  https://primer.style/product/components/blankslate/guidelines/

Validation must exercise source completeness, untouched curated data, unknown
nutrition and times, schema build, actual bundled scaling, and recorded ES/EN
desktop/mobile detail/card/print behavior. Local tests are not CI/reviewer or
anonymous preview acceptance. The final PR/HEAD/deployment/review evidence
belongs in the delivery handoff; green evidence does not lift the release hold.
