'use client'

import { useEffect, useRef, useState } from 'react'
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

function PinDiagram({ pins, packageName, label, snapshot, selectedPin, onSelectPin }: {
  pins: readonly ChipPin[]
  packageName: string
  label: string
  snapshot: SimulatorSnapshot
  selectedPin: number
  onSelectPin: (pin: number) => void
}) {
  const isQuad = packageName.startsWith('LQFP')
  const edgeCount = pins.length / (isQuad ? 4 : 2)
  const width = 760
  const height = isQuad ? 760 : Math.max(450, edgeCount * 26 + 112)
  const body = isQuad
    ? { x: 189, y: 189, w: 382, h: 382 }
    : { x: 238, y: 56, w: 284, h: height - 112 }
  const showLabels = pins.length <= 64

  return (
    <svg className="chip-diagram" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${label} ${packageName} top view physical pinout`}>
      <rect x={body.x} y={body.y} width={body.w} height={body.h} rx={isQuad ? 21 : 28} fill="#131a2c" stroke="#7484ab" strokeWidth="3" />
      {isQuad ? <circle cx={body.x + 25} cy={body.y + 25} r="8" fill="#8996b8" /> : <path d={`M ${body.x + body.w / 2 - 35} ${body.y} a 35 35 0 0 0 70 0`} stroke="#8996b8" fill="none" strokeWidth="3" />}
      <text x={body.x + body.w / 2} y={body.y + body.h / 2 - 8} fill="#edf0ff" fontSize="29" fontWeight="700" textAnchor="middle">{label}</text>
      <text x={body.x + body.w / 2} y={body.y + body.h / 2 + 24} fill="#9da9c7" fontSize="17" textAnchor="middle">{packageName}</text>
      {pins.map((pin, index) => {
        const group = Math.floor(index / edgeCount)
        const within = index % edgeCount
        const level = pinLevel(pin, snapshot)
        const state = level === null ? 'not available' : level === 1 ? 'high' : 'low'
        const directions = pin.port ? snapshot.gpioDirections?.[pin.port] : undefined
        const direction = directions !== undefined && pin.bit !== undefined
          ? (directions >>> pin.bit & 1) ? 'output' : 'input'
          : 'direction unavailable'
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
          x2 = x1 + (side === 'left' ? -44 : 44)
          y1 = y2 = y
          textX = x2 + (side === 'left' ? -10 : 10)
          textY = y + 5
          anchor = side === 'left' ? 'end' : 'start'
        } else if (group === 0 || group === 2) {
          const row = group === 0 ? within : edgeCount - 1 - within
          const y = body.y + (row + 0.5) * body.h / edgeCount
          x1 = group === 0 ? body.x : body.x + body.w
          x2 = x1 + (group === 0 ? -34 : 34)
          y1 = y2 = y
          textX = x2 + (group === 0 ? -7 : 7)
          textY = y + 4
          anchor = group === 0 ? 'end' : 'start'
        } else {
          const column = group === 1 ? within : edgeCount - 1 - within
          const x = body.x + (column + 0.5) * body.w / edgeCount
          x1 = x2 = x
          y1 = group === 1 ? body.y + body.h : body.y
          y2 = y1 + (group === 1 ? 34 : -34)
          textX = x
          textY = y2 + (group === 1 ? 9 : -9)
          transform = `rotate(-55 ${textX} ${textY})`
          anchor = group === 1 ? 'start' : 'end'
        }

        return (
          <g key={pin.number} className={`${style}${pin.number === selectedPin ? ' chip-selected' : ''}`}
            role="button" tabIndex={0} aria-label={`Pin ${pin.number}, ${pin.label}, ${state}`}
            onClick={() => onSelectPin(pin.number)}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelectPin(pin.number)
              }
            }}>
            <title>{`Pin ${pin.number}: ${pin.label}, ${state}, ${direction}`}</title>
            <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={isQuad ? 7 : 9} strokeLinecap="round" />
            <circle cx={x2} cy={y2} r={pin.number === selectedPin ? 8 : 5} />
            {pins.length <= 64 && <text className="chip-pin-number" x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 7} fontSize="11" textAnchor="middle">{pin.number}</text>}
            {showLabels && <text className="chip-pin-label" x={textX} y={textY} fontSize={isQuad ? 13 : 17} textAnchor={anchor} transform={transform}>{pin.label}</text>}
          </g>
        )
      })}
    </svg>
  )
}

function registerText(value: number): string {
  return `0x${(value >>> 0).toString(16).toUpperCase().padStart(2, '0')}`
}

type InspectorView = 'pins' | 'registers' | 'uart'

function RegisterValues({ entries }: { entries: readonly [string, number][] }) {
  if (!entries.length) return <p className="lab-empty">Not exposed by selected emulator</p>
  return (
    <div className="lab-register-grid">
      {entries.map(([name, value]) => (
        <div key={name} title={`${name}: ${registerText(value)}`}>
          <span>{name}</span>
          <code>{registerText(value)}</code>
        </div>
      ))}
    </div>
  )
}

export default function ChipInspector({ target, snapshot, focused, onToggleFocus }: {
  target: string
  snapshot: SimulatorSnapshot
  focused: boolean
  onToggleFocus: () => void
}) {
  const [view, setView] = useState<InspectorView>('pins')
  const [group, setGroup] = useState('CPU')
  const [registerPage, setRegisterPage] = useState(0)
  const [uartPage, setUartPage] = useState(0)
  const [pageSize, setPageSize] = useState(12)
  const [uartRows, setUartRows] = useState(8)
  const [uartWidth, setUartWidth] = useState(55)
  const [selectedPinNumber, setSelectedPinNumber] = useState(0)
  const panelRef = useRef<HTMLElement | null>(null)
  const chip = getChipDefinition(target)

  useEffect(() => {
    const element = panelRef.current
    if (!element) return
    const resize = () => {
      const width = element.clientWidth
      const height = element.clientHeight
      const columns = width >= 1000 ? 4 : width >= 630 ? 3 : 2
      const rows = Math.max(2, Math.floor((height - 150) / 37))
      setPageSize(Math.max(4, Math.min(48, columns * rows)))
      setUartRows(Math.max(3, Math.floor((height - 140) / 17)))
      setUartWidth(Math.max(24, Math.floor((width - 55) / 7)))
    }
    const observer = new ResizeObserver(resize)
    observer.observe(element)
    resize()
    return () => observer.disconnect()
  }, [])

  if (!chip) return <section className="lab-panel lab-inspector"><p className="lab-empty">Chip definition unavailable</p></section>

  const groups = ['CPU', ...chip.registerGroups]
  const entries = Object.entries(group === 'CPU'
    ? snapshot.registers
    : group === 'GPIO' ? snapshot.peripherals?.GPIO ?? snapshot.gpio ?? {} : snapshot.peripherals?.[group] ?? {})
  const registerPages = Math.max(1, Math.ceil(entries.length / pageSize))
  const currentPage = Math.min(registerPage, registerPages - 1)
  const visibleEntries = entries.slice(currentPage * pageSize, (currentPage + 1) * pageSize)
  const serial = snapshot.serial ?? ''
  const serialLines = serial.replace(/\r/g, '').split('\n').flatMap(line => {
    if (!line.length) return ['']
    const chunks: string[] = []
    for (let index = 0; index < line.length; index += uartWidth) {
      chunks.push(line.slice(index, index + uartWidth))
    }
    return chunks
  })
  const uartPages = Math.max(1, Math.ceil(serialLines.length / uartRows))
  const currentUartPage = Math.min(uartPage, uartPages - 1)
  const uartStart = Math.max(0, serialLines.length - (currentUartPage + 1) * uartRows)
  const uartEnd = serialLines.length - currentUartPage * uartRows
  const selectedPin = chip.pins.find(pin => pin.number === selectedPinNumber)
    ?? chip.pins.find(pin => pin.port)
    ?? chip.pins[0]
  const level = selectedPin ? pinLevel(selectedPin, snapshot) : null
  const directionValue = selectedPin?.port ? snapshot.gpioDirections?.[selectedPin.port] : undefined
  const direction = directionValue === undefined || selectedPin?.bit === undefined
    ? 'Unknown direction'
    : (directionValue >>> selectedPin.bit & 1) ? 'Output' : 'Input'

  return (
    <section ref={panelRef} className="lab-panel lab-inspector">
      <div className="lab-inspector-heading">
        <div className="lab-panel-heading">
          <h2>{chip.label}</h2>
          <span>{chip.packageName ?? 'Package unverified'}</span>
        </div>
        <div className="lab-inspector-actions">
          <div className="lab-view-tabs" role="tablist" aria-label="Chip details">
          {([
            ['pins', 'Pins'],
            ['registers', 'Registers'],
            ['uart', 'UART']
          ] as const).map(([value, label]) => (
            <button key={value} type="button" role="tab" aria-selected={view === value}
              className={view === value ? 'active' : ''} onClick={() => setView(value)}>
              {label}
            </button>
          ))}
          </div>
          <button type="button" className="lab-expand-control" aria-pressed={focused}
            onClick={onToggleFocus} title={focused ? 'Show execution controls' : 'Expand chip inspector'}>
            {focused ? 'Restore' : 'Expand'}
          </button>
        </div>
      </div>

      {view === 'pins' && (
        <div className="lab-inspector-body lab-pin-view" role="tabpanel">
          {chip.pins.length && chip.packageName ? (
            <div className="chip-visual">
              <PinDiagram pins={chip.pins} packageName={chip.packageName} label={chip.label} snapshot={snapshot}
                selectedPin={selectedPin?.number ?? 0} onSelectPin={setSelectedPinNumber} />
            </div>
          ) : (
            <div className="chip-placeholder">
              <div className="chip-placeholder-body">
                <span>{chip.label}</span>
                <small>Package pinout not verified</small>
              </div>
            </div>
          )}
          <div className="lab-chip-footer">
            {selectedPin && (
              <label className="lab-pin-details">
                <span className="sr-only">Inspect physical pin</span>
                <select value={selectedPin.number} onChange={event => setSelectedPinNumber(Number(event.target.value))}>
                  {chip.pins.map(pin => <option key={pin.number} value={pin.number}>{pin.number} · {pin.label}</option>)}
                </select>
                <strong>{level === null ? 'No live level' : level ? 'HIGH' : 'LOW'}</strong>
                <span title={direction}>{direction}</span>
              </label>
            )}
            <div className="chip-legend">
              <span><i className="chip-legend-high" />High</span>
              <span><i className="chip-legend-low" />Low</span>
              <span><i className="chip-legend-unknown" />Unknown</span>
              <span><i className="chip-legend-power" />Power</span>
            </div>
            {chip.pinoutSource && <a className="chip-datasheet" href={chip.pinoutSource} target="_blank" rel="noopener noreferrer">Datasheet ↗</a>}
          </div>
        </div>
      )}

      {view === 'registers' && (
        <div className="lab-inspector-body lab-register-view" role="tabpanel">
          <div className="lab-inspector-toolbar">
            <label className="lab-group-selector">
              <span>Group</span>
              <select value={group} onChange={event => { setGroup(event.target.value); setRegisterPage(0) }}>
                {groups.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </label>
            <div className="lab-pager" aria-label="Register pages">
              <button type="button" onClick={() => setRegisterPage(page => Math.max(0, page - 1))} disabled={currentPage === 0} aria-label="Previous registers">‹</button>
              <span>{currentPage + 1} / {registerPages}</span>
              <button type="button" onClick={() => setRegisterPage(page => Math.min(registerPages - 1, page + 1))} disabled={currentPage >= registerPages - 1} aria-label="Next registers">›</button>
            </div>
          </div>
          <RegisterValues entries={visibleEntries} />
          <span className="lab-data-summary">{entries.length} registers · Live emulator values</span>
        </div>
      )}

      {view === 'uart' && (
        <div className="lab-inspector-body lab-uart-view" role="tabpanel">
          <div className="lab-inspector-toolbar">
            <span className="lab-data-summary">UART output · {serial.length} characters</span>
            <div className="lab-pager" aria-label="UART output pages">
              <button type="button" onClick={() => setUartPage(page => Math.min(uartPages - 1, page + 1))} disabled={currentUartPage >= uartPages - 1} aria-label="Older UART output">‹</button>
              <span>{uartPages - currentUartPage} / {uartPages}</span>
              <button type="button" onClick={() => setUartPage(page => Math.max(0, page - 1))} disabled={currentUartPage === 0} aria-label="Newer UART output">›</button>
            </div>
          </div>
          <pre className="lab-terminal">{serial ? serialLines.slice(uartStart, uartEnd).join('\n') : 'No UART data'}</pre>
        </div>
      )}
    </section>
  )
}
