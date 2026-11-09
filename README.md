# OSEMPro

Open Source Embedded Project

A browser based platform for embedded firmware projects and virtual hardware.

## Development

```sh
git checkout dev
npm ci
npm run dev
npm run build
npm run lint
npm test
```

Changes belong on `dev`. The `main` branch is reserved for reviewed releases.

## Architecture

```text
src/
  App.tsx
  index.css
  projects/
    catalog.ts
  engine/
    catalog.ts
    firmware.ts
    registry.ts
    types.ts
    index.ts
tests/
  firmware.test.mjs
```

The UI is independent of the simulation API. The engine registry only reports installed adapters. No CPU engines are installed yet. The research catalog documents source candidates; it is not a claim that each architecture runs on OSEMPro.

A project will define its target, firmware format, and custom UI. Project listings stay empty until real projects are published. Popularity data must come from real usage, never generated examples.

## Engine candidates

| Platform | Candidate | Browser availability | License |
| --- | --- | --- | --- |
| AVR | [avr8js](https://github.com/wokwi/avr8js) | JavaScript CPU engine | MIT |
| PIC | [gpsim](https://gpsim.sourceforge.net/) | Native, WebAssembly port required | GPL-2.0-or-later |
| STM32 | [Renode](https://github.com/renode/renode) | Native, browser integration required | MIT |
| STM8 | [uCsim](https://github.com/danieldrotos/ucsim) | Native, WebAssembly port required | GPL |
| ESP32 | [ESP-Emulator](https://github.com/espressif/esp-emulator) | Browser WebAssembly available | Apache-2.0 |

WebAssembly alone does not guarantee that a specific MCU or peripheral is supported. Exact board support and licenses must be verified during adapter integration.

## Engine API

`SimulationAdapter` creates independent `SimulationSession` instances. A session loads firmware, starts, pauses, steps, resets, exposes snapshots, and disposes resources.

`parseFirmware` validates binary formats and Intel HEX checksums, maps HEX data into address segments, and rejects invalid or overlapping records. ELF parsing and raw BIN load addresses are delegated to target adapters. This parser does not execute firmware.

## Next milestone

Add a private development-only engine test route with real firmware smoke tests for each installed adapter. An obscure client URL is not authentication; use a server side access gate or trusted authenticated environment before exposing anything sensitive.
