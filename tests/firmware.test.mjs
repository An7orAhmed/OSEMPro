import test from 'node:test'
import assert from 'node:assert/strict'
import { parseFirmware, parseIntelHex, detectFirmwareFormat } from '../packages/simulator/src/firmware.ts'
import { SimulationRegistry } from '../packages/simulator/src/registry.ts'

test('parses real Intel HEX data and EOF records', () => {
  const result = parseIntelHex(':0400000001020304F2\n:00000001FF\n')
  assert.equal(result.segments.length, 1)
  assert.equal(result.segments[0].address, 0)
  assert.deepEqual([...result.segments[0].bytes], [1, 2, 3, 4])
})

test('handles extended linear addresses', () => {
  const result = parseIntelHex(':020000040800F2\n:0400000001020304F2\n:00000001FF')
  assert.equal(result.segments[0].address, 0x08000000)
})

test('rejects modified checksums and absent EOF', () => {
  assert.throws(() => parseIntelHex(':0400000001020304F3\n:00000001FF'), /checksum/)
  assert.throws(() => parseIntelHex(':0400000001020304F2'), /EOF/)
})

test('accepts valid binary and rejects invalid ELF', () => {
  assert.equal(detectFirmwareFormat('firmware.HEX'), 'hex')
  assert.equal(parseFirmware('firmware.bin', Uint8Array.of(1, 2)).format, 'bin')
  assert.throws(() => parseFirmware('firmware.elf', Uint8Array.of(1, 2)), /ELF/)
})

test('registry never claims an absent engine is installed', async () => {
  const registry = new SimulationRegistry()
  assert.deepEqual(registry.availablePlatforms(), [])
  assert.equal(registry.hasAdapter('stm32'), false)
  await assert.rejects(registry.createSession('stm32', 'stm32f401'), /No simulation adapter supports/)
})
