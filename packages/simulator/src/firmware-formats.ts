import { parseFirmware } from './firmware.ts'
import type { FirmwareImage, FirmwareSegment } from './types.ts'

const armFlashBase: Readonly<Record<string, number>> = {
  stm32f103c8: 0x08000000,
  stm32f411re: 0x08000000,
}

const hexOnlyTargets = new Set(['pic16f15376'])

export function acceptedRenvoFormats(target: string): readonly string[] {
  const selected = target.toLowerCase()
  if (hexOnlyTargets.has(selected)) return ['hex', 'bin']
  if (Object.hasOwn(armFlashBase, selected)) return ['elf', 'hex', 'bin']
  return ['elf']
}

export function toIntelHex(image: FirmwareImage): FirmwareImage {
  if (image.format === 'hex') return image
  if (image.format !== 'bin') throw new Error('Only raw BIN or Intel HEX can be loaded into this PIC core')
  if (image.bytes.length % 2 !== 0) {
    throw new Error('PIC raw BIN must contain complete 16-bit instruction words')
  }

  const lines: string[] = []
  let upperAddress = -1

  function record(address: number, kind: number, bytes: Uint8Array): string {
    const fields = [bytes.length, address >> 8 & 255, address & 255, kind, ...bytes]
    const checksum = (-fields.reduce((sum, byte) => sum + byte, 0)) & 255
    return ':' + [...fields, checksum].map(byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase()
  }

  for (let address = 0; address < image.bytes.length; address += 16) {
    const upper = address >>> 16
    if (upper !== upperAddress) {
      lines.push(record(0, 4, Uint8Array.of(upper >> 8, upper & 255)))
      upperAddress = upper
    }
    lines.push(record(address & 0xffff, 0, image.bytes.subarray(address, address + 16)))
  }

  lines.push(':00000001FF')
  return parseFirmware(image.name.replace(/\.[^.]+$/, '') + '.hex', new TextEncoder().encode(lines.join('\n') + '\n'))
}

function armSegments(image: FirmwareImage, flashBase: number): FirmwareSegment[] {
  if (image.format === 'bin') return [{ address: flashBase, bytes: image.bytes }]
  if (image.format === 'hex') return image.segments
  throw new Error('Expected raw BIN or Intel HEX')
}

function read32(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0
}

export function toArmElf(image: FirmwareImage, target: string): FirmwareImage {
  if (image.format === 'elf') return image
  const flashBase = armFlashBase[target.toLowerCase()]
  if (flashBase === undefined) throw new Error(`No verified raw flash mapping for ${target}`)

  const segments = armSegments(image, flashBase)
  const vectorSegment = segments.find(segment => segment.address <= flashBase &&
    segment.address + segment.bytes.length >= flashBase + 8)
  if (!vectorSegment) throw new Error('Firmware does not contain the MCU flash vector table')

  const vectorOffset = flashBase - vectorSegment.address
  const stack = read32(vectorSegment.bytes, vectorOffset)
  const reset = read32(vectorSegment.bytes, vectorOffset + 4)
  const resetAddress = reset & ~1
  if (stack === 0 || stack === 0xffffffff || (stack & 3) !== 0) {
    throw new Error('Invalid Cortex-M stack pointer in firmware vector table')
  }
  if ((reset & 1) === 0 || !segments.some(segment =>
    resetAddress >= segment.address && resetAddress < segment.address + segment.bytes.length)) {
    throw new Error('Reset handler does not point to an executable Thumb address in firmware')
  }

  const headerSize = 52
  const programHeaderSize = 32
  const alignedHeaderSize = (headerSize + segments.length * programHeaderSize + 15) & ~15
  const length = alignedHeaderSize + segments.reduce((sum, segment) =>
    sum + ((segment.bytes.length + 3) & ~3), 0)
  const elf = new Uint8Array(length)
  const view = new DataView(elf.buffer)
  elf.set([0x7f, 0x45, 0x4c, 0x46, 1, 1, 1], 0)
  view.setUint16(16, 2, true)
  view.setUint16(18, 40, true)
  view.setUint32(20, 1, true)
  view.setUint32(24, resetAddress, true)
  view.setUint32(28, headerSize, true)
  view.setUint32(36, 0x05000000, true)
  view.setUint16(40, headerSize, true)
  view.setUint16(42, programHeaderSize, true)
  view.setUint16(44, segments.length, true)

  let offset = alignedHeaderSize
  for (const [index, segment] of segments.entries()) {
    const header = headerSize + index * programHeaderSize
    view.setUint32(header, 1, true)
    view.setUint32(header + 4, offset, true)
    view.setUint32(header + 8, segment.address, true)
    view.setUint32(header + 12, segment.address, true)
    view.setUint32(header + 16, segment.bytes.length, true)
    view.setUint32(header + 20, segment.bytes.length, true)
    view.setUint32(header + 24, segment.address >= 0x20000000 && segment.address < 0x40000000 ? 6 : 5, true)
    view.setUint32(header + 28, 4, true)
    elf.set(segment.bytes, offset)
    offset += (segment.bytes.length + 3) & ~3
  }

  return { name: image.name, format: 'elf', bytes: elf, segments, entryPoint: resetAddress }
}

export function prepareRenvoFirmware(image: FirmwareImage, target: string): FirmwareImage {
  const selected = target.toLowerCase()
  if (hexOnlyTargets.has(selected)) return toIntelHex(image)
  if (Object.hasOwn(armFlashBase, selected)) return toArmElf(image, selected)
  if (image.format === 'elf') return image
  throw new Error(`Raw HEX/BIN execution is not supported for ${target}. A real flash-image loader is required.`)
}
