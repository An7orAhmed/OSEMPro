import { engineCandidates } from './catalog'
import { parseFirmware } from './firmware'
import { createEngineRegistry } from './initialize'
import type { LabEngineStatus, LabRequest, LabResponse, LabSmokeResult } from './lab-protocol'
import type { SimulationSession, SimulatorSnapshot } from './types'

const registry = createEngineRegistry()
const worker = self as DedicatedWorkerGlobalScope
let session: SimulationSession | null = null
let firmwareLoaded = false
let queue = Promise.resolve()

const emptySnapshot = (): SimulatorSnapshot => ({ cycles: 0, running: false, registers: {} })
const snapshot = () => session?.snapshot() ?? emptySnapshot()
const post = (message: LabResponse) => worker.postMessage(message)

function endSession(): void {
  session?.dispose()
  session = null
  firmwareLoaded = false
}

async function smoke(request: Extract<LabRequest, { action: 'smoke' }>): Promise<LabSmokeResult> {
  const fixture = request.engine === 'avr8js' && request.platform === 'avr' && request.target === 'atmega328p'
    ? { bytes: [0x01, 0xe0, 0x03, 0x95], register: 'R16', expected: 2 }
    : request.engine === 'rp2040js' && request.platform === 'rp2040' && request.target === 'rp2040'
      ? { bytes: [0x03, 0x20, 0x04, 0x30], register: 'R0', expected: 7 }
      : null

  if (!fixture) throw new Error('No verified CPU smoke fixture for this target')

  const testSession = await registry.createSession(request.platform, request.target, request.engine)
  try {
    await testSession.loadFirmware(parseFirmware('instruction-test.bin', Uint8Array.from(fixture.bytes)))
    await testSession.step(2)
    const state = testSession.snapshot()
    return {
      passed: state.registers[fixture.register] === fixture.expected,
      register: fixture.register,
      expected: fixture.expected,
      actual: state.registers[fixture.register],
      snapshot: state
    }
  } finally {
    testSession.dispose()
  }
}

async function dispatch(message: LabRequest): Promise<unknown> {
  switch (message.action) {
    case 'inspect': {
      return Promise.all(engineCandidates.map(async candidate => ({
        platform: candidate.id,
        label: candidate.name,
        engines: await registry.inspect(candidate.id)
      } satisfies LabEngineStatus)))
    }
    case 'open': {
      endSession()
      session = await registry.createSession(message.platform, message.target, message.engine)
      return snapshot()
    }
    case 'close': {
      endSession()
      return snapshot()
    }
    case 'load': {
      if (!session) throw new Error('Select an engine before loading firmware')
      firmwareLoaded = false
      const image = parseFirmware(message.name, message.bytes)
      await session.loadFirmware(image)
      firmwareLoaded = true
      return snapshot()
    }
    case 'start': {
      if (!session || !firmwareLoaded) throw new Error('Load firmware before starting')
      const active = session
      void active.start().then(() => {
        if (session === active) post({ event: 'snapshot', snapshot: snapshot() })
      }).catch(error => {
        if (session === active) {
          post({ event: 'failure', message: error instanceof Error ? error.message : String(error) })
          post({ event: 'snapshot', snapshot: snapshot() })
        }
      })
      return snapshot()
    }
    case 'pause':
      if (!session || !firmwareLoaded) throw new Error('Load firmware before pausing')
      await session.pause()
      return snapshot()
    case 'step':
      if (!session || !firmwareLoaded) throw new Error('Load firmware before stepping')
      await session.step(message.count)
      return snapshot()
    case 'reset':
      if (!session || !firmwareLoaded) throw new Error('Load firmware before resetting')
      await session.reset()
      return snapshot()
    case 'snapshot':
      return snapshot()
    case 'smoke':
      return smoke(message)
  }
}

worker.addEventListener('message', event => {
  const request = event.data as LabRequest
  queue = queue.then(async () => {
    try {
      const result = await dispatch(request)
      post({ id: request.id, result })
    } catch (error) {
      post({ id: request.id, error: error instanceof Error ? error.message : String(error) })
    }
  })
})

setInterval(() => {
  if (session?.snapshot().running) post({ event: 'snapshot', snapshot: snapshot() })
}, 160)
