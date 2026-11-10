import test from 'node:test'
import assert from 'node:assert/strict'
import { parseFirmware } from '../packages/simulator/src/firmware.ts'
import { PIC12Adapter } from '../packages/simulator/src/adapters/pic12.ts'

function binary(words) {
  return Uint8Array.from(words.flatMap(word => [word & 255, word >> 8]))
}

async function load(target, words) {
  const session = await new PIC12Adapter().createSession(target)
  await session.loadFirmware(parseFirmware('program.bin', binary(words)))
  return session
}

test('PIC12F675 executes MOVLW, MOVWF and GOTO instructions', async () => {
  const session = await load('pic12f675', [0x302a, 0x00a0, 0x2802])
  try {
    await session.step(3)
    assert.equal(session.snapshot().registers.W, 42)
    assert.equal(session.snapshot().registers.PC, 2)
    assert.equal(session.snapshot().cycles, 4)
  } finally {
    session.dispose()
  }
})

test('PIC12F683 handles banked TRISIO and GPIO output', async () => {
  const session = await load('pic12f683', [0x1683, 0x3000, 0x0085, 0x1283, 0x3001, 0x0085])
  try {
    await session.step(6)
    assert.equal(session.snapshot().gpio.GP0, 1)
    assert.equal(session.snapshot().registers.TRISIO, 8)
    await session.reset()
    assert.equal(session.snapshot().gpio.GP0, 0)
    assert.equal(session.snapshot().registers.TRISIO, 0x3f)
  } finally {
    session.dispose()
  }
})

test('PIC12F call stack and RETLW execute real program flow', async () => {
  const session = await load('pic12f675', [0x2003, 0x2804, 0, 0x3442, 0])
  try {
    await session.step(3)
    assert.equal(session.snapshot().registers.W, 66)
    assert.equal(session.snapshot().registers.PC, 4)
  } finally {
    session.dispose()
  }
})

test('PIC12F loads valid Intel HEX and rejects unsupported firmware', async () => {
  const session = await new PIC12Adapter().createSession('pic12f675')
  try {
    const hex = new TextEncoder().encode(':020000002A30A4\n:00000001FF\n')
    await session.loadFirmware(parseFirmware('program.hex', hex))
    await session.step(1)
    assert.equal(session.snapshot().registers.W, 42)
    await assert.rejects(session.loadFirmware(parseFirmware('bad.bin', Uint8Array.of(1))), /aligned/)
    await assert.rejects(session.loadFirmware(parseFirmware('huge.bin', new Uint8Array(2050))), /exceeds/)
    await assert.rejects(new PIC12Adapter().createSession('pic12f1840'), /Unsupported/)
  } finally {
    session.dispose()
  }
})
