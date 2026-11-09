import type { FirmwareImage, SimulationAdapter, SimulationSession, SimulatorSnapshot } from '../types'

type RenvoTarget = { id: string, name?: string }
type WorkerReply = { id: number, result?: unknown, error?: string }

function createRenvoWorker(): Worker {
  if (typeof Worker === 'undefined') throw new Error('Renvo requires browser Web Workers')
  return new Worker(new URL('./renvo.worker.ts', import.meta.url), { type: 'module' })
}

function request(worker: Worker, operation: 'targets' | 'run', data: Record<string, unknown> = {}): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = 1
    const onMessage = (event: MessageEvent<WorkerReply>) => {
      if (event.data.id !== id) return
      cleanup()
      if (event.data.error) reject(new Error(event.data.error))
      else resolve(event.data.result)
    }
    const onError = (event: ErrorEvent) => {
      cleanup()
      reject(new Error(event.message || 'Renvo worker failed'))
    }
    const cleanup = () => {
      worker.removeEventListener('message', onMessage)
      worker.removeEventListener('error', onError)
    }
    worker.addEventListener('message', onMessage)
    worker.addEventListener('error', onError)
    worker.postMessage({ id, operation, ...data })
  })
}

class RenvoSession implements SimulationSession {
  private readonly target: string
  private firmware: FirmwareImage | null = null
  private worker: Worker | null = null
  private running = false
  private disposed = false
  private instructions = 0
  private result: Record<string, unknown> = {}
  private failure = ''
  private rejectRun: ((error: Error) => void) | null = null

  constructor(target: string) {
    this.target = target
  }

  async loadFirmware(image: FirmwareImage): Promise<void> {
    this.ensureActive()
    await this.pause()
    if (image.format !== 'hex' && image.format !== 'elf') {
      throw new Error('Renvo browser API accepts Intel HEX or ELF firmware')
    }
    this.firmware = image
    this.result = {}
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
    this.result = {}
    this.failure = ''
  }

  snapshot(): SimulatorSnapshot {
    const rawRegisters = this.result.registers
    const registers: Record<string, number> = {}
    if (rawRegisters && typeof rawRegisters === 'object' && !Array.isArray(rawRegisters)) {
      for (const [name, value] of Object.entries(rawRegisters)) {
        if (typeof value === 'number' && Number.isFinite(value)) registers[name] = value
      }
    }
    const ticks = this.result.ticks
    return {
      cycles: typeof ticks === 'number' ? ticks : 0,
      running: this.running,
      registers,
      ...(typeof this.result.instructions === 'number' ? { instructions: this.result.instructions } : {}),
      ...(this.failure ? { error: this.failure } : {})
    }
  }

  resultJson(): Readonly<Record<string, unknown>> {
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
      const result = await Promise.race([operation, interrupted]) as Record<string, unknown>
      this.result = result
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

const platformTargets: Record<'avr' | 'pic' | 'stm32' | 'esp32', readonly string[]> = {
  avr: ['atmega328pb'],
  pic: ['pic16f15376'],
  stm32: ['stm32f103c8t6', 'stm32f411re', 'stm32l432kc', 'stm32h743zi'],
  esp32: ['esp32s3', 'esp32c6', 'esp32p4']
}

export class RenvoAdapter implements SimulationAdapter {
  readonly id = 'renvo'
  readonly platform: 'avr' | 'pic' | 'stm32' | 'esp32'
  readonly targets: readonly string[]

  constructor(platform: 'avr' | 'pic' | 'stm32' | 'esp32') {
    this.platform = platform
    this.targets = platformTargets[platform]
  }

  async isAvailable(): Promise<boolean> {
    try {
      const worker = createRenvoWorker()
      try {
        const targets = await request(worker, 'targets') as RenvoTarget[]
        return this.targets.some(target => targets.some(item => item.id.toLowerCase() === target))
      } finally {
        worker.terminate()
      }
    } catch {
      return false
    }
  }

  async createSession(target: string): Promise<SimulationSession> {
    if (!this.targets.includes(target.toLowerCase())) {
      throw new Error(`Unsupported Renvo target: ${target}`)
    }
    const worker = createRenvoWorker()
    try {
      const available = await request(worker, 'targets') as RenvoTarget[]
      if (!available.some(item => item.id.toLowerCase() === target.toLowerCase())) {
        throw new Error(`Renvo component does not include target ${target}`)
      }
    } finally {
      worker.terminate()
    }
    return new RenvoSession(target)
  }
}
