#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

LEGACY_APP_SOURCE="/home/jessibelle/Divergify/active/divergify-hub/apps/divergify-hub-app"
APP_SOURCE="${APP_SOURCE:-$LEGACY_APP_SOURCE}"
SITE_TARGET="/home/jessibelle/Divergify/active/Divergify_Website/hub/beta"
HUB_PAGE="/home/jessibelle/Divergify/active/Divergify_Website/hub.html"
APP_BASE="${APP_BASE:-/hub/beta/}"

if [[ ! -d "$APP_SOURCE" ]]; then
  echo "APP_SOURCE does not exist: $APP_SOURCE" >&2
  exit 1
fi

if [[ ! -f "$APP_SOURCE/package.json" ]]; then
  echo "APP_SOURCE is missing package.json: $APP_SOURCE" >&2
  exit 1
fi

export VITE_BASE_PATH="$APP_BASE"
export VITE_BUILD_STAMP="$(cd "$APP_SOURCE" && git rev-parse --short HEAD 2>/dev/null || echo unknown)"

npm --prefix "$APP_SOURCE" install
npm --prefix "$APP_SOURCE" run build

if [[ ! -d "$APP_SOURCE/dist" ]]; then
  echo "Build completed but dist folder was not found at: $APP_SOURCE/dist" >&2
  exit 1
fi

mkdir -p "$SITE_TARGET"
rm -rf "$SITE_TARGET"/*
cp -r "$APP_SOURCE/dist/"* "$SITE_TARGET/"

# Keep existing hub.html inline asset rewrite only for the legacy hub app source.
APP_SOURCE_REAL="$(cd "$APP_SOURCE" && pwd)"
LEGACY_APP_SOURCE_REAL="$(cd "$LEGACY_APP_SOURCE" && pwd)"

if [[ "$APP_SOURCE_REAL" == "$LEGACY_APP_SOURCE_REAL" ]]; then
  APP_INDEX="$SITE_TARGET/index.html"
  if [[ -f "$APP_INDEX" && -f "$HUB_PAGE" ]]; then
    APP_CSS="$(rg -o 'href=\"[^\"]+assets/[^\"]+\.css\"' "$APP_INDEX" | head -n1 | sed 's/^href=\"//;s/\"$//' || true)"
    APP_JS="$(rg -o 'src=\"[^\"]+assets/[^\"]+\.js\"' "$APP_INDEX" | head -n1 | sed 's/^src=\"//;s/\"$//' || true)"
    APP_MANIFEST="$(rg -o 'href=\"[^\"]+manifest\.webmanifest\"' "$APP_INDEX" | head -n1 | sed 's/^href=\"//;s/\"$//' || true)"
    APP_SW="$(rg -o 'src=\"[^\"]+registerSW\.js\"' "$APP_INDEX" | head -n1 | sed 's/^src=\"//;s/\"$//' || true)"

    if [[ -n "$APP_CSS" && -n "$APP_JS" && -n "$APP_MANIFEST" && -n "$APP_SW" ]]; then
      python3 - "$HUB_PAGE" "$APP_CSS" "$APP_JS" "$APP_MANIFEST" "$APP_SW" <<'PY'
import sys
from pathlib import Path

hub_path, css, js, manifest, sw = sys.argv[1:6]
text = Path(hub_path).read_text(encoding="utf-8")
start = "<!-- app-inline-start -->"
end = "<!-- app-inline-end -->"
if start in text and end in text:
    before, rest = text.split(start, 1)
    _, after = rest.split(end, 1)
    block = (
        f"{start}\n"
        f"  <link rel=\"stylesheet\" crossorigin href=\"{css}\">\n"
        f"  <script type=\"module\" crossorigin src=\"{js}\"></script>\n"
        f"  <link rel=\"manifest\" href=\"{manifest}\">\n"
        f"  <script id=\"vite-plugin-pwa:register-sw\" src=\"{sw}\"></script>\n"
        f"  {end}"
    )
    Path(hub_path).write_text(before + block + after, encoding="utf-8")
PY
    fi
  fi
fi

echo "Built from: $APP_SOURCE"
echo "Copied app dist -> $SITE_TARGET"
