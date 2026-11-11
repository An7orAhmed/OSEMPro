# OSEMPro

Open Source Embedded Project

Next.js application with browser-only embedded firmware simulation.

## Start

On macOS or Linux, start everything with one command:

```sh
git switch dev
./run.sh
```

The launcher checks system tools, installs Node.js 24, npm packages, Rust and Emscripten when needed, downloads pinned STM32F4 emulator source assets, builds PICsim and Renvo WebAssembly, generates Prisma Client, runs tests, lint, type checking and the Next.js build. Only after every step passes does it start the development server and print the ready URL.

Default URLs are `http://localhost:3000` and `http://localhost:3000/internal/engine-lab`. Use `PORT=3001 ./run.sh` for another port. The Engine Lab is development-only and returns 404 in production.

Some system installations can require administrator permission. Apple Command Line Tools may need one-time approval in macOS.

## Supported families

OSEMPro intentionally exposes only these MCU families and series.

| Family | Target series | Browser emulator |
| --- | --- | --- |
| STM32 | F103 | Renvo WASM, built by run.sh |
| STM32 | F401 | STM32F4 WASM, fetched by run.sh |
| STM32 | F407 | STM32F4 WASM, fetched by run.sh |
| STM32 | F411 | STM32F4 WASM, fetched by run.sh, Renvo alternative |
| AVR8 | ATmega328P | avr8js, JavaScript |
| PIC12F | 12F675, 12F683, 12F1840 | Upstream gpsim browser port pending |
| PIC16F | Selected 16F models | PICsim WASM, built by run.sh; Renvo alternative for 16F15376 |
| PIC16F | PIC16F72, PIC16F73 | Verified PDIP-28 chip pinouts and SFR maps; browser CPU backend pending |
| PIC18F | Selected 18F models | PICsim WASM, built by run.sh |
| PIC24F | Selected 24FJ models | Port pending |
| dsPIC30F | 30F2010, 30F4011, 30F4013 | Existing emulator port pending |
| ESP8266 | ESP8266EX | Port pending |
| ESP32 | S3, C6, P4 | Renvo WASM, built by run.sh, ELF only at present |

Registered models are not automatically runnable. The Engine Lab checks each actual browser runtime and its supported targets. No unrelated MCU family is registered.

No separate npm build commands are needed. `./run.sh` installs the required tools and builds the PICsim and Renvo runtimes automatically. These are real browser runtimes; models without an emulator core remain unavailable.

A file picker accepts firmware locally. AVR8, STM32F4 and PICsim support HEX/BIN; PICsim converts BIN to Intel HEX in the browser. Renvo wraps BIN/HEX into executable images for its supported STM32 flash layouts, and accepts Intel HEX on PIC16F15376. Current Renvo ESP32 targets require ELF. PIC12F, PIC24F, dsPIC30F and ESP8266 remain unavailable until a verified existing browser emulator is integrated. OSEMPro does not implement replacement CPU instruction interpreters.

PIC16F72 and PIC16F73 are selectable in the PIC16F family and have separate chip folders containing manufacturer PDIP-28 pin diagrams and GPIO, ADC, timer, interrupt and peripheral register maps. PIC16F73 includes USART and CCP2 registers that are absent on PIC16F72. The current PICsim WASM source does not support either target; native gpsim lists PIC16F73, but no browser port is connected. Firmware execution remains disabled until an existing upstream engine supports the exact chip.

## Compact Engine Lab layout

Engine Lab uses a fixed viewport layout without horizontal or vertical scrollable panels. On desktop it shows device setup, execution and a selected monitor view. On smaller screens, Setup and Monitor are separate navigation views. The monitor offers Pins, Registers and UART tabs; register and serial pages adjust to the actual panel dimensions. The physical chip SVG scales to the available space and individual pins can be selected by touch, pointer or an accessible pin picker. Expand enlarges the chip monitor without moving the rest of the interface.

## Chip pinouts and live registers

Every selectable MCU has a dedicated metadata module under `packages/simulator/src/chips/<target>/index.ts`. Each module defines its target ID, register groups, and verified physical package pinout when one is available. Data is independent from CPU emulators and the Next.js server.

The Engine Lab renders a top-view IC with numbered pins for verified PDIP/LQFP packages. High and low colors appear only when an installed emulator returns a pin level. Power/reset pins are not assigned fabricated logic values. If a package pinout has not been verified, the UI shows the chip label and a clear "Package pinout not verified" message instead.

The register inspector shows CPU registers and the chip-specific GPIO, ADC, timer, interrupt and serial registers returned by its existing emulator. It never substitutes guessed values for missing registers. AVR8 reads actual avr8js memory-mapped GPIO, timer and interrupt bytes; its ADC is not currently modelled. STM32F4 reads selected supported memory-mapped peripheral registers from the existing WASM emulator, using register addresses in the chip folders. PICsim reads exposed SFR bytes for the verified PIC16F84A and PIC18F452 register maps; other PIC devices show only data available from their engine. The data represents emulator state, not direct measurements from physical hardware.

The same MCU series may ship in multiple physical packages. Metadata is for the named representative package, and should be extended with separately verified package variants rather than inventing pin numbers.

## Execution boundary

```text
Next.js server
  Pages, project metadata, Prisma

Browser client
  Engine Lab UI
    BrowserEngineLab
      Web Worker
        Firmware parser
        Emulator registry
        CPU execution
        Registers / GPIO / UART
        Optional WASM runtimes
```

- `packages/simulator` is an independent workspace without React, Next.js or Prisma.
- Client code uses `@osempro/simulator/browser`; emulation logic is loaded only inside browser workers.
- Firmware file bytes stay on the client. There are no firmware upload or CPU execution API routes.
- Prisma is used only from server-only modules, not from emulators.
- Published projects may store metadata in the database, but emulation is performed locally.
- Serving a WASM file as a static asset is not server-side execution.
- A development-only URL is not a substitute for authentication. Do not publicly expose the local test server with private firmware.
- PICsim is GPL-2.0-or-later. If distributing its compiled WASM, provide its license and corresponding source.
- CPU execution uses existing third party engines only. Existing source may be ported or transpiled for browser use.

## Database

Keep a real `DATABASE_URL` in local `.env` when using database features, and never commit secrets. The launcher checks connectivity if a URL is configured when starting the server. Without a URL, it uses a local placeholder only for Prisma generation and validation. It does not create a database or modify its schema.

## Verification

```sh
./run.sh --check
```

This checks and builds everything without starting a server. `./run.sh --production` runs the built production server after passing the same checks; the development-only Engine Lab is unavailable in production. No npm scripts are defined. CI runs `./run.sh --check`.

The current Node test suite does not execute browser-only CPU smoke fixtures. Verify real firmware on the Engine Lab before promoting changes to `main`.
