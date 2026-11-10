import { expect, type Locator, type Page } from '@playwright/test';

/** Persistent phase/counter overlays make recorded assertions self-documenting. */
export async function showPhase(page: Page, label: string) {
  await page.evaluate((text) => {
    let overlay = document.getElementById('e2e-phase');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'e2e-phase';
      overlay.style.cssText = 'position:fixed;top:8px;right:8px;z-index:99999;background:#3c332a;color:#fff;padding:8px 12px;font:14px sans-serif;pointer-events:none;border-radius:8px';
      document.body.append(overlay);
    }
    overlay.textContent = text;
  }, label);
}

/** Real auto-retrying text assertion, followed by a layout-neutral highlight. */
export async function assertText(page: Page, locator: Locator, text: string) {
  await expect(locator).toHaveText(text);
  await locator.scrollIntoViewIfNeeded();
  await locator.evaluate((node) => {
    node.animate(
      [{ boxShadow: '0 0 0 3px #65835b' }, { boxShadow: '0 0 0 6px #65835b' }, { boxShadow: 'none' }],
      { duration: 600 },
    );
    const overlay = document.getElementById('e2e-phase');
    if (overlay) {
      const count = Number(overlay.dataset.passed || 0) + 1;
      overlay.dataset.passed = String(count);
      overlay.textContent = `${overlay.textContent?.replace(/ · \d+ passed$/, '')} · ${count} passed`;
    }
  });
  // Capture an assertion frame as well as the continuously recorded video.
  await page.screenshot({ animations: 'allow' });
}
