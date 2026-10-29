# Mini conchas con tangzhong — nutrition calculation

Estimate only. Generic USDA FoodData Central, SR Legacy profiles, not brand labels or lab analysis.

- Food search: https://fdc.nal.usda.gov/food-search/?type=SR+Legacy
- Documentation: https://fdc.nal.usda.gov/data-documentation.html

Method: ingredient value = per-100 g profile × grams ÷ 100. Batch = sum of the listed ingredient rows.
Per serving = batch ÷ 40 reference servings. The full listed batch is used, **including** the
56.5 g dough surplus and 39 g shell surplus, so a serving is not the exact nutrition of one
35 g dough + 11 g shell piece.

## Tangzhong accounting (counted once)

Source: 40 g bread flour + 200 g whole milk = 240 g raw input; the source claims ~200 g cooked.
Only the two raw lines (40 g flour, 200 g milk) are counted. The 200 g cooled prepared paste in the
dough step is an intermediate label and is **not** added again. If paste is left unused, the
estimate overestimates (conservative full 240 g input accounting). Evaporation is not assumed to
be exactly 200 g.

## Profiles per 100 g (kcal, protein g, carbs g, fat g, fiber g)

| Ingredient (SR Legacy generic) | kcal | P | C | F | Fiber |
|---|---:|---:|---:|---:|---:|
| Wheat flour, white, bread, enriched | 361 | 12 | 72.53 | 1.66 | 2.4 |
| Milk, whole, 3.25% milkfat | 61 | 3.15 | 4.78 | 3.27 | 0 |
| Sugars, granulated | 387 | 0 | 99.8 | 0 | 0 |
| Egg, whole, raw, fresh | 143 | 12.56 | 0.72 | 9.51 | 0 |
| Butter, without salt | 717 | 0.85 | 0.06 | 81.11 | 0 |
| Vanilla extract | 288 | 0.06 | 12.65 | 0.06 | 0 |
| Salt, table | 0 | 0 | 0 | 0 | 0 |
| Yeast, baker's, active dry (proxy for instant) | 325 | 40.44 | 41.22 | 7.61 | 26.9 |
| Wheat flour, white, all-purpose, enriched | 364 | 10.33 | 76.31 | 0.98 | 2.7 |
| Sugars, powdered | 389 | 0 | 99.77 | 0.06 | 0 |
| Shortening, household, vegetable | 884 | 0 | 0 | 100 | 0 |

## Ingredient rows

| # | Ingredient | g | kcal | P | C | F | Fiber |
|---|---|---:|---:|---:|---:|---:|---:|
| 0 | Bread flour (tangzhong) | 40 | 144.4 | 4.8 | 29.012 | 0.664 | 0.96 |
| 1 | Whole milk (tangzhong) | 200 | 122 | 6.3 | 9.56 | 6.54 | 0 |
| 2 | Bread flour (dough) | 712.5 | 2572.125 | 85.5 | 516.77625 | 11.8275 | 17.1 |
| 3 | Whole milk (dough) | 200 | 122 | 6.3 | 9.56 | 6.54 | 0 |
| 4 | Granulated sugar | 120 | 464.4 | 0 | 119.76 | 0 | 0 |
| 5 | Egg, shell-free (2 large ≈ 100 g) | 100 | 143 | 12.56 | 0.72 | 9.51 | 0 |
| 6 | Unsalted butter | 90 | 645.3 | 0.765 | 0.054 | 72.999 | 0 |
| 7 | Vanilla (dough) | 10 | 28.8 | 0.006 | 1.265 | 0.006 | 0 |
| 8 | Salt (dough) | 10 | 0 | 0 | 0 | 0 | 0 |
| 9 | Instant yeast | 14 | 45.5 | 5.6616 | 5.7708 | 1.0654 | 3.766 |
| 10 | AP flour (shell) | 158 | 575.12 | 16.3214 | 120.5698 | 1.5484 | 4.266 |
| 11 | Powdered sugar | 153 | 595.17 | 0 | 152.6481 | 0.0918 | 0 |
| 12 | Vegetable shortening | 153 | 1352.52 | 0 | 0 | 153 | 0 |
| 13 | Vanilla (shell) | 14 | 40.32 | 0.0084 | 1.771 | 0.0084 | 0 |
| 14 | Salt (shell) | 1 | 0 | 0 | 0 | 0 | 0 |

## Totals

| | kcal | P | C | F | Fiber |
|---|---:|---:|---:|---:|---:|
| Batch (1,975.5 g raw listed input) | 6850.655 | 138.2224 | 967.46695 | 263.8005 | 26.092 |
| Per serving (÷ 40) | 171.266375 | 3.45556 | 24.18667375 | 6.5950125 | 0.6523 |

## Weight reconciliation

- Tangzhong raw input: 40 + 200 = 240 g (source claims 200 g cooked).
- Dough with 200 g prepared paste: 712.5 + 200 + 200 + 120 + 100 + 90 + 10 + 10 + 14 = 1,456.5 g (source says about 1,400 g). 40 × 35 g = 1,400 g; surplus 56.5 g.
- Shell: 158 + 153 + 153 + 14 + 1 = 479 g (source says about 450 g). 40 × 11 g = 440 g; surplus 39 g.
- Counted raw listed input: 240 + (1,456.5 − 200) + 479 = 1,975.5 g.

## Limits

Sodium and sugar are not estimated; zero-energy salt does not mean sodium-free. Optional coloring has
no source quantity and is not counted. Instant yeast uses the active dry yeast profile.
