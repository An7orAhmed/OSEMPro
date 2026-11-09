import type { PlatformId } from './types'

export type RenvoPlatform = Exclude<PlatformId, 'stm8' | 'pic12f' | 'pic18f' | 'pic24f' | 'dspic30f' | 'efm8'>
export type RenvoFirmwareFormat = 'hex' | 'elf'

export const renvoTargets: Readonly<Record<RenvoPlatform, readonly string[]>> = {
  avr: [
    'atmega328pb'
  ],
  pic: [
    'pic16f15376'
  ],
  pic16f: [
    'pic16f15376'
  ],
  stm32: [
    'stm32f103c8',
    'stm32f411re',
    'stm32l432kc',
    'stm32h743zi'
  ],
  esp32: [
    'esp32s3',
    'esp32c6',
    'esp32p4'
  ],
  rp2040: [
    'rp2040'
  ],
  rp2350: [
    'rp2350'
  ],
  wch: [
    'ch32v003',
    'ch32v006'
  ],
  samd: [
    'atsamd21e18',
    'atsamd51j19a'
  ],
  nrf52: [
    'nrf52840'
  ],
  renesas: [
    'r7fa4m1ab3cfm'
  ],
  msp430: [
    'msp430fr2433'
  ]
}

const intelHexTargets = new Set(['pic16f15376'])

export function renvoFirmwareFormat(target: string): RenvoFirmwareFormat {
  return intelHexTargets.has(target.toLowerCase()) ? 'hex' : 'elf'
}
