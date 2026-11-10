import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const root = new URL('../', import.meta.url)

async function source(path) {
  return readFile(new URL(path, root), 'utf8')
}

async function allServerFiles(path) {
  const directory = new URL(path, root)
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.map(async entry => {
    const current = join(path, entry.name)
    return entry.isDirectory() ? allServerFiles(current) : [current]
  }))
  return files.flat().filter(file => /\.(ts|tsx|js|mjs)$/.test(file))
}

test('Next.js server imports no emulator runtime or firmware execution entrypoint', async () => {
  for (const path of [
    ...(await allServerFiles('src/server')),
    'src/app/page.tsx',
    'src/app/layout.tsx',
    'src/app/internal/engine-lab/page.tsx'
  ]) {
    const text = await source(path)
    assert.doesNotMatch(text, /@osempro\/simulator\/(initialize|registry|lab|adapters|browser|firmware)/, path)
    assert.doesNotMatch(text, /(?:createEngineRegistry|parseFirmware|runCpuSmoke)\s*\(/, path)
  }
})

test('the emulator registry and firmware parser are loaded by a browser worker', async () => {
  const worker = await source('packages/simulator/src/lab.worker.ts')
  const bridge = await source('packages/simulator/src/lab.ts')
  const entry = await source('packages/simulator/src/browser.ts')
  const homepage = await source('src/App.tsx')

  assert.match(worker, /createEngineRegistry\(/)
  assert.match(worker, /parseFirmware\(/)
  assert.match(bridge, /new Worker\(/)
  assert.match(entry, /typeof window === 'undefined'/)
  assert.match(entry, /import\('\.\/lab\.ts'\)/)
  assert.doesNotMatch(homepage, /(?:createEngineRegistry|parseFirmware|new Worker)\s*\(/)
})

test('public simulator entry exports metadata and types, not CPU constructors', async () => {
  const entry = await source('packages/simulator/src/index.ts')
  assert.doesNotMatch(entry, /(?:initialize|adapters\/|simulationRegistry|createEngineRegistry)/)
  const pkg = JSON.parse(await source('packages/simulator/package.json'))
  for (const exported of Object.keys(pkg.exports)) {
    assert.ok(!exported.startsWith('./adapters/'))
    assert.notEqual(exported, './initialize')
  }
})
