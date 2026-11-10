import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { load } from 'js-yaml';
import sharp from 'sharp';

const root = new URL('../', import.meta.url);
const slug = 'enchiladas-de-espinaca-tia-angelina';
const raw = await readFile(new URL(`src/content/recipes/${slug}.md`, root), 'utf8');
const d = load(raw.split(/---\r?\n/)[1]);
const spanish = [...d.instructions, raw.split(/---\r?\n/).slice(2).join('')].join('\n');
const english = [...d.instructionsEn, d.storyEn].join('\n');

test('Angelina 2.1 preserves full preparation quantities and honest count/unspecified units', () => {
  assert.deepEqual(d.ingredients.map(({ amount, unit }) => [amount, unit]), [
    [1000, 'g'], [0.5, 'piece'], [3, 'cloves'], [10, 'g'], [1, 'piece'],
    [1, 'to taste'], [907, 'g'], [50, 'g'], [28, 'g'], [30, 'g'],
    [1, 'to taste'], [560, 'g'], [1192, 'g'], [460, 'g'], [240, 'g'],
    [10, 'g'], [72, 'pieces'], [1, 'to taste'],
  ]);
  assert.deepEqual(d.ingredients.filter((i) => i.optional).map((i) => i.nameEn), [
    'bay leaf for simmering', 'fresh cilantro for the filling',
  ]);
  for (const i of d.ingredients) {
    assert.ok(i.name && i.nameEn && i.note && i.noteEn);
  }
  assert.equal(d.servings, 2);
  assert.equal(d.servingLabel, 'charolas');
  assert.equal(d.servingLabelEn, 'trays');
  assert.equal(d.servingLabelSingular, 'charola');
  assert.equal(d.servingLabelSingularEn, 'tray');
  assert.match(d.title, /Tía Angelina.*2\.1/);
  assert.match(d.titleEn, /Aunt Angelina.*2\.1/);
  assert.match(d.author, /Tía Angelina/);
  for (const field of ['prepTime', 'cookTime', 'totalTime']) assert.equal(d[field], undefined);
  assert.deepEqual(d.healthLabels, []);
  assert.ok(!d.healthierAlternatives?.length);
});

test('seven complete bilingual stages mirror structured instructions and reference every input', () => {
  assert.equal(d.steps.length, 7);
  assert.deepEqual(d.steps.map((s) => s.text), d.instructions);
  assert.deepEqual(d.steps.map((s) => s.textEn), d.instructionsEn);
  const refs = new Set(d.steps.flatMap((s) => s.ingredients.filter((i) => typeof i === 'number')));
  assert.deepEqual([...refs].sort((a, b) => a - b), d.ingredients.map((_, i) => i));
  assert.match(d.steps[0].textEn, /1000 g raw.*15–25.*74 °C.*165 °F.*rest 5 minutes.*750 g cooked.*270 g broth/s);
  assert.match(d.steps[1].textEn, /Velveeta goes directly into the chicken filling, NOT the sauce/);
  assert.match(d.steps[2].textEn, /WITHOUT squeezing.*SMALL BATCHES.*2462 g.*9-cup/s);
  assert.match(d.steps[4].textEn, /BOTH sides.*Do not fry it crisp.*seam-side down/s);
  assert.match(d.steps[5].textEn, /TWO trays.*November 10, 2026.*9 × 13-inch.*NO change.*262 g.*523 g.*262 g.*11 × 9-inch.*36 taquitos.*18 per layer.*nine.*NOT a required count.*no new cooking trial/s);
  assert.match(d.steps[6].textEn, /177 °C.*350 °F.*Tightly cover.*sturdy baking sheets.*90 minutes.*74 °C.*165 °F/s);
  assert.match(d.steps[6].textEn, /EXPERIMENTAL.*5–10 minutes.*NOT been tested.*10–15 minutes/s);
});

test('family rounding and all revision/proven-versus-experimental observations survive both languages', () => {
  for (const copy of [spanish, english]) {
    for (const marker of ['1765', '441', '882', '24–25', '5–6', '2462', '2094',
      '368', '1047', '1046', '524', '262', '523', '1:2:1', 'Frankie',
      '907', '750', '90', '10–15', '5–10', '2.1']) assert.ok(copy.includes(marker), marker);
  }
  assert.match(spanish, /de 8 a 10 g.*de 35 a 50 g/s);
  assert.match(english, /from 8 to 10 g.*from 35 to 50 g/s);
  assert.match(english, /TWO TRAYS, not two adult meal portions/);
  assert.match(english, /NO[T]* a validated improvement|NOT a validated improvement/);
  assert.match(english, /approximately 85%/);
});

test('partial nutrition uses cooked yield once, label counts and only allocated consumed salsa', () => {
  const r = 2094 / 2462;
  const profiles = new Map([
    [0, [7.5, [165, 31.02, 0, 3.57, 0]]],
    [6, [907 / 28, [70, 4, 3, 4, 0]]],
    [7, [0.5, [32, 1.83, 7.34, 0.19, 2.6]]],
    [9, [0.3, [6, 0.64, 0.44, 0.21, 0]]],
    [11, [5.6 * r, [29, 3.63, 4.21, 0.57, 2.9]]],
    [12, [10 * r, [120, 2, 9, 8, 0]]],
    [13, [4.6 * r, [198, 2.44, 4.63, 19.35, 0]]],
    [14, [2.4 * r, [6, 0.64, 0.44, 0.21, 0]]],
    [16, [72 / 4, [90, 2, 18, 1, 2]]],
  ]);
  const keys = ['calories', 'protein', 'carbs', 'fat', 'fiber'];
  for (const [index, [factor, profile]] of profiles) {
    keys.forEach((key, j) => assert.ok(
      Math.abs(d.ingredients[index][key] - factor * profile[j]) < 1e-8,
      `${index} ${key}`,
    ));
  }
  for (const index of [1, 2, 3, 4, 5, 8, 10, 15, 17]) {
    for (const key of keys) assert.equal(d.ingredients[index][key], undefined);
  }
  for (const key of keys) {
    const sum = d.ingredients.reduce((total, ing) => total + (ing[key] ?? 0), 0);
    assert.ok(Math.abs(sum / 2 - d.macros[key]) < 1e-8, key);
  }
  assert.equal(d.macros.sodium, undefined);
  assert.equal(d.macros.sugar, undefined);
  assert.match(d.description, /Nutrición parcial estimada/);
  assert.match(d.descriptionEn, /Nutrition is a partial estimate/);
  assert.match(english, /NOT assumed calorie-free/);
  assert.match(english, /not a complete food-log value/);
  assert.match(english, /reserved sauce is excluded/);
});

test('one/two/three/four trays preserve original preparation and consumed-only totals', () => {
  const keys = ['calories', 'protein', 'carbs', 'fat', 'fiber'];
  const originalTotals = [7088.467912266451, 444.4812604154579,
    540.5928460020889, 321.3957218289428, 51.11257514216084];
  for (const [trays, factor] of [[1, 0.5], [2, 1], [3, 1.5], [4, 2], [2, 1]]) {
    assert.equal(trays / d.servings, factor);
    assert.deepEqual([0, 6, 7, 8, 9, 11, 12, 13, 14, 15].map((i) => d.ingredients[i].amount * factor),
      [1000, 907, 50, 28, 30, 560, 1192, 460, 240, 10].map((v) => v * factor));
    keys.forEach((key, i) => assert.ok(
      Math.abs(d.macros[key] * trays - originalTotals[i] * factor) < 1e-8, key));
    assert.equal((560 + 1192 + 460 + 240 + 10) * factor, 2462 * factor);
    assert.equal(2094 * factor + 368 * factor, 2462 * factor);
  }
  assert.match(d.ingredients[16].name, /aproximada/);
  assert.match(d.ingredients[16].nameEn, /approximate/);
  assert.match(d.ingredients[16].noteEn, /not a required count/);
  assert.doesNotMatch(english, /per reference taquito|taquito control|original yield is 72/);
});

test('cover is generated illustration, not supplied photograph or untested cooking proof', async () => {
  const buffer = await readFile(new URL(`public${d.coverImage}`, root));
  const metadata = await sharp(buffer).metadata();
  assert.equal(metadata.format, 'jpeg');
  assert.equal(metadata.width, 1200);
  assert.equal(metadata.height, 900);
  assert.ok(buffer.length > 80000);
  assert.match(d.coverImageAlt, /Ilustración generada.*no foto familiar.*Generated illustration.*not a family photograph/);
  assert.match(english, /NOT a photograph supplied by the family/);
  assert.match(english, /not proof of the untested browned finish/);
  const built = await readFile(new URL(`dist/client${d.coverImage}`, root));
  assert.deepEqual(built, buffer);
});
