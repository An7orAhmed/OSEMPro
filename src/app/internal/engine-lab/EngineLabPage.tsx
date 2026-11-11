'use client'

import Link from 'next/link'
import ChipInspector from './ChipInspector'
import { useEffect, useMemo, useRef, useState } from 'react'
import { engineCandidates } from '@osempro/simulator/catalog'
import type { PlatformId, SimulatorSnapshot } from '@osempro/simulator/types'
import { acceptedRenvoFormats } from '@osempro/simulator/firmware-formats'
import { getPlannedTarget, plannedTargets } from '@osempro/simulator/planned-targets'
import { cpuSmokeFixtures } from '@osempro/simulator/smoke'
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
  const [platform, setPlatform] = useState<PlatformId>('stm32')
  const [engineId, setEngineId] = useState('stm32f4-emu')
  const [target, setTarget] = useState('stm32f401ce')
  const [file, setFile] = useState<File | null>(null)
  const [snapshot, setSnapshot] = useState<SimulatorSnapshot>(emptySnapshot)
  const [checking, setChecking] = useState(true)
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [stepCount, setStepCount] = useState(1)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [mobileView, setMobileView] = useState<'setup' | 'monitor'>('setup')
  const [focused, setFocused] = useState(false)

  const activePlatform = useMemo(() => engines.find(option => option.platform === platform), [engines, platform])
  const activeEngine = activePlatform?.engines.find(option => option.id === engineId)
  const selectedProfile = getPlannedTarget(platform, target)
  const targetOptions = Array.from(new Set([
    ...(activeEngine?.targets ?? []),
    ...(plannedTargets[platform]?.map(profile => profile.id) ?? [])
  ]))
  const installed = Boolean(activeEngine?.availableTargets?.includes(target))
  const firmwareTypes = engineId === 'renvo' && target && !selectedProfile
    ? acceptedRenvoFormats(target).map(format => '.' + format).join(',')
    : engineId === 'picsim' ? '.hex,.bin' : '.hex,.bin'
  const canSmoke = installed && cpuSmokeFixtures.some(fixture =>
    fixture.platform === platform && fixture.engine === engineId && fixture.target === target
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
          if (!disposed) {
            setSnapshot(state)
            if (state.error) setError(state.error)
          }
        }
        client.onFailure = detail => {
          if (!disposed) setError(detail)
        }

        const results = await client.inspect()
        if (disposed) return
        setEngines(results)
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
    const first = selected?.engines.find(engine => engine.available) ?? selected?.engines[0]
    setPlatform(value)
    setEngineId(first?.id ?? '')
    setTarget(first?.availableTargets[0] ?? first?.targets[0] ?? plannedTargets[value]?.[0]?.id ?? '')
    setFocused(false)
    clearFirmware()
  }

  function selectEngine(value: string) {
    const selected = activePlatform?.engines.find(option => option.id === value)
    setEngineId(value)
    setTarget(selected?.availableTargets[0] ?? selected?.targets[0] ?? plannedTargets[platform]?.[0]?.id ?? '')
    setFocused(false)
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
      setMobileView('monitor')
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
      setMobileView('monitor')
    })
  }


  return (
    <div className="lab-page">
      <header className="lab-header">
        <Link href="/" className="lab-home">
          <span aria-hidden="true">←</span>
          <span>OSEMPro</span>
        </Link>
        <div className="lab-title">ENGINE LAB <span>LOCAL DEVELOPMENT</span></div>
      </header>

      <nav className="lab-mobile-navigation" aria-label="Engine Lab panels">
        <button type="button" className={mobileView === 'setup' ? 'active' : ''} onClick={() => setMobileView('setup')}>Setup</button>
        <button type="button" className={mobileView === 'monitor' ? 'active' : ''} onClick={() => setMobileView('monitor')}>Monitor</button>
      </nav>

      <main className="lab-content">
        <div className={`lab-layout lab-view-${mobileView}`}>
          <div className="lab-left">
            <section className="lab-panel lab-setup-panel">
              <div className="lab-panel-heading">
                <h2>Device setup</h2>
                <span>{engineCandidates.length} platforms</span>
              </div>
              <div className="lab-fields">
                <label className="lab-field">
                  <span>Platform</span>
                  <select value={platform} disabled={busy || checking} onChange={event => selectPlatform(event.target.value as PlatformId)}>
                    {engineCandidates.map(candidate => {
                      const available = engines.find(item => item.platform === candidate.id)?.engines.some(engine => engine.available)
                      return <option key={candidate.id} value={candidate.id}>{candidate.name}{checking ? '' : available ? ' (ready)' : ' (unavailable)'}</option>
                    })}
                  </select>
                </label>
                <label className="lab-field">
                  <span>Engine</span>
                  <select value={engineId} disabled={busy || !activePlatform?.engines.length} onChange={event => selectEngine(event.target.value)}>
                    {(activePlatform?.engines ?? []).map(engine => (
                      <option value={engine.id} key={engine.id}>{engine.id}{engine.available ? '' : ' (not installed)'}</option>
                    ))}
                  </select>
                </label>
                <label className="lab-field">
                  <span>Target MCU</span>
                  <select value={target} disabled={busy || targetOptions.length === 0} onChange={event => { setTarget(event.target.value); clearFirmware() }}>
                    {targetOptions.map(value => (
                      <option key={value} value={value}>{value}{getPlannedTarget(platform, value) ? ' (pending)' : ''}</option>
                    ))}
                  </select>
                </label>
                <label className="lab-field lab-firmware-field">
                  <span>Firmware</span>
                  <span className={file ? 'lab-file-picker has-file' : 'lab-file-picker'}>
                    <span className="lab-file-symbol" aria-hidden="true">↑</span>
                    <span className="lab-file-name" title={file?.name ?? 'Choose a HEX or BIN file'}>{file?.name ?? 'Choose firmware'}</span>
                    <input key={`${platform}:${engineId}:${target}`} type="file" accept={firmwareTypes.replaceAll(' ', '')}
                      disabled={busy || !installed} onChange={event => {
                        const selected = event.target.files?.[0] ?? null
                        clearFirmware()
                        setFile(selected)
                      }} />
                  </span>
                </label>
              </div>
              <div className="lab-setup-actions">
                <button type="button" className="lab-primary" disabled={busy || !file || !installed} onClick={loadFirmware}>Load</button>
                <button type="button" disabled={busy || !canSmoke} onClick={runSmokeTest}>CPU test</button>
              </div>
              {!installed && !checking && (
                <p className="lab-note">
                  {selectedProfile
                    ? <>{selectedProfile.note} <a href={selectedProfile.source} target="_blank" rel="noopener noreferrer">Source</a></>
                    : activeEngine ? <>Runtime unavailable. Run <code>./run.sh</code>.</> : 'No browser emulator for this target.'}
                </p>
              )}
              {installed && <p className="lab-note">Firmware: {firmwareTypes}{engineId === 'renvo' ? ' · Renvo steps replay from reset' : ''}</p>}
            </section>
          </div>

          <div className={focused ? 'lab-right lab-focused' : 'lab-right'}>
            <section className="lab-panel lab-execution">
              <div className="lab-execution-bar">
                <div className="lab-panel-heading">
                  <h2>Execution</h2>
                  <span className={snapshot.running ? 'lab-pill ready' : 'lab-pill'}>
                    {snapshot.running ? 'Running' : loaded ? 'Stopped' : 'No firmware'}
                  </span>
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
              </div>
              <div className="lab-metrics">
                <div><span>{snapshot.ticks === undefined ? 'Cycles' : 'Abstract ticks'}</span><strong>{(snapshot.ticks ?? snapshot.cycles).toLocaleString()}</strong></div>
                <div><span>Instructions</span><strong>{snapshot.instructions?.toLocaleString() ?? 'N/A'}</strong></div>
                <div><span>PC</span><strong>{snapshot.registers.PC === undefined ? 'N/A' : numericValue(snapshot.registers.PC)}</strong></div>
                {snapshot.stopReason && <div title={snapshot.stopReason}><span>Stop</span><strong>{snapshot.stopReason}</strong></div>}
              </div>
              {(message || error) && (
                <p className={error ? 'lab-error' : 'lab-success'} role={error ? 'alert' : 'status'} title={error || message}>
                  {error || message}
                </p>
              )}
            </section>

            <ChipInspector key={target} target={target} snapshot={snapshot} focused={focused} onToggleFocus={() => setFocused(value => !value)} />
          </div>
        </div>
      </main>
    </div>
  )
}
