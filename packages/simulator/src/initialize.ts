import { AVR8jsAdapter } from './adapters/avr.ts'
import { STM32F4Adapter } from './adapters/stm32f4.ts'
import { RenvoAdapter } from './adapters/renvo.ts'
import { PicSimAdapter } from './adapters/picsim.ts'
import { renvoTargets } from './renvo-targets.ts'
import { SimulationRegistry } from './registry.ts'

export function createEngineRegistry(): SimulationRegistry {
  const registry = new SimulationRegistry()
  registry.register(new STM32F4Adapter())
  registry.register(new AVR8jsAdapter())
  registry.register(new PicSimAdapter('pic16f'))
  registry.register(new PicSimAdapter('pic18f'))
  for (const platform of Object.keys(renvoTargets) as Array<keyof typeof renvoTargets>) {
    registry.register(new RenvoAdapter(platform))
  }
  return registry
}

export const simulationRegistry = createEngineRegistry()
