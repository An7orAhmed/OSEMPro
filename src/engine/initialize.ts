import { AVR8jsAdapter } from './adapters/avr'
import { RP2040jsAdapter } from './adapters/rp2040'
import { RenvoAdapter } from './adapters/renvo'
import { SimulationRegistry } from './registry'

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
