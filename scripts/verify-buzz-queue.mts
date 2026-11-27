/**
 * Per-toy buzz queues: different toys overlap, same toy stays serial.
 * Run: npx tsx scripts/verify-buzz-queue.mts
 */
import { BuzzQueue } from '../shared/src/utils/buzzQueue.ts'

function fail(msg: string): never {
  console.error('FAIL:', msg)
  process.exit(1)
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) fail(msg)
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

{
  const active = new Set<string>()
  let overlap = false
  const q = new BuzzQueue({
    gapMs: 0,
    run: async (job) => {
      const id = job.toyId || '_'
      if (active.size && ![...active].every((x) => x === id)) overlap = true
      if (active.has(id)) fail(`same toy ${id} overlapped`)
      active.add(id)
      await sleep(60)
      active.delete(id)
    },
  })
  const t0 = Date.now()
  await Promise.all([
    q.enqueue({ intensity: 1, durationMs: 60, toyId: 'a', label: 'a' }),
    q.enqueue({ intensity: 1, durationMs: 60, toyId: 'b', label: 'b' }),
  ])
  const elapsed = Date.now() - t0
  assert(overlap, 'two toys played at the same time')
  assert(elapsed < 110, `parallel toys should finish near 60ms (took ${elapsed}ms)`)
}

{
  const q = new BuzzQueue({
    gapMs: 0,
    run: async () => {
      await sleep(50)
    },
  })
  const t0 = Date.now()
  await Promise.all([
    q.enqueue({ intensity: 1, durationMs: 50, toyId: 'same', label: '1' }),
    q.enqueue({ intensity: 1, durationMs: 50, toyId: 'same', label: '2' }),
  ])
  const elapsed = Date.now() - t0
  assert(elapsed >= 90, `same toy must serialize (took ${elapsed}ms)`)
}

{
  let maxPlaying = 0
  const q = new BuzzQueue({
    gapMs: 0,
    onStatus: (s) => {
      if (s.playingToys > maxPlaying) maxPlaying = s.playingToys
    },
    run: async () => {
      await sleep(40)
    },
  })
  await Promise.all([
    q.enqueue({ intensity: 1, durationMs: 40, toyId: 'x', label: 'x' }),
    q.enqueue({ intensity: 1, durationMs: 40, toyId: 'y', label: 'y' }),
    q.enqueue({ intensity: 1, durationMs: 40, toyId: 'z', label: 'z' }),
  ])
  assert(maxPlaying === 3, `status playingToys should hit 3 (got ${maxPlaying})`)
}

console.log('OK per-toy buzz queue')
console.log('  covered: parallel toys, serial same toy, playingToys status')
