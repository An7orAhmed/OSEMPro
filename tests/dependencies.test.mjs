import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const simulator = JSON.parse(readFileSync(new URL('../packages/simulator/package.json', import.meta.url), 'utf8'))
const lockfile = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'))

test('simulator dependencies match the npm lockfile', () => {
  assert.deepEqual(lockfile.packages['packages/simulator'].dependencies, simulator.dependencies)
})

test('STM32F4 browser assets are installed outside npm', () => {
  assert.equal(simulator.dependencies['stm32f4-emu'], undefined)
})
