# OSEMPro

Open Source Embedded Project

Next.js application with browser-only embedded firmware simulation.

## Start

Use Node.js 24 LTS.

```sh
git switch dev
npm install
npm run dev
```

Visit `http://localhost:3000`. For local emulator testing, open `http://localhost:3000/internal/engine-lab`. The testing route is available only in development and returns 404 in production.

## Supported families

OSEMPro intentionally exposes only these MCU families and series.

| Family | Target series | Browser emulator |
| --- | --- | --- |
| STM32 | F103 | Renvo WASM, optional build |
| STM32 | F401 | STM32F4 WASM, auto prepared on install |
| STM32 | F407 | STM32F4 WASM, auto prepared on install |
| STM32 | F411 | STM32F4 WASM, auto prepared on install, Renvo alternative |
| AVR8 | ATmega328P | avr8js, JavaScript |
| PIC12F | 12F675, 12F683, 12F1840 | Port pending |
| PIC16F | Selected 16F models | PICsim WASM, optional build; Renvo alternative for 16F15376 |
| PIC18F | Selected 18F models | PICsim WASM, optional build |
| PIC24F | Selected 24FJ models | Port pending |
| dsPIC30F | Selected 30F models | Port pending |
| ESP8266 | ESP8266EX | Port pending |
| ESP32 | S3, C6, P4 | Renvo WASM, optional build, ELF only at present |

Registered models are not automatically runnable. The Engine Lab checks each actual browser runtime and its supported targets. No unrelated MCU family is registered.

For PICsim and Renvo:

```sh
npm run engines:build:picsim
npm run engines:build:renvo
```

PICsim requires Emscripten. Renvo requires Rust with the wasm32-wasip2 target. Only build runtimes you need. `npm run build:with-engines` builds both optional runtimes before Next.js.

A file picker accepts firmware locally. AVR8, STM32F4 and PICsim support HEX/BIN; PICsim converts BIN to Intel HEX in the browser. Renvo wraps BIN/HEX into executable images for its supported STM32 flash layouts, and accepts Intel HEX on PIC16F15376. Current Renvo ESP32 targets require ELF. ESP8266 and unimplemented PIC series must remain unavailable until actual browser CPU cores exist.

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

Keep `DATABASE_URL` in local `.env`, never commit secrets.

```sh
npm run db:check
npm run db:generate
npm run db:smoke
```

Review your development database before running `npm run db:push`; it modifies the schema. The demo model is not used to invent published projects.

## Verification

```sh
npm install
npm test
npm run typecheck
npm run lint
npm run build
```

Commit an updated `package-lock.json` after installation. No code should be promoted to `main` until local browser CPU smoke tests and the Next.js build pass.
