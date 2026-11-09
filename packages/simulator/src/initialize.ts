import { AVR8jsAdapter } from './adapters/avr.ts'
import { RP2040jsAdapter } from './adapters/rp2040.ts'
import { RenvoAdapter } from './adapters/renvo.ts'
import { renvoTargets } from './renvo-targets.ts'
import { SimulationRegistry } from './registry.ts'

export function createEngineRegistry(): SimulationRegistry {
  const registry = new SimulationRegistry()
  registry.register(new AVR8jsAdapter())
  registry.register(new RP2040jsAdapter())
  for (const platform of Object.keys(renvoTargets) as Array<keyof typeof renvoTargets>) {
    registry.register(new RenvoAdapter(platform))
  }
  return registry
}

export const simulationRegistry = createEngineRegistry()
