import type { FirmwareImage, SimulationAdapter, SimulationSession, SimulatorSnapshot } from '../types.ts'

type Pic12Model = {
  id: string
  words: number
}

export const pic12Targets: readonly Pic12Model[] = [
  { id: 'pic12f675', words: 1024 },
  { id: 'pic12f683', words: 2048 }
]

const carry = 0x01
const digitCarry = 0x02
const zero = 0x04

export class PIC12Session implements SimulationSession {
  private readonly flash: Uint16Array
  private readonly programmed: Uint8Array
  private readonly ram = new Uint8Array(256)
  private readonly stack: number[] = []
  private pc = 0
  private w = 0
  private cycles = 0
  private instructions = 0
  private latch = 0
  private tris = 0x3f
  private inputPins = 0
  private option = 0xff
  private loaded = false
  private running = false
  private disposed = false
  private timer: ReturnType<typeof setTimeout> | null = null
  private error = ''
  private stopReason = ''

  constructor(model: Pic12Model) {
    this.flash = new Uint16Array(model.words)
    this.programmed = new Uint8Array(model.words)
    this.flash.fill(0x3fff)
    this.resetCpu()
  }

  async loadFirmware(image: FirmwareImage): Promise<void> {
    this.ensureActive()
    await this.pause()
    if (image.format === 'elf') throw new Error('PIC12F requires Intel HEX or raw BIN firmware')

    this.loaded = false
    this.flash.fill(0x3fff)
    this.programmed.fill(0)
    let programWords = 0
    const segments = image.format === 'bin' ? [{ address: 0, bytes: image.bytes }] : image.segments
    for (const segment of segments) {
      if (segment.address % 2 || segment.bytes.length % 2) {
        throw new Error('PIC12F firmware must contain aligned 14-bit instruction words')
      }
      if (segment.address >= 0x4000 && segment.address + segment.bytes.length <= 0x4020) continue
      if (segment.address + segment.bytes.length > this.flash.length * 2) {
        throw new Error('PIC12F firmware exceeds selected program memory')
      }
      for (let offset = 0; offset < segment.bytes.length; offset += 2) {
        const instruction = segment.bytes[offset] | segment.bytes[offset + 1] << 8
        if (instruction > 0x3fff) throw new Error('Invalid PIC12F 14-bit instruction word')
        const wordAddress = (segment.address + offset) / 2
        this.flash[wordAddress] = instruction
        this.programmed[wordAddress] = 1
        programWords += 1
      }
    }
    if (!programWords) throw new Error('PIC12F firmware contains no executable program words')
    this.loaded = true
    this.resetCpu()
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

  async step(count: number): Promise<void> {
    this.ensureLoaded()
    if (!Number.isSafeInteger(count) || count < 1 || count > 1000000) {
      throw new RangeError('PIC12F instruction count must be between 1 and 1,000,000')
    }
    await this.pause()
    this.execute(count)
  }

  async reset(): Promise<void> {
    this.ensureLoaded()
    await this.pause()
    this.resetCpu()
  }

  snapshot(): SimulatorSnapshot {
    const pins: Record<string, number> = {}
    const gpioValue = this.readRegister(0x05)
    for (let pin = 0; pin < 6; pin += 1) pins[`GP${pin}`] = gpioValue >> pin & 1
    return {
      cycles: this.cycles,
      running: this.running,
      instructions: this.instructions,
      registers: {
        W: this.w,
        PC: this.pc,
        STATUS: this.ram[0x03],
        FSR: this.ram[0x04],
        PCLATH: this.ram[0x0a],
        TMR0: this.ram[0x01],
        GPIO: gpioValue,
        TRISIO: this.tris
      },
      gpio: pins,
      ...(this.error ? { error: this.error } : {}),
      ...(this.stopReason ? { stopReason: this.stopReason } : {})
    }
  }

  dispose(): void {
    void this.pause()
    this.disposed = true
    this.loaded = false
  }

  private ensureActive(): void {
    if (this.disposed) throw new Error('PIC12F session was disposed')
  }

  private ensureLoaded(): void {
    this.ensureActive()
    if (!this.loaded) throw new Error('Load PIC12F firmware before executing')
  }

  private resetCpu(): void {
    this.ram.fill(0)
    this.ram[0x03] = 0x18
    this.stack.length = 0
    this.pc = 0
    this.w = 0
    this.cycles = 0
    this.instructions = 0
    this.latch = 0
    this.tris = 0x3f
    this.option = 0xff
    this.error = ''
    this.stopReason = ''
  }

  private bankAddress(file: number): number {
    return file | ((this.ram[0x03] & 0x20) << 2)
  }

  private readRegister(address: number, indirect = false): number {
    const offset = address & 0x7f
    if (offset === 0 && !indirect) {
      const pointer = this.ram[0x04] | (this.ram[0x03] & 0x80)
      return pointer & 0x7f ? this.readRegister(pointer, true) : 0
    }
    if (offset === 0x02) return this.pc & 0xff
    if (offset === 0x03 || offset === 0x04 || offset === 0x0a || offset === 0x0b) {
      return this.ram[offset]
    }
    if (offset === 0x05) {
      return address & 0x80 ? this.tris : (this.latch & ~this.tris | this.inputPins & this.tris) & 0x3f
    }
    if (address === 0x81) return this.option
    return this.ram[address & 0xff]
  }

  private writeRegister(address: number, value: number, indirect = false): void {
    const offset = address & 0x7f
    value &= 0xff
    if (offset === 0 && !indirect) {
      const pointer = this.ram[0x04] | (this.ram[0x03] & 0x80)
      if (pointer & 0x7f) this.writeRegister(pointer, value, true)
      return
    }
    if (offset === 0x02) {
      this.pc = ((this.ram[0x0a] & 0x1f) << 8 | value) % this.flash.length
      this.cycles += 1
      return
    }
    if (offset === 0x03 || offset === 0x04 || offset === 0x0a || offset === 0x0b) {
      this.ram[offset] = value
      return
    }
    if (offset === 0x05) {
      if (address & 0x80) this.tris = value | 0x08
      else this.latch = value & 0x3f
      return
    }
    if (address === 0x81) {
      this.option = value
      return
    }
    this.ram[address & 0xff] = value
  }

  private setFlag(flag: number, enabled: boolean): void {
    this.ram[0x03] = enabled ? this.ram[0x03] | flag : this.ram[0x03] & ~flag
  }

  private setZero(value: number): void {
    this.setFlag(zero, (value & 0xff) === 0)
  }

  private addition(a: number, b: number): number {
    const sum = a + b
    this.setFlag(carry, sum > 0xff)
    this.setFlag(digitCarry, (a & 15) + (b & 15) > 15)
    this.setZero(sum)
    return sum & 0xff
  }

  private subtraction(a: number, b: number): number {
    const value = a - b
    this.setFlag(carry, a >= b)
    this.setFlag(digitCarry, (a & 15) >= (b & 15))
    this.setZero(value)
    return value & 0xff
  }

  private skip(): void {
    this.pc = (this.pc + 1) % this.flash.length
    this.cycles += 1
  }

  private push(value: number): void {
    if (this.stack.length >= 8) this.stack.shift()
    this.stack.push(value)
  }

  private pop(): number {
    if (!this.stack.length) throw new Error('PIC12F return stack underflow')
    return this.stack.pop()!
  }

  private execute(count: number): void {
    try {
      for (let i = 0; i < count; i += 1) {
        if (this.stopReason) break
        if (this.pc >= this.flash.length) throw new Error('PIC12F program counter exceeded flash')
        const opcode = this.flash[this.pc]
        if (!this.programmed[this.pc]) {
          this.stopReason = 'Reached unprogrammed flash'
          this.running = false
          break
        }
        this.pc = (this.pc + 1) % this.flash.length
        this.instructions += 1
        this.cycles += 1
        this.instruction(opcode)
      }
    } catch (cause) {
      this.error = cause instanceof Error ? cause.message : String(cause)
      this.running = false
      throw cause
    }
  }

  private instruction(opcode: number): void {
    const file = opcode & 0x7f
    const address = this.bankAddress(file)
    const destinationFile = Boolean(opcode & 0x80)
    const literal = opcode & 0xff
    const current = () => this.readRegister(address)
    const write = (value: number) => {
      if (destinationFile) this.writeRegister(address, value)
      else this.w = value & 0xff
    }

    if (opcode === 0x0000) return
    if (opcode === 0x0008 || opcode === 0x0009) {
      this.pc = this.pop()
      this.cycles += 1
      if (opcode === 0x0009) this.ram[0x0b] |= 0x80
      return
    }
    if (opcode === 0x0063) {
      this.stopReason = 'CPU sleep'
      this.running = false
      return
    }
    if (opcode === 0x0064) {
      this.ram[0x03] |= 0x18
      return
    }
    if (opcode === 0x0062) {
      this.option = this.w
      return
    }
    if (opcode === 0x0065) {
      this.tris = this.w | 0x08
      return
    }
    if ((opcode & 0x3f80) === 0x0080) {
      this.writeRegister(address, this.w)
      return
    }
    if (opcode === 0x0100) {
      this.w = 0
      this.setZero(0)
      return
    }
    if ((opcode & 0x3f80) === 0x0180) {
      this.writeRegister(address, 0)
      this.setZero(0)
      return
    }
    const byteOp = opcode & 0x3f00
    if (byteOp >= 0x0200 && byteOp <= 0x0f00) {
      const value = current()
      let result = value
      switch (byteOp) {
        case 0x0200: result = this.subtraction(value, this.w); break
        case 0x0300: result = value - 1 & 0xff; this.setZero(result); break
        case 0x0400: result = value | this.w; this.setZero(result); break
        case 0x0500: result = value & this.w; this.setZero(result); break
        case 0x0600: result = value ^ this.w; this.setZero(result); break
        case 0x0700: result = this.addition(value, this.w); break
        case 0x0800: this.setZero(result); break
        case 0x0900: result = ~value & 0xff; this.setZero(result); break
        case 0x0a00: result = value + 1 & 0xff; this.setZero(result); break
        case 0x0b00: result = value - 1 & 0xff; if (result === 0) this.skip(); break
        case 0x0c00: result = value >> 1 | (this.ram[0x03] & carry) << 7; this.setFlag(carry, Boolean(value & 1)); break
        case 0x0d00: result = (value << 1 | this.ram[0x03] & carry) & 0xff; this.setFlag(carry, Boolean(value & 0x80)); break
        case 0x0e00: result = value >> 4 | (value & 0x0f) << 4; break
        case 0x0f00: result = value + 1 & 0xff; if (result === 0) this.skip(); break
      }
      write(result)
      return
    }
    const bitOp = opcode & 0x3c00
    if (bitOp >= 0x1000 && bitOp <= 0x1c00) {
      const bit = 1 << (opcode >> 7 & 7)
      const value = current()
      if (bitOp === 0x1000) this.writeRegister(address, value & ~bit)
      if (bitOp === 0x1400) this.writeRegister(address, value | bit)
      if (bitOp === 0x1800 && !(value & bit)) this.skip()
      if (bitOp === 0x1c00 && value & bit) this.skip()
      return
    }
    if ((opcode & 0x3800) === 0x2000 || (opcode & 0x3800) === 0x2800) {
      if ((opcode & 0x3800) === 0x2000) this.push(this.pc)
      this.pc = ((this.ram[0x0a] & 0x18) << 8 | opcode & 0x7ff) % this.flash.length
      this.cycles += 1
      return
    }
    if ((opcode & 0x3c00) === 0x3000) {
      this.w = literal
      return
    }
    if ((opcode & 0x3c00) === 0x3400) {
      this.w = literal
      this.pc = this.pop()
      this.cycles += 1
      return
    }
    switch (opcode & 0x3f00) {
      case 0x3800: this.w |= literal; this.setZero(this.w); return
      case 0x3900: this.w &= literal; this.setZero(this.w); return
      case 0x3a00: this.w ^= literal; this.setZero(this.w); return
      case 0x3c00:
      case 0x3d00: this.w = this.subtraction(literal, this.w); return
      case 0x3e00:
      case 0x3f00: this.w = this.addition(this.w, literal); return
    }
    throw new Error(`Unsupported PIC12F opcode 0x${opcode.toString(16)} at PC 0x${((this.pc - 1 + this.flash.length) % this.flash.length).toString(16)}`)
  }

  private schedule(): void {
    this.timer = setTimeout(() => {
      if (!this.running || this.disposed) return
      try {
        this.execute(2000)
        if (this.running) this.schedule()
      } catch {
        void this.pause()
      }
    }, 0)
  }
}

export class PIC12Adapter implements SimulationAdapter {
  readonly id = 'pic12-core'
  readonly platform = 'pic12f'
  readonly targets = pic12Targets.map(model => model.id)

  async isAvailable(): Promise<boolean> {
    return true
  }

  async createSession(target: string): Promise<SimulationSession> {
    const selected = pic12Targets.find(model => model.id === target.toLowerCase())
    if (!selected) throw new Error(`Unsupported PIC12F target: ${target}`)
    return new PIC12Session(selected)
  }
}
