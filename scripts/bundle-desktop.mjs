/**
 * Bundle the Node host for the Electron installer (no tsx at runtime).
 * ESM + createRequire so CJS deps (qrcode) can still require('fs').
 */
import * as esbuild from 'esbuild'
import { copyFileSync } from 'node:fs'

await esbuild.build({
  absWorkingDir: process.cwd(),
  entryPoints: ['server/host.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'desktop/host.mjs',
  logLevel: 'info',
  packages: 'bundle',
  banner: {
    js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
  },
})

// Keep root host.mjs in sync for local `main.mjs` Electron runs.
copyFileSync('desktop/host.mjs', 'host.mjs')
