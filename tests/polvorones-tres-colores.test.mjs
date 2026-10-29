import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { load } from 'js-yaml';
import { parse } from 'parse5';
import sharp from 'sharp';
import { formatAmount, niceRound, scaleFactor } from '../src/lib/nutrition.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const slug = 'polvorones-tres-colores';
const source = await readFile(join(root, 'src', 'content', 'recipes', `${slug}.md`), 'utf8');
const [, yaml, body] = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
const recipe = load(yaml);
const metrics = ['calories', 'protein', 'carbs', 'fat', 'fiber'];
const weights = [1000, 500, 400, 200, 16, 6, 40, null, null, 1.7];
// Independently specified generic SR Legacy profiles, not derived from authored totals.
const profiles = [
  [364, 10.33, 76.31, 0.98, 2.7], [884, 0, 0, 99.97, 0],
  [387, 0, 99.8, 0, 0], [143, 12.56, 0.72, 9.51, 0],
  [53, 0, 27.7, 0, 0], [0, 0, 0, 0, 0], [288, 0.06, 12.65, 0.06, 0],
  null, null, [228, 19.6, 57.9, 13.7, 37],
];
const batch = [10021.556, 128.7772, 1174.2163, 528.9269, 27.629];
const close = (actual, expected) => assert.ok(Number.isFinite(actual)
  && Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
const normalize = (value) => value.replace(/\s+/g, ' ').trim();
const attr = (node, name) => node.attrs?.find((item) => item.name === name)?.value;
const text = (node) => node.value ?? (node.childNodes ?? []).map(text).join('');
const elements = (node, predicate) => [
  ...(predicate(node) ? [node] : []),
  ...(node.childNodes ?? []).flatMap((child) => elements(child, predicate)),
];
const hasClass = (node, name) => (attr(node, 'class') ?? '').split(/\s+/).includes(name);

test('source gram weights, egg approximation, unused milk, and unweighed coloring sentinels', () => {
  assert.equal(recipe.ingredients.length, 10);
  recipe.ingredients.forEach((ingredient, i) => {
    if (weights[i] === null) {
      assert.equal(ingredient.unit, 'to taste');
      assert.equal(ingredient.amount, 1);
      assert.match(ingredient.note, /sin pesar, según sea necesario/);
      assert.match(ingredient.noteEn, /unweighed, as needed/);
      metrics.forEach((key) => assert.equal(ingredient[key], undefined));
    } else {
      assert.equal(ingredient.unit, 'g');
      assert.equal(ingredient.amount, weights[i]);
    }
    assert.equal(ingredient.optional, false);
  });
  assert.match(recipe.ingredients[3].note, /aproximadamente 4 huevos grandes/);
  assert.match(recipe.ingredients[3].noteEn, /about 4 large eggs/);
  assert.ok(!recipe.ingredients.some((i) => /milk|strawberry|leche|fresa/i.test(i.name + i.nameEn)));
  assert.equal(recipe.draft, false);
  assert.equal(recipe.ranchOriginal, false);
  assert.deepEqual(recipe.healthierAlternatives, []);
  assert.deepEqual(recipe.healthLabels, []);
  assert.equal(recipe.servings, 35);
});

test('bilingual names, notes, story and step four retain converted, unweighed cocoa uncertainty', () => {
  const cocoa = recipe.ingredients[9];
  for (const copy of [cocoa.name, cocoa.note, recipe.steps[3].text, body]) {
    assert.match(copy, /aprox\. 1\.7 g/);
    assert.match(copy, /sin pesar/);
    assert.match(copy, /no (?:una medición\s+ni )?gramos registrados/);
  }
  for (const copy of [cocoa.nameEn, cocoa.noteEn, recipe.steps[3].textEn, recipe.storyEn]) {
    assert.match(copy, /approx\. 1\.7 g/);
    assert.match(copy, /unweighed/);
    assert.match(copy, /not (?:a measured or )?recorded gram/);
  }
  assert.match(recipe.steps[3].text, /solo al tercio de chocolate/);
  assert.match(recipe.steps[3].textEn, /only to the chocolate third/);
  assert.match(recipe.storyEn, /NOT a claim that Hershey cocoa was used/);
  assert.match(body, /NO una afirmación de que se usó\s+cocoa Hershey/);
  for (const copy of [body, recipe.storyEn]) {
    assert.match(copy, /5 ÷ 3 = 1\.666… g/);
    assert.ok(copy.includes('https://smartlabel.hersheys.com/034000052134/nutrition'));
    assert.match(copy, /USDA FoodData Central/);
    assert.match(copy, /SR Legacy/);
    for (const url of ['https://fdc.nal.usda.gov/food-search/?type=SR+Legacy',
      'https://fdc.nal.usda.gov/data-documentation.html',
      'https://fooddata.the50.store/ingredients/19165-cocoa-dry-powder-unsweetened']) {
      assert.ok(copy.includes(url));
    }
  }
});

test('six bilingual rich steps mirror flat arrays, with exact ingredient references and intermediates', () => {
  assert.equal(recipe.steps.length, 6);
  assert.deepEqual(recipe.instructions, recipe.steps.map((step) => step.text));
  assert.deepEqual(recipe.instructionsEn, recipe.steps.map((step) => step.textEn));
  const refs = recipe.steps.map((step) => step.ingredients.filter(Number.isInteger));
  assert.deepEqual(refs, [[1, 2], [3, 6], [0, 4, 5], [7, 8, 9], [], []]);
  assert.deepEqual(refs.flat().sort((a, b) => a - b), weights.map((_, i) => i));
  for (const step of recipe.steps) {
    for (const item of step.ingredients.filter((i) => typeof i === 'object')) {
      assert.ok(item.label && item.labelEn);
    }
  }
  for (const [es, en] of [
    [recipe.title, recipe.titleEn], [recipe.description, recipe.descriptionEn],
    [recipe.servingLabel, recipe.servingLabelEn],
    ...recipe.ingredients.flatMap((i) => [[i.name, i.nameEn], [i.note, i.noteEn]]),
    ...recipe.steps.flatMap((s) => [[s.title, s.titleEn], [s.text, s.textEn]]),
  ]) {
    assert.ok(es?.length > 2 && en?.length > 2);
    assert.notEqual(es, en);
  }
});

test('source observations remain discrepant, yield approximate, and nutrition not a baked-weight claim', () => {
  assert.equal(weights.slice(0, 7).reduce((a, b) => a + b), 2162);
  assert.equal(2162 - 2138, 24);
  for (const copy of [body, recipe.storyEn]) {
    for (const n of ['2162 g', '2138 g', '713 g', '24 g', '2163.7 g',
      '35', '60 g', '45–60 g', '25–30', '15–20', '13–17', '10–12',
      '177°C', '350°F', '195–200°F', '91–93°C', '0 g', '20 g', '40 g', '1/35']) {
      assert.ok(copy.includes(n), `Missing preserved observation ${n}`);
    }
  }
  assert.match(body, /sin tratarla como una pérdida medida ni conciliarla con cocoa/);
  assert.match(recipe.storyEn, /not treated as a measured loss or reconciled using cocoa/);
  assert.match(body, /no un peso horneado garantizado de 60 g/);
  assert.match(recipe.storyEn, /not a guaranteed 60 g baked weight/);
  assert.deepEqual([recipe.prepTime, recipe.cookTime, recipe.totalTime], [30, 17, 47]);
  assert.match(recipe.instructions[0], /pala/);
  assert.match(recipe.instructionsEn[0], /paddle/);
  assert.match(recipe.instructions[2], /otro recipiente.*batidor/);
  assert.match(recipe.instructionsEn[2], /separate bowl.*whisk/);
  assert.match(recipe.instructions[5], /No voltees.*centros cocidos.*no una garantía de inocuidad.*No pruebes masa cruda/);
  assert.match(recipe.instructionsEn[5], /Do not flip.*cooked centers.*not a safety guarantee.*Do not taste raw dough/);
  assert.doesNotMatch(recipe.instructions.join(' ') + recipe.instructionsEn.join(' '),
    /\b\d+(?:[.,]\d+)?\s*(?:tsp|tbsp|cups?|ml|kg|oz|cucharaditas?|cucharadas?)\b/i);
});

test('per-ingredient profiles and per-serving sums include cocoa once and exclude unknown colorings', () => {
  recipe.ingredients.forEach((ingredient, i) => {
    if (profiles[i]) metrics.forEach((key, j) => close(ingredient[key], weights[i] * profiles[i][j] / 100));
  });
  metrics.forEach((key, j) => {
    const sum = recipe.ingredients.reduce((s, i) => s + (i[key] ?? 0), 0);
    close(sum, batch[j]);
    close(recipe.macros[key], batch[j] / 35);
    for (const target of [1, 17, 35, 50, 70]) {
      const factor = scaleFactor(35, target);
      close(sum * factor, recipe.macros[key] * target);
    }
  });
  assert.equal(recipe.macros.sugar, undefined);
  assert.equal(recipe.macros.sodium, undefined);
  assert.match(body, /excluidos de la nutrición/);
  assert.match(recipe.storyEn, /excluded from nutrition, not assumed calorie-free/);
  for (const copy of [body, recipe.storyEn]) {
    for (const n of [...batch.map(String), '3.876', '0.3332', '0.9843', '0.2329', '0.629']) {
      assert.ok(copy.includes(n), `Missing public arithmetic ${n}`);
    }
  }
});

test('editorial status resolves the old blocker while retaining the historical missing cocoa weight', async () => {
  const doc = await readFile(join(root, 'docs', 'recipe-drafts', `${slug}.md`), 'utf8');
  assert.match(doc, /PREPARED FOR PUBLICATION/);
  assert.match(doc, /original cocoa was not weighed or recorded/);
  assert.match(doc, /I don't know, I just did like a teaspoon/);
  assert.doesNotMatch(doc, /UNPUBLISHED \/ BLOCKED|publication is blocked|blocks publication|confirm grams before publication/);
});

test('existing cover stays a 1200×900 JPEG and is copied unchanged to the build', async () => {
  const image = await readFile(join(root, 'public', 'images', 'recipes', `${slug}.jpg`));
  const metadata = await sharp(image).metadata();
  assert.deepEqual([metadata.format, metadata.width, metadata.height], ['jpeg', 1200, 900]);
  assert.ok(image.length > 20000);
  assert.ok(image.equals(await readFile(join(root, 'dist', 'client', 'images', 'recipes', `${slug}.jpg`))));
});

for (const lang of ['es', 'en']) {
  const suffix = lang === 'es' ? '' : 'En';
  const route = lang === 'es' ? ['recetas', slug] : ['en', 'recipes', slug];
  const html = await readFile(join(root, 'dist', 'client', ...route, 'index.html'), 'utf8');
  const document = parse(html);
  const scripts = elements(document, (n) => n.tagName === 'script');
  const payload = JSON.parse(text(scripts.find((n) => attr(n, 'id') === 'recipe-data')));
  const structured = JSON.parse(text(scripts.find((n) => attr(n, 'type') === 'application/ld+json')));
  const content = normalize(text(document));

  test(`${lang}: built route, localized story, JSON-LD and scaling payload retain exact recipe data`, () => {
    assert.equal(attr(elements(document, (n) => n.tagName === 'html')[0], 'lang'), lang);
    assert.equal(text(elements(document, (n) => n.tagName === 'h1')[0]), recipe[`title${suffix}`]);
    assert.equal(structured.name, recipe[`title${suffix}`]);
    assert.equal(structured.inLanguage, lang === 'es' ? 'es-MX' : 'en-US');
    assert.equal(structured.recipeYield, `35 ${recipe[`servingLabel${suffix}`]}`);
    assert.equal(structured.totalTime, 'PT47M');
    assert.equal(structured.nutrition.calories, `${recipe.macros.calories} kcal`);
    assert.deepEqual(structured.recipeInstructions.map((s) => s.text), recipe[`instructions${suffix}`]);
    assert.deepEqual(payload, {
      slug, defaultServings: 35, macros: recipe.macros,
      ingredients: recipe.ingredients.map(({ amount, unit }) => ({ amount, unit })),
    });
    structured.recipeIngredient.forEach((value, i) => {
      const ing = recipe.ingredients[i];
      assert.equal(value, ing.unit === 'to taste'
        ? `${ing[`name${suffix}`]} (${lang === 'es' ? 'al gusto' : 'to taste'})`
        : `${ing.amount} g ${ing[`name${suffix}`]}`);
    });
    assert.equal(structured.image, `https://el-cerito.vercel.app${recipe.coverImage}`);
    for (const ing of recipe.ingredients) {
      assert.ok(content.includes(ing[`name${suffix}`]));
      assert.ok(content.includes(ing[`note${suffix}`]));
    }
    for (const step of recipe.steps) {
      assert.ok(content.includes(step[`text${suffix}`]));
      assert.ok(content.includes(step[`title${suffix}`]));
    }
    assert.ok(content.includes('2162 g') && content.includes('2138 g'));
    assert.ok(content.includes('1/35') && content.includes('10021.556'));
    assert.ok(content.includes(lang === 'es' ? 'no gramos registrados' : 'not recorded grams'));
    if (lang === 'en') for (const paragraph of recipe.storyEn.trim().split(/\n\s*\n/)) {
      assert.ok(content.includes(normalize(paragraph)));
    }
  });

  test(`${lang}: actual built client scales gram chips, grocery amounts and macro totals, never coloring sentinels`, () => {
    const ids = new Map();
    const groups = new Map();
    const adapt = (node) => ({
      textContent: text(node),
      dataset: Object.fromEntries((node.attrs ?? []).filter((a) => a.name.startsWith('data-'))
        .map((a) => [a.name.slice(5), a.value])),
    });
    for (const id of ['recipe-data', 'serv-count', 'macro-serv', 'serv-minus', 'serv-plus']) {
      const node = adapt(elements(document, (n) => attr(n, 'id') === id)[0]);
      node.listeners = {};
      node.addEventListener = (name, callback) => { node.listeners[name] = callback; };
      ids.set(id, node);
    }
    for (const cls of ['ing-amount', 'grocery-amount', 'macro-total']) {
      groups.set(`.${cls}`, elements(document, (n) => hasClass(n, cls)).map(adapt));
    }
    const scaling = scripts.filter((n) => attr(n, 'type') === 'module'
      && /getElementById\(["']recipe-data["']\)/.test(text(n)));
    assert.equal(scaling.length, 1);
    runInNewContext(text(scaling[0]), { document: {
      getElementById: (id) => ids.get(id) ?? null,
      querySelectorAll: (selector) => groups.get(selector) ?? [],
    } }, { timeout: 1000 });
    const click = (id) => ids.get(id).listeners.click();
    for (const target of [35, 17, 1, 50]) {
      while (Number(ids.get('serv-count').textContent) > target) click('serv-minus');
      while (Number(ids.get('serv-count').textContent) < target) click('serv-plus');
      assert.equal(Number(ids.get('macro-serv').textContent), target);
      for (const node of groups.get('.ing-amount')) {
        const i = Number(node.dataset.idx);
        assert.equal(node.textContent, weights[i] === null ? '' : formatAmount(weights[i], target / 35));
      }
      for (const node of groups.get('.grocery-amount')) {
        assert.equal(node.textContent, formatAmount(Number(node.dataset.base), target / 35));
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
    assert.equal(groups.get('.grocery-amount').length, 8);
    assert.equal(groups.get('.macro-total').length, 5);
  });
}
