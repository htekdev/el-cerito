import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { load } from 'js-yaml';
import { parse } from 'parse5';
import sharp from 'sharp';
import {
  categoryLabel, difficultyLabel, formatAmount, formatMinutes, healthLabel,
  niceRound, scaleFactor, totalTime,
} from '../src/lib/nutrition.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = await readFile(join(root, 'src', 'content', 'recipes', 'marranitos.md'), 'utf8');
const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
assert.ok(frontmatter, 'Recipe must contain YAML frontmatter and a Spanish body');
const recipe = load(frontmatter[1]);
const body = frontmatter[2];
const metrics = ['calories', 'protein', 'carbs', 'fat', 'fiber'];
const grams = [954, 300, 330, 168, 150, 12, 7.5, 15, 4.5, 40, 10];
// Generic USDA SR Legacy per-100-g estimates, independently specified from recipe totals.
const profiles = [
  [364, 10.33, 76.31, 0.98, 2.7],
  [387, 0, 99.8, 0, 0],
  [290, 0, 74.73, 0, 0],
  [717, 0.16, 0.7, 80.71, 0], // FDC 172346, generic margarine estimate only.
  [143, 12.56, 0.72, 9.51, 0],
  [288, 0.06, 12.65, 0.06, 0],
  [247, 3.99, 80.59, 1.24, 53.1],
  [0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0],
  [143, 12.56, 0.72, 9.51, 0],
  [0, 0, 0, 0, 0],
];
const batch = [7119.905, 122.98745, 1284.11265, 163.1112, 29.7405];
const names = [
  /all-purpose wheat flour/, /granulated sugar/, /^molasses$/, /^margarine$/,
  /shell-free egg for the dough/, /vanilla extract/, /ground cinnamon/,
  /baking soda/, /^salt$/, /beaten egg.*wash/, /water.*wash/,
];
const close = (actual, expected, message) => {
  assert.ok(Number.isFinite(actual), `${message}: must be finite`);
  assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: ${actual} != ${expected}`);
};
const normalize = (value) => value.replace(/\s+/g, ' ').trim();
const attr = (node, name) => node.attrs?.find((item) => item.name === name)?.value;
const text = (node) => (node.value ?? (node.childNodes ?? []).map(text).join(''));
const elements = (node, predicate) => [
  ...(predicate(node) ? [node] : []),
  ...(node.childNodes ?? []).flatMap((child) => elements(child, predicate)),
];
const hasClass = (node, name) => (attr(node, 'class') ?? '').split(/\s+/).includes(name);

test('source quantities are exact grams, in order, and only the paired wash is optional', () => {
  assert.equal(recipe.ingredients.length, 11);
  recipe.ingredients.forEach((ingredient, i) => {
    assert.match(ingredient.nameEn, names[i]);
    assert.equal(ingredient.amount, grams[i]);
    assert.equal(ingredient.unit, 'g');
    assert.equal(ingredient.optional, i >= 9);
  });
  assert.match(recipe.ingredients[4].noteEn, /without shells/);
  assert.match(recipe.ingredients[9].noteEn, /without shells/);
  assert.ok(!recipe.ingredients.some((ingredient) => /ginger|cloves|butter|lard|shortening/.test(ingredient.nameEn)));
  assert.equal(recipe.servings, 30);
  assert.equal(recipe.ranchOriginal, false);
  assert.equal(recipe.draft, false);
  assert.deepEqual(recipe.healthierAlternatives, []);
  assert.deepEqual(recipe.healthLabels, []);
  assert.equal(recipe.pubDate.toISOString(), '2026-10-29T00:00:00.000Z');
  assert.equal(recipe.updatedDate.toISOString(), '2026-10-30T00:00:00.000Z');
});

test('168 g margarine is the only default fat in bilingual ingredients, notes, descriptions, and prep', () => {
  const fat = recipe.ingredients[3];
  assert.equal(fat.name, 'margarina');
  assert.equal(fat.nameEn, 'margarine');
  assert.equal(fat.amount, 168);
  assert.equal(fat.unit, 'g');
  assert.equal(fat.optional, false);
  assert.equal(recipe.ingredients[1].note, 'para acremar con la margarina');
  assert.equal(recipe.ingredients[1].noteEn, 'for creaming with the margarine');
  assert.match(fat.note, /grasa base para acremar con el azúcar; marca desconocida/);
  assert.match(fat.noteEn, /default fat for creaming with the sugar; brand unknown/);
  assert.match(fat.note, /nutrición estimada con un perfil genérico; puede contener lácteos, revisa la etiqueta/);
  assert.match(fat.noteEn, /nutrition estimated from a generic profile; may contain dairy, check the label/);
  assert.match(recipe.description, /con margarina/);
  assert.match(recipe.descriptionEn, /made with margarine/);
  assert.equal(recipe.steps[0].title, 'Acremar la margarina y el azúcar');
  assert.equal(recipe.steps[0].titleEn, 'Cream the margarine and sugar');
  assert.equal(recipe.steps[0].text, 'Precalienta el horno a 177°C (350°F). Con una batidora de pedestal y el aditamento de pala, bate la margarina con el azúcar hasta que la mezcla esté ligera y cremosa.');
  assert.equal(recipe.steps[0].textEn, 'Preheat the oven to 177°C (350°F). Using a stand mixer fitted with the paddle attachment, beat the margarine and sugar until light and creamy.');
  const prep = [
    recipe.description, recipe.descriptionEn,
    ...recipe.ingredients.flatMap((ingredient) => [ingredient.name, ingredient.nameEn, ingredient.note, ingredient.noteEn]),
    ...recipe.steps.flatMap((step) => [step.title, step.titleEn, step.text, step.textEn]),
    ...recipe.instructions, ...recipe.instructionsEn,
  ].join(' ');
  assert.doesNotMatch(prep, /\b(?:butter|mantequilla|manteca|lard|shortening)\b/i);
  assert.doesNotMatch(source, /\b(?:manteca|lard|shortening|dairy[- ]free|sin lácteos|sin lactosa|vegan[oa]?)\b/i);
});

test('all authored copy has full natural English and Spanish counterparts', () => {
  for (const [es, en] of [
    [recipe.title, recipe.titleEn],
    [recipe.description, recipe.descriptionEn],
    [recipe.servingLabel, recipe.servingLabelEn],
    ...recipe.ingredients.flatMap((ingredient) => [
      [ingredient.name, ingredient.nameEn], [ingredient.note, ingredient.noteEn],
    ]),
    ...recipe.steps.flatMap((step) => [[step.title, step.titleEn], [step.text, step.textEn]]),
  ]) {
    assert.equal(typeof es, 'string');
    assert.equal(typeof en, 'string');
    assert.ok(es.trim().length > 2);
    assert.ok(en.trim().length > 2);
    assert.notEqual(es, en);
  }
  assert.ok(body.length > 2000, 'Spanish story must preserve the method and source notes');
  assert.ok(recipe.storyEn.length > 2000, 'English story must preserve the method and source notes');
  assert.ok(!/\bTODO\b|\bFIXME\b|translation pending|traducción pendiente/.test(source),
    'Recipe must not contain unfinished translation or implementation markers');
});

test('eight rich steps exactly mirror both flat instruction arrays and cover every ingredient', () => {
  assert.equal(recipe.steps.length, 8);
  assert.deepEqual(recipe.instructions, recipe.steps.map((step) => step.text));
  assert.deepEqual(recipe.instructionsEn, recipe.steps.map((step) => step.textEn));
  const refs = new Set();
  for (const step of recipe.steps) {
    for (const ingredient of step.ingredients) {
      if (typeof ingredient === 'number') {
        assert.ok(Number.isInteger(ingredient));
        assert.ok(ingredient >= 0 && ingredient < recipe.ingredients.length);
        refs.add(ingredient);
      } else {
        assert.ok(ingredient.label && ingredient.labelEn, 'Intermediate labels must be bilingual');
      }
    }
  }
  assert.deepEqual([...refs].sort((a, b) => a - b), grams.map((_, i) => i));
  assert.deepEqual(recipe.steps[0].ingredients, [3, 1]);
  assert.deepEqual(recipe.steps[1].ingredients, [4, 2, 5]);
  assert.deepEqual(recipe.steps[2].ingredients, [0, 6, 7, 8]);
  assert.deepEqual(recipe.steps[6].ingredients, [9, 10]);
});

test('method keeps the supplied technique, optional chill, and no invented rolling thickness', () => {
  const es = recipe.instructions.join(' ');
  const en = recipe.instructionsEn.join(' ');
  for (const pattern of [/pala/, /ligera y cremosa/, /otro tazón/, /batidor/, /velocidad baja/, /cohesiva/, /no la batas de más/, /Si la masa.*blanda/, /omite este reposo/, /grosor uniforme/, /cortador.*cochinito/, /pincela ligeramente/, /opcional/]) {
    assert.match(es, pattern);
  }
  for (const pattern of [/paddle/, /light and creamy/, /separate bowl/, /whisk/, /low speed/, /cohesive/, /do not overmix/, /If the dough is too soft/, /skip this rest/, /even thickness/, /pig-shaped cutter/, /lightly brush/, /optional/]) {
    assert.match(en, pattern);
  }
  assert.doesNotMatch(es + en, /\b\d+(?:[.,/]\d+)?\s*(?:mm|cm|inch|inches|pulgadas)\b/i);
});

test('time and yield ranges are preserved with a disclosed non-exact 30-portion reference', () => {
  assert.deepEqual([recipe.prepTime, recipe.cookTime, recipe.totalTime], [30, 12, 42]);
  for (const copy of [body, recipe.storyEn]) {
    for (const value of ['30–35', '20–30', '8–9', '10–12', '12–14', '14–16', '177°C', '350°F', '42']) {
      assert.ok(copy.includes(value), `Missing source range ${value}`);
    }
  }
  assert.match(body, /no una promesa de obtener exactamente 30 piezas/);
  assert.match(recipe.storyEn, /not a promise of exactly 30 cookies/);
  assert.match(body, /hornear varias tandas toma\s+tiempo adicional/);
  assert.match(recipe.storyEn, /extra batches take additional time/);
  assert.match(recipe.instructions[4], /20–30 minutos/);
  assert.match(recipe.instructionsEn[4], /20–30 minutes/);
});

test('texture temperature is never a safety guarantee or permission to serve raw centers', () => {
  const es = recipe.instructions.at(-1);
  const en = recipe.instructionsEn.at(-1);
  for (const value of ['190–192°F', '88–89°C', '8–9', '10–12', '12–14', '14–16']) {
    assert.ok(es.includes(value));
    assert.ok(en.includes(value));
  }
  assert.match(es, /centro haya cuajado/);
  assert.match(es, /continúa si aún hay masa cruda/);
  assert.match(es, /no garantiza la inocuidad/);
  assert.match(es, /No pruebes masa cruda/);
  assert.match(en, /centers are set/);
  assert.match(en, /continue baking if any raw dough remains/);
  assert.match(en, /not a safety guarantee/);
  assert.match(en, /Do not taste raw dough/);
  assert.match(es, /extremo corto.*más húmedo/);
  assert.match(en, /shorter end.*moister center/);
  assert.match(es, /suban.*se asienten/);
  assert.match(en, /rising.*settling slightly/);
});

test('both stories report only Hector’s observed batches, not a cause or interchangeable butter variation', () => {
  const esObservation = 'Hector observó que su tanda con mantequilla se aplanó y su tanda con margarina se esponjó.';
  const enObservation = 'Hector observed that his butter batch flattened and his margarine batch puffed up.';
  assert.ok(normalize(body).includes(esObservation));
  assert.ok(recipe.storyEn.includes(enObservation));
  assert.match(body, /Son solo observaciones de esas tandas; la causa no se ha probado/);
  assert.match(recipe.storyEn, /These are batch observations only; the cause has not been tested/);
  assert.match(body, /La margarina es la grasa base y conserva los mismos/);
  assert.match(recipe.storyEn, /Margarine is the default fat, keeping the same/);
  assert.doesNotMatch(normalize(body).replace(esObservation, ''), /mantequilla/i);
  assert.doesNotMatch(recipe.storyEn.replace(enObservation, ''), /butter/i);
  assert.doesNotMatch(body + recipe.storyEn, /\b(?:moisture|chew(?:y|iness)?|humedad|masticabilidad|emulsifiers?|emulsionantes?)\b/i);
  assert.match(body, /168 g/);
  assert.match(recipe.storyEn, /168 g/);
  assert.match(body, /puede contener lácteos; revisa la etiqueta/);
  assert.match(recipe.storyEn, /may contain dairy; check the label/);
  assert.match(body, /no especifica una duración de almacenamiento/);
  assert.match(recipe.storyEn, /specifies no storage duration/);
  assert.doesNotMatch(body + recipe.storyEn, /\b\d+\s*(?:días|days|semanas|weeks|horas|hours)\b/i);
});

test('every ingredient estimate matches its documented generic profile at the exact gram weight', () => {
  recipe.ingredients.forEach((ingredient, i) => {
    metrics.forEach((metric, j) => {
      close(ingredient[metric], grams[i] * profiles[i][j] / 100, `${ingredient.nameEn}: ${metric}`);
    });
  });
  for (const copy of [body, recipe.storyEn]) {
    assert.match(copy, /USDA FoodData Central/);
    assert.match(copy, /SR Legacy/);
    assert.ok(copy.includes('https://fdc.nal.usda.gov/food-search/?type=SR+Legacy'));
    assert.ok(copy.includes('https://fdc.nal.usda.gov/data-documentation.html'));
  }
});

test('generic margarine provenance is an estimate, never an actual brand, fat percentage, or salt claim', () => {
  for (const copy of [normalize(body), recipe.storyEn]) {
    for (const value of [
      'FDC 172346', 'Margarine, regular, 80% fat, composite, stick, with salt',
      'https://fdc.nal.usda.gov/food-details/172346/nutrients',
      'https://batchbase.com.au/usda-foods/172346',
      'https://fooddata.the50.store/ingredients/4610-margarine-regular-80-fat-composite-stick-with-salt',
      '80.71 g', '80.70 g',
    ]) {
      assert.ok(copy.includes(value), `Missing provenance ${value}`);
    }
    assert.doesNotMatch(copy, /variante con margarina|margarine variation|butter-based/);
  }
  assert.match(normalize(body), /Solo para el cálculo.*Es solo una estimación, no identifica ni recomienda un producto ni afirma el porcentaje de grasa o contenido de sal realmente usados; la marca es desconocida/);
  assert.match(recipe.storyEn, /For calculation only.*estimate only, not an identification or recommendation of a product, nor a claim about the fat percentage or salt content actually used; the brand is unknown/);
  assert.match(body, /Los decimales conservan el cálculo, no son precisión nutricional medida/);
  assert.match(recipe.storyEn, /Decimals preserve the calculation, not measured nutritional precision/);
  const comments = frontmatter[1].split(/\r?\n/).filter((line) => line.startsWith('#')).join('\n');
  assert.match(comments, /# 717, 0\.16, 0\.7, 80\.71, 0 — GENERIC ESTIMATE ONLY; brand\/product unknown/);
  assert.match(comments, /Batch totals: 7119\.905 kcal; P 122\.98745; C 1284\.11265; F 163\.1112; fiber 29\.7405 g/);
  assert.match(comments, /Margarine is the recipe's default fat at 168 g/);
  assert.doesNotMatch(comments, /butter|substitution|not included|124\.14665|1283\.03745|163\.7832/i);
});

test('per-serving nutrition reconciles to the full batch, including all optional wash', () => {
  metrics.forEach((metric, i) => {
    const sum = recipe.ingredients.reduce((value, ingredient) => value + ingredient[metric], 0);
    close(sum, batch[i], `${metric}: independent batch total`);
    close(recipe.macros[metric], sum / 30, `${metric}: per-serving division`);
    close(recipe.macros[metric] * 30, sum, `${metric}: full reconciliation`);
  });
  for (const copy of [body, recipe.storyEn]) {
    for (const value of ['40 g', '10 g', '57.2', '5.024', '0.288', '3.804']) {
      assert.ok(normalize(copy).includes(value), `Missing wash disclosure ${value}`);
    }
  }
  assert.match(body, /no descuenta automáticamente/);
  assert.match(recipe.storyEn, /does not automatically remove wash nutrition/);
  const withoutWash = recipe.ingredients.filter((ingredient) => !ingredient.optional);
  const noWashPerServing = [235.4235, 3.932115, 42.794155, 5.31024, 0.99135];
  metrics.forEach((metric, i) => {
    close(withoutWash.reduce((sum, ingredient) => sum + ingredient[metric], 0) / 30,
      noWashPerServing[i], `${metric}: wash omitted`);
  });
});

test('nutrition helpers scale this batch linearly and format the site time and labels', () => {
  for (const target of [1, 15, 30, 35, 50, 60]) {
    const factor = scaleFactor(recipe.servings, target);
    close(factor, target / 30, `scale to ${target}`);
    recipe.ingredients.forEach((ingredient, i) => {
      close(ingredient.amount * factor, grams[i] * target / 30, `grams ${i}`);
    });
    metrics.forEach((metric, i) => {
      const scaled = recipe.ingredients.reduce((sum, ingredient) => sum + ingredient[metric] * factor, 0);
      close(scaled, recipe.macros[metric] * target, `scaled ${metric}`);
      close(scaled, batch[i] * target / 30, `independent scaled ${metric}`);
    });
  }
  assert.equal(scaleFactor(0, 30), 1);
  assert.equal(scaleFactor(-1, 30), 1);
  assert.equal(formatAmount(954, 0.5), '477');
  assert.equal(formatAmount(7.5, 0.5), '3.8');
  assert.equal(niceRound(Infinity), 0);
  assert.equal(niceRound(recipe.macros.calories), 237);
  assert.equal(niceRound(recipe.macros.fiber), 1);
  assert.equal(totalTime(recipe.prepTime, recipe.cookTime, recipe.totalTime), 42);
  assert.equal(totalTime(recipe.prepTime, recipe.cookTime), 42);
  assert.equal(formatMinutes(recipe.totalTime), '42 min');
  assert.equal(formatMinutes(60), '1 h');
  assert.equal(formatMinutes(90), '1 h 30 min');
  assert.equal(categoryLabel(recipe.categories[0], 'es'), 'Postre');
  assert.equal(categoryLabel(recipe.categories[0], 'en'), 'Dessert');
  assert.equal(difficultyLabel(recipe.difficulty, 'es'), 'Media');
  assert.equal(difficultyLabel(recipe.difficulty, 'en'), 'Medium');
  assert.equal(healthLabel('vegetarian', 'es'), 'Vegetariano');
  assert.equal(healthLabel('vegetarian', 'en'), 'Vegetarian');
  for (const label of [categoryLabel, difficultyLabel, healthLabel]) {
    assert.equal(label('not-a-label', 'es'), 'not-a-label');
  }
});

test('cover is a nonempty 1200×900 JPEG and the build copies it unchanged', async () => {
  const image = await readFile(join(root, 'public', 'images', 'recipes', 'marranitos.jpg'));
  const metadata = await sharp(image).metadata();
  assert.equal(metadata.format, 'jpeg');
  assert.equal(metadata.width, 1200);
  assert.equal(metadata.height, 900);
  assert.ok(image.length > 20000, 'Cover must contain a real food photograph');
  assert.equal(recipe.coverImage, '/images/recipes/marranitos.jpg');
  assert.match(recipe.coverImageAlt, /[Mm]arranitos/);
  const builtImage = await readFile(join(root, 'dist', 'client', 'images', 'recipes', 'marranitos.jpg'));
  assert.ok(builtImage.equals(image), 'Built cover must match the source JPEG; rebuild after changing it');
});

for (const lang of ['es', 'en']) {
  const route = lang === 'es' ? ['recetas', 'marranitos'] : ['en', 'recipes', 'marranitos'];
  const suffix = lang === 'es' ? '' : 'En';
  const html = await readFile(join(root, 'dist', 'client', ...route, 'index.html'), 'utf8');
  const document = parse(html);
  const scripts = elements(document, (node) => node.tagName === 'script');
  const payload = JSON.parse(text(scripts.find((node) => attr(node, 'id') === 'recipe-data')));
  const structured = JSON.parse(text(scripts.find((node) => attr(node, 'type') === 'application/ld+json')));
  const content = normalize(text(document));

  test(`${lang}: built page has localized content, exact scaling data, and matching structured instructions`, () => {
    assert.equal(attr(elements(document, (node) => node.tagName === 'html')[0], 'lang'), lang);
    assert.equal(text(elements(document, (node) => node.tagName === 'h1')[0]), recipe[`title${suffix}`]);
    const description = elements(document, (node) => node.tagName === 'meta' && attr(node, 'name') === 'description')[0];
    assert.equal(attr(description, 'content'), recipe[`description${suffix}`]);
    assert.deepEqual(payload, {
      slug: 'marranitos', defaultServings: 30, macros: recipe.macros,
      ingredients: recipe.ingredients.map(({ amount, unit }) => ({ amount, unit })),
    });
    assert.equal(structured.inLanguage, lang === 'es' ? 'es-MX' : 'en-US');
    assert.equal(structured.name, recipe[`title${suffix}`]);
    assert.equal(structured.description, recipe[`description${suffix}`]);
    assert.equal(structured.recipeYield, `30 ${recipe[`servingLabel${suffix}`]}`);
    assert.equal(structured.totalTime, 'PT42M');
    assert.deepEqual(structured.recipeInstructions.map((step) => step.text), recipe[`instructions${suffix}`]);
    assert.equal(structured.recipeIngredient.length, grams.length);
    structured.recipeIngredient.forEach((ingredient, i) => {
      assert.equal(ingredient, `${grams[i]} g ${recipe.ingredients[i][`name${suffix}`]}`);
    });
    assert.deepEqual(structured.nutrition, {
      '@type': 'NutritionInformation',
      calories: `${recipe.macros.calories} kcal`,
      proteinContent: `${recipe.macros.protein} g`,
      carbohydrateContent: `${recipe.macros.carbs} g`,
      fatContent: `${recipe.macros.fat} g`,
      fiberContent: `${recipe.macros.fiber} g`,
    });
    assert.equal(structured.image, `https://el-cerito.vercel.app${recipe.coverImage}`);
    assert.ok(elements(document, (node) => node.tagName === 'img' && attr(node, 'src') === recipe.coverImage).length);
    for (const ingredient of recipe.ingredients) {
      assert.ok(content.includes(ingredient[`name${suffix}`]));
      assert.ok(content.includes(ingredient[`note${suffix}`]));
    }
    for (const step of recipe.steps) {
      assert.ok(content.includes(step[`title${suffix}`]));
      assert.ok(content.includes(step[`text${suffix}`]));
    }
    assert.ok(content.includes('30–35'));
    assert.ok(content.includes('190–192°F'));
    assert.ok(content.includes('SR Legacy'));
    assert.ok(content.includes('FDC 172346'));
    assert.ok(content.includes('57.2'));
    assert.ok(content.includes(lang === 'es' ? 'no descuenta automáticamente' : 'does not automatically remove wash nutrition'));
    if (lang === 'en') {
      for (const paragraph of recipe.storyEn.trim().split(/\n\s*\n/)) {
        assert.ok(content.includes(normalize(paragraph)), 'English story paragraph must render in full');
      }
      assert.ok(!content.includes(recipe.steps[0].text), 'English steps must not fall back to Spanish');
    } else {
      assert.ok(content.includes('No se estimaron azúcar ni sodio.'));
    }
  });

  test(`${lang}: rendered shopping and prep use only margarine with label-check and observation disclaimers`, () => {
    const fatName = lang === 'es' ? 'margarina' : 'margarine';
    const fatChips = elements(document, (node) => hasClass(node, 'ing-amount') && attr(node, 'data-idx') === '3');
    assert.equal(fatChips.length, 2, 'The main ingredient and creaming step must both reference margarine');
    for (const chip of fatChips) {
      let row = chip.parentNode;
      while (row && row.tagName !== 'li') row = row.parentNode;
      assert.ok(row);
      const copy = normalize(text(row));
      assert.ok(copy.includes(`168 g ${fatName}`));
      assert.doesNotMatch(copy, /\b(?:butter|mantequilla|manteca|lard|shortening)\b/i);
    }
    assert.ok(content.includes(recipe.ingredients[3][`note${suffix}`]));
    const grocery = elements(document, (node) => attr(node, 'id') === 'grocery-list')[0];
    assert.ok(grocery);
    const items = elements(grocery, (node) => hasClass(node, 'grocery-name')).map((node) => normalize(text(node)));
    assert.deepEqual(items.filter((copy) => copy.includes(fatName)), [`168 g ${fatName}`]);
    assert.doesNotMatch(text(grocery), /\b(?:butter|mantequilla|manteca|lard|shortening)\b/i);
    assert.equal(structured.recipeIngredient[3], `168 g ${fatName}`);
    assert.match(structured.recipeInstructions[0].text, lang === 'es' ? /bate la margarina con el azúcar/ : /beat the margarine and sugar/);
    assert.doesNotMatch(JSON.stringify(structured), /\b(?:butter|mantequilla|manteca|lard|shortening|dairy[- ]free|sin lácteos)\b/i);
    assert.ok(content.includes(lang === 'es' ? 'la causa no se ha probado' : 'the cause has not been tested'));
    assert.ok(content.includes(lang === 'es' ? 'puede contener lácteos' : 'may contain dairy'));
    assert.ok(content.includes(lang === 'es' ? 'la marca es desconocida' : 'the brand is unknown'));
    assert.doesNotMatch(content, /\b(?:dairy[- ]free|sin lácteos|sin lactosa)\b/i);
  });

  test(`${lang}: recipe listing carries the margarine description and recalculated nutrition`, async () => {
    const listing = parse(await readFile(join(root, 'dist', 'client', ...route.slice(0, -1), 'index.html'), 'utf8'));
    const cards = elements(listing, (node) => node.tagName === 'a'
      && attr(node, 'href') === `/${route.join('/')}`);
    assert.equal(cards.length, 1);
    const copy = normalize(text(cards[0]));
    assert.ok(copy.includes(recipe[`title${suffix}`]));
    assert.ok(copy.includes(recipe[`description${suffix}`]));
    assert.ok(copy.includes(`${recipe.macros.calories} kcal`));
    assert.ok(copy.includes(`${recipe.macros.protein} g`));
    assert.doesNotMatch(copy, /\b(?:butter|mantequilla|manteca|lard|shortening|dairy[- ]free|sin lácteos)\b/i);
  });

  test(`${lang}: built client script scales ingredient chips, grocery quantities, and totals at both limits`, () => {
    const ids = new Map();
    const groups = new Map();
    const adapt = (node) => ({
      textContent: text(node),
      dataset: Object.fromEntries((node.attrs ?? [])
        .filter((item) => item.name.startsWith('data-'))
        .map((item) => [item.name.slice(5), item.value])),
    });
    for (const id of ['recipe-data', 'serv-count', 'macro-serv', 'serv-minus', 'serv-plus']) {
      const node = adapt(elements(document, (item) => attr(item, 'id') === id)[0]);
      node.listeners = {};
      node.addEventListener = (name, callback) => { node.listeners[name] = callback; };
      ids.set(id, node);
    }
    for (const name of ['ing-amount', 'macro-total', 'grocery-amount']) {
      groups.set(`.${name}`, elements(document, (node) => hasClass(node, name)).map(adapt));
    }
    const margarineGrocery = groups.get('.grocery-amount').filter((node) => Number(node.dataset.base) === 168);
    assert.equal(margarineGrocery.length, 1);
    const margarineAmounts = new Map([[30, '168'], [15, '84'], [1, '5.6'], [50, '280']]);
    assert.equal(groups.get('.macro-total').length, metrics.length);
    grams.forEach((_, i) => {
      assert.equal(groups.get('.ing-amount').filter((node) => Number(node.dataset.idx) === i).length, 2);
    });
    const scaling = scripts.filter((node) => attr(node, 'type') === 'module'
      && /getElementById\(["']recipe-data["']\)/.test(text(node)));
    assert.equal(scaling.length, 1, 'Must exercise the actual built scaling script');
    runInNewContext(text(scaling[0]), {
      document: {
        getElementById: (id) => ids.get(id) ?? null,
        querySelectorAll: (selector) => groups.get(selector) ?? [],
      },
    }, { timeout: 1000 });
    const click = (id) => ids.get(id).listeners.click();
    for (const target of [30, 15, 1, 50]) {
      while (Number(ids.get('serv-count').textContent) > target) click('serv-minus');
      while (Number(ids.get('serv-count').textContent) < target) click('serv-plus');
      assert.equal(Number(ids.get('macro-serv').textContent), target);
      for (const node of groups.get('.ing-amount')) {
        assert.equal(node.textContent, formatAmount(grams[Number(node.dataset.idx)], target / 30));
      }
      for (const node of groups.get('.grocery-amount')) {
        assert.equal(node.textContent, formatAmount(Number(node.dataset.base), target / 30));
      }
      assert.equal(margarineGrocery[0].textContent, margarineAmounts.get(target));
      for (const node of groups.get('.ing-amount').filter((node) => Number(node.dataset.idx) === 3)) {
        assert.equal(node.textContent, margarineAmounts.get(target));
      }
      for (const node of groups.get('.macro-total')) {
        assert.equal(Number(node.textContent), niceRound(recipe.macros[node.dataset.key] * target));
      }
      if (target === 1) {
        click('serv-minus');
        assert.equal(ids.get('serv-count').textContent, '1');
      }
    }
    click('serv-plus');
    assert.equal(ids.get('serv-count').textContent, '50');
  });
}
