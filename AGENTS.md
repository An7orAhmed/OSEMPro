# OSEMPro development rules

- Work only on the `dev` branch. Never commit or push directly to `main`.
- Keep simulation engines and their state independent of React and presentation components.
- Add each CPU implementation through `SimulationAdapter` and test firmware execution before marking it supported.
- Never fake simulation results, projects, usage figures, or engine availability.
- Prefer real open source cores and keep a clear record of their licenses.
- Use TypeScript, React, Tailwind CSS, two spaces for indentation, and readable names.
- Keep text concise and the UI responsive, accessible, and lightweight.
- Run `npm test`, `npm run lint`, and `npm run build` after changes.
- Development engine routes must not be presented as secure solely because the paths are hidden.
