#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
build_dir="${RENVO_BUILD_DIR:-$root/.build/renvo_emu}"
revision="${RENVO_REF:-6b0c7221ca32e83903797d2c86a8effdcd62550a}"
output="$root/public/engines/renvo"

for executable in git cargo rustup npm; do
  if ! command -v "$executable" >/dev/null 2>&1; then
    printf 'Required tool not found: %s\n' "$executable" >&2
    exit 1
  fi
done

if [ ! -d "$build_dir/.git" ]; then
  mkdir -p "$(dirname "$build_dir")"
  git clone --filter=blob:none --no-checkout https://github.com/tinyrange/renvo_emu.git "$build_dir"
fi

git -C "$build_dir" fetch --depth 1 origin "$revision"
git -C "$build_dir" checkout --force --detach FETCH_HEAD

rustup target add wasm32-wasip2
npm ci --prefix "$build_dir/web"
cargo build --release -p remu-web --target wasm32-wasip2 --locked --manifest-path "$build_dir/Cargo.toml"
npm --prefix "$build_dir/web" run transpile
npm --prefix "$build_dir/web" run test:component

cat > "$build_dir/web/osempro.vite.config.mjs" <<'EOF'
import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve('generated/renvo.js'),
      formats: ['es'],
      fileName: 'renvo'
    },
    outDir: process.env.OSEMPRO_RENVO_OUTPUT,
    emptyOutDir: true,
    copyPublicDir: false,
    assetsInlineLimit: 0
  }
})
EOF

mkdir -p "$output"
(
  cd "$build_dir/web"
  OSEMPRO_RENVO_OUTPUT="$output" ./node_modules/.bin/vite build --config osempro.vite.config.mjs
)

test -s "$output/renvo.js"
cp "$build_dir/LICENSE-MIT" "$output/LICENSE-MIT"
cp "$build_dir/LICENSE-APACHE" "$output/LICENSE-APACHE"
cp "$build_dir/THIRD_PARTY_LICENSES.md" "$output/THIRD_PARTY_LICENSES.md"
printf 'Renvo browser runtime built at %s\n' "$output"
