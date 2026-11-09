type RenvoApi = {
  listTargets(): string
  runIntelHex(target: string, firmware: Uint8Array, options: RunOptions): string
  runElf(target: string, firmware: Uint8Array, options: RunOptions): string
}

type RunOptions = {
  maxInstructions: bigint
  deadlineTicks?: bigint
  stimuli: []
}

type WorkerRequest = {
  id: number
  operation: 'targets' | 'run'
  target?: string
  format?: string
  bytes?: ArrayBuffer
  instructions?: number
}

let runtimePromise: Promise<RenvoApi> | null = null

function getRuntime(): Promise<RenvoApi> {
  if (!runtimePromise) {
    const runtimeUrl = '/engines/renvo/renvo.js'
    runtimePromise = import(/* webpackIgnore: true */ runtimeUrl)
      .then((module: { api?: RenvoApi }) => {
        if (!module.api) throw new Error('Invalid Renvo browser module')
        return module.api
      })
  }
  return runtimePromise
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data
  try {
    const api = await getRuntime()
    if (request.operation === 'targets') {
      self.postMessage({ id: request.id, result: JSON.parse(api.listTargets()) })
      return
    }
    if (!request.bytes || !request.target || !request.instructions || !request.format) {
      throw new Error('Missing Renvo execution parameters')
    }
    const options: RunOptions = { maxInstructions: BigInt(request.instructions), stimuli: [] }
    const firmware = new Uint8Array(request.bytes)
    const value = request.format === 'hex'
      ? api.runIntelHex(request.target, firmware, options)
      : api.runElf(request.target, firmware, options)
    self.postMessage({ id: request.id, result: JSON.parse(value) })
  } catch (error) {
    self.postMessage({ id: request.id, error: error instanceof Error ? error.message : String(error) })
  }
}
