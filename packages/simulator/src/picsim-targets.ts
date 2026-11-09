import type { PlatformId } from './types'

export type PicSimPlatform = Extract<PlatformId, 'pic16f' | 'pic18f'>

export const picSimTargets: Readonly<Record<PicSimPlatform, readonly string[]>> = {
  pic16f: ["pic16f84a","pic16f628a","pic16f877a","pic16f18855","pic16f18324","pic16f1619"],
  pic18f: ["pic18f452","pic18f4520","pic18f4550","pic18f4620","pic18f47k40","pic18f27k40"]
}
