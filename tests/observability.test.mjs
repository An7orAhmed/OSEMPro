import test from 'node:test'
import assert from 'node:assert/strict'
import { parseFirmware } from '../packages/simulator/src/firmware.ts'
import { AVR8jsAdapter } from '../packages/simulator/src/adapters/avr.ts'

test('live AVR GPIO values come from PINx while direction comes from DDRx', async () => {
  const session = await new AVR8jsAdapter().createSession('atmega328p')
  try {
    await session.loadFirmware(parseFirmware('firmware.bin', Uint8Array.from([0x01, 0xe0, 0x03, 0x95])))
    await session.step(2)
    const result = session.snapshot()
    assert.equal(result.registers.R16, 2)
    assert.ok(Object.hasOwn(result.gpio, 'B'))
    assert.ok(Object.hasOwn(result.gpioDirections, 'B'))
    assert.equal(result.peripherals.GPIO.PINB, result.gpio.B)
    assert.equal(result.peripherals.GPIO.DDRB, result.gpioDirections.B)
    assert.ok(Object.hasOwn(result.peripherals.Timers, 'TCNT0'))
    assert.ok(Object.hasOwn(result.peripherals.Interrupts, 'EIMSK'))
    assert.equal(result.peripherals.ADC, undefined)
  } finally {
    session.dispose()
  }
})
