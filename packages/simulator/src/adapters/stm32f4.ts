import { stm32f4Targets } from '../stm32f4-targets.ts'
import type { STM32F4Target } from '../stm32f4-targets.ts'
import type { FirmwareImage, SimulationAdapter, SimulationSession, SimulatorSnapshot } from '../types.ts'

type ExecutionResult = { instCount: number, stopped: boolean }
type STM32F4Machine = {
  loadBin(bytes: Uint8Array): void
  loadHex(contents: string): void
  loadELF(bytes: Uint8Array): void
  step(instructions: number): ExecutionResult
  getRegisters(): Record<string, number>
  read32(address: number): number
  resetCpu(): void
  close(): void
  faultInfo(): { pc?: number, message?: string } | null
  usart1: { onData: ((byte: number) => void) | null }
}

type STM32F4Factory = {
  create(options: Record<string, unknown>): Promise<STM32F4Machine>
}

type Runtime = {
  factory: STM32F4Factory
  bindings: Record<string, unknown>
  svdXml: string
}

const runtimes = new Map<STM32F4Target['chip'], Promise<Runtime>>()
const baseUrl = '/engines/stm32f4'
const wasmUrl = baseUrl + '/vendor/stm32_periph_wasm_bg.wasm'

async function loadRuntime(chip: STM32F4Target['chip']): Promise<Runtime> {
  if (typeof Worker === 'undefined') throw new Error('STM32F4 runtime requires a browser worker')

  if (!runtimes.has(chip)) {
    runtimes.set(chip, (async () => {
      const factoryUrl = baseUrl + '/stm32f4.js'
      const bindingsUrl = baseUrl + '/vendor/stm32_periph_wasm.js'
      const [module, bindings, svdResponse, wasmResponse] = await Promise.all([
        import(/* webpackIgnore: true */ factoryUrl) as Promise<{ STM32F4: STM32F4Factory }>,
        import(/* webpackIgnore: true */ bindingsUrl) as Promise<Record<string, unknown>>,
        fetch(baseUrl + '/vendor/' + chip + '.svd'),
        fetch(wasmUrl, { method: 'HEAD' })
      ])

      if (!svdResponse.ok || !wasmResponse.ok) {
        throw new Error('STM32F4 WASM assets are not installed. Run ./run.sh.')
      }
      if (typeof module.STM32F4?.create !== 'function') {
        throw new Error('Invalid STM32F4 browser emulator')
      }

      return { factory: module.STM32F4, bindings, svdXml: await svdResponse.text() }
    })())
  }

  return runtimes.get(chip)!
}

async function createMachine(profile: STM32F4Target): Promise<STM32F4Machine> {
  const { factory, bindings, svdXml } = await loadRuntime(profile.chip)
  return factory.create({
    chip: profile.chip,
    flash_size: profile.flashSize,
    ram_size: profile.ramSize,
    bindings,
    svdXml,
    wasmUrl
  })
}

class STM32F4Session implements SimulationSession {
  private readonly machine: STM32F4Machine
  private readonly profile: STM32F4Target
  private timer: ReturnType<typeof setTimeout> | null = null
  private running = false
  private disposed = false
  private loaded = false
  private instructions = 0
  private output = ''
  private error = ''
  private stopReason = ''

  constructor(machine: STM32F4Machine, profile: STM32F4Target) {
    this.machine = machine
    this.profile = profile
    this.machine.usart1.onData = byte => {
      this.output = (this.output + String.fromCharCode(byte)).slice(-8192)
    }
  }

  async loadFirmware(image: FirmwareImage): Promise<void> {
    this.ensureActive()
    await this.pause()
    this.loaded = false
    this.instructions = 0
    this.output = ''
    this.error = ''
    this.stopReason = ''

    if (image.format === 'bin') {
      if (image.bytes.length > this.profile.flashSize) {
        throw new Error('Firmware exceeds selected STM32 flash capacity')
      }
      this.machine.loadBin(image.bytes)
    } else if (image.format === 'hex') {
      for (const segment of image.segments) {
        if (segment.address >= 0x08000000 &&
          segment.address + segment.bytes.length > 0x08000000 + this.profile.flashSize) {
          throw new Error('Intel HEX exceeds selected STM32F401 flash capacity')
        }
      }
      this.machine.loadHex(new TextDecoder().decode(image.bytes))
    } else {
      this.machine.loadELF(image.bytes)
    }

    this.loaded = true
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
      throw new RangeError('Instruction count must be between 1 and 1,000,000')
    }
    await this.pause()
    this.execute(count)
  }

  async reset(): Promise<void> {
    this.ensureLoaded()
    await this.pause()
    this.machine.resetCpu()
    this.instructions = 0
    this.output = ''
    this.error = ''
    this.stopReason = ''
  }

  snapshot(): SimulatorSnapshot {
    if (!this.loaded) return { cycles: 0, running: false, registers: {} }
    const registers: Record<string, number> = {}
    for (const [name, value] of Object.entries(this.machine.getRegisters())) {
      if (typeof value === 'number' && Number.isFinite(value)) registers[name] = value >>> 0
    }
    const gpio: Record<string, number> = {}
    const gpioDirections: Record<string, number> = {}
    const gpioRegisters: Record<string, number> = {}
    for (let port = 0; port < (this.profile.chip === 'stm32f407' ? 11 : 6); port += 1) {
      const name = 'GPIO' + String.fromCharCode(65 + port)
      const address = 0x40020000 + port * 0x400
      const moder = this.machine.read32(address)
      const input = this.machine.read32(address + 0x10) & 0xffff
      const output = this.machine.read32(address + 0x14) & 0xffff
      let outputMask = 0
      for (let bit = 0; bit < 16; bit += 1) {
        if ((moder >>> (bit * 2) & 3) === 1) outputMask |= 1 << bit
      }
      gpio[name] = input
      gpioDirections[name] = outputMask
      gpioRegisters[`${name}_MODER`] = moder
      gpioRegisters[`${name}_IDR`] = input
      gpioRegisters[`${name}_ODR`] = output
    }
    const fault = this.machine.faultInfo()
    return {
      cycles: 0,
      running: this.running,
      instructions: this.instructions,
      registers,
      gpio,
      gpioDirections,
      peripherals: {
        GPIO: gpioRegisters,
        ADC: {
          ADC1_SR: this.machine.read32(0x40012000),
          ADC1_CR1: this.machine.read32(0x40012004),
          ADC1_CR2: this.machine.read32(0x40012008),
          ADC1_DR: this.machine.read32(0x4001204c)
        },
        Timers: {
          TIM2_CR1: this.machine.read32(0x40000000),
          TIM2_CNT: this.machine.read32(0x40000024),
          TIM2_PSC: this.machine.read32(0x40000028),
          TIM2_ARR: this.machine.read32(0x4000002c)
        },
        Interrupts: {
          EXTI_IMR: this.machine.read32(0x40013c00),
          EXTI_PR: this.machine.read32(0x40013c14)
        },
        UART: {
          USART1_SR: this.machine.read32(0x40011000),
          USART1_CR1: this.machine.read32(0x4001100c)
        }
      },
      serial: this.output,
      ...(fault ? { error: 'CPU fault at PC ' + String(fault.pc ?? 'unknown') } : {}),
      ...(this.error ? { error: this.error } : {}),
      ...(this.stopReason ? { stopReason: this.stopReason } : {})
    }
  }

  dispose(): void {
    if (this.disposed) return
    void this.pause()
    this.disposed = true
    this.machine.close()
  }

  private execute(count: number): void {
    try {
      const result = this.machine.step(count)
      if (!Number.isSafeInteger(result.instCount) || result.instCount < 0) {
        throw new Error('STM32F4 engine returned an invalid instruction count')
      }
      this.instructions += result.instCount
      if (result.stopped) {
        this.stopReason = 'CPU stopped'
        void this.pause()
      }
    } catch (cause) {
      this.error = cause instanceof Error ? cause.message : String(cause)
      void this.pause()
      throw cause
    }
  }

  private schedule(): void {
    this.timer = setTimeout(() => {
      if (!this.running || this.disposed) return
      try {
        this.execute(5000)
        if (this.running) this.schedule()
      } catch {
        void this.pause()
      }
    }, 0)
  }

  private ensureActive(): void {
    if (this.disposed) throw new Error('STM32F4 session has been disposed')
  }

  private ensureLoaded(): void {
    this.ensureActive()
    if (!this.loaded) throw new Error('Load STM32 firmware first')
  }
}

export class STM32F4Adapter implements SimulationAdapter {
  readonly id = 'stm32f4-emu'
  readonly platform = 'stm32'
  readonly targets = stm32f4Targets.map(target => target.id)
  private installed: Promise<readonly string[]> | null = null

  async isAvailable(): Promise<boolean> {
    return (await this.availableTargets()).length > 0
  }

  async availableTargets(): Promise<readonly string[]> {
    if (!this.installed) {
      this.installed = (async () => {
        const supportedChips = new Set<STM32F4Target['chip']>()
        for (const profile of stm32f4Targets) {
          if (supportedChips.has(profile.chip)) continue
          try {
            const machine = await createMachine(profile)
            machine.close()
            supportedChips.add(profile.chip)
          } catch {
            continue
          }
        }
        return this.targets.filter(id => {
          const profile = stm32f4Targets.find(item => item.id === id)
          return profile ? supportedChips.has(profile.chip) : false
        })
      })()
    }
    return this.installed
  }

  async createSession(target: string): Promise<SimulationSession> {
    const profile = stm32f4Targets.find(option => option.id === target.toLowerCase())
    if (!profile) throw new Error(`Unsupported STM32 target: ${target}`)
    return new STM32F4Session(await createMachine(profile), profile)
  }
}
