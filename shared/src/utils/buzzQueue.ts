/**
 * Per-toy tip → buzz queues with a gap between jobs on the same toy.
 * Different toys play in parallel; the same toy stays in order.
 * Overflow drops the oldest waiting job across all toys.
 */

export type BuzzJob = {
  id: number
  intensity: number
  durationMs: number
  /** Built-in vibration pattern */
  pattern?: import('./patterns').PatternId
  /** Force this linked toy (column Test / explicit target) */
  toyId?: string
  /** Short label for status (e.g. "12.5 PLS") */
  label?: string
  /**
   * Local Simulate / force tip — always run even when settings.dryRun is on.
   * Wallet tips still honor dry-run.
   */
  forcePlay?: boolean
}

export type BuzzQueueStatus = {
  /** Playing + waiting */
  depth: number
  waiting: number
  busy: boolean
  playingId: number | null
  playingLabel: string | null
  /** How many toys are currently playing */
  playingToys: number
  message: string
}

export type BuzzQueueOptions = {
  /** Pause between jobs after one finishes on the same toy (default 450) */
  gapMs?: number
  /** Max queued jobs across all toys; overflow drops oldest (default 64) */
  maxQueue?: number
  run: (job: BuzzJob) => Promise<void>
  onStatus?: (s: BuzzQueueStatus) => void
}

type QueueItem = {
  job: BuzzJob
  resolve: () => void
  reject: (e: unknown) => void
}

type Lane = {
  q: QueueItem[]
  running: boolean
  playing: BuzzJob | null
}

const SHARED_LANE = '_'

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, Math.max(0, ms)))
}

export class BuzzQueue {
  private lanes = new Map<string, Lane>()
  private nextId = 0
  private stopDrain = false
  private gapMs: number
  private maxQueue: number
  private run: (job: BuzzJob) => Promise<void>
  private onStatus: (s: BuzzQueueStatus) => void

  constructor(opts: BuzzQueueOptions) {
    this.gapMs = Math.max(0, opts.gapMs ?? 450)
    this.maxQueue = Math.max(1, opts.maxQueue ?? 64)
    this.run = opts.run
    this.onStatus = opts.onStatus ?? (() => {})
  }

  get status(): BuzzQueueStatus {
    return this.snapshot(this.statusMessage())
  }

  /** Enqueue a buzz; promise settles when this job finishes or is dropped. */
  enqueue(input: Omit<BuzzJob, 'id'>): Promise<void> {
    this.stopDrain = false

    if (this.waitingCount() >= this.maxQueue) {
      this.dropOldestWaiting()
      this.emit(`dropped oldest · max ${this.maxQueue}`)
    }

    const job: BuzzJob = { ...input, id: ++this.nextId }
    const lane = this.laneFor(job.toyId)
    const done = new Promise<void>((resolve, reject) => {
      lane.q.push({ job, resolve, reject })
    })

    const waiting = this.waitingCount() - (lane.running ? 0 : 1)
    const playing = this.playingJobs().length
    this.emit(
      playing > 0 || waiting > 0
        ? `queued #${job.id}${job.label ? ` · ${job.label}` : ''}${
            waiting > 0 ? ` · ${waiting} waiting` : ''
          }`
        : `play #${job.id}${job.label ? ` · ${job.label}` : ''}`,
    )
    void this.drain(this.laneKey(job.toyId))
    return done
  }

  /** Drop jobs still waiting (current plays continue). */
  clearWaiting() {
    for (const lane of this.lanes.values()) {
      for (const item of lane.q) item.resolve()
      lane.q = []
    }
    this.emit(this.anyRunning() ? 'cleared waiting' : 'queue empty')
  }

  /**
   * Drop waiting jobs and stop taking more after current jobs exit.
   * Call with device.stopAll() so current buzzes end immediately.
   */
  clear() {
    this.stopDrain = true
    this.clearWaiting()
    for (const lane of this.lanes.values()) lane.playing = null
    this.emit('stopped')
  }

  setGapMs(ms: number) {
    this.gapMs = Math.max(0, ms)
  }

  setMaxQueue(n: number) {
    this.maxQueue = Math.max(1, Math.min(256, Math.round(n) || 64))
  }

  get gapMsValue() {
    return this.gapMs
  }

  get maxQueueValue() {
    return this.maxQueue
  }

  private laneKey(toyId?: string): string {
    return toyId || SHARED_LANE
  }

  private laneFor(toyId?: string): Lane {
    const key = this.laneKey(toyId)
    let lane = this.lanes.get(key)
    if (!lane) {
      lane = { q: [], running: false, playing: null }
      this.lanes.set(key, lane)
    }
    return lane
  }

  private waitingCount(): number {
    let n = 0
    for (const lane of this.lanes.values()) n += lane.q.length
    return n
  }

  private playingJobs(): BuzzJob[] {
    const out: BuzzJob[] = []
    for (const lane of this.lanes.values()) {
      if (lane.playing) out.push(lane.playing)
    }
    return out
  }

  private anyRunning(): boolean {
    for (const lane of this.lanes.values()) {
      if (lane.running) return true
    }
    return false
  }

  private dropOldestWaiting() {
    let oldest: { lane: Lane; item: QueueItem } | null = null
    for (const lane of this.lanes.values()) {
      const first = lane.q[0]
      if (!first) continue
      if (!oldest || first.job.id < oldest.item.job.id) {
        oldest = { lane, item: first }
      }
    }
    if (!oldest) return
    oldest.lane.q.shift()
    oldest.item.resolve()
  }

  private statusMessage(): string {
    const playing = this.playingJobs()
    const waiting = this.waitingCount()
    if (playing.length) {
      const labels = playing
        .map((job) => job.label || `#${job.id}`)
        .slice(0, 3)
      const extra = playing.length > 3 ? ` +${playing.length - 3}` : ''
      const waitBit = waiting ? ` · ${waiting} waiting` : ''
      return playing.length === 1
        ? `playing ${labels[0]}${waitBit}`
        : `playing ${playing.length} toys · ${labels.join(' · ')}${extra}${waitBit}`
    }
    if (waiting) return `${waiting} queued`
    return 'idle'
  }

  private snapshot(message: string): BuzzQueueStatus {
    const playing = this.playingJobs()
    const waiting = this.waitingCount()
    return {
      depth: waiting + playing.length,
      waiting,
      busy: this.anyRunning(),
      playingId: playing[0]?.id ?? null,
      playingLabel: playing.map((job) => job.label).filter(Boolean).join(' · ') || null,
      playingToys: playing.length,
      message,
    }
  }

  private emit(message: string) {
    this.onStatus(this.snapshot(message))
  }

  private async drain(key: string) {
    const lane = this.lanes.get(key)
    if (!lane || lane.running) return
    lane.running = true
    try {
      while (lane.q.length > 0) {
        if (this.stopDrain) break
        const item = lane.q.shift()
        if (!item) break
        lane.playing = item.job
        this.emit(this.statusMessage())
        try {
          await this.run(item.job)
          item.resolve()
        } catch (e) {
          item.reject(e)
        } finally {
          lane.playing = null
        }
        if (this.stopDrain) break
        if (lane.q.length > 0 && this.gapMs > 0) {
          this.emit(`gap ${this.gapMs}ms · ${this.waitingCount()} waiting`)
          await sleep(this.gapMs)
        }
      }
    } finally {
      lane.running = false
      lane.playing = null
      if (!this.anyRunning() && !this.stopDrain) this.emit('idle')
    }
  }
}
