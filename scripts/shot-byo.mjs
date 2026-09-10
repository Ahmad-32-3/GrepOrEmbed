import { chromium } from 'playwright'
import path from 'node:path'
import fs from 'node:fs'

// Captures the playground's "Bring your own" panel: empty state and a populated
// grep result. Closes the Design Tester's byo evidence gap. Needs `npm run dev`
// on 5173. Does not spawn its own server (can't hang).
const URL = process.argv[2] || 'http://localhost:5173/'
const root = path.resolve(process.cwd())
const outDir = path.join(root, 'docs', 'shots', 'sections')

const SAMPLE = `The invoice service retries failed webhook deliveries up to five times with exponential backoff.

Customer support escalations page the on-call engineer after two failed retries within an hour.

The nightly reconciliation job compares Stripe payouts against internal ledger entries.`

async function shotPlayground(page, name) {
  const el = await page.$('#playground')
  await el.scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  await el.screenshot({ path: path.join(outDir, name) })
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true })
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 })
  await page.goto(URL, { waitUntil: 'load' })
  await page.waitForTimeout(1000)

  // Switch to the "Bring your own" tab
  await page.getByRole('tab', { name: /bring your own/i }).click()
  await page.waitForTimeout(400)
  await shotPlayground(page, 'byo-empty.png')

  // Populate: paste multi-chunk text + a literal query grep will find
  await page.locator('.byo-textarea').fill(SAMPLE)
  await page.getByRole('textbox', { name: /search query/i }).fill('webhook').catch(async () => {
    // fallback: the query input has no accessible name binding; target by placeholder
    await page.locator('input[placeholder*="retry"]').fill('webhook')
  })
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: /run search/i }).click()
  await page.waitForTimeout(600)
  await shotPlayground(page, 'byo-populated.png')

  await browser.close()
  console.log('BYO_OK')
}

main().catch((e) => {
  console.error('BYO_FAILED', e)
  process.exitCode = 1
})
