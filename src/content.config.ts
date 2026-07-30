import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * El Cerito — Recipe content collection schema
 *
 * Design goals:
 *  - Ingredients carry PER-INGREDIENT macros so the frontend can scale both
 *    quantities and nutrition dynamically when the user changes the serving size.
 *  - `macros` is the authored per-serving nutrition summary (source of truth for
 *    the badge/labels). The frontend recomputes displayed totals from `servings`.
 *  - `healthierAlternatives` links a recipe to lighter/cleaner sibling recipes so
 *    the library can grow toward healthy options over time.
 */

const unitEnum = z.enum([
  'g', 'kg', 'ml', 'l',
  'tsp', 'tbsp', 'cup', 'cups',
  'piece', 'pieces', 'clove', 'cloves',
  'pinch', 'slice', 'slices', 'can', 'to taste',
]);

const ingredientSchema = z.object({
  /** Display name (Spanish primary), e.g. "pechuga de pollo" */
  name: z.string(),
  /** Optional English name for bilingual display, e.g. "chicken breast" */
  nameEn: z.string().optional(),
  /** Numeric quantity for the DEFAULT serving count. Scales linearly. */
  amount: z.number(),
  /** Measurement unit */
  unit: unitEnum,
  /** Optional per-ingredient macros (for the whole `amount` at default servings) */
  calories: z.number().optional(),
  protein: z.number().optional(),
  carbs: z.number().optional(),
  fat: z.number().optional(),
  fiber: z.number().optional(),
  /** Optional note (Spanish primary), e.g. "picada", "a temperatura ambiente" */
  note: z.string().optional(),
  /** Optional English note for bilingual display */
  noteEn: z.string().optional(),
  /** Mark true for optional / garnish ingredients */
  optional: z.boolean().default(false),
});

/**
 * A single ingredient reference attached to an instruction step.
 *
 * Authoring is flexible:
 *  - A bare number (`- 0`) is shorthand for `{ ref: 0 }` — a reference to the
 *    ingredient at that index in `ingredients[]`. The step then shows that
 *    ingredient's name + LIVE-scaled amount/unit, so it stays in sync with the
 *    serving stepper and never drifts from the master list.
 *  - An object with `ref` may add a step-specific `note`/`amountLabel` override
 *    (e.g. "la mitad" / "half", "el jugo de 1" / "juice of 1").
 *  - An object with only `label` (no `ref`) is a free-text chip for
 *    intermediate products that aren't raw ingredients — e.g.
 *    "la carne marinada" / "the marinated steak".
 */
const stepIngredientSchema = z.preprocess(
  (v) => (typeof v === 'number' ? { ref: v } : v),
  z.object({
    /** Index into the recipe `ingredients[]` array (0-based). Enables live scaling. */
    ref: z.number().int().nonnegative().optional(),
    /** Free-text chip label (Spanish) — used when there is no `ref`. */
    label: z.string().optional(),
    /** Optional English label for bilingual display. */
    labelEn: z.string().optional(),
    /** Override the shown amount with free text (e.g. "la mitad", "1 chorro"). */
    amountLabel: z.string().optional(),
    amountLabelEn: z.string().optional(),
    /** Step-specific note (Spanish), overrides the ingredient's own note here. */
    note: z.string().optional(),
    noteEn: z.string().optional(),
  }).refine((v) => v.ref !== undefined || v.label !== undefined, {
    message: 'A step ingredient needs either `ref` (an ingredient index) or `label` (free text).',
  }),
);

/**
 * A rich instruction step that maps the relevant ingredients to THIS step.
 * Used by the step-grouped recipe layout so cooks never scroll back up to the
 * ingredient list. Falls back gracefully: recipes may keep the flat
 * `instructions` string array instead (see below).
 */
const stepSchema = z.object({
  /** Optional short heading, e.g. "Marinar la carne" / "Marinate the steak". */
  title: z.string().optional(),
  titleEn: z.string().optional(),
  /** The instruction text (Spanish primary). */
  text: z.string(),
  textEn: z.string().optional(),
  /** Ingredients (with measurements) needed for this specific step. */
  ingredients: z.array(stepIngredientSchema).default([]),
});

const macrosSchema = z.object({
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  fiber: z.number().default(0),
  sugar: z.number().optional(),
  sodium: z.number().optional(),
});

const healthLabelEnum = z.enum([
  'low-calorie',
  'low-carb',
  'low-fat',
  'high-protein',
  'high-fiber',
  'gluten-free',
  'vegetarian',
  'vegan',
]);

const categoryEnum = z.enum([
  'desayuno',   // breakfast
  'comida',     // lunch / main
  'cena',       // dinner
  'snack',
  'postre',     // dessert
  'bebida',     // drink
  'guarnicion', // side dish
  'salsa',      // sauce / salsa
]);

const recipes = defineCollection({
  loader: glob({ base: './src/content/recipes', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    /** Recipe title (Spanish primary) */
    title: z.string(),
    /** Optional English title for bilingual display */
    titleEn: z.string().optional(),
    /** Short description / story (Spanish primary) */
    description: z.string(),
    /** Optional English description for bilingual display */
    descriptionEn: z.string().optional(),

    /** Cover image path (public/) */
    coverImage: z.string(),
    coverImageAlt: z.string().default(''),
    /** Additional visual assets (gallery / step photos) */
    gallery: z.array(z.object({
      src: z.string(),
      alt: z.string().default(''),
    })).default([]),

    /** Default serving count. All amounts + macros are authored at this size. */
    servings: z.number().int().positive().default(4),
    /** Human label for a serving, e.g. "tacos", "porciones", "vasos" */
    servingLabel: z.string().default('porciones'),
    /** Optional English serving label, e.g. "tacos", "servings", "glasses" */
    servingLabelEn: z.string().optional(),

    /** Ingredients with per-ingredient macros (scale with servings) */
    ingredients: z.array(ingredientSchema),

    /** Per-serving macro summary */
    macros: macrosSchema,

    /** Step-by-step instructions (Spanish primary) */
    instructions: z.array(z.string()),
    /** Optional English step-by-step instructions for bilingual display */
    instructionsEn: z.array(z.string()).optional(),

    /**
     * Optional RICH step-grouped instructions. When present, the recipe page
     * renders the step-by-step layout with per-step ingredients inline (so cooks
     * never scroll back up). When absent, the page falls back to the flat
     * `instructions` array above. Both stay valid — full backward compatibility.
     */
    steps: z.array(stepSchema).optional(),
    /** Optional English story paragraph (mirrors the Spanish markdown body) */
    storyEn: z.string().optional(),

    /** Times in minutes */
    prepTime: z.number().int().nonnegative(),
    cookTime: z.number().int().nonnegative(),
    /** Optional explicit total; otherwise prep + cook */
    totalTime: z.number().int().nonnegative().optional(),

    /** Primary category + free-form tags */
    categories: z.array(categoryEnum).min(1),
    tags: z.array(z.string()).default([]),

    /** Health labels that unlock filtering (grow healthy options over time) */
    healthLabels: z.array(healthLabelEnum).default([]),

    /** Links to healthier / lighter sibling recipes */
    healthierAlternatives: z.array(z.object({
      /** slug of the sibling recipe in this collection */
      recipe: reference('recipes'),
      /** Short label (Spanish), e.g. "Versión sin azúcar", "Al horno en vez de frito" */
      label: z.string(),
      /** Optional English label for bilingual display */
      labelEn: z.string().optional(),
    })).default([]),

    /** Recipe difficulty */
    difficulty: z.enum(['facil', 'media', 'dificil']).default('facil'),

    /** Origin story flag — recipes tied to the Ojo de Agua ranch */
    ranchOriginal: z.boolean().default(false),

    /** Publication metadata */
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('El Cerito'),
    /** Feature on homepage */
    featured: z.boolean().default(false),
    /** Hide from listings while drafting */
    draft: z.boolean().default(false),
  }),
});

export const collections = { recipes };
