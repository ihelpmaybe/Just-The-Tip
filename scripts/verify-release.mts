/**
 * Deterministic release gate for local operator builds.
 *
 *   npm run verify:release
 *
 * Starts Vite if needed for UI smoke, then tears it down.
 * Network-dependent live wallet/toy checks stay in docs/RELEASE_CHECKLIST.md.
 */
import { spawn, type ChildProcess } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'

const BASE = process.env.SMOKE_URL || 'http://127.0.0.1:5173/'
const ROOT = process.cwd()

type Step = { name: string; cmd: string; args: string[]; env?: NodeJS.ProcessEnv }

const DETERMINISTIC: Step[] = [
  { name: 'typecheck:shared', cmd: 'npm', args: ['run', 'typecheck:shared'] },
  { name: 'typecheck', cmd: 'npm', args: ['run', 'typecheck'] },
  { name: 'verify:ladder', cmd: 'npm', args: ['run', 'verify:ladder'] },
  { name: 'verify:buzz-queue', cmd: 'npm', args: ['run', 'verify:buzz-queue'] },
  { name: 'verify:wallets', cmd: 'npm', args: ['run', 'verify:wallets'] },
  { name: 'verify:eip681', cmd: 'npm', args: ['run', 'verify:eip681'] },
  { name: 'verify:pools', cmd: 'npm', args: ['run', 'verify:pools'] },
  { name: 'verify:saved-toys', cmd: 'npm', args: ['run', 'verify:saved-toys'] },
  { name: 'verify:coin-rewards', cmd: 'npm', args: ['run', 'verify:coin-rewards'] },
  { name: 'verify:overlay', cmd: 'npm', args: ['run', 'verify:overlay'] },
  {
    name: 'verify:test-coverage',
    cmd: 'npm',
    args: ['run', 'verify:coverage'],
  },
  { name: 'build', cmd: 'npm', args: ['run', 'build'] },
]

function run(
  step: Step,
  opts?: { inherit?: boolean },
): Promise<number> {
  return new Promise((resolve) => {
    console.log(`\n── ${step.name} ──`)
    const child = spawn(step.cmd, step.args, {
      cwd: ROOT,
      shell: true,
      env: { ...process.env, ...step.env },
      stdio: opts?.inherit === false ? 'pipe' : 'inherit',
    })
    child.on('exit', (code) => resolve(code ?? 1))
    child.on('error', () => resolve(1))
  })
}

async function isUp(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) })
    return res.ok
  } catch {
    return false
  }
}

async function waitForServer(url: string, ms = 60_000): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < ms) {
    if (await isUp(url)) return true
    await delay(800)
  }
  return false
}

async function main() {
  console.log('\n=== Just The Tip verify:release ===\n')
  console.log(`Base URL for smoke: ${BASE}`)

  for (const step of DETERMINISTIC) {
    const code = await run(step)
    if (code !== 0) {
      console.error(`\nverify:release failed at ${step.name} (exit ${code})`)
      process.exit(code)
    }
  }

  let server: ChildProcess | null = null
  let startedByUs = false
  try {
    if (!(await isUp(BASE))) {
      console.log('\n── starting vite (npm run dev) for smoke ──')
      server = spawn('npm', ['run', 'dev'], {
        cwd: ROOT,
        shell: true,
        stdio: 'pipe',
        env: process.env,
      })
      startedByUs = true
      server.stdout?.on('data', (buf) => {
        const t = String(buf)
        if (/Local:|ready/i.test(t)) process.stdout.write(t)
      })
      server.stderr?.on('data', (buf) => {
        const t = String(buf)
        if (/error/i.test(t)) process.stderr.write(t)
      })
      const ready = await waitForServer(BASE)
      if (!ready) {
        console.error('Vite did not become ready in time')
        process.exit(1)
      }
    } else {
      console.log('\n── reusing already-running server ──')
    }

    const smokeCode = await run({
      name: 'smoke:ui',
      cmd: 'npm',
      args: ['run', 'smoke:ui'],
      env: {
        ...process.env,
        SMOKE_URL: BASE,
        SMOKE_CYCLES: process.env.SMOKE_CYCLES || '2',
      },
    })
    if (smokeCode !== 0) {
      console.error(`\nverify:release failed at smoke:ui (exit ${smokeCode})`)
      process.exit(smokeCode)
    }

    const walletsCode = await run({
      name: 'smoke:wallets',
      cmd: 'npm',
      args: ['run', 'smoke:wallets'],
      env: { ...process.env, SMOKE_URL: BASE },
    })
    if (walletsCode !== 0) {
      console.error(
        `\nverify:release failed at smoke:wallets (exit ${walletsCode})`,
      )
      process.exit(walletsCode)
    }
  } finally {
    if (startedByUs && server && !server.killed) {
      console.log('\n── stopping vite ──')
      if (process.platform === 'win32') {
        spawn('npm', ['run', 'stop'], { cwd: ROOT, shell: true, stdio: 'inherit' })
        await delay(1500)
      } else {
        server.kill('SIGTERM')
        await delay(500)
      }
    }
  }

  console.log('\n=== verify:release OK ===')
  console.log(
    'Next: docs/RELEASE_CHECKLIST.md — production host, real toy, real tip, OBS.\n',
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
