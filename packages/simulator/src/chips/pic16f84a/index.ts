import type { ChipDefinition } from '../types.ts'

export const chip: ChipDefinition = {
  "id": "pic16f84a",
  "label": "PIC16F84A",
  "packageName": "PDIP-18",
  "pins": [
    {
      "number": 1,
      "label": "RA2",
      "port": "PIN1"
    },
    {
      "number": 2,
      "label": "RA3",
      "port": "PIN2"
    },
    {
      "number": 3,
      "label": "RA4/T0CKI",
      "port": "PIN3"
    },
    {
      "number": 4,
      "label": "MCLR"
    },
    {
      "number": 5,
      "label": "VSS"
    },
    {
      "number": 6,
      "label": "RB0/INT",
      "port": "PIN6"
    },
    {
      "number": 7,
      "label": "RB1",
      "port": "PIN7"
    },
    {
      "number": 8,
      "label": "RB2",
      "port": "PIN8"
    },
    {
      "number": 9,
      "label": "RB3",
      "port": "PIN9"
    },
    {
      "number": 10,
      "label": "RB4",
      "port": "PIN10"
    },
    {
      "number": 11,
      "label": "RB5",
      "port": "PIN11"
    },
    {
      "number": 12,
      "label": "RB6",
      "port": "PIN12"
    },
    {
      "number": 13,
      "label": "RB7",
      "port": "PIN13"
    },
    {
      "number": 14,
      "label": "VDD"
    },
    {
      "number": 15,
      "label": "OSC2"
    },
    {
      "number": 16,
      "label": "OSC1"
    },
    {
      "number": 17,
      "label": "RA0",
      "port": "PIN17"
    },
    {
      "number": 18,
      "label": "RA1",
      "port": "PIN18"
    }
  ],
  "registerGroups": [
    "GPIO",
    "Timers",
    "Interrupts"
  ],
  "pinoutSource": "https://ww1.microchip.com/downloads/en/devicedoc/35007b.pdf",
  "registerMap": {
    "GPIO": {
      "PORTA": 5,
      "PORTB": 6,
      "TRISA": 133,
      "TRISB": 134
    },
    "Timers": {
      "TMR0": 1,
      "OPTION_REG": 129
    },
    "Interrupts": {
      "INTCON": 11
    }
  }
}
