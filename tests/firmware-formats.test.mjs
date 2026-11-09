import test from 'node:test'
import assert from 'node:assert/strict'
import { parseFirmware } from '../packages/simulator/src/firmware.ts'
import {
  acceptedRenvoFormats,
  prepareRenvoFirmware,
  toArmElf,
  toIntelHex
} from '../packages/simulator/src/firmware-formats.ts'

const flashBase = 0x08000000

function binaryFirmware() {
  const bytes = new Uint8Array(12)
  const view = new DataView(bytes.buffer)
  view.setUint32(0, 0x20010000, true)
  view.setUint32(4, flashBase + 9, true)
  bytes.set([0xfe, 0xe7, 0x70, 0x47], 8)
  return parseFirmware('blink.bin', bytes)
}

function intelHexRecord(address, kind, values) {
  const bytes = [values.length, address >>> 8 & 255, address & 255, kind, ...values]
  const checksum = (-bytes.reduce((sum, value) => sum + value, 0)) & 255
  return ':' + [...bytes, checksum].map(value => value.toString(16).padStart(2, '0')).join('').toUpperCase()
}

function imageHeaders(image) {
  const view = new DataView(image.bytes.buffer, image.bytes.byteOffset, image.bytes.byteLength)
  const firstHeader = view.getUint32(28, true)
  return {
    elfMachine: view.getUint16(18, true),
    entry: view.getUint32(24, true),
    programHeaders: view.getUint16(44, true),
    physical: view.getUint32(firstHeader + 12, true),
    fileOffset: view.getUint32(firstHeader + 4, true),
    fileSize: view.getUint32(firstHeader + 16, true)
  }
}

test('STM32 raw BIN becomes a valid ARM ELF with exact flash address and reset handler', () => {
  const original = binaryFirmware()
  const result = prepareRenvoFirmware(original, 'stm32f411re')
  const headers = imageHeaders(result)
  assert.equal(result.format, 'elf')
  assert.equal(headers.elfMachine, 40)
  assert.equal(headers.entry, flashBase + 8)
  assert.equal(headers.programHeaders, 1)
  assert.equal(headers.physical, flashBase)
  assert.equal(headers.fileSize, original.bytes.length)
  assert.deepEqual(
    result.bytes.subarray(headers.fileOffset, headers.fileOffset + headers.fileSize),
    original.bytes
  )
})

test('STM32 extended address Intel HEX keeps true flash mapping', () => {
  const contents = [
    intelHexRecord(0, 4, [0x08, 0x00]),
    intelHexRecord(0, 0, [...binaryFirmware().bytes]),
    ':00000001FF'
  ].join('\n')
  const source = parseFirmware('blink.hex', new TextEncoder().encode(contents))
  const image = toArmElf(source, 'stm32f411re')
  assert.equal(imageHeaders(image).physical, flashBase)
  assert.equal(imageHeaders(image).entry, flashBase + 8)
})

test('PIC raw BIN is converted to checksum-valid Intel HEX in memory', () => {
  const source = parseFirmware('pic.bin', Uint8Array.from([0x2a, 0x30, 0x03, 0x28]))
  const result = toIntelHex(source)
  assert.equal(result.format, 'hex')
  assert.deepEqual(result.segments[0].bytes, source.bytes)
  assert.equal(prepareRenvoFirmware(source, 'pic16f15376').format, 'hex')
})

test('incorrect target formats and vectors fail instead of appearing to run', () => {
  assert.deepEqual(acceptedRenvoFormats('stm32f411re'), ['elf', 'hex', 'bin'])
  assert.deepEqual(acceptedRenvoFormats('pic16f15376'), ['hex', 'bin'])
  assert.deepEqual(acceptedRenvoFormats('esp32c6'), ['elf'])
  assert.throws(() => prepareRenvoFirmware(binaryFirmware(), 'stm32f401re'), /No verified/)
  assert.throws(() => prepareRenvoFirmware(binaryFirmware(), 'esp32c6'), /not supported/)
  assert.throws(() => toArmElf(parseFirmware('bad.bin', Uint8Array.of(1, 2, 3)), 'stm32f411re'), /vector table/)
  assert.throws(() => toIntelHex(parseFirmware('bad.bin', Uint8Array.of(1))), /16-bit/)
})
