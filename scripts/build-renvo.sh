#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
build_dir="${RENVO_BUILD_DIR:-$root/.build/renvo_emu}"
source_url="https://github.com/tinyrange/renvo_emu.git"

if [ ! -d "$build_dir/.git" ]; then
  mkdir -p "$(dirname "$build_dir")"
  git clone --depth 1 "$source_url" "$build_dir"
fi

if [ -n "${RENVO_REF:-}" ]; then
  git -C "$build_dir" fetch --depth 1 origin "$RENVO_REF"
  git -C "$build_dir" checkout --detach FETCH_HEAD
fi

rustup target add wasm32-wasip2
cargo build --release -p remu-web --target wasm32-wasip2 --locked --manifest-path "$build_dir/Cargo.toml"
npm ci --prefix "$build_dir/web"
npm --prefix "$build_dir/web" run transpile

mkdir -p "$root/public/engines/renvo"
"$build_dir/web/node_modules/.bin/esbuild" "$build_dir/web/generated/renvo.js" --bundle --platform=browser --format=esm --outdir="$root/public/engines/renvo" --loader:.wasm=file
cp "$build_dir/LICENSE-MIT" "$root/public/engines/renvo/LICENSE-MIT" 2>/dev/null || true
cp "$build_dir/LICENSE-APACHE" "$root/public/engines/renvo/LICENSE-APACHE" 2>/dev/null || true
cp "$build_dir/THIRD_PARTY_LICENSES.md" "$root/public/engines/renvo/THIRD_PARTY_LICENSES.md"
