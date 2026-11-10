import type { FirmwareImage, SimulationAdapter, SimulationSession, SimulatorSnapshot } from '../types.ts'

type DsPicModel = { id: string, programWords: number, ramBytes: number }

export const dspic30Targets: readonly DsPicModel[] = [
  { id: 'dspic30f2010', programWords: 4096, ramBytes: 512 },
  { id: 'dspic30f4011', programWords: 16384, ramBytes: 2048 },
  { id: 'dspic30f4013', programWords: 16384, ramBytes: 2048 }
]

const carry = 1
const zero = 2
const overflow = 4
const negative = 8
const digitCarry = 16

export class DsPic30Session implements SimulationSession {
  private readonly model: DsPicModel
  private readonly program: Uint32Array
  private readonly programmed: Uint8Array
  private readonly data = new Uint8Array(65536)
  private readonly registers = new Uint16Array(16)
  private pc = 0
  private status = 0
  private cycles = 0
  private instructions = 0
  private loaded = false
  private running = false
  private disposed = false
  private stopReason = ''
  private error = ''
  private timer: ReturnType<typeof setTimeout> | null = null

  constructor(model: DsPicModel) {
    this.model = model
    this.program = new Uint32Array(model.programWords)
    this.programmed = new Uint8Array(model.programWords)
    this.resetCpu()
  }

  async loadFirmware(image: FirmwareImage): Promise<void> {
    this.ensureActive()
    await this.pause()
    this.loaded = false
    if (image.format === 'elf') throw new Error('dsPIC30F currently supports padded BIN or INHX32 HEX, not ELF')
    this.program.fill(0xffffff)
    this.programmed.fill(0)
    const segments = image.format === 'bin' ? [{ address: 0, bytes: image.bytes }] : image.segments
    let count = 0
    for (const segment of segments) {
      if (segment.address % 4 || segment.bytes.length % 4) {
        throw new Error('dsPIC30F firmware must contain aligned 4-byte program words')
      }
      const start = segment.address / 4
      if (start >= this.program.length) {
        const programAddress = segment.address / 2
        if (programAddress >= 0x7ff000) continue
        throw new Error('dsPIC30F firmware exceeds selected program memory')
      }
      if (start + segment.bytes.length / 4 > this.program.length) {
        throw new Error('dsPIC30F firmware exceeds selected program memory')
      }
      for (let offset = 0; offset < segment.bytes.length; offset += 4) {
        const fourth = segment.bytes[offset + 3]
        if (fourth !== 0) throw new Error('Invalid dsPIC30F phantom byte: expected zero')
        const index = start + offset / 4
        if (this.programmed[index]) throw new Error('Overlapping dsPIC30F instruction data')
        this.program[index] = segment.bytes[offset] | segment.bytes[offset + 1] << 8 | segment.bytes[offset + 2] << 16
        this.programmed[index] = 1
        count += 1
      }
    }
    if (!count || !this.programmed[0]) throw new Error('dsPIC30F firmware requires a reset instruction at PC 0')
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
      throw new RangeError('dsPIC30F instruction count must be between 1 and 1,000,000')
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
    return {
      cycles: this.cycles,
      running: this.running,
      instructions: this.instructions,
      registers: {
        ...Object.fromEntries(Array.from(this.registers, (value, index): [string, number] => [`W${index}`, value])),
        PC: this.pc,
        SR: this.status
      },
      ...(this.stopReason ? { stopReason: this.stopReason } : {}),
      ...(this.error ? { error: this.error } : {})
    }
  }

  dispose(): void {
    void this.pause()
    this.disposed = true
    this.loaded = false
  }

  private ensureActive(): void {
    if (this.disposed) throw new Error('dsPIC30F session was disposed')
  }

  private ensureLoaded(): void {
    this.ensureActive()
    if (!this.loaded) throw new Error('Load dsPIC30F firmware before executing')
  }

  private resetCpu(): void {
    this.data.fill(0)
    this.registers.fill(0)
    this.registers[15] = 0x0800
    this.pc = 0
    this.status = 0
    this.cycles = 0
    this.instructions = 0
    this.stopReason = ''
    this.error = ''
  }

  private readWord(address: number): number {
    if (address & 1 || address < 0 || address >= 0x10000) throw new Error('Unaligned dsPIC30F data read')
    if (address < 0x20) return this.registers[address >>> 1]
    if (address === 0x42) return this.status
    if (address < 0x0800 || address + 1 >= 0x0800 + this.model.ramBytes) {
      throw new Error(`dsPIC30F peripheral/data register read not emulated at 0x${address.toString(16)}`)
    }
    return this.data[address] | this.data[address + 1] << 8
  }

  private writeWord(address: number, value: number): void {
    if (address & 1 || address < 0 || address >= 0x10000) throw new Error('Unaligned dsPIC30F data write')
    value &= 0xffff
    if (address < 0x20) {
      this.registers[address >>> 1] = value
      return
    }
    if (address === 0x42) {
      this.status = value
      return
    }
    if (address < 0x0800 || address + 1 >= 0x0800 + this.model.ramBytes) {
      throw new Error(`dsPIC30F peripheral/data register write not emulated at 0x${address.toString(16)}`)
    }
    this.data[address] = value & 0xff
    this.data[address + 1] = value >>> 8
  }

  private pushReturn(address: number): void {
    this.writeWord(this.registers[15], address & 0xffff)
    this.writeWord(this.registers[15] + 2, address >>> 16)
    this.registers[15] += 4
  }

  private popReturn(): number {
    if (this.registers[15] < 0x804) throw new Error('dsPIC30F return stack underflow')
    this.registers[15] -= 4
    return this.readWord(this.registers[15]) | this.readWord(this.registers[15] + 2) << 16
  }

  private fetch(address: number): number {
    if (address & 1 || address < 0 || address / 2 >= this.program.length) {
      throw new Error('dsPIC30F program counter exceeds flash')
    }
    const index = address / 2
    if (!this.programmed[index]) throw new Error(`dsPIC30F instruction not present at 0x${address.toString(16)}`)
    return this.program[index]
  }

  private setFlag(flag: number, enabled: boolean): void {
    this.status = enabled ? this.status | flag : this.status & ~flag
  }

  private add(destination: number, operand: number): void {
    const a = this.registers[destination]
    const sum = a + operand
    const result = sum & 0xffff
    this.registers[destination] = result
    this.setFlag(carry, sum > 0xffff)
    this.setFlag(digitCarry, (a & 15) + (operand & 15) > 15)
    this.setFlag(zero, result === 0)
    this.setFlag(negative, Boolean(result & 0x8000))
    this.setFlag(overflow, Boolean((~(a ^ operand) & (a ^ result)) & 0x8000))
  }

  private subtract(destination: number, operand: number): void {
    const a = this.registers[destination]
    const result = (a - operand) & 0xffff
    this.registers[destination] = result
    this.setFlag(carry, a >= operand)
    this.setFlag(digitCarry, (a & 15) >= (operand & 15))
    this.setFlag(zero, result === 0)
    this.setFlag(negative, Boolean(result & 0x8000))
    this.setFlag(overflow, Boolean(((a ^ operand) & (a ^ result)) & 0x8000))
  }

  private execute(count: number): void {
    try {
      for (let i = 0; i < count; i += 1) {
        if (this.stopReason) break
        const address = this.pc
        const code = this.fetch(address)
        this.pc += 2
        this.instructions += 1
        this.cycles += 1
        this.instruction(code, address)
      }
    } catch (cause) {
      this.running = false
      this.error = cause instanceof Error ? cause.message : String(cause)
      throw cause
    }
  }

  private instruction(code: number, address: number): void {
    if (code === 0) return
    if ((code & 0xf00000) === 0x200000) {
      this.registers[code & 15] = code >>> 4 & 0xffff
      return
    }
    if ((code & 0xffc000) === 0xb00000) {
      this.add(code & 15, code >>> 4 & 0x3ff)
      return
    }
    if ((code & 0xffc000) === 0xb10000) {
      this.subtract(code & 15, code >>> 4 & 0x3ff)
      return
    }
    if ((code & 0xffc000) === 0xef0000) {
      if (code & 0x2000) this.writeWord(code & 0x1fff, 0)
      else this.registers[0] = 0
      return
    }
    if ((code & 0xf80000) === 0x800000 || (code & 0xf80000) === 0x880000) {
      const register = code & 15
      const location = (code >>> 4 & 0x7fff) * 2
      if (code & 0x080000) this.writeWord(location, this.registers[register])
      else this.registers[register] = this.readWord(location)
      return
    }
    if ((code & 0xfff070) === 0x780000) {
      const destination = ((code >>> 8 & 7) << 1) | (code >>> 7 & 1)
      this.registers[destination] = this.registers[code & 15]
      return
    }
    if ((code & 0xffe000) === 0xb7a000) {
      this.writeWord(code & 0x1fff, this.registers[0])
      return
    }
    if ((code & 0xffa000) === 0xbf8000) {
      const value = this.readWord(code & 0x1fff)
      if (!(code & 0x2000)) this.registers[0] = value
      this.setFlag(zero, value === 0)
      this.setFlag(negative, Boolean(value & 0x8000))
      return
    }
    if ((code & 0xff0000) === 0x370000 || (code & 0xff0000) === 0x320000 ||
      (code & 0xff0000) === 0x3a0000 || (code & 0xff0000) === 0x310000) {
      const condition = code >>> 16
      const taken = condition === 0x37 || condition === 0x32 && !!(this.status & zero) ||
        condition === 0x3a && !(this.status & zero) || condition === 0x31 && !!(this.status & carry)
      if (taken) {
        const offset = code << 16 >> 16
        this.pc += offset * 2
        this.cycles += 1
      }
      return
    }
    if ((code & 0xff0001) === 0x040000 || (code & 0xff0001) === 0x020000) {
      const extension = this.fetch(this.pc)
      if (extension & ~0x7f) throw new Error('Invalid dsPIC30F CALL/GOTO extension word')
      this.pc += 2
      const target = (code & 0xfffe) | (extension & 0x7f) << 16
      if ((code & 0xff0000) === 0x020000) this.pushReturn(this.pc)
      this.pc = target
      this.cycles += 1
      return
    }
    if (code === 0x060000) {
      this.pc = this.popReturn()
      this.cycles += 2
      return
    }
    if ((code & 0xfffff0) === 0x014000) {
      this.pc = this.registers[code & 15] & 0xfffe
      this.cycles += 1
      return
    }
    if ((code & 0xfffff0) === 0x010000) {
      this.pushReturn(this.pc)
      this.pc = this.registers[code & 15] & 0xfffe
      this.cycles += 1
      return
    }
    throw new Error(`Unsupported dsPIC30F opcode 0x${code.toString(16).padStart(6, '0')} at PC 0x${address.toString(16)}`)
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

export class DsPic30Adapter implements SimulationAdapter {
  readonly id = 'dspic30-core'
  readonly platform = 'dspic30f'
  readonly targets = dspic30Targets.map(model => model.id)

  async isAvailable(): Promise<boolean> {
    return true
  }

  async createSession(target: string): Promise<SimulationSession> {
    const selected = dspic30Targets.find(model => model.id === target.toLowerCase())
    if (!selected) throw new Error(`Unsupported dsPIC30F target: ${target}`)
    return new DsPic30Session(selected)
  }
}
