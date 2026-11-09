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
