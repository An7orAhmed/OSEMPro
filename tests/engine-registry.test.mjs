import test from 'node:test'
import assert from 'node:assert/strict'
import { SimulationRegistry } from '../packages/simulator/src/registry.ts'
import { createEngineRegistry } from '../packages/simulator/src/initialize.ts'

function adapter(id, platform, ready = true) {
  return {
    id,
    platform,
    targets: ['chip'],
    async isAvailable() { return ready },
    async createSession() { return { id } }
  }
}

test('multiple independent engines can target the same platform', async () => {
  const registry = new SimulationRegistry()
  registry.register(adapter('primary', 'avr8', false))
  registry.register(adapter('fallback', 'avr8'))
  assert.equal(registry.listAdapters('avr8').length, 2)
  assert.equal((await registry.createSession('avr8', 'chip')).id, 'fallback')
  assert.deepEqual((await registry.inspect('avr8')).map(option => option.available), [false, true])
})

test('explicit engine selection never silently uses another engine', async () => {
  const registry = new SimulationRegistry()
  registry.register(adapter('primary', 'avr8', false))
  registry.register(adapter('fallback', 'avr8'))
  await assert.rejects(registry.createSession('avr8', 'chip', 'primary'), /No installed/)
  assert.equal((await registry.createSession('avr8', 'chip', 'fallback')).id, 'fallback')
  assert.throws(() => registry.register(adapter('fallback', 'avr8')), /already registered/)
})

test('built-in adapters register exact targets and distinct backends', () => {
  const registry = createEngineRegistry()
  assert.deepEqual(registry.listAdapters('avr8').map(item => item.id), ['avr8js'])
  assert.deepEqual(registry.listAdapters('stm32').map(item => item.id), ['stm32f4-emu', 'renvo'])
  assert.equal(registry.hasAdapter('esp8266'), false)
  assert.deepEqual(registry.listAdapters('pic12f').map(item => item.id), ['pic12-core'])
  assert.equal(registry.hasAdapter('pic24f'), false)
  assert.equal(registry.hasAdapter('dspic30f'), false)
})

test('unsupported target rejects before starting a CPU', async () => {
  const registry = createEngineRegistry()
  await assert.rejects(registry.createSession('stm32', 'stm32f401'), /No simulation adapter supports/)
})

test('inspection only exposes target models installed in each runtime', async () => {
  const registry = new SimulationRegistry()
  registry.register({
    id: 'subset',
    platform: 'stm32',
    targets: ['stm32f103c8', 'stm32h743zi'],
    async isAvailable() { return true },
    async availableTargets() { return ['stm32f103c8'] },
    async createSession() { return {} }
  })
  const [result] = await registry.inspect('stm32')
  assert.equal(result.available, true)
  assert.deepEqual(result.availableTargets, ['stm32f103c8'])
  assert.deepEqual(result.targets, ['stm32f103c8', 'stm32h743zi'])
})

test('uninstalled runtime never reports its targets as available', async () => {
  const registry = new SimulationRegistry()
  registry.register(adapter('missing', 'esp32', false))
  const [result] = await registry.inspect('esp32')
  assert.equal(result.available, false)
  assert.deepEqual(result.availableTargets, [])
})
