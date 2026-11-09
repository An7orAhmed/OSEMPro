import type { SimulatorSnapshot } from './types'

function objectValue(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : undefined
}

export function decodeRenvoResult(value: unknown): SimulatorSnapshot {
  const result = objectValue(value)
  const cpu = objectValue(result.cpu)
  const stats = objectValue(result.stats)
  const registers: Record<string, number> = {}

  const pc = numberValue(cpu.pc)
  if (pc !== undefined) registers.PC = pc

  if (Array.isArray(cpu.registers)) {
    for (const entry of cpu.registers) {
      const register = objectValue(entry)
      const name = register.name
      const rawValue = numberValue(register.value)
      if (typeof name === 'string' && name && rawValue !== undefined) {
        registers[name] = rawValue
      }
    }
  }

  const bytes = Array.isArray(result.uart)
    ? result.uart.filter(byte => Number.isInteger(byte) && byte >= 0 && byte <= 255) as number[]
    : []
  const serial = new TextDecoder().decode(Uint8Array.from(bytes.slice(-4096)))

  const reason = typeof result.reason === 'string' ? result.reason : null
  const error = reason === 'Fault'
    ? 'CPU execution fault'
    : typeof result.reason === 'object' && result.reason !== null && 'Fault' in result.reason
      ? String((result.reason as Record<string, unknown>).Fault)
      : undefined

  return {
    cycles: 0,
    ...(numberValue(stats.time) !== undefined ? { ticks: numberValue(stats.time) } : {}),
    running: false,
    registers,
    ...(numberValue(stats.instructions) !== undefined ? { instructions: numberValue(stats.instructions) } : {}),
    ...(serial ? { serial } : {}),
    ...(reason ? { stopReason: reason } : {}),
    ...(error ? { error } : {})
  }
}
