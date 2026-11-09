type RenvoApi = {
  listTargets(): string
  runIntelHex(target: string, firmware: Uint8Array, options: { maxInstructions: bigint, stimuli: [] }): string
  runElf(target: string, firmware: Uint8Array, options: { maxInstructions: bigint, stimuli: [] }): string
}

type WorkerRequest = {
  id: number
  operation: 'targets' | 'run'
  target?: string
  format?: string
  bytes?: ArrayBuffer
  instructions?: number
}

async function getRuntime(): Promise<RenvoApi> {
  const module = await import(/* @vite-ignore */ '/engines/renvo/renvo.js') as { api: RenvoApi }
  return module.api
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
    const options = { maxInstructions: BigInt(request.instructions), stimuli: [] as [] }
    const bytes = new Uint8Array(request.bytes)
    const value = request.format === 'hex'
      ? api.runIntelHex(request.target, bytes, options)
      : api.runElf(request.target, bytes, options)
    self.postMessage({ id: request.id, result: JSON.parse(value) })
  } catch (error) {
    self.postMessage({ id: request.id, error: error instanceof Error ? error.message : String(error) })
  }
}
