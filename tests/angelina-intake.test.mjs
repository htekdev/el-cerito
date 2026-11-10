import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const intake = (await readFile(new URL('docs/recipe-drafts/enchiladas-de-espinaca-tia-angelina-v2-1.md', root), 'utf8')).replace(/\r\n/g, '\n');
const source = intake.split('## Complete combined user recipe source — preserved verbatim\n\n')[1];

test('complete source preserves attribution, version and all seven stages', () => {
  assert.ok(source);
  assert.match(source, /^Tía Angelina's Enchiladas de Espinaca\. Family Recipe Version 2\.1\./);
  for (const stage of [
    '1 BOILED CHICKEN:', '2 CHICKEN VELVEETA FILL:', '3 CREAMY SPINACH SALSA DOUBLE BATCH:',
    '4 TORTILLAS:', '5 ASSEMBLY:', '6 BAKE proven method:', '7 FAMILY NOTES:',
  ]) assert.ok(source.includes(stage), stage);
  assert.match(source, /Family recipe from Tia Angelina refined through home-kitchen testing\.\s*$/);
  assert.match(source, /per Frankie's feedback/);
});

test('raw preparation, cooked filling, rounding and reserved salsa stay distinct', () => {
  for (const phrase of [
    'approx 1kg raw; half white onion; 3 garlic cloves; 10g salt; optional 1 bay leaf',
    'Reserve at least 270g broth', 'Target cooked shredded chicken750g',
    'Velveeta Original907g (2lb)', 'green onions50g', 'drained28g', 'broth30g',
    'optional fresh cilantro (no amount supplied)', 'Total approx1765g',
    'approx441g fill/layer and882g/pan', 'Weigh first5-6',
    'spinach560g', 'soup1192g (4 cans)', 'sour cream460g', 'broth240g',
    'bouillon10g', 'Total2462g before cooking losses',
    'bottom262g, middle523g, top262g, total1047g',
    'bottom524g/middle1046g/top524g,total2094g', 'Reserve approx368g',
  ]) assert.ok(source.includes(phrase), phrase);
  assert.equal(750 + 907 + 50 + 28 + 30, 1765);
  assert.equal(882 * 2, 1764);
  assert.ok(1765 / 72 >= 24 && 1765 / 72 <= 25);
  assert.equal(560 + 1192 + 460 + 240 + 10, 2462);
  assert.equal((262 + 523 + 262) * 2, 2094);
  assert.equal(2462 - 2094, 368);
  assert.match(intake, /Do not count both raw and cooked chicken as consumed nutrition/);
});

test('method, count yield, unknown quantities and experiments are retained', () => {
  for (const phrase of [
    '72 rolled taquitos total, 36/pan', 'each 11x9 inches',
    'Velveeta goes DIRECTLY IN CHICKEN filling', 'not salsa',
    'WITHOUT squeezing completely dry', 'in SMALL BATCHES until completely smooth',
    'Original estimate roughly9 cups, not measured density',
    'avocado oil cooking spray (quantity unspecified); buy extras for tearing',
    'briefly BOTH SIDES', "DON'T fry crispy",
    'Each36 taquitos,18/layer,2 layers', 'nine each side', 'WITHOUT flooding',
    'tightly foil cover each pan; put on sturdy baking sheets',
    'center165F', 'remove/rest10-15min', 'Uncovered finish NOT YET TESTED',
    'proven method90min covered', 'V2.1 STILL TESTING',
    'Knorr8=>10g;scallions35=>50g',
  ]) assert.ok(source.includes(phrase), phrase);
  assert.match(intake, /NOT a published recipe/);
  assert.match(intake, /NO 72 comidas para adultos/);
  assert.match(intake, /No cover was supplied/);
  assert.match(intake, /No lighter sibling invented or linked/);
});

test('blocked intake accurately identifies current schema and 72-count UI constraints', async () => {
  const schema = await readFile(new URL('src/content.config.ts', root), 'utf8');
  const detail = await readFile(new URL('src/components/sections/RecipeDetail.astro', root), 'utf8');
  assert.match(schema, /prepTime: z\.number\(\)\.int\(\)\.nonnegative\(\)/);
  assert.match(detail, /prepTime: `PT\$\{d\.prepTime\}M`/);
  assert.match(detail, /formatMinutes\(d\.prepTime\)/);
  assert.match(detail, /if \(servings < 50\)/);
  assert.match(intake, /NO active preparation duration/);
  assert.match(intake, /No zero, estimate, or invented total/);
});
