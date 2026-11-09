export type PlatformId =
  | 'avr'
  | 'pic'
  | 'stm32'
  | 'stm8'
  | 'esp32'
  | 'rp2040'
  | 'rp2350'
  | 'wch'
  | 'samd'
  | 'nrf52'
  | 'renesas'
  | 'msp430'
  | 'efm8'

export type FirmwareFormat = 'hex' | 'bin' | 'elf'

export interface FirmwareSegment {
  address: number
  bytes: Uint8Array
}

export interface FirmwareImage {
  format: FirmwareFormat
  name: string
  bytes: Uint8Array
  segments: FirmwareSegment[]
  entryPoint: number | null
}

export interface SimulatorSnapshot {
  cycles: number
  running: boolean
  registers: Readonly<Record<string, number>>
  instructions?: number
  gpio?: Readonly<Record<string, number>>
  serial?: string
  error?: string
  stopReason?: string
}

export interface SimulationSession {
  loadFirmware(image: FirmwareImage): Promise<void>
  start(): Promise<void>
  pause(): Promise<void>
  step(instructions: number): Promise<void>
  reset(): Promise<void>
  snapshot(): SimulatorSnapshot
  dispose(): void
}

export interface SimulationAdapter {
  readonly id: string
  readonly platform: PlatformId
  readonly targets: readonly string[]
  isAvailable(): Promise<boolean>
  availableTargets?(): Promise<readonly string[]>
  createSession(target: string): Promise<SimulationSession>
}
