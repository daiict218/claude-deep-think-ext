#!/usr/bin/env bash
# Build a Chrome Web Store submission zip containing only the files the
# extension actually needs at runtime. Everything else — git metadata,
# agent definitions, docs, build scripts, dotfiles — is excluded.
#
# Usage: ./build.sh
# Output: dist/claude-deep-think-ext-v<version>.zip

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

VERSION="$(grep -E '"version"\s*:' manifest.json | head -1 | sed -E 's/.*"([0-9.]+)".*/\1/')"
if [ -z "${VERSION:-}" ]; then
  echo "ERROR: could not parse version from manifest.json" >&2
  exit 1
fi

OUT_DIR="dist"
OUT_FILE="$OUT_DIR/claude-deep-think-ext-v${VERSION}.zip"

mkdir -p "$OUT_DIR"
rm -f "$OUT_FILE"

# Explicit allowlist — whatever is not listed here is NOT shipped.
FILES=(
  manifest.json
  content.js
  injected.js
  popup.html
  popup.js
  icon16.png
  icon48.png
  icon128.png
)

for f in "${FILES[@]}"; do
  if [ ! -f "$f" ]; then
    echo "ERROR: required file missing: $f" >&2
    exit 1
  fi
done

zip -j "$OUT_FILE" "${FILES[@]}" >/dev/null

echo "Built $OUT_FILE"
echo "Contents:"
unzip -l "$OUT_FILE"
