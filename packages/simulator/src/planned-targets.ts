import type { PlatformId } from './types'

export interface PlannedTarget {
  id: string
  source: string
  note: string
}

export const plannedTargets: Partial<Record<PlatformId, readonly PlannedTarget[]>> = {
  esp8266: [
    { id: 'esp8266ex', source: 'https://github.com/espressif/ESP8266_RTOS_SDK', note: 'ESP8266 Xtensa LX106 browser CPU core is not integrated yet.' }
  ],
  pic12f: [
    { id: 'pic12f1840', source: 'https://gpsim.sourceforge.net/', note: 'PIC12F1840 uses an enhanced instruction set. A verified browser CPU core is not integrated yet.' }
  ],
  pic24f: [
    { id: 'pic24fj64ga002', source: 'https://developerhelp.microchip.com/xwiki/bin/view/products/mcu-mpu/16bit-mcu/instruction-set-architecture/', note: 'No verified open source browser PIC24F CPU backend yet.' },
    { id: 'pic24fj128ga006', source: 'https://developerhelp.microchip.com/xwiki/bin/view/products/mcu-mpu/16bit-mcu/instruction-set-architecture/', note: 'No verified open source browser PIC24F CPU backend yet.' }
  ],
}

export function getPlannedTarget(platform: PlatformId, target: string): PlannedTarget | undefined {
  return plannedTargets[platform]?.find(profile => profile.id === target.toLowerCase())
}
