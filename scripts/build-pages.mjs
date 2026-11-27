/**
 * Build the real app UI into docs/ for GitHub Pages (showcase peek).
 * Usage: node scripts/build-pages.mjs
 */
import { spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const dist = join(root, 'dist')
const docs = join(root, 'docs')
const publicBrand = join(root, 'public', 'brand')

mkdirSync(publicBrand, { recursive: true })
for (const name of ['just-the-tip-logo.png', 'just-the-tip-logo.jpg']) {
  const fromBrand = join(root, 'brand', name)
  if (existsSync(fromBrand)) cpSync(fromBrand, join(publicBrand, name))
}

const env = {
  ...process.env,
  VITE_PAGES_BASE: '/Just-The-Tip/',
  VITE_PAGES_SHOWCASE: '1',
}

const build = spawnSync('npm', ['run', 'build'], {
  cwd: root,
  env,
  stdio: 'inherit',
  shell: true,
})
if (build.status !== 0) process.exit(build.status || 1)

// Keep markdown guides; replace static marketing index with the built app.
for (const name of readdirSync(docs)) {
  if (name.endsWith('.md')) continue
  if (name === '.nojekyll') continue
  rmSync(join(docs, name), { recursive: true, force: true })
}

cpSync(dist, docs, { recursive: true })
writeFileSync(join(docs, '.nojekyll'), '')
console.log('Pages app → docs/ (base /Just-The-Tip/)')
