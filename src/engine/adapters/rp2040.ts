import type { RP2040 } from 'rp2040js'
import type { SimulationAdapter, SimulationSession, SimulatorSnapshot, FirmwareImage } from '../types'

const flashBase = 0x10000000
const chunkInstructions = 10000

class RP2040Session implements SimulationSession {
  private readonly cpu: RP2040
  private image: FirmwareImage | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private running = false
  private disposed = false
  private instructions = 0
  private output = ''
  private failure = ''

  constructor(cpu: RP2040) {
    this.cpu = cpu
    for (const uart of cpu.uart) {
      uart.onByte = value => {
        this.output = (this.output + String.fromCharCode(value)).slice(-4096)
      }
    }
  }

  async loadFirmware(image: FirmwareImage): Promise<void> {
    this.ensureActive()
    await this.pause()
    if (image.format === 'elf') throw new Error('RP2040js ELF loading is not supported yet')
    this.cpu.reset()
    const segments = image.format === 'hex' ? image.segments : [{ address: flashBase, bytes: image.bytes }]
    for (const segment of segments) {
      const offset = segment.address - flashBase
      if (offset < 0 || offset + segment.bytes.length > this.cpu.flash.length) {
        throw new Error('RP2040 firmware must reside in XIP flash at 0x10000000')
      }
      this.cpu.flash.set(segment.bytes, offset)
    }
    this.cpu.core.PC = flashBase
    this.instructions = 0
    this.output = ''
    this.failure = ''
    this.image = image
  }

  async start(): Promise<void> {
    this.ensureLoaded()
    if (this.running) return
    this.running = true
    this.schedule()
  }

  async pause(): Promise<void> {
    this.running = false
    if (this.timer !== null) clearTimeout(this.timer)
    this.timer = null
  }

  async step(instructions: number): Promise<void> {
    this.ensureLoaded()
    await this.pause()
    this.executeInstructions(instructions)
  }

  async reset(): Promise<void> {
    this.ensureLoaded()
    await this.loadFirmware(this.image!)
  }

  snapshot(): SimulatorSnapshot {
    const core = this.cpu.core
    const registers: Record<string, number> = { PC: core.PC, SP: core.SP, LR: core.LR, xPSR: core.xPSR }
    for (let index = 0; index < 13; index += 1) registers[`R${index}`] = core.registers[index]
    const gpio: Record<string, number> = {}
    this.cpu.gpio.forEach((pin, index) => {
      gpio[`GPIO${index}`] = Number(pin.value)
    })
    return {
      cycles: core.cycles,
      running: this.running,
      registers,
      instructions: this.instructions,
      gpio,
      serial: this.output,
      ...(this.failure ? { error: this.failure } : {})
    }
  }

  setPin(index: number, value: boolean): void {
    this.ensureLoaded()
    if (!Number.isInteger(index) || index < 0 || index >= this.cpu.gpio.length) {
      throw new RangeError('Invalid RP2040 GPIO index')
    }
    this.cpu.gpio[index].setInputValue(value)
  }

  dispose(): void {
    void this.pause()
    this.disposed = true
    this.image = null
  }

  private executeInstructions(count: number): void {
    if (!Number.isSafeInteger(count) || count < 1 || count > 1000000) {
      throw new RangeError('Instruction count must be between 1 and 1,000,000')
    }
    const { core } = this.cpu
    const clock = this.cpu.clock as typeof this.cpu.clock & {
      tick(deltaNanos: number): void
      readonly nanosToNextAlarm: number
    }
    for (let index = 0; index < count; index += 1) {
      if (core.waiting) {
        const untilAlarm = clock.nanosToNextAlarm
        if (untilAlarm <= 0) throw new Error('RP2040 CPU is waiting for an external event')
        clock.tick(untilAlarm)
      } else {
        const cycles = core.executeInstruction()
        clock.tick(cycles * 8)
      }
      this.instructions += 1
    }
  }

  private schedule(): void {
    this.timer = setTimeout(() => {
      if (!this.running || this.disposed) return
      try {
        this.executeInstructions(chunkInstructions)
        this.schedule()
      } catch (error) {
        this.failure = error instanceof Error ? error.message : String(error)
        void this.pause()
      }
    }, 0)
  }

  private ensureActive(): void {
    if (this.disposed) throw new Error('RP2040 simulation session has been disposed')
  }

  private ensureLoaded(): void {
    this.ensureActive()
    if (!this.image) throw new Error('Load RP2040 firmware before executing')
  }
}

export class RP2040jsAdapter implements SimulationAdapter {
  readonly id = 'rp2040js'
  readonly platform = 'rp2040'
  readonly targets = ['rp2040', 'raspberry-pi-pico']

  async isAvailable(): Promise<boolean> {
    return true
  }

  async createSession(target: string): Promise<SimulationSession> {
    if (!this.targets.includes(target.toLowerCase())) throw new Error(`Unsupported RP2040 target: ${target}`)
    const { RP2040 } = await import('rp2040js')
    return new RP2040Session(new RP2040())
  }
}
