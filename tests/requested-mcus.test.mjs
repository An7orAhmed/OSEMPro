import test from 'node:test'
import assert from 'node:assert/strict'
import { engineCandidates } from '../packages/simulator/src/catalog.ts'
import { plannedTargets, getPlannedTarget } from '../packages/simulator/src/planned-targets.ts'
import { renvoTargets } from '../packages/simulator/src/renvo-targets.ts'
import { stm32f4Targets } from '../packages/simulator/src/stm32f4-targets.ts'
import { picSimTargets } from '../packages/simulator/src/picsim-targets.ts'
import { createEngineRegistry } from '../packages/simulator/src/initialize.ts'

const allowedPlatforms = [
  'stm32', 'avr8', 'pic12f', 'pic16f', 'pic18f',
  'pic24f', 'dspic30f', 'esp8266', 'esp32'
]

test('only the requested MCU families appear in the public catalog', () => {
  assert.deepEqual(engineCandidates.map(engine => engine.id), allowedPlatforms)
  assert.deepEqual(new Set(engineCandidates.map(engine => engine.id)).size, allowedPlatforms.length)
})

test('only requested families have simulation adapters', () => {
  const registry = createEngineRegistry()
  assert.deepEqual(registry.availablePlatforms().sort(), [
    'stm32', 'avr8', 'pic16f', 'pic18f', 'esp32'
  ].sort())
  assert.deepEqual(registry.listAdapters('avr8').map(adapter => adapter.id), ['avr8js'])
  assert.deepEqual(registry.listAdapters('stm32').map(adapter => adapter.id), ['stm32f4-emu', 'renvo'])
  assert.deepEqual(registry.listAdapters('pic16f').map(adapter => adapter.id), ['picsim', 'renvo'])
  assert.deepEqual(registry.listAdapters('pic18f').map(adapter => adapter.id), ['picsim'])
  assert.deepEqual(registry.listAdapters('esp32').map(adapter => adapter.id), ['renvo'])
})

test('STM32 hardware models cover only F103 F401 F407 and F411', () => {
  assert.deepEqual(renvoTargets.stm32, ['stm32f103c8', 'stm32f411re'])
  assert.deepEqual(stm32f4Targets.map(profile => profile.id), [
    'stm32f401cc', 'stm32f401ce', 'stm32f401rc',
    'stm32f401re', 'stm32f407vg', 'stm32f411re'
  ])
  assert.deepEqual([...new Set(stm32f4Targets.map(profile => profile.chip))], [
    'stm32f401', 'stm32f407', 'stm32f411'
  ])
  assert.equal(stm32f4Targets.find(profile => profile.id === 'stm32f407vg').flashSize, 1024 * 1024)
  assert.equal(stm32f4Targets.find(profile => profile.id === 'stm32f411re').ramSize, 128 * 1024)
  assert.equal(getPlannedTarget('stm32', 'stm32f401ce'), undefined)
})

test('PICsim supports only its named PIC16F and PIC18F models', () => {
  const registry = createEngineRegistry()
  for (const platform of ['pic16f', 'pic18f']) {
    const adapter = registry.listAdapters(platform).find(engine => engine.id === 'picsim')
    assert.deepEqual(adapter.targets, picSimTargets[platform])
  }
  assert.deepEqual(renvoTargets.pic16f, ['pic16f15376'])
})

test('PIC12F PIC24F dsPIC30F and ESP8266 do not claim an emulator', async () => {
  const registry = createEngineRegistry()
  for (const platform of ['pic12f', 'pic24f', 'dspic30f', 'esp8266']) {
    assert.equal(registry.hasAdapter(platform), false)
    assert.ok(plannedTargets[platform]?.length)
    for (const target of plannedTargets[platform]) {
      await assert.rejects(registry.createSession(platform, target.id), /No simulation adapter supports/)
    }
  }
})
