# 🌾 El Cerito

Recetas del rancho familiar **El Cerito** en Ojo de Agua, México — cocina casera
mexicana y alternativas saludables, con **porciones y macros dinámicos**.

Live site: https://el-cerito.vercel.app

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Astro (static) + `@astrojs/vercel` |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Content | Astro Content Collections (Zod schema) |
| Hosting | Vercel |
| Fonts | Fraunces (headings) + Nunito Sans (body), self-hosted |

## Key features

- **Dynamic serving sizes** — change the serving count on any recipe and every
  ingredient quantity plus the total macros recalculate instantly (client-side).
- **Per-ingredient macros** — each ingredient carries its own calories/protein/carbs/fat
  so scaling stays accurate.
- **Healthier alternatives** — recipes link to lighter/cleaner sibling recipes to grow
  the library toward healthy options over time.
- **Health labels** — `low-calorie`, `low-carb`, `low-fat`, `high-protein`, etc., with
  filtering on the recipes page.
- **Bilingual-ready** — Spanish primary (`es_MX`), optional English titles.
- **Recipe structured data** (schema.org/Recipe) for SEO.

## Content model

Recipes live in `src/content/recipes/*.md`. The Zod schema is defined in
`src/content.config.ts`. Highlights:

```ts
servings: number                 // default serving count (amounts authored at this size)
ingredients: Array<{ name, amount, unit, calories?, protein?, carbs?, fat?, fiber? }>
macros: { calories, protein, carbs, fat, fiber }   // per serving
healthLabels: Array<'low-calorie' | 'low-carb' | 'low-fat' | 'high-protein' | ...>
healthierAlternatives: Array<{ recipe: reference, label }>
```

The scaling math (`factor = target / default`) lives in `src/lib/nutrition.ts` and is
mirrored in the recipe page's client script so server-rendered and JS-updated numbers
always agree.

## Adding a recipe

1. Create `src/content/recipes/mi-receta.md` with frontmatter matching the schema.
2. Add a cover image to `public/images/recipes/`.
3. (Optional) Link a healthier alternative via `healthierAlternatives`.
4. `npm run build` to validate, then open a PR (Vercel preview).

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # production build (validates content schema)
npm run preview  # preview the build
```

## Deployment

Vercel auto-deploys `main` to production and every PR to a preview URL.
**Never push directly to `main`** — use branch + PR + Vercel preview.
