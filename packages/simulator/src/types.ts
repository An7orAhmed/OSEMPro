export type PlatformId =
  | 'stm32'
  | 'avr8'
  | 'pic12f'
  | 'pic16f'
  | 'pic18f'
  | 'pic24f'
  | 'dspic30f'
  | 'esp8266'
  | 'esp32'

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
  ticks?: number
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
