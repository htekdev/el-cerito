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
  /** Display name, e.g. "chicken breast" */
  name: z.string(),
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
  /** Optional note, e.g. "diced", "room temperature" */
  note: z.string().optional(),
  /** Mark true for optional / garnish ingredients */
  optional: z.boolean().default(false),
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
    /** Short description / story */
    description: z.string(),

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

    /** Ingredients with per-ingredient macros (scale with servings) */
    ingredients: z.array(ingredientSchema),

    /** Per-serving macro summary */
    macros: macrosSchema,

    /** Step-by-step instructions */
    instructions: z.array(z.string()),

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
      /** Short label, e.g. "Versión sin azúcar", "Al horno en vez de frito" */
      label: z.string(),
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
