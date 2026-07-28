#!/usr/bin/env bash
# Upscale iPhone screenshots to App Store Connect accepted sizes.
# Usage: ./scripts/resize-app-store-screenshots.sh [input_dir] [output_dir]
set -euo pipefail

INPUT_DIR="${1:-.}"
OUTPUT_DIR="${2:-./store-assets/app-store-screenshots}"

# 6.9" iPhone (required slot): 1320x2868, 1290x2796, or 1260x2736
# 6.5" iPhone (fallback slot): 1284x2778 or 1242x2688
TARGET_W=1320
TARGET_H=2868

mkdir -p "$OUTPUT_DIR/1320x2868" "$OUTPUT_DIR/1320x2868-jpg" "$OUTPUT_DIR/1284x2778" "$OUTPUT_DIR/1242x2688"

shopt -s nullglob
files=("$INPUT_DIR"/*.png "$INPUT_DIR"/*.PNG "$INPUT_DIR"/*.jpg "$INPUT_DIR"/*.JPG "$INPUT_DIR"/*.jpeg "$INPUT_DIR"/*.JPEG)
if [ ${#files[@]} -eq 0 ]; then
  echo "No image files found in: $INPUT_DIR" >&2
  exit 1
fi

i=1
for f in "${files[@]}"; do
  base=$(basename "$f")
  base="${base%.*}"
  tmp="/tmp/asc_resize_${i}.png"
  cp "$f" "$tmp"

  sips -z "$TARGET_H" "$TARGET_W" "$tmp" >/dev/null

  # Export real PNG (App Store rejects .png files that contain JPEG data).
  sips -s format png -s formatOptions best "$tmp" --out "$OUTPUT_DIR/1320x2868/${i}-${base}.png" >/dev/null
  sips -s format jpeg -s formatOptions best "$tmp" --out "$OUTPUT_DIR/1320x2868-jpg/${i}-${base}.jpg" >/dev/null

  sips -z 2778 1284 "$tmp" >/dev/null
  sips -s format png -s formatOptions best "$tmp" --out "$OUTPUT_DIR/1284x2778/${i}-${base}.png" >/dev/null

  sips -z 2688 1242 "$tmp" >/dev/null
  sips -s format png -s formatOptions best "$tmp" --out "$OUTPUT_DIR/1242x2688/${i}-${base}.png" >/dev/null

  rm -f "$tmp"
  echo "[$i] $base -> 1320x2868 (png/jpg), 1284x2778, 1242x2688"
  i=$((i + 1))
done

echo ""
echo "Upload to App Store Connect:"
echo "  1. Media Manager -> iPhone 6.9\" Display"
echo "  2. Use: $OUTPUT_DIR/1320x2868/*.png  (or 1320x2868-jpg/*.jpg)"
echo "Do NOT use the old 1320x2868 files if they were created before this script fix."
