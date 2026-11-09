# OSEMPro development rules

- Work only on the `dev` branch. Never commit or push directly to `main`.
- Keep emulator logic, WASM workers, and runtime state independent of React and presentation code.
- Integrate existing open source cores through `SimulationAdapter` and preserve engine selection.
- No placeholder CPU outputs, manufactured usage numbers, or false installed-engine statuses.
- Test at least one real instruction sequence for every new CPU adapter.
- Respect upstream licenses, disclose unavailable firmware boot, memory, or peripheral features.
- Use TypeScript, React, Tailwind CSS, two spaces for indentation, and meaningful names.
- Keep the public UI minimal, accessible, responsive and independent of emulator code.
- Run `npm test`, `npm run lint`, and `npm run build` before release.
- Development engine test routes require genuine access controls if exposing private firmware.
