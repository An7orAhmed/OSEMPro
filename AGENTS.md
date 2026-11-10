# OSEMPro rules

- Use `dev` for all development. Never push directly to `main`.
- Only expose STM32 F103/F401/F407/F411, AVR8, PIC12F, PIC16F, PIC18F, PIC24F, dsPIC30F, ESP8266 and ESP32.
- Do not register other MCU platforms or substitute incompatible chips.
- All CPU execution and firmware parsing occur in the user's browser Web Workers.
- Keep `packages/simulator` independent of React, Next.js, Prisma and server runtimes.
- Only import emulator registry and CPU adapters from worker entrypoints or local tests.
- Server code may import simulator types and static catalog data, never runtime modules.
- Keep Prisma Client and secrets inside server-only modules.
- Do not send firmware bytes, register dumps or CPU state to Next.js APIs or Prisma.
- Never claim a planned model is installed or runnable without runtime verification.
- Preserve actual HEX/BIN behavior and document limitations per emulator.
- Keep real instruction fixtures for working backends; test each supported chip model in the browser.
- Preserve GPL licensing and source availability for any distributed PICsim WASM.
- Keep UI minimal, responsive and accessible, with 2-space indentation and no code comments.
- Run `npm test`, `npm run typecheck`, `npm run lint` and `npm run build` before release.
