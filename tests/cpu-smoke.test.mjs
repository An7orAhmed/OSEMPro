import test from 'node:test'
import assert from 'node:assert/strict'
import { parseFirmware } from '../src/engine/firmware.ts'
import { AVR8jsAdapter } from '../src/engine/adapters/avr.ts'
import { RP2040jsAdapter } from '../src/engine/adapters/rp2040.ts'

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

test('rp2040js executes actual Thumb MOVS and ADDS opcodes', async () => {
  const adapter = new RP2040jsAdapter()
  const session = await adapter.createSession('rp2040')
  try {
    await session.loadFirmware(parseFirmware('program.bin', Uint8Array.of(0x03, 0x20, 0x04, 0x30)))
    await session.step(2)
    assert.equal(session.snapshot().registers.R0, 7)
    assert.equal(session.snapshot().registers.PC, 0x10000004)
    assert.equal(session.snapshot().instructions, 2)
  } finally {
    session.dispose()
  }
})
