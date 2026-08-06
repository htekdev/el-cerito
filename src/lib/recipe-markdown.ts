/**
 * Assemble a Markdown file for a recipe that matches El Cerito's
 * `src/content.config.ts` frontmatter shape. The output is what the
 * `/agregar-receta` page hands the user via the "Descargar .md" button.
 */
import type { PartialRecipe } from './ai';

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'nueva-receta';
}

export function buildRecipeMarkdown(recipe: PartialRecipe, opts?: { author?: string }): string {
  const title = recipe.title ?? 'Nueva receta';
  const slug = slugify(title);
  const pubDate = new Date().toISOString().slice(0, 10);
  const author = opts?.author ?? 'El Cerito';

  const frontmatter: Record<string, unknown> = {
    title,
    ...(recipe.titleEn && { titleEn: recipe.titleEn }),
    description: recipe.description ?? '',
    ...(recipe.descriptionEn && { descriptionEn: recipe.descriptionEn }),
    coverImage: `/images/recipes/${slug}.jpg`,
    coverImageAlt: title,
    servings: recipe.servings ?? 4,
    servingLabel: recipe.servingLabel ?? 'porciones',
    ingredients: recipe.ingredients ?? [],
    macros: recipe.macros ?? { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    instructions: recipe.instructions ?? [],
    prepTime: recipe.prepTime ?? 0,
    cookTime: recipe.cookTime ?? 0,
    categories: recipe.categories ?? ['comida'],
    healthLabels: recipe.healthLabels ?? [],
    difficulty: recipe.difficulty ?? 'facil',
    ranchOriginal: recipe.ranchOriginal ?? false,
    pubDate,
    author,
    featured: false,
    draft: true,
  };

  const yaml = toYaml(frontmatter);
  const body = recipe.description ? `\n${recipe.description}\n` : '\n';
  return `---\n${yaml}---\n${body}`;
}

/**
 * Tiny YAML emitter — good enough for the fields we produce. Only handles
 * strings, numbers, booleans, arrays, and objects (one level deep beyond
 * arrays of objects, which covers `ingredients` and `macros`).
 */
function toYaml(obj: Record<string, unknown>, indent = 0): string {
  const pad = '  '.repeat(indent);
  let out = '';
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      if (v.length === 0) {
        out += `${pad}${k}: []\n`;
        continue;
      }
      out += `${pad}${k}:\n`;
      for (const item of v) {
        if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
          const entries = Object.entries(item as Record<string, unknown>).filter(
            ([, val]) => val !== undefined && val !== null,
          );
          if (entries.length === 0) {
            out += `${pad}  - {}\n`;
            continue;
          }
          const [firstKey, firstVal] = entries[0];
          out += `${pad}  - ${firstKey}: ${scalar(firstVal)}\n`;
          for (const [ck, cv] of entries.slice(1)) {
            out += `${pad}    ${ck}: ${scalar(cv)}\n`;
          }
        } else {
          out += `${pad}  - ${scalar(item)}\n`;
        }
      }
    } else if (v !== null && typeof v === 'object') {
      out += `${pad}${k}:\n`;
      out += toYaml(v as Record<string, unknown>, indent + 1);
    } else {
      out += `${pad}${k}: ${scalar(v)}\n`;
    }
  }
  return out;
}

function scalar(v: unknown): string {
  if (v === null || v === undefined) return '""';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  const s = String(v);
  // Quote if contains YAML-tricky chars
  if (/[:#\n\[\]{}&*!|>'"%@`,]/.test(s) || /^\s|\s$/.test(s) || s === '') {
    return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return s;
}
