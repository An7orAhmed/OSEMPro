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
  assert.match(inspector, /new ResizeObserver\(resize\)/)
  assert.match(inspector, /setPageSize\(/)
  assert.match(inspector, /setUartRows\(/)
  assert.doesNotMatch(page, /lab-data-scroll/)
})

test('chip pins are selectable without a scrollable diagram', () => {
  assert.match(inspector, /onSelectPin\(pin.number\)/)
  assert.match(inspector, /aria-label=\{`Pin/)
  assert.match(inspector, /selectedPinNumber/)
  assert.match(inspector, /lab-pin-details/)
  assert.match(stylesheet, /\.chip-selected circle/)
})

test('focus mode expands the chip and retains a way to restore execution controls', () => {
  assert.match(page, /lab-focused/)
  assert.match(page, /onToggleFocus=\{\(\) => setFocused/)
  assert.match(inspector, /onToggleFocus/)
  assert.match(inspector, /focused \? 'Restore' : 'Expand'/)
  assert.match(stylesheet, /\.lab-focused \.lab-execution \{\s*display: none/)
})

test('firmware picker displays a selected filename without overflowing the layout', () => {
  assert.match(page, /lab-file-picker/)
  assert.match(page, /lab-file-name/)
  assert.match(page, /file\?\.name \?\? 'Choose firmware'/)
  assert.match(stylesheet, /\.lab-file-name \{[\s\S]*?text-overflow: ellipsis/)
  assert.match(stylesheet, /\.lab-file-picker input\[type="file"\]/)
})

test('no unbounded UART stream is placed into a hidden overflowing panel', () => {
  assert.match(inspector, /serialLines/)
  assert.match(inspector, /\.slice\(uartStart, uartEnd\)/)
  assert.match(inspector, /setUartWidth\(/)
})
