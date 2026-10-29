import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import test from 'node:test';
import { load } from 'js-yaml';
import { parse } from 'parse5';
import sharp from 'sharp';

const root = fileURLToPath(new URL('..', import.meta.url));
const slug = 'mini-conchas-tangzhong';
const source = await readFile(join(root, 'src', 'content', 'recipes', `${slug}.md`), 'utf8');
const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
assert.ok(frontmatter, 'Recipe must contain YAML frontmatter and a Spanish body');
const recipe = load(frontmatter[1]);
const body = frontmatter[2];
const artifact = await readFile(join(root, 'docs', 'nutrition', `${slug}.md`), 'utf8');
const metrics = ['calories', 'protein', 'carbs', 'fat', 'fiber'];
const grams = [40, 200, 712.5, 200, 120, 100, 90, 10, 10, 14, 158, 153, 153, 14, 1];
// Generic USDA SR Legacy per-100-g estimates, specified independently of the recipe values.
const profiles = {
  bread: [361, 12, 72.53, 1.66, 2.4],
  milk: [61, 3.15, 4.78, 3.27, 0],
  sugar: [387, 0, 99.8, 0, 0],
  egg: [143, 12.56, 0.72, 9.51, 0],
  butter: [717, 0.85, 0.06, 81.11, 0],
  vanilla: [288, 0.06, 12.65, 0.06, 0],
  salt: [0, 0, 0, 0, 0],
  yeast: [325, 40.44, 41.22, 7.61, 26.9],
  ap: [364, 10.33, 76.31, 0.98, 2.7],
  powdered: [389, 0, 99.77, 0.06, 0],
  shortening: [884, 0, 0, 100, 0],
};
const order = ['bread', 'milk', 'bread', 'milk', 'sugar', 'egg', 'butter', 'vanilla', 'salt',
  'yeast', 'ap', 'powdered', 'shortening', 'vanilla', 'salt'];
const batch = [6850.655, 138.2224, 967.46695, 263.8005, 26.092];
const close = (actual, expected, message) => {
  assert.ok(Number.isFinite(actual), `${message}: must be finite`);
  assert.ok(Math.abs(actual - expected) < 1e-6, `${message}: ${actual} != ${expected}`);
};
const normalize = (value) => value.replace(/\s+/g, ' ').trim();
const attr = (node, name) => node.attrs?.find((item) => item.name === name)?.value;
const text = (node) => (node.value ?? (node.childNodes ?? []).map(text).join(''));
const elements = (node, predicate) => [
  ...(predicate(node) ? [node] : []),
  ...(node.childNodes ?? []).flatMap((child) => elements(child, predicate)),
];

test('exact source weights are preserved, grams-only, and no invented optional coloring ingredient', () => {
  assert.equal(recipe.ingredients.length, 15);
  recipe.ingredients.forEach((ingredient, i) => {
    assert.equal(ingredient.amount, grams[i], `ingredient ${i}`);
    assert.equal(ingredient.unit, 'g');
    assert.equal(ingredient.optional, false);
  });
  const sum = (from, to) => grams.slice(from, to).reduce((a, b) => a + b, 0);
  assert.equal(sum(0, 2), 240, 'tangzhong raw input');
  assert.equal(sum(2, 10), 1256.5, 'dough without the prepared paste');
  assert.equal(sum(2, 10) + 200, 1456.5, 'dough with 200 g prepared paste');
  assert.equal(sum(10, 15), 479, 'shell');
  assert.equal(40 * 35, 1400);
  assert.equal(1456.5 - 1400, 56.5);
  assert.equal(40 * 11, 440);
  assert.equal(479 - 440, 39);
  assert.ok(!recipe.ingredients.some((i) => /cocoa|cacao|colorante|coloring|food color/i.test(`${i.name} ${i.nameEn}`)));
  assert.ok(!JSON.stringify(recipe.ingredients).includes('to taste'));
  assert.equal(recipe.servings, 40);
  assert.deepEqual(recipe.healthierAlternatives, []);
  assert.deepEqual(recipe.healthLabels, []);
  assert.equal(recipe.ranchOriginal, false);
  assert.equal(recipe.draft, false);
});

test('times are active prep 50 and oven 13 with no overridden total', () => {
  assert.equal(recipe.prepTime, 50);
  assert.equal(recipe.cookTime, 13);
  assert.equal(recipe.totalTime, undefined);
  for (const copy of [body, recipe.storyEn]) {
    for (const value of ['40–60', '60–90', '45–60', '13', '177°C', '350°F']) {
      assert.ok(copy.includes(value), `Missing ${value}`);
    }
  }
  assert.match(body, /tiempo total de espera varía/);
  assert.match(recipe.storyEn, /total waiting time varies/);
  assert.match(body, /no incluye los levados/);
  assert.match(recipe.storyEn, /excludes the rises/);
});

test('source discrepancies and surplus are disclosed in both languages', () => {
  for (const copy of [body, recipe.storyEn]) {
    for (const value of ['240', '200 g', '1,456.5', '1,400', '56.5', '479', '450', '440', '39']) {
      assert.ok(copy.includes(value), `Missing ${value}`);
    }
  }
  assert.match(body, /no garantiza que la evaporación deje exactamente 200 g/);
  assert.match(recipe.storyEn, /does not guarantee that evaporation leaves exactly 200 g/);
  assert.match(body, /no inventan|no se inventan/);
  assert.match(recipe.storyEn, /none are invented/);
  assert.match(body, /sobra pasta sin usar, la nutrición puede sobrestimar/);
  assert.match(recipe.storyEn, /nutrition may overestimate/);
  assert.match(body, /no son la nutrición exacta de una pieza/);
  assert.match(recipe.storyEn, /not the exact nutrition of one 35 g plus 11 g piece/);
  assert.doesNotMatch(source, /\b\d+\s*(?:días|days|semanas|weeks)\b/i);
});

test('all authored copy has full natural English and Spanish counterparts', () => {
  for (const [es, en] of [
    [recipe.title, recipe.titleEn],
    [recipe.description, recipe.descriptionEn],
    [recipe.servingLabel, recipe.servingLabelEn],
    ...recipe.ingredients.flatMap((i) => [[i.name, i.nameEn], [i.note, i.noteEn]]),
    ...recipe.steps.flatMap((s) => [[s.title, s.titleEn], [s.text, s.textEn]]),
  ]) {
    assert.equal(typeof es, 'string');
    assert.equal(typeof en, 'string');
    assert.ok(es.trim().length > 2 && en.trim().length > 2);
    assert.notEqual(es, en);
  }
  assert.ok(body.length > 2500);
  assert.ok(recipe.storyEn.length > 2500);
  assert.ok(!/\bTODO\b|\bFIXME\b|translation pending|traducción pendiente/.test(source));
  assert.doesNotMatch(recipe.storyEn, /^\s*(?:#|- |\*\*)/m, 'English story renders as plain paragraphs');
});

test('eight steps mirror the flat instructions and reference every ingredient once or more', () => {
  assert.equal(recipe.steps.length, 8);
  assert.deepEqual(recipe.instructions, recipe.steps.map((s) => s.text));
  assert.deepEqual(recipe.instructionsEn, recipe.steps.map((s) => s.textEn));
  const refs = [];
  for (const step of recipe.steps) {
    for (const item of step.ingredients) {
      if (typeof item === 'number') {
        assert.ok(item >= 0 && item < recipe.ingredients.length);
        refs.push(item);
      } else {
        assert.ok(item.label && item.labelEn, 'Intermediate chips must be bilingual');
      }
    }
  }
  assert.deepEqual([...new Set(refs)].sort((a, b) => a - b), grams.map((_, i) => i));
  assert.equal(refs.length, grams.length, 'each ingredient appears in exactly one step');
  assert.deepEqual(recipe.steps[0].ingredients, [0, 1]);
  assert.deepEqual(recipe.steps[1].ingredients.filter((i) => typeof i === 'number'), [2, 3, 4, 5, 7, 8, 9]);
  assert.ok(!recipe.steps[1].ingredients.includes(6), 'butter is added after the shaggy stage');
  assert.deepEqual(recipe.steps[2].ingredients[0], 6);
  assert.deepEqual(recipe.steps[4].ingredients, [12, 11, 13, 14, 10]);
  const paste = recipe.steps[1].ingredients.find((i) => i.label);
  assert.match(paste.labelEn, /cooled prepared tangzhong/);
  assert.match(paste.amountLabelEn, /200 g/);
});

test('method preserves the supplied temperatures, rises, weights, and bake', () => {
  const es = recipe.instructions.join(' ');
  const en = recipe.instructionsEn.join(' ');
  for (const pattern of [/fría/, /fuego medio-bajo/, /65°C \(149°F\)/, /pudín/, /cubre la superficie/, /por completo/, /excepto la mantequilla/, /shaggy/, /suave y elástica/, /60–90 minutos/, /manteca vegetal.*azúcar glas.*vainilla.*sal/, /al final la harina/, /tapada/, /35 g/, /11 g/, /con suavidad/, /45–60 minutos/, /de más/, /177°C \(350°F\)/, /13 minutos/, /dorado ligero/]) {
    assert.match(es, pattern);
  }
  for (const pattern of [/cold milk/, /medium-low/, /65°C \(149°F\)/, /pudding/, /cover the surface/, /completely/, /except the butter/, /shaggy/, /smooth and elastic/, /60–90 minutes/, /shortening, powdered sugar, vanilla, and salt/, /flour last/, /covered/, /35 g/, /11 g/, /gently/, /45–60 minutes/, /overproof/, /177°C \(350°F\)/, /13 minutes/, /lightly golden/]) {
    assert.match(en, pattern);
  }
  assert.doesNotMatch(es + en, /\b\d+(?:[.,/]\d+)?\s*(?:mm|cm|inch|inches|pulgadas)\b/i);
  assert.doesNotMatch(es + en, /cacao|cocoa|\b1 g (?:de )?(?:colorante|coloring)/i);
});

test('every ingredient estimate matches its documented generic profile at the exact gram weight', () => {
  recipe.ingredients.forEach((ingredient, i) => {
    metrics.forEach((metric, j) => {
      close(ingredient[metric], grams[i] * profiles[order[i]][j] / 100, `${ingredient.nameEn}: ${metric}`);
    });
  });
  for (const copy of [body, recipe.storyEn, artifact]) {
    assert.match(copy, /SR Legacy/);
    assert.ok(copy.includes('https://fdc.nal.usda.gov/food-search/?type=SR+Legacy'));
    assert.ok(copy.includes('https://fdc.nal.usda.gov/data-documentation.html'));
  }
});

test('tangzhong is counted once and per-serving nutrition reconciles to the full 40-serving batch', () => {
  metrics.forEach((metric, i) => {
    const total = recipe.ingredients.reduce((value, ingredient) => value + ingredient[metric], 0);
    close(total, batch[i], `${metric}: batch total`);
    close(recipe.macros[metric], total / 40, `${metric}: per-serving division`);
    close(recipe.macros[metric] * 40, total, `${metric}: full reconciliation`);
  });
  assert.ok(!recipe.ingredients.some((i) => /pasta|paste/i.test(`${i.name} ${i.nameEn}`) && i.calories > 0),
    'prepared paste must not be a second nutrient-counted entry');
  assert.ok(recipe.ingredients.reduce((s, i) => s + i.amount, 0) === 1975.5);
  for (const value of ['6850.655', '171.266375', '1,975.5', '240 g', 'counted once']) {
    assert.ok(artifact.includes(value), `Artifact must include ${value}`);
  }
  for (const value of ['40 g', '200 g', '1,456.5', '479']) {
    assert.ok(artifact.includes(value));
  }
  assert.match(artifact, /overestimates/);
  assert.match(body, /Si sobra pasta sin usar/);
  assert.match(body, /No se estimaron azúcar ni sodio/);
  assert.match(recipe.storyEn, /Sugar and sodium were not estimated/);
});

test('existing recipes are not replaced and the new slug is unique', async () => {
  const files = await readdir(join(root, 'src', 'content', 'recipes'));
  assert.equal(files.filter((f) => f === `${slug}.md`).length, 1);
  assert.ok(files.includes('marranitos.md'), 'marranitos must be preserved');
  assert.ok(!files.some((f) => f !== `${slug}.md` && /concha/.test(f)));
});

test('cover is a nonempty 1200×900 JPEG and the build copies it unchanged', async () => {
  const image = await readFile(join(root, 'public', 'images', 'recipes', `${slug}.jpg`));
  const metadata = await sharp(image).metadata();
  assert.equal(metadata.format, 'jpeg');
  assert.equal(metadata.width, 1200);
  assert.equal(metadata.height, 900);
  assert.ok(image.length > 50000, 'Cover must contain a real food photograph');
  assert.equal(recipe.coverImage, `/images/recipes/${slug}.jpg`);
  assert.match(recipe.coverImageAlt, /conchas/);
  const built = await readFile(join(root, 'dist', 'client', 'images', 'recipes', `${slug}.jpg`));
  assert.ok(built.equals(image), 'Built cover must match the source JPEG; rebuild after changing it');
});

for (const lang of ['es', 'en']) {
  const route = lang === 'es' ? ['recetas', slug] : ['en', 'recipes', slug];
  const suffix = lang === 'es' ? '' : 'En';
  test(`${lang}: built page renders localized content, scaling data, and structured data`, async () => {
    const html = await readFile(join(root, 'dist', 'client', ...route, 'index.html'), 'utf8');
    const document = parse(html);
    const scripts = elements(document, (node) => node.tagName === 'script');
    const payload = JSON.parse(text(scripts.find((n) => attr(n, 'id') === 'recipe-data')));
    const structured = JSON.parse(text(scripts.find((n) => attr(n, 'type') === 'application/ld+json')));
    const content = normalize(text(document));
    assert.equal(text(elements(document, (n) => n.tagName === 'h1')[0]), recipe[`title${suffix}`]);
    assert.deepEqual(payload, {
      slug, defaultServings: 40, macros: recipe.macros,
      ingredients: recipe.ingredients.map(({ amount, unit }) => ({ amount, unit })),
    });
    assert.equal(structured.name, recipe[`title${suffix}`]);
    assert.equal(structured.recipeYield, `40 ${recipe[`servingLabel${suffix}`]}`);
    assert.deepEqual(structured.recipeInstructions.map((s) => s.text), recipe[`instructions${suffix}`]);
    assert.equal(structured.recipeIngredient.length, grams.length);
    structured.recipeIngredient.forEach((ingredient, i) => {
      assert.equal(ingredient, `${grams[i]} g ${recipe.ingredients[i][`name${suffix}`]}`);
    });
    assert.equal(structured.nutrition.calories, `${recipe.macros.calories} kcal`);
    for (const ingredient of recipe.ingredients) {
      assert.ok(content.includes(ingredient[`name${suffix}`]));
      assert.ok(content.includes(ingredient[`note${suffix}`]));
    }
    for (const step of recipe.steps) {
      assert.ok(content.includes(step[`title${suffix}`]));
      assert.ok(content.includes(step[`text${suffix}`]));
    }
    assert.ok(content.includes('SR Legacy'));
    assert.ok(content.includes('1,456.5'));
    if (lang === 'en') {
      for (const paragraph of recipe.storyEn.trim().split(/\n\s*\n/)) {
        assert.ok(content.includes(normalize(paragraph)), 'English story paragraph must render in full');
      }
    }
  });
}
