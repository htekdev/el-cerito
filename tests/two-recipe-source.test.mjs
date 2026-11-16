import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { load } from 'js-yaml';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const data = (raw) => load(raw.split(/---\r?\n/)[1]);
const moleSlug = 'costillas-de-puerco-en-mole-verde';
const angelinaSlug = 'enchiladas-de-espinaca-tia-angelina';
const moleRaw = await read(`src/content/recipes/${moleSlug}.md`);
const mole = data(moleRaw);
const angelinaRaw = await read(`src/content/recipes/${angelinaSlug}.md`);
const angelina = data(angelinaRaw);

test('mole preserves every source quantity without invented grams, macros or people', () => {
  assert.equal(mole.servings, 1);
  assert.equal(mole.servingLabelSingular, 'tanda');
  assert.equal(mole.servingLabelSingularEn, 'batch');
  assert.match(mole.descriptionEn, /not one person's serving.*no diner count/);
  for (const key of ['macros', 'prepTime', 'cookTime', 'totalTime']) assert.equal(mole[key], undefined);
  assert.deepEqual(mole.healthLabels, []);
  assert.ok(!mole.healthierAlternatives?.length);
  assert.deepEqual(mole.ingredients.map(({ amount, unit }) => [amount, unit]), [
    [6350, 'g'], [5, 'cloves'], [1, 'to taste'], [1, 'to taste'],
    [1, 'to taste'], [185, 'g'], [200, 'g'], [1, 'to taste'],
    [1, 'to taste'], [1, 'to taste'], [1, 'to taste'], [4, 'pieces'],
    [2, 'pieces'], [1, 'to taste'], [80, 'g'], [30, 'g'], [63, 'g'],
    [442, 'g'], [1, 'to taste'], [1, 'to taste'], [1, 'to taste'],
  ]);
  for (const ing of mole.ingredients) {
    assert.ok(ing.name && ing.nameEn && ing.note && ing.noteEn);
    for (const key of ['calories', 'protein', 'carbs', 'fat', 'fiber']) assert.equal(ing[key], undefined);
    if (ing.unit === 'to taste') assert.equal(ing.amount, 1, 'Existing sentinel is not a gram claim');
  }
  assert.match(mole.ingredients[2].noteEn, /literally.*≈ 2 pinzas/);
  assert.match(mole.ingredients[7].noteEn, /handful.*no stalks/);
  assert.match(mole.ingredients[8].noteEn, /1 bunch.*unmeasured/);
  assert.match(mole.ingredients[9].noteEn, /1 bunch.*unmeasured/);
  assert.match(mole.ingredients[10].noteEn, /2 bunches.*unmeasured/);
  assert.match(mole.ingredients[17].noteEn, /442|1½ cups/);
  assert.match(mole.ingredients[0].noteEn, /14 lb \(6\.35 kg\).*6350/);
  assert.match(mole.ingredients[6].noteEn, /approximately 200/);
});

test('mole retains nine bilingual steps, every input, order, techniques and source-only result', () => {
  assert.equal(mole.instructions.length, 9);
  assert.equal(mole.instructionsEn.length, 9);
  assert.deepEqual(mole.steps.map((s) => s.text), mole.instructions);
  assert.deepEqual(mole.steps.map((s) => s.textEn), mole.instructionsEn);
  const refs = new Set(mole.steps.flatMap((s) => s.ingredients.filter(Number.isInteger)));
  assert.deepEqual([...refs].sort((a, b) => a - b), mole.ingredients.map((_, i) => i));
  for (const step of mole.steps) {
    assert.ok(step.title && step.titleEn && step.text && step.textEn);
    for (const item of step.ingredients.filter((i) => typeof i === 'object')) assert.ok(item.label && item.labelEn);
  }
  assert.match(mole.steps[0].textEn, /molcajete.*≈ 2 pinzas.*drizzle/s);
  assert.match(mole.steps[1].textEn, /10–20 minutes/);
  assert.match(mole.steps[2].textEn, /evaporates COMPLETELY/);
  assert.match(mole.steps[3].textEn, /own rendered fat.*no added lard/);
  assert.match(mole.steps[4].textEn, /Drain excess.*thin coating/);
  assert.match(mole.steps[5].textEn, /pepitas, sesame seeds and peanuts TOGETHER/);
  for (const ingredient of ['lettuce', 'spinach', 'celery', 'parsley', 'cilantro', 'radish', 'scallions', 'jalapeños']) {
    assert.ok(mole.steps[6].textEn.includes(ingredient), ingredient);
  }
  assert.match(mole.steps[6].textEn, /ALL the raw.*LEAVES only.*fried seeds and peanuts.*chicken broth/s);
  assert.match(mole.steps[7].textEn, /RAW.*directly.*not separately/);
  assert.match(mole.steps[8].textEn, /45–90 minutes.*FINAL SIMMER.*NOT.*total time/);
  assert.match(mole.storyEn, /NOT observations from a new test cook/);
  assert.match(mole.storyEn, /fresh and vegetal.*deep and complex.*thick, aromatic, full-bodied/s);
  assert.match(mole.storyEn, /oil type is unspecified/);
  assert.match(mole.storyEn, /Nutrition is not supplied or calculated; unknown is not zero/);
});

test('existing Angelina curated formula, stages, macros and two-tray correction are not replaced', async () => {
  // Existing regressions independently check every current quantity and macro.
  assert.equal(angelina.servings, 2);
  assert.equal(angelina.servingLabelSingular, 'charola');
  assert.equal(angelina.ingredients[0].amount, 1000);
  assert.equal(angelina.ingredients[12].amount, 1192);
  assert.equal(angelina.ingredients[13].amount, 460);
  assert.equal(angelina.ingredients[16].amount, 72);
  assert.match(angelina.steps[2].textEn, /Thaw spinach.*SMALL BATCHES/s);
  assert.match(angelina.steps[3].textEn, /85%.*NOT a validated improvement/s);
  assert.match(angelina.steps[5].textEn, /November 10, 2026.*9 × 13-inch/s);
  assert.match(angelina.steps[6].textEn, /5–10 minutes.*NOT been tested/s);
  const intake = await read('docs/recipe-drafts/enchiladas-de-espinaca-tia-angelina-v2-1.md');
  const original = intake.replace(/\r\n/g, '\n')
    .split('## Complete combined user recipe source — preserved verbatim\n\n')[1];
  assert.equal(createHash('sha256').update(original).digest('hex'),
    '5493544f34ab8c98d9851613641caa7817423ef34e0bd9e09fdc76ee1a1d7a74');
  const filenames = await readdir(new URL('src/content/recipes/', root));
  assert.deepEqual(filenames.filter((f) => /angelina|mole-verde/.test(f)).sort(),
    [`${moleSlug}.md`, `${angelinaSlug}.md`].sort());
  assert.ok(filenames.includes('costillas-de-puerco-en-salsa.md'));
});

test('complete original infographic is distinct and includes all seven steps, 116/72/44 and side panels in both languages', () => {
  const originalEn = angelina.storyEn.split('ORIGINAL INFOGRAPHIC — SEPARATE SOURCE VERSION')[1];
  const originalEs = angelinaRaw.split('## Infografía original — versión de fuente separada')[1];
  assert.ok(originalEn && originalEs);
  for (const section of [originalEn, originalEs]) {
    for (const marker of ['750', '907', '454', '560', '240', '10', '50', '28',
      '116', '72', '44', '58', '36', '18', '11 × 9', '350', '90', '95',
      '24', '3–4', '2', '30', '15–20', '165', '10.5']) {
      assert.ok(section.includes(marker), marker);
    }
    assert.doesNotMatch(section, /family-approved by|APPROVED BY/i);
  }
  for (let n = 1; n <= 7; n++) assert.ok(originalEn.includes(`ORIGINAL STEP ${n}`));
  for (let n = 1; n <= 7; n++) assert.match(originalEs, new RegExp(`\\n${n}\\. \\*\\*`));
  assert.match(originalEn, /does NOT replace.*November 10.*do not live-scale/s);
  assert.match(originalEn, /3 lb RAW.*750 g COOKED.*no raw gram mass/s);
  assert.match(originalEn, /filling panel but step 3 puts BOTH into the sauce/);
  assert.match(originalEn, /under sauce, but step 2 puts BOTH into the filling/);
  assert.match(originalEn, /Fry ALL 116.*assembled yield is 72/s);
  assert.match(originalEn, /560 g FROZEN.*454 g.*immersion blender.*does NOT instruct thawing or draining/s);
  assert.match(originalEn, /NO shredded cheese on top/);
  assert.match(originalEn, /Speed 2 for about 30 seconds/);
  assert.match(originalEn, /up to 24 hours.*3–4 days.*2 months.*refrigerator.*no reheating temperature or method/s);
  assert.match(originalEn, /IMAGE ASSERTION ONLY.*not new owner approval/s);
  assert.match(originalEs, /no constituye nueva autorización/);
  assert.match(originalEs, /selector.*72 comidas|72 comidas.*selector/s);
});

test('public additions exclude private input paths, unrelated destination schema and invented approvals', async () => {
  const reconciliation = await read('docs/recipe-drafts/two-recipe-source-reconciliation.md');
  for (const copy of [moleRaw, angelinaRaw, reconciliation]) {
    assert.doesNotMatch(copy, /telegram-images|[A-Z]:\\|contact email|telegram_id|chat_id|family-approved by|APPROVED BY/i);
  }
  const cover = await read(`public${mole.coverImage}`);
  assert.match(cover, /viewBox="0 0 1200 900"/);
  assert.doesNotMatch(cover, /<image|https?:\/\/(?!www\.w3\.org)|base64/);
  assert.match(mole.coverImageAlt, /Diagrama editorial.*no fotografía.*not a photograph/);
  assert.equal(await read(`dist/client${mole.coverImage}`), cover);
});
