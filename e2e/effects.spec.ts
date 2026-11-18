import { expect, test } from '@playwright/test'

test('the mouse plays a pedal in effects mode and lets go on release', async ({ page }) => {
  await page.goto('/?debug')
  await page.getByRole('button', { name: 'Start with mouse' }).click()
  await page.getByRole('group', { name: 'What the mouse does' }).getByText('Effects', { exact: true }).click()
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

  await page.getByRole('combobox', { name: 'Quantize drums' }).click()
  await page.getByRole('option', { name: 'Off', exact: true }).click()
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

  // The chord panel stays open while its fields change.
  const pick = async (field: string, option: string) => {
    if (!(await page.getByRole('dialog').count())) await page.getByRole('button', { name: 'Chords and arp' }).click()
    await page.getByRole('combobox', { name: field }).click()
    await page.getByRole('option', { name: option, exact: true }).click()
    await page.getByRole('listbox').waitFor({ state: 'detached' })
  }

  // A held flat line with no chord sounds once; a triad on it sounds three voices.
  await page.waitForTimeout(600)
  const plain = await notes()
  await pick('Chord', 'Triad')
  await page.waitForTimeout(3500)
  const chord = await notes()
  expect(chord - plain).toBeGreaterThanOrEqual(2)

  // The arpeggiator plucks a new note on every step, twice a step at 1/32.
  await pick('Arpeggiator', 'Up')
  await pick('Arpeggio speed', '1/32')
  const before = await notes()
  await page.waitForTimeout(1000)
  expect((await notes()) - before).toBeGreaterThan(12)
})


test('the echo pedal speeds up as the hand or mouse moves up', async ({ page }) => {
  await page.goto('/?debug')
  await page.getByRole('button', { name: 'Start with mouse' }).click()
  await page.getByRole('group', { name: 'What the mouse does' }).getByText('Effects', { exact: true }).click()
  await page.getByRole('combobox', { name: 'Mouse plays' }).click()
  await page.getByRole('option', { name: 'Mouse: Echo', exact: true }).click()
  await page.getByRole('listbox').waitFor({ state: 'detached' })
  const detail = () => page.evaluate(() => (window as any).scribble.engine.effects.Echo?.detail as string | undefined)

  const box = (await page.locator('canvas').boundingBox())!
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.9)
  await page.mouse.down()
  await expect.poll(detail).toBe('1/2')
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.05, { steps: 8 })
  await expect.poll(detail).toBe('1/32')
  await page.screenshot({ path: '.impeccable/review/desktop-effects.png' })
  await page.mouse.up()
  await expect.poll(detail).toBeUndefined()
})
