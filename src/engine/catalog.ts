import type { PlatformId } from './types'

export interface EngineCandidate {
  id: PlatformId
  name: string
  provider: string
  architecture: string
  browserRuntime: 'wasm' | 'javascript' | 'port-required'
  license: string
  source: string
}

export const engineCandidates: readonly EngineCandidate[] = [
  {
    id: 'avr',
    name: 'AVR',
    provider: 'avr8js',
    architecture: 'AVR8',
    browserRuntime: 'javascript',
    license: 'MIT',
    source: 'https://github.com/wokwi/avr8js'
  },
  {
    id: 'pic',
    name: 'PIC',
    provider: 'gpsim',
    architecture: 'PIC16 / PIC18',
    browserRuntime: 'port-required',
    license: 'GPL-2.0-or-later',
    source: 'https://gpsim.sourceforge.net/'
  },
  {
    id: 'stm32',
    name: 'STM32',
    provider: 'Renode',
    architecture: 'ARM Cortex-M',
    browserRuntime: 'port-required',
    license: 'MIT',
    source: 'https://github.com/renode/renode'
  },
  {
    id: 'stm8',
    name: 'STM8',
    provider: 'uCsim',
    architecture: 'STM8',
    browserRuntime: 'port-required',
    license: 'GPL',
    source: 'https://github.com/danieldrotos/ucsim'
  },
  {
    id: 'esp32',
    name: 'ESP32',
    provider: 'ESP-Emulator',
    architecture: 'RISC-V / Xtensa',
    browserRuntime: 'wasm',
    license: 'Apache-2.0',
    source: 'https://github.com/espressif/esp-emulator'
  }
]
