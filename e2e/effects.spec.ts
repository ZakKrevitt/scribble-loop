import { expect, test } from '@playwright/test'

test('the mouse plays a pedal in effects mode and lets go on release', async ({ page }) => {
  await page.goto('/?debug')
  await page.getByRole('button', { name: 'Start with mouse' }).click()
  await page.getByRole('button', { name: 'Effects', exact: true }).click()
  const effects = () => page.evaluate(() => JSON.stringify((window as any).scribble.engine.effects))

  const box = (await page.locator('canvas').boundingBox())!
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.4, { steps: 5 })
  await expect.poll(effects).toContain('Filter')
  await page.screenshot({ path: '.impeccable/review/desktop-effects.png' })
  await page.mouse.up()
  await expect.poll(effects).toBe('{}')
})

test('drum timing snaps drums to the grid or leaves them free', async ({ page }) => {
  await page.goto('/?debug')
  await page.getByRole('button', { name: 'Start with mouse' }).click()
  const box = (await page.locator('canvas').boundingBox())!
  await page.mouse.move(box.x + box.width * 0.37, box.y + box.height * 0.9)
  await page.mouse.down()
  await page.waitForTimeout(400)
  await page.mouse.up()
  await expect(page.getByRole('status')).toHaveText('0 lines, 1 drum, 0 robots')

  await page.getByRole('combobox', { name: 'Drum timing' }).click()
  await page.getByRole('option', { name: 'Free' }).click()
  await expect(page.getByRole('combobox', { name: 'Drum timing' })).toHaveText(/Drums free/)
  await expect
    .poll(() => page.evaluate(() => (window as any).scribble.engine.stats.drums), { timeout: 8000 })
    .toBeGreaterThan(0)
})
