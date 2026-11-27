/**
 * Windows exe / installer icon from public/brand/just-the-tip-logo.png
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const src = path.join(root, 'public', 'brand', 'just-the-tip-logo.png')
const buildDir = path.join(root, 'build')
const iconPng = path.join(buildDir, 'icon.png')
const iconIco = path.join(buildDir, 'icon.ico')

if (!fs.existsSync(src)) {
  throw new Error(`Missing logo: ${src}`)
}
fs.mkdirSync(buildDir, { recursive: true })

const sizes = [16, 32, 48, 256]
const tmpDir = path.join(buildDir, '.icon-tmp')
fs.mkdirSync(tmpDir, { recursive: true })

const ps = `
Add-Type -AssemblyName System.Drawing
$srcPath = ${JSON.stringify(src)}
$src = [System.Drawing.Image]::FromFile($srcPath)
$bg = [System.Drawing.Color]::FromArgb(255, 5, 13, 24)
function Write-Size([int]$size, [string]$dst) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear($bg)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $scale = [Math]::Min($size / $src.Width, $size / $src.Height)
  $w = [Math]::Max(1, [int][Math]::Round($src.Width * $scale))
  $h = [Math]::Max(1, [int][Math]::Round($src.Height * $scale))
  $x = [int](($size - $w) / 2)
  $y = [int](($size - $h) / 2)
  $g.DrawImage($src, $x, $y, $w, $h)
  $bmp.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}
${sizes
  .map(
    (s) =>
      `Write-Size ${s} ${JSON.stringify(path.join(tmpDir, `${s}.png`))}`,
  )
  .join('\n')}
$src.Dispose()
`

const run = spawnSync('powershell.exe', ['-NoProfile', '-Command', ps], {
  encoding: 'utf8',
})
if (run.status !== 0) {
  throw new Error(run.stderr || run.stdout || 'icon resize failed')
}

function pngToIco(images) {
  const headerSize = 6
  const entrySize = 16
  let offset = headerSize + entrySize * images.length
  const header = Buffer.alloc(headerSize)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  const entries = []
  const blobs = []
  for (const img of images) {
    const entry = Buffer.alloc(entrySize)
    entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0)
    entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1)
    entry.writeUInt8(0, 2)
    entry.writeUInt8(0, 3)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(img.png.length, 8)
    entry.writeUInt32LE(offset, 12)
    entries.push(entry)
    blobs.push(img.png)
    offset += img.png.length
  }
  return Buffer.concat([header, ...entries, ...blobs])
}

const images = sizes.map((size) => {
  const png = fs.readFileSync(path.join(tmpDir, `${size}.png`))
  return { width: size, height: size, png }
})
fs.copyFileSync(path.join(tmpDir, '256.png'), iconPng)
fs.writeFileSync(iconIco, pngToIco(images))
for (const size of sizes) fs.unlinkSync(path.join(tmpDir, `${size}.png`))
fs.rmdirSync(tmpDir)
console.log(`  ${path.relative(root, iconPng)}`)
console.log(`  ${path.relative(root, iconIco)}`)
