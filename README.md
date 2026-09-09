# macOS KWin Fullscreen Spaces

A KDE Plasma 6 KWin script that gives maximized windows a macOS-style fullscreen Space.

When a supported window is maximized, the script:

- creates a dedicated virtual desktop for the window;
- moves the window there and enters real fullscreen;
- keeps browser chrome and Dolphin's file-management controls usable by using borderless maximization instead of real fullscreen for those apps;
- exposes Overview from the top edge while that Space exists;
- lets the window be moved to another virtual desktop from Overview;
- exits fullscreen, removes the temporary desktop, and closes Overview after a successful move;
- provides `Meta+Shift+F` to leave the Space manually.

The top-edge affordance is registered only while a managed fullscreen Space exists. The script does not add a permanent top-edge trigger to ordinary desktops.

## Requirements

- KDE Plasma 6 with KWin
- Wayland or X11 session
- `kpackagetool6`

## Install

```bash
./install.sh
```

Then enable **macOS Fullscreen Spaces** in System Settings → Window Management → KWin Scripts if it is not already enabled. Reconfigure or restart KWin after installation if needed.

The script registers `Meta+Shift+F`. If that shortcut is already used, assign another shortcut under System Settings → Shortcuts → KWin.

## Recommended KWin settings

The companion configuration used during development is:

- Screen-edge activation remains enabled during fullscreen;
- KWin edge delay and cooldown are set to zero;
- MouseTiler edge scrolling is disabled so it does not compete with the fullscreen Overview edge.

These are user-level settings in `~/.config/kwinrc`; the installer does not overwrite them automatically.

## Updating safely

The repository is the source of truth. Reinstall after updating the repository:

```bash
git pull
./install.sh
```

Before changing KWin settings, back up `~/.config/kwinrc` and `~/.config/kglobalshortcutsrc`. Plasma updates normally do not modify this repository, but reinstalling a KWin package can replace the installed copy under `~/.local/share/kwin/scripts/`.

## Uninstall

```bash
./uninstall.sh
```

Uninstalling removes the script package. It does not alter your KWin configuration.

## Recovery

If a window becomes stranded in a temporary fullscreen Space, use `Meta+Shift+F`. If the script was reloaded while a Space was active, reload it once so it can recover existing Spaces, or disable the script and switch to another virtual desktop.

## License

MIT. See [LICENSE](LICENSE).
