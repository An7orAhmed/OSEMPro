import test from 'node:test'
import assert from 'node:assert/strict'
import { renvoFirmwareFormat, renvoTargets } from '../packages/simulator/src/renvo-targets.ts'
import { decodeRenvoResult } from '../packages/simulator/src/renvo-result.ts'
import { createEngineRegistry } from '../packages/simulator/src/initialize.ts'

test('Renvo registers every supported family without installing a fake runtime', () => {
  const registry = createEngineRegistry()
  for (const [platform, targets] of Object.entries(renvoTargets)) {
    const adapters = registry.listAdapters(platform)
    const renvo = adapters.find(engine => engine.id === 'renvo')
    assert.ok(renvo, `Missing ${platform} adapter`)
    assert.deepEqual(renvo.targets, targets)
    assert.ok(targets.length > 0)
  }
  assert.equal(registry.hasAdapter('stm8'), false)
})

test('Intel HEX execution is restricted to Renvo PIC16 and EFM8 targets', () => {
  assert.equal(renvoFirmwareFormat('pic16f15376'), 'hex')
  assert.equal(renvoFirmwareFormat('efm8bb52f32g'), 'hex')
  assert.equal(renvoFirmwareFormat('stm32f103c8'), 'elf')
  assert.equal(renvoFirmwareFormat('esp32c6'), 'elf')
  assert.equal(renvoFirmwareFormat('msp430fr2433'), 'elf')
})

test('Renvo CPU snapshots use actual RunResult fields', () => {
  const snapshot = decodeRenvoResult({
    target: 'stm32f103c8',
    reason: 'InstructionLimit',
    stats: { instructions: 12, time: 17, events: 2 },
    cpu: {
      architecture: 'ArmM',
      pc: 134217732,
      registers: [{ name: 'r0', value: 7, bits: 32 }, { name: 'sp', value: 536870912, bits: 32 }]
    },
    uart: [72, 105, 10]
  })
  assert.equal(snapshot.ticks, 17)
  assert.equal(snapshot.cycles, 0)
  assert.equal(snapshot.instructions, 12)
  assert.equal(snapshot.registers.PC, 134217732)
  assert.equal(snapshot.registers.r0, 7)
  assert.equal(snapshot.serial, 'Hi\n')
  assert.equal(snapshot.stopReason, 'InstructionLimit')
})
