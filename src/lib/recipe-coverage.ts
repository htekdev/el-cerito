/**
 * Recipe coverage evaluator — decides which required fields are still missing
 * and produces a next-best-question for the AI reply generator.
 *
 * Mirrors the pattern in `servodetail/src/lib/onboard-coverage.ts` but scoped
 * to the El Cerito Recipe schema (see spec §6).
 */
import type { PartialRecipe } from './ai';

export interface Ambiguity {
  /** What is unclear — e.g. "Jell-O (powder mix vs pre-made cups?)" */
  label: string;
  /** Ready-to-ask clarification question in the recipe's locale. */
  question: string;
}

export interface Gap {
  key: string;
  label: string;
  /** Fallback question (used if GPT reply fails). */
  question: string;
  weight: number;
}

export interface CoverageResult {
  score: number;
  isComplete: boolean;
  filled: { key: string; label: string }[];
  nextGaps: Gap[];
  /** Open clarifying questions the AI must ask before we can submit. */
  ambiguities: Ambiguity[];
}

const FIELDS: Gap[] = [
  { key: 'title', label: 'título', weight: 15,
    question: '¿Cómo se llama la receta?' },
  { key: 'description', label: 'descripción', weight: 5,
    question: '¿Podrías darme una descripción cortita, como quien cuenta de dónde viene la receta?' },
  { key: 'ingredients', label: 'ingredientes', weight: 30,
    question: '¿Qué ingredientes lleva y cuánto de cada uno?' },
  { key: 'instructions', label: 'pasos', weight: 25,
    question: '¿Y cómo se prepara? Cuéntame los pasos.' },
  { key: 'prepTime', label: 'tiempo de preparación', weight: 5,
    question: '¿Cuánto tarda en la preparación, más o menos?' },
  { key: 'cookTime', label: 'tiempo de cocción', weight: 5,
    question: '¿Y cuánto en cocinarse?' },
  { key: 'categories', label: 'categoría', weight: 5,
    question: '¿Es para desayuno, comida, cena, o algo diferente?' },
  { key: 'servings', label: 'porciones', weight: 10,
    question: '¿Para cuántas porciones te sale?' },
];

export function evaluateCoverage(r: PartialRecipe | null | undefined): CoverageResult {
  const recipe = r ?? {};
  const filled: { key: string; label: string }[] = [];
  const gaps: Gap[] = [];
  let earned = 0;
  let total = 0;

  for (const f of FIELDS) {
    total += f.weight;
    if (isFilled(f.key, recipe)) {
      earned += f.weight;
      filled.push({ key: f.key, label: f.label });
    } else {
      gaps.push(f);
    }
  }

  const score = Math.round((earned / total) * 100);
  const ambiguities = (recipe.ambiguities ?? []).filter(
    (a): a is Ambiguity => !!a && typeof a.question === 'string' && a.question.trim().length > 0,
  );
  // "Complete enough to save" — all required fields AND no open clarifications.
  const isComplete = gaps.length === 0 && ambiguities.length === 0;

  return { score, isComplete, filled, nextGaps: gaps.slice(0, 3), ambiguities };
}

function isFilled(key: string, r: PartialRecipe): boolean {
  switch (key) {
    case 'title':        return !!r.title && r.title.trim().length > 0;
    case 'description':  return !!r.description && r.description.trim().length > 0;
    case 'ingredients':  return Array.isArray(r.ingredients) && r.ingredients.length >= 3
                                && r.ingredients.every((i) => !!i.name && typeof i.amount === 'number' && !!i.unit);
    case 'instructions': return Array.isArray(r.instructions) && r.instructions.length >= 2;
    case 'prepTime':     return typeof r.prepTime === 'number' && r.prepTime >= 0
                                // must be explicitly set — 0 with no cookTime doesn't count
                                && (r.prepTime > 0 || (r.cookTime ?? 0) > 0);
    case 'cookTime':     return typeof r.cookTime === 'number' && r.cookTime >= 0
                                && (r.cookTime > 0 || (r.prepTime ?? 0) > 0);
    case 'categories':   return Array.isArray(r.categories) && r.categories.length >= 1;
    case 'servings':     return typeof r.servings === 'number' && r.servings > 0;
    default: return false;
  }
}
