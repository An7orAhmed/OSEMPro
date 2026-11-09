import type { PlatformId } from './types'

export interface PlannedTarget {
  id: string
  source: string
  note: string
}

export const plannedTargets: Partial<Record<PlatformId, readonly PlannedTarget[]>> = {
  pic12f: [
    { id: 'pic12f675', source: 'https://gpsim.sourceforge.net/', note: 'gpsim models this chip natively, but its browser WASM port is pending.' },
    { id: 'pic12f683', source: 'https://gpsim.sourceforge.net/', note: 'gpsim models this chip natively, but its browser WASM port is pending.' },
    { id: 'pic12f1840', source: 'https://gpsim.sourceforge.net/', note: 'gpsim models this chip natively, but its browser WASM port is pending.' }
  ],
  pic24f: [
    { id: 'pic24fj64ga002', source: 'https://developerhelp.microchip.com/xwiki/bin/view/products/mcu-mpu/16bit-mcu/instruction-set-architecture/', note: 'No verified open source browser PIC24F CPU backend yet.' },
    { id: 'pic24fj128ga006', source: 'https://developerhelp.microchip.com/xwiki/bin/view/products/mcu-mpu/16bit-mcu/instruction-set-architecture/', note: 'No verified open source browser PIC24F CPU backend yet.' }
  ],
  dspic30f: [
    { id: 'dspic30f2010', source: 'https://developerhelp.microchip.com/xwiki/bin/view/products/mcu-mpu/16bit-mcu/instruction-set-architecture/', note: 'No verified open source browser dsPIC30F CPU backend yet.' },
    { id: 'dspic30f4011', source: 'https://developerhelp.microchip.com/xwiki/bin/view/products/mcu-mpu/16bit-mcu/instruction-set-architecture/', note: 'No verified open source browser dsPIC30F CPU backend yet.' },
    { id: 'dspic30f4013', source: 'https://developerhelp.microchip.com/xwiki/bin/view/products/mcu-mpu/16bit-mcu/instruction-set-architecture/', note: 'No verified open source browser dsPIC30F CPU backend yet.' }
  ]
}

export function getPlannedTarget(platform: PlatformId, target: string): PlannedTarget | undefined {
  return plannedTargets[platform]?.find(profile => profile.id === target.toLowerCase())
}
