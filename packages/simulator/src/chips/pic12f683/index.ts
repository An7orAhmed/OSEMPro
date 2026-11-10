import type { ChipDefinition } from '../types.ts'

export const chip: ChipDefinition = {
  "id": "pic12f683",
  "label": "PIC12F683",
  "packageName": "PDIP-8",
  "pins": [
    {
      "number": 1,
      "label": "VDD"
    },
    {
      "number": 2,
      "label": "GP5/OSC1",
      "port": "GP",
      "bit": 5
    },
    {
      "number": 3,
      "label": "GP4/OSC2",
      "port": "GP",
      "bit": 4
    },
    {
      "number": 4,
      "label": "GP3/MCLR",
      "port": "GP",
      "bit": 3
    },
    {
      "number": 5,
      "label": "GP2/AN2",
      "port": "GP",
      "bit": 2
    },
    {
      "number": 6,
      "label": "GP1/AN1",
      "port": "GP",
      "bit": 1
    },
    {
      "number": 7,
      "label": "GP0/AN0",
      "port": "GP",
      "bit": 0
    },
    {
      "number": 8,
      "label": "VSS"
    }
  ],
  "registerGroups": [
    "GPIO",
    "Timers",
    "Interrupts",
    "ADC"
  ],
  "pinoutSource": "https://ww1.microchip.com/downloads/en/DeviceDoc/41211D.pdf"
}
