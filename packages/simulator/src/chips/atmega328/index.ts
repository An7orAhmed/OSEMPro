import type { ChipDefinition } from '../types.ts'

export const chip: ChipDefinition = {
  "id": "atmega328",
  "label": "ATMEGA328",
  "packageName": "PDIP-28",
  "pins": [
    {
      "number": 1,
      "label": "PC6/RESET",
      "port": "C",
      "bit": 6
    },
    {
      "number": 2,
      "label": "PD0/RXD",
      "port": "D",
      "bit": 0
    },
    {
      "number": 3,
      "label": "PD1/TXD",
      "port": "D",
      "bit": 1
    },
    {
      "number": 4,
      "label": "PD2/INT0",
      "port": "D",
      "bit": 2
    },
    {
      "number": 5,
      "label": "PD3/INT1",
      "port": "D",
      "bit": 3
    },
    {
      "number": 6,
      "label": "PD4/T0",
      "port": "D",
      "bit": 4
    },
    {
      "number": 7,
      "label": "VCC"
    },
    {
      "number": 8,
      "label": "GND"
    },
    {
      "number": 9,
      "label": "PB6/XTAL1",
      "port": "B",
      "bit": 6
    },
    {
      "number": 10,
      "label": "PB7/XTAL2",
      "port": "B",
      "bit": 7
    },
    {
      "number": 11,
      "label": "PD5/OC0B",
      "port": "D",
      "bit": 5
    },
    {
      "number": 12,
      "label": "PD6/OC0A",
      "port": "D",
      "bit": 6
    },
    {
      "number": 13,
      "label": "PD7",
      "port": "D",
      "bit": 7
    },
    {
      "number": 14,
      "label": "PB0/ICP1",
      "port": "B",
      "bit": 0
    },
    {
      "number": 15,
      "label": "PB1/OC1A",
      "port": "B",
      "bit": 1
    },
    {
      "number": 16,
      "label": "PB2/SS",
      "port": "B",
      "bit": 2
    },
    {
      "number": 17,
      "label": "PB3/MOSI",
      "port": "B",
      "bit": 3
    },
    {
      "number": 18,
      "label": "PB4/MISO",
      "port": "B",
      "bit": 4
    },
    {
      "number": 19,
      "label": "PB5/SCK",
      "port": "B",
      "bit": 5
    },
    {
      "number": 20,
      "label": "AVCC"
    },
    {
      "number": 21,
      "label": "AREF"
    },
    {
      "number": 22,
      "label": "GND"
    },
    {
      "number": 23,
      "label": "PC0/ADC0",
      "port": "C",
      "bit": 0
    },
    {
      "number": 24,
      "label": "PC1/ADC1",
      "port": "C",
      "bit": 1
    },
    {
      "number": 25,
      "label": "PC2/ADC2",
      "port": "C",
      "bit": 2
    },
    {
      "number": 26,
      "label": "PC3/ADC3",
      "port": "C",
      "bit": 3
    },
    {
      "number": 27,
      "label": "PC4/SDA",
      "port": "C",
      "bit": 4
    },
    {
      "number": 28,
      "label": "PC5/SCL",
      "port": "C",
      "bit": 5
    }
  ],
  "registerGroups": [
    "GPIO",
    "Timers",
    "Interrupts",
    "ADC",
    "UART"
  ],
  "pinoutSource": "https://docs.arduino.cc/resources/datasheets/Atmel-42735-8-bit-AVR-Microcontroller-ATmega328-328P_Datasheet.pdf"
}
