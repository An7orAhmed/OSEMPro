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

## Prisma integration

When selecting a database, add Prisma Client and the schema under a server-only location. Replace `getPublishedProjects()` inside `src/server/projects.ts` with a Prisma query. Send only required serializable fields to the client. Never import Prisma into `packages/simulator`.

## Next step

Build a restricted engine testing route under the Next.js App Router. Firmware input, register inspection, GPIO, and UART execution should remain in browser components. A hidden path does not provide access control.
