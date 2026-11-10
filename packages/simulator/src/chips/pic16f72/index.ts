import type { ChipDefinition } from '../types.ts'

export const chip: ChipDefinition = {
  "id": "pic16f72",
  "label": "PIC16F72",
  "packageName": "PDIP-28",
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
      "label": "RA3/AN3/VREF",
      "port": "PIN5"
    },
    {
      "number": 6,
      "label": "RA4/T0CKI",
      "port": "PIN6"
    },
    {
      "number": 7,
      "label": "RA5/AN4/SS",
      "port": "PIN7"
    },
    {
      "number": 8,
      "label": "VSS"
    },
    {
      "number": 9,
      "label": "OSC1/CLKI"
    },
    {
      "number": 10,
      "label": "OSC2/CLKO"
    },
    {
      "number": 11,
      "label": "RC0/T1OSO/T1CKI",
      "port": "PIN11"
    },
    {
      "number": 12,
      "label": "RC1/T1OSI",
      "port": "PIN12"
    },
    {
      "number": 13,
      "label": "RC2/CCP1",
      "port": "PIN13"
    },
    {
      "number": 14,
      "label": "RC3/SCK/SCL",
      "port": "PIN14"
    },
    {
      "number": 15,
      "label": "RC4/SDI/SDA",
      "port": "PIN15"
    },
    {
      "number": 16,
      "label": "RC5/SDO",
      "port": "PIN16"
    },
    {
      "number": 17,
      "label": "RC6",
      "port": "PIN17"
    },
    {
      "number": 18,
      "label": "RC7",
      "port": "PIN18"
    },
    {
      "number": 19,
      "label": "VSS"
    },
    {
      "number": 20,
      "label": "VDD"
    },
    {
      "number": 21,
      "label": "RB0/INT",
      "port": "PIN21"
    },
    {
      "number": 22,
      "label": "RB1",
      "port": "PIN22"
    },
    {
      "number": 23,
      "label": "RB2",
      "port": "PIN23"
    },
    {
      "number": 24,
      "label": "RB3",
      "port": "PIN24"
    },
    {
      "number": 25,
      "label": "RB4",
      "port": "PIN25"
    },
    {
      "number": 26,
      "label": "RB5",
      "port": "PIN26"
    },
    {
      "number": 27,
      "label": "RB6/PGC",
      "port": "PIN27"
    },
    {
      "number": 28,
      "label": "RB7/PGD",
      "port": "PIN28"
    }
  ],
  "registerGroups": [
    "GPIO",
    "ADC",
    "Timers",
    "Interrupts",
    "PWM",
    "SPI"
  ],
  "pinoutSource": "https://ww1.microchip.com/downloads/en/DeviceDoc/39597C.pdf",
  "registerMap": {
    "GPIO": {
      "PORTA": 5,
      "PORTB": 6,
      "PORTC": 7,
      "TRISA": 133,
      "TRISB": 134,
      "TRISC": 135
    },
    "ADC": {
      "ADRES": 30,
      "ADCON0": 31,
      "ADCON1": 159
    },
    "Timers": {
      "TMR0": 1,
      "OPTION_REG": 129,
      "TMR1L": 14,
      "TMR1H": 15,
      "T1CON": 16,
      "TMR2": 17,
      "T2CON": 18,
      "PR2": 146
    },
    "Interrupts": {
      "INTCON": 11,
      "PIR1": 12,
      "PIE1": 140
    },
    "PWM": {
      "CCPR1L": 21,
      "CCPR1H": 22,
      "CCP1CON": 23
    },
    "SPI": {
      "SSPBUF": 19,
      "SSPCON": 20,
      "SSPADD": 147,
      "SSPSTAT": 148
    }
  }
}
