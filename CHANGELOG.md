# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0] - 2026-09-21
### Added
- **Interactive Custom Panel:** Replaced the basic zoom prompt with a sleek, draggable floating UI offering precise sliders and inputs for Zoom, Width, Rotation, Opacity, and Brightness. Launch it instantly on images using the new `P` keyboard shortcut.
- **Image Export:** Save your manipulated images (including applied filters, flips, and rotations) directly as a PNG file. Safely catches and warns about server-side CORS restrictions.
- **Image Flipping:** Added horizontal and vertical flip controls within the new custom panel.
- **Zoom to Cursor:** New setting to zoom directly towards the current mouse pointer position (Floating mode) rather than just scaling from the center.
- **Quick Zoom:** Hold `Ctrl` + `Alt` + `Right Click` + `Left Click` and drag the mouse up or down for a seamless, fast scaling experience.
- **Advanced Reset (`Shift` + `Esc`):** Safely restore the original state of all images while keeping the custom panel active for further adjustments.
- **New Localizations:** Added Korean (ko) and Turkish (tr). The extension is now fully translated into 11 languages.
- **Dark Mode Support:** The options page now automatically adapts to your system's native dark theme.

### Changed
- **Options Page (Firefox):** The settings page now opens in a dedicated, separate tab for better readability and improved design, rather than an embedded pop-up.
- **Single Image View Improvements:** Fixed edge cases in the single image view, allowing direct mouse wheel zooming without a right-click and enabling smooth dragging after enlargement.
- **Zoom Limits:** Enforced a lower zoom limit capping the minimum size at 5% of the original scale and a minimum width of 20 pixels to prevent images from becoming unrecoverably small.
- **Localization:** Expanded all language files to support the new panel UI, tooltips, buttons, etc.

### Fixed
- **Optimizations & Performance:** Delivered significant performance boosts during scaling and rotation, plugged memory leaks, and applied various under-the-hood bugfixes.
- **Aggressive CSS Overrides:** Fixed issues where zooming out was blocked by website stylesheets (e.g., on real estate or gallery sites).
- **DOM Reset Reliability:** Completely overhauled the style reset logic. Hard flags are now thoroughly purged in a two-step process, guaranteeing images return to their exact original state without layout artifacts.

## [1.1.2] - 2026-09-09
### Fixed
- **Options page:** Minor adjustment relevant only to the Edge/Chrome version.

## [1.1.1] - 2026-09-09
### Added
- **Support Link:** Added a Ko-fi button to the settings page, including a new icon asset.
- **New Localizations:** Added Spanish (es), French (fr), Italian (it), Brazilian Portuguese (pt_BR), Simplified Chinese (zh_CN), and Russian (ru).

### Changed
- **Update Notice:** The auto-opened changelog tab now links directly to `CHANGELOG.md` instead of the repository homepage, and only opens on fresh installs or minor/major version updates (not on patch releases).

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
- Initial fork of the abandoned Firefox add-on *Zoom Image* (v2.7.1) originally created by Amu.
- Re-released under the Mozilla Public License 2.0 (MPL-2.0).
- Replaced outdated PNG raster icons with scalable SVG graphics.
- **Localization:** Added German (de) locale.

### Changed
- **Manifest V3:** Migrated the extension structure to Manifest V3.
- **Vanilla JS Rewrite:** Removed the legacy jQuery (3.1.1) dependency entirely in favor of native JavaScript.
- **Memory Management:** Refactored DOM element tracking using modern `WeakMap` implementation to attach metadata efficiently.