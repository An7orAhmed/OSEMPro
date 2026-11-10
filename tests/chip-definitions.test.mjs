import test from 'node:test'
import assert from 'node:assert/strict'
import { chips, getChipDefinition } from '../packages/simulator/src/chips/index.ts'
import { engineCandidates } from '../packages/simulator/src/catalog.ts'
import { picSimTargets } from '../packages/simulator/src/picsim-targets.ts'
import { plannedTargets } from '../packages/simulator/src/planned-targets.ts'
import { renvoTargets } from '../packages/simulator/src/renvo-targets.ts'
import { stm32f4Targets } from '../packages/simulator/src/stm32f4-targets.ts'

test('each selectable MCU has its own chip definition folder', () => {
  const models = [
    ...stm32f4Targets.map(item => item.id),
    ...Object.values(renvoTargets).flat(),
    ...Object.values(picSimTargets).flat(),
    ...Object.values(plannedTargets).flatMap(items => items.map(item => item.id)),
    'atmega328p',
    'atmega328'
  ]
  assert.deepEqual([...new Set(chips.map(chip => chip.id))].sort(), [...new Set(models)].sort())
  for (const model of models) assert.equal(getChipDefinition(model)?.id, model)
  assert.equal(engineCandidates.length, 9)
})

test('verified pinouts use unique physical pins and documented package counts', () => {
  for (const chip of chips) {
    if (!chip.pins.length) {
      assert.equal(chip.packageName, null)
      continue
    }
    const pinCount = Number(chip.packageName.split('-').at(-1))
    assert.equal(chip.pins.length, pinCount)
    assert.deepEqual(chip.pins.map(pin => pin.number), Array.from({ length: pinCount }, (_, i) => i + 1))
    assert.ok(chip.pinoutSource?.startsWith('https://'))
  }
})

test('verified packages have real pins while unverified packages stay unknown', () => {
  assert.equal(getChipDefinition('stm32f401re').pins.length, 64)
  assert.equal(getChipDefinition('stm32f401cc').pins.length, 48)
  assert.equal(getChipDefinition('stm32f407vg').pins.length, 100)
  assert.equal(getChipDefinition('stm32f411re').pins[0].label, 'VBAT')
  assert.equal(getChipDefinition('dspic30f4011').packageName, null)
  assert.equal(getChipDefinition('esp32s3').pins.length, 0)
  assert.equal(getChipDefinition('atmega328p').pins[18].label, 'PB5/SCK')
  assert.equal(getChipDefinition('stm32f103c8').pins[0].label, 'VBAT')
})

test('PICsim register mappings use exact documented SFR addresses', () => {
  const pic16 = getChipDefinition('pic16f84a')
  assert.equal(pic16.registerMap.Timers.TMR0, 0x01)
  assert.equal(pic16.registerMap.Interrupts.INTCON, 0x0b)
  assert.equal(pic16.registerMap.ADC, undefined)
  const pic18 = getChipDefinition('pic18f452')
  assert.equal(pic18.registerMap.ADC.ADCON0, 0xfc2)
  assert.equal(pic18.registerMap.Timers.TMR0L, 0xfd6)
  assert.equal(pic18.registerMap.Interrupts.INTCON, 0xff2)
})

test('STM32F4 register addresses remain device specific and no unsupported ADC is invented', () => {
  const f401 = getChipDefinition('stm32f401re')
  const f407 = getChipDefinition('stm32f407vg')
  assert.equal(f401.registerMap.ADC.ADC1_SR, 0x40012000)
  assert.equal(f401.registerMap.ADC.ADC2_SR, undefined)
  assert.equal(f407.registerMap.ADC.ADC2_SR, 0x40012100)
  assert.equal(f407.registerMap.Interrupts.EXTI_PR, 0x40013c14)
})

test('PIC16F72 and PIC16F73 use their verified 28 pin packages', () => {
  const pic72 = getChipDefinition('pic16f72')
  const pic73 = getChipDefinition('pic16f73')
  assert.equal(pic72.packageName, 'PDIP-28')
  assert.equal(pic73.packageName, 'PDIP-28')
  assert.equal(pic72.pins.length, 28)
  assert.equal(pic73.pins.length, 28)
  assert.equal(pic72.pins[0].label, 'MCLR/VPP')
  assert.equal(pic72.pins[11].label, 'RC1/T1OSI')
  assert.equal(pic73.pins[11].label, 'RC1/T1OSI/CCP2')
  assert.equal(pic72.pins[16].label, 'RC6')
  assert.equal(pic73.pins[16].label, 'RC6/TX/CK')
  assert.equal(pic73.pins[27].label, 'RB7/PGD')
})

test('PIC16F72 and PIC16F73 only expose their own documented registers', () => {
  const pic72 = getChipDefinition('pic16f72')
  const pic73 = getChipDefinition('pic16f73')
  assert.equal(pic72.registerMap.ADC.ADCON0, 0x1f)
  assert.equal(pic73.registerMap.ADC.ADCON1, 0x9f)
  assert.equal(pic72.registerMap.Timers.TMR2, 0x11)
  assert.equal(pic72.registerMap.Interrupts.INTCON, 0x0b)
  assert.equal(pic72.registerMap.UART, undefined)
  assert.equal(pic73.registerMap.UART.RCSTA, 0x18)
  assert.equal(pic73.registerMap.Interrupts.PIE2, 0x8d)
  assert.equal(pic73.registerMap.PWM.CCP2CON, 0x1d)
})
