import test from 'node:test'
import assert from 'node:assert/strict'
import { SimulationRegistry } from '../src/engine/registry.ts'
import { createEngineRegistry } from '../src/engine/initialize.ts'

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
  registry.register(adapter('primary', 'avr', false))
  registry.register(adapter('fallback', 'avr'))
  assert.equal(registry.listAdapters('avr').length, 2)
  assert.equal((await registry.createSession('avr', 'chip')).id, 'fallback')
  assert.deepEqual((await registry.inspect('avr')).map(option => option.available), [false, true])
})

test('explicit engine selection never silently uses another engine', async () => {
  const registry = new SimulationRegistry()
  registry.register(adapter('primary', 'avr', false))
  registry.register(adapter('fallback', 'avr'))
  await assert.rejects(registry.createSession('avr', 'chip', 'primary'), /No installed/)
  assert.equal((await registry.createSession('avr', 'chip', 'fallback')).id, 'fallback')
  assert.throws(() => registry.register(adapter('fallback', 'avr')), /already registered/)
})

test('built-in adapters register exact targets and distinct backends', () => {
  const registry = createEngineRegistry()
  assert.deepEqual(registry.listAdapters('avr').map(item => item.id), ['avr8js', 'renvo'])
  assert.deepEqual(registry.listAdapters('stm32').map(item => item.id), ['renvo'])
  assert.deepEqual(registry.listAdapters('rp2040').map(item => item.id), ['rp2040js'])
  assert.equal(registry.hasAdapter('stm8'), false)
})

test('unsupported target rejects before starting a CPU', async () => {
  const registry = createEngineRegistry()
  await assert.rejects(registry.createSession('stm32', 'stm32f401'), /No simulation adapter supports/)
})
