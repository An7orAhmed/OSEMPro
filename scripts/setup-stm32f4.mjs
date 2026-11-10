import { access, copyFile, mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const resolver = createRequire(join(root, 'packages/simulator/package.json'))
const moduleFile = resolver.resolve('stm32f4-emu/stm32f4')
const packageRoot = resolve(dirname(moduleFile), '..')
const outputRoot = join(root, 'public/engines/stm32f4')

const assets = [
  'site/stm32f4.js',
  'site/emulator.js',
  'site/loaders.js',
  'site/vendor/stm32_periph_wasm.js',
  'site/vendor/stm32_periph_wasm_bg.wasm',
  'site/vendor/stm32f401.svd',
  'site/vendor/stm32f407.svd',
  'site/vendor/stm32f411.svd',
  'LICENSE'
]

for (const asset of assets) {
  const source = join(packageRoot, asset)
  const destination = join(outputRoot, asset.startsWith('site/') ? asset.slice(5) : asset)
  await access(source)
  await mkdir(dirname(destination), { recursive: true })
  await copyFile(source, destination)
}

console.log('STM32F401, F407 and F411 browser WASM assets prepared')
