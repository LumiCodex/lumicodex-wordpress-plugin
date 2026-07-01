#!/usr/bin/env bash
# Build a properly structured WordPress plugin zip: a single top-level
# directory named after the plugin slug, containing only runtime files.
set -euo pipefail

SLUG="lumicodex-advanced"
TAG="${1:-}"
VERSION="${TAG#v}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="$ROOT_DIR/build"
STAGE_DIR="$BUILD_DIR/$SLUG"

HEADER_VERSION="$(grep -m1 '^ \* Version:' "$ROOT_DIR/lumicodex-advanced.php" | sed -E 's/^ \* Version:[[:space:]]*//')"
README_VERSION="$(grep -m1 '^Stable tag:' "$ROOT_DIR/readme.txt" | sed -E 's/^Stable tag:[[:space:]]*//')"

if [ "$HEADER_VERSION" != "$README_VERSION" ]; then
  echo "Version mismatch: plugin header is $HEADER_VERSION, readme.txt Stable tag is $README_VERSION" >&2
  exit 1
fi

if [ -n "$VERSION" ] && [ "$VERSION" != "$HEADER_VERSION" ]; then
  echo "Version mismatch: tag is $TAG but plugin version is $HEADER_VERSION" >&2
  exit 1
fi

rm -rf "$BUILD_DIR"
mkdir -p "$STAGE_DIR"

cp "$ROOT_DIR/lumicodex-advanced.php" "$STAGE_DIR/"
cp "$ROOT_DIR/readme.txt" "$STAGE_DIR/"
cp "$ROOT_DIR/LICENSE" "$STAGE_DIR/"
cp "$ROOT_DIR/LICENSES.md" "$STAGE_DIR/"
cp -R "$ROOT_DIR/assets" "$STAGE_DIR/"

find "$STAGE_DIR" -name ".DS_Store" -delete

ZIP_NAME="${SLUG}-${HEADER_VERSION}.zip"
rm -f "$BUILD_DIR/$ZIP_NAME"
(cd "$BUILD_DIR" && zip -rq "$ZIP_NAME" "$SLUG")

echo "Built $BUILD_DIR/$ZIP_NAME"
