import { expect, test, type Page } from '@playwright/test'

/** Drag across the grid, given as fractions of the canvas. */
async function drag(page: Page, points: [number, number][]) {
  const box = (await page.locator('canvas').boundingBox())!
  const at = ([x, y]: [number, number]) => [box.x + x * box.width, box.y + y * box.height] as const
  await page.mouse.move(...at(points[0]))
  await page.mouse.down()
  for (const p of points.slice(1)) await page.mouse.move(...at(p), { steps: 6 })
  await page.mouse.up()
}

test('a drawn line and a held blob become a playing loop', async ({ page }) => {
  await page.goto('/?debug')
  await expect(page.getByText('Draw a loop in the air')).toBeVisible()
  await page.getByRole('button', { name: 'Start with mouse' }).click()
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible()

  await drag(page, [
    [0.15, 0.6],
    [0.3, 0.35],
    [0.45, 0.5],
  ])
  await expect(page.getByRole('status')).toHaveText('1 line, 0 drums, 0 robots')

  // Holding still drops a drum.
  const box = (await page.locator('canvas').boundingBox())!
  for (const [x, y] of [
    [0.2, 0.95],
    [0.45, 0.95],
    [0.33, 0.75],
  ]) {
    await page.mouse.move(box.x + x * box.width, box.y + y * box.height)
    await page.mouse.down()
    await page.waitForTimeout(250)
    await page.mouse.up()
  }
  await expect(page.getByRole('status')).toHaveText('1 line, 3 drums, 0 robots')

  // After a full pass of the loop the engine has scheduled notes and drums.
  await expect
    .poll(() => page.evaluate(() => (window as any).scribble.engine.stats), { timeout: 8000 })
    .toMatchObject({ notes: expect.any(Number), drums: expect.any(Number) })
  await expect
    .poll(() => page.evaluate(() => (window as any).scribble.engine.stats.drums), { timeout: 8000 })
    .toBeGreaterThanOrEqual(3)
  expect(await page.evaluate(() => (window as any).scribble.engine.stats.notes)).toBeGreaterThan(0)

  // A robot walks by itself and chirps when the playhead finds it.
  await page.getByRole('button', { name: 'Add a walking robot' }).click()
  await page.getByRole('button', { name: 'Add a walking robot' }).click()
  await expect(page.getByRole('status')).toHaveText('1 line, 3 drums, 2 robots')
  const where = () => page.evaluate(() => JSON.stringify((window as any).scribble.robots()))
  const before = await where()
  await expect.poll(where, { timeout: 4000 }).not.toBe(before)
  await expect
    .poll(() => page.evaluate(() => (window as any).scribble.engine.stats.chirps), { timeout: 20000 })
    .toBeGreaterThan(0)

  await page.screenshot({ path: '.impeccable/review/desktop.png' })
  await page.getByRole('button', { name: 'Undo' }).click()
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByRole('status')).toHaveText('1 line, 3 drums, 0 robots')

  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByRole('status')).toHaveText('1 line, 2 drums, 0 robots')
  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(page.getByRole('status')).toHaveText('0 lines, 0 drums, 0 robots')
  await page.getByRole('button', { name: 'Stop' }).click()
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()
})
