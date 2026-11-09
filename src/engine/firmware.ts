import type { FirmwareFormat, FirmwareImage, FirmwareSegment } from './types'

const maximumImageSize = 64 * 1024 * 1024

function decodeRecord(record: string, lineNumber: number): Uint8Array {
  if (!/^:[0-9a-fA-F]+$/.test(record) || record.length % 2 !== 1) {
    throw new Error(`Invalid Intel HEX record at line ${lineNumber}`)
  }

  const bytes = new Uint8Array((record.length - 1) / 2)
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(record.slice(index * 2 + 1, index * 2 + 3), 16)
  }

  if (bytes.length < 5 || bytes.length !== bytes[0] + 5) {
    throw new Error(`Invalid Intel HEX length at line ${lineNumber}`)
  }

  const checksum = bytes.reduce((sum, value) => sum + value, 0)
  if ((checksum & 0xff) !== 0) {
    throw new Error(`Intel HEX checksum mismatch at line ${lineNumber}`)
  }

  return bytes
}

export function parseIntelHex(contents: string): { segments: FirmwareSegment[], entryPoint: number | null } {
  const lines = contents.replace(/^\uFEFF/, '').split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  const memory = new Map<number, number>()
  let baseAddress = 0
  let entryPoint: number | null = null
  let finished = false

  for (const [index, line] of lines.entries()) {
    if (finished) {
      throw new Error('Intel HEX contains records after EOF')
    }

    const record = decodeRecord(line, index + 1)
    const length = record[0]
    const offset = (record[1] << 8) | record[2]
    const kind = record[3]
    const data = record.subarray(4, 4 + length)

    if (kind === 0x00) {
      const address = baseAddress + offset
      if (address + data.length > 0x100000000) {
        throw new Error('Intel HEX address exceeds 32-bit address space')
      }
      for (const [byteIndex, value] of data.entries()) {
        const location = address + byteIndex
        if (memory.has(location)) {
          throw new Error(`Intel HEX contains overlapping data at 0x${location.toString(16)}`)
        }
        memory.set(location, value)
        if (memory.size > maximumImageSize) {
          throw new Error('Firmware exceeds the 64 MB limit')
        }
      }
    } else if (kind === 0x01 && length === 0 && offset === 0) {
      finished = true
    } else if (kind === 0x02 && length === 2 && offset === 0) {
      baseAddress = (((data[0] << 8) | data[1]) * 16)
    } else if (kind === 0x04 && length === 2 && offset === 0) {
      baseAddress = (((data[0] << 8) | data[1]) * 65536)
    } else if (kind === 0x05 && length === 4 && offset === 0) {
      entryPoint = (((data[0] * 0x1000000) + (data[1] << 16) + (data[2] << 8) + data[3]) >>> 0)
    } else {
      throw new Error(`Unsupported Intel HEX record type ${kind} at line ${index + 1}`)
    }
  }

  if (!finished || memory.size === 0) {
    throw new Error('Intel HEX must contain data and a valid EOF record')
  }

  const addresses = [...memory.keys()].sort((first, second) => first - second)
  const segments: FirmwareSegment[] = []
  let startAddress = addresses[0]
  let values: number[] = []
  let previousAddress = startAddress - 1

  for (const address of addresses) {
    if (address !== previousAddress + 1 && values.length > 0) {
      segments.push({ address: startAddress, bytes: Uint8Array.from(values) })
      startAddress = address
      values = []
    }
    values.push(memory.get(address)!)
    previousAddress = address
  }

  segments.push({ address: startAddress, bytes: Uint8Array.from(values) })
  return { segments, entryPoint }
}

export function detectFirmwareFormat(name: string): FirmwareFormat {
  const extension = name.split('.').at(-1)?.toLowerCase()
  if (extension !== 'hex' && extension !== 'bin' && extension !== 'elf') {
    throw new Error('Firmware must be a .hex, .bin, or .elf file')
  }
  return extension
}

export function parseFirmware(name: string, bytes: Uint8Array): FirmwareImage {
  const format = detectFirmwareFormat(name)
  if (bytes.length === 0 || bytes.length > maximumImageSize) {
    throw new Error('Firmware must be between 1 byte and 64 MB')
  }

  if (format === 'hex') {
    const parsed = parseIntelHex(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
    return { name, format, bytes, ...parsed }
  }

  if (format === 'elf') {
    if (bytes.length < 16 || bytes[0] !== 0x7f || bytes[1] !== 0x45 || bytes[2] !== 0x4c || bytes[3] !== 0x46) {
      throw new Error('Invalid ELF header')
    }
    return { name, format, bytes, segments: [], entryPoint: null }
  }

  return { name, format, bytes, segments: [], entryPoint: null }
}
