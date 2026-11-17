// Captures the screens used for design review into .impeccable/review/.
// Run `pnpm build && pnpm preview --port 4319` first.
import { chromium } from '@playwright/test'

const url = 'http://localhost:4319/?debug'
const out = '.impeccable/review'
const args = ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
// Set HAND_VIDEO to a .y4m clip of a hand to capture the camera view as well.
if (process.env.HAND_VIDEO) args.push(`--use-file-for-fake-video-capture=${process.env.HAND_VIDEO}`)
const browser = await chromium.launch({ args })

async function play(page, start = 'Start with mouse') {
  await page.getByRole('button', { name: start }).click()
  if (start !== 'Start with mouse') {
    await page.getByRole('button', { name: 'Camera', pressed: true }).waitFor({ timeout: 30000 })
    await page.locator('canvas:not([data-hands="0"])').waitFor({ timeout: 20000 })
  }
  const box = await page.locator('canvas').boundingBox()
  const at = (x, y) => [box.x + x * box.width, box.y + y * box.height]
  const line = async (pts) => {
    await page.mouse.move(...at(...pts[0]))
    await page.mouse.down()
    for (const p of pts.slice(1)) await page.mouse.move(...at(...p), { steps: 8 })
    await page.mouse.up()
  }
  await line([[0.08, 0.62], [0.2, 0.4], [0.3, 0.52], [0.42, 0.3]])
  await line([[0.55, 0.2], [0.7, 0.26], [0.92, 0.12]])
  for (const [x, y, hold] of [[0.06, 0.93, 500], [0.31, 0.93, 500], [0.56, 0.93, 500], [0.81, 0.93, 500], [0.19, 0.75, 150], [0.69, 0.75, 150], [0.44, 0.42, 100], [0.9, 0.58, 100], [0.5, 0.08, 60], [0.62, 0.08, 60], [0.75, 0.08, 60]]) {
    await page.mouse.move(...at(x, y))
    await page.mouse.down()
    await page.waitForTimeout(hold)
    await page.mouse.up()
  }
  await page.getByRole('button', { name: 'Add a walking robot' }).click()
  await page.getByRole('button', { name: 'Add a walking robot' }).click()
  await page.mouse.move(5, 5)
  await page.waitForTimeout(900)
}

for (const [name, viewport] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport })
  await page.goto(url)
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${out}/${name}-start.png` })
  await play(page)
  await page.screenshot({ path: `${out}/${name}.png` })
  if (name === 'desktop') {
    // Freeze the audio clock on the first half of a step while the playhead is over the pink line,
    // so the sounding line's swell and glint are on screen.
    await page.waitForFunction(() => {
      const engine = window.scribble.engine
      const pos = engine.position()
      if (pos === null) return false
      const step = pos * 32
      if (step % 1 > 0.25 || step < 4 || step > 12) return false
      engine.ctx.suspend()
      return true
    }, null, { timeout: 15000, polling: 'raf' })
    await page.waitForTimeout(250)
    await page.screenshot({ path: `${out}/desktop-beat.png` })
    await page.evaluate(() => window.scribble.engine.ctx.resume())
    await page.getByRole('combobox', { name: 'Scale' }).click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${out}/desktop-select.png` })
    await page.keyboard.press('Escape')
    await page.getByRole('listbox').waitFor({ state: 'hidden' })
    await page.getByRole('combobox', { name: 'Scale' }).focus()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.waitForTimeout(200)
    console.log('focus on:', await page.evaluate(() => {
      const el = document.activeElement
      return `${el.tagName} "${el.getAttribute('aria-label') ?? el.textContent.trim()}" focus-visible=${el.matches(':focus-visible')}`
    }))
    await page.screenshot({ path: `${out}/desktop-focus.png` })
  }
  await page.close()
}
if (process.env.HAND_VIDEO) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(url)
  await play(page, 'Start with camera')
  await page.screenshot({ path: `${out}/camera.png` })
  await page.close()
}
await browser.close()
