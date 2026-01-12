#!/usr/bin/env bash
set -euo pipefail

if [ "${FIELD_NOTES_UNLOCK:-}" = "1" ]; then
  exit 0
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Field Notes lock: not in a git repo." >&2
  exit 1
fi

changed="$( { git diff --name-only; git diff --cached --name-only; } | sort -u )"

if echo "$changed" | grep -E '^(field-notes/|field-notes\.html$)' >/dev/null; then
  echo "Field Notes are locked. Set FIELD_NOTES_UNLOCK=1 to modify field notes." >&2
  exit 1
fi
