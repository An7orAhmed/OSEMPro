import { AVR8jsAdapter } from './adapters/avr.ts'
import { RP2040jsAdapter } from './adapters/rp2040.ts'
import { RenvoAdapter } from './adapters/renvo.ts'
import { SimulationRegistry } from './registry.ts'

export function createEngineRegistry(): SimulationRegistry {
  const registry = new SimulationRegistry()
  registry.register(new AVR8jsAdapter())
  registry.register(new RP2040jsAdapter())
  registry.register(new RenvoAdapter('avr'))
  registry.register(new RenvoAdapter('pic'))
  registry.register(new RenvoAdapter('stm32'))
  registry.register(new RenvoAdapter('esp32'))
  return registry
}

export const simulationRegistry = createEngineRegistry()
