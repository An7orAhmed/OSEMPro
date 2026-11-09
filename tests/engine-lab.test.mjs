import test from 'node:test'
import assert from 'node:assert/strict'
import { createEngineRegistry } from '../packages/simulator/src/initialize.ts'
import { cpuSmokeFixtures, runCpuSmoke } from '../packages/simulator/src/smoke.ts'

for (const fixture of cpuSmokeFixtures) {
  test(`engine lab runs real ${fixture.engine} instructions`, async () => {
    const result = await runCpuSmoke(
      createEngineRegistry(),
      fixture.platform,
      fixture.engine,
      fixture.target
    )
    assert.equal(result.passed, true)
    assert.equal(result.actual, fixture.expected)
    assert.equal(result.snapshot.instructions, 2)
  })
}

test('engine lab rejects unknown fixtures instead of simulating success', async () => {
  await assert.rejects(
    runCpuSmoke(createEngineRegistry(), 'stm32', 'renvo', 'stm32f103c8t6'),
    /No verified CPU smoke fixture/
  )
})
