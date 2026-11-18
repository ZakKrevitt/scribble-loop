import { expect, test } from '@playwright/test'

// Runs only when HAND_VIDEO points at a clip of a hand (see playwright.config.ts).
test('the camera finds a hand and draws over it', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/?debug')
  await page.getByRole('button', { name: 'Start with camera' }).click()
  await expect(page.getByRole('switch', { name: 'Camera' })).toBeChecked({ timeout: 30_000 })
  await expect(page.locator('canvas')).not.toHaveAttribute('data-hands', '0', { timeout: 20_000 })
  // The face model finds the face too, for winks and the mouth.
  await expect(page.locator('canvas')).toHaveAttribute('data-face', 'true', { timeout: 20_000 })
  await page.waitForTimeout(600)
  await page.screenshot({ path: '.impeccable/review/camera.png' })
  expect(errors).toEqual([])
})
