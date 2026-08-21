#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
package_dir="$script_dir/macosfullscreenspace"

if ! command -v kpackagetool6 >/dev/null 2>&1; then
    echo "kpackagetool6 is required but was not found." >&2
    exit 1
fi

if kpackagetool6 --type KWin/Script --list 2>/dev/null | rg -q 'macosfullscreenspace'; then
    kpackagetool6 --type KWin/Script --upgrade "$package_dir"
else
    kpackagetool6 --type KWin/Script --install "$package_dir"
fi

echo "Installed macOS KWin Fullscreen Spaces."
