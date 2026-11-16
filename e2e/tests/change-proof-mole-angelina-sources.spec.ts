import { test, expect, type Page } from '@playwright/test';
import { showPhase, assertText } from './visual-assert';

const mole = 'costillas-de-puerco-en-mole-verde';
const angelina = 'enchiladas-de-espinaca-tia-angelina';
const formatAmount = (n: number) => {
  if (n !== 0 && Math.abs(n) < 0.1) return String(Number(n.toPrecision(2)));
  const r = n >= 10 ? Math.round(n) : Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
};

async function verifyIngredients(page: Page, count: number) {
  const payload = await page.locator('#recipe-data').evaluate((node) => JSON.parse(node.textContent!));
  await assertText(page, page.locator('#serv-count'), String(count));
  const amounts = await page.locator('.ing-amount').evaluateAll((nodes) => nodes.map((node) => ({
    idx: Number((node as HTMLElement).dataset.idx), text: node.textContent,
  })));
  expect(amounts.length).toBeGreaterThan(20);
  for (const node of amounts) {
    const ing = payload.ingredients[node.idx];
    expect(node.text).toBe(ing.unit === 'to taste' ? '' : formatAmount(ing.amount * count / payload.defaultServings));
  }
  const groceries = await page.locator('.grocery-amount').evaluateAll((nodes) => nodes.map((node) => ({
    base: Number((node as HTMLElement).dataset.base), text: node.textContent,
  })));
  expect(groceries.length).toBeGreaterThan(0);
  for (const node of groceries) expect(node.text).toBe(formatAmount(node.base * count / payload.defaultServings));
}

for (const lang of ['es', 'en']) {
  test(`${lang}: green-mole unknowns and complete original Angelina source without rollback`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const base = lang === 'es' ? '/recetas' : '/en/recipes';
    const nutritionUnknown = lang === 'es' ? 'Nutrición no calculada' : 'Nutrition not calculated';
    const unknownTime = lang === 'es' ? 'No especificado' : 'Not specified';
    const batch = lang === 'es' ? 'tanda' : 'batch';
    const batches = lang === 'es' ? 'tandas' : 'batches';

    await page.goto(`${base}/${mole}`);
    await showPhase(page, 'Green mole: complete source, no invented servings or nutrition');
    await expect(page.locator('h1')).toContainText(lang === 'es' ? 'Mole Verde' : 'Green Mole');
    const cover = page.locator('article img').first();
    expect(await cover.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    await expect(cover).toHaveAttribute('src', '/images/recipes/costillas-mole-verde-editorial.svg');
    await expect(cover).toHaveAttribute('alt', /Diagrama editorial.*not a photograph/);
    await expect(page.getByText(unknownTime, { exact: true })).toHaveCount(3);
    await assertText(page, page.locator('#nutrition-unknown p').first(), nutritionUnknown);
    await expect(page.locator('#nutrition-unknown')).toContainText(lang === 'es' ? 'desconocido sea cero' : 'unknown does not mean zero');
    await expect(page.locator('.macro-total')).toHaveCount(0);
    const structured = await page.locator('script[type="application/ld+json"]').evaluate((node) => JSON.parse(node.textContent!));
    expect(structured).not.toHaveProperty('nutrition');
    for (const key of ['prepTime', 'cookTime', 'totalTime']) expect(structured).not.toHaveProperty(key);
    expect(structured.recipeYield).toBe(`1 ${batch}`);
    expect(structured.recipeInstructions).toHaveLength(9);
    const sourceData = await page.locator('#recipe-data').evaluate((node) => JSON.parse(node.textContent!));
    expect(sourceData).not.toHaveProperty('macros');
    expect(sourceData.ingredients).toHaveLength(21);
    expect(sourceData.ingredients[0].amount).toBe(6350);
    expect(sourceData.ingredients[17].amount).toBe(442);
    let current = 1;
    for (const count of [1, 2, 3, 2, 1]) {
      await showPhase(page, `${count} batch basis: known quantities scale; unknowns stay unknown`);
      while (current !== count) {
        await page.locator(current < count ? '#serv-plus' : '#serv-minus').click();
        current += current < count ? 1 : -1;
      }
      await verifyIngredients(page, count);
      await assertText(page, page.locator('#serv-unit'), count === 1 ? batch : batches);
      await expect(page.locator('#grocery-yield')).toHaveText(`${count} ${count === 1 ? batch : batches}`);
      await expect(page.locator('#nutrition-unknown')).toContainText(nutritionUnknown);
      await expect(page.locator('.macro-total')).toHaveCount(0);
    }
    await page.locator('#serv-minus').click();
    await verifyIngredients(page, 1);
    await page.emulateMedia({ media: 'print' });
    await assertText(page, page.locator('#serv-unit'), batch);
    await expect(page.locator('#nutrition-unknown')).toContainText(nutritionUnknown);
    await page.emulateMedia({ media: 'screen' });

    await showPhase(page, 'Nine mole steps: evaporate, brown, drain, fry together, raw blend and simmer');
    const stepTitles = page.locator('article ol').first().locator('h3');
    await expect(stepTitles).toHaveCount(9);
    const expectedTitles = lang === 'es' ? [
      'Adobo en molcajete', 'Marinar las costillas', 'Cocer hasta evaporar toda el agua',
      'Dorar en su propia grasa', 'Retirar la grasa sobrante',
      'Freír las dos semillas y los cacahuates juntos', 'Licuar el mole crudo',
      'Agregar el mole crudo a las costillas', 'Hervor suave, ternura y sazón',
    ] : [
      'Molcajete marinade', 'Marinate the ribs', 'Cook until all water evaporates',
      'Brown in their own fat', 'Drain excess fat', 'Fry both seeds and peanuts together',
      'Blend the raw mole', 'Add raw mole to the ribs', 'Gentle simmer, tenderness and seasoning',
    ];
    for (let i = 0; i < 9; i++) await assertText(page, stepTitles.nth(i), expectedTitles[i]);
    const body = page.locator('article');
    for (const marker of ['≈ 2 pinzas', '10–20', '45–90', '442']) await expect(body).toContainText(marker);
    await expect(body).toContainText(lang === 'es' ? 'no resultados de una nueva tanda' : 'NOT observations from a new test cook');
    await expect(body).not.toContainText(/NaN|undefined|0 kcal/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.goto(base);
    await showPhase(page, 'Mole card: batch basis and unknown nutrition, no fake badge');
    const moleCard = page.locator(`a[href="${base}/${mole}"]`);
    await expect(moleCard).toContainText(`1 ${batch}`);
    await expect(moleCard).toContainText(nutritionUnknown);
    await expect(moleCard).not.toContainText(/kcal|💪/);
    await moleCard.click();
    await verifyIngredients(page, 1);

    await page.goto(`${base}/${angelina}`);
    await showPhase(page, 'Existing Angelina: two trays and current 2.1 remain intact');
    const data = await page.locator('#recipe-data').evaluate((node) => JSON.parse(node.textContent!));
    expect(data.defaultServings).toBe(2);
    expect(data.ingredients[0].amount).toBe(1000);
    expect(data.ingredients[12].amount).toBe(1192);
    expect(data.ingredients[13].amount).toBe(460);
    expect(data.ingredients[16].amount).toBe(72);
    const perTray = data.macros.calories;
    expect(perTray).toBeCloseTo(3544.2339561332255, 8);
    const story = page.locator('article .prose');
    const original = lang === 'es'
      ? story.getByRole('heading', { name: 'Infografía original — versión de fuente separada' })
      : story.locator('p').filter({ hasText: 'ORIGINAL INFOGRAPHIC — SEPARATE SOURCE VERSION' });
    await original.scrollIntoViewIfNeeded();
    await expect(original).toBeVisible();
    const staticSource = await story.innerText();
    for (const marker of ['454', '116', '72', '44', '11 × 9', '24', '3–4', '30']) {
      await expect(story).toContainText(marker);
    }
    if (lang === 'en') {
      for (let n = 1; n <= 7; n++) {
        const step = story.locator('p').filter({ hasText: `ORIGINAL STEP ${n}` });
        await step.scrollIntoViewIfNeeded();
        await expect(step).toBeVisible();
      }
      await expect(story).toContainText('Fry ALL 116');
      await expect(story).toContainText('Speed 2 for about 30 seconds');
      await expect(story).toContainText('IMAGE ASSERTION ONLY');
    } else {
      const sourceSteps = story.locator('ol li');
      await expect(sourceSteps).toHaveCount(7);
      for (let n = 0; n < 7; n++) {
        await sourceSteps.nth(n).scrollIntoViewIfNeeded();
        await expect(sourceSteps.nth(n)).toBeVisible();
      }
      await expect(story).toContainText('freír las 116');
      await expect(story).toContainText('velocidad 2, aproximadamente 30 segundos');
      await expect(story).toContainText('no constituye nueva autorización');
    }
    await showPhase(page, 'Current control scales 2.1; original-source narrative stays fixed');
    for (const count of [3, 2, 1, 2]) {
      const previous = Number(await page.locator('#serv-count').textContent());
      await page.locator(previous < count ? '#serv-plus' : '#serv-minus').click();
      await verifyIngredients(page, count);
      const total = await page.locator('.macro-total[data-key="calories"]').textContent();
      expect(total).toBe(String(Math.round(perTray * count)));
      await expect(story).toHaveText(staticSource, { useInnerText: true });
    }
    await page.emulateMedia({ media: 'print' });
    await assertText(page, page.locator('#serv-unit'), lang === 'es' ? 'charolas' : 'trays');
    await expect(story).toContainText('116');
    await page.emulateMedia({ media: 'screen' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}
