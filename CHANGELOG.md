# Changelog

## [Unreleased]

## [1.0] - 2026-10-26

### Changed

- Use a dedicated virtual desktop plus borderless maximization for every Space, rather than real KWin fullscreen. This preserves app controls and keeps the Plasma bottom panel available for Konsole and other apps.

### Fixed

- Use KWin's maximizeMode property for Space entry, exit, and recovery on Plasma 6.7; obsolete maximize flags prevented button clicks from creating Spaces.
- Match macOS's window-action mapping: the square button opens a dedicated Space, while a title-bar double-click fills the current desktop.
- Open Overview from the top-left corner while a managed Space exists. Remove the top-center trigger and its blue gradient bar.
- Preserve browser tabs, navigation, and Dolphin controls inside Spaces.
- Return a window to its source desktop when it is unmaximized from its Space.
- Clear stale top-edge Overview callbacks after a script reload.
- Keep ordinary clicks on a window's maximize button as ordinary maximization.
