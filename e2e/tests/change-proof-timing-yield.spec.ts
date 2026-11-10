import { test, expect, type Page } from '@playwright/test';
import { showPhase, assertText } from './visual-assert';

const slug = 'enchiladas-de-espinaca-tia-angelina';
const round = (n: number) => n >= 10 ? Math.round(n) : Math.round(n * 10) / 10;
const amount = (base: number, factor: number) => {
  const n = base * factor;
  if (n !== 0 && Math.abs(n) < 0.1) return String(Number(n.toPrecision(2)));
  const r = round(n);
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
};

async function verifyScaled(page: Page, servings: number) {
  const data = await page.locator('#recipe-data').evaluate((node) => JSON.parse(node.textContent!));
  await assertText(page, page.locator('#serv-count'), String(servings));
  await assertText(page, page.locator('#macro-serv'), String(servings));
  const ingredients = await page.locator('.ing-amount').evaluateAll((nodes) =>
    nodes.map((node) => ({ idx: Number((node as HTMLElement).dataset.idx), value: node.textContent })));
  expect(ingredients.length).toBeGreaterThan(0);
  for (const node of ingredients) {
    const ing = data.ingredients[node.idx];
    if (ing.unit !== 'to taste') expect(node.value).toBe(amount(ing.amount, servings / data.defaultServings));
  }
  const groceries = await page.locator('.grocery-amount').evaluateAll((nodes) =>
    nodes.map((node) => ({ base: Number((node as HTMLElement).dataset.base), value: node.textContent })));
  expect(groceries.length).toBeGreaterThan(0);
  for (const node of groceries) expect(node.value).toBe(amount(node.base, servings / data.defaultServings));
  const macros = await page.locator('.macro-total').evaluateAll((nodes) =>
    nodes.map((node) => ({ key: (node as HTMLElement).dataset.key!, value: node.textContent })));
  expect(macros).toHaveLength(5);
  for (const node of macros) expect(node.value).toBe(String(round((data.macros[node.key] ?? 0) * servings)));
}

for (const lang of ['es', 'en']) {
  test(`${lang}: unknown timing and 72-taquito scaling`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const base = lang === 'es' ? '/recetas' : '/en/recipes';
    const unknown = lang === 'es' ? 'No especificado' : 'Not specified';
    await page.goto(`${base}/${slug}`);
    await showPhase(page, 'Unknown timing and original 72-taquito yield');
    await expect(page.locator('h1')).toContainText(/Angelina/);
    await expect(page.getByText(unknown, { exact: true })).toHaveCount(3);
    await expect(page.locator('article')).not.toContainText(/NaN|undefined|PT0M/);
    const jsonld = await page.locator('script[type="application/ld+json"]').evaluate((node) => JSON.parse(node.textContent!));
    for (const key of ['prepTime', 'cookTime', 'totalTime']) expect(jsonld).not.toHaveProperty(key);
    expect(jsonld.recipeYield).toBe('72 taquitos');
    await expect(page.locator('#serv-count').locator('..')).toContainText('taquitos');
    await verifyScaled(page, 72);
    await page.locator('#serv-minus').click();
    await verifyScaled(page, 71);
    await page.locator('#serv-plus').click();
    await verifyScaled(page, 72);
    await page.locator('#serv-plus').click();
    await verifyScaled(page, 72);

    await showPhase(page, 'Lower boundary and restored full-batch measurements');
    // Actual browser click handlers, in one task to avoid 71 auto-scroll roundtrips.
    await page.locator('#serv-minus').evaluate((button: HTMLButtonElement) => {
      for (let i = 0; i < 72; i++) button.click();
    });
    await verifyScaled(page, 1);
    await page.locator('#serv-plus').evaluate((button: HTMLButtonElement) => {
      for (let i = 0; i < 72; i++) button.click();
    });
    await verifyScaled(page, 72);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await page.goto(base);
    await showPhase(page, 'Localized unknown time on the recipe card');
    await expect(page.locator(`a[href="${base}/${slug}"]`)).toContainText(unknown);
    await page.locator(`a[href="${base}/${slug}"]`).click();
    await verifyScaled(page, 72);
    expect(errors).toEqual([]);
  });

  test(`${lang}: known recipe preserves durations and the 50 cap`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const base = lang === 'es' ? '/recetas' : '/en/recipes';
    await page.goto(`${base}/agua-de-jamaica`);
    await showPhase(page, 'Existing known recipe keeps timing and the 50 cap');
    const known = await page.locator('script[type="application/ld+json"]').evaluate((node) => JSON.parse(node.textContent!));
    expect([known.prepTime, known.cookTime, known.totalTime]).toEqual(['PT5M', 'PT10M', 'PT45M']);
    await expect(page.getByText('5 min', { exact: true })).toBeVisible();
    await expect(page.getByText('10 min', { exact: true })).toBeVisible();
    await expect(page.getByText('45 min', { exact: true })).toBeVisible();
    await verifyScaled(page, 6);
    await page.locator('#serv-plus').evaluate((button: HTMLButtonElement) => {
      for (let i = 0; i < 50; i++) button.click();
    });
    await verifyScaled(page, 50);
    await page.locator('#serv-minus').evaluate((button: HTMLButtonElement) => {
      for (let i = 0; i < 50; i++) button.click();
    });
    await verifyScaled(page, 1);
    expect(errors).toEqual([]);
  });
}
