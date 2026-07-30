/**
 * El Cerito — i18n helpers.
 *
 * Provides language detection from the URL, a translation function, localized
 * route builders, and per-recipe field getters that fall back to Spanish when an
 * English translation is missing.
 */

import { ui, defaultLang, type Lang, type UIKey } from './ui';

/** Detect the active language from a URL pathname (`/en/...` → en, else es). */
export function getLangFromUrl(url: URL): Lang {
  const [, seg] = url.pathname.split('/');
  if (seg === 'en') return 'en';
  return defaultLang;
}

/** Returns a translation function bound to a language, with Spanish fallback. */
export function useTranslations(lang: Lang) {
  return function t(key: UIKey): string {
    return ui[lang][key] ?? ui[defaultLang][key];
  };
}

/**
 * Localized base routes. Spanish lives at the root (no prefix), English under /en.
 * Slugs (Spanish content ids) are shared across languages.
 */
export function routes(lang: Lang) {
  const en = lang === 'en';
  return {
    home: en ? '/en/' : '/',
    recipes: en ? '/en/recipes' : '/recetas',
    healthy: en ? '/en/recipes?health=saludables' : '/recetas?health=saludables',
    about: en ? '/en/about' : '/nosotros',
  };
}

/** URL for a single recipe in the given language. */
export function recipePath(lang: Lang, slug: string): string {
  return lang === 'en' ? `/en/recipes/${slug}` : `/recetas/${slug}`;
}

/** The other language (for the switcher). */
export function otherLang(lang: Lang): Lang {
  return lang === 'en' ? 'es' : 'en';
}

// ── Recipe field getters (English falls back to Spanish) ──────────────────

type IngredientLike = {
  name: string;
  nameEn?: string;
  note?: string;
  noteEn?: string;
  [k: string]: unknown;
};

type RecipeDataLike = {
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  servingLabel: string;
  servingLabelEn?: string;
  instructions: string[];
  instructionsEn?: string[];
  storyEn?: string;
  [k: string]: unknown;
};

export function rTitle(d: RecipeDataLike, lang: Lang): string {
  return lang === 'en' && d.titleEn ? d.titleEn : d.title;
}

export function rDescription(d: RecipeDataLike, lang: Lang): string {
  return lang === 'en' && d.descriptionEn ? d.descriptionEn : d.description;
}

export function rServingLabel(d: RecipeDataLike, lang: Lang): string {
  return lang === 'en' && d.servingLabelEn ? d.servingLabelEn : d.servingLabel;
}

export function rIngredientName(ing: IngredientLike, lang: Lang): string {
  return lang === 'en' && ing.nameEn ? ing.nameEn : ing.name;
}

export function rIngredientNote(ing: IngredientLike, lang: Lang): string | undefined {
  return lang === 'en' && ing.noteEn ? ing.noteEn : ing.note;
}

export function rInstructions(d: RecipeDataLike, lang: Lang): string[] {
  return lang === 'en' && d.instructionsEn && d.instructionsEn.length > 0
    ? d.instructionsEn
    : d.instructions;
}

// ── Step-grouped layout helpers ───────────────────────────────────────────

type StepIngredientLike = {
  ref?: number;
  label?: string;
  labelEn?: string;
  amountLabel?: string;
  amountLabelEn?: string;
  note?: string;
  noteEn?: string;
};

type StepLike = {
  title?: string;
  titleEn?: string;
  text: string;
  textEn?: string;
  ingredients?: StepIngredientLike[];
};

/** A step ingredient chip, resolved + localized, ready to render. */
export type ResolvedStepIngredient = {
  /** Index into ingredients[] for live scaling, or null for free-text chips. */
  refIdx: number | null;
  /** Base amount at default servings (null when no measurable amount). */
  amount: number | null;
  /** Unit string (null when not applicable). */
  unit: string | null;
  /** Free-text amount override (e.g. "la mitad"); takes priority over amount. */
  amountLabel: string | null;
  /** Display name (localized). */
  name: string;
  /** Optional note (localized). */
  note: string | null;
};

export type ResolvedStep = {
  title: string | null;
  text: string;
  ingredients: ResolvedStepIngredient[];
};

type IngredientResolvable = {
  name: string;
  nameEn?: string;
  amount: number;
  unit: string;
  note?: string;
  noteEn?: string;
};

/**
 * Resolve the rich `steps[]` into localized, render-ready step objects with
 * each ingredient chip resolved against the master ingredient list. Returns
 * null when the recipe has no rich steps (caller falls back to flat instructions).
 */
export function rSteps(
  d: { steps?: StepLike[] },
  ingredients: IngredientResolvable[],
  lang: Lang,
): ResolvedStep[] | null {
  if (!d.steps || d.steps.length === 0) return null;
  return d.steps.map((step) => ({
    title: (lang === 'en' && step.titleEn ? step.titleEn : step.title) ?? null,
    text: lang === 'en' && step.textEn ? step.textEn : step.text,
    ingredients: (step.ingredients ?? []).map((si): ResolvedStepIngredient => {
      const base = si.ref !== undefined ? ingredients[si.ref] : undefined;
      const name = base
        ? (lang === 'en' && base.nameEn ? base.nameEn : base.name)
        : (lang === 'en' && si.labelEn ? si.labelEn : si.label) ?? '';
      const note = (lang === 'en' && si.noteEn ? si.noteEn : si.note) ?? null;
      const amountLabel = (lang === 'en' && si.amountLabelEn ? si.amountLabelEn : si.amountLabel) ?? null;
      return {
        refIdx: si.ref ?? null,
        amount: base && base.unit !== 'to taste' ? base.amount : null,
        unit: base ? base.unit : null,
        amountLabel,
        name,
        note,
      };
    }),
  }));
}

/**
 * A grocery-list item, oriented toward SHOPPING: item name + the quantity to
 * buy. Amounts are the base quantity at default servings (they live-scale with
 * the serving stepper). `amount`/`unit` are null for "to taste" ingredients.
 */
export type GroceryItem = {
  name: string;
  amount: number | null;
  unit: string | null;
  optional: boolean;
};

/**
 * Build a shopping-oriented grocery list from the ingredient list. Unlike the
 * ingredients reference, this is grouped for buying: parenthetical translations
 * are stripped for clean shopping names, and duplicate items (same name + unit)
 * are DEDUPLICATED with their quantities SUMMED. An item stays optional only if
 * every occurrence is optional. "To taste" items show no quantity.
 */
export function buildGroceryList(
  ingredients: { name: string; nameEn?: string; amount?: number; unit?: string; optional?: boolean }[],
  lang: Lang,
): GroceryItem[] {
  const out: GroceryItem[] = [];
  const seen = new Map<string, number>();
  for (const ing of ingredients) {
    const raw = lang === 'en' && ing.nameEn ? ing.nameEn : ing.name;
    const name = raw.replace(/\s*\([^)]*\)\s*$/, '').trim();
    const toTaste = ing.unit === 'to taste';
    const unit = toTaste ? null : ing.unit ?? null;
    const amount = toTaste ? null : typeof ing.amount === 'number' ? ing.amount : null;
    const optional = ing.optional === true;
    // Dedupe by name + unit so summing quantities is always meaningful.
    const key = `${name.toLowerCase()}|${unit ?? 'to-taste'}`;
    if (seen.has(key)) {
      const idx = seen.get(key)!;
      if (amount !== null) out[idx].amount = (out[idx].amount ?? 0) + amount;
      // stays optional only if BOTH occurrences are optional
      out[idx].optional = out[idx].optional && optional;
    } else {
      seen.set(key, out.length);
      out.push({ name, amount, unit, optional });
    }
  }
  return out;
}

/** Optional English story paragraph; falls back to null (Spanish body renders). */
export function rStory(d: RecipeDataLike, lang: Lang): string | null {
  return lang === 'en' && d.storyEn ? d.storyEn : null;
}

export function rAltLabel(
  alt: { label: string; labelEn?: string },
  lang: Lang,
): string {
  return lang === 'en' && alt.labelEn ? alt.labelEn : alt.label;
}
