# Changelog

All notable changes to this project will be documented in this file.

## [2.2.0] - 2026-11-08
### Added
- **Invert, grayscale and pixel mode:** Three new toggle buttons in the panel. Invert and grayscale help with dark film scenes, document scans, diagrams or X-ray images. Pixel mode enlarges pixel art, icons, QR codes and text screenshots with sharp, unsmoothed pixels. All three are included in the exported image and are restored by every reset.
- **Image details in the panel header:** The header now shows the original resolution and the current size relative to it (e.g. `1920 × 1080 px · 187 %`), so it is clear at a glance when an image is enlarged beyond its native resolution. Hidden for SVG images and images without a known size.
- **Export format selection:** The save button is now a split button. Its arrow opens a menu to save as PNG, JPEG or WebP, which keeps large photos much smaller. The choice is remembered, and JPEG exports get a white background instead of transparency. The menu is fully keyboard accessible (`↑`/`↓`, `Home`/`End`, `Esc`).
- **Copy to clipboard:** A new entry in the same menu copies the edited image to the clipboard as PNG, ready to paste into chats, documents or image editors. No additional permission is required.
- **Toolbar popup with per-site switch:** Clicking the toolbar icon now opens a popup that shows the current site and its status, a button to disable or enable the extension there, and a link to the settings. On subdomains, the popup asks whether to disable only that subdomain or the whole domain.
- **Disabled-site indicator:** On sites where the extension is disabled, the toolbar icon shows a red badge and an adapted tooltip. The update badge always takes priority, and it is now also shown next to the settings link in the popup until the settings have been opened.
- **Larger image versions in floating zoom (opt-in):** New setting, off by default. When an image is enlarged beyond its own resolution in floating mode, the extension can load a larger version provided by the page, via attributes such as `data-orig-file` or `data-original`, or via a link to an image file. The larger file is requested only while zooming in floating mode (never on hover), is used only if it is bigger and has the same aspect ratio, and replaces the original only after it has loaded and been decoded. The export uses it too and falls back to the displayed image if the larger file cannot be exported.
- **Pin image to screen:** A floating image can now be pinned so it stays fixed in the window while the page scrolls. Toggle it with the new pin button in the panel (shown in red while active) or with the `F` key while hovering an image. Pinned images get a red frame, can still be dragged, and always keep a small part within the window, even after resizing it. Unpinning leaves the image floating at its current position, and every reset also removes the pin.
- **Unpin all images shortcut:** Pressing `Shift` + `F` now unpins all currently pinned images across the page at once.
- **Frame colors:** The frame around zoomed images (hover and open panel) and the frame around pinned images can now be set in the options, with a live preview, an "Off" switch and a reset button for each. The pressed pin button in the panel follows the chosen pin color immediately.
- **Wildcards in the exclusion list:** The list of disabled domains now supports the `*` wildcard, e.g. `example.*` for all domain endings or `shop*.example.com`. Like plain entries, a pattern also covers subdomains. `*.example.com` behaves exactly like `example.com`, and entries made up only of wildcards are ignored.

### Improved
- **Safer CORS fallback for image export:** The background download accepts only `http(s)` URLs without embedded credentials, refuses local and private network targets (unless the page itself is local), discards responses redirected to such targets and checks the file size before downloading. Cookies are sent only for the page's own image, and for larger versions only on the page's own origin.
- **Code structure:** Domain rules and URL checks now live in a shared helper (`shared-utils.js`), and saving and copying share one render function.
- **Keyboard shortcuts help:** The "Enable keyboard shortcuts" option now has a help icon that lists all shortcuts (zoom, move, fit to window, rotate, panel, pin, reset). The help icons can also be opened with the keyboard.
- **Carousel, lightbox and Shadow DOM persistence:** When browsing image sliders, modal galleries or Shadow DOM carousels (e.g. on MSN), the adjustment panel now follows the slide: after a slide change it automatically switches to the newly visible image and stays open as long as a valid target exists. Resetting, fitting or unpinning an image in a gallery no longer closes the panel either; it moves on to the image currently shown. Floating images stay active even if the website rotates or detaches the underlying slide in the background. A short grace period bridges slide animations, and URL changes while paging through a gallery no longer close the panel. Recognizes ARIA carousels, Swiper and Slick sliders, including slides inside Shadow DOM, and slides showing a `<canvas>`. The panel also stays open when a website rebuilds its slider while paging.
- **Background image restoration:** Elements utilizing CSS background images now track and revert visibility and styling uniformly alongside regular image elements.
- **Video poster and background image detection:** Enhanced support for video thumbnails, posters, and background-image containers. Natural dimensions are now probed in the background, allowing the adjustment panel to display resolution details immediately on open and enabling direct shortcut interactions even when the global background-image option is disabled. In sliders, the panel also follows poster and thumbnail backgrounds on the active slide; with the option enabled, any background image of at least 40 px.
- **Shortcuts with input methods:** The keyboard shortcuts now also work while a Korean, Japanese or Chinese input method is active, including full-width input modes. The zoom, fit and rotate keys are recognized by their physical key where the input method reports something else than the plain character, without affecting other keyboard layouts.
- **Lightbox and overlay detection:** Image lightboxes of additional site frameworks are now recognized as media containers. A modal dialog only blocks an image if it is actually in front of it; hidden, inert or non-interactive dialogs are ignored.
- **Localization:** New interface texts.

### Changed
- **Toolbar icon:** A click now opens the popup instead of the settings page directly. The settings are one click away via the popup.
- **Domain exclusion rules:** A rule for `www.example.com` now also covers `example.com` (but still not other subdomains such as `blog.example.com`). A rule for `example.com` continues to cover all subdomains. Entries with a port number (e.g. `example.com:8080`) now match by host.
- **Panel messages:** Messages now stay visible for 8 seconds instead of 6 (the copy confirmation for 2.5 seconds). The glow around the image frame while hovering the panel is slightly more subtle.
- **Single-image and fullscreen base size:** Natively zoomed single images and fullscreen images now scale directly from their currently displayed size rather than resetting to window size first, and no longer resize when hovering the panel.

### Fixed
- **Frame colors on filtered images:** The blue frame and shadow of floating images no longer take on the image's filters.
- **Reliable container and reset cleanup:** Fixed issues where resetting images or removing them from sliders left behind stale panel states and inactive click locks, ensuring parent links remain clickable and state is fully purged. Edits on an inline slide are now also released when the slider moves the slide away or swaps its image.
- **Actual-size toggle on unmodified images and backgrounds:** Fixed an issue where resetting or toggling to actual/natural size (`sizeFit` / right+left click) failed on untouched background images and still-loading image elements. Background posters now expand to their full native resolution directly from their initial state, and images smaller than their layout container reliably transition to floating mode.
- **Frame after dragging:** The frame around a dragged floating or pinned image no longer stays highlighted after the drag ends while the panel is open.
- **Shortcuts on non-Latin keyboard layouts:** Fixed the letter shortcuts (`R`, `L`, `P`, `F`) not working while a non-Latin layout such as Russian is active. They now follow the physical key.
- **Animation conflicts:** Resolved a bug where global CSS transitions on certain websites interfered with the extension. Dragging and scaling images via the panel now works instantly without rubber-band delays.
- **Original filters and opacity:** Images with an existing filter (e.g. blur) or reduced opacity keep that look when opacity or brightness is adjusted in the panel, and every reset now restores it instead of removing it. This also applies to filters and opacity set through CSS classes. Exported images include the original filter and opacity as well.
- **Image export and resizing for cropped images:** Images displayed with CSS cropping (e.g. fixed-ratio galleries) are no longer exported with distortion or unwanted crops. The export now precisely matches what is visible on screen, including position and framing. When an image is brought to its natural/original size, both the floating frame and the saved image now reliably preserve the true uncropped aspect ratio. Also applies to background images.
- **Video overlays and carousels:** Fixed conflicts with vertical video feeds and media overlays, preventing videos from appearing blank or being incorrectly hidden when opened after inline image modifications.
- **Image saving on Single-Page Applications:** Fixed an issue where clicking "Save" caused framework routers to intercept the download click and navigate to a 404 page.
- **Adjustment panel stability:** Fixed the panel unexpectedly closing when editing or floating images on pages with hidden side menus or dormant modal dialogs (such as news outlets using Angular SPAs).
- **Fullscreen, Swiper zoom, and native-zoom sync:** Switching an image between fit and zoomed-in or fullscreen mode (including zoomed Swiper slides and CSS-scaled images) now updates the open panel's width and zoom values right away, accurately compensates for existing transform scales when resizing inline, and prevents mouse wheel events from accidentally closing fullscreen overlays.
- **Panel sliders in modal dialogs:** Focus traps in modal overlays and lightboxes no longer interrupt dragging the panel sliders.
- **Stacking order in high-z-index modals:** Floating images and the panel frame now appear above overlays that use the maximum `z-index` without covering the panel or zoom badge.
- **Attribute-based image switchers with open panel:** The adjustment panel no longer closes automatically when an image switcher swaps `src` values stored in `data-src*` attributes on the same `<img>` element.
- **Images under transparent layers:** Fixed the panel not opening, and shortcuts and mouse wheel zoom not working, on images with a fully transparent image layer on top (e.g. in the Bing Images viewer).
- **Middle-click and link pass-through:** A plain middle-click no longer triggers "Fit to window" without the right mouse button held (except in the enhanced single-image view), restoring native browser autoscroll on floating images and reliably opening links in a new tab on modified inline images and their containers without triggering autoscroll. Link pass-through now also works for images and containers inside Shadow DOM.
- **Single-image view live activation:** Fixed a duplicate image appearing when enabling the single-image view option while a standalone image is already floating.

## [2.1.1] - 2026-10-22
### Improved
- **YouTube thumbnails:** Thumbnails in YouTube search results and the sidebar can now be zoomed, rotated and adjusted right away, using shortcuts, mouse gestures or the panel. The hover preview (animated image or video) is disabled for as long as the thumbnail is modified and no longer restarts.
- **Panel keyboard isolation:** Keyboard events and focus inside the panel are now isolated from host page scripts, so they can no longer intercept panel inputs.
- **Higher limits for panel input fields:** Number input fields in the custom panel now allow sizes up to 16,384 px on the longer side (matching the maximum canvas export limit), independent of the zoom value. The maximum zoom adapts to the image accordingly and entering a higher value snaps the field to it. The same limit applies to mouse wheel zoom and quick zoom. Slider ranges remain untouched to preserve comfortable and precise mouse control.
- **Export notices and CORS error handling:** In addition to notifying users when an image is downscaled to fit export limits, the panel now provides a distinct error message when a CORS-restricted image exceeds the background fallback download limit.
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
- **Update notice:** After a minor or major update, a dismissible banner with a link to this changelog now appears on the settings page, and the toolbar icon shows a badge until the settings are opened. The changelog tab now opens automatically on fresh installs only.
- **CORS fallback for image export:** If the image's server blocks exporting, the extension now retries the download in the background, so many previously blocked images can be saved.
- **Reset confirmation:** The "Reset" button on the settings page now asks for confirmation before restoring the default settings.
- **Touch and stylus support:** Migrated gesture handling from legacy mouse events to universal pointer events and touch events. This greatly improves interactions on touchscreens, trackpads, and with styluses.
- **Image switcher support:** The main image is edited, the hover image stays untouched. The tile link is blocked for plain clicks while the image is modified and works again after reset.
- **License:** Added the full MPL-2.0 license text (`LICENSE`).

### Improved
- **Overlay image detection:** Added a fallback during target checks, allowing images hidden behind transparent interaction overlays, anchors, or slider buttons to be zoomed directly.
- **Heuristic visual target scoring:** Implemented an intelligent scoring system in the target-detection engine to reliably identify the primary visible image while filtering out zero-dimension, transparent, or hidden overlay layers.
- **Visual stability:** Isolated the adjustment panel using Shadow DOM, preventing websites with aggressive styling from breaking the panel's layout.
- **Code refactoring:** Moved panel components into a dedicated template (`panel.html`) for cleaner architecture and better maintainability.
- **Automatic reset on modal and lightbox transitions:** The adjustment panel now automatically closes and reverts active transformations whenever the page enters a focus mode.
- **Carousel focus loss:** The panel now closes automatically when a slider shifts the active image out of its container.
- **Fullscreen floating mode:** Fullscreen images now always float, preventing layout glitches and collapsing text in surrounding articles.
- **Gallery overlay exclusion:** Introduced a rule-based whitelist for sites with active modal overlays (e.g., Bing Image Search) to ignore out-of-bounds background images, preventing unintended zooming and shortcut triggers on masked content.
- **DOM observer overhead:** The mutation observer for floating images now activates strictly on demand instead of running continuously, reducing idle CPU usage to zero.
- **Gesture event performance:** Deduplicated parallel event handlers during active drag and rotation gestures.
- **Topmost stacking for dragged and modified images:** The most recently manipulated or dragged image is now automatically elevated above all other floating and modified images.
- **Sequential panel reset flow:** Resetting an image via the adjustment panel now immediately shifts active focus and bounding indicators to the next remaining modified image. When all images are reverted, the panel remains focused on the final reset image.
- **Hover detection performance:** Image detection under the cursor now runs at most once per frame and skips images that are not under the pointer, reducing CPU load on image-heavy pages.
- **Panel performance:** An open adjustment panel now performs far fewer style calculations while idle, and its sync loop can no longer run twice in parallel.
- **Settings loading:** Content scripts now read the settings directly from storage, which saves a message round trip to the background script on every page and frame.
- **Context menu:** The menu is now created once and only shown or hidden, instead of being rebuilt on every right click.
- **Touchpad zoom:** Small wheel deltas (e.g. touchpads) now zoom proportionally. Regular mouse wheel steps are unchanged.
- **Image export limits:** Very large exports are scaled down to the browser's canvas limits instead of failing, and errors are shown inside the panel instead of a blocking dialog.
- **Accessibility (reduced motion):** The extension now respects the system-wide "prefers-reduced-motion" setting. UI animations and transitions (like the panel opening or image resetting) are automatically disabled for users who prefer no animations.
- **Localization and size toggle labels:** Streamlined the wording for the reset/native-size toggle across all locales. This accurately reflects the dual-action toggle behavior (layout size vs. native resolution).

### Changed
- **Zoom badge alignment:** Added dynamic Y-offset calculation based on zoom ratio, keeping the badge above the upper edge when downscaling below 100%.
- **Minimum image size limit:** Replaced the relative 5% threshold with a strict absolute minimum width of **20 px**. High-resolution images can now be zoomed out much further while ensuring the element always remains visible and clickable.
- **Modifier clicks open links:** Clicks with `Ctrl`, `Shift`, `Alt` or `Meta` as well as middle clicks are no longer blocked on modified images, so links can still be opened in a new tab or window. Plain clicks stay blocked until the image is reset. This now applies consistently to inline images, floating images and image switchers.
- **Revert on right-click release:** The "Revert images when releasing the right click" option now also works while the adjustment panel is open, and only reverts images that were actually changed by the right click. Plain right clicks no longer reset images modified by shortcuts, dragging or the panel.

### Fixed
- **Panel zoom integration:** Preserved native `Ctrl` zoom and value readouts when the panel is open, deferring floating mode until panel controls are adjusted.
- **Image container lock:** Inactivated original image containers from badge and zoom triggers until the active floating copy is reset.
- **Off-image re-zoom prevention:** Prevented re-triggering right-click + wheel floating zoom when the cursor is positioned outside the active image boundaries.
- **Quick zoom persistence:** Prevented unexpected timeout of quick zoom activity.
- **Quick zoom floating fix:** Prevented Quick Zoom from breaking page layouts on sites with forced inline styles.
- **Panel inline frame:** Corrected bounding and rendering behavior for the custom panel's inline frame.
- **Hovered target priority:** Hovered images now consistently take precedence over open panel selections.
- **Shortcut target recognition:** Fixed shortcuts failing on images inside interactive elements (e.g. gallery buttons).
- **Seamless transition in single image view:** The add-on now perfectly harmonizes with the browser's native zoom (zoom-in / zoom-out).
- **Modal image gestures:** Improved gesture recognition and rotation precision when interacting with images inside complex gallery sliders and lightbox components.
- **Aspect ratio zoom drift:** Fixed inaccurate scale multipliers and badge percentages on images with non-native CSS aspect ratios. Preset actions like "Size x 2.0" and "Size x 0.5" now reliably reach exact target sizes (200% / 50%).
- **Single image view scroll restoration:** When resetting an image in the single-image view, the extension now reliably remembers and restores your exact previous scroll position.
- **Inline click shield:** Prevented native website actions (e.g., galleries) from triggering on modified images by reliably blocking clicks through invisible overlays.
- **Accurate target selection in stacked containers:** Prevented target detection from latching onto underlying low-resolution thumbnails or invisible search overlays instead of the primary rendered image.
- **Multi-image containers:** Tiles that combine several images (e.g. one large and two small images in Bing Image Search) now block their link as long as any of their images is modified, no matter which of the images was changed or clicked.

## [2.0.1] - 2026-09-24
### Fixed
- **Revert images when releasing the right click:** Improved functionality with automatically reverting and releasing images when the right mouse button is released.
- **Single image view:** Fixed edge cases in the single image view (controlling mouse wheel zoom behavior and ensuring stable resets via the custom panel).
- **Dragging:** Optimized image dragging mechanics to prevent unwanted layout jumps.
- **Image frame:** The blue selection and quick zoom frames now align precisely with the actual image bounds.
- **Language adjustments:** Minor corrections and additions to localizations.

## [2.0.0] - 2026-09-21
### Added
- **Interactive custom panel:** Replaced the basic zoom prompt with a sleek, draggable floating UI offering precise sliders and inputs for Zoom, Width, Rotation, Opacity, and Brightness. Launch it instantly on images using the new `P` keyboard shortcut.
- **Image export:** Save your manipulated images (including applied filters, flips, and rotations) directly as a PNG file. Safely catches and warns about server-side CORS restrictions.
- **Image flipping:** Added horizontal and vertical flip controls within the new custom panel.
- **Zoom to cursor:** New setting to zoom directly towards the current mouse pointer position (Floating mode) rather than just scaling from the center.
- **Quick zoom:** Hold `Ctrl` + `Alt` + `Right Click` + `Left Click` and drag the mouse up or down for a seamless, fast scaling experience.
- **Advanced reset (`Shift` + `Esc`):** Safely restore the original state of all images while keeping the custom panel active for further adjustments.
- **New localizations:** Added Korean (ko) and Turkish (tr). The extension is now fully translated into 11 languages.
- **Dark mode support:** The options page now automatically adapts to your system's native dark theme.

### Changed
- **Options page (Firefox):** The settings page now opens in a dedicated, separate tab for better readability and improved design, rather than an embedded pop-up.
- **Single image view improvements:** Fixed edge cases in the single image view, allowing direct mouse wheel zooming without a right-click and enabling smooth dragging after enlargement.
- **Zoom limits:** Enforced a lower zoom limit capping the minimum size at 5% of the original scale and a minimum width of 20 pixels to prevent images from becoming unrecoverably small.
- **Localization:** Expanded all language files to support the new panel UI, tooltips, buttons, etc.

### Fixed
- **Optimizations and performance:** Delivered significant performance boosts during scaling and rotation, plugged memory leaks, and applied various under-the-hood bugfixes.
- **Aggressive CSS overrides:** Fixed issues where zooming out was blocked by website stylesheets (e.g., on real estate or gallery sites).
- **DOM reset reliability:** Completely overhauled the style reset logic. Hard flags are now thoroughly purged in a two-step process, guaranteeing images return to their exact original state without layout artifacts.

## [1.1.2] - 2026-09-09
### Fixed
- **Options page:** Minor adjustment relevant only to the Edge/Chrome version.

## [1.1.1] - 2026-09-09
### Added
- **Support link:** Added a Ko-fi button to the settings page, including a new icon asset.
- **New localizations:** Added Spanish (es), French (fr), Italian (it), Brazilian Portuguese (pt_BR), Simplified Chinese (zh_CN), and Russian (ru).

### Changed
- **Update notice:** The auto-opened changelog tab now links directly to `CHANGELOG.md` instead of the repository homepage, and only opens on fresh installs or minor/major version updates (not on patch releases).

## [1.1.0] - 2026-09-07
### Added
- **Keyboard shortcuts:** Support for zooming (`+`/`-`), moving (Arrow keys), resetting (`0` / `Esc`), and rotating (`R`/`L`).
- **HUD zoom badge:** Modern floating glassmorphism badge displaying the current zoom ratio and rotation angle.
- **Custom zoom:** Added an option to the context menu to enter a specific zoom percentage via a prompt dialog.
- **Domain exclusion:** New settings option to disable the extension on specific websites (e.g., maps, design tools).
- **Chromium support:** Fully compatible with Google Chrome and Microsoft Edge using a Manifest V3 Service Worker.
- **State cleanup:** Spotless DOM state purge when the extension is disabled on a page.

### Changed
- **Freehand rotation:** Upgraded rotation mechanics to use vector-based math for smooth, interactive mouse rotation.
- **Settings UI:** Overhauled the options page with a modular architecture and automatic localized strings (i18n).

### Fixed
- **Accidental clicks:** Prevented unintended link clicks or image opening immediately after dragging or freehand rotation.
- **DOM artifacts:** Fixed an issue where the extension left CSS or hidden elements behind when resetting an image.
- **Context menu errors:** Improved menu creation logic to prevent duplicate ID errors in the background script.

## [1.0.1] - Initial Fork & Modernization
### Added
- Initial fork of the abandoned Firefox add-on *Zoom Image* (v2.7.1) originally created by Amu.
- Re-released under the Mozilla Public License 2.0 (MPL-2.0).
- Replaced outdated PNG raster icons with scalable SVG graphics.
- **Localization:** Added German (de) locale.

### Changed
- **Manifest V3:** Migrated the extension structure to Manifest V3.
- **Vanilla JS rewrite:** Removed the legacy jQuery (3.1.1) dependency entirely in favor of native JavaScript.
- **Memory management:** Refactored DOM element tracking using modern `WeakMap` implementation to attach metadata efficiently.