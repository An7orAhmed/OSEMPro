import type { PlatformId, SimulationAdapter, SimulationSession } from './types'

export interface EngineAvailability {
  id: string
  platform: PlatformId
  targets: readonly string[]
  available: boolean
}

export class SimulationRegistry {
  private readonly adapters = new Map<PlatformId, Map<string, SimulationAdapter>>()

  register(adapter: SimulationAdapter): void {
    const platformAdapters = this.adapters.get(adapter.platform) ?? new Map<string, SimulationAdapter>()
    if (platformAdapters.has(adapter.id)) {
      throw new Error(`Simulation adapter already registered: ${adapter.platform}/${adapter.id}`)
    }
    platformAdapters.set(adapter.id, adapter)
    this.adapters.set(adapter.platform, platformAdapters)
  }

  hasAdapter(platform: PlatformId, id?: string): boolean {
    const adapters = this.adapters.get(platform)
    return id ? Boolean(adapters?.has(id)) : Boolean(adapters?.size)
  }

  availablePlatforms(): PlatformId[] {
    return [...this.adapters.keys()]
  }

  listAdapters(platform: PlatformId): readonly SimulationAdapter[] {
    return [...(this.adapters.get(platform)?.values() ?? [])]
  }

  async inspect(platform: PlatformId): Promise<EngineAvailability[]> {
    return Promise.all(this.listAdapters(platform).map(async adapter => ({
      id: adapter.id,
      platform,
      targets: adapter.targets,
      available: await adapter.isAvailable().catch(() => false)
    })))
  }

  async createSession(platform: PlatformId, target: string, engineId?: string): Promise<SimulationSession> {
    const adapters = this.listAdapters(platform).filter(adapter =>
      (!engineId || adapter.id === engineId) &&
      adapter.targets.some(supported => supported.toLowerCase() === target.toLowerCase())
    )

    if (!adapters.length) {
      throw new Error(`No simulation adapter supports ${platform}/${target}`)
    }

    for (const adapter of adapters) {
      if (await adapter.isAvailable().catch(() => false)) {
        return adapter.createSession(target)
      }
    }

    throw new Error(`No installed simulation runtime is available for ${platform}/${target}`)
  }
}

export const simulationRegistry = new SimulationRegistry()
