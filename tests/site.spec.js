import { expect, test } from '@playwright/test';

test('renders a German learning page with interactive 3D cube controls', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /Zauberwuerfel loesen lernen/i })).toBeVisible();
  await expect(page.getByText('Anfaenger-Methode')).toBeVisible();
  await expect(page.locator('#cube-canvas')).toBeVisible();

  await expect.poll(() => page.evaluate(() => window.rubiksTutorState?.cubies)).toBe(27);
  const state = await page.evaluate(() => window.rubiksTutorState);
  expect(state.cubies).toBe(27);
  expect(state.steps).toBe(7);

  const canvasBox = await page.locator('#cube-canvas').boundingBox();
  expect(canvasBox.width).toBeGreaterThan(300);
  expect(canvasBox.height).toBeGreaterThan(300);

  const beforePixels = await page.evaluate(() => {
    const canvas = document.querySelector('#cube-canvas');
    const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return Boolean(context);
  });
  expect(beforePixels).toBe(true);

  await page.getByRole('button', { name: 'Weiter' }).click();
  await expect(page.getByRole('heading', { name: /2\. Weisse Ecken/i })).toBeVisible();

  const moveCountBefore = await page.evaluate(() => window.rubiksTutorState.moves);
  await page.getByRole('button', { name: 'R', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.rubiksTutorState.moves)).toBe(moveCountBefore + 1);
});

test('has mobile-friendly tutorial sections without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /1\. Weisses Kreuz/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Scramble' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'So liest du die Zuege' })).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflow).toBe(false);
});

test('keeps the 3D model visible while reading lesson steps on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => window.rubiksTutorState?.cubies)).toBe(27);

  await page.locator('#tutorial').scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 900);

  const mobileTutor = await page.evaluate(() => {
    const canvas = document.querySelector('#cube-canvas').getBoundingClientRect();
    const lesson = document.querySelector('.lesson-panel').getBoundingClientRect();
    const controls = document.querySelector('.cube-controls').getBoundingClientRect();
    const lessonGridStyle = getComputedStyle(document.querySelector('.lesson-grid'));
    return {
      canvasTop: canvas.top,
      canvasBottom: canvas.bottom,
      canvasHeight: canvas.height,
      controlsBottom: controls.bottom,
      lessonTop: lesson.top,
      lessonGridColumns: lessonGridStyle.gridTemplateColumns,
      viewportHeight: window.innerHeight
    };
  });

  expect(mobileTutor.canvasTop).toBeGreaterThanOrEqual(0);
  expect(mobileTutor.canvasBottom).toBeLessThan(mobileTutor.viewportHeight * 0.48);
  expect(mobileTutor.canvasHeight).toBeGreaterThan(220);
  expect(mobileTutor.controlsBottom).toBeLessThan(mobileTutor.viewportHeight * 0.55);
  expect(mobileTutor.lessonTop).toBeGreaterThan(mobileTutor.canvasBottom);
  expect(mobileTutor.lessonGridColumns.split(' ').length).toBe(1);
});
