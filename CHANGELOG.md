# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2026-09-07
### Added
- **Keyboard Shortcuts:** Support for zooming (`+`/`-`), moving (Arrow keys), resetting (`0` / `Esc`), and rotating (`R`/`L`).
- **HUD Zoom Badge:** Modern floating glassmorphism badge displaying the current zoom ratio and rotation angle.
- **Custom Zoom:** Added an option to the context menu to enter a specific zoom percentage via a prompt dialog.
- **Domain Exclusion:** New settings option to disable the extension on specific websites (e.g., maps, design tools).
- **Chromium Support:** Fully compatible with Google Chrome and Microsoft Edge using a Manifest V3 Service Worker.
- **State Cleanup:** Spotless DOM state purge when the extension is disabled on a page.

### Changed
- **Freehand Rotation:** Upgraded rotation mechanics to use vector-based math for smooth, interactive mouse rotation.
- **Settings UI:** Overhauled the options page with a modular architecture and automatic localized strings (i18n).

### Fixed
- **Accidental Clicks:** Prevented unintended link clicks or image opening immediately after dragging or freehand rotation.
- **DOM Artifacts:** Fixed an issue where the extension left CSS or hidden elements behind when resetting an image.
- **Context Menu Errors:** Improved menu creation logic to prevent duplicate ID errors in the background script.

## [1.0.1] - Initial Fork & Modernization
### Added
- Initial fork of the abandoned Firefox add-on *Zoom Image* (v2.7.1) originally created by crossblade.
- Re-released under the Mozilla Public License 2.0 (MPL-2.0).
- Replaced outdated PNG raster icons with scalable SVG graphics.

### Changed
- **Manifest V3:** Migrated the extension structure to Manifest V3 (for Firefox).
- **Vanilla JS Rewrite:** Removed the legacy jQuery (3.1.1) dependency entirely in favor of native JavaScript.
- **Memory Management:** Refactored DOM element tracking using modern `WeakMap` implementation to attach metadata efficiently.