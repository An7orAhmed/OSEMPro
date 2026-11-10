import test from 'node:test'
import assert from 'node:assert/strict'
import { parseFirmware } from '../packages/simulator/src/firmware.ts'
import { DsPic30Adapter } from '../packages/simulator/src/adapters/dspic30.ts'

function binary(words) {
  return Uint8Array.from(words.flatMap(word => [word & 255, word >>> 8 & 255, word >>> 16 & 255, 0]))
}

function hexRecord(address, type, values) {
  const data = [values.length, address >>> 8 & 255, address & 255, type, ...values]
  const checksum = (-data.reduce((sum, value) => sum + value, 0)) & 255
  return ':' + [...data, checksum].map(byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase()
}

async function createSession(target = 'dspic30f2010') {
  return new DsPic30Adapter().createSession(target)
}

test('dsPIC30F executes real MOV literal, ADD immediate and MOV register encodings', async () => {
  const session = await createSession()
  try {
    await session.loadFirmware(parseFirmware('program.bin', binary([0x200281, 0xb00021, 0x780101])))
    await session.step(3)
    const snapshot = session.snapshot()
    assert.equal(snapshot.registers.W1, 42)
    assert.equal(snapshot.registers.W2, 42)
    assert.equal(snapshot.registers.PC, 6)
    assert.equal(snapshot.cycles, 3)
    await session.reset()
    assert.equal(session.snapshot().registers.W1, 0)
  } finally {
    session.dispose()
  }
})

test('dsPIC30F uses working registers and real RAM file addressing', async () => {
  const session = await createSession('dspic30f4011')
  try {
    await session.loadFirmware(parseFirmware('program.bin', binary([0x2002a0, 0x884000, 0x804002])))
    await session.step(3)
    assert.equal(session.snapshot().registers.W2, 42)
    assert.equal(session.snapshot().registers.W15, 0x800)
  } finally {
    session.dispose()
  }
})

test('dsPIC30F executes two word GOTO and relative BRA', async () => {
  const session = await createSession()
  try {
    await session.loadFirmware(parseFirmware('program.bin', binary([
      0x040008, 0, 0x200001, 0x000000, 0x2002a1, 0x37ffff
    ])))
    await session.step(3)
    assert.equal(session.snapshot().registers.W1, 42)
    assert.equal(session.snapshot().registers.PC, 10)
    assert.equal(session.snapshot().cycles, 5)
  } finally {
    session.dispose()
  }
})

test('dsPIC30F CALL and RETURN use a software stack', async () => {
  const session = await createSession('dspic30f4013')
  try {
    await session.loadFirmware(parseFirmware('program.bin', binary([
      0x020008, 0, 0x37ffff, 0, 0x2003a0, 0x060000
    ])))
    await session.step(3)
    assert.equal(session.snapshot().registers.W0, 58)
    assert.equal(session.snapshot().registers.PC, 4)
    assert.equal(session.snapshot().registers.W15, 0x800)
  } finally {
    session.dispose()
  }
})

test('dsPIC30F loads INHX32 firmware with zero phantom bytes and conditional branches', async () => {
  const bytes = binary([0x2ffff1, 0xb00011, 0x320001, 0x200011, 0x2002a1])
  const hex = [
    hexRecord(0, 4, [0, 0]),
    hexRecord(0, 0, bytes.subarray(0, 16)),
    hexRecord(16, 0, bytes.subarray(16)),
    ':00000001FF'
  ].join('\n')
  const session = await createSession()
  try {
    await session.loadFirmware(parseFirmware('program.hex', new TextEncoder().encode(hex)))
    await session.step(4)
    assert.equal(session.snapshot().registers.W1, 42)
    assert.equal(session.snapshot().registers.PC, 10)
  } finally {
    session.dispose()
  }
})

test('dsPIC30F rejects malformed firmware, unknown opcodes and unsupported targets', async () => {
  const adapter = new DsPic30Adapter()
  const session = await adapter.createSession('dspic30f2010')
  try {
    await session.loadFirmware(parseFirmware('bad.bin', binary([0x112233])))
    await assert.rejects(session.step(1), /Unsupported dsPIC30F opcode/)
    await assert.rejects(session.loadFirmware(parseFirmware('bad.bin', Uint8Array.of(1, 2, 3))), /4-byte program words/)
    await assert.rejects(session.loadFirmware(parseFirmware('bad.bin', Uint8Array.of(0, 0, 0, 1))), /phantom byte/)
    await assert.rejects(session.loadFirmware(parseFirmware('big.bin', new Uint8Array(16388))), /exceeds selected program memory/)
    await assert.rejects(adapter.createSession('dspic30f6014'), /Unsupported dsPIC30F target/)
  } finally {
    session.dispose()
  }
})

test('dsPIC30F SUB immediate updates carry and zero while CLR WREG leaves status intact', async () => {
  const session = await createSession()
  try {
    await session.loadFirmware(parseFirmware('program.bin', binary([
      0x2002a0, 0xb102a0, 0x320001, 0x200011, 0xef0000
    ])))
    await session.step(4)
    assert.equal(session.snapshot().registers.W0, 0)
    assert.equal(session.snapshot().registers.PC, 10)
    assert.equal(session.snapshot().registers.SR & 3, 3)
  } finally {
    session.dispose()
  }
})

test('Microchip INHX32 maps doubled HEX byte addresses to dsPIC program counters', async () => {
  const session = await createSession()
  try {
    const jump = binary([0x040100, 0])
    const program = binary([0x2002a0])
    const hex = [
      hexRecord(0, 4, [0, 0]),
      hexRecord(0, 0, jump),
      hexRecord(0x200, 0, program),
      ':00000001FF'
    ].join('\n')
    await session.loadFirmware(parseFirmware('program.hex', new TextEncoder().encode(hex)))
    await session.step(2)
    assert.equal(session.snapshot().registers.W0, 42)
    assert.equal(session.snapshot().registers.PC, 0x102)
  } finally {
    session.dispose()
  }
})
