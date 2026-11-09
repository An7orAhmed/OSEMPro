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
    provider: 'Renvo',
    architecture: 'PIC16F15376',
    browserRuntime: 'wasm',
    license: 'MIT OR Apache-2.0',
    source: 'https://github.com/tinyrange/renvo_emu'
  },
  {
    id: 'stm32',
    name: 'STM32',
    provider: 'STM32F4 WASM / Renvo',
    architecture: 'Cortex-M3 / M4F / M7',
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
    provider: 'Renvo',
    architecture: 'Xtensa LX7 / RISC-V',
    browserRuntime: 'wasm',
    license: 'MIT OR Apache-2.0',
    source: 'https://github.com/tinyrange/renvo_emu'
  },
  {
    id: 'rp2040',
    name: 'RP2040',
    provider: 'rp2040js / Renvo',
    architecture: 'Cortex-M0+',
    browserRuntime: 'javascript',
    license: 'MIT / MIT OR Apache-2.0',
    source: 'https://github.com/wokwi/rp2040js'
  },
  {
    id: 'rp2350',
    name: 'RP2350',
    provider: 'Renvo',
    architecture: 'Cortex-M33 / Hazard3',
    browserRuntime: 'wasm',
    license: 'MIT OR Apache-2.0',
    source: 'https://github.com/tinyrange/renvo_emu'
  },
  {
    id: 'wch',
    name: 'WCH CH32',
    provider: 'Renvo',
    architecture: 'QingKe RV32EC',
    browserRuntime: 'wasm',
    license: 'MIT OR Apache-2.0',
    source: 'https://github.com/tinyrange/renvo_emu'
  },
  {
    id: 'samd',
    name: 'SAMD',
    provider: 'Renvo',
    architecture: 'Cortex-M0+ / M4F',
    browserRuntime: 'wasm',
    license: 'MIT OR Apache-2.0',
    source: 'https://github.com/tinyrange/renvo_emu'
  },
  {
    id: 'nrf52',
    name: 'nRF52',
    provider: 'Renvo',
    architecture: 'Cortex-M4F',
    browserRuntime: 'wasm',
    license: 'MIT OR Apache-2.0',
    source: 'https://github.com/tinyrange/renvo_emu'
  },
  {
    id: 'renesas',
    name: 'Renesas RA',
    provider: 'Renvo',
    architecture: 'Cortex-M4F',
    browserRuntime: 'wasm',
    license: 'MIT OR Apache-2.0',
    source: 'https://github.com/tinyrange/renvo_emu'
  },
  {
    id: 'msp430',
    name: 'MSP430',
    provider: 'Renvo',
    architecture: 'MSP430Xv2',
    browserRuntime: 'wasm',
    license: 'MIT OR Apache-2.0',
    source: 'https://github.com/tinyrange/renvo_emu'
  },
  {
    id: 'efm8',
    name: 'EFM8 / 8051',
    provider: 'Browser core required',
    architecture: 'MCS-51',
    browserRuntime: 'port-required',
    license: 'Not selected',
    source: 'https://github.com/tinyrange/renvo_emu'
  }
]
