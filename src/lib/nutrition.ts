/**
 * El Cerito — nutrition & scaling helpers
 *
 * The DEFAULT serving count is authored in each recipe. To scale to a different
 * serving count, multiply every amount and macro value by `factor = target / default`.
 * The frontend uses the same math client-side for the live serving adjuster, so the
 * server-rendered numbers and JS-updated numbers always agree.
 */

export type Macros = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
};

/** Scale factor for a target serving count against the recipe default. */
export function scaleFactor(defaultServings: number, targetServings: number): number {
  if (!defaultServings || defaultServings <= 0) return 1;
  return targetServings / defaultServings;
}

/** Round to a sensible precision for display (whole numbers >= 10, 1 decimal below). */
export function niceRound(value: number): number {
  if (!isFinite(value)) return 0;
  if (value >= 10) return Math.round(value);
  return Math.round(value * 10) / 10;
}

/** Format a scaled ingredient amount for display. */
export function formatAmount(amount: number, factor: number): string {
  const scaled = amount * factor;
  const rounded = niceRound(scaled);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** Total time helper. */
export function totalTime(prep: number, cook: number, explicit?: number): number {
  return typeof explicit === 'number' ? explicit : prep + cook;
}

/** Human-friendly minutes -> "1 h 20 min" */
export function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Health label display metadata (Spanish labels, palette-aware colors). */
export const HEALTH_LABELS: Record<string, { es: string; icon: string; color: string }> = {
  'low-calorie':  { es: 'Bajo en calorías', icon: '🔥', color: 'bg-sage-light/40 text-sage-dark' },
  'low-carb':     { es: 'Bajo en carbohidratos', icon: '🌾', color: 'bg-honey/20 text-terracotta-dark' },
  'low-fat':      { es: 'Bajo en grasa', icon: '🥑', color: 'bg-sage-light/40 text-sage-dark' },
  'high-protein': { es: 'Alto en proteína', icon: '💪', color: 'bg-terracotta-light/25 text-terracotta-dark' },
  'high-fiber':   { es: 'Alto en fibra', icon: '🌿', color: 'bg-sage-light/40 text-sage-dark' },
  'gluten-free':  { es: 'Sin gluten', icon: '🚫🌾', color: 'bg-clay text-earth' },
  'vegetarian':   { es: 'Vegetariano', icon: '🥗', color: 'bg-sage-light/40 text-sage-dark' },
  'vegan':        { es: 'Vegano', icon: '🌱', color: 'bg-sage-light/40 text-sage-dark' },
};

/** Category display metadata (Spanish primary). */
export const CATEGORIES: Record<string, { es: string; en: string; icon: string }> = {
  desayuno:   { es: 'Desayuno', en: 'Breakfast', icon: '🌅' },
  comida:     { es: 'Comida', en: 'Lunch', icon: '🍽️' },
  cena:       { es: 'Cena', en: 'Dinner', icon: '🌙' },
  snack:      { es: 'Snack', en: 'Snack', icon: '🥨' },
  postre:     { es: 'Postre', en: 'Dessert', icon: '🍰' },
  bebida:     { es: 'Bebida', en: 'Drink', icon: '🥤' },
  guarnicion: { es: 'Guarnición', en: 'Side', icon: '🥔' },
  salsa:      { es: 'Salsa', en: 'Sauce', icon: '🌶️' },
};

export const DIFFICULTY: Record<string, { es: string; icon: string }> = {
  facil:  { es: 'Fácil', icon: '●○○' },
  media:  { es: 'Media', icon: '●●○' },
  dificil:{ es: 'Difícil', icon: '●●●' },
};
