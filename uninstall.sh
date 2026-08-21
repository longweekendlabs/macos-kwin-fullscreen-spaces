#!/usr/bin/env bash
set -euo pipefail

if ! command -v kpackagetool6 >/dev/null 2>&1; then
    echo "kpackagetool6 is required but was not found." >&2
    exit 1
fi

kpackagetool6 --type KWin/Script --remove macosfullscreenspace
echo "Removed macOS KWin Fullscreen Spaces."
