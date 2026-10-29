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
  [717, 0.85, 0.06, 81.11, 0],
  [143, 12.56, 0.72, 9.51, 0],
  [288, 0.06, 12.65, 0.06, 0],
  [247, 3.99, 80.59, 1.24, 53.1],
  [0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0],
  [143, 12.56, 0.72, 9.51, 0],
  [0, 0, 0, 0, 0],
];
const batch = [7119.905, 124.14665, 1283.03745, 163.7832, 29.7405];
const names = [
  /all-purpose wheat flour/, /granulated sugar/, /^molasses$/, /unsalted butter/,
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
  assert.match(recipe.ingredients[3].noteEn, /instead of butter, never both/);
  assert.ok(!recipe.ingredients.some((ingredient) => /ginger|cloves|margarine/.test(ingredient.nameEn)));
  assert.equal(recipe.servings, 30);
  assert.equal(recipe.ranchOriginal, false);
  assert.equal(recipe.draft, false);
  assert.deepEqual(recipe.healthierAlternatives, []);
  assert.deepEqual(recipe.healthLabels, []);
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

test('both stories preserve the margarine preference and undated refrigerated make-ahead option', () => {
  assert.match(body, /tandas anteriores se\s+prefirió la textura con margarina/);
  assert.match(recipe.storyEn, /Earlier margarine batches had the preferred texture/);
  assert.match(body, /168 g/);
  assert.match(recipe.storyEn, /168 g/);
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
  assert.match(body, /variante con margarina no está incluida/);
  assert.match(recipe.storyEn, /margarine variation is not included/);
  const withoutWash = recipe.ingredients.filter((ingredient) => !ingredient.optional);
  const noWashPerServing = [235.4235, 3.970755, 42.758315, 5.33264, 0.99135];
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
    assert.equal(structured.recipeYield, `30 ${recipe[`servingLabel${suffix}`]}`);
    assert.equal(structured.totalTime, 'PT42M');
    assert.deepEqual(structured.recipeInstructions.map((step) => step.text), recipe[`instructions${suffix}`]);
    assert.equal(structured.recipeIngredient.length, grams.length);
    structured.recipeIngredient.forEach((ingredient, i) => {
      assert.equal(ingredient, `${grams[i]} g ${recipe.ingredients[i][`name${suffix}`]}`);
    });
    assert.equal(structured.nutrition.calories, `${recipe.macros.calories} kcal`);
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
