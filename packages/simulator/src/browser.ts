export async function loadBrowserSimulator() {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    throw new Error('Simulation requires a browser with Web Worker support')
  }
  return import('./lab.ts')
}
