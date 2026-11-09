import test from 'node:test'
import assert from 'node:assert/strict'
import { createEngineRegistry } from '../packages/simulator/src/initialize.ts'
import { cpuSmokeFixtures, runCpuSmoke } from '../packages/simulator/src/smoke.ts'

for (const fixture of cpuSmokeFixtures.filter(item => !item.browserOnly)) {
  test(`engine lab runs real ${fixture.engine} instructions`, async () => {
    const result = await runCpuSmoke(
      createEngineRegistry(),
      fixture.platform,
      fixture.engine,
      fixture.target
    )
    assert.equal(result.passed, true)
    assert.equal(result.actual, fixture.expected)
    assert.equal(result.snapshot.instructions, fixture.steps ?? 2)
  })
}

test('engine lab rejects unknown fixtures instead of simulating success', async () => {
  await assert.rejects(
    runCpuSmoke(createEngineRegistry(), 'stm32', 'renvo', 'stm32f103c8t6'),
    /No verified CPU smoke fixture/
  )
})

test('PICsim HEX instruction fixtures parse as real firmware', async () => {
  const { parseFirmware } = await import('../packages/simulator/src/firmware.ts')
  for (const fixture of cpuSmokeFixtures.filter(item => item.browserOnly)) {
    const image = parseFirmware(fixture.filename, Uint8Array.from(fixture.bytes))
    assert.equal(image.format, 'hex')
    assert.equal(image.segments.length, 1)
    assert.equal(image.segments[0].bytes.length, 2)
  }
})
