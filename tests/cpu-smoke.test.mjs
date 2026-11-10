import test from 'node:test'
import assert from 'node:assert/strict'
import { parseFirmware } from '../packages/simulator/src/firmware.ts'
import { AVR8jsAdapter } from '../packages/simulator/src/adapters/avr.ts'

test('avr8js executes actual LDI and INC AVR opcodes', async () => {
  const adapter = new AVR8jsAdapter()
  const session = await adapter.createSession('atmega328p')
  try {
    await session.loadFirmware(parseFirmware('program.bin', Uint8Array.of(0x01, 0xe0, 0x03, 0x95)))
    await session.step(2)
    assert.equal(session.snapshot().registers.R16, 2)
    assert.equal(session.snapshot().registers.PC, 4)
    assert.equal(session.snapshot().instructions, 2)
    await session.reset()
    assert.equal(session.snapshot().registers.R16, 0)
  } finally {
    session.dispose()
  }
})
