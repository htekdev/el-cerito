import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { load } from 'js-yaml';
import { parse } from 'parse5';
import {
  totalTime, recipeTimeProperties, formatMinutes, formatAmount, niceRound,
} from '../src/lib/nutrition.ts';

const root = new URL('../', import.meta.url);
const slug = 'enchiladas-de-espinaca-tia-angelina';
const attr = (node, name) => node.attrs?.find((a) => a.name === name)?.value;
const text = (node) => node.value ?? (node.childNodes ?? []).map(text).join('');
const find = (node, predicate) => [
  ...(predicate(node) ? [node] : []),
  ...(node.childNodes ?? []).flatMap((child) => find(child, predicate)),
];
const hasClass = (node, name) => (attr(node, 'class') ?? '').split(/\s+/).includes(name);
const read = (path) => readFile(new URL(path, root), 'utf8');
test('recorded regression CI pins the supported browser OS and retains evidence', async () => {
  const workflow = await read('.github/workflows/recipe-regressions.yml');
  assert.match(workflow, /runs-on: ubuntu-24\.04/);
  assert.match(workflow, /run: npm run test:coverage/);
  assert.match(workflow, /run: npm run test:e2e/);
  assert.match(workflow, /retention-days: 7/);
  assert.match(workflow, /test-results\//);
});
const recipe = async (id) => load((await read(`src/content/recipes/${id}.md`)).split(/---\r?\n/)[1]);
async function built(id, lang) {
  const route = lang === 'es' ? 'recetas' : 'en/recipes';
  const html = await read(`dist/client/${route}/${id}/index.html`);
  const doc = parse(html);
  const byId = (id) => find(doc, (n) => attr(n, 'id') === id)[0];
  const scripts = find(doc, (n) => n.tagName === 'script');
  return {
    html, doc, byId,
    structured: JSON.parse(text(scripts.find((n) => attr(n, 'type') === 'application/ld+json'))),
    payload: JSON.parse(text(byId('recipe-data'))), scripts,
  };
}

test('time helper never infers a whole duration from partial component stages', () => {
  for (const [prep, cook, explicit, expected] of [
    [undefined, undefined, undefined, undefined],
    [undefined, 90, undefined, undefined],
    [20, undefined, undefined, undefined],
    [0, undefined, undefined, undefined],
    [undefined, 0, undefined, undefined],
    [0, 0, undefined, 0],
    [0, 20, undefined, 20],
    [20, 0, undefined, 20],
    [20, 90, undefined, 110],
    [20, 90, 0, 0],
    [undefined, undefined, 0, 0],
    [undefined, 90, 150, 150],
  ]) assert.equal(totalTime(prep, cook, explicit), expected);
});

test('JSON-LD omits unknown times but preserves genuine zero and explicit totals', () => {
  assert.deepEqual(recipeTimeProperties(), {});
  assert.deepEqual(recipeTimeProperties(undefined, 90), { cookTime: 'PT90M' });
  assert.deepEqual(recipeTimeProperties(20), { prepTime: 'PT20M' });
  assert.deepEqual(recipeTimeProperties(undefined, undefined, 150), { totalTime: 'PT150M' });
  assert.deepEqual(recipeTimeProperties(0, 0), { prepTime: 'PT0M', cookTime: 'PT0M', totalTime: 'PT0M' });
  assert.deepEqual(recipeTimeProperties(10, 90, 0), { prepTime: 'PT10M', cookTime: 'PT90M', totalTime: 'PT0M' });
});

test('localized unknown labels cannot become NaN, undefined or a zero duration', () => {
  assert.equal(formatMinutes(undefined), 'No especificado');
  assert.equal(formatMinutes(undefined, 'es'), 'No especificado');
  assert.equal(formatMinutes(undefined, 'en'), 'Not specified');
  for (const lang of ['es', 'en']) {
    for (const [minutes, expected] of [[0, '0 min'], [25, '25 min'], [60, '1 h'], [90, '1 h 30 min']]) {
      assert.equal(formatMinutes(minutes, lang), expected);
    }
  }
});

for (const lang of ['es', 'en']) {
  test(`${lang}: all pre-existing numeric recipes retain their authored timing UI/JSON-LD`, async () => {
    const files = await readdir(new URL('src/content/recipes/', root));
    for (const filename of files.filter((n) => n.endsWith('.md') && n !== `${slug}.md`)) {
      const id = filename.slice(0, -3);
      const data = await recipe(id);
      if (data.draft) continue;
      const page = await built(id, lang);
      const total = data.totalTime ?? data.prepTime + data.cookTime;
      for (const [key, minutes] of [['prepTime', data.prepTime], ['cookTime', data.cookTime], ['totalTime', total]]) {
        assert.equal(page.structured[key], `PT${minutes}M`, `${id} ${key}`);
        assert.ok(text(page.doc).includes(formatMinutes(minutes, lang)), `${id} visible ${key}`);
      }
      assert.equal(page.structured.recipeYield, `${data.servings} ${lang === 'en' ? data.servingLabelEn || data.servingLabel : data.servingLabel}`);
    }
  });

  test(`${lang}: Angelina detail and card show unknown time, real taquito yield and no fabricated JSON-LD`, async () => {
    const data = await recipe(slug);
    for (const key of ['prepTime', 'cookTime', 'totalTime']) assert.equal(data[key], undefined);
    assert.equal(data.servings, 72);
    assert.equal(data.servingLabel, 'taquitos');
    const page = await built(slug, lang);
    for (const key of ['prepTime', 'cookTime', 'totalTime']) assert.ok(!Object.hasOwn(page.structured, key), key);
    assert.equal(page.structured.recipeYield, '72 taquitos');
    const label = formatMinutes(undefined, lang);
    assert.equal((text(page.doc).match(new RegExp(label, 'g')) ?? []).length, 3);
    assert.doesNotMatch(text(page.doc), /NaN|undefined|PT0M/);
    assert.equal(text(page.byId('serv-count')), '72');
    assert.equal(text(page.byId('macro-serv')), '72');
    const listing = parse(await read(`dist/client/${lang === 'es' ? 'recetas' : 'en/recipes'}/index.html`));
    const card = find(listing, (n) => n.tagName === 'a' && attr(n, 'href') === `/${lang === 'es' ? 'recetas' : 'en/recipes'}/${slug}`)[0];
    assert.ok(card);
    assert.ok(text(card).includes(label));
    assert.doesNotMatch(text(card), /NaN|undefined|0 min/);
  });

  for (const { id, fixtureServings } of [
    { id: slug },
    { id: 'marranitos' },
    // Generic high-yield payload regression can run before the parent authors
    // Angelina. This is NOT a replacement for the real recipe checks above.
    { id: 'marranitos', fixtureServings: 72 },
  ]) {
    test(`${lang}: actual built ${id}${fixtureServings ? ' (72-count fixture)' : ''} client restores ingredient, grocery and macro totals within 1/max(50,default)`, async () => {
      const page = await built(id, lang);
      const ids = new Map();
      const groups = new Map();
      const adapt = (node) => ({
        textContent: text(node),
        dataset: Object.fromEntries((node.attrs ?? []).filter((a) => a.name.startsWith('data-')).map((a) => [a.name.slice(5), a.value])),
        listeners: {},
        addEventListener(event, callback) { this.listeners[event] = callback; },
      });
      for (const node of find(page.doc, (n) => !!n.tagName)) {
        if (attr(node, 'id')) ids.set(attr(node, 'id'), adapt(node));
        for (const name of ['ing-amount', 'grocery-amount', 'macro-total']) {
          if (hasClass(node, name)) {
            const nodes = groups.get(`.${name}`) ?? [];
            nodes.push(adapt(node));
            groups.set(`.${name}`, nodes);
          }
        }
      }
      const script = page.scripts.find((n) => attr(n, 'type') === 'module' && /getElementById\(["']recipe-data["']\)/.test(text(n)));
      assert.ok(script, 'Exercise shipped browser script, not a copied implementation');
      if (fixtureServings) {
        page.payload.defaultServings = fixtureServings;
        ids.get('recipe-data').textContent = JSON.stringify(page.payload);
        ids.get('serv-count').textContent = String(fixtureServings);
        ids.get('macro-serv').textContent = String(fixtureServings);
        for (const node of groups.get('.macro-total')) {
          node.textContent = String(niceRound((page.payload.macros[node.dataset.key] ?? 0) * fixtureServings));
        }
      }
      const ssr = [...groups.values()].flat().map((node) => node.textContent);
      runInNewContext(text(script), {
        document: { getElementById: (id) => ids.get(id) ?? null, querySelectorAll: (selector) => groups.get(selector) ?? [] },
      }, { timeout: 1000 });
      assert.deepEqual([...groups.values()].flat().map((node) => node.textContent), ssr,
        'Initial browser render must exactly preserve server-rendered measurements');
      const click = (id) => ids.get(id).listeners.click();
      const def = page.payload.defaultServings;
      const max = Math.max(50, def);
      const verify = (count) => {
        assert.equal(ids.get('serv-count').textContent, String(count));
        assert.equal(ids.get('macro-serv').textContent, String(count));
        for (const node of groups.get('.ing-amount')) {
          const ing = page.payload.ingredients[Number(node.dataset.idx)];
          if (ing.unit !== 'to taste') assert.equal(node.textContent, formatAmount(ing.amount, count / def));
        }
        for (const node of groups.get('.grocery-amount')) assert.equal(node.textContent, formatAmount(Number(node.dataset.base), count / def));
        for (const node of groups.get('.macro-total')) assert.equal(node.textContent, String(niceRound((page.payload.macros[node.dataset.key] ?? 0) * count)));
      };
      for (const target of [def, def - 1, def, 1, max]) {
        // Bounded loops fail rather than hang if the original 50-cap returns.
        for (let i = 0; i < max + 1 && Number(ids.get('serv-count').textContent) !== target; i++) {
          click(Number(ids.get('serv-count').textContent) > target ? 'serv-minus' : 'serv-plus');
        }
        verify(target);
        if (target === 1) { click('serv-minus'); verify(1); }
      }
      click('serv-plus');
      verify(max);
    });
  }
}
