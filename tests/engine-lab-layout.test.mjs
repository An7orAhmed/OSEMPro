import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = new URL('../src/app/internal/engine-lab/', import.meta.url)
const stylesheet = readFileSync(new URL('engine-lab.css', source), 'utf8')
const page = readFileSync(new URL('EngineLabPage.tsx', source), 'utf8')
const inspector = readFileSync(new URL('ChipInspector.tsx', source), 'utf8')

test('Engine Lab keeps the page and chip diagram inside the viewport', () => {
  assert.match(stylesheet, /height: 100dvh/)
  assert.match(stylesheet, /html:has\(\.lab-page\)/)
  assert.match(stylesheet, /\.chip-diagram \{[\s\S]*?min-width: 0/)
  assert.doesNotMatch(stylesheet, /overflow(?:-x|-y)?:\s*(auto|scroll)/)
  assert.doesNotMatch(stylesheet, /min-width:\s*460px/)
})

test('mobile view changes between setup and monitor instead of stacking them', () => {
  assert.match(page, /lab-mobile-navigation/)
  assert.match(page, /lab-view-\$\{mobileView\}/)
  assert.match(stylesheet, /\.lab-view-setup \.lab-right/)
  assert.match(stylesheet, /\.lab-view-monitor \.lab-left/)
  assert.match(page, /setMobileView\('monitor'\)/)
})

test('chip, registers and UART use compact tabs and pagination', () => {
  assert.match(inspector, /type InspectorView = 'pins' \| 'registers' \| 'uart'/)
  assert.match(inspector, /role="tablist"/)
  assert.match(inspector, /registerPages/)
  assert.match(inspector, /uartPages/)
  assert.match(inspector, /currentUartPage/)
  assert.match(inspector, /window\.innerHeight < 580/)
  assert.doesNotMatch(page, /lab-data-scroll/)
})
