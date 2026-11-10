import { execFileSync } from 'node:child_process'
import { access, copyFile, mkdir, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const sourceRoot = join(root, '.build/stm32f4-emulator')
const outputRoot = join(root, 'public/engines/stm32f4')
const sourceRevision = 'ae43553ee17478ad7406c10e16fc2d056778bcf6'
const sourceUrl = 'https://github.com/danish9661/STM32F4-emulator.git'

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

function git(...args) {
  execFileSync('git', args, { stdio: 'inherit' })
}

async function sourceReady() {
  try {
    const revision = execFileSync('git', ['-C', sourceRoot, 'rev-parse', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim()
    if (revision !== sourceRevision) return false
    for (const asset of assets) {
      const file = await stat(join(sourceRoot, asset))
      if (!file.isFile() || file.size === 0) return false
    }
    return true
  } catch {
    return false
  }
}

if (!(await sourceReady())) {
  try {
    await access(join(sourceRoot, '.git'))
  } catch {
    await mkdir(dirname(sourceRoot), { recursive: true })
    git('clone', '--filter=blob:none', '--no-checkout', sourceUrl, sourceRoot)
  }

  git('-C', sourceRoot, 'fetch', '--depth', '1', 'origin', sourceRevision)
  git('-C', sourceRoot, 'checkout', '--force', '--detach', 'FETCH_HEAD')
}

for (const asset of assets) {
  const source = join(sourceRoot, asset)
  const file = await stat(source)
  if (!file.isFile() || file.size === 0) {
    throw new Error(`STM32F4 source asset is missing: ${asset}`)
  }

  const destination = join(outputRoot, asset.startsWith('site/') ? asset.slice(5) : asset)
  await mkdir(dirname(destination), { recursive: true })
  await copyFile(source, destination)
}

console.log('STM32F401, F407 and F411 browser WASM assets prepared')
