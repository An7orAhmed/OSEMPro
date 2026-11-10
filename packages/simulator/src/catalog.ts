import type { PlatformId } from './types.ts'

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
    id: 'stm32',
    name: 'STM32',
    provider: 'STM32F4 WASM / Renvo',
    architecture: 'F103 / F401 / F407 / F411',
    browserRuntime: 'wasm',
    license: 'MIT / MIT OR Apache-2.0',
    source: 'https://github.com/danish9661/STM32F4-emulator'
  },
  {
    id: 'avr8',
    name: 'AVR8',
    provider: 'avr8js',
    architecture: 'ATmega328P',
    browserRuntime: 'javascript',
    license: 'MIT',
    source: 'https://github.com/wokwi/avr8js'
  },
  {
    id: 'pic12f',
    name: 'PIC12F',
    provider: 'PIC12 14-bit JavaScript core',
    architecture: '12F675 / 12F683',
    browserRuntime: 'javascript',
    license: 'Project source',
    source: 'https://github.com/An7orAhmed/OSEMPro'
  },
  {
    id: 'pic16f',
    name: 'PIC16F',
    provider: 'PICsim / Renvo',
    architecture: '8-bit PIC',
    browserRuntime: 'wasm',
    license: 'GPL-2.0-or-later / MIT OR Apache-2.0',
    source: 'https://github.com/lcgamboa/picsim'
  },
  {
    id: 'pic18f',
    name: 'PIC18F',
    provider: 'PICsim',
    architecture: '8-bit PIC18',
    browserRuntime: 'wasm',
    license: 'GPL-2.0-or-later',
    source: 'https://github.com/lcgamboa/picsim'
  },
  {
    id: 'pic24f',
    name: 'PIC24F',
    provider: 'Browser core pending',
    architecture: 'PIC24 16-bit',
    browserRuntime: 'port-required',
    license: 'Not selected',
    source: 'https://developerhelp.microchip.com/xwiki/bin/view/products/mcu-mpu/16bit-mcu/instruction-set-architecture/'
  },
  {
    id: 'dspic30f',
    name: 'dsPIC30F',
    provider: 'OSEMPro dsPIC30 CPU (experimental)',
    architecture: '30F2010 / 30F4011 / 30F4013',
    browserRuntime: 'javascript',
    license: 'Project source',
    source: 'https://github.com/An7orAhmed/OSEMPro'
  },
  {
    id: 'esp8266',
    name: 'ESP8266',
    provider: 'Browser core pending',
    architecture: 'Xtensa LX106',
    browserRuntime: 'port-required',
    license: 'Not selected',
    source: 'https://github.com/espressif/ESP8266_RTOS_SDK'
  },
  {
    id: 'esp32',
    name: 'ESP32',
    provider: 'Renvo',
    architecture: 'S3 / C6 / P4',
    browserRuntime: 'wasm',
    license: 'MIT OR Apache-2.0',
    source: 'https://github.com/tinyrange/renvo_emu'
  }
]
