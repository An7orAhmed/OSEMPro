import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, chmodSync, readlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const launcher = readFileSync(new URL('../run.sh', import.meta.url), 'utf8')
const start = launcher.indexOf('configure_emsdk_python() {')
const end = launcher.indexOf('\nensure_emscripten() {', start)
const configurePython = launcher.slice(start, end)

function fakePython(path, version) {
  const compatible = Number(version.split('.')[1]) >= 10
  const content = [
    '#!/bin/sh',
    'case "$1" in',
    '  -c)',
    '    case "$2" in',
    `      *version_info*) exit ${compatible ? 0 : 1} ;;`,
    `      *realpath*) printf '%s\\n' "${path}"; exit 0 ;;`,
    '    esac',
    '    ;;',
    `  --version) printf 'Python ${version}\\n'; exit 0 ;;`,
    'esac',
    'exit 1'
  ].join('\n')
  writeFileSync(path, content)
  chmodSync(path, 0o755)
}

test('Emscripten selects Conda Python instead of outdated Apple python3', () => {
  assert.ok(start >= 0 && end > start)
  const root = mkdtempSync(join(tmpdir(), 'osempro-emsdk-python-'))
  try {
    const bin = join(root, 'bin')
    mkdirSync(bin)
    fakePython(join(bin, 'python3'), '3.9.6')
    fakePython(join(bin, 'python'), '3.13.18')
    const script = [
      'set -Eeuo pipefail',
      'root="$TEST_ROOT"',
      'log() { :; }',
      'fail() { printf "%s\\n" "$*" >&2; exit 1; }',
      configurePython,
      'configure_emsdk_python',
      'python3 --version'
    ].join('\n')
    const result = spawnSync('bash', ['-c', script], {
      env: { ...process.env, TEST_ROOT: root, PATH: `${bin}:${process.env.PATH}` },
      encoding: 'utf8'
    })
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /Python 3\.13\.18/)
    assert.equal(readlinkSync(join(root, '.build/emsdk-python/bin/python3')), join(bin, 'python'))
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('Emscripten invokes the selected Python before SDK installation', () => {
  assert.match(launcher, /ensure_emscripten\(\) \{\n  configure_emsdk_python/)
  assert.match(launcher, /ln -sfn "\$interpreter" "\$shim_dir\/python3"/)
  assert.match(launcher, /export PATH="\$shim_dir:\$PATH"/)
  assert.match(launcher, /\.\/emsdk install "\$emsdk_version"/)
})
