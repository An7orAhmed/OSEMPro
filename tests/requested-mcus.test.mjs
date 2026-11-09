import test from 'node:test'
import assert from 'node:assert/strict'
import { engineCandidates } from '../packages/simulator/src/catalog.ts'
import { plannedTargets, getPlannedTarget } from '../packages/simulator/src/planned-targets.ts'
import { renvoTargets } from '../packages/simulator/src/renvo-targets.ts'
import { createEngineRegistry } from '../packages/simulator/src/initialize.ts'
import { picSimTargets } from '../packages/simulator/src/picsim-targets.ts'
import { stm32f4Targets } from '../packages/simulator/src/stm32f4-targets.ts'

test('requested PIC families appear separately in platform catalog', () => {
  for (const family of ['pic12f', 'pic16f', 'pic18f', 'pic24f', 'dspic30f']) {
    assert.ok(engineCandidates.some(entry => entry.id === family))
  }
})

test('STM32F401 variants use their own Cortex-M4 browser emulator', () => {
  const registry = createEngineRegistry()
  const adapter = registry.listAdapters('stm32').find(engine => engine.id === 'stm32f4-emu')
  assert.ok(adapter)
  assert.deepEqual(adapter.targets, stm32f4Targets.map(target => target.id))
  assert.equal(stm32f4Targets.find(target => target.id === 'stm32f401cc').flashSize, 256 * 1024)
  assert.equal(stm32f4Targets.find(target => target.id === 'stm32f401ce').ramSize, 96 * 1024)
  for (const profile of stm32f4Targets) {
    assert.ok(!renvoTargets.stm32.includes(profile.id))
    assert.equal(profile.chip, 'stm32f401')
    assert.equal(getPlannedTarget('stm32', profile.id), undefined)
  }
})

test('unimplemented PIC12F/PIC24F/dsPIC30F targets remain unrunnable', async () => {
  const registry = createEngineRegistry()
  for (const family of ['pic12f', 'pic24f', 'dspic30f']) {
    assert.equal(registry.hasAdapter(family), false)
    for (const profile of plannedTargets[family]) {
      await assert.rejects(registry.createSession(family, profile.id), /No simulation adapter supports/)
    }
  }
})

test('PICsim registers actual PIC16F and PIC18F model lists', () => {
  const registry = createEngineRegistry()
  assert.deepEqual(registry.listAdapters('pic16f').map(engine => engine.id), ['picsim', 'renvo'])
  assert.deepEqual(registry.listAdapters('pic18f').map(engine => engine.id), ['picsim'])
  for (const platform of ['pic16f', 'pic18f']) {
    const adapter = registry.listAdapters(platform).find(engine => engine.id === 'picsim')
    assert.deepEqual(adapter.targets, picSimTargets[platform])
  }
})
