import type { PlatformId, SimulationAdapter, SimulationSession } from './types'

export class SimulationRegistry {
  private readonly adapters = new Map<PlatformId, SimulationAdapter>()

  register(adapter: SimulationAdapter): void {
    if (this.adapters.has(adapter.platform)) {
      throw new Error(`Simulation adapter already registered for ${adapter.platform}`)
    }
    this.adapters.set(adapter.platform, adapter)
  }

  hasAdapter(platform: PlatformId): boolean {
    return this.adapters.has(platform)
  }

  availablePlatforms(): PlatformId[] {
    return [...this.adapters.keys()]
  }

  async createSession(platform: PlatformId, target: string): Promise<SimulationSession> {
    const adapter = this.adapters.get(platform)
    if (!adapter) {
      throw new Error(`No simulation engine is installed for ${platform}`)
    }
    return adapter.createSession(target)
  }
}

export const simulationRegistry = new SimulationRegistry()
