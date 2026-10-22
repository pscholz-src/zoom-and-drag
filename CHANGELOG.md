# Changelog

All notable changes to this project will be documented in this file.

## [2.1.1] - 2026-10-22
### Improved
- **YouTube thumbnails:** Thumbnails in YouTube search results and the sidebar can now be zoomed, rotated and adjusted right away, using shortcuts, mouse gestures or the panel. The hover preview (animated image or video) is disabled for as long as the thumbnail is modified and no longer restarts.
- **Panel keyboard isolation:** Keyboard events and focus inside the panel are now isolated from host page scripts, so they can no longer intercept panel inputs.
- **Higher limits for panel input fields:** Number input fields in the custom panel now allow sizes up to 16,384 px on the longer side (matching the maximum canvas export limit), independent of the zoom value. The maximum zoom adapts to the image accordingly and entering a higher value snaps the field to it. The same limit applies to mouse wheel zoom and quick zoom. Slider ranges remain untouched to preserve comfortable and precise mouse control.
- **Export notices & CORS error handling:** In addition to notifying users when an image is downscaled to fit export limits, the panel now provides a distinct error message when a CORS-restricted image exceeds the background fallback download limit.
- **Code cleanup:** Zoom badge styling consolidated, unused code removed, duplicated reset and cleanup logic merged into shared helpers, and stored state of removed floating images is now released.
- **Performance:** Lower CPU usage with the panel open and faster image detection on large pages.
- **Context menu zoom badge:** Applying transformations via the context menu now temporarily displays the HUD zoom percentage badge when the feature is enabled.
- **Real-time badge alignment:** Eliminated badge position jumping when using "Zoom to cursor" or toggling between layout and actual size; the badge now positions itself instantly on the animated target frame.
- **Generic modal overlay detection:** Enhanced backdrop and gallery recognition so that full-screen popups, media lightboxes, and video players are reliably detected, regardless of how a website is coded.
- **Panel slider handles (Chrome/Edge):** The slider handles in the panel are now slightly larger and easier to grab. Firefox keeps its native sliders.

### Changed
- **Panel text selection:** All panel buttons (reset, save, close, flip horizontal/vertical, and the small reset icons) can no longer be text-selected, consistent with the panel header and zoom badge.
- **Zoom badge on right click:** A plain right click that only opens the context menu no longer flashes the zoom badge. It now appears after the right button has been held for 1 second without changing the image. Zooming, rotating and keyboard shortcuts still show it immediately.
- **Zoom badge option wording:** Updated the settings label for the zoom badge to explicitly state that both the zoom percentage and rotation angle are displayed on the image.
- **Typing conflict with image shortcuts:** Image shortcuts and arrow-key panning are now ignored while typing in active input fields or text areas, even if the mouse pointer hovers over an image.

### Fixed
- **Modifier clicks:** Fixed modifier clicks (Ctrl, Shift, Alt, Meta) and middle-clicks failing on containers where images and headline links are siblings using stretched link overlays, and on modified video poster images (inline as well as on the container area left behind by a floating poster), so the video starts as it would without the extension.
- **Fit to window on inline images:** Fixed an issue where fitting an inline image to the window (key 0, right+middle click, or context menu) placed it offset from the window center, shifted up or down depending on where the image sat on the page.
- **Right+middle click on linked images:** Fixed an issue where right+middle click ("Fit to window") also opened the image link, or, on containers with stretched link overlays, opened the link without fitting the image at all. The gesture is now handled reliably regardless of the event target or the order in which the buttons are released.
- **Sub-pixel aspect ratio precision:** Fixed an issue where minor aspect ratio discrepancies (below the previous 1% tolerance threshold) on images caused tiny 1–2 pixel gaps between the image edge and the floating or panel border. Aspect ratios are now calculated with sub-pixel precision.
- **Panel inline frame visibility on mode transition:** Fixed an issue where transitioning from floating zoom back to inline mode unintentionally displayed the blue panel selection frame. The inline indicator now strictly appears when hovering over or focusing the adjustment panel, and upon panel-triggered image activation.
- **Modifier keys and live settings changes:** Releasing an unrelated key while holding Ctrl or Alt no longer resets the modifier state, and excluding a site (or switching off related options) while a page is open now also closes the panel and stops all remaining background timers.
- **Localization:** Corrected the English label of the "Revert images when releasing the right click" option.
- **Badge flash on reset actions:** Fixed unwanted badge flashes during reset operations. The badge no longer appears when resetting images via right-click + left-click, panel mini-reset buttons, `Esc`, `Shift`+`Esc`, or releasing the right mouse button in auto-reset mode.
- **Gesture reliability on Bing Images:** Resolved a conflict preventing right-click + left-click toggling on Bing image search results.
- **Gallery overlays with video:** While a video slide is shown in a gallery or modal overlay, images of the page behind the overlay can no longer be selected, zoomed or opened in the panel.
- **Panel inline frame on rotated images:** Fixed an issue where the blue inline frame did not follow a rotated image while its size changed through a hover transition (e.g. on Bing Images). The frame now stays exactly on the image edge at any rotation angle, including after zooming.
- **Zoom-in shortcut on international keyboards:** Fixed an issue where pressing the equals key (`=`) while holding `Shift` unintentionally triggered zoom-in. This prevents accidental zooming when pressing `Shift`+`0` on German (QWERTZ) keyboards or `Shift`+`-` on Japanese (JIS) layouts, while keeping `+`/`=` zooming fully functional on US/ANSI keyboards.
- **Arrow key conflicts in image overlays:** Pressing arrow keys while a floating image is active now exclusively moves the image instead of simultaneously triggering page or gallery navigation.
- **Stacking order of inline images:** Fixed an issue where modified inline images punched through page headers, search bars, and autocomplete dropdowns. Inline images now use a dynamic, capped stacking range, guaranteeing that the most recently manipulated image stays above adjacent grid tiles while strictly remaining beneath search inputs and navigation overlays.

## [2.1.0] - 2026-10-12
### Added
- **Update Notice:** After a minor or major update, a dismissible banner with a link to this changelog now appears on the settings page, and the toolbar icon shows a badge until the settings are opened. The changelog tab now opens automatically on fresh installs only.
- **CORS Fallback for Image Export:** If the image's server blocks exporting, the extension now retries the download in the background, so many previously blocked images can be saved.
- **Reset Confirmation:** The "Reset" button on the settings page now asks for confirmation before restoring the default settings.
- **Touch & Stylus Support:** Migrated gesture handling from legacy mouse events to universal pointer events and touch events. This greatly improves interactions on touchscreens, trackpads, and with styluses.
- **Image switcher support:** The main image is edited, the hover image stays untouched. The tile link is blocked for plain clicks while the image is modified and works again after reset.
- **License:** Added the full MPL-2.0 license text (`LICENSE`).

### Improved
- **Overlay Image Detection:** Added a fallback during target checks, allowing images hidden behind transparent interaction overlays, anchors, or slider buttons to be zoomed directly.
- **Heuristic Visual Target Scoring:** Implemented an intelligent scoring system in the target-detection engine to reliably identify the primary visible image while filtering out zero-dimension, transparent, or hidden overlay layers.
- **Visual Stability:** Isolated the adjustment panel using Shadow DOM, preventing websites with aggressive styling from breaking the panel's layout.
- **Code Refactoring:** Moved panel components into a dedicated template (`panel.html`) for cleaner architecture and better maintainability.
- **Automatic Reset on Modal & Lightbox Transitions:** The adjustment panel now automatically closes and reverts active transformations whenever the page enters a focus mode.
- **Carousel Focus Loss:** The panel now closes automatically when a slider shifts the active image out of its container.
- **Fullscreen Floating Mode:** Fullscreen images now always float, preventing layout glitches and collapsing text in surrounding articles.
- **Gallery Overlay Exclusion:** Introduced a rule-based whitelist for sites with active modal overlays (e.g., Bing Image Search) to ignore out-of-bounds background images, preventing unintended zooming and shortcut triggers on masked content.
- **DOM Observer Overhead:** The mutation observer for floating images now activates strictly on demand instead of running continuously, reducing idle CPU usage to zero.
- **Gesture Event Performance:** Deduplicated parallel event handlers during active drag and rotation gestures.
- **Topmost Stacking for Dragged & Modified Images:** The most recently manipulated or dragged image is now automatically elevated above all other floating and modified images.
- **Sequential Panel Reset Flow:** Resetting an image via the adjustment panel now immediately shifts active focus and bounding indicators to the next remaining modified image. When all images are reverted, the panel remains focused on the final reset image.
- **Hover Detection Performance:** Image detection under the cursor now runs at most once per frame and skips images that are not under the pointer, reducing CPU load on image-heavy pages.
- **Panel Performance:** An open adjustment panel now performs far fewer style calculations while idle, and its sync loop can no longer run twice in parallel.
- **Settings Loading:** Content scripts now read the settings directly from storage, which saves a message round trip to the background script on every page and frame.
- **Context Menu:** The menu is now created once and only shown or hidden, instead of being rebuilt on every right click.
- **Touchpad Zoom:** Small wheel deltas (e.g. touchpads) now zoom proportionally. Regular mouse wheel steps are unchanged.
- **Image Export Limits:** Very large exports are scaled down to the browser's canvas limits instead of failing, and errors are shown inside the panel instead of a blocking dialog.
- **Accessibility (Reduced Motion):** The extension now respects the system-wide "prefers-reduced-motion" setting. UI animations and transitions (like the panel opening or image resetting) are automatically disabled for users who prefer no animations.
- **Localization & Size Toggle Labels:** Streamlined the wording for the reset/native-size toggle across all locales. This accurately reflects the dual-action toggle behavior (layout size vs. native resolution).

### Changed
- **Zoom Badge Alignment:** Added dynamic Y-offset calculation based on zoom ratio, keeping the badge above the upper edge when downscaling below 100%.
- **Minimum Image Size Limit:** Replaced the relative 5% threshold with a strict absolute minimum width of **20 px**. High-resolution images can now be zoomed out much further while ensuring the element always remains visible and clickable.
- **Modifier Clicks Open Links:** Clicks with `Ctrl`, `Shift`, `Alt` or `Meta` as well as middle clicks are no longer blocked on modified images, so links can still be opened in a new tab or window. Plain clicks stay blocked until the image is reset. This now applies consistently to inline images, floating images and image switchers.
- **Revert on Right-Click Release:** The "Revert images when releasing the right click" option now also works while the adjustment panel is open, and only reverts images that were actually changed by the right click. Plain right clicks no longer reset images modified by shortcuts, dragging or the panel.

### Fixed
- **Panel Zoom Integration:** Preserved native `Ctrl` zoom and value readouts when the panel is open, deferring floating mode until panel controls are adjusted.
- **Image Container Lock:** Inactivated original image containers from badge and zoom triggers until the active floating copy is reset.
- **Off-Image Re-Zoom Prevention:** Prevented re-triggering right-click + wheel floating zoom when the cursor is positioned outside the active image boundaries.
- **Quick Zoom Persistence:** Prevented unexpected timeout of quick zoom activity.
- **Quick Zoom Floating Fix:** Prevented Quick Zoom from breaking page layouts on sites with forced inline styles.
- **Panel Inline Frame:** Corrected bounding and rendering behavior for the custom panel's inline frame.
- **Hovered Target Priority:** Hovered images now consistently take precedence over open panel selections.
- **Shortcut Target Recognition:** Fixed shortcuts failing on images inside interactive elements (e.g. gallery buttons).
- **Seamless transition in single image view:** The add-on now perfectly harmonizes with the browser's native zoom (zoom-in / zoom-out).
- **Modal Image Gestures:** Improved gesture recognition and rotation precision when interacting with images inside complex gallery sliders and lightbox components.
- **Aspect Ratio Zoom Drift:** Fixed inaccurate scale multipliers and badge percentages on images with non-native CSS aspect ratios. Preset actions like "Size x 2.0" and "Size x 0.5" now reliably reach exact target sizes (200% / 50%).
- **Single Image View Scroll Restoration:** When resetting an image in the single-image view, the extension now reliably remembers and restores your exact previous scroll position.
- **Inline Click Shield:** Prevented native website actions (e.g., galleries) from triggering on modified images by reliably blocking clicks through invisible overlays.
- **Accurate Target Selection in Stacked Containers:** Prevented target detection from latching onto underlying low-resolution thumbnails or invisible search overlays instead of the primary rendered image.
- **Multi-Image Containers:** Tiles that combine several images (e.g. one large and two small images in Bing Image Search) now block their link as long as any of their images is modified, no matter which of the images was changed or clicked.

## [2.0.1] - 2026-09-24
### Fixed
- **Revert images when releasing the right click:** Improved functionality with automatically reverting and releasing images when the right mouse button is released.
- **Single image view:** Fixed edge cases in the single image view (controlling mouse wheel zoom behavior and ensuring stable resets via the custom panel).
- **Dragging:** Optimized image dragging mechanics to prevent unwanted layout jumps.
- **Image frame:** The blue selection and quick zoom frames now align precisely with the actual image bounds.
- **Language adjustments:** Minor corrections and additions to localizations.

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