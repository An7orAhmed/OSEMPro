export interface STM32F4Target {
  id: string
  chip: 'stm32f401'
  flashSize: number
  ramSize: number
}

export const stm32f4Targets: readonly STM32F4Target[] = [
  { id: 'stm32f401cc', chip: 'stm32f401', flashSize: 256 * 1024, ramSize: 64 * 1024 },
  { id: 'stm32f401ce', chip: 'stm32f401', flashSize: 512 * 1024, ramSize: 96 * 1024 },
  { id: 'stm32f401rc', chip: 'stm32f401', flashSize: 256 * 1024, ramSize: 64 * 1024 },
  { id: 'stm32f401re', chip: 'stm32f401', flashSize: 512 * 1024, ramSize: 96 * 1024 }
]
