#!/usr/bin/env bash
set -Eeuo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$root"

mode="${1:---dev}"

log() {
  printf '\n[OSEMPro] %s\n' "$*"
}

fail() {
  printf '\n[OSEMPro] Error: %s\n' "$*" >&2
  exit 1
}

if [[ $# -gt 1 ]]; then
  fail 'Usage: ./run.sh [--dev|--production|--check]'
fi

case "$mode" in
  --dev|--production|--check) ;;
  *) fail 'Usage: ./run.sh [--dev|--production|--check]' ;;
esac

as_root() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    fail 'Administrator access is required to install system tools'
  fi
}

ensure_system_tools() {
  local tool
  local missing=()
  for tool in git curl python3 make cc cmake unzip tar xz; do
    command -v "$tool" >/dev/null 2>&1 || missing+=("$tool")
  done

  if [[ ${#missing[@]} -eq 0 ]]; then
    return
  fi

  log "Installing missing system tools: ${missing[*]}"
  case "$(uname -s)" in
    Darwin)
      if ! xcode-select -p >/dev/null 2>&1; then
        xcode-select --install || true
        fail 'Finish installing Apple Command Line Tools, then run ./run.sh again'
      fi
      if ! command -v brew >/dev/null 2>&1; then
        NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        if [[ -x /opt/homebrew/bin/brew ]]; then
          eval "$(/opt/homebrew/bin/brew shellenv)"
        elif [[ -x /usr/local/bin/brew ]]; then
          eval "$(/usr/local/bin/brew shellenv)"
        fi
      fi
      brew install git curl python cmake make unzip xz
      ;;
    Linux)
      if command -v apt-get >/dev/null 2>&1; then
        as_root apt-get update
        as_root env DEBIAN_FRONTEND=noninteractive apt-get install -y git curl ca-certificates python3 make gcc g++ cmake unzip tar xz-utils pkg-config
      elif command -v dnf >/dev/null 2>&1; then
        as_root dnf install -y git curl ca-certificates python3 make gcc gcc-c++ cmake unzip tar xz pkgconf-pkg-config
      elif command -v pacman >/dev/null 2>&1; then
        as_root pacman -Sy --noconfirm --needed git curl ca-certificates python make gcc cmake unzip tar xz pkgconf
      else
        fail 'Automatic system tool installation supports apt, dnf, pacman and Homebrew'
      fi
      ;;
    *) fail 'Automatic installation supports macOS and Linux only' ;;
  esac

  for tool in git curl python3 make cc cmake unzip tar xz; do
    command -v "$tool" >/dev/null 2>&1 || fail "System tool is still unavailable: $tool"
  done
}

ensure_node() {
  if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1 &&
    node -e 'process.exit(Number(process.versions.node.split(".")[0]) === 24 ? 0 : 1)'; then
    return
  fi

  log 'Installing Node.js 24 with nvm'
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
    [[ ! -e "$NVM_DIR" ]] || fail "Cannot initialize existing nvm directory: $NVM_DIR"
    git clone --depth 1 --branch v0.40.3 https://github.com/nvm-sh/nvm.git "$NVM_DIR"
  fi
  source "$NVM_DIR/nvm.sh"
  nvm install 24
  nvm use 24 >/dev/null
  command -v npm >/dev/null 2>&1 || fail 'npm is unavailable after installing Node.js'
}

ensure_rust() {
  if [[ -f "$HOME/.cargo/env" ]]; then
    source "$HOME/.cargo/env"
  fi

  if ! command -v rustup >/dev/null 2>&1 || ! command -v cargo >/dev/null 2>&1; then
    log 'Installing Rust and Cargo'
    curl -fsSL https://sh.rustup.rs | sh -s -- -y --profile minimal --default-toolchain stable
    source "$HOME/.cargo/env"
  fi

  log 'Installing Rust WebAssembly target'
  rustup target add wasm32-wasip2
}

ensure_emscripten() {
  if command -v emcc >/dev/null 2>&1; then
    return
  fi

  log 'Installing Emscripten SDK'
  local node_path="$(dirname "$(command -v node)")"
  local emsdk_dir="$root/.build/emsdk"
  local emsdk_version='3.1.73'
  if [[ ! -f "$emsdk_dir/emsdk" ]]; then
    mkdir -p "$(dirname "$emsdk_dir")"
    git clone --depth 1 https://github.com/emscripten-core/emsdk.git "$emsdk_dir"
  fi
  (
    cd "$emsdk_dir"
    ./emsdk install "$emsdk_version"
    ./emsdk activate "$emsdk_version"
  )
  source "$emsdk_dir/emsdk_env.sh" >/dev/null
  export PATH="$node_path:$PATH"
  command -v emcc >/dev/null 2>&1 || fail 'Emscripten compiler is unavailable after installation'
}

log 'Checking system requirements'
ensure_system_tools
ensure_node

log 'Installing application dependencies'
npm ci --no-audit --no-fund

ensure_rust
ensure_emscripten

log 'Preparing STM32 WebAssembly runtime'
node scripts/setup-stm32f4.mjs

log 'Building PICsim WebAssembly runtime'
bash scripts/build-picsim.sh

log 'Building Renvo WebAssembly runtime'
bash scripts/build-renvo.sh

test -s public/engines/stm32f4/vendor/stm32_periph_wasm_bg.wasm || fail 'STM32 runtime was not generated'
test -s public/engines/picsim/picsim.wasm || fail 'PICsim runtime was not generated'
test -s public/engines/renvo/renvo.js || fail 'Renvo runtime was not generated'

if ! node -e 'require("dotenv").config(); process.exit(process.env.DATABASE_URL ? 0 : 1)'; then
  export DATABASE_URL='postgresql://osempro:osempro@127.0.0.1:5432/osempro'
  log 'DATABASE_URL is not configured. Database operations require a real connection.'
elif [[ "$mode" != '--check' ]]; then
  log 'Checking database connection'
  node scripts/check-db.mjs
fi

log 'Generating and validating Prisma client'
./node_modules/.bin/prisma generate
./node_modules/.bin/prisma validate

log 'Running tests'
node --experimental-strip-types --test tests/*.test.mjs

log 'Checking types'
./node_modules/.bin/tsc --noEmit

log 'Running lint'
./node_modules/.bin/oxlint src packages tests

log 'Building Next.js'
./node_modules/.bin/next build

log 'All checks passed'
if [[ "$mode" == '--check' ]]; then
  exit 0
fi

port="${PORT:-3000}"
[[ "$port" =~ ^[1-9][0-9]*$ ]] && (( port <= 65535 )) || fail 'PORT must be between 1 and 65535'

if [[ "$mode" == '--production' ]]; then
  server_mode='start'
  readiness_path='/'
else
  server_mode='dev'
  readiness_path='/internal/engine-lab'
fi

./node_modules/.bin/next "$server_mode" --hostname 127.0.0.1 --port "$port" &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

for (( attempt = 0; attempt < 90; attempt++ )); do
  if curl --silent --fail --output /dev/null --max-time 2 "http://127.0.0.1:$port$readiness_path"; then
    log "App ready: http://localhost:$port"
    if [[ "$mode" == '--dev' ]]; then
      printf '[OSEMPro] Engine Lab: http://localhost:%s/internal/engine-lab\n' "$port"
    fi
    wait "$server_pid"
    exit $?
  fi
  kill -0 "$server_pid" 2>/dev/null || fail 'Next.js stopped before becoming ready'
  sleep 1
done

fail 'Next.js did not become ready'
