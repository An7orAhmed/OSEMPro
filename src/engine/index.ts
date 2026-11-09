export { engineCandidates } from './catalog'
export { detectFirmwareFormat, parseFirmware, parseIntelHex } from './firmware'
export { createEngineRegistry } from './initialize'
export { SimulationRegistry, simulationRegistry } from './registry'
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
