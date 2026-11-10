import { chip as chip0 } from './stm32f103c8/index.ts'
import { chip as chip1 } from './stm32f401cc/index.ts'
import { chip as chip2 } from './stm32f401ce/index.ts'
import { chip as chip3 } from './stm32f401rc/index.ts'
import { chip as chip4 } from './stm32f401re/index.ts'
import { chip as chip5 } from './stm32f407vg/index.ts'
import { chip as chip6 } from './stm32f411re/index.ts'
import { chip as chip7 } from './atmega328p/index.ts'
import { chip as chip8 } from './atmega328/index.ts'
import { chip as chip9 } from './pic12f675/index.ts'
import { chip as chip10 } from './pic12f683/index.ts'
import { chip as chip11 } from './pic12f1840/index.ts'
import { chip as chip12 } from './pic16f84a/index.ts'
import { chip as chip13 } from './pic16f628a/index.ts'
import { chip as chip14 } from './pic16f877a/index.ts'
import { chip as chip15 } from './pic16f18855/index.ts'
import { chip as chip16 } from './pic16f18324/index.ts'
import { chip as chip17 } from './pic16f1619/index.ts'
import { chip as chip18 } from './pic16f15376/index.ts'
import { chip as chip19 } from './pic18f452/index.ts'
import { chip as chip20 } from './pic18f4520/index.ts'
import { chip as chip21 } from './pic18f4550/index.ts'
import { chip as chip22 } from './pic18f4620/index.ts'
import { chip as chip23 } from './pic18f47k40/index.ts'
import { chip as chip24 } from './pic18f27k40/index.ts'
import { chip as chip25 } from './pic24fj64ga002/index.ts'
import { chip as chip26 } from './pic24fj128ga006/index.ts'
import { chip as chip27 } from './dspic30f2010/index.ts'
import { chip as chip28 } from './dspic30f4011/index.ts'
import { chip as chip29 } from './dspic30f4013/index.ts'
import { chip as chip30 } from './esp8266ex/index.ts'
import { chip as chip31 } from './esp32s3/index.ts'
import { chip as chip32 } from './esp32c6/index.ts'
import { chip as chip33 } from './esp32p4/index.ts'
import { chip as pic16f72 } from './pic16f72/index.ts'
import { chip as pic16f73 } from './pic16f73/index.ts'
import type { ChipDefinition } from './types.ts'

export type { ChipDefinition, ChipPin } from './types.ts'

export const chips: readonly ChipDefinition[] = [
  pic16f72,
  pic16f73,
  chip0,
  chip1,
  chip2,
  chip3,
  chip4,
  chip5,
  chip6,
  chip7,
  chip8,
  chip9,
  chip10,
  chip11,
  chip12,
  chip13,
  chip14,
  chip15,
  chip16,
  chip17,
  chip18,
  chip19,
  chip20,
  chip21,
  chip22,
  chip23,
  chip24,
  chip25,
  chip26,
  chip27,
  chip28,
  chip29,
  chip30,
  chip31,
  chip32,
  chip33,
]

const chipMap = new Map(chips.map(chip => [chip.id, chip]))

export function getChipDefinition(target: string): ChipDefinition | undefined {
  return chipMap.get(target.toLowerCase())
}
