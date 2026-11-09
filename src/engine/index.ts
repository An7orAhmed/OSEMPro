export { engineCandidates } from './catalog'
export { detectFirmwareFormat, parseFirmware, parseIntelHex } from './firmware'
export { createEngineRegistry, simulationRegistry } from './initialize.ts'
export { SimulationRegistry } from './registry'
export type { EngineAvailability } from './registry'
export type { EngineCandidate } from './catalog'
export type {
  FirmwareFormat,
  FirmwareImage,
  FirmwareSegment,
  PlatformId,
  SimulationAdapter,
  SimulationSession,
  SimulatorSnapshot
} from './types'
