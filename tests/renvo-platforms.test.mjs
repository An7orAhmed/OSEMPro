import test from 'node:test'
import assert from 'node:assert/strict'
import { renvoFirmwareFormat, renvoTargets } from '../packages/simulator/src/renvo-targets.ts'
import { decodeRenvoResult } from '../packages/simulator/src/renvo-result.ts'
import { createEngineRegistry } from '../packages/simulator/src/initialize.ts'

test('Renvo registers only the selected STM32 PIC16F and ESP32 families', () => {
  const registry = createEngineRegistry()
  assert.deepEqual(Object.keys(renvoTargets), ['stm32', 'pic16f', 'esp32'])
  for (const [platform, targets] of Object.entries(renvoTargets)) {
    const adapter = registry.listAdapters(platform).find(engine => engine.id === 'renvo')
    assert.ok(adapter)
    assert.deepEqual(adapter.targets, targets)
  }
})

test('Renvo binary and Intel HEX conversion is restricted to known MCU flash maps', () => {
  assert.equal(renvoFirmwareFormat('pic16f15376'), 'hex')
  assert.equal(renvoFirmwareFormat('stm32f103c8'), 'elf')
  assert.equal(renvoFirmwareFormat('stm32f411re'), 'elf')
  assert.equal(renvoFirmwareFormat('esp32c6'), 'elf')
})

test('Renvo CPU results contain actual CPU registers and UART bytes', () => {
  const snapshot = decodeRenvoResult({
    target: 'stm32f103c8',
    reason: 'InstructionLimit',
    stats: { instructions: 12, time: 17 },
    cpu: {
      architecture: 'ArmM',
      pc: 134217732,
      registers: [{ name: 'r0', value: 7, bits: 32 }]
    },
    uart: [72, 105, 10]
  })
  assert.equal(snapshot.ticks, 17)
  assert.equal(snapshot.instructions, 12)
  assert.equal(snapshot.registers.PC, 134217732)
  assert.equal(snapshot.registers.r0, 7)
  assert.equal(snapshot.serial, 'Hi\n')
})
