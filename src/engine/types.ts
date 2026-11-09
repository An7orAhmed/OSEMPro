export type PlatformId = 'avr' | 'pic' | 'stm32' | 'stm8' | 'esp32'
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
  platform: PlatformId
  createSession(target: string): Promise<SimulationSession>
}
