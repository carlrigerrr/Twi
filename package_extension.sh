#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_NAME="extension-1.4_0.zip"
SOURCE_DIR="1.4_0"

cd "$ROOT_DIR"

if [ ! -d "$SOURCE_DIR" ]; then
  echo "Source directory '$SOURCE_DIR' not found." >&2
  exit 1
fi

zip -r "$OUTPUT_NAME" "$SOURCE_DIR" > /dev/null

echo "Created $OUTPUT_NAME in $ROOT_DIR" 
