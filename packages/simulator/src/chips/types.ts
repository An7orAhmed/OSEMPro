export type ChipPin = {
  number: number
  label: string
  port?: string
  bit?: number
}

export type ChipDefinition = {
  id: string
  label: string
  packageName: string | null
  pins: readonly ChipPin[]
  registerGroups: readonly string[]
  pinoutSource?: string
  registerMap?: Readonly<Record<string, Readonly<Record<string, number>>>>
}
