/** Renders public/icon.svg to the PNG icons the web app manifest needs. Run: npx tsx scripts/make-icons.ts */
import { readFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const svg = await readFile('public/icon.svg', 'utf8')
const browser = await chromium.launch()
const page = await browser.newPage()
const render = async (size: number, file: string, padding = 0) => {
  await page.setViewportSize({ width: size, height: size })
  const inner = size - padding * 2
  await page.setContent(
    `<body style="margin:0;background:#3730a3;display:grid;place-items:center;width:${size}px;height:${size}px">` +
      `<div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div></body>`,
  )
  await page.screenshot({ path: `public/${file}`, omitBackground: padding === 0 && file !== 'apple-touch-icon.png' })
  console.log(`public/${file}`)
}
await render(192, 'icon-192.png')
await render(512, 'icon-512.png')
await render(512, 'icon-maskable-512.png', 56) // keep the artwork inside the maskable safe zone
await render(180, 'apple-touch-icon.png')
await browser.close()
