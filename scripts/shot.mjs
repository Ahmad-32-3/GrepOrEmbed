import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
import path from 'node:path'
import fs from 'node:fs'

const PORT = 4173
const BASE = '/projects/grep-vs-embeddings/'
const PREVIEW = `http://localhost:${PORT}${BASE}`
const root = path.resolve(process.cwd())

function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      fetch(url)
        .then(() => resolve())
        .catch(() => {
          if (Date.now() > deadline) reject(new Error('timeout waiting for server'))
          else setTimeout(tryOnce, 300)
        })
    }
    tryOnce()
  })
}

async function main() {
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true, // Windows resolves npx -> npx.cmd only through a shell
  })

  let serverOut = ''
  server.stdout.on('data', (d) => (serverOut += d.toString()))
  server.stderr.on('data', (d) => (serverOut += d.toString()))

  try {
    await waitForServer(PREVIEW, 20000)

    fs.mkdirSync(path.join(root, 'docs', 'shots'), { recursive: true })

    // Use the sandbox's prebuilt chromium if present (Linux base image),
    // otherwise fall back to Playwright's own managed download (Windows/local).
    const sandboxChromium = '/opt/pw-browsers/chromium'
    const launchOpts = fs.existsSync(sandboxChromium)
      ? { executablePath: sandboxChromium }
      : {}
    const browser = await chromium.launch(launchOpts)

    const consoleErrors = []

    // Desktop
    {
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(`[desktop] ${msg.text()}`)
      })
      page.on('pageerror', (err) => consoleErrors.push(`[desktop pageerror] ${err.message}`))
      await page.goto(PREVIEW, { waitUntil: 'networkidle' })
      await page.waitForTimeout(800)
      await page.screenshot({ path: path.join(root, 'docs/shots/desktop-full.png'), fullPage: true })
      await page.close()
    }

    // Mobile
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(`[mobile] ${msg.text()}`)
      })
      page.on('pageerror', (err) => consoleErrors.push(`[mobile pageerror] ${err.message}`))
      await page.goto(PREVIEW, { waitUntil: 'networkidle' })
      await page.waitForTimeout(800)
      await page.screenshot({ path: path.join(root, 'docs/shots/mobile-full.png'), fullPage: true })
      await page.close()
    }

    await browser.close()

    fs.writeFileSync(
      path.join(root, 'docs/shots/console-report.txt'),
      consoleErrors.length ? consoleErrors.join('\n') : 'No console errors or page errors detected.',
    )

    console.log('SHOTS_OK')
    console.log(`console errors: ${consoleErrors.length}`)
  } catch (err) {
    console.error('SHOTS_FAILED', err)
    console.error('server output so far:\n' + serverOut)
    process.exitCode = 1
  } finally {
    try {
      server.kill('SIGKILL')
    } catch {
      /* already gone */
    }
    if (process.platform === 'win32' && server.pid) {
      spawn('taskkill', ['/PID', String(server.pid), '/T', '/F'], {
        shell: true,
        stdio: 'ignore',
      })
    }
  }
}

main()
