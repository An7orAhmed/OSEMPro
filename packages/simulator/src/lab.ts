import type { PlatformId, SimulatorSnapshot } from './types'
import type { LabEngineStatus, LabRequest, LabResponse, LabSmokeResult } from './lab-protocol'

export class BrowserEngineLab {
  private readonly worker: Worker
  private readonly pending = new Map<number, { resolve: (value: unknown) => void, reject: (error: Error) => void }>()
  private nextId = 0
  private disposed = false

  onSnapshot: ((snapshot: SimulatorSnapshot) => void) | null = null
  onFailure: ((message: string) => void) | null = null

  constructor() {
    if (typeof Worker === 'undefined') throw new Error('Engine lab requires a browser')
    this.worker = new Worker(new URL('./lab.worker.ts', import.meta.url), { type: 'module' })
    this.worker.addEventListener('message', event => {
      const message = event.data as LabResponse
      if ('event' in message) {
        if (message.event === 'snapshot') this.onSnapshot?.(message.snapshot)
        if (message.event === 'failure') this.onFailure?.(message.message)
        return
      }

      const request = this.pending.get(message.id)
      if (!request) return
      this.pending.delete(message.id)
      if (message.error) request.reject(new Error(message.error))
      else request.resolve(message.result)
    })
    this.worker.addEventListener('error', event => {
      this.failPending(new Error(event.message || 'Browser engine worker failed'))
    })
  }

  inspect(): Promise<LabEngineStatus[]> {
    return this.call({ action: 'inspect' })
  }

  open(platform: PlatformId, engine: string, target: string): Promise<SimulatorSnapshot> {
    return this.call({ action: 'open', platform, engine, target })
  }

  load(name: string, bytes: Uint8Array): Promise<SimulatorSnapshot> {
    return this.call({ action: 'load', name, bytes })
  }

  start(): Promise<SimulatorSnapshot> {
    return this.call({ action: 'start' })
  }

  pause(): Promise<SimulatorSnapshot> {
    return this.call({ action: 'pause' })
  }

  step(count: number): Promise<SimulatorSnapshot> {
    return this.call({ action: 'step', count })
  }

  reset(): Promise<SimulatorSnapshot> {
    return this.call({ action: 'reset' })
  }

  snapshot(): Promise<SimulatorSnapshot> {
    return this.call({ action: 'snapshot' })
  }

  smoke(platform: PlatformId, engine: string, target: string): Promise<LabSmokeResult> {
    return this.call({ action: 'smoke', platform, engine, target })
  }

  async closeSession(): Promise<void> {
    await this.call({ action: 'close' })
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.worker.terminate()
    this.failPending(new Error('Engine lab was disposed'))
  }

  private call<T>(request: Omit<LabRequest, 'id'>): Promise<T> {
    if (this.disposed) return Promise.reject(new Error('Engine lab was disposed'))
    const id = ++this.nextId
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: value => resolve(value as T), reject })
      this.worker.postMessage({ ...request, id })
    })
  }

  private failPending(error: Error): void {
    for (const request of this.pending.values()) request.reject(error)
    this.pending.clear()
    this.onFailure?.(error.message)
  }
}
