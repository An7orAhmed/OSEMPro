# OSEMPro

Open Source Embedded Project

A Next.js platform for publishing embedded projects and simulating real firmware locally in the user's browser.

## Development

Node.js 22 or later is recommended.

```sh
git switch dev
npm install
npm run dev
```

Visit http://localhost:3000.

The previous Vite lockfile was removed because it was not compatible with the Next.js workspace dependency graph. Run `npm install` to generate a new `package-lock.json` and commit that file on `dev`. Until then, CI uses `npm install` rather than `npm ci`.

## Structure

```text
src/
  app/
    layout.tsx
    page.tsx
    globals.css
  App.tsx
  projects/
    catalog.ts
  server/
    projects.ts
packages/
  simulator/
    package.json
    src/
      browser.ts
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
scripts/
  build-renvo.sh
```

## Runtime boundaries

- Next.js App Router renders the website and hosts future project APIs.
- `src/server/projects.ts` is the server-only entrypoint for future Prisma queries. No schema or database connection exists yet. It returns no projects until the database is configured.
- `src/App.tsx` is the interactive client page. It receives serializable project records and handles search and filtering.
- `packages/simulator` is an isolated npm workspace. It has no React, Next.js, or Prisma dependency and contains all CPU execution and firmware parsing code.
- Browser features that need emulation should dynamically load `@osempro/simulator/browser` and call `loadBrowserSimulator()`. This prevents browser only runtime code from executing on Next.js servers.
- Static WASM assets built from open source emulator code are served from `public/engines/renvo/`. The browser downloads and executes them inside Web Workers.

### Existing emulator integrations

| Platform | Backend | State |
| --- | --- | --- |
| AVR | [avr8js](https://github.com/wokwi/avr8js) | Browser JavaScript CPU adapter |
| RP2040 | [rp2040js](https://github.com/wokwi/rp2040js) | Browser JavaScript CPU adapter |
| PIC16 | [Renvo](https://github.com/tinyrange/renvo_emu) | WASM bridge, runtime build required |
| STM32 | Renvo | WASM bridge, runtime build required |
| ESP32 | Renvo | WASM bridge, runtime build required |
| STM8 | [uCsim](https://github.com/danieldrotos/ucsim) | Research only |

To build the optional Renvo runtime:

```sh
bash scripts/build-renvo.sh
```

Emulator backends do not guarantee cycle accurate timing or support for all MCU peripherals.

## Verification

```sh
npm run lint
npm test
npm run typecheck
npm run build
```

## Prisma PostgreSQL verification

The project currently uses Prisma ORM 7.10.1. Its initial schema is `prisma/schema.prisma` with one isolated `DemoProject` model. The CLI reads `DATABASE_URL` from the local `.env` file through the existing `prisma.config.ts`. Never commit database credentials.

```sh
npm install
npm run db:check
npm run db:generate
npm run db:push
npm run db:smoke
```

`db:check` runs a read-only SQL query and verifies the PostgreSQL connection. `db:generate` generates the Prisma Client into `src/generated/prisma`. `db:push` applies the demo table to the configured database and can modify its schema; review the target before running it. `db:smoke` writes, reads, and deletes one uniquely named temporary demo record. The script deletes only the row it creates.

The demo model does not feed the public homepage. `src/server/projects.ts` still returns no published projects until real models and application queries are implemented. No user firmware is sent to PostgreSQL; the simulator remains browser-only.

## Next step

Build a restricted engine testing route under the Next.js App Router. Firmware input, register inspection, GPIO, and UART execution should remain in browser components. A hidden path does not provide access control.

## Prisma CLI dependency repair

The application uses Prisma ORM 7.10.1 and Prisma Composer 0.38.0. Prisma 7 requires Effect 3.20.0 inside `@prisma/config`, while Composer requires Effect 4.0.5. Do not globally override `effect` to version 4, as that breaks Prisma CLI configuration loading.

Use Node.js 24 LTS (the `.nvmrc` selects it):

```sh
nvm install
nvm use
npm install
npm run db:validate
npm run db:generate
npm run db:check
```

Regenerate `package-lock.json` after `npm install` and commit it on `dev`. The old lockfile may still have the incorrectly flattened Effect dependency tree until it is regenerated. To inspect installed versions, run `npm ls effect @prisma/config`. Prisma CLI should resolve Effect 3.20.0 from `@prisma/config`, while Composer should resolve Effect 4.0.5.

After confirming the configured database is your development database:

```sh
npm run db:push
npm run db:smoke
```

`db:smoke` generates the client, creates one temporary `DemoProject`, reads it back, then deletes it. A successful `db:check` is a connection test, not proof that Prisma Client generation or tables are correct.

If the old dependencies remain cached after `npm install`, remove `node_modules` and reinstall without deleting `package-lock.json` first. Keep `.env` local and do not commit credentials.

## Local Engine Lab

The development-only browser emulator workbench is available at:

```text
http://localhost:3000/internal/engine-lab
```

Start Next.js with `npm run dev`. This route is not linked from the homepage and returns HTTP 404 when `NODE_ENV` is not `development`. It is not an authentication system. Do not run a public development server with sensitive firmware.

The lab starts its own Web Worker and loads the independent `@osempro/simulator` package inside that worker. It checks installed engines, selects targets, parses user-selected HEX/BIN/ELF files locally, and provides execution controls, registers, GPIO state, and available UART output. Neither file contents nor CPU snapshots are posted to the application server or stored in Prisma.

Use **CPU test** for AVR8js ATmega328P or RP2040js RP2040. These tests execute actual instruction bytes and check CPU registers; they do not represent full firmware or peripheral qualification. Other platforms need their emulator WASM runtime and a user-supplied firmware image. STM8 remains unavailable until a browser adapter is implemented.

Run the smoke tests locally with `npm test`. CPU integration and Next.js production build verification must pass before promotion from `dev`.

## Install more browser emulator platforms

Renvo supplies optional WebAssembly CPU models for PIC16, STM32, ESP32, WCH CH32, SAMD, nRF52, Renesas RA, MSP430, EFM8/8051, RP2350 and AVR. RP2040 can use Renvo as an alternative to rp2040js.

It is not included in `npm install`: compiling the open source Rust engine requires Rust, `rustup`, Git, and the Node 24 selected by `.nvmrc`.

```sh
nvm use
rustup update stable
npm run engines:build:renvo
npm run dev
```

Refresh `http://localhost:3000/internal/engine-lab` after building. The runtime is built locally into `public/engines/renvo/`; all emulator execution stays in browser Web Workers. An unbuilt or failed runtime is correctly shown as unavailable.

`npm run build:with-engines` builds Renvo before producing a Next.js release build. Deploy the generated static assets together with that build. The WASM output is ignored by Git intentionally; do not assume it is included merely because Next.js builds successfully.

The installer pins Renvo to a verified upstream commit for reproducibility. Set `RENVO_REF` to update deliberately. It bundles the WASI Preview 2 JavaScript shim using Renvo's Vite dependency, rather than relying on an uninstalled esbuild executable.

The current Renvo WASM API accepts **ELF** for ARM, RISC-V, Xtensa, AVR, and MSP430 targets and **Intel HEX** for PIC16F15376 and EFM8BB52F32G. It does not accept a standalone BIN file for those targets. Bounded execution is not a replacement for a complete vendor boot ROM, cycle accurate timing, or every peripheral.

The runtime's list of installed target IDs determines availability; registering a target is not proof that the browser emulator runs it.

## STM32F401 and Microchip PIC family expansion

OSEMPro lists the exact chips requested without treating an approximate MCU or a catalog entry as a working emulator.

| MCU family | Target examples | Browser backend |
| --- | --- | --- |
| STM32F401 | F401CC, F401CE, F401RC, F401RE | [stm32f4-emu](https://github.com/danish9661/STM32F4-emulator), true browser Cortex-M4 interpreter, automatic assets |
| PIC12F | 12F675, 12F683, 12F1840 | [gpsim](https://gpsim.sourceforge.net/) native models; browser port required |
| PIC16F | 16F84A, 16F628A, 16F877A, 16F18855 | [PICsim](https://github.com/lcgamboa/picsim) Emscripten integration; optional build |
| PIC16F | 16F15376 | Renvo WASM integration; optional build |
| PIC18F | 18F452, 18F4520, 18F4550, 18F4620 | PICsim Emscripten integration; optional build |
| PIC24F | 24FJ64GA002, 24FJ128GA006 | No selected open source browser CPU implementation |
| dsPIC30F | 30F2010, 30F4011, 30F4013 | No selected open source browser CPU implementation |

To enable the PIC16F and PIC18F PICsim engine, first install the [Emscripten SDK](https://emscripten.org/docs/getting_started/downloads.html) and activate `emcc` in your shell. Then run:

```sh
npm run engines:build:picsim
npm run dev
```

The build compiles PICsim's GPL-2.0-or-later C source at its pinned revision into `public/engines/picsim/picsim.mjs` and `picsim.wasm`. The CPU and peripherals execute exclusively in a browser worker. The upstream license is copied into the static asset directory. The upstream simulator source and OSEMPro integration source must remain available to users receiving these binaries to satisfy GPL terms.

After building, open `http://localhost:3000/internal/engine-lab` and select **PIC16F / PICsim / pic16f84a** or **PIC18F / PICsim / pic18f452**. The **CPU test** action uses real single-instruction Intel HEX files containing `MOVLW 0x2A` and checks the resulting `W` register equals 42. Full hardware and peripheral support is not implied by this instruction test.

PIC24F and dsPIC30F have a different 16-bit instruction architecture from PIC18 and are deliberately not routed to PICsim or Renvo PIC16. STM32F401 is mapped to its own Cortex-M4 model with F401 register definitions. F411 remains a distinct Renvo target. The lab displays planned devices with their real source references and disables execution until a compatible browser CPU model exists.

`npm run build:with-engines` now builds both Renvo and PICsim before building Next.js, so it requires both Rust/WASI and Emscripten. Use `npm run build` for a site build without those optional runtimes.

## Run HEX and BIN directly in the browser

The public UI never compiles firmware. Firmware is loaded from a file picker, parsed in a browser worker and executed by a real CPU engine. User firmware is not uploaded to Next.js or stored in Prisma.

| Engine | Intel HEX | BIN | ELF |
| --- | --- | --- | --- |
| avr8js (ATmega328P) | Native | Native | Not supported |
| rp2040js (RP2040) | Native flash segments | Native XIP flash | Not supported |
| stm32f4-emu (STM32F401 CC/CE/RC/RE) | Native | Native | Native |
| PICsim (PIC16F/PIC18F) | Native | Browser converts to Intel HEX | Not supported |
| Renvo ARM targets | Browser wraps flash segments into ELF | Browser wraps flash image into ELF | Native |
| Renvo PIC16F15376 | Native | Browser converts to Intel HEX | Not supported |
| Renvo ESP32, WCH, AVR, MSP430 | Not yet supported | Not yet supported | Native |

STM32F401 uses the open source `stm32f4-emu` package, pinned in the simulator workspace. The `postinstall` script copies its MIT licensed JavaScript and WASM assets into `public/engines/stm32f4` for the browser to load. One install step prepares the runtime:

```sh
git switch dev
git pull origin dev
npm install
npm run dev
```

Then visit `http://localhost:3000/internal/engine-lab`, select STM32, `stm32f4-emu`, `stm32f401ce` (or another F401 variant), and load your own `.hex` or `.bin`. The editor uses actual selected variant RAM and flash limits. Choose PICsim only after its optional Emscripten build is installed.

The browser WASM engine does not reproduce every analog or peripheral behavior. Flash images require a valid MCU vector table. PIC24F and dsPIC30F remain pending because no compatible open source browser CPU core has yet been integrated.
