#!/usr/bin/env node
// Renders the ads in marketing/ to PNG with the Chrome or Edge already on this
// machine, so making an ad needs no new package.
//
//   node marketing/scripts/render.mjs marketing/ads/<folder> [more…]
//   node marketing/scripts/render.mjs marketing/ads/<folder>/feed.html
//   node marketing/scripts/render.mjs serve
//   node marketing/scripts/render.mjs shot <url> <out.png> [390x844] [scale]
//
// While it runs it serves the repo root over HTTP rather than opening files
// directly. A file:// page may not fetch or mask with another file, which is
// how ad.js draws the Phosphor icons, and serving the root lets an ad link the
// real mark and app artwork by path instead of keeping copies that drift.
//
// Set AD_BROWSER to a browser's path if neither Chrome nor Edge is found.
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, mkdtempSync, rmSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const PORT = Number(process.env.AD_PORT) || 4178

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
}

const BROWSERS = [
  process.env.AD_BROWSER,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean)

function findBrowser() {
  const found = BROWSERS.find((path) => existsSync(path))
  if (!found) throw new Error('No Chrome or Edge found. Set AD_BROWSER to a browser’s path.')
  return found
}

function serve() {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    let file = resolve(ROOT, '.' + path)
    // Nothing outside the repo is served, and nothing that holds secrets.
    if (!file.startsWith(ROOT + sep) || /[\\/]\.env/.test(file) || /[\\/]\.git[\\/]/.test(file)) {
      res.writeHead(403).end()
      return
    }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
    try {
      const body = await readFile(file)
      res.writeHead(200, { 'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream' })
      res.end(body)
    } catch {
      res.writeHead(404).end()
    }
  })
  return new Promise((done) => server.listen(PORT, '127.0.0.1', () => done(server)))
}

// A headless browser with a profile of its own, so a Chrome the owner already
// has open is neither reused nor disturbed.
function screenshot(browser, url, out, width, height, scale = 1) {
  const profile = mkdtempSync(join(tmpdir(), 'ekkly-ad-'))
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${profile}`,
    `--force-device-scale-factor=${scale}`,
    `--window-size=${width},${height}`,
    // Long enough for web fonts and images to arrive before the picture is taken.
    '--virtual-time-budget=6000',
    `--screenshot=${out}`,
    url,
  ]
  return new Promise((done, fail) => {
    const child = spawn(browser, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let errors = ''
    child.stderr.on('data', (chunk) => (errors += chunk))
    child.on('error', fail)
    child.on('close', () => {
      try { rmSync(profile, { recursive: true, force: true }) } catch {}
      if (existsSync(out)) done()
      else fail(new Error(`The browser made no picture of ${url}\n${errors.slice(-800)}`))
    })
  })
}

// Headless Chrome sometimes leaves the window a few pixels off the size asked
// for, and Meta wants exact sizes, so the picture is checked and fitted.
async function fit(out, width, height) {
  const meta = await sharp(out).metadata()
  if (meta.width === width && meta.height === height) return
  const buffer = await sharp(out).resize(width, height, { fit: 'cover', position: 'top' }).png().toBuffer()
  await sharp(buffer).toFile(out)
}

function adSize(html) {
  const match = readFileSync(html, 'utf8').match(/<meta\s+name=["']ad-size["']\s+content=["'](\d+)x(\d+)["']/i)
  return match ? [Number(match[1]), Number(match[2])] : [1080, 1350]
}

function adFiles(target) {
  const path = resolve(target)
  if (!existsSync(path)) throw new Error(`Not found: ${target}`)
  if (statSync(path).isFile()) return [path]
  return readdirSync(path)
    .filter((name) => name.endsWith('.html'))
    .map((name) => join(path, name))
}

const urlFor = (file) => `http://127.0.0.1:${PORT}/` + relative(ROOT, file).split(sep).join('/')

async function render(targets) {
  const browser = findBrowser()
  const files = targets.flatMap(adFiles)
  if (!files.length) throw new Error('No .html ads in ' + targets.join(', '))
  const server = await serve()
  try {
    for (const file of files) {
      const [width, height] = adSize(file)
      const outDir = join(dirname(file), 'out')
      mkdirSync(outDir, { recursive: true })
      const out = join(outDir, basename(file, '.html') + '.png')
      await screenshot(browser, urlFor(file), out, width, height)
      await fit(out, width, height)
      console.log(`${relative(ROOT, out)}  ${width}×${height}`)
    }
  } finally {
    server.close()
  }
}

async function shot([url, out, size = '390x844', scale = '3']) {
  if (!url || !out) throw new Error('Usage: render.mjs shot <url> <out.png> [390x844] [scale]')
  const [width, height] = size.split('x').map(Number)
  mkdirSync(dirname(resolve(out)), { recursive: true })
  await screenshot(findBrowser(), url, resolve(out), width, height, Number(scale))
  await fit(resolve(out), width * Number(scale), height * Number(scale))
  console.log(`${out}  ${width * scale}×${height * scale}`)
}

const [command, ...rest] = process.argv.slice(2)
try {
  if (!command) {
    console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 9).join('\n'))
  } else if (command === 'serve') {
    await serve()
    console.log(`Previewing the repo at http://127.0.0.1:${PORT}/marketing/ads/ — Ctrl+C to stop.`)
  } else if (command === 'shot') {
    await shot(rest)
  } else {
    await render([command, ...rest])
  }
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
