#!/usr/bin/env bash
set -euo pipefail
files=$(rg -n "^(<<<<<<<|=======|>>>>>>>)" public api || true)
if [[ -n "$files" ]]; then
  echo "❌ Se detectaron marcadores de conflicto sin resolver:"
  echo "$files"
  exit 1
fi

echo "✅ No hay conflictos pendientes en public/ ni api/."
