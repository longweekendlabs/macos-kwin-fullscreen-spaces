# Changelog

## Unreleased

- Use a dedicated virtual desktop plus borderless maximization for every Space, rather than real KWin fullscreen. This preserves app controls and keeps the Plasma bottom panel available for Konsole and other apps.
- Preserve browser tabs, navigation, and Dolphin controls inside Spaces.
- Return a window to its source desktop when it is unmaximized from its Space.
- Clear stale top-edge Overview callbacks after a script reload.
- Keep ordinary clicks on a window's maximize button as ordinary maximization.
