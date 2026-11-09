import type { SimulationAdapter, SimulationSession, FirmwareImage, SimulatorSnapshot } from '../types'
import type * as AVRRuntime from 'avr8js'

const flashBytes = 32768
const chunkInstructions = 10000

class AVRSession implements SimulationSession {
  private readonly runtime: typeof AVRRuntime
  private cpu: AVRRuntime.CPU | null = null
  private ports: Record<string, AVRRuntime.AVRIOPort> = {}
  private image: FirmwareImage | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private running = false
  private disposed = false
  private instructionCount = 0
  private output = ''
  private failure = ''

  constructor(runtime: typeof AVRRuntime) {
    this.runtime = runtime
  }

  async loadFirmware(image: FirmwareImage): Promise<void> {
    this.ensureActive()
    await this.pause()
    if (image.format === 'elf') {
      throw new Error('avr8js supports Intel HEX and flat binary, not ELF')
    }

    const flash = new Uint8Array(flashBytes)
    flash.fill(0xff)
    const segments = image.format === 'hex' ? image.segments : [{ address: 0, bytes: image.bytes }]
    for (const segment of segments) {
      if (segment.address < 0 || segment.address + segment.bytes.length > flashBytes) {
        throw new Error('Firmware exceeds ATmega328P flash memory')
      }
      flash.set(segment.bytes, segment.address)
    }

    this.cpu = new this.runtime.CPU(new Uint16Array(flash.buffer))
    new this.runtime.AVRTimer(this.cpu, this.runtime.timer0Config)
    new this.runtime.AVRTimer(this.cpu, this.runtime.timer1Config)
    new this.runtime.AVRTimer(this.cpu, this.runtime.timer2Config)
    this.ports = {
      B: new this.runtime.AVRIOPort(this.cpu, this.runtime.portBConfig),
      C: new this.runtime.AVRIOPort(this.cpu, this.runtime.portCConfig),
      D: new this.runtime.AVRIOPort(this.cpu, this.runtime.portDConfig)
    }
    const serial = new this.runtime.AVRUSART(this.cpu, this.runtime.usart0Config, 16000000)
    serial.onByteTransmit = value => {
      this.output = (this.output + String.fromCharCode(value)).slice(-4096)
    }
    this.image = image
    this.instructionCount = 0
    this.output = ''
    this.failure = ''
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
    const cpu = this.cpu
    if (!cpu) return { cycles: 0, running: false, registers: {} }
    const registers: Record<string, number> = { PC: cpu.pc * 2, SP: cpu.SP, SREG: cpu.data[0x5f] }
    for (let index = 0; index < 32; index += 1) registers[`R${index}`] = cpu.data[index]
    const gpio: Record<string, number> = {}
    for (const [name, port] of Object.entries(this.ports)) {
      gpio[name] = cpu.data[port.portConfig.PORT]
    }
    return {
      cycles: cpu.cycles,
      running: this.running,
      registers,
      instructions: this.instructionCount,
      gpio,
      serial: this.output,
      ...(this.failure ? { error: this.failure } : {})
    }
  }

  setPin(portName: 'B' | 'C' | 'D', index: number, value: boolean): void {
    this.ensureLoaded()
    if (!Number.isInteger(index) || index < 0 || index > 7) throw new RangeError('GPIO index must be 0 to 7')
    this.ports[portName].setPin(index, value)
  }

  dispose(): void {
    void this.pause()
    this.disposed = true
    this.cpu = null
    this.image = null
    this.ports = {}
  }

  private executeInstructions(count: number): void {
    if (!Number.isSafeInteger(count) || count < 1 || count > 1000000) {
      throw new RangeError('Instruction count must be between 1 and 1,000,000')
    }
    const cpu = this.cpu!
    for (let index = 0; index < count; index += 1) {
      this.runtime.avrInstruction(cpu)
      cpu.tick()
    }
    this.instructionCount += count
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
    if (this.disposed) throw new Error('AVR simulation session has been disposed')
  }

  private ensureLoaded(): void {
    this.ensureActive()
    if (!this.cpu) throw new Error('Load AVR firmware before executing')
  }
}

export class AVR8jsAdapter implements SimulationAdapter {
  readonly id = 'avr8js'
  readonly platform = 'avr'
  readonly targets = ['atmega328p', 'atmega328']

  async isAvailable(): Promise<boolean> {
    return true
  }

  async createSession(target: string): Promise<SimulationSession> {
    if (!this.targets.includes(target.toLowerCase())) {
      throw new Error(`Unsupported avr8js target: ${target}`)
    }
    const runtime = await import('avr8js')
    return new AVRSession(runtime)
  }
}
