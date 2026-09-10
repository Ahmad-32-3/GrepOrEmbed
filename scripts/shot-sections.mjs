import { chromium } from 'playwright'
import path from 'node:path'
import fs from 'node:fs'

// Captures crisp 2x crops of each major surface from the running dev server,
// for design-review scoring. Assumes `npm run dev` is up on 5173 (pass a URL arg
// to override). Does NOT spawn its own server, so it can't hang on cleanup.
const URL = process.argv[2] || 'http://localhost:5173/projects/grep-vs-embeddings/'
const root = path.resolve(process.cwd())
const outDir = path.join(root, 'docs', 'shots', 'sections')

// region ids in App.tsx order + hero (banner) + playground result state
const targets = [
  { id: 'hero', selector: 'header, [class*="hero"]' },
  { id: 'how-it-works', selector: '#how-it-works' },
  { id: 'comparison', selector: '#comparison' },
  { id: 'finding', selector: '#finding' },
  { id: 'stress-test', selector: '#stress-test' },
  { id: 'playground', selector: '#playground' },
  { id: 'zoom-out', selector: '#zoom-out' },
  { id: 'honesty', selector: '#honesty' },
  { id: 'takeaways', selector: '#takeaways' },
  { id: 'footer', selector: 'footer.page-footer' },
]

async function main() {
  fs.mkdirSync(outDir, { recursive: true })
  const browser = await chromium.launch()
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  })
  await page.goto(URL, { waitUntil: 'load' })
  await page.waitForTimeout(1200) // let fonts + charts settle

  const report = []
  for (const t of targets) {
    const el = await page.$(t.selector)
    if (!el) {
      report.push(`${t.id}: NOT FOUND (${t.selector})`)
      continue
    }
    try {
      await el.scrollIntoViewIfNeeded()
      await page.waitForTimeout(250)
      await el.screenshot({ path: path.join(outDir, `${t.id}.png`) })
      report.push(`${t.id}: ok`)
    } catch (e) {
      report.push(`${t.id}: ERROR ${e.message}`)
    }
  }

  fs.writeFileSync(path.join(outDir, '_report.txt'), report.join('\n'))
  await browser.close()
  console.log('SECTIONS_OK')
  console.log(report.join('\n'))
}

main().catch((e) => {
  console.error('SECTIONS_FAILED', e)
  process.exitCode = 1
})
