import { renvoFirmwareFormat, renvoTargets } from '../renvo-targets.ts'
import type { RenvoPlatform } from '../renvo-targets'
import { decodeRenvoResult } from '../renvo-result.ts'
import type { FirmwareImage, SimulationAdapter, SimulationSession, SimulatorSnapshot } from '../types'

type RenvoTarget = { id: string, name?: string }
type WorkerReply = { id: number, result?: unknown, error?: string }

const workerTimeoutMs = 30000
let targetManifest: Promise<Set<string>> | null = null

function createRenvoWorker(): Worker {
  if (typeof Worker === 'undefined') throw new Error('Renvo requires browser Web Workers')
  return new Worker(new URL('./renvo.worker.ts', import.meta.url), { type: 'module' })
}

function request(worker: Worker, operation: 'targets' | 'run', data: Record<string, unknown> = {}): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = 1
    const timeout = setTimeout(() => finish(new Error('Renvo runtime did not respond')), workerTimeoutMs)

    const finish = (error?: Error, result?: unknown) => {
      clearTimeout(timeout)
      worker.removeEventListener('message', onMessage)
      worker.removeEventListener('error', onError)
      if (error) reject(error)
      else resolve(result)
    }
    const onMessage = (event: MessageEvent<WorkerReply>) => {
      if (event.data.id !== id) return
      if (event.data.error) finish(new Error(event.data.error))
      else finish(undefined, event.data.result)
    }
    const onError = (event: ErrorEvent) => {
      finish(new Error(event.message || 'Renvo worker failed'))
    }

    worker.addEventListener('message', onMessage)
    worker.addEventListener('error', onError)
    worker.postMessage({ id, operation, ...data })
  })
}

async function getInstalledTargets(): Promise<Set<string>> {
  if (!targetManifest) {
    targetManifest = (async () => {
      const worker = createRenvoWorker()
      try {
        const entries = await request(worker, 'targets') as RenvoTarget[]
        if (!Array.isArray(entries)) throw new Error('Invalid Renvo target manifest')
        return new Set(entries.map(entry => entry.id.toLowerCase()))
      } finally {
        worker.terminate()
      }
    })()
  }
  return targetManifest
}

class RenvoSession implements SimulationSession {
  private readonly target: string
  private firmware: FirmwareImage | null = null
  private worker: Worker | null = null
  private running = false
  private disposed = false
  private instructions = 0
  private result: unknown = null
  private failure = ''
  private rejectRun: ((error: Error) => void) | null = null

  constructor(target: string) {
    this.target = target
  }

  async loadFirmware(image: FirmwareImage): Promise<void> {
    this.ensureActive()
    await this.pause()
    const expected = renvoFirmwareFormat(this.target)
    if (image.format !== expected) {
      throw new Error(`${this.target} requires .${expected} firmware for the Renvo browser runtime`)
    }
    this.firmware = image
    this.result = null
    this.instructions = 0
    this.failure = ''
  }

  async start(): Promise<void> {
    this.ensureLoaded()
    await this.runBudget(this.instructions + 100000)
  }

  async pause(): Promise<void> {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    this.running = false
    const reject = this.rejectRun
    this.rejectRun = null
    reject?.(new Error('Renvo execution interrupted'))
  }

  async step(instructions: number): Promise<void> {
    this.ensureLoaded()
    if (!Number.isSafeInteger(instructions) || instructions < 1 || instructions > 1000000) {
      throw new RangeError('Instruction count must be between 1 and 1,000,000')
    }
    await this.runBudget(this.instructions + instructions)
  }

  async reset(): Promise<void> {
    this.ensureLoaded()
    await this.pause()
    this.instructions = 0
    this.result = null
    this.failure = ''
  }

  snapshot(): SimulatorSnapshot {
    const snapshot = decodeRenvoResult(this.result)
    return {
      ...snapshot,
      running: this.running,
      ...(this.failure ? { error: this.failure } : {})
    }
  }

  resultJson(): unknown {
    return this.result
  }

  dispose(): void {
    void this.pause()
    this.disposed = true
    this.firmware = null
  }

  private async runBudget(budget: number): Promise<void> {
    this.ensureLoaded()
    if (this.running) throw new Error('Renvo execution is already in progress')
    if (!Number.isSafeInteger(budget) || budget > 100000000) throw new RangeError('Renvo budget exceeds limit')

    const worker = createRenvoWorker()
    this.worker = worker
    this.running = true
    this.failure = ''

    try {
      const operation = request(worker, 'run', {
        target: this.target,
        format: this.firmware!.format,
        bytes: this.firmware!.bytes.slice().buffer,
        instructions: budget
      })
      const interrupted = new Promise<never>((_, reject) => { this.rejectRun = reject })
      this.result = await Promise.race([operation, interrupted])
      this.instructions = budget
    } catch (error) {
      this.failure = error instanceof Error ? error.message : String(error)
      throw error
    } finally {
      this.rejectRun = null
      worker.terminate()
      if (this.worker === worker) this.worker = null
      this.running = false
    }
  }

  private ensureActive(): void {
    if (this.disposed) throw new Error('Renvo simulation session has been disposed')
  }

  private ensureLoaded(): void {
    this.ensureActive()
    if (!this.firmware) throw new Error('Load Renvo firmware before executing')
  }
}

export class RenvoAdapter implements SimulationAdapter {
  readonly id = 'renvo'
  readonly platform: RenvoPlatform
  readonly targets: readonly string[]

  constructor(platform: RenvoPlatform) {
    this.platform = platform
    this.targets = renvoTargets[platform]
  }

  async isAvailable(): Promise<boolean> {
    return (await this.availableTargets()).length > 0
  }

  async availableTargets(): Promise<readonly string[]> {
    try {
      const installed = await getInstalledTargets()
      return this.targets.filter(target => installed.has(target))
    } catch {
      return []
    }
  }

  async createSession(target: string): Promise<SimulationSession> {
    const selected = target.toLowerCase()
    if (!this.targets.includes(selected)) {
      throw new Error(`Unsupported Renvo target: ${target}`)
    }
    const installed = await getInstalledTargets()
    if (!installed.has(selected)) {
      throw new Error(`Installed Renvo runtime does not contain ${target}`)
    }
    return new RenvoSession(selected)
  }
}
