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
| PIC12F | 12F675, 12F683 | JavaScript 14-bit CPU core with HEX/BIN, basic GPIO; peripheral fidelity limited |
| PIC12F | 12F1840 | Enhanced core pending |
| PIC16F | Selected 16F models | PICsim WASM, built by run.sh; Renvo alternative for 16F15376 |
| PIC18F | Selected 18F models | PICsim WASM, built by run.sh |
| PIC24F | Selected 24FJ models | Port pending |
| dsPIC30F | Selected 30F models | Port pending |
| ESP8266 | ESP8266EX | Port pending |
| ESP32 | S3, C6, P4 | Renvo WASM, built by run.sh, ELF only at present |

Registered models are not automatically runnable. The Engine Lab checks each actual browser runtime and its supported targets. No unrelated MCU family is registered.

No separate npm build commands are needed. `./run.sh` installs the required tools and builds the PICsim and Renvo runtimes automatically. These are real browser runtimes; models without an emulator core remain unavailable.

A file picker accepts firmware locally. AVR8, STM32F4, PIC12F675/683 and PICsim support HEX/BIN; PICsim converts BIN to Intel HEX in the browser. Renvo wraps BIN/HEX into executable images for its supported STM32 flash layouts, and accepts Intel HEX on PIC16F15376. Current Renvo ESP32 targets require ELF. ESP8266, PIC12F1840, PIC24F and dsPIC30F remain unavailable until actual browser CPU cores exist. The PIC12F675/683 core runs the classic 14-bit instruction set and GPIO direction/latch basics; oscillator, ADC, EEPROM, timers, interrupts and analog pin behavior are not fully modelled. Firmware depending on them is not yet supported.

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

## Database

Keep a real `DATABASE_URL` in local `.env` when using database features, and never commit secrets. The launcher checks connectivity if a URL is configured when starting the server. Without a URL, it uses a local placeholder only for Prisma generation and validation. It does not create a database or modify its schema.

## Verification

```sh
./run.sh --check
```

This checks and builds everything without starting a server. `./run.sh --production` runs the built production server after passing the same checks; the development-only Engine Lab is unavailable in production. No npm scripts are defined. CI runs `./run.sh --check`.

The current Node test suite does not execute browser-only CPU smoke fixtures. Verify real firmware on the Engine Lab before promoting changes to `main`.
