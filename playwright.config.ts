import { defineConfig } from '@playwright/test'

const PORT = 4319

const args = [
  '--autoplay-policy=no-user-gesture-required',
  '--use-fake-ui-for-media-stream',
  '--use-fake-device-for-media-stream',
]
// A .y4m or .mjpeg clip of a hand, played to the page as if it were the webcam.
const handVideo = process.env.HAND_VIDEO

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    { name: 'mouse', testIgnore: /camera/, use: { launchOptions: { args } } },
    ...(handVideo
      ? [
          {
            name: 'camera',
            testMatch: /camera/,
            use: { launchOptions: { args: [...args, `--use-file-for-fake-video-capture=${handVideo}`] } },
          },
        ]
      : []),
  ],
  webServer: {
    command: `pnpm build && pnpm preview --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
