#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
build_dir="${PICSIM_BUILD_DIR:-$root/.build/picsim}"
revision="${PICSIM_REF:-3ee791875e15097a2d219c6afe08a8eadc17b673}"
output="$root/public/engines/picsim"

for executable in git emcc; do
  if ! command -v "$executable" >/dev/null 2>&1; then
    printf 'Required tool not found: %s\n' "$executable" >&2
    exit 1
  fi
done

if [ ! -d "$build_dir/.git" ]; then
  mkdir -p "$(dirname "$build_dir")"
  git clone --filter=blob:none --no-checkout https://github.com/lcgamboa/picsim.git "$build_dir"
fi

git -C "$build_dir" fetch --depth 1 origin "$revision"
git -C "$build_dir" checkout --force --detach FETCH_HEAD

sources=()
while IFS= read -r filename; do
  sources+=("$filename")
done < <(find "$build_dir/src" -type f -name '*.c' ! -name picsim.c ! -name modules.c | sort)

mkdir -p "$output"

emcc "${sources[@]}" "$root/scripts/picsim-bridge.c" \
  -I "$build_dir/include" \
  -O2 \
  --no-entry \
  -s MODULARIZE=1 \
  -s EXPORT_ES6=1 \
  -s ENVIRONMENT=worker \
  -s FILESYSTEM=1 \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s EXPORTED_FUNCTIONS='["_malloc","_free","_osem_initialize","_osem_supported","_osem_load","_osem_step","_osem_reset","_osem_pc","_osem_w","_osem_cycles","_osem_ram_size","_osem_ram","_osem_pin_count","_osem_pin","_osem_set_pin","_osem_end"]' \
  -s EXPORTED_RUNTIME_METHODS='["FS","stringToUTF8","lengthBytesUTF8"]' \
  -o "$output/picsim.mjs"

test -s "$output/picsim.mjs"
test -s "$output/picsim.wasm"
cp "$build_dir/COPYING" "$output/COPYING"
printf 'PICsim browser runtime built at %s\n' "$output"
