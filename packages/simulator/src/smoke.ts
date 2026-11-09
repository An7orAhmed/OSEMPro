import { parseFirmware } from './firmware.ts'
import type { LabSmokeResult } from './lab-protocol'
import type { PlatformId } from './types'
import type { SimulationRegistry } from './registry.ts'

export type CpuSmokeFixture = {
  platform: PlatformId
  engine: string
  target: string
  bytes: readonly number[]
  filename?: string
  steps?: number
  browserOnly?: boolean
  register: string
  expected: number
}

export const cpuSmokeFixtures: readonly CpuSmokeFixture[] = [
  {
    platform: 'avr',
    engine: 'avr8js',
    target: 'atmega328p',
    bytes: [0x01, 0xe0, 0x03, 0x95],
    register: 'R16',
    expected: 2
  },
  {
    platform: 'rp2040',
    engine: 'rp2040js',
    target: 'rp2040',
    bytes: [0x03, 0x20, 0x04, 0x30],
    register: 'R0',
    expected: 7
  },
  {
    platform: 'pic16f',
    engine: 'picsim',
    target: 'pic16f84a',
    bytes: [...new TextEncoder().encode(':020000002A30A4\n:00000001FF\n')],
    filename: 'instruction-test.hex',
    steps: 1,
    browserOnly: true,
    register: 'W',
    expected: 42
  },
  {
    platform: 'pic18f',
    engine: 'picsim',
    target: 'pic18f452',
    bytes: [...new TextEncoder().encode(':020000002A0EC6\n:00000001FF\n')],
    filename: 'instruction-test.hex',
    steps: 1,
    browserOnly: true,
    register: 'W',
    expected: 42
  }
]

export async function runCpuSmoke(
  registry: SimulationRegistry,
  platform: PlatformId,
  engine: string,
  target: string
): Promise<LabSmokeResult> {
  const fixture = cpuSmokeFixtures.find(item =>
    item.platform === platform && item.engine === engine && item.target === target
  )

  if (!fixture) throw new Error('No verified CPU smoke fixture for this target')

  const session = await registry.createSession(platform, target, engine)
  try {
    await session.loadFirmware(parseFirmware(fixture.filename ?? 'instruction-test.bin', Uint8Array.from(fixture.bytes)))
    await session.step(fixture.steps ?? 2)
    const state = session.snapshot()
    const actual = state.registers[fixture.register]
    return {
      passed: actual === fixture.expected,
      register: fixture.register,
      expected: fixture.expected,
      actual,
      snapshot: state
    }
  } finally {
    session.dispose()
  }
}
