import { engineCandidates } from './catalog'
import { parseFirmware } from './firmware'
import { runCpuSmoke } from './smoke'
import { createEngineRegistry } from './initialize'
import type { LabEngineStatus, LabRequest, LabResponse } from './lab-protocol'
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
      return runCpuSmoke(registry, message.platform, message.engine, message.target)
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
  if (session && firmwareLoaded) post({ event: 'snapshot', snapshot: snapshot() })
}, 160)
