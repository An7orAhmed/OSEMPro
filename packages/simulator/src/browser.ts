export async function loadBrowserSimulator() {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    throw new Error('Firmware simulation requires a browser with Web Worker support')
  }

  return import('./initialize.ts')
}
