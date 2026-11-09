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
    provider: 'avr8js / Renvo',
    architecture: 'ATmega328P / ATmega328PB',
    browserRuntime: 'javascript',
    license: 'MIT / MIT OR Apache-2.0',
    source: 'https://github.com/wokwi/avr8js'
  },
  {
    id: 'pic',
    name: 'PIC',
    provider: 'Renvo / gpsim',
    architecture: 'PIC16F15376',
    browserRuntime: 'wasm',
    license: 'MIT OR Apache-2.0',
    source: 'https://github.com/tinyrange/renvo_emu'
  },
  {
    id: 'stm32',
    name: 'STM32',
    provider: 'Renvo',
    architecture: 'F103 / F411 / L432 / H743',
    browserRuntime: 'wasm',
    license: 'MIT OR Apache-2.0',
    source: 'https://github.com/tinyrange/renvo_emu'
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
    provider: 'Renvo / esp32sim',
    architecture: 'S3 / C6 / P4',
    browserRuntime: 'wasm',
    license: 'MIT OR Apache-2.0',
    source: 'https://github.com/tinyrange/renvo_emu'
  },
  {
    id: 'rp2040',
    name: 'RP2040',
    provider: 'rp2040js',
    architecture: 'Cortex-M0+',
    browserRuntime: 'javascript',
    license: 'MIT',
    source: 'https://github.com/wokwi/rp2040js'
  }
]
