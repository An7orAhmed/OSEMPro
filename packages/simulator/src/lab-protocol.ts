import type { PlatformId, SimulatorSnapshot } from './types'

export type LabRequest =
  | { id: number, action: 'inspect' | 'pause' | 'reset' | 'snapshot' | 'close' }
  | { id: number, action: 'open', platform: PlatformId, engine: string, target: string }
  | { id: number, action: 'load', name: string, bytes: Uint8Array }
  | { id: number, action: 'step', count: number }
  | { id: number, action: 'start' }
  | { id: number, action: 'smoke', platform: PlatformId, engine: string, target: string }

export type LabEngineStatus = {
  platform: PlatformId
  label: string
  engines: Array<{ id: string, targets: readonly string[], available: boolean, availableTargets: readonly string[] }>
}

export type LabSmokeResult = {
  passed: boolean
  register: string
  expected: number
  actual: number | undefined
  snapshot: SimulatorSnapshot
}

export type LabResponse =
  | { id: number, result: unknown, error?: never }
  | { id: number, error: string, result?: never }
  | { event: 'snapshot', snapshot: SimulatorSnapshot }
  | { event: 'failure', message: string }
