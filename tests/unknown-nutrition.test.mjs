import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { load } from 'js-yaml';
import { parse } from 'parse5';
import { recipeNutritionProperties, formatAmount, niceRound } from '../src/lib/nutrition.ts';
import { ui } from '../src/i18n/ui.ts';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const slug = 'costillas-de-puerco-en-mole-verde';
const attr = (node, name) => node.attrs?.find((a) => a.name === name)?.value;
const text = (node) => node.value ?? (node.childNodes ?? []).map(text).join('');
const find = (node, predicate) => [
  ...(predicate(node) ? [node] : []),
  ...(node.childNodes ?? []).flatMap((child) => find(child, predicate)),
];
const hasClass = (node, name) => (attr(node, 'class') ?? '').split(/\s+/).includes(name);

test('optional nutrition means omission, not a synthesized all-zero object; real zero remains valid', () => {
  assert.deepEqual(recipeNutritionProperties(), {});
  assert.deepEqual(recipeNutritionProperties(undefined, '1 batch'), {});
  assert.deepEqual(recipeNutritionProperties({ calories: 0, protein: 0, carbs: 0, fat: 0 }), {
    nutrition: {
      '@type': 'NutritionInformation', calories: '0 kcal',
      proteinContent: '0 g', carbohydrateContent: '0 g', fatContent: '0 g', fiberContent: '0 g',
    },
  });
  assert.deepEqual(recipeNutritionProperties({
    calories: 123.5, protein: 12, carbs: 10, fat: 3, fiber: 4,
  }, '1 tray'), {
    nutrition: {
      '@type': 'NutritionInformation', servingSize: '1 tray', calories: '123.5 kcal',
      proteinContent: '12 g', carbohydrateContent: '10 g', fatContent: '3 g', fiberContent: '4 g',
    },
  });
});

test('schema only relaxes the whole nutrition object; supplied numeric fields remain validated', async () => {
  const schema = await read('src/content.config.ts');
  assert.match(schema, /macros: macrosSchema\.optional\(\)/);
  assert.match(schema, /const macrosSchema = z\.object\(\{\s*calories: z\.number\(\),\s*protein: z\.number\(\),\s*carbs: z\.number\(\),\s*fat: z\.number\(\),/);
  assert.doesNotMatch(schema, /macros:.*default/);
});

for (const lang of ['es', 'en']) {
  const base = lang === 'es' ? 'recetas' : 'en/recipes';
  test(`${lang}: built unknown-nutrition detail, card, payload and JSON-LD are honest`, async () => {
    const doc = parse(await read(`dist/client/${base}/${slug}/index.html`));
    const byId = (id) => find(doc, (n) => attr(n, 'id') === id)[0];
    const structured = JSON.parse(text(find(doc, (n) => attr(n, 'type') === 'application/ld+json')[0]));
    const payload = JSON.parse(text(byId('recipe-data')));
    assert.ok(!Object.hasOwn(structured, 'nutrition'));
    assert.ok(!Object.hasOwn(payload, 'macros'));
    for (const key of ['prepTime', 'cookTime', 'totalTime']) assert.ok(!Object.hasOwn(structured, key));
    assert.equal(structured.recipeInstructions.length, 9);
    assert.equal(structured.recipeIngredient.length, 21);
    assert.equal(structured.recipeYield, lang === 'es' ? '1 tanda' : '1 batch');
    assert.equal(payload.defaultServings, 1);
    assert.equal(payload.ingredients[0].amount, 6350);
    assert.equal(find(doc, (n) => hasClass(n, 'macro-total')).length, 0);
    assert.ok(!byId('macro-serv'));
    assert.ok(text(byId('nutrition-unknown')).includes(ui[lang]['recipe.nutritionUnknown']));
    assert.ok(text(byId('nutrition-unknown')).includes(ui[lang]['recipe.nutritionUnknownNote']));
    assert.doesNotMatch(text(doc), /NaN|undefined|PT0M|0 kcal/);
    const listing = parse(await read(`dist/client/${base}/index.html`));
    const card = find(listing, (n) => n.tagName === 'a' && attr(n, 'href') === `/${base}/${slug}`)[0];
    assert.ok(card);
    assert.ok(text(card).includes(ui[lang]['recipe.nutritionUnknown']));
    assert.ok(text(card).includes(lang === 'es' ? '1 tanda' : '1 batch'));
    assert.doesNotMatch(text(card), /kcal|💪|Nutrición por|Nutrition per|NaN|undefined/);
  });

  test(`${lang}: actual bundled batch control restores SSR grams, counts and groceries with no fake macros`, async () => {
    const doc = parse(await read(`dist/client/${base}/${slug}/index.html`));
    const ids = new Map();
    const groups = new Map();
    const adapt = (node) => ({
      textContent: text(node),
      dataset: Object.fromEntries((node.attrs ?? []).filter((a) => a.name.startsWith('data-'))
        .map((a) => [a.name.slice(5), a.value])),
      listeners: {},
      addEventListener(event, callback) { this.listeners[event] = callback; },
    });
    for (const node of find(doc, (n) => !!n.tagName)) {
      if (attr(node, 'id')) ids.set(attr(node, 'id'), adapt(node));
      for (const name of ['ing-amount', 'grocery-amount', 'macro-total']) {
        if (hasClass(node, name)) {
          const nodes = groups.get(`.${name}`) ?? [];
          nodes.push(adapt(node));
          groups.set(`.${name}`, nodes);
        }
      }
    }
    const payload = JSON.parse(ids.get('recipe-data').textContent);
    const scripts = find(doc, (n) => n.tagName === 'script');
    const script = scripts.find((n) => attr(n, 'type') === 'module' && /getElementById\(["']recipe-data["']\)/.test(text(n)));
    assert.ok(script);
    const ssr = [...groups.values()].flat().map((n) => n.textContent);
    runInNewContext(text(script), {
      document: { getElementById: (id) => ids.get(id) ?? null, querySelectorAll: (selector) => groups.get(selector) ?? [] },
    }, { timeout: 1000 });
    assert.deepEqual([...groups.values()].flat().map((n) => n.textContent), ssr);
    const click = (id) => ids.get(id).listeners.click();
    const verify = (count) => {
      assert.equal(ids.get('serv-count').textContent, String(count));
      const unit = payload.yieldLabels[count === 1 ? 'singular' : 'plural'];
      assert.equal(ids.get('serv-unit').textContent, unit);
      assert.equal(ids.get('grocery-yield').textContent, `${count} ${unit}`);
      for (const node of groups.get('.ing-amount')) {
        const ing = payload.ingredients[Number(node.dataset.idx)];
        assert.equal(node.textContent, ing.unit === 'to taste' ? '' : formatAmount(ing.amount, count));
      }
      for (const node of groups.get('.grocery-amount')) {
        assert.equal(node.textContent, formatAmount(Number(node.dataset.base), count));
      }
      assert.ok(!groups.has('.macro-total'));
    };
    for (const target of [1, 2, 3, 2, 1, 50, 1]) {
      for (let i = 0; i < 51 && Number(ids.get('serv-count').textContent) !== target; i++) {
        click(Number(ids.get('serv-count').textContent) < target ? 'serv-plus' : 'serv-minus');
      }
      verify(target);
      if (target === 1) { click('serv-minus'); verify(1); }
      if (target === 50) { click('serv-plus'); verify(50); }
    }
    // Defensive regression: stale markup must not turn an omitted macro into zero.
    const orphan = { dataset: { key: 'calories' }, textContent: 'not calculated' };
    groups.set('.macro-total', [orphan]);
    runInNewContext(text(script), {
      document: { getElementById: (id) => ids.get(id) ?? null, querySelectorAll: (selector) => groups.get(selector) ?? [] },
    }, { timeout: 1000 });
    click('serv-plus');
    assert.equal(orphan.textContent, 'not calculated');
  });

  test(`${lang}: every pre-existing authored nutrition value is unchanged in structured data and badges`, async () => {
    const files = await readdir(new URL('src/content/recipes/', root));
    for (const filename of files.filter((f) => f.endsWith('.md') && f !== `${slug}.md`)) {
      const d = load((await read(`src/content/recipes/${filename}`)).split(/---\r?\n/)[1]);
      if (d.draft) continue;
      assert.ok(d.macros, `${filename} keeps its existing nutrition`);
      const id = filename.slice(0, -3);
      const doc = parse(await read(`dist/client/${base}/${id}/index.html`));
      const structured = JSON.parse(text(find(doc, (n) => attr(n, 'type') === 'application/ld+json')[0]));
      const m = d.macros;
      const expected = {
        '@type': 'NutritionInformation',
        calories: `${m.calories} kcal`, proteinContent: `${m.protein} g`,
        carbohydrateContent: `${m.carbs} g`, fatContent: `${m.fat} g`,
        fiberContent: `${m.fiber ?? 0} g`,
      };
      if (d.servingLabelSingular) expected.servingSize = `1 ${lang === 'en'
        ? d.servingLabelSingularEn || d.servingLabelSingular : d.servingLabelSingular}`;
      assert.deepEqual(structured.nutrition, expected, filename);
      const totals = find(doc, (n) => hasClass(n, 'macro-total'));
      assert.equal(totals.length, 5);
      for (const node of totals) {
        const key = attr(node, 'data-key');
        assert.equal(text(node), String(niceRound((m[key] ?? 0) * d.servings)), `${filename} ${key}`);
      }
    }
  });
}
