import { chromium } from 'playwright'
import path from 'node:path'
import fs from 'node:fs'

const URL = process.argv[2] || 'http://localhost:5173/projects/grep-vs-embeddings/'
const root = path.resolve(process.cwd())
const outDir = path.join(root, 'docs', 'shots')

async function main() {
  fs.mkdirSync(outDir, { recursive: true })
  const sandboxChromium = '/opt/pw-browsers/chromium'
  const launchOpts = fs.existsSync(sandboxChromium) ? { executablePath: sandboxChromium } : {}
  const browser = await chromium.launch(launchOpts)
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 })
  const errors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push('pageerror: ' + err.message))

  await page.goto(URL, { waitUntil: 'load' })
  await page.waitForTimeout(800)
  await page.locator('#playground').scrollIntoViewIfNeeded()

  await page.locator('#panel-question').getByRole('button', { name: 'Run grep only' }).click()
  await page.waitForTimeout(800)
  await page.locator('#playground').screenshot({ path: path.join(outDir, 'playground-grep-run.png') })

  await page.locator('#panel-question select').selectOption({
    label: 'What weekly running structure did the assistant suggest for half marathon training?',
  })
  await page.getByRole('textbox', { name: /Grep query/ }).fill('periodization')
  await page.locator('#panel-question').getByRole('button', { name: 'Run grep only' }).click()
  await page.waitForTimeout(500)
  await page.locator('#playground').screenshot({ path: path.join(outDir, 'playground-grep-miss.png') })

  await page.getByRole('textbox', { name: /Grep query/ }).fill('interval')
  const slider = page.locator('#panel-question input[type="range"]')
  await slider.fill('6')
  await page.locator('#panel-question').getByRole('button', { name: 'Run grep only' }).click()
  await page.waitForTimeout(800)
  await page.locator('#playground').screenshot({ path: path.join(outDir, 'playground-noise6.png') })

  await page.getByRole('tab', { name: 'Bring your own' }).click()
  await page.waitForTimeout(200)
  await page.locator('.byo-textarea').fill(
    'The invoice service retries failed webhook deliveries up to five times with exponential backoff.\n\nCustomer support escalations page the on-call engineer after two failed retries within an hour.\n\nThe nightly reconciliation job compares Stripe payouts against internal ledger entries.',
  )
  await page.getByPlaceholder('e.g. retry backoff').fill('webhook retries')
  await page.locator('#panel-byo').getByRole('button', { name: 'Run grep only' }).click()
  await page.waitForTimeout(500)
  await page.locator('#playground').screenshot({ path: path.join(outDir, 'playground-byo-run.png') })

  await page.getByRole('tab', { name: 'Paper-style questions' }).click()
  await page.waitForTimeout(200)
  await page.locator('#panel-question select').selectOption({
    label: 'What dog food does Otis eat, and where does the user get it now?',
  })
  const noise = page.locator('#panel-question input[type="range"]')
  await noise.fill('2')
  const loadBtn = page.locator('#panel-question').getByRole('button', { name: /Load embedding model/ })
  if (await loadBtn.count()) {
    await loadBtn.click()
    try {
      await page
        .locator('#panel-question')
        .getByRole('button', { name: 'Run grep and vector' })
        .waitFor({ timeout: 120000 })
      await page.locator('#panel-question').getByRole('button', { name: 'Run grep and vector' }).click()
      await page.waitForTimeout(4000)
    } catch (err) {
      errors.push('vector load: ' + (err instanceof Error ? err.message : String(err)))
    }
    await page.locator('#playground').screenshot({
      path: path.join(outDir, 'playground-vector-run.png'),
    })
    await page.getByRole('tab', { name: 'Bring your own' }).click()
    await page.waitForTimeout(300)
    await page.locator('#panel-byo').getByRole('button', { name: 'Run grep and vector' }).click()
    await page.waitForTimeout(3000)
    await page.locator('#playground').screenshot({
      path: path.join(outDir, 'playground-tab-persist.png'),
    })
  }

  await browser.close()
  fs.writeFileSync(
    path.join(outDir, 'playground-console.txt'),
    errors.length ? errors.join('\n') : 'No console errors during playground interaction test.',
  )
  console.log('PLAYGROUND_SHOTS_OK')
  console.log('errors:', errors.length)
}

main().catch((err) => {
  console.error('PLAYGROUND_SHOTS_FAILED', err)
  process.exit(1)
})
