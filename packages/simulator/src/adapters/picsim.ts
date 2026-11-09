import { picSimTargets } from '../picsim-targets.ts'
import { toIntelHex } from '../firmware-formats.ts'
import type { PicSimPlatform } from '../picsim-targets.ts'
import type { FirmwareImage, SimulationAdapter, SimulationSession, SimulatorSnapshot } from '../types'

type WorkerResponse =
  | { id: number, result: unknown, error?: never }
  | { id: number, error: string, result?: never }
  | { event: 'snapshot', snapshot: SimulatorSnapshot }
  | { event: 'failure', message: string }

const timeoutMs = 30000
let installedTargets: Promise<readonly string[]> | null = null

function createWorker(): Worker {
  if (typeof Worker === 'undefined') throw new Error('PICsim requires browser Web Workers')
  return new Worker(new URL('./picsim.worker.ts', import.meta.url), { type: 'module' })
}

function request<T>(worker: Worker, id: number, action: string, data: Record<string, unknown> = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => finish(new Error('PICsim did not respond')), timeoutMs)
    const onMessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data
      if (!('id' in message) || message.id !== id) return
      if (message.error) finish(new Error(message.error))
      else finish(undefined, message.result as T)
    }
    const onError = (event: ErrorEvent) => finish(new Error(event.message || 'PICsim worker failed'))
    const finish = (error?: Error, value?: T) => {
      clearTimeout(timeout)
      worker.removeEventListener('message', onMessage)
      worker.removeEventListener('error', onError)
      if (error) reject(error)
      else resolve(value as T)
    }
    worker.addEventListener('message', onMessage)
    worker.addEventListener('error', onError)
    worker.postMessage({ id, action, ...data })
  })
}

async function getInstalledTargets(): Promise<readonly string[]> {
  if (!installedTargets) {
    installedTargets = (async () => {
      const worker = createWorker()
      try {
        return await request<string[]>(worker, 1, 'targets', {
          targets: [...picSimTargets.pic16f, ...picSimTargets.pic18f]
        })
      } finally {
        worker.terminate()
      }
    })()
  }
  return installedTargets
}

class PicSimSession implements SimulationSession {
  private readonly target: string
  private readonly worker: Worker
  private current: SimulatorSnapshot = { cycles: 0, running: false, registers: {} }
  private loaded = false
  private disposed = false
  private requestId = 0
  private failure = ''

  constructor(target: string) {
    this.target = target
    this.worker = createWorker()
    this.worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
      const message = event.data
      if ('event' in message) {
        if (message.event === 'snapshot') this.current = message.snapshot
        if (message.event === 'failure') {
          this.failure = message.message
          this.current = { ...this.current, running: false }
        }
      }
    })
  }

  async loadFirmware(image: FirmwareImage): Promise<void> {
    this.ensureActive()
    const firmware = toIntelHex(image)
    this.loaded = false
    this.current = await this.call('load', {
      target: this.target,
      firmware: firmware.bytes.slice().buffer
    })
    this.loaded = true
    this.failure = ''
  }

  async start(): Promise<void> {
    this.ensureLoaded()
    this.current = await this.call('start')
  }

  async pause(): Promise<void> {
    this.ensureActive()
    if (!this.loaded) return
    this.current = await this.call('pause')
  }

  async step(count: number): Promise<void> {
    this.ensureLoaded()
    this.current = await this.call('step', { count })
  }

  async reset(): Promise<void> {
    this.ensureLoaded()
    this.current = await this.call('reset')
    this.failure = ''
  }

  snapshot(): SimulatorSnapshot {
    return this.failure ? { ...this.current, error: this.failure } : this.current
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.worker.terminate()
  }

  private async call(action: string, data: Record<string, unknown> = {}): Promise<SimulatorSnapshot> {
    return request<SimulatorSnapshot>(this.worker, ++this.requestId, action, data)
  }

  private ensureActive(): void {
    if (this.disposed) throw new Error('PICsim session has been disposed')
  }

  private ensureLoaded(): void {
    this.ensureActive()
    if (!this.loaded) throw new Error('Load PICsim firmware before execution')
  }
}

export class PicSimAdapter implements SimulationAdapter {
  readonly id = 'picsim'
  readonly platform: PicSimPlatform
  readonly targets: readonly string[]

  constructor(platform: PicSimPlatform) {
    this.platform = platform
    this.targets = picSimTargets[platform]
  }

  async isAvailable(): Promise<boolean> {
    return (await this.availableTargets()).length > 0
  }

  async availableTargets(): Promise<readonly string[]> {
    try {
      const available = new Set(await getInstalledTargets())
      return this.targets.filter(target => available.has(target))
    } catch {
      return []
    }
  }

  async createSession(target: string): Promise<SimulationSession> {
    const selected = target.toLowerCase()
    if (!this.targets.includes(selected) || !(await this.availableTargets()).includes(selected)) {
      throw new Error(`PICsim browser runtime cannot execute ${target}`)
    }
    return new PicSimSession(selected)
  }
}
