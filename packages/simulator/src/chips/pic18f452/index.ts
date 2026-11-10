import type { ChipDefinition } from '../types.ts'

export const chip: ChipDefinition = {
  "id": "pic18f452",
  "label": "PIC18F452",
  "packageName": "PDIP-40",
  "pins": [
    {
      "number": 1,
      "label": "MCLR/VPP"
    },
    {
      "number": 2,
      "label": "RA0/AN0",
      "port": "PIN2"
    },
    {
      "number": 3,
      "label": "RA1/AN1",
      "port": "PIN3"
    },
    {
      "number": 4,
      "label": "RA2/AN2",
      "port": "PIN4"
    },
    {
      "number": 5,
      "label": "RA3/AN3",
      "port": "PIN5"
    },
    {
      "number": 6,
      "label": "RA4/T0CKI",
      "port": "PIN6"
    },
    {
      "number": 7,
      "label": "RA5/AN4",
      "port": "PIN7"
    },
    {
      "number": 8,
      "label": "RE0/AN5",
      "port": "PIN8"
    },
    {
      "number": 9,
      "label": "RE1/AN6",
      "port": "PIN9"
    },
    {
      "number": 10,
      "label": "RE2/AN7",
      "port": "PIN10"
    },
    {
      "number": 11,
      "label": "VDD"
    },
    {
      "number": 12,
      "label": "VSS"
    },
    {
      "number": 13,
      "label": "OSC1"
    },
    {
      "number": 14,
      "label": "OSC2/RA6"
    },
    {
      "number": 15,
      "label": "RC0/T1CKI",
      "port": "PIN15"
    },
    {
      "number": 16,
      "label": "RC1/CCP2",
      "port": "PIN16"
    },
    {
      "number": 17,
      "label": "RC2/CCP1",
      "port": "PIN17"
    },
    {
      "number": 18,
      "label": "RC3/SCK",
      "port": "PIN18"
    },
    {
      "number": 19,
      "label": "RD0",
      "port": "PIN19"
    },
    {
      "number": 20,
      "label": "RD1",
      "port": "PIN20"
    },
    {
      "number": 21,
      "label": "RD2",
      "port": "PIN21"
    },
    {
      "number": 22,
      "label": "RD3",
      "port": "PIN22"
    },
    {
      "number": 23,
      "label": "RC4/SDI",
      "port": "PIN23"
    },
    {
      "number": 24,
      "label": "RC5/SDO",
      "port": "PIN24"
    },
    {
      "number": 25,
      "label": "RC6/TX",
      "port": "PIN25"
    },
    {
      "number": 26,
      "label": "RC7/RX",
      "port": "PIN26"
    },
    {
      "number": 27,
      "label": "RD4",
      "port": "PIN27"
    },
    {
      "number": 28,
      "label": "RD5",
      "port": "PIN28"
    },
    {
      "number": 29,
      "label": "RD6",
      "port": "PIN29"
    },
    {
      "number": 30,
      "label": "RD7",
      "port": "PIN30"
    },
    {
      "number": 31,
      "label": "VSS"
    },
    {
      "number": 32,
      "label": "VDD"
    },
    {
      "number": 33,
      "label": "RB0/INT0",
      "port": "PIN33"
    },
    {
      "number": 34,
      "label": "RB1/INT1",
      "port": "PIN34"
    },
    {
      "number": 35,
      "label": "RB2/INT2",
      "port": "PIN35"
    },
    {
      "number": 36,
      "label": "RB3",
      "port": "PIN36"
    },
    {
      "number": 37,
      "label": "RB4",
      "port": "PIN37"
    },
    {
      "number": 38,
      "label": "RB5",
      "port": "PIN38"
    },
    {
      "number": 39,
      "label": "RB6",
      "port": "PIN39"
    },
    {
      "number": 40,
      "label": "RB7",
      "port": "PIN40"
    }
  ],
  "registerGroups": [
    "GPIO",
    "Timers",
    "Interrupts",
    "ADC",
    "UART"
  ],
  "pinoutSource": "https://ww1.microchip.com/downloads/en/devicedoc/39564c.pdf"
}
