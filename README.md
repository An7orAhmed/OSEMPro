# OSEMPro

Open Source Embedded Project

An open source browser platform for embedded firmware projects and virtual hardware.

## Development

```sh
git checkout dev
npm ci
npm run dev
npm test
npm run lint
npm run build
```

All development takes place on `dev`. `main` is reserved for approved releases.

## Architecture

```text
src/
  App.tsx
  projects/
    catalog.ts
  engine/
    adapters/
      avr.ts
      rp2040.ts
      renvo.ts
      renvo.worker.ts
    catalog.ts
    firmware.ts
    initialize.ts
    registry.ts
    types.ts
tests/
  firmware.test.mjs
  cpu-smoke.test.mjs
  engine-registry.test.mjs
```

The UI has no emulator dependencies. Each CPU engine implements `SimulationAdapter` and creates independent sessions implementing `SimulationSession`. One platform can register more than one engine with explicit engine selection and runtime checks. Unavailable engines are not treated as running.

## Integrated engines

| Platform | Engine | Status | Target |
| --- | --- | --- | --- |
| AVR | [avr8js](https://github.com/wokwi/avr8js) | JavaScript adapter, CPU smoke test | ATmega328P |
| RP2040 | [rp2040js](https://github.com/wokwi/rp2040js) | JavaScript adapter, CPU smoke test | RP2040 |
| AVR | [Renvo](https://github.com/tinyrange/renvo_emu) | WASM bridge, build required | ATmega328PB |
| PIC | Renvo | WASM bridge, build required | PIC16F15376 |
| STM32 | Renvo | WASM bridge, build required | F103C8T6, F411RE, L432KC, H743ZI |
| ESP32 | Renvo | WASM bridge, build required | S3, C6, P4 |
| STM8 | [uCsim](https://github.com/danieldrotos/ucsim) | Research only; no browser adapter | STM8 |

[esp32sim](https://github.com/mikroverk/esp32sim) is an alternative fully open source, Rust based ESP32 emulator with its own WASM build. It is not bundled or registered yet. [gpsim](https://gpsim.sourceforge.net/) is an alternative native PIC emulator which would require a web port. [Renode](https://github.com/renode/renode) remains an alternative for deeper native STM32 peripherals.

CPU execution support is distinct from full board and peripheral compatibility. AVR8js includes ATmega328P GPIO, timers and USART glue; RP2040js models a set of RP2040 peripherals, but the adapter currently executes from XIP flash without a Pico boot ROM. ELF loading is not yet implemented in those two JavaScript adapters. Neither adapter should be used as a hardware fidelity oracle.

## Renvo WASM installation

The Renvo integration uses the upstream versioned WIT API through a Web Worker. The source must be built with Rust's `wasm32-wasip2` target and transpiled with `jco`.

```sh
bash scripts/build-renvo.sh
npm run dev
```

The installer fetches the open source Renvo source, builds the WASI component, transpiles its JavaScript API, then bundles the runtime into `public/engines/renvo/`. Rust, rustup, Git and npm are required.

To build a particular upstream revision, specify `RENVO_REF` before invoking the script. The runtime checks its target manifest on startup. Without installed files or if its target is absent, the Renvo adapter reports unavailable rather than returning simulated results.

Renvo is a deterministic bounded runner. `step(n)` replays the firmware from reset with a cumulative instruction budget, instead of modifying persistent hardware state one instruction at a time. `start()` runs a bounded batch, not an unending execution clock. Do not use this interface for accurate electrical timing. Unsupported flash boot chains and radio peripherals remain unsupported.

## Tests

```sh
npm test
npm run lint
npm run build
```

The CPU smoke tests execute real AVR and ARM Thumb instructions. Registry tests ensure availability and explicit backend selection. The Renvo integration requires an additional browser integration test after compiling the WASM artifacts.

## Next milestone

Expose the selected engines behind a restricted development testing route. Include actual firmware uploads, controls, registers, UART, and GPIO only where an installed engine supplies them. An obscure URL is not authentication.
