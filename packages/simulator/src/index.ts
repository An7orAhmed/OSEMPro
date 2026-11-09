export { engineCandidates } from './catalog.ts'
export { detectFirmwareFormat, parseFirmware, parseIntelHex } from './firmware.ts'
export { createEngineRegistry, simulationRegistry } from './initialize.ts'
export { SimulationRegistry } from './registry.ts'
export type { EngineAvailability } from './registry.ts'
export type { EngineCandidate } from './catalog.ts'
export type {
  FirmwareFormat,
  FirmwareImage,
  FirmwareSegment,
  PlatformId,
  SimulationAdapter,
  SimulationSession,
  SimulatorSnapshot
} from './types.ts'
