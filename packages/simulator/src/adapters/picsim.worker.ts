type PicSimModule = {
  FS: { writeFile(path: string, bytes: Uint8Array): void }
  _malloc(size: number): number
  _free(address: number): void
  stringToUTF8(text: string, address: number, capacity: number): void
  lengthBytesUTF8(text: string): number
  _osem_initialize(): void
  _osem_supported(address: number): number
  _osem_load(address: number): number
  _osem_step(count: number): number
  _osem_reset(): number
  _osem_pc(): number
  _osem_w(): number
  _osem_cycles(): number
  _osem_pin_count(): number
  _osem_pin(index: number): number
  _osem_end(): void
}

type PicSimRequest = {
  id: number
  action: 'targets' | 'load' | 'start' | 'pause' | 'step' | 'reset' | 'snapshot'
  targets?: string[]
  target?: string
  firmware?: ArrayBuffer
  count?: number
}

type Snapshot = {
  cycles: number
  running: boolean
  instructions: number
  registers: Record<string, number>
  gpio: Record<string, number>
}

let runtimePromise: Promise<PicSimModule> | null = null
let loaded = false
let running = false
let instructionCount = 0
let generation = 0

async function runtime(): Promise<PicSimModule> {
  if (!runtimePromise) {
    const source = '/engines/picsim/picsim.mjs'
    runtimePromise = import(/* webpackIgnore: true */ source)
      .then(async (module: { default: (options: Record<string, unknown>) => Promise<PicSimModule> }) => {
        if (typeof module.default !== 'function') throw new Error('Invalid PICsim browser runtime')
        const instance = await module.default({
          locateFile: (name: string) => `/engines/picsim/${name}`
        })
        instance._osem_initialize()
        return instance
      })
  }
  return runtimePromise
}

function withString<T>(module: PicSimModule, input: string, fn: (address: number) => T): T {
  const size = module.lengthBytesUTF8(input) + 1
  const address = module._malloc(size)
  if (!address) throw new Error('PICsim memory allocation failed')
  try {
    module.stringToUTF8(input, address, size)
    return fn(address)
  } finally {
    module._free(address)
  }
}

function snapshot(module: PicSimModule): Snapshot {
  const registers: Record<string, number> = {}
  const gpio: Record<string, number> = {}
  if (loaded) {
    registers.PC = module._osem_pc()
    registers.W = module._osem_w()
    const count = Math.min(module._osem_pin_count(), 128)
    for (let index = 1; index <= count; index += 1) {
      gpio[`PIN${index}`] = module._osem_pin(index)
    }
  }
  return {
    cycles: loaded ? module._osem_cycles() : 0,
    running,
    instructions: instructionCount,
    registers,
    gpio
  }
}

function execute(module: PicSimModule, count: number): void {
  if (!loaded) throw new Error('Load firmware before executing')
  if (!Number.isSafeInteger(count) || count < 1 || count > 1000000) {
    throw new RangeError('PICsim instruction count must be between 1 and 1,000,000')
  }
  const result = module._osem_step(count)
  if (result !== 0) throw new Error(`PICsim core stopped with error ${result}`)
  instructionCount += count
}

function stop(): void {
  running = false
  generation += 1
}

function pump(module: PicSimModule, runId: number): void {
  if (!running || runId !== generation) return
  try {
    execute(module, 2000)
    self.postMessage({ event: 'snapshot', snapshot: snapshot(module) })
    setTimeout(() => pump(module, runId), 0)
  } catch (error) {
    stop()
    self.postMessage({ event: 'failure', message: error instanceof Error ? error.message : String(error) })
    self.postMessage({ event: 'snapshot', snapshot: snapshot(module) })
  }
}

self.addEventListener('message', async (event: MessageEvent<PicSimRequest>) => {
  const request = event.data
  try {
    const module = await runtime()
    if (request.action === 'targets') {
      const targets = (request.targets ?? []).filter(target =>
        withString(module, target.toUpperCase(), address => module._osem_supported(address) !== 0)
      )
      self.postMessage({ id: request.id, result: targets })
      return
    }

    if (request.action === 'load') {
      stop()
      loaded = false
      if (!request.target || !request.firmware) throw new Error('PICsim requires a target and HEX firmware')
      module.FS.writeFile('/firmware.hex', new Uint8Array(request.firmware))
      const code = withString(module, request.target.toUpperCase(), address => module._osem_load(address))
      if (code !== 0) throw new Error(`PICsim firmware loading failed with error ${code}`)
      loaded = true
      instructionCount = 0
    } else if (request.action === 'start') {
      if (!loaded) throw new Error('Load firmware before running')
      if (!running) {
        running = true
        const runId = ++generation
        setTimeout(() => pump(module, runId), 0)
      }
    } else if (request.action === 'pause') {
      stop()
    } else if (request.action === 'step') {
      stop()
      execute(module, request.count ?? 1)
    } else if (request.action === 'reset') {
      stop()
      if (!loaded || module._osem_reset() !== 1) {
        throw new Error('PICsim reset failed')
      }
      instructionCount = 0
    }

    self.postMessage({ id: request.id, result: snapshot(module) })
  } catch (error) {
    self.postMessage({ id: request.id, error: error instanceof Error ? error.message : String(error) })
  }
})
