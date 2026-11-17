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

  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('menuitem', { name: /^Drum timing/ }).click()
  await page.getByRole('menuitemradio', { name: 'Free' }).click()
  await expect.poll(() => page.evaluate(() => (window as any).scribble.engine['settings'].drumGrid)).toBe('Free')
  await expect
    .poll(() => page.evaluate(() => (window as any).scribble.engine.stats.drums), { timeout: 8000 })
    .toBeGreaterThan(0)
})

test('chords stack notes on a line and the arpeggiator plucks them in turn', async ({ page }) => {
  await page.goto('/?debug')
  await page.getByRole('button', { name: 'Start with mouse' }).click()
  const box = (await page.locator('canvas').boundingBox())!
  await page.mouse.move(box.x + box.width * 0.05, box.y + box.height * 0.5)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.95, box.y + box.height * 0.5, { steps: 20 })
  await page.mouse.up()
  const notes = () => page.evaluate(() => (window as any).scribble.engine.stats.notes as number)

  const pick = async (menu: RegExp, option: string) => {
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.getByRole('menuitem', { name: menu }).click()
    await page.getByRole('menuitemradio', { name: option, exact: true }).click()
    // Picking leaves the menu open for more changes; close it fully before the next one.
    while (await page.getByRole('menu').count()) await page.keyboard.press('Escape')
  }

  // A held flat line with no chord sounds once; a triad on it sounds three voices.
  await page.waitForTimeout(600)
  const plain = await notes()
  await pick(/^Chord/, 'Triad')
  await page.waitForTimeout(3500)
  const chord = await notes()
  expect(chord - plain).toBeGreaterThanOrEqual(2)

  // The arpeggiator plucks a new note on every step, twice a step at 1/32.
  await pick(/^Arpeggiator/, 'Up')
  await pick(/^Arpeggio speed/, '1/32')
  const before = await notes()
  await page.waitForTimeout(1000)
  expect((await notes()) - before).toBeGreaterThan(12)
})

