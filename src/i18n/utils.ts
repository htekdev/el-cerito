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
