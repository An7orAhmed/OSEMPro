# OSEMPro development rules

- Work only on `dev`. Never commit or push to `main`.
- The web app uses Next.js App Router; keep server and client responsibilities separate.
- `packages/simulator` is an independent browser simulation package without React, Next.js, Prisma or server dependencies.
- Never execute uploaded firmware on Next.js servers. Load simulator runtime only in the user's browser.
- Use `@osempro/simulator/browser` for lazy runtime loading and import types or catalog separately.
- Keep database access in `src/server` and other server-only modules. Never expose Prisma or credentials to client code.
- Add Prisma when the datasource and project schema are defined.
- Add CPU execution smoke tests for every working engine and report unavailable engines accurately.
- Do not invent project records, simulator outputs, device capabilities, or usage figures.
- Respect emulator licenses and distribute only redistributable binary or WASM assets.
- Keep UI modern, minimal, responsive, and accessible.
- Use readable TypeScript, 2 space indentation, and meaningful names.
- Check `npm run lint`, `npm test`, `npm run typecheck`, and `npm run build` before releasing.
- Require real authentication for private projects or engine test pages; an obscure URL is not security.
- The engine lab route is only available with Next.js `NODE_ENV=development`; never mistake a hidden URL for authentication.
- Browser firmware tests run within `packages/simulator/src/lab.worker.ts`; never send firmware to Next.js routes or Prisma.
- Keep actual CPU fixtures in `packages/simulator/src/smoke.ts` and verify them with `tests/engine-lab.test.mjs`.
