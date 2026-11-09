'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { engineCandidates } from '@osempro/simulator/catalog'
import type { PlatformId, SimulatorSnapshot } from '@osempro/simulator/types'
import { renvoFirmwareFormat } from '@osempro/simulator/renvo-targets'
import type { BrowserEngineLab } from '@osempro/simulator/lab'

type EngineState = {
  platform: PlatformId
  label: string
  engines: Array<{ id: string, targets: readonly string[], available: boolean, availableTargets: readonly string[] }>
}

const emptySnapshot: SimulatorSnapshot = {
  cycles: 0,
  running: false,
  registers: {}
}

function numericValue(value: number): string {
  return Number.isInteger(value) ? `0x${(value >>> 0).toString(16).toUpperCase().padStart(2, '0')}` : String(value)
}

export default function EngineLabPage() {
  const labRef = useRef<BrowserEngineLab | null>(null)
  const [engines, setEngines] = useState<EngineState[]>([])
  const [platform, setPlatform] = useState<PlatformId>('avr')
  const [engineId, setEngineId] = useState('avr8js')
  const [target, setTarget] = useState('atmega328p')
  const [file, setFile] = useState<File | null>(null)
  const [snapshot, setSnapshot] = useState<SimulatorSnapshot>(emptySnapshot)
  const [connected, setConnected] = useState(false)
  const [checking, setChecking] = useState(true)
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [stepCount, setStepCount] = useState(1)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const activePlatform = useMemo(() => engines.find(option => option.platform === platform), [engines, platform])
  const activeEngine = activePlatform?.engines.find(option => option.id === engineId)
  const installed = Boolean(activeEngine?.availableTargets?.includes(target))
  const firmwareTypes = engineId === 'renvo' && target ? '.' + renvoFirmwareFormat(target) : '.hex, .bin'
  const canSmoke = installed && (
    (platform === 'avr' && engineId === 'avr8js' && target === 'atmega328p') ||
    (platform === 'rp2040' && engineId === 'rp2040js' && target === 'rp2040')
  )

  useEffect(() => {
    let disposed = false
    let client: BrowserEngineLab | null = null

    async function connect() {
      try {
        const { BrowserEngineLab } = await import('@osempro/simulator/lab')
        if (disposed) return
        client = new BrowserEngineLab()
        labRef.current = client
        client.onSnapshot = state => {
          if (!disposed) setSnapshot(state)
        }
        client.onFailure = detail => {
          if (!disposed) setError(detail)
        }

        const results = await client.inspect()
        if (disposed) return
        setEngines(results)
        setConnected(true)
      } catch (reason) {
        if (!disposed) setError(reason instanceof Error ? reason.message : String(reason))
      } finally {
        if (!disposed) setChecking(false)
      }
    }

    void connect()
    return () => {
      disposed = true
      client?.dispose()
      labRef.current = null
    }
  }, [])

  function selectPlatform(value: PlatformId) {
    const selected = engines.find(option => option.platform === value)
    const first = selected?.engines[0]
    setPlatform(value)
    setEngineId(first?.id ?? '')
    setTarget(first?.availableTargets[0] ?? first?.targets[0] ?? '')
    clearFirmware()
  }

  function selectEngine(value: string) {
    const selected = activePlatform?.engines.find(option => option.id === value)
    setEngineId(value)
    setTarget(selected?.availableTargets[0] ?? selected?.targets[0] ?? '')
    clearFirmware()
  }

  function clearFirmware() {
    labRef.current?.closeSession().catch(() => {})
    setFile(null)
    setLoaded(false)
    setSnapshot(emptySnapshot)
    setMessage('')
    setError('')
  }

  async function runAction(action: (client: BrowserEngineLab) => Promise<void>) {
    const client = labRef.current
    if (!client || busy) return
    setBusy(true)
    setError('')
    try {
      await action(client)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setBusy(false)
    }
  }

  function loadFirmware() {
    if (!file || !installed) return
    void runAction(async client => {
      if (file.size === 0 || file.size > 64 * 1024 * 1024) {
        throw new Error('Firmware must be between 1 byte and 64 MB')
      }
      const contents = new Uint8Array(await file.arrayBuffer())
      await client.open(platform, engineId, target)
      const state = await client.load(file.name, contents)
      setSnapshot(state)
      setLoaded(true)
      setMessage(`Loaded ${file.name}`)
    })
  }

  function control(action: 'start' | 'pause' | 'reset' | 'step') {
    if (!loaded) return
    void runAction(async client => {
      const result = action === 'step'
        ? await client.step(stepCount)
        : await client[action]()
      setSnapshot(result)
      setMessage(action === 'start' ? 'Execution started' : action === 'pause' ? 'Paused' : action === 'reset' ? 'Reset' : `Executed ${stepCount} instruction(s)`)
    })
  }

  function runSmokeTest() {
    if (!canSmoke) return
    void runAction(async client => {
      const result = await client.smoke(platform, engineId, target)
      if (!result.passed) throw new Error(`CPU test failed: ${result.register} was ${String(result.actual)}, expected ${result.expected}`)
      if (!loaded) setSnapshot(result.snapshot)
      setMessage(`CPU test passed: ${result.register} = ${result.expected}`)
    })
  }

  const registers = Object.entries(snapshot.registers)
  const gpio = Object.entries(snapshot.gpio ?? {})
  const status = checking ? 'Checking runtimes' : !connected ? 'Worker unavailable' : 'Browser worker ready'

  return (
    <div className="lab-page">
      <header className="lab-header">
        <Link href="/" className="lab-home">
          <span aria-hidden="true">←</span>
          <span>OSEMPro</span>
        </Link>
        <div className="lab-title">ENGINE LAB <span>LOCAL DEVELOPMENT</span></div>
        <div className={connected ? 'lab-worker-status online' : 'lab-worker-status'}>
          <span className="lab-status-dot" />
          {status}
        </div>
      </header>

      <main className="lab-content">
        <div className="lab-intro">
          <div>
            <div className="lab-eyebrow">BROWSER SIMULATION</div>
            <h1>Engine Lab</h1>
            <p>Inspect installed emulators and run firmware locally.</p>
          </div>
          <span className="lab-privacy">Firmware stays in your browser</span>
        </div>

        <div className="lab-layout">
          <div className="lab-left">
            <section className="lab-panel">
              <div className="lab-panel-heading"><h2>Platforms</h2><span>{engineCandidates.length} families</span></div>
              <div className="lab-platforms">
                {engineCandidates.map(candidate => {
                  const entries = engines.find(item => item.platform === candidate.id)?.engines ?? []
                  const ready = entries.some(item => item.available)
                  return (
                    <button type="button" key={candidate.id} onClick={() => selectPlatform(candidate.id)} disabled={busy || checking} className={platform === candidate.id ? 'lab-platform active' : 'lab-platform'}>
                      <span>{candidate.name}</span>
                      <span className={ready ? 'lab-pill ready' : 'lab-pill'}>{checking ? 'Checking' : ready ? 'Installed' : 'Unavailable'}</span>
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="lab-panel">
              <div className="lab-panel-heading"><h2>Configuration</h2></div>
              <label className="lab-field">
                <span>Engine</span>
                <select value={engineId} disabled={busy || !activePlatform?.engines.length} onChange={event => selectEngine(event.target.value)}>
                  {(activePlatform?.engines ?? []).map(engine => <option value={engine.id} key={engine.id}>{engine.id}{engine.available ? '' : ' (not installed)'}</option>)}
                </select>
              </label>
              <label className="lab-field">
                <span>Target MCU</span>
                <select value={target} disabled={busy || !activeEngine} onChange={event => { setTarget(event.target.value); clearFirmware() }}>
                  {(activeEngine?.targets ?? []).map(value => <option key={value} value={value} disabled={Boolean(activeEngine?.available && !activeEngine.availableTargets.includes(value))}>{value}</option>)}
                </select>
              </label>
              <label className="lab-field">
                <span>Firmware</span>
                <input type="file" accept={firmwareTypes.replaceAll(" ", "")} disabled={busy || !installed} onChange={event => { clearFirmware(); setFile(event.target.files?.[0] ?? null) }} />
              </label>
              <div className="lab-setup-actions">
                <button type="button" className="lab-primary" disabled={busy || !file || !installed} onClick={loadFirmware}>Load firmware</button>
                <button type="button" className="lab-secondary" disabled={busy || !canSmoke} onClick={runSmokeTest}>CPU test</button>
              </div>
              {!installed && !checking && <p className="lab-note">{activeEngine?.id === 'renvo' ? <>Build the Renvo WASM runtime locally with <code>npm run engines:build:renvo</code>, then reload this page.</> : 'No browser runtime is registered for this platform.'}</p>}
              {installed && <p className="lab-note">Firmware format: {firmwareTypes}{engineId === 'renvo' ? '. Each step replays from reset.' : ''}</p>}
            </section>
          </div>

          <div className="lab-right">
            <section className="lab-panel">
              <div className="lab-panel-heading">
                <h2>Execution</h2>
                <span className={snapshot.running ? 'lab-pill ready' : 'lab-pill'}>{snapshot.running ? 'Running' : loaded ? 'Stopped' : 'No firmware'}</span>
              </div>
              <div className="lab-controls">
                <button type="button" onClick={() => control('start')} disabled={busy || !loaded || snapshot.running} className="lab-primary">Run</button>
                <button type="button" onClick={() => control('pause')} disabled={busy || !loaded || !snapshot.running}>Pause</button>
                <button type="button" onClick={() => control('step')} disabled={busy || !loaded || snapshot.running}>Step</button>
                <select value={stepCount} disabled={busy || !loaded || snapshot.running} onChange={event => setStepCount(Number(event.target.value))} aria-label="Instructions per step">
                  {[1, 10, 100, 1000].map(count => <option key={count} value={count}>{count} insn</option>)}
                </select>
                <button type="button" onClick={() => control('reset')} disabled={busy || !loaded}>Reset</button>
              </div>
              {message && <p className="lab-success" role="status">{message}</p>}
              {error && <p className="lab-error" role="alert">{error}</p>}
              <div className="lab-metrics">
                <div><span>{snapshot.ticks === undefined ? 'Cycles' : 'Abstract ticks'}</span><strong>{(snapshot.ticks ?? snapshot.cycles).toLocaleString()}</strong></div>
                <div><span>Instructions</span><strong>{snapshot.instructions?.toLocaleString() ?? 'N/A'}</strong></div>
                <div><span>Program counter</span><strong>{snapshot.registers.PC === undefined ? 'N/A' : numericValue(snapshot.registers.PC)}</strong></div>
                {snapshot.stopReason && <div><span>Stop reason</span><strong>{snapshot.stopReason}</strong></div>}
              </div>
            </section>

            <div className="lab-data-grid">
              <section className="lab-panel">
                <div className="lab-panel-heading"><h2>Registers</h2><span>{registers.length}</span></div>
                <div className="lab-data-scroll">
                  {registers.length ? <div className="lab-register-grid">
                    {registers.map(([name, value]) => <div key={name}><span>{name}</span><code>{numericValue(value)}</code></div>)}
                  </div> : <p className="lab-empty">No register data</p>}
                </div>
              </section>
              <section className="lab-panel">
                <div className="lab-panel-heading"><h2>GPIO</h2><span>{gpio.length}</span></div>
                <div className="lab-data-scroll">
                  {gpio.length ? <div className="lab-register-grid">
                    {gpio.map(([name, value]) => <div key={name}><span>{name}</span><code>{numericValue(value)}</code></div>)}
                  </div> : <p className="lab-empty">No GPIO data</p>}
                </div>
              </section>
            </div>

            <section className="lab-panel">
              <div className="lab-panel-heading"><h2>UART output</h2><span>Read only</span></div>
              <pre className="lab-terminal">{snapshot.serial || 'No UART data'}</pre>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
