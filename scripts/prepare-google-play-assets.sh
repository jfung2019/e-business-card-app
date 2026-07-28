#!/usr/bin/env bash
# Prepare Google Play listing assets from existing app icon + iOS screenshots.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ICON_SRC="$ROOT/assets/app-icon-1024.png"
SCREEN_SRC="$ROOT/store-assets/app-store-screenshots/1320x2868"
OUT="$ROOT/store-assets/google-play"

mkdir -p "$OUT/phone-screenshots"

if [[ ! -f "$ICON_SRC" ]]; then
  echo "Missing app icon: $ICON_SRC" >&2
  exit 1
fi

cp "$ICON_SRC" /tmp/gp-icon-src.png
sips -z 512 512 /tmp/gp-icon-src.png >/dev/null
sips -s format png -s formatOptions best /tmp/gp-icon-src.png --out "$OUT/app-icon-512.png" >/dev/null

if [[ -d "$SCREEN_SRC" ]]; then
  cp "$SCREEN_SRC/6-IMG_0013.png" "$OUT/phone-screenshots/01-sign-in.png"
  cp "$SCREEN_SRC/7-IMG_0014.png" "$OUT/phone-screenshots/02-sign-up.png"
  cp "$SCREEN_SRC/8-IMG_0015.png" "$OUT/phone-screenshots/03-wallet.png"
  cp "$SCREEN_SRC/9-IMG_0016.png" "$OUT/phone-screenshots/04-scan-card.png"
  cp "$SCREEN_SRC/10-IMG_0017.png" "$OUT/phone-screenshots/05-profile.png"
  cp "$SCREEN_SRC/2-IMG_0009.png" "$OUT/phone-screenshots/06-wallet-dark.png"
  for f in "$OUT/phone-screenshots"/*.png; do
    sips -s format png -s formatOptions best "$f" --out "$f" >/dev/null
  done
fi

echo "Created:"
echo "  $OUT/app-icon-512.png"
echo "  $OUT/feature-graphic-1024x500.png (create/update manually if needed)"
echo "  $OUT/phone-screenshots/*.png"
