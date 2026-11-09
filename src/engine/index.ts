export { engineCandidates } from './catalog'
export { detectFirmwareFormat, parseFirmware, parseIntelHex } from './firmware'
export { SimulationRegistry, simulationRegistry } from './registry'
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
