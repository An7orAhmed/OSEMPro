import type { PlatformId } from './types.ts'

export type RenvoPlatform = Extract<PlatformId, 'stm32' | 'pic16f' | 'esp32'>
export type RenvoFirmwareFormat = 'hex' | 'elf'

export const renvoTargets: Readonly<Record<RenvoPlatform, readonly string[]>> = {
  stm32: ['stm32f103c8', 'stm32f411re'],
  pic16f: ['pic16f15376'],
  esp32: ['esp32s3', 'esp32c6', 'esp32p4']
}

export function renvoFirmwareFormat(target: string): RenvoFirmwareFormat {
  return target.toLowerCase() === 'pic16f15376' ? 'hex' : 'elf'
}
