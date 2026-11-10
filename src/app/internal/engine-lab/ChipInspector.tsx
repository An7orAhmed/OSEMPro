'use client'

import { getChipDefinition } from '@osempro/simulator/chips'
import type { ChipPin } from '@osempro/simulator/chips'
import type { SimulatorSnapshot } from '@osempro/simulator/types'

type PinLevel = 0 | 1 | null

function pinLevel(pin: ChipPin, snapshot: SimulatorSnapshot): PinLevel {
  if (!pin.port) return null
  const value = snapshot.gpio?.[pin.port]
  if (value === undefined || !Number.isInteger(value) || value < 0) return null
  if (pin.bit !== undefined) return (value >>> pin.bit & 1) as 0 | 1
  return value === 0 || value === 1 ? value : null
}

function pinRole(pin: ChipPin): string {
  if (/^(VDD|VCC|AVCC|VDDA|VBAT)/.test(pin.label)) return 'supply'
  if (/^(VSS|GND)/.test(pin.label)) return 'ground'
  return 'signal'
}

function pinStyle(pin: ChipPin, snapshot: SimulatorSnapshot): string {
  const level = pinLevel(pin, snapshot)
  return level === 1 ? 'chip-high' : level === 0 ? 'chip-low' : pinRole(pin) === 'signal' ? 'chip-unknown' : 'chip-power'
}

function PinDiagram({ pins, packageName, label, snapshot }: {
  pins: readonly ChipPin[]
  packageName: string
  label: string
  snapshot: SimulatorSnapshot
}) {
  const isQuad = packageName.startsWith('LQFP')
  const edgeCount = pins.length / (isQuad ? 4 : 2)
  const width = 1000
  const height = isQuad ? 900 : Math.max(670, edgeCount * 32 + 140)
  const body = isQuad
    ? { x: 270, y: 225, w: 460, h: 460 }
    : { x: 330, y: 88, w: 340, h: height - 176 }

  return (
    <svg className="chip-diagram" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label} ${packageName} top view physical pinout`}>
      <rect x={body.x} y={body.y} width={body.w} height={body.h} rx={isQuad ? 21 : 28} fill="#131a2c" stroke="#7484ab" strokeWidth="3" />
      {isQuad ? <circle cx={body.x + 25} cy={body.y + 25} r="8" fill="#8996b8" /> : <path d={`M ${body.x + body.w / 2 - 35} ${body.y} a 35 35 0 0 0 70 0`} stroke="#8996b8" fill="none" strokeWidth="3" />}
      <text x={body.x + body.w / 2} y={body.y + body.h / 2 - 8} fill="#edf0ff" fontSize="29" fontWeight="700" textAnchor="middle">{label}</text>
      <text x={body.x + body.w / 2} y={body.y + body.h / 2 + 24} fill="#9da9c7" fontSize="17" textAnchor="middle">{packageName}</text>
      {pins.map((pin, index) => {
        const group = Math.floor(index / edgeCount)
        const within = index % edgeCount
        const level = pinLevel(pin, snapshot)
        const state = level === null ? 'not available' : level === 1 ? 'high' : 'low'
        const style = pinStyle(pin, snapshot)
        let x1 = 0
        let y1 = 0
        let x2 = 0
        let y2 = 0
        let textX = 0
        let textY = 0
        let transform: string | undefined
        let anchor: 'start' | 'end' = 'start'

        if (!isQuad) {
          const side = group === 0 ? 'left' : 'right'
          const row = side === 'left' ? within : edgeCount - 1 - within
          const y = body.y + (row + 0.5) * body.h / edgeCount
          x1 = side === 'left' ? body.x : body.x + body.w
          x2 = x1 + (side === 'left' ? -52 : 52)
          y1 = y2 = y
          textX = x2 + (side === 'left' ? -12 : 12)
          textY = y + 5
          anchor = side === 'left' ? 'end' : 'start'
        } else if (group === 0 || group === 2) {
          const row = group === 0 ? within : edgeCount - 1 - within
          const y = body.y + (row + 0.5) * body.h / edgeCount
          x1 = group === 0 ? body.x : body.x + body.w
          x2 = x1 + (group === 0 ? -46 : 46)
          y1 = y2 = y
          textX = x2 + (group === 0 ? -9 : 9)
          textY = y + 4
          anchor = group === 0 ? 'end' : 'start'
        } else {
          const column = group === 1 ? within : edgeCount - 1 - within
          const x = body.x + (column + 0.5) * body.w / edgeCount
          x1 = x2 = x
          y1 = group === 1 ? body.y + body.h : body.y
          y2 = y1 + (group === 1 ? 46 : -46)
          textX = x
          textY = y2 + (group === 1 ? 13 : -13)
          transform = `rotate(-55 ${textX} ${textY})`
          anchor = group === 1 ? 'start' : 'end'
        }

        return (
          <g key={pin.number} className={style}>
            <title>{`Pin ${pin.number}: ${pin.label}, ${state}`}</title>
            <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="9" strokeLinecap="round" />
            <circle cx={x2} cy={y2} r="6" />
            <text className="chip-pin-number" x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 7} fontSize="11" textAnchor="middle">{pin.number}</text>
            <text className="chip-pin-label" x={textX} y={textY} fontSize={isQuad ? 12 : 16} textAnchor={anchor} transform={transform}>{pin.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

function registerText(value: number): string {
  return `0x${(value >>> 0).toString(16).toUpperCase().padStart(2, '0')}`
}

function RegisterValues({ entries }: { entries: Readonly<Record<string, number>> | undefined }) {
  if (!entries || !Object.keys(entries).length) {
    return <p className="lab-empty">Not exposed by selected emulator</p>
  }
  return (
    <div className="lab-register-grid">
      {Object.entries(entries).map(([name, value]) => (
        <div key={name}><span>{name}</span><code>{registerText(value)}</code></div>
      ))}
    </div>
  )
}

export default function ChipInspector({ target, snapshot }: { target: string, snapshot: SimulatorSnapshot }) {
  const chip = getChipDefinition(target)
  if (!chip) return <section className="lab-panel"><p className="lab-empty">No chip definition for this target</p></section>

  return (
    <>
      <section className="lab-panel lab-chip-panel">
        <div className="lab-panel-heading">
          <h2>Physical chip</h2>
          <span>{chip.packageName ?? 'Package unverified'}</span>
        </div>
        {chip.pins.length && chip.packageName ? (
          <div className="chip-visual">
            <PinDiagram pins={chip.pins} packageName={chip.packageName} label={chip.label} snapshot={snapshot} />
          </div>
        ) : (
          <div className="chip-placeholder">
            <div className="chip-placeholder-body"><span>{chip.label}</span><small>Package pinout not verified</small></div>
          </div>
        )}
        <div className="chip-legend">
          <span><i className="chip-legend-high" />High</span>
          <span><i className="chip-legend-low" />Low</span>
          <span><i className="chip-legend-unknown" />No live state</span>
        </div>
        {chip.pinoutSource && <a className="chip-datasheet" href={chip.pinoutSource} target="_blank" rel="noopener noreferrer">Manufacturer pinout</a>}
      </section>

      <section className="lab-panel lab-inspector-panel">
        <div className="lab-panel-heading"><h2>Live registers</h2><span>Selected emulator</span></div>
        <div className="chip-register-groups">
          <div className="chip-register-group">
            <h3>CPU</h3>
            <RegisterValues entries={snapshot.registers} />
          </div>
          {chip.registerGroups.map(name => (
            <div className="chip-register-group" key={name}>
              <h3>{name}</h3>
              <RegisterValues entries={name === 'GPIO' ? snapshot.peripherals?.GPIO ?? snapshot.gpio : snapshot.peripherals?.[name]} />
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
