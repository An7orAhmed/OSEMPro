import type { ChipDefinition } from '../types.ts'

export const chip: ChipDefinition = {
  "id": "stm32f103c8",
  "label": "STM32F103C8",
  "packageName": "LQFP-48",
  "pins": [
    {
      "number": 1,
      "label": "VBAT"
    },
    {
      "number": 2,
      "label": "PC13",
      "port": "GPIOC",
      "bit": 13
    },
    {
      "number": 3,
      "label": "PC14",
      "port": "GPIOC",
      "bit": 14
    },
    {
      "number": 4,
      "label": "PC15",
      "port": "GPIOC",
      "bit": 15
    },
    {
      "number": 5,
      "label": "PD0",
      "port": "GPIOD",
      "bit": 0
    },
    {
      "number": 6,
      "label": "PD1",
      "port": "GPIOD",
      "bit": 1
    },
    {
      "number": 7,
      "label": "NRST"
    },
    {
      "number": 8,
      "label": "VSSA"
    },
    {
      "number": 9,
      "label": "VDDA"
    },
    {
      "number": 10,
      "label": "PA0",
      "port": "GPIOA",
      "bit": 0
    },
    {
      "number": 11,
      "label": "PA1",
      "port": "GPIOA",
      "bit": 1
    },
    {
      "number": 12,
      "label": "PA2",
      "port": "GPIOA",
      "bit": 2
    },
    {
      "number": 13,
      "label": "PA3",
      "port": "GPIOA",
      "bit": 3
    },
    {
      "number": 14,
      "label": "PA4",
      "port": "GPIOA",
      "bit": 4
    },
    {
      "number": 15,
      "label": "PA5",
      "port": "GPIOA",
      "bit": 5
    },
    {
      "number": 16,
      "label": "PA6",
      "port": "GPIOA",
      "bit": 6
    },
    {
      "number": 17,
      "label": "PA7",
      "port": "GPIOA",
      "bit": 7
    },
    {
      "number": 18,
      "label": "PB0",
      "port": "GPIOB",
      "bit": 0
    },
    {
      "number": 19,
      "label": "PB1",
      "port": "GPIOB",
      "bit": 1
    },
    {
      "number": 20,
      "label": "PB2",
      "port": "GPIOB",
      "bit": 2
    },
    {
      "number": 21,
      "label": "PB10",
      "port": "GPIOB",
      "bit": 10
    },
    {
      "number": 22,
      "label": "PB11",
      "port": "GPIOB",
      "bit": 11
    },
    {
      "number": 23,
      "label": "VSS"
    },
    {
      "number": 24,
      "label": "VDD"
    },
    {
      "number": 25,
      "label": "PB12",
      "port": "GPIOB",
      "bit": 12
    },
    {
      "number": 26,
      "label": "PB13",
      "port": "GPIOB",
      "bit": 13
    },
    {
      "number": 27,
      "label": "PB14",
      "port": "GPIOB",
      "bit": 14
    },
    {
      "number": 28,
      "label": "PB15",
      "port": "GPIOB",
      "bit": 15
    },
    {
      "number": 29,
      "label": "PA8",
      "port": "GPIOA",
      "bit": 8
    },
    {
      "number": 30,
      "label": "PA9",
      "port": "GPIOA",
      "bit": 9
    },
    {
      "number": 31,
      "label": "PA10",
      "port": "GPIOA",
      "bit": 10
    },
    {
      "number": 32,
      "label": "PA11",
      "port": "GPIOA",
      "bit": 11
    },
    {
      "number": 33,
      "label": "PA12",
      "port": "GPIOA",
      "bit": 12
    },
    {
      "number": 34,
      "label": "PA13",
      "port": "GPIOA",
      "bit": 13
    },
    {
      "number": 35,
      "label": "VSS"
    },
    {
      "number": 36,
      "label": "VDD"
    },
    {
      "number": 37,
      "label": "PA14",
      "port": "GPIOA",
      "bit": 14
    },
    {
      "number": 38,
      "label": "PA15",
      "port": "GPIOA",
      "bit": 15
    },
    {
      "number": 39,
      "label": "PB3",
      "port": "GPIOB",
      "bit": 3
    },
    {
      "number": 40,
      "label": "PB4",
      "port": "GPIOB",
      "bit": 4
    },
    {
      "number": 41,
      "label": "PB5",
      "port": "GPIOB",
      "bit": 5
    },
    {
      "number": 42,
      "label": "PB6",
      "port": "GPIOB",
      "bit": 6
    },
    {
      "number": 43,
      "label": "PB7",
      "port": "GPIOB",
      "bit": 7
    },
    {
      "number": 44,
      "label": "BOOT0"
    },
    {
      "number": 45,
      "label": "PB8",
      "port": "GPIOB",
      "bit": 8
    },
    {
      "number": 46,
      "label": "PB9",
      "port": "GPIOB",
      "bit": 9
    },
    {
      "number": 47,
      "label": "VSS"
    },
    {
      "number": 48,
      "label": "VDD"
    }
  ],
  "registerGroups": [
    "GPIO",
    "ADC",
    "Timers",
    "Interrupts",
    "UART"
  ],
  "pinoutSource": "https://www.st.com/resource/en/datasheet/stm32f103c8.pdf"
}
