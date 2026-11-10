import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

// Execute the actual pure helper (not an independently copied implementation).
// Its containing module imports Astro/Vite extensionless paths unavailable to Node.
const source = await readFile(new URL('../src/i18n/utils.ts', import.meta.url), 'utf8');
const declaration = source.match(/export function rServingLabel[\s\S]*?\n\}/)?.[0];
assert.ok(declaration);
const helper = runInNewContext(`${stripTypeScriptTypes(declaration.replace('export ', ''))}; rServingLabel`);

test('explicit yield grammar localizes singular/plural without guessing other recipes', () => {
  const trays = { servings: 2, servingLabel: 'charolas', servingLabelEn: 'trays',
    servingLabelSingular: 'charola', servingLabelSingularEn: 'tray' };
  for (const [lang, singular, plural] of [['es', 'charola', 'charolas'], ['en', 'tray', 'trays']]) {
    assert.equal(helper(trays, lang), plural);
    assert.equal(helper({ ...trays, servings: 1 }, lang), singular);
    for (const count of [1, 2, 3, 4, 2]) assert.equal(helper(trays, lang, count), count === 1 ? singular : plural);
  }
  const legacy = { servings: 1, servingLabel: 'porciones', servingLabelEn: 'servings' };
  assert.equal(helper(legacy, 'es', 1), 'porciones');
  assert.equal(helper(legacy, 'en', 1), 'servings');
  assert.equal(helper({ servingLabel: 'tacos' }, 'en'), 'tacos');
  assert.equal(helper({ ...trays, servingLabelSingularEn: undefined }, 'en', 1), 'charola');
});

test('both singular fields are optional in the actual collection schema', async () => {
  const schema = await readFile(new URL('../src/content.config.ts', import.meta.url), 'utf8');
  for (const name of ['servingLabelSingular', 'servingLabelSingularEn']) {
    assert.ok(schema.includes(`${name}: z.string().optional()`));
  }
});
