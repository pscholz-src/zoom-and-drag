/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Original work Copyright (c) Amu (http://crossblade.her.jp/)
 * Modified work Copyright (c) 2026 pscholz
 *
 * Project:    Zoom & Drag
 * Repository: https://github.com/pscholz-src/zoom-and-drag
 */

globalThis.browser = globalThis.browser || globalThis.chrome;

const _logOutput = location.href.includes("zoomdraglog=1");

function d(t, v, level = "debug") {
	if (!_logOutput) return;
	const msg = `[ZoomDrag] ${t}: ${v}`;
	if (level === "warn") console.warn(msg);
	else if (level === "error") console.error(msg);
	else console.debug(msg);
}

d("Log Start", "==========");

const _uqid = `${Date.now().toString(16)}_`;
const _firstkey = "first";
const _srckey = "source";
const _sizekey = "size";
const _rotkey = "rotate";
const _bgsrckey = "bgsrc";
const _bgsizekey = "bgsize";
const _flipXkey = "flipX";
const _flipYkey = "flipY";
const _pinkey = "pinned";
const _opackey = "opacity";
const _brightkey = "brightness";
const _fxkey = "effects";
const _pixelkey = "pixel";
const _galleryRootkey = "galleryRoot";
const _origRectkey = "origRect";
const _swapSlotkey = "swapSlot";
const _galleryRootSel =
	'[role="dialog"], [aria-modal="true"], dialog[open], [aria-roledescription="carousel"], #fullScreenGallery, #detailPage, #slider.reader-view, .slick-slider, .swiper, swiper-container, .lightbox-inner, cs-responsive-infopane, [data-testid="media-gallery-modal"], [data-testid="cdp-medias-gallery"], [data-testid="TeaserHero.Slider"], .EmbedSidecar, [role="presentation"]:has(> div > ul > li[style*="translateX"])';

const _zdPanelId = "zd-custom-panel";
const _zdExImgId = `zdImg_${_uqid}floatImgWraper`;
const _zdImgCls = "zdImgCls_b6ig4jvwe";
const _draggedCls = "zdImgCls_dragged";
const _imgSrcViewCls = "zdImgCls_imgSrcView";
const _imgLinkCls = "zdImgCls_mhdt687po";
const _imgNoLinkCls = "zdImgCls_asntrs58f";
const _zdStateCls = new Set(["zdImgCls_animated", _draggedCls, "zdImgCls_draggingCur"]);
const _floatFrameCls = "zdImgCls_floatFrame";
const _frameExtAttr = "data-zd-frame-ext";
const _pinnedAttr = "data-zd-pinned";
const _hiResAttr = "data-zd-hires";
const _hiResStateAttr = "data-zd-hires-state";

const _rotApplied = new WeakMap();

const RESET_STYLE_PROPS = [
	"left",
	"top",
	"width",
	"height",
	"max-width",
	"max-height",
	"min-width",
	"min-height",
	"transform-origin",
	"object-fit",
	"background-image",
	"background-size",
	"background-position",
	"background-repeat",
	"cursor",
	"flex-shrink",
	"contain",
	"margin",
	"justify-self",
	"align-self",
	"rotate",
	"scale"
];

const _zdExImgBaseZ = 2147483640;
const _zdMaxZ = 2147483647;
const _pinGrip = 48;
const _useFloatFrameOverlay = true;
const _toastDurationMs = 8000;
const _gallerySwitchGraceMs = 700;
const _gallerySwitchGraceStaleFactor = 2;
const _transitionResumeMs = 250;
const _galleryViewRatio = 0.45;
const _galleryResizeRatio = 0.15;
const _openGalleryCacheMs = 100;
const _largestImageMinWidth = 120;
const _largestImageMinHeight = 80;
const _toastSuccessDurationMs = 2500;
const _zdBadgeHoldDelay = 1000;
const _hoverThrottleMs = 100;

const _maxExportSide = 16384;
const _maxExportPixels = 100000000;
const _exportFormats = {
	png: { mime: "image/png", ext: "png" },
	jpeg: { mime: "image/jpeg", ext: "jpg" },
	webp: { mime: "image/webp", ext: "webp" }
};
const _fetchErrTooLarge = "image-too-large";
const _hiResDataAttrs = [
	"data-orig-file",
	"data-large-file",
	"data-full-url",
	"data-zoom-image",
	"data-large_image",
	"data-hires",
	"data-original"
];
const _hiResLazyAttrs = ["data-src", "data-lazy-src"];

const _frameColorDefault = "#3575dd";
const _pinColorDefault = "#d93025";
const _floatIdleShadow = "0px 0px 4px 0px #666666";
const _noFrameVisual = { outline: "none", shadow: "none" };
const _noFrameVisuals = { idle: _noFrameVisual, hover: _noFrameVisual, panel: _noFrameVisual };

function buildFrameVisuals(color, idleShadow) {
	return {
		idle: { outline: "none", shadow: idleShadow },
		hover: { outline: "none", shadow: `0px 0px 4px 1px ${color}` },
		panel: {
			outline: `2px solid ${ZDShared.hexToRgba(color, 0.5)}`,
			shadow: `0 0 10px ${ZDShared.hexToRgba(color, 0.4)}`
		}
	};
}

let _zoom_dim = 10;
let _zoom_rotd = 15;
let _zoom_rcCancel = 3000;
let _zoom_reverse = false;
let _zoom_bgImg = false;
let _zoom_autoRtn = false;
let _zoom_ctrlRvs = false;
let _zoom_enableCxt = true;
let _zoom_ivpDrag = false;
let _zoom_clickSwap = false;
let _zoom_showZoomBadge = true;
let _zoom_enableKeyShortcuts = true;
let _zoom_frameColor = "#3575dd";
let _zoom_pinColor = "#d93025";
let _zoom_frameOff = false;
let _zoom_pinFrameOff = false;
let _zoom_trackCursor = true;
let _zoom_hiResUpgrade = false;
let _zoom_excludedDomains = "";
let _isExcludedHost = false;
let _topHost = "";

let _endInit = false;
let _settingsLoaded = false;
let _img_element = null;
let _current_element = null;
let _ctx_show = true;
const _accKeyState = { ctrl: false, alt: false };
let _dragParam = null;
let _draggingCnt = 0;
let _rotParam = null;
let _zoomParam = null;
let _cancelNextClick = false;
let _midChord = false;
let _clickFunc = null;
let _mdownFunc = null;
let _rclickTimer = null;
let _rightBtnDown = false;
let _rclickHoldTimer = null;
let _singleImgPage = false;
let _lastResetElement = null;
let _savedScrollPos = null;
let _zIndexCounter = 10;

let _hoverTarget = null;
let _lastMouseX = 0;
let _lastMouseY = 0;
let _hoverTimer = 0;
let _hoverEventData = null;
let _blockWheelZoom = false;
let _blockNextEscKeyup = false;

let _panelShadow = null;
let _panelCleanup = null;
let _panelHover = false;
let _panelTemplate = null;
let _previewLeaveTarget = null;
let _previewNavGuardTimer = null;
let _previewNavGuardUrl = "";
let _floatFrameVisuals = buildFrameVisuals(_frameColorDefault, _floatIdleShadow);
let _pinFrameVisuals = buildFrameVisuals(_pinColorDefault, `0px 0px 4px 0px ${_pinColorDefault}`);
let _floatFrameObserver = null;
let _floatFrameObserved = null;
let _floatingMutationObserver = null;
let _exImgCheckRafId = 0;
let _pinResizeRaf = 0;

let _zdSuppressBadge = false;
let _badgeHoldTimer = null;
let _badgeTimer = null;
let _swTimer = null;
let _lastFocusAttempt = 0;

const _floatFrames = new Map();
const elementDataMap = new WeakMap();
const _modifiedElements = new Set();
const _rcModifiedEls = new WeakSet();
const _attachedElements = new WeakSet();
const _lockedSrcMap = new WeakMap();

function getPanelHost() {
	return document.getElementById(_zdPanelId);
}

function getPanelShadow() {
	const host = getPanelHost();
	return host && _panelShadow && _panelShadow.host === host ? _panelShadow : null;
}

function panelHasFocus() {
	const shadow = getPanelShadow();
	return Boolean(shadow && shadow.activeElement);
}

function isPanelHovered() {
	const panel = getPanelHost();
	return Boolean(panel && (_panelHover || panel.matches(":hover")));
}

function destroyPanel() {
	const panel = getPanelHost();
	if (!panel) return false;
	_handOffWait.orig = null;
	if (_panelCleanup) _panelCleanup();
	panel.remove();
	removePanelBorder();
	return true;
}

const BORDER_PROPS = ["outline-width", "outline-style", "outline-color", "outline-offset", "box-shadow"];
const _borderSaved = new WeakMap();

function isOwnBorderTarget(el) {
	return (
		el.id === "zd-panel-frame" ||
		Boolean(getElData(el, _srckey)) ||
		el.classList.contains(_zdImgCls) ||
		el.classList.contains(_imgSrcViewCls)
	);
}

function rememberInlineBorder(el) {
	if (!el || _borderSaved.has(el)) return;
	const entries = BORDER_PROPS.map((prop) => ({
		prop,
		value: el.style.getPropertyValue(prop),
		priority: el.style.getPropertyPriority(prop)
	})).filter((entry) => entry.value);
	_borderSaved.set(el, entries);
}

function suppressInlineBorder(el) {
	if (!el) return;
	rememberInlineBorder(el);
	el.style.setProperty("outline", "none", "important");
	el.style.setProperty("box-shadow", "none", "important");
}

function clearBorderStyles(el) {
	if (!el) return;

	if (isOwnBorderTarget(el)) {
		el.style.removeProperty("outline");
		el.style.removeProperty("outline-offset");
		el.style.removeProperty("box-shadow");
	} else if (_borderSaved.has(el)) {
		const entries = _borderSaved.get(el);
		_borderSaved.delete(el);
		el.style.removeProperty("outline");
		el.style.removeProperty("outline-offset");
		el.style.removeProperty("box-shadow");
		for (const { prop, value, priority } of entries) {
			el.style.setProperty(prop, value, priority);
		}
	}

	const floatRec = _floatFrames.get(el);
	if (floatRec) {
		floatRec.panel = false;
		refreshFloatFrameVisual(el);
	}
}

let _resetBatch = null;

function flushResetBatch() {
	const batch = _resetBatch;
	_resetBatch = null;
	if (!batch || !batch.length) return;
	document.documentElement.getBoundingClientRect();
	for (const { el, savedTrans } of batch) {
		if (savedTrans !== null) restoreInlineTransition(el, savedTrans);
		else releaseTransitionLock(el);
	}
}

function resetInlineStyles(el, origStyle = null, includeTransformAndZ = false) {
	if (!el) return;
	const suppressTrans = !el.classList.contains("zdImgCls_animated") && el.isConnected;
	const savedTrans =
		suppressTrans && !_transSuspended.has(el) && !isZdTransitionLock(el) ? captureInlineTransition(el) : null;
	if (suppressTrans) {
		el.style.setProperty("transition", "none", "important");
	}
	for (const prop of RESET_STYLE_PROPS) {
		if (prop === "background-image" && !origStyle) continue;
		el.style.removeProperty(prop);
	}
	_rotApplied.delete(el);
	if (includeTransformAndZ) {
		el.style.removeProperty("transform");
		el.style.removeProperty("z-index");
		el.style.removeProperty("object-position");
	}
	if (origStyle) {
		el.style.left = origStyle.left;
		el.style.top = origStyle.top;
		el.style.width = origStyle.width;
		el.style.height = origStyle.height;
		el.style.maxWidth = origStyle.maxWidth;
		el.style.maxHeight = origStyle.maxHeight;
		el.style.minWidth = origStyle.minWidth || "";
		el.style.minHeight = origStyle.minHeight || "";
		el.style.marginTop = origStyle.marginTop || "";
		el.style.marginRight = origStyle.marginRight || "";
		el.style.marginBottom = origStyle.marginBottom || "";
		el.style.marginLeft = origStyle.marginLeft || "";
		el.style.justifySelf = origStyle.justifySelf || "";
		el.style.alignSelf = origStyle.alignSelf || "";
		el.style.transformOrigin = origStyle.transformOrigin || "";
		el.style.objectFit = origStyle.objectFit || "";

		if (origStyle.backgroundImage !== undefined) {
			el.style.backgroundImage = origStyle.backgroundImage;
		}
		if (origStyle.backgroundSize !== undefined) {
			el.style.backgroundSize = origStyle.backgroundSize;
		}
		if (origStyle.backgroundPosition) {
			el.style.backgroundPosition = origStyle.backgroundPosition;
		} else {
			if (origStyle.backgroundPositionX !== undefined) {
				el.style.backgroundPositionX = origStyle.backgroundPositionX;
			}
			if (origStyle.backgroundPositionY !== undefined) {
				el.style.backgroundPositionY = origStyle.backgroundPositionY;
			}
		}
		if (origStyle.backgroundRepeat !== undefined) {
			el.style.backgroundRepeat = origStyle.backgroundRepeat;
		}
		if (includeTransformAndZ) {
			let origTransform = origStyle.transform;
			if (
				origTransform &&
				/\bscale\((?!1\b)/.test(origTransform) &&
				el.closest?.(".swiper-zoom-container") &&
				!el.closest(".swiper-slide-zoomed")
			) {
				origTransform = origTransform.replace(/\bscale\([^)]*\)/g, "scale(1)");
			}
			el.style.transform = origTransform;
			if (origStyle.zIndex !== undefined) {
				el.style.zIndex = origStyle.zIndex;
			}
		}
	}
	if (suppressTrans) {
		if (_resetBatch) {
			_resetBatch.push({ el, savedTrans });
			return;
		}
		el.getBoundingClientRect();
		if (savedTrans !== null) restoreInlineTransition(el, savedTrans);
		else releaseTransitionLock(el);
	} else {
		releaseTransitionLock(el);
	}
}

function restoreElementZIndex(el) {
	if (!el) return;
	const data = getElData(el, _firstkey);
	el.style.removeProperty("z-index");
	if (data?.origStyle?.zIndex !== undefined) {
		el.style.zIndex = data.origStyle.zIndex;
	}
}

function shouldUseFloating(el) {
	if (!el) return false;
	const tag = el.tagName ? el.tagName.toUpperCase() : "";
	if (tag === "CANVAS") return false;
	const origElem = getElData(el, _srckey) || el;
	if (isSvgImageElement(origElem)) return true;
	if (_singleImgPage) return !el.classList.contains(_imgSrcViewCls);
	if (el.classList.contains("fullscreen") || origElem.classList.contains("fullscreen")) return true;
	return _zoom_ctrlRvs ? _accKeyState.ctrl : !_accKeyState.ctrl;
}

const _imeKeyRe = /^Process$|[\u1100-\u11FF\u3000-\u30FF\u3130-\u318F\uAC00-\uD7AF\u4E00-\u9FFF]/;
const _imeCodeKeys = new Map([
	["Digit0", "0"],
	["Numpad0", "0"],
	["NumpadMultiply", "*"],
	["Minus", "-"],
	["Equal", "="]
]);

function getShortcutKey(e) {
	const key = typeof e.key === "string" ? e.key : "";
	if (e.isComposing) return key;
	if (/^[\uFF01-\uFF5E]$/.test(key)) return String.fromCharCode(key.charCodeAt(0) - 0xfee0);
	if (!/^[A-Za-z]$/.test(key) && /^Key[A-Z]$/.test(e.code)) return e.code.slice(3).toLowerCase();

	const imeKey = _imeCodeKeys.get(e.code);
	if (imeKey && _imeKeyRe.test(key) && (!e.shiftKey || e.code === "Equal")) return e.shiftKey ? "+" : imeKey;
	return key;
}

function normalizeRot(deg) {
	let d = deg % 360;
	if (d > 180) d -= 360;
	if (d < -180) d += 360;
	return d;
}

function isZdTransitionLock(el) {
	const prop = "transition-property";
	return el.style.getPropertyValue(prop) === "none" && el.style.getPropertyPriority(prop) === "important";
}

function releaseTransitionLock(el) {
	if (!el) return;
	if (_transSuspended.has(el)) {
		restorePageTransition(el);
		return;
	}
	if (isZdTransitionLock(el)) el.style.removeProperty("transition");
}

const TRANSITION_PROPS = [
	"transition-property",
	"transition-duration",
	"transition-timing-function",
	"transition-delay",
	"transition-behavior"
];

function captureInlineTransition(el) {
	return TRANSITION_PROPS.map((prop) => ({
		prop,
		value: el.style.getPropertyValue(prop),
		priority: el.style.getPropertyPriority(prop)
	})).filter((entry) => entry.value);
}

function restoreInlineTransition(el, entries) {
	el.style.removeProperty("transition");
	for (const { prop, value, priority } of entries) {
		el.style.setProperty(prop, value, priority);
	}
}

const _animCleanTimers = new WeakMap();
const _transSuspended = new WeakMap();

function suspendPageTransition(el) {
	let rec = _transSuspended.get(el);
	if (!rec) {
		rec = {
			entries: captureInlineTransition(el),
			timer: 0
		};
		_transSuspended.set(el, rec);
		el.style.setProperty("transition", "none", "important");
	}
	clearTimeout(rec.timer);
	rec.timer = setTimeout(() => restorePageTransition(el), _transitionResumeMs);
}

function restorePageTransition(el) {
	const rec = _transSuspended.get(el);
	if (!rec) return;
	clearTimeout(rec.timer);
	_transSuspended.delete(el);
	if (!isZdTransitionLock(el)) return;
	restoreInlineTransition(el, rec.entries);
}

function enableAnim(el) {
	if (getPanelHost()) {
		disableAnim(el);
		return;
	}
	if (el) {
		releaseTransitionLock(el);
		if (!el.classList.contains("zdImgCls_animated")) {
			el.classList.add("zdImgCls_animated");
		}
		if (_animCleanTimers.has(el)) {
			clearTimeout(_animCleanTimers.get(el));
		}
		const cleanup = () => {
			if (_animCleanTimers.has(el)) {
				clearTimeout(_animCleanTimers.get(el));
				_animCleanTimers.delete(el);
			}
			el.removeEventListener("transitionend", cleanup);
			el.classList.remove("zdImgCls_animated");
		};
		el.addEventListener("transitionend", cleanup, { once: true });
		_animCleanTimers.set(el, setTimeout(cleanup, 220));
	}
}

function disableAnim(el) {
	if (el) {
		el.classList.remove("zdImgCls_animated");
		if (el.classList.contains(_zdImgCls) || el.classList.contains(_imgSrcViewCls)) {
			el.style.setProperty("transition", "none", "important");
		}
	}
}

const _clickHostSel = "a[href], button, [role='link'], [role='button']";

function sameBounds(r1, r2, tol = 28) {
	return (
		r1.width > 20 &&
		r1.height > 20 &&
		r2.width > 20 &&
		r2.height > 20 &&
		Math.abs(r1.left - r2.left) <= tol &&
		Math.abs(r1.top - r2.top) <= tol &&
		Math.abs(r1.width - r2.width) <= tol &&
		Math.abs(r1.height - r2.height) <= tol
	);
}

function rectsOverlap(r1, r2) {
	if (r1.width <= 10 || r1.height <= 10 || r2.width <= 10 || r2.height <= 10) return false;
	const xOverlap = Math.max(0, Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left));
	const yOverlap = Math.max(0, Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top));
	const overlapArea = xOverlap * yOverlap;
	const minArea = Math.min(r1.width * r1.height, r2.width * r2.height);
	return overlapArea >= minArea * 0.5;
}

function isFullscreenVideo(el) {
	const fs = document.fullscreenElement;
	return Boolean(fs && el && (fs === el || fs.contains(el) || el.contains(fs)));
}

function isVideoInCoveringOverlay(video, refImg) {
	const winW = window.innerWidth || document.documentElement.clientWidth;
	const winH = window.innerHeight || document.documentElement.clientHeight;
	for (let p = composedParent(video); p && p !== document.body && p !== document.documentElement; p = composedParent(p)) {
		if (p.nodeType !== 1) continue;
		if (isOwnElement(p) || composedContains(p, refImg)) return false;
		const cs = window.getComputedStyle(p);
		if (cs.pointerEvents === "none") continue;
		if (cs.position === "fixed" || p.matches?.('[role="dialog"], [aria-modal="true"]')) {
			const r = p.getBoundingClientRect();
			if (r.width >= winW * 0.45 && r.height >= winH * 0.45) return true;
		}
	}
	return false;
}

function isPreviewVideoOverlay(node, refImg) {
	if (!node || node.nodeType !== 1) return false;
	let video = node.tagName === "VIDEO" ? node : node.querySelector ? node.querySelector("video") : null;
	if (!video && node.closest) {
		const p = node.closest("[id*='preview' i], [class*='preview' i], [id*='mouseover' i], [class*='mouseover' i]");
		if (p) video = p.querySelector("video") || p;
	}
	if (!video || isFullscreenVideo(video)) return false;

	const vRect = video.getBoundingClientRect();
	if (vRect.width === 0 || vRect.height === 0) return !refImg;

	if (refImg) {
		if (isVideoInCoveringOverlay(video, refImg)) return false;
		const iRect = refImg.getBoundingClientRect();
		if (sameBounds(vRect, iRect) || rectsOverlap(vRect, iRect)) return true;
	}
	return false;
}

const _previewRootSel =
	"[id*='preview' i], [class*='preview' i], [id*='mouseover' i], [class*='mouseover' i], [id*='player' i], [class*='player' i]";

function findPreviewRoot(video) {
	let root = null;
	for (let p = video.parentElement; p && p !== document.body; p = p.parentElement) {
		if (p.matches(_previewRootSel)) root = p;
	}
	return root || video.parentElement || video;
}

function findPreviewVideos(x, y, stack) {
	const found = [];
	const videos = document.getElementsByTagName("video");
	if (!videos.length) return found;

	const add = (v) => {
		if (!v || isOwnElement(v) || found.includes(v) || isFullscreenVideo(v)) return;
		const r = v.getBoundingClientRect();
		if (r.width < 40 || r.height < 40 || x < r.left || x > r.right || y < r.top || y > r.bottom) return;
		const cs = getComputedStyle(v);
		if (cs.display === "none" || cs.visibility === "hidden") return;
		found.push(v);
	};

	for (const o of stack || deepElementsFromPoint(x, y)) {
		if (!o || o.nodeType !== 1 || isOwnElement(o)) continue;
		if (o.tagName === "VIDEO") {
			add(o);
			continue;
		}
		const p = o.closest ? o.closest(_previewRootSel) : null;
		if (p) add(p.querySelector("video"));
	}
	for (let i = 0; i < videos.length; i++) add(videos[i]);
	return found;
}

function isAnimatedPreviewImg(el) {
	return Boolean(el && el.tagName === "IMG" && !isOwnElement(el) && /\/an_webp\//i.test(el.currentSrc || el.src || ""));
}

function getStaticPreviewSrc(url) {
	return (url || "").replace(/\/an_webp\/([^/]+)\/([a-z0-9]+)_\d+s\.webp.*$/i, "/vi/$1/$2.jpg");
}

function findThumbUnderPreview(x, y, stack) {
	const pointStack = stack || deepElementsFromPoint(x, y);

	for (const o of pointStack) {
		if (!isAnimatedPreviewImg(o)) continue;
		const oRect = o.getBoundingClientRect();
		const scope = o.closest("article, figure, li, ytd-rich-item-renderer, ytd-video-renderer, a") || document;
		const animImgs = scope.querySelectorAll("img");
		for (let i = 0; i < animImgs.length; i++) {
			const cand = animImgs[i];
			if (cand === o || isOwnElement(cand) || isAnimatedPreviewImg(cand) || (!cand.src && !cand.currentSrc)) continue;
			const cRect = cand.getBoundingClientRect();
			if (cRect.width > 20 && cRect.height > 20 && x >= cRect.left && x <= cRect.right && y >= cRect.top && y <= cRect.bottom) {
				if (sameBounds(oRect, cRect) || rectsOverlap(oRect, cRect)) return cand;
			}
		}
	}

	for (const video of findPreviewVideos(x, y, pointStack)) {
		if (isPlayerVideo(video)) continue;
		const root = findPreviewRoot(video);
		const allImgs = document.querySelectorAll("img");
		for (let i = 0; i < allImgs.length; i++) {
			const cand = allImgs[i];
			if (isOwnElement(cand) || (!cand.src && !cand.currentSrc) || root.contains(cand) || cand.contains(video)) continue;
			const cRect = cand.getBoundingClientRect();
			if (cRect.width > 20 && cRect.height > 20 && x >= cRect.left && x <= cRect.right && y >= cRect.top && y <= cRect.bottom) {
				if (isPreviewVideoOverlay(video, cand)) return cand;
			}
		}
	}
	return null;
}

function findMediaCardRoot(el) {
	if (!el || !el.parentElement) return null;
	const lightboxRoot = el.closest("hmg-theme, app-image-gallery-lightbox, .lightbox-inner, .storyline-image");
	if (lightboxRoot) return lightboxRoot;

	const data = getElData(el, _firstkey);
	const iRect = el.getBoundingClientRect();
	const baseW = data && data.sw > 0 ? data.sw : iRect.width;
	const baseH = data && data.sh > 0 ? data.sh : iRect.height;
	let card = null;
	let p = el.parentElement;

	for (let i = 0; i < 8 && p && p !== document.body && p !== document.documentElement; i++) {
		const pRect = p.getBoundingClientRect();
		if (pRect.width > window.innerWidth * 0.85 && pRect.height > window.innerHeight * 0.85) break;
		if (baseH > 0 && pRect.height > baseH * 6) break;

		if (p.matches("article, figure, li, [role='article'], [role='listitem']") || p.tagName.includes("-")) {
			if (p.querySelector(_clickHostSel)) {
				card = p;
				const isLargerThanThumb = baseW > 0 && (pRect.width > baseW * 1.15 || pRect.height > baseH * 1.15);
				const hasMultipleLinks = p.querySelectorAll("a[href]").length >= 2;
				if (
					(isLargerThanThumb || hasMultipleLinks) &&
					(baseW === 0 || (pRect.width <= baseW * 5 && pRect.height <= baseH * 5))
				) {
					break;
				}
			}
		}
		p = p.parentElement;
	}
	return card;
}

function restorePointerEventsAttr(el) {
	if (!el) return;
	if (el.hasAttribute("data-zd-ovf")) {
		const [origX, origY] = (el.getAttribute("data-zd-ovf") || "|").split("|");
		el.style.removeProperty("overflow");
		if (origX) el.style.overflowX = origX;
		if (origY) el.style.overflowY = origY;
		el.removeAttribute("data-zd-ovf");
	}
	if (!el.hasAttribute("data-zd-pe")) return;
	const origPe = el.getAttribute("data-zd-pe");
	if (origPe === "empty") el.style.removeProperty("pointer-events");
	else el.style.setProperty("pointer-events", origPe, "important");
	el.removeAttribute("data-zd-pe");
}

function releaseLockedCard(card) {
	if (!card) return;
	card.removeAttribute("data-zd-card-lock");
	const focused = document.activeElement;
	if (focused && focused !== document.body && !isOwnElement(focused) && !isEditableTarget(focused) && card.contains(focused)) {
		focused.blur();
	}
	card.querySelectorAll("[data-zd-anc-vis]").forEach((anc) => {
		const parts = (anc.getAttribute("data-zd-anc-vis") || "|").split("|");
		if (parts[0]) anc.style.opacity = parts[0];
		else anc.style.removeProperty("opacity");
		if (parts[1]) anc.style.visibility = parts[1];
		else anc.style.removeProperty("visibility");
		anc.removeAttribute("data-zd-anc-vis");
	});
	restorePointerEventsAttr(card);
	card.querySelectorAll("[data-zd-pe], [data-zd-ovf]").forEach(restorePointerEventsAttr);
}

function restoreHiddenVideoPreview(v) {
	if (v.hasAttribute("data-zd-vid-hide")) {
		const origDisp = v.getAttribute("data-zd-vid-hide");
		if (origDisp === "empty") v.style.removeProperty("display");
		else v.style.display = origDisp;
		v.style.removeProperty("visibility");
		v.removeAttribute("data-zd-vid-hide");
	}
	let p = v.parentElement;
	for (let i = 0; i < 12 && p && p !== document.body; i++) {
		if (p.hasAttribute("data-zd-vid-hide")) {
			const parts = (p.getAttribute("data-zd-vid-hide") || "empty|empty").split("|");
			if (parts[0] === "empty") p.style.removeProperty("pointer-events");
			else p.style.pointerEvents = parts[0];
			if (!parts[1] || parts[1] === "empty") p.style.removeProperty("visibility");
			else p.style.visibility = parts[1];
			p.removeAttribute("data-zd-vid-hide");
		}
		p = p.parentElement;
	}
}

function restoreAllVideoPreviews() {
	document.querySelectorAll("[data-zd-anim-hide]").forEach((el) => el.removeAttribute("data-zd-anim-hide"));
	document.querySelectorAll("video[data-zd-vid-hide]").forEach(restoreHiddenVideoPreview);
	document.querySelectorAll("[data-zd-vid-hide]:not(video)").forEach((el) => {
		const parts = (el.getAttribute("data-zd-vid-hide") || "empty|empty").split("|");
		if (parts[0] === "empty") el.style.removeProperty("pointer-events");
		else el.style.pointerEvents = parts[0];
		if (!parts[1] || parts[1] === "empty") el.style.removeProperty("visibility");
		else el.style.visibility = parts[1];
		el.removeAttribute("data-zd-vid-hide");
	});
}

function restoreIdleVideoPreviews() {
	if (document.querySelector("[data-zd-pe-img]")) return;
	if (document.querySelector("[data-zd-vid-hide], [data-zd-anim-hide]")) restoreAllVideoPreviews();
}

const _watchedVideoRoots = new WeakSet();
const _videoWatchTime = new WeakMap();
const _shadowVideoCache = new WeakMap();
const _shadowVideoScanTtlMs = 500;
let _lastVideoInteractionTime = -Infinity;

function composedClosest(el, selector) {
	const seen = new Set();
	const queue = [el];
	for (let i = 0; i < queue.length; i++) {
		const n = queue[i];
		if (!n || seen.has(n)) continue;
		seen.add(n);
		if (n.nodeType === 1 && n.matches?.(selector)) return n;
		if (n.assignedSlot) queue.push(n.assignedSlot);
		const p = composedParent(n);
		if (p) queue.push(p);
	}
	return null;
}

function ensureVideoPlayWatch(sr) {
	if (!sr || _watchedVideoRoots.has(sr)) return;
	_watchedVideoRoots.add(sr);
	sr.addEventListener("play", onPlayerVideoStart, true);
}

function collectVideosDeep(root, outSet = new Set(), seen = new Set(), watch = false) {
	if (!root || seen.has(root)) return outSet;
	seen.add(root);

	if (root.nodeType === 1 && root.tagName === "VIDEO") {
		outSet.add(root);
	}
	const rootSr = root.nodeType === 1 ? getShadowRoot(root) : null;
	if (rootSr) {
		if (watch) ensureVideoPlayWatch(rootSr);
		collectVideosDeep(rootSr, outSet, seen, watch);
	}

	if (root.querySelectorAll) {
		for (const el of root.querySelectorAll("*")) {
			if (el.tagName === "VIDEO") outSet.add(el);
			const sr = getShadowRoot(el);
			if (sr) {
				if (watch) ensureVideoPlayWatch(sr);
				collectVideosDeep(sr, outSet, seen, watch);
			}
		}
	}
	return outSet;
}

function getBaseLayoutRect(el) {
	const r = el.getBoundingClientRect();
	const data = !getElData(el, _srckey) ? getElData(el, _firstkey) : null;
	if (data && data.sw > 0 && data.sh > 0 && isElementModified(el)) {
		const origRect = docRectToViewportRect({ x: data.origSx, y: data.origSy, w: data.sw, h: data.sh });
		if (r.width === 0 || r.height === 0 || rectsOverlap(r, origRect)) return origRect;
		const cx = r.left + r.width / 2;
		const cy = r.top + r.height / 2;
		return {
			left: cx - data.sw / 2,
			top: cy - data.sh / 2,
			right: cx + data.sw / 2,
			bottom: cy + data.sh / 2,
			width: data.sw,
			height: data.sh
		};
	}
	return r;
}

function findPlayerContainerAround(el, ref = null) {
	if (!el || !el.isConnected) return null;
	const baseRect = ref || getBaseLayoutRect(el);
	if (baseRect.width < 20 || baseRect.height < 20) return null;

	const maxW = Math.max(baseRect.width * 2, 120);
	const maxH = Math.max(baseRect.height * 2, 120);
	let root = el;
	let steps = 0;
	for (let p = composedParent(el); p && p !== document.body && p !== document.documentElement && steps < 12; p = composedParent(p)) {
		if (p.nodeType !== 1) continue;
		steps++;
		const r = p.getBoundingClientRect();
		if (r.width === 0 || r.height === 0) continue;
		if (r.width > maxW || r.height > maxH || !rectsOverlap(r, baseRect)) break;
		root = p;
	}
	return root;
}

function watchPlayerVideos(el) {
	if (!el || !el.isConnected) return;
	const now = performance.now();
	const lastWatch = _videoWatchTime.get(el);
	if (
		lastWatch !== undefined &&
		now - _lastVideoInteractionTime >= _shadowVideoScanTtlMs &&
		now - lastWatch < _shadowVideoScanTtlMs
	) {
		return;
	}
	_videoWatchTime.set(el, now);
	const root = findPlayerContainerAround(el);
	if (!root) return;
	collectVideosDeep(root, new Set(), new Set(), true);
}

function getCandidateVideosForRect(ref, anchorEl = null) {
	const out = new Set(document.getElementsByTagName("video"));
	const now = performance.now();
	const cacheKey = anchorEl?.isConnected ? anchorEl : null;
	const cached = cacheKey ? _shadowVideoCache.get(cacheKey) : null;
	if (
		cached &&
		now - _lastVideoInteractionTime >= _shadowVideoScanTtlMs &&
		now - cached.time < _shadowVideoScanTtlMs
	) {
		let allConnected = true;
		for (const v of cached.videos) {
			if (v.isConnected) out.add(v);
			else allConnected = false;
		}
		if (allConnected) return out;
	}

	const shadowVideos = new Set();
	const seen = new Set();
	if (cacheKey) {
		const container = findPlayerContainerAround(cacheKey, ref);
		if (container) collectVideosDeep(container, shadowVideos, seen, true);
	}

	const winW = window.innerWidth || document.documentElement.clientWidth;
	const winH = window.innerHeight || document.documentElement.clientHeight;
	if (ref.right > 0 && ref.left < winW && ref.bottom > 0 && ref.top < winH) {
		const cx = Math.min(Math.max((Math.max(ref.left, 0) + Math.min(ref.right, winW)) / 2, 1), winW - 1);
		const cy = Math.min(Math.max((Math.max(ref.top, 0) + Math.min(ref.bottom, winH)) / 2, 1), winH - 1);
		const stack = deepElementsFromPoint(cx, cy);
		const checkedHosts = new Set();
		for (const node of stack) {
			if (!node || node.nodeType !== 1 || isOwnElement(node) || node.classList?.contains(_zdImgCls)) continue;
			if (node.tagName === "VIDEO") shadowVideos.add(node);
			let cur = node;
			for (let i = 0; i < 6 && cur; i++) {
				const r = cur.getRootNode?.();
				const host = r instanceof ShadowRoot ? r.host : getShadowRoot(cur) ? cur : null;
				if (!host || host === document.body || host === document.documentElement) break;
				if (!checkedHosts.has(host)) {
					checkedHosts.add(host);
					const hr = host.getBoundingClientRect();
					if (
						hr.width > 0 &&
						hr.height > 0 &&
						hr.width <= Math.max(ref.width * 2, 120) &&
						hr.height <= Math.max(ref.height * 2, 120) &&
						rectsOverlap(hr, ref)
					) {
						collectVideosDeep(host, shadowVideos, seen, true);
					}
				}
				cur = host.parentNode || host.getRootNode?.()?.host || null;
			}
		}
	}

	if (cacheKey) _shadowVideoCache.set(cacheKey, { time: now, videos: Array.from(shadowVideos) });
	for (const v of shadowVideos) out.add(v);
	return out;
}

function isStartedPlayerVideoOverRect(v, ref) {
	if (!isVideoStarted(v) || isDecorativeVideo(v) || isIdleVideo(v)) return false;
	if (!isPlayerVideo(v) && !isEmbeddedPlayerVideo(v)) return false;
	const r = getVideoLayoutRect(v);
	return r.width >= ref.width * 0.5 && r.height >= ref.height * 0.5 && rectsOverlap(r, ref);
}

function hasStartedVideoOverDocRect(docRect, anchorEl = null) {
	if (!docRect) return false;
	const ref = docRectToViewportRect(docRect);
	for (const v of getCandidateVideosForRect(ref, anchorEl)) {
		if (isStartedPlayerVideoOverRect(v, ref)) return true;
	}
	return false;
}

function doesVideoOverlapLockedCard(v, curr, card) {
	if (!curr || !curr.isConnected) return false;
	if (card && composedContains(card, v)) return true;

	const cRect = curr.getBoundingClientRect();
	const thumbBox = curr.closest("a[href], picture, figure") || curr.parentElement;
	const tRect = thumbBox ? thumbBox.getBoundingClientRect() : cRect;

	const probeRect = getVideoLayoutRect(v);
	if (probeRect.width === 0 || probeRect.height === 0) return false;
	return sameBounds(probeRect, cRect) || sameBounds(probeRect, tRect) || rectsOverlap(probeRect, tRect);
}

function hasRecentPlayerStart(galleryRoot, docRect) {
	if (!_playingFrames.size) return false;
	const now = performance.now();
	const ref = docRect ? docRectToViewportRect(docRect) : null;
	for (const [frame, startedAt] of _playingFrames) {
		if (now - startedAt > _playerSignalTtlMs || !frame.isConnected) {
			_playingFrames.delete(frame);
			continue;
		}
		if (galleryRoot && composedContains(galleryRoot, frame)) return true;
		if (ref && rectsOverlap(frame.getBoundingClientRect(), ref)) return true;
	}
	return false;
}

function hasPlayerOverDocRect(docRect, galleryRoot = null, anchorEl = null) {
	if (hasRecentPlayerStart(galleryRoot, docRect)) return true;
	if (!docRect) return false;
	const ref = docRectToViewportRect(docRect);
	const isTakeover = (el) => {
		if (isOwnElement(el)) return false;
		const r = el.getBoundingClientRect();
		if (r.width < ref.width * 0.5 || r.height < ref.height * 0.5 || !rectsOverlap(r, ref)) return false;
		const cs = window.getComputedStyle(el);
		return cs.display !== "none" && cs.visibility !== "hidden" && parseFloat(cs.opacity) >= 0.05;
	};
	for (const frame of document.getElementsByTagName("iframe")) {
		if (isTakeover(frame)) return true;
	}
	for (const v of getCandidateVideosForRect(ref, anchorEl)) {
		if (isStartedPlayerVideoOverRect(v, ref)) return true;
	}
	return false;
}

function isCoveredByStartedPlayer(img, origRect = null) {
	if (!img) return false;
	const rect = origRect || (img.isConnected && getNonZeroDocRect(img));
	if (rect && hasStartedVideoOverDocRect(rect, img)) return true;
	if (!img.isConnected) return false;
	const card = composedClosest(img, "[data-zd-card-lock]");
	for (const v of document.getElementsByTagName("video")) {
		if (isPlayerVideo(v) && !isIdleVideo(v) && doesVideoOverlapLockedCard(v, img, card)) return true;
	}
	return false;
}

function suppressActivePreviewsForCard(curr, card, scan = null) {
	if (!curr || !curr.isConnected) return;

	if (!curr.hasAttribute("data-zd-float-hidden") && curr.style.visibility === "hidden") {
		curr.style.removeProperty("visibility");
	}

	const videos = scan ? scan.videos : document.getElementsByTagName("video");
	const ytPreviews = scan ? scan.ytPreviews : document.querySelectorAll("ytd-video-preview, #video-preview, .ytd-video-preview");
	if (videos.length === 0 && ytPreviews.length === 0) return;

	const lockedImgs = scan ? scan.lockedImgs : Array.from(document.querySelectorAll("img[data-zd-pe-img]"));

	for (const v of videos) {
		if (isFullscreenVideo(v) || isPlayerCandidate(v)) {
			if (v.hasAttribute("data-zd-vid-hide")) restoreHiddenVideoPreview(v);
			continue;
		}
		const overlapsCurrent = doesVideoOverlapLockedCard(v, curr, card);
		const overlapsAnyLocked =
			overlapsCurrent ||
			lockedImgs.some(
				(img) =>
					img !== curr &&
					img.hasAttribute("data-zd-pe-img") &&
					doesVideoOverlapLockedCard(v, img, img.closest("[data-zd-card-lock]"))
			);

		if (overlapsAnyLocked) {
			try {
				if (!v.paused) v.pause();
			} catch (err) {}
			if (!v.hasAttribute("data-zd-vid-hide")) {
				v.setAttribute("data-zd-vid-hide", v.style.display || "empty");
			}
			v.style.setProperty("display", "none", "important");
			v.style.setProperty("visibility", "hidden", "important");

			let p = v.parentElement;
			for (let i = 0; i < 12 && p && p !== document.body && (!card || !p.contains(card)); i++) {
				const pRect = p.getBoundingClientRect();
				if (pRect.width > window.innerWidth * 0.8 || pRect.height > window.innerHeight * 0.8) break;
				const pBg = window.getComputedStyle(p).backgroundImage;
				if (pBg && pBg !== "none") break;
				if (!p.contains(curr)) {
					if (!p.hasAttribute("data-zd-vid-hide")) {
						p.setAttribute("data-zd-vid-hide", `${p.style.pointerEvents || "empty"}|${p.style.visibility || "empty"}`);
					}
					p.style.setProperty("pointer-events", "none", "important");
					p.style.setProperty("visibility", "hidden", "important");
				}
				p = p.parentElement;
			}
		} else if (v.hasAttribute("data-zd-vid-hide")) {
			restoreHiddenVideoPreview(v);
		}
	}

	ytPreviews.forEach((vp) => {
		const overlapsCurrent = doesVideoOverlapLockedCard(vp, curr, card);
		const overlapsAnyLocked =
			overlapsCurrent ||
			lockedImgs.some(
				(img) =>
					img !== curr &&
					img.hasAttribute("data-zd-pe-img") &&
					doesVideoOverlapLockedCard(vp, img, img.closest("[data-zd-card-lock]"))
			);

		if (overlapsAnyLocked) {
			if (!vp.hasAttribute("data-zd-vid-hide")) {
				vp.setAttribute("data-zd-vid-hide", `${vp.style.pointerEvents || "empty"}|${vp.style.visibility || "empty"}`);
			}
			vp.style.setProperty("pointer-events", "none", "important");
			vp.style.setProperty("visibility", "hidden", "important");
		} else if (vp.hasAttribute("data-zd-vid-hide")) {
			const parts = (vp.getAttribute("data-zd-vid-hide") || "empty|empty").split("|");
			if (parts[0] === "empty") vp.style.removeProperty("pointer-events");
			else vp.style.pointerEvents = parts[0];
			if (!parts[1] || parts[1] === "empty") vp.style.removeProperty("visibility");
			else vp.style.visibility = parts[1];
			vp.removeAttribute("data-zd-vid-hide");
		}
	});
}

function suppressAnimatedPreviewsForCard(curr, card, scan = null) {
	if (!curr || !curr.isConnected) return;
	const animImgs = scan ? scan.animImgs : document.querySelectorAll("img[src*='an_webp']");
	if (animImgs.length === 0) return;

	const cRect = curr.getBoundingClientRect();
	const thumbBox = curr.closest("a[href], picture, figure") || curr.parentElement;
	const tRect = thumbBox ? thumbBox.getBoundingClientRect() : cRect;

	animImgs.forEach((a) => {
		if (a === curr || isOwnElement(a) || a.hasAttribute("data-zd-anim-hide")) return;
		const aRect = a.getBoundingClientRect();
		if ((card && card.contains(a)) || sameBounds(aRect, cRect) || sameBounds(aRect, tRect) || rectsOverlap(aRect, tRect)) {
			a.setAttribute("data-zd-anim-hide", "");
		}
	});
}

function startPreviewNavGuard() {
	if (_previewNavGuardTimer) return;
	_previewNavGuardUrl = getPageKey();
	_previewNavGuardTimer = setInterval(() => {
		const lockedEls = document.querySelectorAll("[data-zd-pe-img]");
		if (lockedEls.length === 0) {
			restoreAllVideoPreviews();
			document.querySelectorAll("[data-zd-card-lock]").forEach(releaseLockedCard);
			clearInterval(_previewNavGuardTimer);
			_previewNavGuardTimer = null;
			return;
		}
		if (checkNavigationReset()) return;
		const scan = {
			lockedImgs: Array.from(lockedEls).filter((el) => el.tagName === "IMG"),
			videos: document.getElementsByTagName("video"),
			ytPreviews: document.querySelectorAll("ytd-video-preview, #video-preview, .ytd-video-preview"),
			animImgs: document.querySelectorAll("img[src*='an_webp']")
		};
		lockedEls.forEach((img) => {
			if (img.tagName !== "IMG") {
				const bgCard = img.closest("[data-zd-card-lock]");
				suppressActivePreviewsForCard(img, bgCard, scan);
				suppressAnimatedPreviewsForCard(img, bgCard, scan);
				return;
			}
			const isCurrent = img === _img_element;
			if (!isCurrent && (isInlineImageSwapped(img) || isInlineImageSlidAway(img))) {
				resetInlineElement(img);
				return;
			}
			if (isCurrent && isInlineImageSwapped(img)) {
				resetInlineElement(img);
				if (getPanelHost()) {
					if (rebindPanelImage(img)) {
						if (isPanelHovered() || panelHasFocus()) applyPanelBorder();
					}
				} else {
					setZoom(img, null, true);
				}
				return;
			}
			const card = img.closest("[data-zd-card-lock]");
			suppressActivePreviewsForCard(img, card, scan);
			suppressAnimatedPreviewsForCard(img, card, scan);
			if (!img.hasAttribute("data-zd-float-hidden") && isElementModified(img) && !img.style.width) {
				const dt = getElData(img, _firstkey);
				const sz = getElData(img, _sizekey);
				const rt = getElData(img, _rotkey) || 0;
				if (sz && dt && (Math.abs(sz.w - dt.sw) > 2 || Math.abs(sz.h - dt.sh) > 2)) {
					setImageRect(sz, img);
				}
				if (rt) imgRotate(rt, img);
			}
		});
	}, 200);
}

const _sliderNavSel = [
	'button[aria-controls]',
	'[role="button"][aria-controls]',
	'[aria-label*="slide" i]',
	'[aria-label*="next" i]',
	'[aria-label*="prev" i]',
	'[data-testid*="arrow" i]',
	'[data-testid*="next" i]',
	'[data-testid*="prev" i]',
	'.swiper-button-next',
	'.swiper-button-prev',
	'.swiper-pagination-bullet',
	'.slick-next',
	'.slick-prev',
	'.slick-dots button',
	'[data-mix-operations="leftClickHandler"]',
	'[data-mix-operations="rightClickHandler"]'
].join(", ");

const _sliderNavStrictSel = '[data-mix-operations="leftClickHandler"], [data-mix-operations="rightClickHandler"]';

function isSliderNavControl(el) {
	if (!el || el.nodeType !== 1 || isOwnElement(el)) return false;
	const btn = el.closest(_sliderNavSel);
	if (!btn || !(findGalleryRoot(btn) || btn.matches(_sliderNavStrictSel))) return false;
	const r = btn.getBoundingClientRect();
	return r.width > 0 && r.height > 0 && r.width <= 120 && r.height <= 120;
}

function hasPeerSibling(node) {
	const parent = node.parentElement;
	if (!parent || !node.classList.length) return false;
	return Array.from(parent.children).some((s) => s !== node && s.tagName === node.tagName && Array.from(node.classList).some((c) => s.classList.contains(c)));
}

function lockContainers(curr) {
	if (!curr || curr.tagName === "BODY" || curr.classList.contains("fullscreen") || isInsideVideoPlayer(curr)) return;

	const isFloatHidden = curr.hasAttribute("data-zd-float-hidden");
	if (!curr.hasAttribute("data-zd-pe-img")) {
		curr.setAttribute("data-zd-pe-img", curr.style.pointerEvents || "empty");
		_lockedSrcMap.set(curr, curr.getAttribute("src") || curr.getAttribute("srcset") || "");
	}
	curr.style.setProperty("pointer-events", isFloatHidden ? "none" : "auto", "important");

	const foundCard = findMediaCardRoot(curr);
	const thumbHost = curr.closest(_clickHostSel);

	const isGalleryItem = Boolean(findGalleryRoot(curr));
	const isBg = Boolean(getElData(curr, _bgsrckey));
	let node = curr;
	for (let i = 0; i < 3 && node.parentElement && node.parentElement.tagName !== "BODY"; i++) {
		if (foundCard && node === foundCard) break;
		if (thumbHost && node === thumbHost && (!isBg || i > 0)) break;
		if (i > 0 && !isGalleryItem && hasPeerSibling(node)) break;
		const p = node.parentElement;
		if (foundCard && p === foundCard) break;
		if (isBg && !isGalleryItem && !curr.hasAttribute("data-zd-float-hidden") && !p.hasAttribute("data-zd-ovf")) {
			const cs = window.getComputedStyle(p);
			if (cs.overflow === "hidden" || cs.overflowX === "hidden" || cs.overflowY === "hidden") {
				p.setAttribute("data-zd-ovf", `${p.style.overflowX}|${p.style.overflowY}`);
				p.style.setProperty("overflow", "visible", "important");
			}
		}
		if (!p.hasAttribute("data-zd-pe")) {
			p.setAttribute("data-zd-pe", p.style.pointerEvents || "empty");
			p.style.setProperty("pointer-events", p.matches(_clickHostSel) ? "auto" : "none", "important");
		}
		for (const sibling of p.children) {
			if (sibling !== node && !sibling.hasAttribute("data-zd-pe")) {
				if (isSliderNavControl(sibling)) {
					sibling.setAttribute("data-zd-pe", sibling.style.pointerEvents || "empty");
					sibling.style.setProperty("pointer-events", "auto", "important");
					continue;
				}
				sibling.setAttribute("data-zd-pe", sibling.style.pointerEvents || "empty");
				sibling.style.setProperty("pointer-events", "none", "important");
				if (sibling.querySelectorAll) {
					sibling.querySelectorAll(_sliderNavSel).forEach((navBtn) => {
						if (isSliderNavControl(navBtn) && !navBtn.hasAttribute("data-zd-pe")) {
							navBtn.setAttribute("data-zd-pe", navBtn.style.pointerEvents || "empty");
							navBtn.style.setProperty("pointer-events", "auto", "important");
						}
					});
				}
			}
		}
		node = p;
	}

	const card = foundCard || node;
	if (card && card !== document.body) {
		const wasLocked = card.hasAttribute("data-zd-card-lock");
		card.setAttribute("data-zd-card-lock", "");
		for (let anc = curr.parentElement; anc && anc !== card && anc !== document.body; anc = anc.parentElement) {
			if (!anc.hasAttribute("data-zd-anc-vis")) {
				anc.setAttribute("data-zd-anc-vis", `${anc.style.opacity}|${anc.style.visibility}`);
			}
			anc.style.setProperty("opacity", "1", "important");
			anc.style.setProperty("visibility", "visible", "important");
		}
		if (!wasLocked) {
			const hostRenderer = card.parentElement && card.parentElement.tagName.includes("-") ? card.parentElement : null;
			const ytPreview = document.querySelector("ytd-video-preview");
			const leaveTargets = [curr, thumbHost, curr.closest("ytd-thumbnail"), card, hostRenderer, ytPreview].filter(Boolean);
			leaveTargets.forEach((t) => {
				t.dispatchEvent(new MouseEvent("mouseout", { bubbles: true, cancelable: true, relatedTarget: document.body }));
				t.dispatchEvent(new MouseEvent("mouseleave", { bubbles: false, cancelable: false, relatedTarget: document.body }));
				t.dispatchEvent(new PointerEvent("pointerout", { bubbles: true, cancelable: true, relatedTarget: document.body }));
				t.dispatchEvent(new PointerEvent("pointerleave", { bubbles: false, cancelable: false, relatedTarget: document.body }));
			});
		}
	}

	suppressActivePreviewsForCard(curr, card);
	suppressAnimatedPreviewsForCard(curr, card);
	startPreviewNavGuard();
}

function unlockContainers(curr) {
	if (!curr) return;

	if (curr.hasAttribute("data-zd-pe-img")) {
		const origPe = curr.getAttribute("data-zd-pe-img");
		if (origPe === "empty") curr.style.removeProperty("pointer-events");
		else curr.style.setProperty("pointer-events", origPe, "important");
		curr.removeAttribute("data-zd-pe-img");
	}
	curr.removeAttribute("data-zd-float-hidden");

	let topParent = curr.parentElement;
	for (let i = 0; i < 4 && topParent && topParent.parentElement && topParent.parentElement.tagName !== "BODY"; i++) {
		topParent = topParent.parentElement;
	}
	if (topParent) {
		restorePointerEventsAttr(topParent);
		topParent.querySelectorAll("[data-zd-pe], [data-zd-ovf]").forEach(restorePointerEventsAttr);
	}

	queryAllScoped(curr, "[data-zd-card-lock]").forEach((card) => {
		if (!card.querySelector("[data-zd-pe-img]")) {
			releaseLockedCard(card);
		}
	});

	if (topParent) {
		topParent.querySelectorAll("[data-zd-pe-img]").forEach((otherImg) => {
			if (otherImg !== curr) lockContainers(otherImg);
		});
	}

	if (!curr.isConnected && !document.querySelector("[data-zd-pe-img]")) {
		document.querySelectorAll("[data-zd-pe]").forEach(restorePointerEventsAttr);
	}

	if (!document.querySelector("[data-zd-card-lock]")) {
		restoreAllVideoPreviews();
	}
}

function checkIsExcluded(excludedStr) {
	return ZDShared.isExcluded(location.hostname, excludedStr) || Boolean(_topHost && ZDShared.isExcluded(_topHost, excludedStr));
}

function updateExcludedState() {
	const wasExcluded = _isExcludedHost;
	_isExcludedHost = checkIsExcluded(_zoom_excludedDomains);
	if (_isExcludedHost && !wasExcluded) resetAllChanges();
}

function requestTopHost() {
	if (window === window.top) return;

	browser.runtime
		.sendMessage({ id: "get-top-host" })
		.then((res) => {
			const host = typeof res?.host === "string" ? res.host : "";
			if (host === _topHost) return;
			_topHost = host;
			updateExcludedState();
		})
		.catch(() => {});
}

const _playerMinWidth = 320;
const _playerMinHeight = 180;
const _playerMinRatio = 0.4;
const _playerFrameRatio = 0.5;
const _playerSignalTtlMs = 2000;
const _zdPlayerMsg = '{"zdPlayerStart":true}';
const _playingFrames = new Map();
const _playerExcludeSel =
	"[id*='preview' i], [class*='preview' i], [id*='mouseover' i], [class*='mouseover' i], ytd-video-preview, a[href]";
const _carouselSlideSel = 'li[style*="translateX"]';

function isCarouselSlideVideo(video) {
	return Boolean(video && video.tagName === "VIDEO" && !isOwnElement(video) && video.closest(_carouselSlideSel) && findGalleryRoot(video));
}

function hasSlideVideoPoster(video) {
	const slide = video.closest(_carouselSlideSel);
	if (!slide) return true;
	const vRect = video.getBoundingClientRect();
	for (const img of slide.getElementsByTagName("img")) {
		if (!isOwnElement(img) && rectsOverlap(img.getBoundingClientRect(), vRect)) return true;
	}
	return false;
}

function isStaleNextToPosterlessSlideVideo(orig, galleryRoot) {
	if (!galleryRoot || !galleryRoot.isConnected) return false;
	const r = galleryRoot.getBoundingClientRect();
	if (r.width < 40 || r.height < 40) return false;

	const winW = window.innerWidth || document.documentElement.clientWidth;
	const winH = window.innerHeight || document.documentElement.clientHeight;
	const cx = Math.min(Math.max(r.left + r.width / 2, 1), winW - 1);
	const cy = Math.min(Math.max(r.top + r.height / 2, 1), winH - 1);

	for (const v of document.getElementsByTagName("video")) {
		if (!isCarouselSlideVideo(v) || !inRect(v, cx, cy) || hasSlideVideoPoster(v)) continue;
		const slide = v.closest(_carouselSlideSel);
		if (!orig.isConnected || !slide.contains(orig)) return true;
	}
	return false;
}

function getVideoLayoutRect(video) {
	let r = video.getBoundingClientRect();
	if (r.width > 0 && r.height > 0) return r;
	let steps = 0;
	for (let p = composedParent(video); steps < 6 && p && p !== document.body && p !== document.documentElement; p = composedParent(p)) {
		if (p.nodeType !== 1) continue;
		steps++;
		const pr = p.getBoundingClientRect();
		if (pr.width > 0 && pr.height > 0) return pr;
	}
	return r;
}

function hasPlayerMinSize(video) {
	const r = getVideoLayoutRect(video);
	if (r.width >= _playerMinWidth && r.height >= _playerMinHeight) return true;
	return r.height > r.width && r.width >= _playerMinHeight && r.height >= _playerMinWidth;
}

function isEmbeddedPlayerVideo(video) {
	if (isOwnElement(video) || isDecorativeVideo(video)) return false;
	if (isFullscreenVideo(video)) return true;
	if (video.hasAttribute("data-zd-vid-hide")) return false;
	if (!hasPlayerMinSize(video) || composedClosest(video, _playerExcludeSel)) return false;
	if (video.muted && !video.controls && composedClosest(video, "[data-zd-card-lock]")) return false;
	return true;
}

function isLargeVideo(video) {
	if (!hasPlayerMinSize(video)) return false;
	const r = getVideoLayoutRect(video);
	const winW = window.innerWidth || document.documentElement.clientWidth;
	const winH = window.innerHeight || document.documentElement.clientHeight;
	if (r.width >= _playerMinWidth && r.height >= _playerMinHeight && r.width >= winW * _playerMinRatio) {
		return true;
	}
	return r.height > r.width && r.height >= winH * _playerMinRatio;
}

function isDecorativeVideo(video) {
	return video.loop && video.muted && !video.controls;
}

function isVideoStarted(video) {
	return !video.paused || video.currentTime > 0 || video.played.length > 0;
}

function isIdleVideo(video) {
	if (isFullscreenVideo(video)) return false;
	if (video.ended || video.getClientRects().length === 0 || window.getComputedStyle(video).visibility === "hidden") return true;
	let steps = 0;
	for (let p = video; p && steps < 8 && p !== document.body && p !== document.documentElement; p = composedParent(p)) {
		if (p.nodeType !== 1) continue;
		steps++;
		if (parseFloat(window.getComputedStyle(p).opacity) < 0.01) return true;
	}
	return false;
}

function isPlayerCandidate(video) {
	if (isOwnElement(video)) return false;
	if (composedClosest(video, "sn-feed")) return true;
	if (!isLargeVideo(video) || isDecorativeVideo(video)) return false;
	return isFullscreenVideo(video) || !composedClosest(video, _playerExcludeSel);
}

function isPlayerVideo(video) {
	return isPlayerCandidate(video) && (isFullscreenVideo(video) || isVideoStarted(video));
}

function findPlayerRoot(video) {
	const feedRoot = composedClosest(video, "sn-feed");
	if (feedRoot) return feedRoot;

	const vRect = getVideoLayoutRect(video);
	let root = video;
	let steps = 0;
	for (let p = composedParent(video); steps < 10 && p && p !== document.body && p !== document.documentElement; p = composedParent(p)) {
		if (p.nodeType !== 1) continue;
		steps++;
		const pRect = p.getBoundingClientRect();
		if (pRect.width === 0 || pRect.height === 0) {
			root = p;
			continue;
		}
		if (pRect.width > vRect.width * 1.1 || pRect.height > vRect.height * 1.25) break;
		root = p;
	}
	return root;
}

function isInPlayerZone(target) {
	if (target && target.closest && target.closest("sn-feed")) return true;

	const videos = document.getElementsByTagName("video");
	if (!videos.length) return false;

	const inFrame = window !== window.top;
	const winW = window.innerWidth || document.documentElement.clientWidth;
	const winH = window.innerHeight || document.documentElement.clientHeight;

	for (let i = 0; i < videos.length; i++) {
		const v = videos[i];
		if (isIdleVideo(v)) continue;
		if (inFrame && !isOwnElement(v) && isLargeVideo(v) && !isDecorativeVideo(v) && (isVideoStarted(v) || isFullscreenVideo(v))) {
			const r = getVideoLayoutRect(v);
			if (r.width * r.height >= winW * winH * _playerFrameRatio) return true;
		}
		if (isPlayerVideo(v) && composedContains(findPlayerRoot(v), target)) return true;
	}
	return false;
}

function onPlayerVideoStart(e) {
	const v = e.target;
	if (_isExcludedHost || !v || v.tagName !== "VIDEO") return;

	const isFullPlayer = isPlayerVideo(v);
	const isEmbeddedPlayer = !isFullPlayer && isEmbeddedPlayerVideo(v) && isVideoStarted(v);
	if (!isFullPlayer && !isEmbeddedPlayer) return;

	const activeOrig = _img_element ? getElData(_img_element, _srckey) || _img_element : null;
	const firstData = activeOrig ? getElData(activeOrig, _firstkey) : null;
	const activeRect =
		(_img_element && getElData(_img_element, _origRectkey)) ||
		(firstData && firstData.sw > 0 && firstData.sh > 0
			? { x: firstData.origSx, y: firstData.origSy, w: firstData.sw, h: firstData.sh }
			: null);
	const playerRoot = findPlayerRoot(v);
	const isVideoOverImg = (img, docRect = null) => {
		if (!img) return false;
		if (playerRoot && !playerRoot.matches("sn-feed") && composedContains(playerRoot, img)) return true;
		if (doesVideoOverlapLockedCard(v, img, composedClosest(img, "[data-zd-card-lock]"))) return true;
		return Boolean(docRect && isStartedPlayerVideoOverRect(v, docRectToViewportRect(docRect)));
	};
	const overlapsActive = isVideoOverImg(activeOrig, activeRect);
	const exWrapper = document.getElementById(_zdExImgId);
	const overlapsAnyFloat = Boolean(
		exWrapper &&
			Array.from(exWrapper.getElementsByTagName("img")).some((f) =>
				isVideoOverImg(getElData(f, _srckey), getElData(f, _origRectkey))
			)
	);
	if (!isFullPlayer && !overlapsActive && !overlapsAnyFloat) return;

	if (window !== window.top) window.parent.postMessage(_zdPlayerMsg, "*");

	if (isFullPlayer && v.hasAttribute("data-zd-vid-hide")) {
		restoreHiddenVideoPreview(v);
	}

	const isLockedImgInPlayerZone = (img, docRect = null) =>
		isInPlayerZone(img) ||
		doesVideoOverlapLockedCard(v, img, composedClosest(img, "[data-zd-card-lock]")) ||
		(img === activeOrig && overlapsActive) ||
		isVideoOverImg(img, docRect);
	resetImagesForPlayer(isLockedImgInPlayerZone, Boolean(composedClosest(v, "[data-zd-card-lock]")));
}

function onFullscreenChange() {
	const fs = document.fullscreenElement;
	if (_isExcludedHost || !fs || isOwnElement(fs)) return;
	if (fs.tagName !== "VIDEO" && !fs.querySelector("video")) {
		if (destroyPanel()) setZoom();
		return;
	}

	const isInFullscreen = (img) => fs.contains(img) || img.contains(fs);
	resetImagesForPlayer(isInFullscreen, Boolean(fs.closest("[data-zd-card-lock]") || fs.querySelector("[data-zd-card-lock]")));
}

function resetImagesForPlayer(isRelated, hasLockedCard) {
	let panelClosed = false;
	const activeImg = _img_element;
	const activeOrig = activeImg ? getElData(activeImg, _srckey) || activeImg : null;
	const activeRelated = Boolean(activeImg && (!activeOrig || !activeOrig.isConnected || isRelated(activeOrig)));
	if (getPanelHost()) {
		if (!activeOrig || !activeOrig.isConnected || isRelated(activeOrig)) {
			panelClosed = destroyPanel();
		} else {
			return;
		}
	}

	const lockedImgs = Array.from(document.querySelectorAll("img[data-zd-pe-img]"));
	if (!hasLockedCard && lockedImgs.length > 0 && !lockedImgs.some((img) => isRelated(img))) {
		const exWrapper = document.getElementById(_zdExImgId);
		if (exWrapper) {
			for (const f of Array.from(exWrapper.getElementsByTagName("img"))) {
				const orig = getElData(f, _srckey);
				if (orig && isRelated(orig, getElData(f, _origRectkey))) {
					removeFloatImage(f, orig);
				}
			}
		}
		if (activeRelated) {
			if (activeImg && getElData(activeImg, _srckey) && activeImg.isConnected) removeFloatImage(activeImg, activeOrig);
			else if (activeOrig && isElementModified(activeOrig)) resetInlineElement(activeOrig);
			_hoverTarget = null;
			_current_element = null;
			_img_element = null;
			setZoom();
		} else if (panelClosed) {
			_current_element = null;
			setZoom();
		}
		return;
	}

	restoreOriginalDOM(false);
	_hoverTarget = null;
	_current_element = null;
	_img_element = null;
	setZoom();
}

const _galleryBaseline = new WeakMap();
let _handOffWait = { orig: null, since: 0 };
let _handOffAdopted = false;
let _handOffGraceUntil = 0;
let _openGalleryCache = { time: -Infinity, roots: [] };

function shouldWaitForHandOff(orig, graceStart = 0) {
	const now = performance.now();
	if (_handOffWait.orig !== orig) {
		_handOffWait = { orig, since: graceStart || now };
		d("Hand-off wait", `grace=${_gallerySwitchGraceMs}ms shared=${Boolean(graceStart)}`);
	}
	return now - _handOffWait.since < _gallerySwitchGraceMs;
}

function findHandOffTarget(orig, resolveByRoot, directOnly = false) {
	let visibleFallback = null;
	const getVisibleFallback = () => visibleFallback || (visibleFallback = findVisibleFallbackImages(orig));
	const sources = directOnly
		? [["directTarget", resolveByRoot]]
		: [
				["newGallery", () => findActiveImageInNewGallery(orig)],
				["openGallery", () => findActiveImageInOpenGallery(orig)],
				["replacementRoot", resolveByRoot],
				["modifiedImage", () => findModifiedImage(orig), true],
				["sameImage", () => getVisibleFallback().same],
				["largestImage", () => getVisibleFallback().largest]
			];
	const exWrapper = document.getElementById(_zdExImgId);
	const prevDisplay = exWrapper ? exWrapper.style.getPropertyValue("display") : "";
	const prevPriority = exWrapper ? exWrapper.style.getPropertyPriority("display") : "";
	const restoreDisplay = () => {
		if (!exWrapper) return;
		if (prevDisplay) exWrapper.style.setProperty("display", prevDisplay, prevPriority);
		else exWrapper.style.removeProperty("display");
	};
	try {
		for (const [name, find, showFloats] of sources) {
			if (exWrapper) {
				if (showFloats) restoreDisplay();
				else exWrapper.style.setProperty("display", "none", "important");
			}
			const img = find ? find() : null;
			if (img && img !== orig) {
				d("Hand-off target", name);
				return img;
			}
		}
		return null;
	} finally {
		restoreDisplay();
	}
}

function isFloatSourceGone(orig) {
	if (!orig || !orig.isConnected) return true;

	const r = orig.getBoundingClientRect();
	if (r.width === 0 && r.height === 0) return true;

	let isDirectParent = true;
	for (let p = composedParent(orig); p && p !== document.body && p !== document.documentElement; p = composedParent(p)) {
		if (p.nodeType !== 1) continue;
		const cs = window.getComputedStyle(p);
		if (cs.display === "none" || (isDirectParent && cs.visibility === "hidden") || Number(cs.opacity) === 0) return true;
		isDirectParent = false;
	}
	return false;
}

function handOffPanelTo(nextImg) {
	if (!nextImg || !nextImg.isConnected) return false;
	attachEvent(nextImg);
	const ok = isElementModified(nextImg) ? bindPanelToModifiedImage(nextImg) : rebindPanelImage(nextImg);
	if (ok) {
		_handOffAdopted = true;
		_handOffGraceUntil = performance.now() + _gallerySwitchGraceMs * _gallerySwitchGraceStaleFactor;
		_galleryBaseline.delete(getElData(nextImg, _srckey) || nextImg);
		applyPanelBorder();
	}
	return ok;
}

function removeFloatImage(img, orig) {
	destroyFloatFrame(img);
	resetInlineElement(orig);
	const exWrapper = document.getElementById(_zdExImgId);
	const pnt = img.closest("a");
	if (pnt && exWrapper && pnt.parentNode === exWrapper) pnt.remove();
	else img.remove();
	_modifiedElements.delete(img);
	elementDataMap.delete(img);
}

const _floatOrphanSince = new WeakMap();
const _floatOrphanDelayMs = 300;

function isFloatViewGone(img) {
	const root = getElData(img, _srckey) ? getElData(img, _galleryRootkey) : null;
	return Boolean(root && !(root.isConnected && isGalleryRootShown(root)));
}

function removeOrphanedFloats(activeImg) {
	const exWrapper = document.getElementById(_zdExImgId);
	if (!exWrapper) return;

	const now = performance.now();
	for (const img of Array.from(exWrapper.getElementsByTagName("img"))) {
		const orig = getElData(img, _srckey);
		if (!orig || img === activeImg || !isFloatViewGone(img)) {
			_floatOrphanSince.delete(img);
			continue;
		}
		if (!_floatOrphanSince.has(img)) _floatOrphanSince.set(img, now);
		if (now - _floatOrphanSince.get(img) < _floatOrphanDelayMs) continue;

		d("Float orphan removed", "view closed");
		removeFloatImage(img, orig);
		_galleryBaseline.delete(orig);
		_floatOrphanSince.delete(img);
	}
}

function handOffInlinePanel(orig, resolveByRoot, graceStart = 0, directOnly = false) {
	if (!getPanelHost() || !orig) return false;

	const nextImg = findHandOffTarget(orig, resolveByRoot, directOnly);
	if ((!nextImg || nextImg === orig) && shouldWaitForHandOff(orig, graceStart)) return null;
	if (!nextImg || nextImg === orig) return false;
	_handOffWait.orig = null;

	if (isElementModified(orig) || orig.hasAttribute("data-zd-pe-img")) {
		resetInlineElement(orig);
	} else {
		unlockContainers(orig);
		_modifiedElements.delete(orig);
		elementDataMap.delete(orig);
	}
	_galleryBaseline.delete(orig);

	const ok = handOffPanelTo(nextImg);
	d("Inline hand-off", `target=true ok=${ok}`, "warn");
	return ok;
}

function resetActiveFloatAndHandOff(resolveByRoot) {
	const floatImg = _img_element;
	const orig = floatImg ? getElData(floatImg, _srckey) : null;
	if (!orig) return false;

	const panel = getPanelHost();
	const nextImg = panel ? findHandOffTarget(orig, resolveByRoot) : null;
	if (panel && !nextImg && shouldWaitForHandOff(orig)) return null;
	_handOffWait.orig = null;

	if (panel) removePanelBorder();
	removeFloatImage(floatImg, orig);
	_hoverTarget = null;
	_current_element = null;
	_img_element = null;
	setZoom();
	hideBadgeImmediate();
	_galleryBaseline.delete(orig);

	const handedOff = panel ? handOffPanelTo(nextImg) : false;
	if (panel && !handedOff) destroyPanel();
	d("Float hand-off", `panel=${Boolean(panel)} target=${Boolean(nextImg)} ok=${handedOff}`, "warn");
	return handedOff;
}

function isInGalleryContext(el) {
	const gRoot = findGalleryRoot(getElData(el, _srckey) || el);
	return Boolean(gRoot && gRoot.isConnected);
}

function getOpenGalleryRoots() {
	const now = performance.now();
	if (now - _openGalleryCache.time < _openGalleryCacheMs) return _openGalleryCache.roots;

	const winW = window.innerWidth || document.documentElement.clientWidth;
	const winH = window.innerHeight || document.documentElement.clientHeight;
	const roots = Array.from(document.querySelectorAll(_galleryRootSel)).filter((root) => {
		if (isOwnElement(root) || !isGalleryRootShown(root)) return false;
		const r = root.getBoundingClientRect();
		return r.width >= winW * _galleryViewRatio && r.height >= winH * _galleryViewRatio;
	});
	_openGalleryCache = { time: now, roots };
	return roots;
}

function isGalleryOpenedOver(orig) {
	if (!orig) return false;

	const roots = getOpenGalleryRoots();
	const baseline = _galleryBaseline.get(orig);
	if (!baseline) {
		const inView = roots.some((root) => composedContains(root, orig));
		const innerRoot = findGalleryRoot(orig);
		const innerRect = innerRoot ? innerRoot.getBoundingClientRect() : null;
		_galleryBaseline.set(orig, {
			roots: new WeakSet(roots),
			inView,
			outer: findOuterGalleryRoot(orig),
			innerArea: innerRect ? innerRect.width * innerRect.height : 0,
			pageKey: getPageKey(),
			logged: false
		});
		d("Gallery baseline", `roots=${roots.length} inView=${inView}`);
		return false;
	}

	const newRoots = roots.filter((root) => !baseline.roots.has(root) && !composedContains(root, orig));
	if (newRoots.length === 0) return false;

	const origRect = orig.isConnected ? orig.getBoundingClientRect() : null;
	const covered = Boolean(
		origRect &&
			origRect.width > 0 &&
			newRoots.some((root) => {
				const r = root.getBoundingClientRect();
				const cx = origRect.left + origRect.width / 2;
				const cy = origRect.top + origRect.height / 2;
				return cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
			})
	);
	const detachedPageChange = !orig.isConnected && getPageKey() !== baseline.pageKey;
	const detachedViewChange =
		!orig.isConnected &&
		newRoots.some((root) => {
			if (baseline.outer && !composedContains(baseline.outer, root)) return true;
			const r = root.getBoundingClientRect();
			return baseline.innerArea > 0 && Math.abs(r.width * r.height - baseline.innerArea) / baseline.innerArea > _galleryResizeRatio;
		});
	const opened = covered || detachedPageChange || detachedViewChange || !baseline.inView;
	if (!baseline.logged) {
		baseline.logged = true;
		d(
			"Gallery opened over",
			`new=${newRoots.length} covered=${covered} detached=${!orig.isConnected} view=${detachedViewChange} inView=${baseline.inView} -> ${opened}`,
			"warn"
		);
	}
	return opened;
}

function findActiveImageInGalleryRoots(accept) {
	let best = null;
	let bestArea = 0;
	for (const root of getOpenGalleryRoots()) {
		if (!accept(root)) continue;
		const img = findActiveGalleryImage(root, null);
		if (!img) continue;
		const r = root.getBoundingClientRect();
		if (r.width * r.height > bestArea) {
			best = img;
			bestArea = r.width * r.height;
		}
	}
	return best;
}

function findActiveImageInOpenGallery(excludeEl) {
	return findActiveImageInGalleryRoots((root) => !excludeEl || !composedContains(root, excludeEl));
}

function findOuterGalleryRoot(el) {
	const seen = new Set();
	let outer = null;
	for (let n = el; n && !seen.has(n); n = composedParent(n)) {
		if (n.nodeType === 1 && n.matches(_galleryRootSel)) outer = n;
		seen.add(n);
	}
	return outer;
}

function normalizeMediaUrl(raw) {
	if (!raw || raw.startsWith("data:")) return "";
	try {
		const u = new URL(raw, location.href);
		const path = u.pathname.replace(/\/fit-in\/\d+x\d+(?=\/)/gi, "").replace(_resVariantRe, "");
		return /(^|\.)twimg\.com$/.test(u.hostname) ? u.origin + path : u.origin + path + u.search;
	} catch (e) {
		return raw;
	}
}

function getBaseMediaUrl(el) {
	if (!el) return "";
	const raw =
		getElData(el, _bgsrckey) ||
		(el.tagName === "IMG" ? el.currentSrc || el.getAttribute("src") || "" : extractBgUrl(el));
	return normalizeMediaUrl(raw);
}

function findVisibleFallbackImages(excludeEl) {
	const winW = window.innerWidth || document.documentElement.clientWidth;
	const winH = window.innerHeight || document.documentElement.clientHeight;
	const preferBase = getBaseMediaUrl(excludeEl);
	let best = null;
	let bestArea = 0;
	let matched = null;
	let matchedArea = 0;

	for (const img of collectGalleryImagesDeep(document.body || document.documentElement)) {
		if (
			img === excludeEl ||
			isOwnElement(img) ||
			img.classList.contains(_zdImgCls) ||
			getElData(img, _srckey) ||
			img.hasAttribute("data-zd-float-hidden") ||
			isLockedOriginal(img)
		) {
			continue;
		}
		const r = img.getBoundingClientRect();
		const w = Math.min(r.right, winW) - Math.max(r.left, 0);
		const h = Math.min(r.bottom, winH) - Math.max(r.top, 0);
		const area = w * h;
		const isMatch = Boolean(preferBase && getBaseMediaUrl(img) === preferBase);
		if (isMatch ? w < 20 || h < 20 : w < _largestImageMinWidth || h < _largestImageMinHeight) continue;
		if (isMatch ? area <= matchedArea : matched || area <= bestArea) continue;
		if (!isImageShownInViewport(img, true) || isBlockedBySiteOverlay(img)) continue;
		if (isMatch) {
			matched = img;
			matchedArea = area;
		} else {
			best = img;
			bestArea = area;
		}
	}
	return { same: matched, largest: best };
}

function findModifiedImage(excludeEl) {
	let best = null;
	for (const el of _modifiedElements) {
		if (
			!el.isConnected ||
			(el.tagName !== "IMG" && el.tagName !== "CANVAS" && !getElData(el, _bgsrckey)) ||
			isSameImageGroup(el, excludeEl) ||
			isSameImageGroup(el, _img_element) ||
			el.hasAttribute("data-zd-float-hidden") ||
			isLockedOriginal(el) ||
			isFloatViewGone(el) ||
			!isElementModified(el) ||
			!isImageShownInViewport(el, true)
		) {
			continue;
		}
		best = el;
	}
	return best;
}

function findActiveImageInNewGallery(orig) {
	const baseline = orig ? _galleryBaseline.get(orig) : null;
	if (!baseline) return null;
	return findActiveImageInGalleryRoots((root) => !baseline.roots.has(root) && !composedContains(root, orig));
}

function resetAllForNavigation() {
	if (_isExcludedHost) return;

	destroyPanel();
	restoreOriginalDOM(false);
	_hoverTarget = null;
	_current_element = null;
	_img_element = null;

	const badge = document.getElementById("zdImg_zoomBadge");
	if (badge) badge.remove();
	setZoom();
}

function resetImagesOutsideGallery(urlChanged) {
	const activeImg = _img_element;
	const activeOrig = activeImg ? getElData(activeImg, _srckey) || activeImg : null;
	const resetOrigs = [];
	let resetActive = false;
	let resetAny = false;
	let handedOff = false;

	const isResetDue = (el, orig) => {
		if (isGalleryOpenedOver(orig)) return true;
		if (!orig.isConnected || isInGalleryContext(el)) return false;
		return urlChanged || isBlockedBySiteOverlay(orig);
	};

	const exWrapper = document.getElementById(_zdExImgId);
	if (exWrapper) {
		for (const img of Array.from(exWrapper.getElementsByTagName("img"))) {
			const orig = getElData(img, _srckey);
			if (!orig || !isResetDue(img, orig)) continue;

			if (img === activeImg) resetActive = true;
			resetAny = true;
			resetOrigs.push(orig);
			removeFloatImage(img, orig);
		}
	}

	for (const el of Array.from(_modifiedElements)) {
		if (!el || el.nodeType !== 1 || el.classList.contains(_zdImgCls) || el.classList.contains(_imgSrcViewCls)) continue;
		if (getElData(el, _srckey) || el.hasAttribute("data-zd-float-hidden")) continue;
		if (!isElementModified(el) && !el.hasAttribute("data-zd-pe-img")) continue;
		if (!isResetDue(el, el)) continue;

		if (el === activeOrig) resetActive = true;
		resetAny = true;
		resetOrigs.push(el);
		resetInlineElement(el);
	}

	if (resetActive) {
		const panel = getPanelHost();
		const nextImg = panel ? findActiveImageInNewGallery(activeOrig) : null;
		if (panel) removePanelBorder();
		_hoverTarget = null;
		_current_element = null;
		_img_element = null;
		setZoom();

		if (panel) handedOff = handOffPanelTo(nextImg);
		if (panel && !handedOff) destroyPanel();
	}
	resetOrigs.forEach((orig) => _galleryBaseline.delete(orig));
	if (resetAny) hideBadgeImmediate();
	return { any: resetAny, handedOff };
}

function getPageKey() {
	return location.origin + location.pathname + location.search;
}

function checkNavigationReset() {
	const pageKey = getPageKey();
	const urlChanged = pageKey !== _previewNavGuardUrl;
	_previewNavGuardUrl = pageKey;
	return resetImagesOutsideGallery(urlChanged).any;
}

function onPlayerFrameMessage(e) {
	if (_isExcludedHost || e.data !== _zdPlayerMsg || !e.source || e.source === window) return;

	const frame = Array.from(document.getElementsByTagName("iframe")).find((f) => f.contentWindow === e.source);
	if (!frame) return;

	_playingFrames.set(frame, performance.now());
	if (window !== window.top) window.parent.postMessage(_zdPlayerMsg, "*");
	if (!_exImgCheckRafId) _exImgCheckRafId = requestAnimationFrame(checkExImgWrapper);
}

function isBlockedBySiteOverlay(target) {
	if (!target || !location.hostname) return false;

	if (
		target.id === "zd-custom-panel" ||
		target.closest("#zd-custom-panel") ||
		target.closest('[id$="floatImgWraper"]') ||
		target.classList.contains(_zdImgCls)
	) {
		return false;
	}

	if (location.hostname.includes("bing.com")) {
		const overlay = document.getElementById("OverlayMask");
		if (overlay && window.getComputedStyle(overlay).display !== "none" && !target.closest(".idp-refresh-page-main-line")) {
			return true;
		}
	}

	return isInPlayerZone(target) || isCoveredByModalOverlay(target);
}

function findCoveringModalOverlay(el) {
	if (!el || !el.isConnected) return null;
	if (el.classList && el.classList.contains("fullscreen")) return null;

	const winW = window.innerWidth || document.documentElement.clientWidth;
	const winH = window.innerHeight || document.documentElement.clientHeight;
	const rect = el.getBoundingClientRect();
	if (rect.width === 0 || rect.height === 0) return null;

	const cx = Math.min(Math.max(rect.left + rect.width / 2, 1), winW - 1);
	const cy = Math.min(Math.max(rect.top + rect.height / 2, 1), winH - 1);
	const stack = deepElementsFromPoint(cx, cy);
	const isFloatHidden = el.hasAttribute("data-zd-float-hidden") || isLockedOriginal(el);

	let refIdx = stack.indexOf(el);
	if (refIdx === -1) {
		for (let p = composedParent(el); p && p !== document.body && p !== document.documentElement; p = composedParent(p)) {
			const idx = stack.indexOf(p);
			if (idx !== -1) {
				refIdx = idx;
				break;
			}
		}
	}

	const modals = document.querySelectorAll('[aria-modal="true"], [role="dialog"], dialog[open], [data-testid="media-gallery-modal"], sn-feed');
	for (let i = 0; i < modals.length; i++) {
		const modal = modals[i];
		const dialogRoot =
			modal.tagName === "SN-FEED"
				? modal.querySelector('[class*="EnterDone"], [class*="feedRootWrapper"]') || modal
				: modal.getAttribute("data-testid") === "media-gallery-modal"
					? modal.closest(".fixed, [style*='fixed']") || modal.parentElement || modal
					: modal;

		if (isOwnElement(dialogRoot) || composedContains(dialogRoot, el)) continue;

		if (
			dialogRoot.hasAttribute("inert") ||
			dialogRoot.closest?.("[inert]") ||
			dialogRoot.getAttribute("aria-hidden") === "true"
		) {
			continue;
		}

		const mStyle = window.getComputedStyle(dialogRoot);
		if (
			mStyle.display === "none" ||
			mStyle.visibility === "hidden" ||
			parseFloat(mStyle.opacity) < 0.01
		) {
			continue;
		}

		const mRect = dialogRoot.getBoundingClientRect();
		if (mRect.width >= winW * 0.3 && mRect.height >= winH * 0.3) {
			const modalInFront = stack.some(
				(node, idx) =>
					!isOwnElement(node) &&
					(refIdx === -1 || idx < refIdx) &&
					composedContains(dialogRoot, node)
			);
			if (!modalInFront) continue;
			return dialogRoot;
		}
	}

	if (isFloatHidden) return null;

	for (let i = 0; i < stack.length; i++) {
		const o = stack[i];
		if (o === el || (refIdx !== -1 && i >= refIdx)) break;
		if (isOwnElement(o) || o.classList?.contains(_zdImgCls) || composedContains(o, el) || composedContains(el, o)) continue;

		let matched = null;
		for (let p = o; p && p !== document.body && p !== document.documentElement; p = composedParent(p)) {
			if (p.nodeType !== 1) continue;
			if (isOwnElement(p) || composedContains(p, el)) break;
			if (p.hasAttribute?.("inert") || p.getAttribute?.("aria-hidden") === "true") break;
			const cs = window.getComputedStyle(p);
			if (cs.pointerEvents === "none") continue;
			if (cs.position === "fixed" || p.matches?.('[role="dialog"], [aria-modal="true"], dialog[open]')) {
				const r = p.getBoundingClientRect();
				if (r.width >= winW * 0.45 && r.height >= winH * 0.45) matched = p;
			}
		}
		if (matched) return matched;
	}

	return null;
}

function isCoveredByModalOverlay(el) {
	return Boolean(findCoveringModalOverlay(el));
}

function findCoveringOverlayForHandOff(el) {
	if (!el || !el.isConnected) return null;
	const winW = window.innerWidth || document.documentElement.clientWidth;
	const winH = window.innerHeight || document.documentElement.clientHeight;
	const rect = el.getBoundingClientRect();
	if (rect.width === 0 || rect.height === 0) return null;
	if (rect.right <= 20 || rect.left >= winW - 20 || rect.bottom <= 20 || rect.top >= winH - 20) return null;

	const modal = findCoveringModalOverlay(el);
	if (modal) return modal;

	const visCx = Math.min(Math.max((Math.max(rect.left, 0) + Math.min(rect.right, winW)) / 2, 1), winW - 1);
	const visCy = Math.min(Math.max((Math.max(rect.top, 0) + Math.min(rect.bottom, winH)) / 2, 1), winH - 1);
	const stack = deepElementsFromPoint(visCx, visCy);

	let refIdx = stack.indexOf(el);
	if (refIdx === -1) {
		for (let p = composedParent(el); p && p !== document.body && p !== document.documentElement; p = composedParent(p)) {
			const idx = stack.indexOf(p);
			if (idx !== -1) {
				refIdx = idx;
				break;
			}
		}
	}

	const limit = refIdx === -1 ? stack.length : refIdx;
	for (let i = 0; i < limit; i++) {
		const o = stack[i];
		if (isOwnElement(o) || o.classList?.contains(_zdImgCls) || composedContains(o, el) || composedContains(el, o)) continue;
		if (!isOpaqueCover(o, rect)) continue;

		let matched = null;
		for (let p = o; p && p !== document.body && p !== document.documentElement; p = composedParent(p)) {
			if (p.nodeType !== 1) continue;
			if (isOwnElement(p) || composedContains(p, el)) break;
			if (p.hasAttribute?.("inert") || p.getAttribute?.("aria-hidden") === "true") break;
			const cs = window.getComputedStyle(p);
			if (cs.pointerEvents === "none") continue;
			const r = p.getBoundingClientRect();
			if (r.width >= winW * _galleryViewRatio && r.height >= winH * _galleryViewRatio) matched = p;
		}
		if (matched) return matched;
	}

	return null;
}

function findFixedOverlayRoot(el) {
	if (!el || !el.isConnected) return null;
	const winW = window.innerWidth || document.documentElement.clientWidth;
	const winH = window.innerHeight || document.documentElement.clientHeight;
	let overlay = null;
	const seen = new Set();
	for (let p = composedParent(el); p && p !== document.body && p !== document.documentElement && !seen.has(p); p = composedParent(p)) {
		seen.add(p);
		if (p.nodeType !== 1 || isOwnElement(p)) continue;
		const cs = window.getComputedStyle(p);
		if (cs.position !== "fixed" || cs.pointerEvents === "none") continue;
		if ((cs.overflowY === "auto" || cs.overflowY === "scroll") && p.scrollHeight > p.clientHeight + 40) continue;
		const r = p.getBoundingClientRect();
		if (r.width >= winW * _galleryViewRatio && r.height >= winH * _galleryViewRatio) {
			overlay = p;
		}
	}
	return overlay;
}

function isFixedOverlayShown(overlay) {
	if (!overlay || !isGalleryRootShown(overlay)) return false;
	if (overlay.hasAttribute("inert") || overlay.getAttribute("aria-hidden") === "true") return false;
	const cs = window.getComputedStyle(overlay);
	if (cs.pointerEvents === "none") return false;
	const r = overlay.getBoundingClientRect();
	return r.width >= 40 && r.height >= 40;
}

function isSingleImgPage() {
	if (document.contentType && document.contentType.startsWith("image/")) return true;

	if (document.body) {
		let imgCount = 0;
		let nonImgCount = 0;

		for (let i = 0; i < document.body.childNodes.length; i++) {
			const node = document.body.childNodes[i];
			if (node.nodeType === 1) {
				if (node.tagName === "SCRIPT" || node.tagName === "STYLE" || node.tagName === "LINK") continue;
				if (node.tagName === "IMG") imgCount++;
				else nonImgCount++;
			}
		}
		if (imgCount === 1 && nonImgCount === 0) return true;
	}
	return false;
}

const _switcherSel = '[class*="image-switcher" i], [class*="imageswitcher" i], [class*="img-switcher" i]';
const _switcherMainSel = 'img[class*="main-image" i], img[class*="primary-image" i]';
const _switcherExtraSel = 'img[class*="additional-image" i], img[class*="secondary-image" i], img[class*="hover-image" i]';

function getSwitcherHost(el) {
	let host = null;
	let p = el && el.parentElement;
	for (let i = 0; i < 6 && p && p !== document.body && p !== document.documentElement; i++) {
		if (p.matches(_switcherSel)) host = p;
		p = p.parentElement;
	}
	return host;
}

function getSwitcherMainImage(el) {
	if (!el || el.tagName !== "IMG" || !el.matches(_switcherExtraSel)) return null;
	const host = getSwitcherHost(el);
	if (!host) return null;
	const main = host.querySelector(_switcherMainSel);
	if (main && main !== el) return main;
	return Array.from(host.querySelectorAll("img")).find((i) => i !== el && !i.matches(_switcherExtraSel) && !isOwnElement(i)) || null;
}

const _ownSrcAttrRe = /^data-(?:lazy-)?src(?:-|$)/i;
const _resVariantRe = /(?:[-_@]at\d+|[-_@]\d+x\d+|[-_@]\d+[wp]|@\d+x)(?=\.[a-z0-9]+(?:[?#]|$))/gi;

function isSameAssetResolutionSwitch(prevSrc, nextSrc) {
	const strip = (s) => s.split(/[?#]/)[0].replace(_resVariantRe, "");
	const a = strip(prevSrc);
	const b = strip(nextSrc);
	return Boolean(a && a === b);
}

function isOwnSrcSwitch(img, prevSrc, nextSrc) {
	if (!img || img.tagName !== "IMG" || !prevSrc || !nextSrc) return false;
	if (isSameAssetResolutionSwitch(prevSrc, nextSrc)) return true;
	const own = new Set();
	for (const attr of img.attributes) {
		if (attr.value && _ownSrcAttrRe.test(attr.name)) own.add(attr.value);
	}
	return own.has(prevSrc) && own.has(nextSrc);
}

function registerSwitcherImage(img) {
	if (!img || img.tagName !== "IMG") return;
	const host = getSwitcherHost(img);
	if (!host) return;

	let display = window.getComputedStyle(img).display;
	if (!display || display === "none") display = "block";

	if (!img.hasAttribute("data-zd-self-vis")) {
		img.setAttribute("data-zd-self-vis", img.style.visibility || "empty");
	}
	if (!host.hasAttribute("data-zd-sw-lock")) {
		const h = host.getBoundingClientRect().height;
		if (h > 0) host.style.setProperty("--zd-sw-h", `${h}px`);
	}

	img.setAttribute("data-zd-sw-active", display);
	host.setAttribute("data-zd-sw-lock", "");

	let anc = host;
	for (let i = 0; i < 8 && anc && anc !== document.body && anc.tagName !== "OL" && anc.tagName !== "UL"; i++) {
		anc.setAttribute("data-zd-sw-frame", "");
		anc = anc.parentElement;
	}

	const ae = document.activeElement;
	if (ae && ae !== document.body && ae.contains && ae.contains(host)) ae.blur();

	startSwitcherTimer();
}

function isSwitcherImgActive(el) {
	if (!el.isConnected) return false;
	if (_img_element && (_img_element === el || getElData(_img_element, _srckey) === el)) return true;
	return isLockedOriginal(el) || isElementModified(el);
}

function syncSwitcherPins() {
	document.querySelectorAll("[data-zd-sw-active]").forEach((el) => {
		if (!isSwitcherImgActive(el)) {
			el.removeAttribute("data-zd-sw-active");
			if (el.style.getPropertyPriority("visibility") !== "important") el.removeAttribute("data-zd-self-vis");
		}
	});
	document.querySelectorAll("[data-zd-sw-lock]").forEach((host) => {
		if (!host.querySelector("[data-zd-sw-active]")) {
			host.removeAttribute("data-zd-sw-lock");
			host.style.removeProperty("--zd-sw-h");
			if (!host.getAttribute("style")) host.removeAttribute("style");
		}
	});
	document.querySelectorAll("[data-zd-sw-frame]").forEach((el) => {
		if (!el.hasAttribute("data-zd-sw-lock") && !el.querySelector("[data-zd-sw-lock]")) el.removeAttribute("data-zd-sw-frame");
	});
}

function startSwitcherTimer() {
	if (!_swTimer) _swTimer = setInterval(switcherTick, 250);
}

function isPassThroughClick(e) {
	if (e.type === "auxclick" && e.button !== 1) return false;
	if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return true;
	return e.type === "auxclick" && e.button === 1;
}

function inRect(el, x, y) {
	const r = el.getBoundingClientRect();
	return r.width > 0 && r.height > 0 && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

function hasStretchedPseudo(el) {
	for (const pseudo of ["::before", "::after"]) {
		const cs = window.getComputedStyle(el, pseudo);
		if (cs && cs.content && cs.content !== "none" && cs.position === "absolute") return true;
	}
	return false;
}

function inHostOrPseudoRect(host, container, x, y) {
	if (inRect(host, x, y)) return true;
	if (container && inRect(container, x, y) && hasStretchedPseudo(host)) {
		const posAncestor = host.closest("article, figure, li, [data-sctrack]") || container;
		if (inRect(posAncestor, x, y)) return true;
	}
	return false;
}

function findFloatHiddenImgAtPoint(host, x, y) {
	for (const img of host.querySelectorAll("[data-zd-float-hidden]")) {
		if (!isOwnElement(img) && inRect(img, x, y)) return img;
	}
	return null;
}

function findInlineModifiedTargetAtPoint(host, x, y) {
	for (const el of _modifiedElements) {
		if (!el.isConnected || el === host || isOwnElement(el) || getElData(el, _srckey) || !host.contains(el)) continue;
		if (!isElementModified(el)) continue;
		if (inRect(el, x, y)) return el;
		const container = el.parentElement;
		if (container && container !== host && host.contains(container) && inRect(container, x, y)) return container;
	}
	return null;
}

function dispatchPassThroughClick(host, e) {
	e.preventDefault();
	e.stopPropagation();
	e.stopImmediatePropagation();
	const isMid = e.type === "auxclick" && e.button === 1;
	const imgTarget = host.matches("a[href]")
		? null
		: findFloatHiddenImgAtPoint(host, e.clientX, e.clientY) || findInlineModifiedTargetAtPoint(host, e.clientX, e.clientY);
	(imgTarget || host).dispatchEvent(
		new MouseEvent("click", {
			bubbles: true,
			cancelable: true,
			composed: true,
			button: 0,
			clientX: e.clientX,
			clientY: e.clientY,
			ctrlKey: e.ctrlKey || isMid,
			altKey: e.altKey,
			shiftKey: e.shiftKey,
			metaKey: e.metaKey
		})
	);
}

function findOverlayClickHost(el, x, y) {
	let node = el;
	for (let i = 0; i < 3 && node.parentElement && node.parentElement.tagName !== "BODY"; i++) {
		const p = node.parentElement;
		if (p.matches(_clickHostSel)) return p;
		for (const sib of p.children) {
			if (sib === node || isOwnElement(sib)) continue;
			if (sib.matches(_clickHostSel) && inHostOrPseudoRect(sib, p, x, y)) return sib;
			for (const h of sib.querySelectorAll(_clickHostSel)) {
				if (!isOwnElement(h) && inHostOrPseudoRect(h, p, x, y)) return h;
			}
		}
		node = p;
	}
	return null;
}

function nativeCursor(el) {
	const inl = el.style ? el.style.getPropertyValue("cursor") : "";
	const pri = inl ? el.style.getPropertyPriority("cursor") : "";
	if (inl) el.style.removeProperty("cursor");
	const c = window.getComputedStyle(el).cursor || "";
	if (inl) el.style.setProperty("cursor", inl, pri);
	return c;
}

function isPageZoomClick(host, t, x, y) {
	const cands = new Set();
	if (host && host.nodeType === 1 && !isOwnElement(host)) cands.add(host);
	if (t && t.nodeType === 1 && !isOwnElement(t)) cands.add(t);
	for (let p = t, i = 0; i < 6 && p && p !== document.body && p !== document.documentElement; i++, p = p.parentElement) {
		if (!isOwnElement(p)) cands.add(p);
		if (p === host) break;
	}
	if (host && host.querySelectorAll) {
		host.querySelectorAll("[data-zd-pe-img]").forEach((i) => cands.add(i));
	}
	if (t && t !== host && t.nodeType === 1 && !isOwnElement(t) && t.querySelectorAll) {
		t.querySelectorAll("[data-zd-pe-img]").forEach((i) => {
			if (inRect(i, x, y)) cands.add(i);
		});
	}
	for (const c of cands) {
		if (nativeCursor(c).startsWith("zoom-")) return true;
	}
	return false;
}

function getClickTarget(e) {
	const first = e.composedPath ? e.composedPath()[0] : null;
	return first && first.nodeType === 1 ? first : e.target;
}

function queryAllScoped(el, selector) {
	const root = el && el.getRootNode ? el.getRootNode() : document;
	const list = root && root.querySelectorAll ? Array.from(root.querySelectorAll(selector)) : [];
	if (root !== document) {
		for (const n of document.querySelectorAll(selector)) {
			if (!list.includes(n)) list.push(n);
		}
	}
	return list;
}

function findCardClickHost(card, x, y) {
	let first = null;
	for (const h of card.querySelectorAll(_clickHostSel)) {
		if (isOwnElement(h)) continue;
		if (inRect(h, x, y)) return h;
		if (!first) first = h;
	}
	return first;
}

function findVideoPlayerRoot(el) {
	if (!el || !el.isConnected) return null;
	const baseRect = getBaseLayoutRect(el);
	if (baseRect.width < 20 || baseRect.height < 20) return null;

	const maxW = Math.max(baseRect.width * 2, 120);
	const maxH = Math.max(baseRect.height * 2, 120);
	const isRealPlayerVideo = (v) =>
		!isOwnElement(v) && !isDecorativeVideo(v) && !composedClosest(v, _playerExcludeSel);
	const seen = new Set();
	let steps = 0;

	for (let p = composedParent(el); p && p !== document.body && p !== document.documentElement && steps < 12; p = composedParent(p)) {
		if (p.nodeType !== 1) continue;
		steps++;
		const r = p.getBoundingClientRect();
		if (r.width === 0 || r.height === 0) continue;
		if (r.width > maxW || r.height > maxH || !rectsOverlap(r, baseRect)) break;

		for (const v of p.getElementsByTagName("video")) {
			if (isRealPlayerVideo(v)) return p;
		}
		for (const v of collectVideosDeep(p, new Set(), seen)) {
			if (isRealPlayerVideo(v)) return p;
		}
	}
	return null;
}

function isInsideVideoPlayer(el) {
	return Boolean(findVideoPlayerRoot(el));
}

function findVideoPosterHost(t, x, y) {
	if (t.tagName === "IMG" || getElData(t, _bgsrckey)) return isInsideVideoPlayer(t) ? t : null;
	for (const el of _modifiedElements) {
		if (!el.isConnected || isOwnElement(el) || el.classList.contains(_zdImgCls)) continue;
		const base = getElData(el, _srckey) || el;
		if (!base.isConnected) continue;
		const root = findVideoPlayerRoot(base);
		if (root && inRect(root, x, y) && (composedContains(root, t) || composedContains(t, root))) return t;
	}
	for (const img of queryAllScoped(t, "[data-zd-pe-img]")) {
		if (isOwnElement(img) || !inRect(img, x, y)) continue;
		const root = findVideoPlayerRoot(img);
		if (root && (composedContains(root, t) || composedContains(t, root))) return img;
	}
	return null;
}

function resolvePassThrough(e) {
	const t = getClickTarget(e);
	if (!t || t.nodeType !== 1 || isOwnElement(t)) return null;
	const x = e.clientX;
	const y = e.clientY;

	let host = null;
	let kind = "";

	const path = e.composedPath ? e.composedPath() : [t];
	const panelHost = getPanelHost();
	if (panelHost && path.includes(panelHost)) return null;
	host = path.find((n) => n && n.nodeType === 1 && !isOwnElement(n) && n.matches(_clickHostSel)) || null;
	if (host) {
		kind = "path";
		const lockedCard = host.closest("[data-zd-card-lock]");
		if (lockedCard && host.getAttribute("aria-hidden") === "true" && host.hasAttribute("href")) {
			const href = host.getAttribute("href");
			const altHost = Array.from(lockedCard.querySelectorAll("a[href]")).find(
				(a) => a !== host && !isOwnElement(a) && a.getAttribute("href") === href && a.getAttribute("aria-hidden") !== "true"
			);
			if (altHost) {
				host = altHost;
				kind = "container";
			}
		}
	} else if ((t.tagName === "IMG" || t.tagName === "CANVAS") && !isOwnElement(t)) {
		host = findOverlayClickHost(t, x, y);
		if (!host && !getElData(t, _srckey) && getElData(t, _firstkey) && isElementModified(t)) {
			const restRect = getRestRect(t);
			if (restRect.width > 0 && restRect.height > 0) {
				host = findOverlayClickHost(t, restRect.left + restRect.width / 2, restRect.top + restRect.height / 2);
			}
		}
		if (!host) {
			const lockedCard = t.closest("[data-zd-card-lock]");
			if (lockedCard) host = findCardClickHost(lockedCard, x, y);
		}
		kind = "overlay";
	} else {
		host = findLockedContainerHost(t, x, y) || findModifiedContainerHost(t, x, y);
		kind = "container";
	}

	if (!host) {
		host = findCardClickTarget(x, y);
		if (host) kind = "container";
	}

	if (!host) {
		host = findVideoPosterHost(t, x, y);
		if (host) kind = host === t ? "video" : "container";
	}

	if (!host || isPageZoomClick(host, t, x, y)) return null;
	return { host, kind };
}

function findModifiedContainerHost(t, x, y) {
	for (const el of _modifiedElements) {
		if (!el.isConnected) continue;
		const src = getElData(el, _srckey);
		const base = src && src.isConnected ? src : el;
		if (base === t || isOwnElement(base) || base.classList.contains(_zdImgCls) || isInsideVideoPlayer(base)) continue;

		let inContainer = false;
		let container = base.parentElement;
		for (let i = 0; i < 3 && container && container.tagName !== "BODY"; i++, container = container.parentElement) {
			if (!inRect(container, x, y)) continue;
			if (composedContains(container, t) || composedContains(t, container)) {
				inContainer = true;
				break;
			}
		}
		if (!inContainer) continue;

		const rest = getRestRect(base);
		if (rest.width === 0 || rest.height === 0) continue;
		const cx = rest.left + rest.width / 2;
		const cy = rest.top + rest.height / 2;

		for (let n = base; n; n = composedParent(n)) {
			if (n.nodeType === 1 && !isOwnElement(n) && n.matches(_clickHostSel)) return n;
		}
		const overlayHost = findOverlayClickHost(base, cx, cy);
		if (overlayHost) return overlayHost;
		const card = findMediaCardRoot(base) || base.closest("[data-zd-card-lock]");
		const cardHost = card ? findCardClickHost(card, cx, cy) : null;
		if (cardHost) return cardHost;
	}
	return null;
}

function findLockedContainerHost(t, x, y) {
	if (!t || t.nodeType !== 1 || isOwnElement(t) || t.matches(_clickHostSel)) return null;
	for (const pe of queryAllScoped(t, "[data-zd-pe]")) {
		if (isOwnElement(pe) || !t.contains(pe)) continue;
		if (pe !== t && pe.matches(_clickHostSel) && inHostOrPseudoRect(pe, t, x, y)) return pe;
		for (const h of pe.querySelectorAll(_clickHostSel)) {
			if (isOwnElement(h)) continue;
			const container = h.closest("article, figure, li, [data-sctrack], [data-zd-card-lock]") || pe.parentElement || t;
			if (inHostOrPseudoRect(h, container, x, y)) return h;
		}
	}
	const lockedCard = t.closest ? t.closest("[data-zd-card-lock]") : null;
	if (lockedCard) {
		const lockedImg = lockedCard.querySelector("[data-zd-pe-img]");
		const imgBox = lockedImg ? lockedImg.closest("[data-zd-pe]") || lockedImg.parentElement : null;
		if ((lockedImg && inRect(lockedImg, x, y)) || (imgBox && inRect(imgBox, x, y))) {
			return findCardClickHost(lockedCard, x, y);
		}
	}
	return null;
}

function findUnlockedTargetAtPoint(x, y) {
	const locked = Array.from(document.querySelectorAll("[data-zd-pe]"));
	const saved = locked.map((el) => [el, el.style.getPropertyValue("pointer-events"), el.style.getPropertyPriority("pointer-events")]);
	let target = null;
	try {
		for (const el of locked) {
			const orig = el.getAttribute("data-zd-pe");
			if (orig && orig !== "empty") el.style.setProperty("pointer-events", orig);
			else el.style.removeProperty("pointer-events");
		}
		target =
			deepElementsFromPoint(x, y).find(
				(n) =>
					n &&
					n.nodeType === 1 &&
					!isOwnElement(n) &&
					!isInsidePanel(n) &&
					!n.classList.contains(_zdImgCls) &&
					!n.hasAttribute("data-zd-pe-img") &&
					!n.hasAttribute("data-zd-float-hidden")
			) || null;
	} finally {
		for (const [el, value, priority] of saved) {
			if (value) el.style.setProperty("pointer-events", value, priority);
			else el.style.removeProperty("pointer-events");
		}
	}
	return target;
}

function findCardClickTarget(x, y) {
	for (const el of _modifiedElements) {
		if (!el.isConnected) continue;
		const src = getElData(el, _srckey);
		const base = src && src.isConnected ? src : el;
		if (isOwnElement(base) || base.classList.contains(_zdImgCls) || !getElData(base, _bgsrckey)) continue;

		const card = base.closest("[data-zd-card-lock]");
		if (!card || !(inRect(card, x, y) || inRect(el, x, y) || inRect(base, x, y))) continue;

		const points = [[x, y]];
		const rest = getRestRect(base);
		if (rest.width > 0 && rest.height > 0) points.push([rest.left + rest.width / 2, rest.top + rest.height / 2]);
		for (const [px, py] of points) {
			const target = findUnlockedTargetAtPoint(px, py);
			if (target && target !== card && card.contains(target)) return target;
		}
	}
	return null;
}

function hasPassThroughHost(e) {
	return Boolean(resolvePassThrough(e));
}

function isFreeControlClick(e, el) {
	const t = getClickTarget(e);
	const ctrl = t && t.closest ? t.closest("button, [role='button']") : null;
	if (!ctrl || isOwnElement(ctrl) || ctrl.contains(el)) return false;

	const x = e.clientX;
	const y = e.clientY;
	const data = getElData(el, _firstkey);
	const floatingCopy = data && data.id ? document.getElementById(data.id) : null;
	return !inRect(el, x, y) && !(floatingCopy && inRect(floatingCopy, x, y));
}

function forwardPassThroughClick(e, el) {
	if ((e.type !== "click" && e.type !== "auxclick") || !e.isTrusted || !isPassThroughClick(e)) return false;
	if (el.classList.contains(_zdImgCls)) return false;

	const r = resolvePassThrough(e);
	if (!r || (r.kind !== "overlay" && r.kind !== "container" && r.kind !== "path")) return false;
	if (r.kind === "path" && !isElementModified(el)) return false;

	dispatchPassThroughClick(r.host, e);
	return true;
}

function isContainerPassThrough(e, r) {
	if (!r) return false;
	if (r.kind === "container") return true;
	if (r.kind !== "path" || !r.host.closest("[data-zd-card-lock]") || !r.host.querySelector("[data-zd-pe-img]")) return false;
	const t = getClickTarget(e);
	return Boolean(t) && t.tagName !== "IMG" && t.tagName !== "CANVAS";
}

function onContainerPassThroughClick(e) {
	if (_isExcludedHost || !e.isTrusted || _rightBtnDown || !isPassThroughClick(e)) return;
	if (e.type === "click" && e.button !== 0) return;
	if (e.type === "auxclick" && e.button !== 1) return;

	const r = resolvePassThrough(e);
	if (isContainerPassThrough(e, r)) dispatchPassThroughClick(r.host, e);
}

function onMiddleDownPassThrough(e) {
	if (_isExcludedHost || !e.isTrusted || e.button !== 1 || _rightBtnDown) return;
	const t = getClickTarget(e);
	if (t && t.classList && t.classList.contains(_zdImgCls)) return;
	const r = resolvePassThrough(e);
	if (isContainerPassThrough(e, r) || (r && t && (t.tagName === "IMG" || t.tagName === "CANVAS"))) {
		e.preventDefault();
	}
}

function onSwitcherLinkClick(e) {
	if (_isExcludedHost || !document.querySelector("[data-zd-sw-lock]")) return;
	if (isPassThroughClick(e) && !_rightBtnDown) return;
	const path = e.composedPath ? e.composedPath() : [e.target];
	for (const n of path) {
		if (!n || n.tagName !== "A" || isOwnElement(n)) continue;
		if (n.querySelector("[data-zd-sw-lock]") || n.closest("[data-zd-sw-lock]")) {
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();
			return;
		}
	}
}

function switcherTick() {
	syncSwitcherPins();
	if (!document.querySelector("[data-zd-sw-active]") && _swTimer) {
		clearInterval(_swTimer);
		_swTimer = null;
	}
}

const _bgDupOwners = new WeakMap();

function restoreBgDuplicates(owner) {
	document.querySelectorAll("[data-zd-orig-bg]").forEach((dup) => {
		if (owner && _bgDupOwners.get(dup) !== owner) return;
		const origBg = dup.getAttribute("data-zd-orig-bg");
		dup.removeAttribute("data-zd-orig-bg");
		_bgDupOwners.delete(dup);
		if (origBg === "empty") dup.style.removeProperty("background-image");
		else dup.style.backgroundImage = origBg;
	});
}

function restoreSelfVisibility(el) {
	if (!el) return;
	el.removeAttribute("data-zd-float-hidden");
	if (getElData(el, _bgsrckey)) {
		const srcData = getElData(el, _firstkey);
		el.style.removeProperty("background-image");
		if (srcData?.origStyle?.backgroundImage !== undefined) {
			el.style.backgroundImage = srcData.origStyle.backgroundImage;
		}
		restoreBgDuplicates(el);
	}
	const saved = el.getAttribute("data-zd-self-vis");
	if (saved === null) {
		el.style.removeProperty("visibility");
		return;
	}
	el.removeAttribute("data-zd-self-vis");
	if (saved === "empty") el.style.removeProperty("visibility");
	else el.style.visibility = saved;
}

function touchModified(el) {
	if (!el) return;
	_modifiedElements.delete(el);
	_modifiedElements.add(el);
}

function getBaseData(el) {
	if (!el) return null;
	return getElData(getElData(el, _srckey) || el, _firstkey) || null;
}

function getBaseFilter(el) {
	return getBaseData(el)?.baseFilter || "";
}

function getBaseOpacity(el) {
	const base = getBaseData(el)?.baseOpacity;
	return base > 0 ? base : 1;
}

function getFilterEffects(el) {
	const fx = getElData(el, _fxkey);
	return { invert: Boolean(fx?.invert), gray: Boolean(fx?.gray) };
}

function isPixelMode(el) {
	return Boolean(getElData(el, _pixelkey));
}

function hasEffectMods(el) {
	const fx = getFilterEffects(el);
	return fx.invert || fx.gray || isPixelMode(el);
}

function setPixelMode(el, on) {
	if (!el) return;
	if (on) {
		setElData(el, _pixelkey, true);
		el.style.setProperty("image-rendering", "pixelated", "important");
	} else {
		restoreBaseRendering(el);
	}
}

function getBrightnessPct(el) {
	const val = getElData(el, _brightkey);
	return typeof val === "number" ? val : 100;
}

function getOpacityPct(el) {
	const val = getElData(el, _opackey);
	return typeof val === "number" ? val : 100;
}

function getZoomPct(w, sw) {
	return sw > 0 ? Math.max(1, Math.round((w / sw) * 100)) : 100;
}

function restoreBaseFilter(el) {
	if (!el) return;
	const isFloat = Boolean(getElData(el, _srckey));
	const fx = getFilterEffects(el);
	const hadOwn = getBrightnessPct(el) !== 100 || fx.invert || fx.gray;
	clearElData(el, _brightkey);
	clearElData(el, _fxkey);
	if (!isFloat && !hadOwn) return;

	const data = getBaseData(el);
	const val = (isFloat ? data?.baseFilter : data?.origStyle?.filter) || "";

	if (val) el.style.setProperty("filter", val, isFloat ? "important" : "");
	else el.style.removeProperty("filter");
}

function restoreBaseOpacity(el) {
	if (!el) return;
	const isFloat = Boolean(getElData(el, _srckey));
	const hadOwn = getOpacityPct(el) !== 100;
	clearElData(el, _opackey);
	if (!isFloat && !hadOwn) return;

	const data = getBaseData(el);
	const base = getBaseOpacity(el);
	const val = (isFloat ? (base !== 1 ? String(base) : "") : data?.origStyle?.opacity) || "";

	if (val) el.style.setProperty("opacity", val, isFloat ? "important" : "");
	else el.style.removeProperty("opacity");
}

function restoreBaseRendering(el) {
	if (!el) return;
	const isFloat = Boolean(getElData(el, _srckey));
	const hadOwn = isPixelMode(el);
	clearElData(el, _pixelkey);
	if (!isFloat && !hadOwn) return;

	const val = (isFloat ? "" : getBaseData(el)?.origStyle?.imageRendering) || "";

	if (val) el.style.imageRendering = val;
	else el.style.removeProperty("image-rendering");
}

function restoreFilterAndOpacity(el) {
	restoreBaseOpacity(el);
	restoreBaseFilter(el);
	restoreBaseRendering(el);
}

function applyFilterAndOpacity(el, opac, bright, fx = getFilterEffects(el)) {
	if (!el) return;
	if (opac === 100) {
		restoreBaseOpacity(el);
	} else {
		setElData(el, _opackey, opac);
		const val = Math.round(getBaseOpacity(el) * opac * 100) / 10000;
		el.style.setProperty("opacity", String(val), "important");
	}

	const invert = Boolean(fx.invert);
	const gray = Boolean(fx.gray);
	const parts = [];
	if (bright !== 100) parts.push(`brightness(${bright}%)`);
	if (invert) parts.push("invert(1)");
	if (gray) parts.push("grayscale(1)");

	if (!parts.length) {
		restoreBaseFilter(el);
	} else {
		setElData(el, _brightkey, bright);
		setElData(el, _fxkey, { invert, gray });
		el.style.setProperty("filter", `${getBaseFilter(el)} ${parts.join(" ")}`.trim(), "important");
	}
}

function getExportEffectsFilter(el) {
	const fx = getFilterEffects(el);
	return [fx.invert ? "invert(1)" : "", fx.gray ? "grayscale(1)" : ""].filter(Boolean).join(" ");
}

function getExportFilter(filter, scale) {
	if (!filter || filter.includes("url(")) return "";
	if (scale === 1) return filter;
	return filter.replace(/(-?[\d.]+)px/g, (m, num) => `${parseFloat(num) * scale}px`);
}

function getCoverCropRect(fit, objPos, natW, natH, boxW, boxH) {
	if (fit !== "cover" || !(natW > 0 && natH > 0)) return null;

	const scale = Math.max(boxW / natW, boxH / natH);
	const sw = boxW / scale;
	const sh = boxH / scale;
	const pos = (objPos || "50% 50%").trim().split(/\s+(?![^(]*\))/);
	const left = resolveObjectPos(pos[0], boxW - natW * scale, 1);
	const top = resolveObjectPos(pos[1] ?? "50%", boxH - natH * scale, 1);

	return {
		sx: Math.max(0, Math.min(natW - sw, -left / scale)),
		sy: Math.max(0, Math.min(natH - sh, -top / scale)),
		sw,
		sh
	};
}

function isElementModified(el) {
	if (!el || !el.isConnected) return false;
	if (getElData(el, _srckey) || isPinned(el) || el.classList.contains(_zdImgCls) || el.classList.contains(_draggedCls)) return true;

	const d = getElData(el, _firstkey);
	const s = getElData(el, _sizekey);
	const r = getElData(el, _rotkey) || 0;
	const fx = getElData(el, _flipXkey) || 1;
	const fy = getElData(el, _flipYkey) || 1;
	const hasOpac = getOpacityPct(el) !== 100;
	const hasBright = getBrightnessPct(el) !== 100;

	if (d && s && (Math.abs(s.w - d.sw) > 2 || Math.abs(s.h - d.sh) > 2)) return true;
	return r !== 0 || fx !== 1 || fy !== 1 || hasOpac || hasBright || hasEffectMods(el);
}

function getRedirectedTarget(el) {
	if (!el) return el;
	const host = el.closest ? el.closest(".imgContainer, .richImage") : null;
	if (host) {
		const ovrr = host.querySelector("img.ovrr");
		if (ovrr && ovrr !== el && !isInactiveImageTarget(ovrr)) {
			el = ovrr;
		}
	}
	const swMain = getSwitcherMainImage(el);
	if (swMain) {
		registerSwitcherImage(swMain);
		el = swMain;
	}
	const hData = getElData(el, _firstkey);
	if (hData && hData.id && !getElData(el, _srckey)) {
		const floatingCopy = document.getElementById(hData.id);
		if (floatingCopy && floatingCopy.classList.contains(_zdImgCls)) {
			return floatingCopy;
		}
	}
	return el;
}

function findNextModifiedImage(excludeImg) {
	const isExcluded = (target) => {
		if (!target) return true;
		if (excludeImg) {
			if (target === excludeImg || getElData(target, _srckey) === excludeImg) return true;
			const excSrc = getElData(excludeImg, _srckey);
			if (excSrc && (target === excSrc || getElData(target, _srckey) === excSrc)) return true;
		}
		return false;
	};

	const modArr = Array.from(_modifiedElements);
	for (let i = modArr.length - 1; i >= 0; i--) {
		const el = getRedirectedTarget(modArr[i]);
		if (el && el.isConnected && !isExcluded(el) && isElementModified(el)) {
			return el;
		}
	}

	const exImgWrapper = document.getElementById(_zdExImgId);
	if (exImgWrapper) {
		const floatImgs = Array.from(exImgWrapper.querySelectorAll(`img.${_zdImgCls}`));
		for (let i = floatImgs.length - 1; i >= 0; i--) {
			const fImg = floatImgs[i];
			if (fImg && fImg.isConnected && !isExcluded(fImg) && isElementModified(fImg)) {
				return fImg;
			}
		}
	}

	return null;
}

function getTargetForPanel() {
	const next = findNextModifiedImage(null);
	if (next) return next;
	if (_lastResetElement && _lastResetElement.isConnected) return _lastResetElement;
	return null;
}

function getElData(el, key) {
	if (!el || !elementDataMap.has(el)) return undefined;
	return elementDataMap.get(el)[key];
}

function setElData(el, key, value) {
	if (!el) return;
	touchModified(el);
	if (!elementDataMap.has(el)) {
		elementDataMap.set(el, {});
	}
	elementDataMap.get(el)[key] = value;
}

function clearElData(el, key) {
	const rec = el && elementDataMap.get(el);
	if (rec) delete rec[key];
}

function isLockedOriginal(el) {
	if (!el) return false;
	const data = getElData(el, _firstkey);
	if (data && data.id && !getElData(el, _srckey)) {
		const floatingCopy = document.getElementById(data.id);
		if (floatingCopy && floatingCopy.classList.contains(_zdImgCls)) return true;
	}
	return false;
}

function detachGlobalPointerListeners(force = false) {
	if (!force && (_rotParam || _zoomParam || _dragParam)) return;
	window.removeEventListener("pointermove", onGlobalMouseMove, true);
	window.removeEventListener("pointerup", onGlobalMouseUp, true);
	window.removeEventListener("pointercancel", onGlobalMouseUp, true);
}

function cancelDrag() {
	if (!_dragParam) return;
	if (_dragParam.obj) _dragParam.obj.classList.remove("zdImgCls_draggingCur");
	_dragParam = null;
	detachGlobalPointerListeners();
}

function isSameImageGroup(a, b) {
	if (!a || !b) return false;
	return a === b || getElData(a, _srckey) === b || getElData(b, _srckey) === a;
}

function startRotation(e, targetEl) {
	if (_isExcludedHost) return;

	const el = targetEl || _img_element || _current_element;
	if (!el) return;

	cancelDrag();

	if (!_img_element || (getPanelHost() && !isSameImageGroup(_img_element, el))) {
		setZoom(el, null, true);
		syncPanelValues();
	}

	if (_rclickTimer) {
		clearTimeout(_rclickTimer);
		_rclickTimer = null;
	}
	if (_badgeTimer) {
		clearTimeout(_badgeTimer);
		_badgeTimer = null;
	}

	const target = _img_element || el;
	disableAnim(target);
	syncBaseRect(target);
	ensureElevatedZIndex(target);
	target.classList.add("zdImgCls_actionActive");

	const rect = target.getBoundingClientRect();
	const cx = rect.left + rect.width / 2;
	const cy = rect.top + rect.height / 2;
	const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
	const baseRot = getElData(target, _rotkey) || 0;

	_rotParam = {
		obj: target,
		cx,
		cy,
		startAngle,
		baseRot,
		hasRotated: false
	};

	_ctx_show = false;
	showZoomBadge();

	window.addEventListener("pointermove", onGlobalMouseMove, true);
	window.addEventListener("pointerup", onGlobalMouseUp, true);
	window.addEventListener("pointercancel", onGlobalMouseUp, true);
	d("Rotation Start", `deg: ${baseRot}`);
}

function handleRotationMove(e) {
	if (!_rotParam || !_rotParam.obj) return;

	const curAngle = Math.atan2(e.clientY - _rotParam.cy, e.clientX - _rotParam.cx) * (180 / Math.PI);
	const delta = curAngle - _rotParam.startAngle;
	const newDeg = normalizeRot(Math.round(_rotParam.baseRot + delta));

	imgRotate(newDeg, _rotParam.obj);
	showZoomBadge();

	_rotParam.hasRotated = true;
	markRcModified(_rotParam.obj);
	_ctx_show = false;

	e.preventDefault();
	e.stopPropagation();
}

function scheduleBadgeFadeOut() {
	if (_rightBtnDown) return;
	if (_badgeTimer) clearTimeout(_badgeTimer);
	_badgeTimer = setTimeout(() => {
		const b = document.getElementById("zdImg_zoomBadge");
		if (b && !_rightBtnDown && !_rotParam && !_zoomParam) {
			b.style.opacity = "0";
		}
	}, 800);
}

function stopRotation() {
	if (!_rotParam) return;
	if (_rotParam.obj) _rotParam.obj.classList.remove("zdImgCls_actionActive");
	if (_rotParam.hasRotated) {
		_cancelNextClick = true;
		_ctx_show = false;
	}
	_rotParam = null;
	detachGlobalPointerListeners();
	d("Rotation End", "");

	scheduleBadgeFadeOut();
	refreshShortcutTimeout();
}

function startQuickZoom(e, targetEl) {
	if (_isExcludedHost) return;

	const el = targetEl || _img_element || _current_element;
	if (!el) return;

	cancelDrag();

	if (!_img_element || (getPanelHost() && !isSameImageGroup(_img_element, el))) {
		setZoom(el, null, true);
		syncPanelValues();
	}

	if (_rclickTimer) {
		clearTimeout(_rclickTimer);
		_rclickTimer = null;
	}
	if (_badgeTimer) {
		clearTimeout(_badgeTimer);
		_badgeTimer = null;
	}

	let target = _img_element || el;
	disableAnim(target);
	syncBaseRect(target);
	const currentSize = getElData(target, _sizekey) || { w: target.offsetWidth, h: target.offsetHeight };
	const src_elem = getElData(target, _srckey);
	const isSinglePageImg = _singleImgPage && target.classList.contains(_imgSrcViewCls);

	if (!src_elem && !isSinglePageImg) {
		generateImgEx({ w: currentSize.w, h: currentSize.h });
		target = _img_element;
	}

	const freshSize = getElData(target, _sizekey) || currentSize;

	disableAnim(target);
	ensureElevatedZIndex(target);
	target.classList.add("zdImgCls_actionActive");

	_zoomParam = {
		obj: target,
		startY: e.clientY,
		startW: freshSize.w,
		startH: freshSize.h,
		hasZoomed: false
	};

	_ctx_show = false;
	showZoomBadge();

	window.addEventListener("pointermove", onGlobalMouseMove, true);
	window.addEventListener("pointerup", onGlobalMouseUp, true);
	window.addEventListener("pointercancel", onGlobalMouseUp, true);
	d("QuickZoom Start", `W: ${_zoomParam.startW}`);
}

function handleQuickZoomMove(e) {
	if (!_zoomParam || !_zoomParam.obj) return;

	const deltaY = e.clientY - _zoomParam.startY;
	const scale = Math.exp(deltaY * 0.01);

	let newW = _zoomParam.startW * scale;
	let newH = _zoomParam.startH * scale;

	const data = getElData(_zoomParam.obj, _firstkey);
	if (data && newW < 20) {
		newW = 20;
		newH = (data.sh / data.sw) * 20;
	}

	const limSize = clampMaxSide(newW, newH);
	setImageRect({ w: limSize.w, h: limSize.h });
	showZoomBadge();

	_zoomParam.hasZoomed = true;
	markRcModified(_zoomParam.obj);
	_ctx_show = false;

	e.preventDefault();
	e.stopPropagation();
}

function stopQuickZoom() {
	if (!_zoomParam) return;
	if (_zoomParam.obj) _zoomParam.obj.classList.remove("zdImgCls_actionActive");
	if (_zoomParam.hasZoomed) {
		_cancelNextClick = true;
		_ctx_show = false;
	}
	_zoomParam = null;
	detachGlobalPointerListeners();
	d("QuickZoom End", "");

	scheduleBadgeFadeOut();
	refreshShortcutTimeout();
}

function onGlobalMouseMove(e) {
	if (_rotParam) {
		handleRotationMove(e);
	} else if (_zoomParam) {
		handleQuickZoomMove(e);
	} else if (_dragParam) {
		imgDrag(e.clientX, e.clientY);
		e.preventDefault();
		e.stopPropagation();
		e.stopImmediatePropagation();
	}
}

function onGlobalMouseUp(e) {
	let stoppedAction = false;
	if (_rotParam) {
		stopRotation();
		stoppedAction = true;
	}
	if (_zoomParam) {
		stopQuickZoom();
		stoppedAction = true;
	}
	if (_dragParam) {
		const draggedObj = _dragParam.obj;
		if (draggedObj) draggedObj.classList.remove("zdImgCls_draggingCur");
		if (_draggingCnt > 2) _cancelNextClick = true;
		_dragParam = null;
		const panelHost = getPanelHost();
		if (draggedObj && panelHost && !panelHost.matches(":hover") && !panelHasFocus()) clearBorderStyles(draggedObj);
		d("Drag End", "");
		stoppedAction = true;
	}

	if (stoppedAction) {
		e.preventDefault();
		e.stopPropagation();
		e.stopImmediatePropagation();
	}

	detachGlobalPointerListeners();
}

function isEditableTarget(el) {
	if (!el) return false;
	const tag = el.tagName ? el.tagName.toUpperCase() : "";
	if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
	if (el.isContentEditable) return true;
	return Boolean(el.getAttribute && el.getAttribute("role") === "textbox");
}

function updateHoverTarget(data) {
	const { x, y, path } = data;

	let t = data.target;
	if (path.length > 0) {
		t = path.find((el) => el.tagName === "IMG" || el.tagName === "CANVAS") || path[0];
	}

	const visualImg = getVisualTarget(x, y, t, false);
	if (visualImg && (visualImg.tagName === "IMG" || visualImg.tagName === "CANVAS")) {
		t = visualImg;
	}

	if (!t || isBlockedBySiteOverlay(t)) {
		_hoverTarget = null;
		return;
	}

	const panel = getPanelHost();
	if (panel && (t === panel || panel.contains(t) || path.includes(panel))) {
		_hoverTarget = null;
		return;
	}
	if (isInactiveImageTarget(t, x, y)) {
		_hoverTarget = findBgThumbUnderPoint(x, y);
		return;
	}

	if (t.tagName === "IMG" || t.tagName === "CANVAS" || (t.classList && t.classList.contains(_zdImgCls))) {
		const rect = t.getBoundingClientRect();
		if (rect.width > 0 && rect.height > 0) {
			_hoverTarget = t;
			return;
		}
	}

	if (_hoverTarget && _hoverTarget !== t && _hoverTarget.tagName === "IMG" && hitCheck(_hoverTarget, x, y)) {
		return;
	}

	if (t.tagName !== "BODY" && t.tagName !== "HTML") {
		const imgs = t.getElementsByTagName("img");
		for (let i = 0; i < imgs.length && i < 3; i++) {
			const img = imgs[i];
			const rect = img.getBoundingClientRect();
			if (rect.width > 0 && rect.height > 0 && hitCheck(img, x, y)) {
				_hoverTarget = img;
				return;
			}
		}
	}

	const wrapper = t.closest("a, button, picture, figure") || t.parentNode;
	if (wrapper && wrapper.querySelector) {
		const img = wrapper.querySelector("img, canvas");
		if (img) {
			const rect = img.getBoundingClientRect();
			if (rect.width > 0 && rect.height > 0 && hitCheck(img, x, y)) {
				_hoverTarget = img;
				return;
			}
		}
	}

	if (extractBgUrlIfEnabled(t)) {
		const rect = t.getBoundingClientRect();
		if (rect.width > 0 && rect.height > 0) {
			_hoverTarget = t;
			return;
		}
	}

	const bgThumb = findBgThumbUnderPoint(x, y);
	if (bgThumb) {
		_hoverTarget = bgThumb;
		return;
	}

	_hoverTarget = null;
}

function ensureKeyboardFocus() {
	if (!_zoom_enableKeyShortcuts) return;

	const now = Date.now();
	if (now - _lastFocusAttempt < 300) return;

	const ae = document.activeElement;
	if (isEditableTarget(ae)) return;

	const focusInChildFrame = Boolean(ae && (ae.tagName === "IFRAME" || ae.tagName === "FRAME"));
	if (document.hasFocus() && !focusInChildFrame) return;

	_lastFocusAttempt = now;
	try {
		if (focusInChildFrame) ae.blur();
		window.focus();
	} catch (err) {}
}

function flushHoverUpdate() {
	if (_hoverTimer) {
		clearTimeout(_hoverTimer);
		_hoverTimer = 0;
	}
	const data = _hoverEventData;
	_hoverEventData = null;
	if (!data || _isExcludedHost) return;
	if ((_rightBtnDown && _img_element) || _rotParam || _zoomParam || _dragParam) return;
	updateHoverTarget(data);
	if (_hoverTarget && _hoverTarget.isConnected) ensureKeyboardFocus();
}

function preloadBgNaturalSize(el, url) {
	if (!el || !url || /^data:image\/svg|\.svg(?:[?#]|$)/i.test(url)) return;
	const cached = getElData(el, _bgsizekey);
	if (cached && cached.url === url) return;

	const probe = new Image();
	const save = () => {
		if (probe.naturalWidth > 0 && probe.naturalHeight > 0) {
			setElData(el, _bgsizekey, { url, w: probe.naturalWidth, h: probe.naturalHeight });
			if (getElData(el, _firstkey) && !isElementModified(el)) {
				syncBaseRect(el);
			}
			if (getPanelHost() && (_img_element === el || getElData(_img_element, _srckey) === el)) {
				syncPanelValues();
				if (isPanelHovered() || panelHasFocus()) applyPanelBorder();
			}
		}
	};
	probe.onload = save;
	probe.src = url;
	if (probe.complete) save();
}

const _blurPosterBgSel = '[class*="blur-bg-image" i]';
const _mediaThumbBgSel = `.vjs-poster, [class*="poster" i], ${_blurPosterBgSel}, [class*="thumbnail" i], [role="img"], image, [data-testid*="video" i] *`;
const _blurBgCanvasSel = 'canvas[class*="blur" i]';
const _svgNs = "http://www.w3.org/2000/svg";
const _svgAlignPct = { Min: "0%", Mid: "50%", Max: "100%" };

function extractBgUrl(el) {
	const bg = window.getComputedStyle(el).backgroundImage;
	if (!bg || bg === "none" || !bg.includes("url")) return "";
	const match = bg.match(/url\(['"]?(.*?)['"]?\)/i);
	return match ? match[1] : "";
}

function findHiddenImgSibling(el) {
	const parent = el && el.nodeType === 1 ? el.parentElement : null;
	if (!parent || el.tagName === "IMG" || el.tagName === "CANVAS" || el.tagName === "VIDEO") return null;

	let bgUrl = null;
	for (const sib of parent.children) {
		if (sib === el || sib.tagName !== "IMG" || isOwnElement(sib)) continue;
		const imgSrc = sib.currentSrc || sib.src;
		if (!imgSrc || parseFloat(window.getComputedStyle(sib).opacity) >= 0.05) continue;
		if (bgUrl === null) bgUrl = extractBgUrl(el);
		if (bgUrl && (bgUrl === sib.currentSrc || bgUrl === sib.src)) return sib;
	}
	return null;
}

function findBgSiblingForHiddenImg(img) {
	const parent = img && img.tagName === "IMG" ? img.parentElement : null;
	if (!parent || isOwnElement(img)) return null;
	const imgSrc = img.currentSrc || img.src;
	if (!imgSrc || parseFloat(window.getComputedStyle(img).opacity) >= 0.05) return null;

	for (const sib of parent.children) {
		if (sib === img || sib.tagName === "IMG" || sib.tagName === "CANVAS" || sib.tagName === "VIDEO" || isOwnElement(sib)) continue;
		const bgUrl = extractBgUrl(sib);
		if (bgUrl && (bgUrl === img.currentSrc || bgUrl === img.src)) return sib;
	}
	return null;
}

function isMediaThumbBgElement(el) {
	return Boolean(el && ((el.matches && el.matches(_mediaThumbBgSel)) || findHiddenImgSibling(el)));
}

function isBlurBgCanvas(el) {
	if (!el || el.tagName !== "CANVAS" || !el.matches(_blurBgCanvasSel)) return false;
	return Boolean(el.parentElement && el.parentElement.querySelector(_blurPosterBgSel) && findVideoPlayerRoot(el));
}

function isSvgImageElement(el) {
	return Boolean(el && el.nodeType === 1 && el.namespaceURI === _svgNs && el.localName === "image");
}

function getSvgImageUrl(el) {
	const raw = (el.getAttribute("href") || el.getAttribute("xlink:href") || "").trim();
	if (!raw) return "";
	try {
		return new URL(raw, el.baseURI || document.baseURI).href;
	} catch (e) {
		return "";
	}
}

function getSvgImageFit(el) {
	const [align = "xMidYMid", mode = "meet"] = (el.getAttribute("preserveAspectRatio") || "").trim().split(/\s+/);
	if (align === "none") return { size: "100% 100%", pos: "50% 50%" };
	const m = align.match(/^x(Min|Mid|Max)Y(Min|Mid|Max)$/);
	return {
		size: mode === "slice" ? "cover" : "contain",
		pos: m ? `${_svgAlignPct[m[1]]} ${_svgAlignPct[m[2]]}` : "50% 50%"
	};
}

function extractSvgImageUrl(el) {
	const url = getSvgImageUrl(el);
	if (!url) return false;
	setElData(el, _bgsrckey, url);
	preloadBgNaturalSize(el, url);
	return true;
}

function extractBgUrlIfEnabled(el) {
	if (!el || el.tagName === "BODY" || el.tagName === "HTML") return false;
	if (isSvgImageElement(el)) return extractSvgImageUrl(el);
	const imgSibling = findHiddenImgSibling(el);
	if (!_zoom_bgImg && !imgSibling && !(el.matches && el.matches(_mediaThumbBgSel))) return false;
	const url = extractBgUrl(el);
	if (url) {
		setElData(el, _bgsrckey, url);
		if (imgSibling && !isSvgSource(imgSibling) && imgSibling.naturalWidth > 0 && imgSibling.naturalHeight > 0) {
			setElData(el, _bgsizekey, { url, w: imgSibling.naturalWidth, h: imgSibling.naturalHeight });
		} else {
			preloadBgNaturalSize(el, url);
		}
		return true;
	}
	return false;
}

function isBgTargetBlocked(el) {
	if (_zoom_bgImg || !el || el.nodeType !== 1) return false;
	if (["IMG", "CANVAS", "VIDEO"].includes(el.tagName) || isMediaThumbBgElement(el)) return false;
	const bg = window.getComputedStyle(el).backgroundImage;
	return bg !== "none" && bg.includes("url");
}

const _bgThumbCandSel = '[style*="background-image"], [class*="poster" i], [class*="thumbnail" i], [role="img"], image';

function findBgThumbUnderPoint(x, y, stack) {
	if (typeof x !== "number" || typeof y !== "number") return null;
	const pointStack = (stack || deepElementsFromPoint(x, y)).filter((o) => o && o.nodeType === 1 && !isOwnElement(o) && !isInsidePanel(o));
	const seen = new Set();

	const pick = (list) => {
		for (const cand of list) {
			if (seen.has(cand)) continue;
			seen.add(cand);
			if (!isMediaThumbBgElement(cand) || isOwnElement(cand) || isInsidePanel(cand)) continue;
			const rect = cand.getBoundingClientRect();
			if (rect.width < 20 || rect.height < 20 || !extractBgUrlIfEnabled(cand) || !hitCheck(cand, x, y)) continue;

			let idx = pointStack.indexOf(cand);
			if (idx === -1) {
				for (let p = composedParent(cand); p && p !== document.body && p !== document.documentElement; p = composedParent(p)) {
					const pIdx = pointStack.indexOf(p);
					if (pIdx !== -1) {
						idx = pIdx;
						break;
					}
				}
			}
			const above = idx === -1 ? pointStack : pointStack.slice(0, idx);
			const isCovered = above.some((o) => {
				if (composedContains(o, cand) || composedContains(cand, o) || isBlurBgCanvas(o)) return false;
				if (o.tagName === "IMG" || o.tagName === "CANVAS") return !isTransparentLayer(o);
				if (o.tagName === "VIDEO") return !isPreviewVideoOverlay(o, cand);
				return isOpaqueCover(o, rect);
			});
			if (!isCovered) return cand;
		}
		return null;
	};

	const found = pick(pointStack);
	const top = pointStack[0];
	if (found || !top) return found;
	if (top.tagName === "IMG" && top.parentElement && isTransparentLayer(top)) {
		const siblingBg = pick(top.parentElement.children);
		if (siblingBg) return siblingBg;
	}

	const checkedImgs = new Set();
	const findHiddenImgBg = (scope) => {
		if (!scope || !scope.getElementsByTagName) return null;
		const imgs = scope.getElementsByTagName("img");
		if (imgs.length > 30) return null;
		const cands = [];
		for (let i = 0; i < imgs.length; i++) {
			const img = imgs[i];
			if (checkedImgs.has(img)) continue;
			checkedImgs.add(img);
			if (isOwnElement(img) || !img.parentElement || !inRect(img.parentElement, x, y)) continue;
			const bg = findBgSiblingForHiddenImg(img);
			if (bg) cands.push(bg);
		}
		return cands.length ? pick(cands) : null;
	};

	const host = top.closest ? top.closest("a, button, picture, figure") : null;
	const hostBg = findHiddenImgBg(host);
	if (hostBg) return hostBg;

	const inMediaThumb = Boolean(top.closest && top.closest(_mediaThumbBgSel));
	const maxDepth = inMediaThumb ? 6 : 2;
	let p = top.parentElement;
	for (let i = 0; i < maxDepth && p && p !== document.body && p !== document.documentElement; i++, p = p.parentElement) {
		if (i < 2 && p !== host) {
			const hiddenBg = findHiddenImgBg(p);
			if (hiddenBg) return hiddenBg;
		}
		if (inMediaThumb) {
			const walked = pick(p.querySelectorAll(_bgThumbCandSel));
			if (walked) return walked;
		}
	}
	return null;
}

function getActiveImageTarget(isActivationKey = true, isReset = false) {
	flushHoverUpdate();

	if (isReset) return getTargetForPanel();

	if (isActivationKey) {
		if (_hoverTarget && isInactiveImageTarget(_hoverTarget, _lastMouseX, _lastMouseY)) {
			_hoverTarget = null;
		}

		const visualTop = getVisualTarget(_lastMouseX, _lastMouseY, null);
		if (visualTop && visualTop.isConnected && !isInactiveImageTarget(visualTop, _lastMouseX, _lastMouseY)) {
			_hoverTarget = visualTop;
			return getRedirectedTarget(visualTop);
		}

		if (_hoverTarget && _hoverTarget.isConnected) {
			const rect = _hoverTarget.getBoundingClientRect();
			if (rect.width > 0 && rect.height > 0) return getRedirectedTarget(_hoverTarget);
		}

		let elFromPoint = deepElementFromPoint(_lastMouseX, _lastMouseY);
		if (elFromPoint && isInactiveImageTarget(elFromPoint, _lastMouseX, _lastMouseY)) {
			elFromPoint = null;
		}

		if (elFromPoint) {
			if (elFromPoint.tagName === "IMG" || elFromPoint.tagName === "CANVAS") {
				return getRedirectedTarget(elFromPoint);
			}
			const wrapper = elFromPoint.closest("a, button, picture, figure");
			if (wrapper) {
				const img = wrapper.querySelector("img, canvas");
				if (img) {
					const rect = img.getBoundingClientRect();
					if (rect.width > 0 && rect.height > 0 && hitCheck(img, _lastMouseX, _lastMouseY)) {
						return getRedirectedTarget(img);
					}
				}
			}
			if (extractBgUrlIfEnabled(elFromPoint)) return getRedirectedTarget(elFromPoint);
		}

		const bgThumb = findBgThumbUnderPoint(_lastMouseX, _lastMouseY);
		if (bgThumb) return getRedirectedTarget(bgThumb);

		const hovers = document.querySelectorAll(":hover");
		if (hovers.length > 0) {
			const target = hovers[hovers.length - 1];
			if (!isInactiveImageTarget(target, _lastMouseX, _lastMouseY)) {
				if (target.tagName === "IMG" || target.tagName === "CANVAS" || extractBgUrlIfEnabled(target)) {
					return getRedirectedTarget(target);
				}
			}
		}
	}

	if (_hoverTarget && _hoverTarget.isConnected) return getRedirectedTarget(_hoverTarget);
	if (_img_element && _img_element.isConnected) return getRedirectedTarget(_img_element);

	const modArr = Array.from(_modifiedElements);
	for (let i = modArr.length - 1; i >= 0; i--) {
		const el = getRedirectedTarget(modArr[i]);
		if (el && el.isConnected && isElementModified(el)) return el;
	}

	if (_singleImgPage) {
		if (_current_element && _current_element.isConnected) return getRedirectedTarget(_current_element);
		const onlyImg = document.querySelector("img");
		if (onlyImg) return getRedirectedTarget(onlyImg);
	}

	return null;
}

function ensureTargetReady(target, skipBadge = false) {
	if (!target || _isExcludedHost) return null;
	if (!getElData(target, _firstkey)) attachEvent(target);
	if (_img_element !== target) setZoom(target, null, skipBadge);
	return _img_element;
}

function refreshShortcutTimeout() {
	if (_zoom_rcCancel > 0) {
		if (_rclickTimer) clearTimeout(_rclickTimer);
		_rclickTimer = setTimeout(() => {
			if (_rotParam || _zoomParam || _dragParam) return;
			setZoom();
		}, _zoom_rcCancel);
	}
}

function handleZoomKey(zoomIn, shiftPressed, isActKey) {
	let target = getActiveImageTarget(isActKey);
	if (!target) return false;

	target = ensureTargetReady(target);
	if (!target) return false;

	disableAnim(target);
	syncBaseRect(target);

	const dim = _zoom_dim * 0.01 * (shiftPressed ? 2 : 1);
	zoom(zoomIn ? 1 + dim : 1 - dim);
	refreshShortcutTimeout();
	return true;
}

function getActiveFloatingImage() {
	if (_img_element && _img_element.isConnected) {
		const isFloating = Boolean(getElData(_img_element, _srckey)) || (_singleImgPage && _img_element.classList.contains(_imgSrcViewCls));
		if (isFloating) return _img_element;
	}

	const modArr = Array.from(_modifiedElements);
	for (let i = modArr.length - 1; i >= 0; i--) {
		const el = modArr[i];
		if (el && el.isConnected) {
			const redirected = getRedirectedTarget(el);
			if (redirected && getElData(redirected, _srckey)) {
				return redirected;
			}
		}
	}

	return null;
}

function handleArrowKey(dx, dy) {
	const target = getActiveFloatingImage();
	if (!target) return false;
	if (_img_element !== target) setZoom(target, null, true);

	ensureElevatedZIndex(target);

	const rawLeft = parseFloat(target.style.left);
	const rawTop = parseFloat(target.style.top);
	const curLeft = isNaN(rawLeft) ? getOffset(target).left : rawLeft;
	const curTop = isNaN(rawTop) ? getOffset(target).top : rawTop;

	enableAnim(target);
	target.style.setProperty("left", `${curLeft + dx}px`, "important");
	target.style.setProperty("top", `${curTop + dy}px`, "important");
	target.classList.add(_draggedCls);
	if (isPinned(target)) keepPinnedVisible(target);

	if (_singleImgPage && target.classList.contains(_imgSrcViewCls)) {
		const size = getElData(target, _sizekey);
		if (size) checkSingleImgActivation(target, size.w, size.h);
	}

	refreshShortcutTimeout();
	return true;
}

function handleRotationKey(deg, isActKey) {
	let target = getActiveImageTarget(isActKey);
	if (!target) return false;

	target = ensureTargetReady(target);
	if (!target) return false;

	disableAnim(target);
	syncBaseRect(target);

	rotateWithAnim(target, deg);
	showZoomBadge();
	refreshShortcutTimeout();
	return true;
}

function handleFitWindowKey(isActKey) {
	let target = getActiveImageTarget(isActKey);
	if (!target) return false;

	target = ensureTargetReady(target);
	if (!target) return false;

	disableAnim(target);
	syncBaseRect(target);

	enableAnim(target);
	windowFitting();
	refreshShortcutTimeout();
	return true;
}

function handlePanelKey(isActKey) {
	if (destroyPanel()) {
		setZoom();
		return true;
	}

	const validImg = getActiveImageTarget(isActKey);
	if (!validImg) return false;

	const rect = validImg.getBoundingClientRect();
	if (rect.width === 0 || rect.height === 0) return false;

	_current_element = validImg;
	if (!ensureTargetReady(validImg)) return false;

	ctxZoomCustom();
	refreshShortcutTimeout();
	return true;
}

function restoreSiblingVisibilities(container, owner) {
	if (container) {
		container.querySelectorAll("[data-zd-orig-vis]").forEach((sib) => {
			const origVis = sib.getAttribute("data-zd-orig-vis");
			if (origVis === "empty") sib.style.removeProperty("visibility");
			else sib.style.setProperty("visibility", origVis);
			sib.removeAttribute("data-zd-orig-vis");
		});
	}
	if (container === document) restoreBgDuplicates(null);
	else if (owner) restoreBgDuplicates(owner);
}

function resetInlineElement(el) {
	if (!el || el.nodeType !== 1) return;

	const data = getElData(el, _firstkey);
	unlockContainers(el);
	resetInlineStyles(el, data ? data.origStyle : null, true);
	restoreFilterAndOpacity(el);
	clearBorderStyles(el);
	restoreSelfVisibility(el);
	restoreSiblingVisibilities(el.closest(".imgContainer, .mainContainer, .richImage"));
	el.classList.remove(_draggedCls, "zdImgCls_draggingCur");

	_modifiedElements.delete(el);
	elementDataMap.delete(el);
}

function restoreOriginalDOM(withAnimation) {
	const exWrapper = document.getElementById(_zdExImgId);
	if (exWrapper) {
		exWrapper.querySelectorAll("img").forEach((img) => {
			const orig = getElData(img, _srckey);
			if (orig) {
				restoreSelfVisibility(orig);
				unlockContainers(orig);
			}
		});
		exWrapper.remove();
	}

	restoreSiblingVisibilities(document);
	document.querySelectorAll("[data-zd-card-lock]").forEach(releaseLockedCard);
	restoreAllVideoPreviews();
	stopExImgObserver();

	const ownsBatch = !_resetBatch;
	if (ownsBatch) _resetBatch = [];
	try {
		for (const el of _modifiedElements) {
			if (el && el.nodeType === 1) {
				const wasModified = isElementModified(el);
				if (withAnimation && wasModified) enableAnim(el);
				unlockContainers(el);

				if (wasModified) {
					const data = getElData(el, _firstkey);
					resetInlineStyles(el, data ? data.origStyle : null, true);
					restoreFilterAndOpacity(el);
					restoreSelfVisibility(el);
				}
				clearBorderStyles(el);
				el.classList.remove(_draggedCls, "zdImgCls_draggingCur");

				if (_singleImgPage && el.classList.contains(_imgSrcViewCls)) {
					el.classList.remove(_zdImgCls);
					el.style.setProperty("cursor", "zoom-in", "important");
				}

				if (_singleImgPage && !document.querySelector(`.${_imgSrcViewCls}`)) {
					document.documentElement.style.removeProperty("overflow");
					document.body.style.removeProperty("overflow");
					if (_savedScrollPos !== null) {
						window.scrollTo(_savedScrollPos.x, _savedScrollPos.y);
						_savedScrollPos = null;
					}
				}
			}
			elementDataMap.delete(el);
		}
	} finally {
		if (ownsBatch) flushResetBatch();
	}
	_modifiedElements.clear();
	_zIndexCounter = 10;
}

function hideBadgeImmediate() {
	if (_badgeHoldTimer) {
		clearTimeout(_badgeHoldTimer);
		_badgeHoldTimer = null;
	}
	const b = document.getElementById("zdImg_zoomBadge");
	if (b) b.style.opacity = "0";
}

function handleShiftEscapeKey() {
	let didSomething = false;
	if (_rotParam) {
		stopRotation();
		didSomething = true;
	}
	if (_zoomParam) {
		stopQuickZoom();
		didSomething = true;
	}
	if (_dragParam) {
		cancelDrag();
		didSomething = true;
	}

	const panel = getPanelHost();
	if (panel) didSomething = true;

	let anyModified = false;
	for (const el of _modifiedElements) {
		if (el && el.isConnected && isElementModified(el)) {
			anyModified = true;
			break;
		}
	}

	if (_singleImgPage && _zoom_ivpDrag) {
		const nimg = document.querySelector(`.${_imgSrcViewCls}`);
		if (isElementModified(nimg)) anyModified = true;
	}

	if (!anyModified && !didSomething) return false;

	if (_singleImgPage && _zoom_ivpDrag) {
		const nimg = document.querySelector(`.${_imgSrcViewCls}`);
		if (nimg) {
			unpinImage(nimg);
			nimg.classList.remove(_draggedCls);
			restoreFilterAndOpacity(nimg);
			setElData(nimg, _flipXkey, 1);
			setElData(nimg, _flipYkey, 1);
			imgRotate(0, nimg);
			setImageRect(null, nimg);
			setZoom();

			if (panel) {
				setZoom(nimg, null, true);
				syncPanelValues();
				applyPanelBorder();
			}
			hideBadgeImmediate();
			return true;
		}
	}

	let activeImg = _img_element ? getElData(_img_element, _srckey) || _img_element : null;
	const activeData = activeImg ? getElData(activeImg, _firstkey) : null;

	restoreOriginalDOM(true);

	if (panel && activeImg && activeImg.isConnected) {
		if (activeData) {
			setElData(activeImg, _firstkey, activeData);
			setElData(activeImg, _sizekey, { w: activeData.sw, h: activeData.sh });
			setElData(activeImg, _rotkey, 0);
			setElData(activeImg, _flipXkey, 1);
			setElData(activeImg, _flipYkey, 1);
		}

		setZoom(activeImg, null, true);
		syncPanelValues();

		if (panel.matches(":hover") || panelHasFocus()) {
			applyPanelBorder();
		}
	} else {
		setZoom();
	}

	hideBadgeImmediate();
	return true;
}

function handleEscapeKey(isActKey = false) {
	let didSomething = false;
	if (destroyPanel()) {
		setZoom();
		didSomething = true;
	}

	let target = getActiveImageTarget(isActKey, true);
	if (!target || !isElementModified(target)) return didSomething;

	target = ensureTargetReady(target, true);
	if (!target) return didSomething;

	unpinImage(target);
	enableAnim(target);
	target.classList.remove(_draggedCls);
	restoreFilterAndOpacity(target);
	clearBorderStyles(target);
	target.style.removeProperty("cursor");

	setElData(target, _flipXkey, 1);
	setElData(target, _flipYkey, 1);
	restoreElementZIndex(target);

	const src_elem = getElData(target, _srckey);
	const origTarget = src_elem || target;
	if (src_elem) {
		imgRotate(0, target);
		_zdSuppressBadge = true;
		clearImgEx(src_elem);
		_zdSuppressBadge = false;
	} else {
		setImageRect(undefined, target);
		imgRotate(0, target);
		unlockContainers(origTarget);
	}

	_modifiedElements.delete(origTarget);
	elementDataMap.delete(origTarget);
	if (!origTarget.isConnected || isInactiveImageTarget(origTarget)) {
		_lastResetElement = null;
	} else {
		_lastResetElement = origTarget;
	}

	setZoom();
	hideBadgeImmediate();
	return true;
}

function init() {
	d("Init Start", "");

	if (!document.body) {
		window.addEventListener(
			"mousedown",
			(e) => {
				if (e.button === 2) enableContextMenus(false);
			},
			true
		);
		d("Init Aborted", "document.body is not ready", "warn");
		return;
	}

	_singleImgPage = isSingleImgPage();
	if (_singleImgPage && !_isExcludedHost) {
		singlePageAltImg();
	}

	updateClickFunctions();

	let _lastChordTime = 0;

	const captureShield = (e) => {
		try {
			if (e.type === "mousedown" || e.type === "pointerdown" || e.type === "touchstart") {
				_cancelNextClick = false;
			}

			const panelHost = getPanelHost();
			if (panelHost && (e.target === panelHost || (e.composedPath && e.composedPath().includes(panelHost)))) {
				return;
			}

			if (_rightBtnDown && (e.button === 0 || e.type.startsWith("touch")) && _img_element) {
				if (e.altKey || _accKeyState.alt) {
					if (e.type === "mousedown" || e.type === "pointerdown" || e.type === "touchstart") return;
					e.preventDefault();
					e.stopPropagation();
					e.stopImmediatePropagation();
					return;
				}

				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();

				if (e.type === "mouseup" || e.type === "touchend") {
					const now = Date.now();
					if (now - _lastChordTime > 50) {
						_lastChordTime = now;
						_cancelNextClick = true;
						_clickFunc();
						_draggingCnt = 0;
					}
				}
				return;
			}

			const isClickEvent = [
				"click",
				"dblclick",
				"mousedown",
				"pointerdown",
				"mouseup",
				"pointerup",
				"touchstart",
				"touchend"
			].includes(e.type);

			if (isClickEvent && (e.button === 0 || e.button === undefined)) {
				if (e.target?.dataset?.zdIgnoreClick === "true") return;

				if (_cancelNextClick && (e.type === "click" || e.type === "dblclick")) {
					e.preventDefault();
					e.stopPropagation();
					e.stopImmediatePropagation();
					if (e.type === "click") _cancelNextClick = false;
					return;
				}

				const clickTarget = getClickTarget(e);
				if (isSliderNavControl(clickTarget)) return;

				const isExtClass = e.target?.classList?.contains(_zdImgCls);
				if (e.target && !(isPassThroughClick(e) && (e.type !== "click" || hasPassThroughHost(e))) && !isExtClass) {
					let shouldBlock = false;

					const checkInlineMod = (el) => {
						if (!el || !el.isConnected) return false;
						if (isLockedOriginal(el) || el.style?.getPropertyValue("cursor") === "default") return true;
						if (!getElData(el, _firstkey) || !getElData(el, _sizekey) || getElData(el, _srckey)) return false;
						return isElementModified(el);
					};

					const clickPath = e.composedPath ? e.composedPath() : [e.target];
					const strictMod = isPassThroughClick(e);

					if ((e.target.tagName === "IMG" || e.target.tagName === "CANVAS") && checkInlineMod(e.target)) {
						shouldBlock = true;
					}

					if (!shouldBlock) {
						for (const el of _modifiedElements) {
							if (!el.isConnected || !checkInlineMod(el)) continue;

							if (clickPath.includes(el) || el.contains(e.target)) {
								shouldBlock = true;
								break;
							}
							if (strictMod) {
								const pathHost = clickPath.find((n) => n && n.nodeType === 1 && !isOwnElement(n) && n.matches(_clickHostSel));
								if (
									(pathHost && pathHost.contains(el)) ||
									(el.hasAttribute("data-zd-pe-img") && e.target.contains(el) && inRect(el, e.clientX, e.clientY))
								) {
									shouldBlock = true;
									break;
								}
								continue;
							}
							if (isFreeControlClick(e, el)) continue;
							const wrapper =
								el.parentElement ||
								el.closest("a, button, picture, figure, [class*='expandable'], [class*='image'], [class*='lightbox']");
							if (wrapper && (clickPath.includes(wrapper) || wrapper.contains(e.target))) {
								shouldBlock = true;
								break;
							}

							const sharedHosts = [
								el.closest(".imgpt, .iusc, .isv-r, article, [data-sctrack], [data-zd-card-lock]"),
								el.closest("hmg-theme, app-image-gallery-lightbox, .lightbox-inner, swiper-container, .storyline-image")
							];
							for (let h = el.closest(_clickHostSel); h; h = h.parentElement ? h.parentElement.closest(_clickHostSel) : null) {
								sharedHosts.push(h);
							}
							if (sharedHosts.some((h) => h && (clickPath.includes(h) || h.contains(e.target)))) {
								shouldBlock = true;
								break;
							}
						}
					}

					if (shouldBlock) {
						e.preventDefault();
						e.stopPropagation();
						e.stopImmediatePropagation();
						return;
					}
				}
			}
		} catch (err) {
			console.debug("[Zoom & Drag] Block-Shield Error:", err);
		}
	};

	["pointerdown", "mousedown", "pointerup", "mouseup", "click", "dblclick"].forEach((type) => {
		window.addEventListener(type, captureShield, true);
	});

	const midChordShield = (e) => {
		try {
			if (_isExcludedHost || e.button !== 1) return;

			const panelHost = getPanelHost();
			if (panelHost && e.composedPath && e.composedPath().includes(panelHost)) return;

			if (e.type === "mousedown") {
				_midChord = _rightBtnDown && Boolean(_img_element);
			}
			if (!_midChord) return;

			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();

			if (e.type === "mouseup") {
				_mdownFunc();
			} else if (e.type === "auxclick") {
				_midChord = false;
			}
		} catch (err) {
			console.debug("[Zoom & Drag] Middle-Chord Error:", err);
		}
	};

	["mousedown", "mouseup", "auxclick"].forEach((type) => {
		window.addEventListener(type, midChordShield, true);
	});

	["click", "auxclick"].forEach((type) => {
		window.addEventListener(type, onSwitcherLinkClick, true);
		window.addEventListener(type, onContainerPassThroughClick, true);
	});
	window.addEventListener("mousedown", onMiddleDownPassThrough, true);

	const blockLockedCardHover = (e) => {
		if (_isExcludedHost || !e.target || e.target.nodeType !== 1 || isOwnElement(e.target)) return;
		const lockedCard = e.target.closest ? e.target.closest("[data-zd-card-lock]") : null;
		if (lockedCard) {
			if (!lockedCard.querySelector("[data-zd-pe-img]")) {
				lockedCard.removeAttribute("data-zd-card-lock");
				return;
			}
			e.stopPropagation();
			e.stopImmediatePropagation();
		}
	};

	["mouseenter", "mouseover", "pointerenter", "pointerover"].forEach((type) => {
		window.addEventListener(type, blockLockedCardHover, true);
	});

	window.addEventListener("play", onPlayerVideoStart, true);
	window.addEventListener(
		"pointerup",
		(e) => {
			if (_isExcludedHost || (e.pointerType === "mouse" && e.button !== 0)) return;
			const panel = getPanelHost();
			if (panel && e.composedPath?.().includes(panel)) return;
			_lastVideoInteractionTime = performance.now();
		},
		{ passive: true, capture: true }
	);
	document.addEventListener("fullscreenchange", onFullscreenChange);
	window.addEventListener("message", onPlayerFrameMessage);

	window.addEventListener(
		"dragstart",
		(e) => {
			if (_isExcludedHost) return;
			if (_img_element || _dragParam || _rightBtnDown || e.target?.classList?.contains(_zdImgCls)) {
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();
			}
		},
		true
	);

	window.addEventListener(
		"mousedown",
		(e) => {
			if (_isExcludedHost) return;

			const panel = getPanelHost();
			if (panel && (e.target === panel || panel.contains(e.target) || (e.composedPath && e.composedPath().includes(panel)))) {
				return;
			}

			const isAlt = e.altKey || _accKeyState.alt;

			if (e.button === 2) {
				_rightBtnDown = true;
				_ctx_show = true;
				let t =
					e.composedPath && e.composedPath().length > 0
						? e.composedPath()[0]
						: document.elementFromPoint(e.clientX, e.clientY);

				const visualImg = getVisualTarget(e.clientX, e.clientY, t);
				if (visualImg && (visualImg.tagName === "IMG" || visualImg.tagName === "CANVAS")) {
					t = visualImg;
				}

				checkTarget(t, e, true);

				if (_badgeHoldTimer) clearTimeout(_badgeHoldTimer);
				_badgeHoldTimer = setTimeout(() => {
					_badgeHoldTimer = null;
					if (_rightBtnDown && _img_element && !_rotParam && !_zoomParam && !_dragParam) {
						showZoomBadge();
					}
				}, _zdBadgeHoldDelay);

				const activeTarget = _current_element || _img_element;
				if (isAlt && e.buttons & 1 && activeTarget) {
					_ctx_show = false;
					if (e.ctrlKey || _accKeyState.ctrl) startQuickZoom(e, activeTarget);
					else startRotation(e, activeTarget);
					e.preventDefault();
					e.stopPropagation();
				}
			} else if (e.button === 0 && isAlt && (_rightBtnDown || e.buttons & 2)) {
				let t =
					e.composedPath && e.composedPath().length > 0
						? e.composedPath()[0]
						: document.elementFromPoint(e.clientX, e.clientY);

				const visualImg = getVisualTarget(e.clientX, e.clientY, t);
				if (visualImg && (visualImg.tagName === "IMG" || visualImg.tagName === "CANVAS")) {
					t = visualImg;
				}

				if (!_img_element && !_current_element) {
					checkTarget(t, e);
				}
				const activeTarget = _current_element || _img_element;
				if (activeTarget) {
					_ctx_show = false;
					if (e.ctrlKey || _accKeyState.ctrl) startQuickZoom(e, activeTarget);
					else startRotation(e, activeTarget);
					e.preventDefault();
					e.stopPropagation();
				}
			}
		},
		true
	);

	window.addEventListener(
		"mouseup",
		(e) => {
			if (_isExcludedHost) {
				if (_rotParam || _img_element) resetAllChanges();
				return;
			}

			const panel = getPanelHost();
			if (panel && (e.target === panel || panel.contains(e.target) || (e.composedPath && e.composedPath().includes(panel)))) {
				return;
			}

			if (_rotParam) stopRotation();

			if (e.button === 2) {
				if (_rclickHoldTimer) {
					clearTimeout(_rclickHoldTimer);
					_rclickHoldTimer = null;
				}
				if (_badgeHoldTimer) {
					clearTimeout(_badgeHoldTimer);
					_badgeHoldTimer = null;
				}
				_rightBtnDown = false;

				if (_img_element) {
					const panelOpen = getPanelHost();
					const willAutoReset = _zoom_autoRtn && isRcModified(_img_element);

					const badgeEl = document.getElementById("zdImg_zoomBadge");
					if (willAutoReset) {
						if (badgeEl) badgeEl.style.opacity = "0";
					} else if (!_blockWheelZoom && badgeEl && badgeEl.style.opacity === "1") {
						showZoomBadge();
					}

					if (panelOpen) {
						if (willAutoReset) {
							autoResetImage();
							removePanelBorder();
							syncPanelValues();
						}
						setTimeout(() => {
							const b = document.getElementById("zdImg_zoomBadge");
							if (b && !_rightBtnDown) {
								b.style.opacity = "0";
								_ctx_show = true;
							}
						}, 100);
						return;
					}

					setTimeout(() => setZoom(), 100);
				}
			}
		},
		true
	);

	document.addEventListener(
		"mousemove",
		(e) => {
			if (_isExcludedHost || (_rightBtnDown && _img_element) || _rotParam || _zoomParam || _dragParam) return;

			_lastMouseX = e.clientX;
			_lastMouseY = e.clientY;

			_hoverEventData = {
				x: e.clientX,
				y: e.clientY,
				target: e.target,
				path: e.composedPath ? e.composedPath() : []
			};
			if (!_hoverTimer) {
				_hoverTimer = setTimeout(flushHoverUpdate, _hoverThrottleMs);
			}
		},
		{ passive: true, capture: true }
	);

	window.addEventListener(
		"keydown",
		(e) => {
			_accKeyState.ctrl = e.ctrlKey;
			_accKeyState.alt = e.altKey;

			if (
				!_isExcludedHost &&
				!e.repeat &&
				(e.key === " " || e.key === "Enter" || e.key === "k" || e.key === "K") &&
				!isEditableTarget(getClickTarget(e))
			) {
				_lastVideoInteractionTime = performance.now();
			}

			if (e.key === "Alt" && _img_element) e.preventDefault();
			if (!_zoom_enableKeyShortcuts || _isExcludedHost) return;

			const panel = getPanelHost();
			const panelShadowEl = getPanelShadow();
			const panelActiveEl = panelShadowEl && panelShadowEl.activeElement;
			const inPanelInput = Boolean(panelActiveEl && panelActiveEl.tagName === "INPUT");

			if (inPanelInput && e.key !== "Escape") {
				return;
			}

			const saveMenu = panelShadowEl && panelShadowEl.getElementById("zd-save-menu");
			const isSaveMenuOpen = Boolean(saveMenu && !saveMenu.hidden);
			const isOnSaveMenuBtn = Boolean(panelActiveEl && panelActiveEl.id === "zd-btn-save-menu");
			if (isSaveMenuOpen || (isOnSaveMenuBtn && (e.key === "ArrowDown" || e.key === "ArrowUp"))) {
				if (isSaveMenuOpen && e.key === "Escape") {
					closeSaveMenu();
					e.preventDefault();
					e.stopPropagation();
					e.stopImmediatePropagation();
				}
				return;
			}

			if (isEditableTarget(e.target) || isEditableTarget(document.activeElement)) {
				return;
			}

			if (e.ctrlKey || e.metaKey || e.altKey) return;

			const key = getShortcutKey(e);

			if (panel && (panel.matches(":hover") || inPanelInput)) {
				const deadZoneKeys = [
					"+", "=", "*", "-", "_", "l", "L", "r", "R", "0",
					"ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"
				];
				if (deadZoneKeys.includes(key) || e.code === "NumpadAdd" || e.code === "NumpadSubtract") {
					if (inPanelInput && key.startsWith("Arrow")) return;
					e.preventDefault();
					e.stopPropagation();
					return;
				}
			}

			let handled = false;
			const isZoomInKey = key === "+" || (key === "=" && !e.shiftKey) || key === "*" || e.code === "NumpadAdd";
			const isActKey =
				isZoomInKey ||
				key === "-" || key === "_" || e.code === "NumpadSubtract" ||
				key === "0" || key === "r" || key === "R" || key === "l" || key === "L" || key === "p" || key === "P" ||
				key === "f" || key === "F";

			if (key === "Escape") {
				handled = e.shiftKey ? handleShiftEscapeKey() : handleEscapeKey(false);
				if (handled) {
					_blockNextEscKeyup = true;
					e.preventDefault();
					e.stopPropagation();
					e.stopImmediatePropagation();
				}
				return;
			}

			if (key.startsWith("Arrow")) {
				let dx = 0;
				let dy = 0;
				const step = e.shiftKey ? 60 : 20;
				if (key === "ArrowUp") dy = -step;
				else if (key === "ArrowDown") dy = step;
				else if (key === "ArrowLeft") dx = -step;
				else if (key === "ArrowRight") dx = step;

				if (handleArrowKey(dx, dy)) {
					if (document.activeElement && document.activeElement !== document.body) {
						document.activeElement.blur();
					}
					e.preventDefault();
					e.stopPropagation();
					e.stopImmediatePropagation();
				}
				return;
			}

			if (isBlockedBySiteOverlay(deepElementFromPoint(_lastMouseX, _lastMouseY))) return;

			if (isZoomInKey) {
				handled = handleZoomKey(true, e.shiftKey, isActKey);
			} else if (key === "-" || key === "_" || e.code === "NumpadSubtract") {
				handled = handleZoomKey(false, e.shiftKey, isActKey);
			} else if (key === "0") {
				handled = handleFitWindowKey(isActKey);
			} else if (key === "r" || key === "R") {
				handled = handleRotationKey(e.shiftKey ? 45 : 90, isActKey);
			} else if (key === "l" || key === "L") {
				handled = handleRotationKey(e.shiftKey ? -45 : -90, isActKey);
			} else if (key === "p" || key === "P") {
				handled = handlePanelKey(isActKey);
			} else if (key === "f" || key === "F") {
				handled = e.shiftKey ? handleShiftPinKey() : handlePinKey(isActKey);
			}

			if (handled) {
				if (document.activeElement && document.activeElement !== document.body) {
					document.activeElement.blur();
				}
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();
			}
		},
		true
	);

	window.addEventListener(
		"keyup",
		(e) => {
			_accKeyState.ctrl = e.ctrlKey;
			_accKeyState.alt = e.altKey;

			if (e.key === "Escape" && _blockNextEscKeyup) {
				_blockNextEscKeyup = false;
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();
				return;
			}

			if (
				_zoom_enableKeyShortcuts &&
				!_isExcludedHost &&
				!isEditableTarget(e.target) &&
				!isEditableTarget(document.activeElement) &&
				e.key &&
				e.key.startsWith("Arrow") &&
				getActiveFloatingImage()
			) {
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();
				return;
			}

			if (e.key === "Alt") {
				if (_rotParam) stopRotation();
				if (_zoomParam) stopQuickZoom();
				if (_img_element) e.preventDefault();
			}
		},
		true
	);

	window.addEventListener(
		"contextmenu",
		(e) => {
			if (!_ctx_show) {
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();
				_ctx_show = true;
			}
		},
		true
	);

	const releaseInputState = () => {
		_accKeyState.ctrl = _accKeyState.alt = false;
		_rightBtnDown = false;
		if (_badgeHoldTimer) {
			clearTimeout(_badgeHoldTimer);
			_badgeHoldTimer = null;
		}
		if (_rotParam) stopRotation();
		if (_zoomParam) stopQuickZoom();
		cancelDrag();
		if (_img_element) setZoom();
	};

	window.addEventListener("blur", releaseInputState);
	window.addEventListener("pagehide", releaseInputState);
	window.addEventListener("pagehide", resetAllForNavigation);
	window.addEventListener("pageshow", (e) => {
		if (!e.persisted) return;
		releaseInputState();
		resetAllForNavigation();
	});
	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState === "hidden") releaseInputState();
	});

	window.addEventListener("resize", keepAllPinnedVisible, { passive: true });

	_endInit = true;
	d("Init End", "");
}

function updateClickFunctions() {
	if (_zoom_clickSwap) {
		_clickFunc = windowFitting;
		_mdownFunc = sizeFit;
	} else {
		_clickFunc = sizeFit;
		_mdownFunc = windowFitting;
	}
}

function singlePageAltImg() {
	if (!_zoom_ivpDrag || !document.body) return;

	const img = document.querySelector(`img:not(.${_zdImgCls})`);
	if (!img) return;

	d("ImageView Source Page", "");
	const modeFitCls = "zdImgCls_modeFit";
	const imgSrc = img.src || img.currentSrc;

	img.setAttribute("data-zd-orig-src", imgSrc);
	img.style.setProperty("display", "none", "important");
	img.style.setProperty("opacity", "0", "important");
	img.style.setProperty("pointer-events", "none", "important");
	img.removeAttribute("src");

	document.body.style.setProperty("overflow", "hidden", "important");
	document.documentElement.style.setProperty("overflow", "hidden", "important");
	document.body.style.setProperty("margin", "0", "important");
	window.scrollTo(0, 0);

	const nimg = document.createElement("img");
	nimg.className = _imgSrcViewCls;
	nimg.src = imgSrc;
	_current_element = nimg;

	document.body.appendChild(nimg);
	attachEvent(nimg);

	const onLoadSetup = () => {
		const w = nimg.naturalWidth || 100;
		const h = nimg.naturalHeight || 100;
		const sw = window.innerWidth;
		const sh = window.innerHeight;
		const size = calcLimit(w, h, sw, sh);

		nimg.classList.toggle(modeFitCls, w > size.w || h > size.h);

		const nLeft = (sw - size.w) / 2;
		const nTop = (sh - size.h) / 2;

		nimg.style.setProperty("position", "absolute", "important");
		nimg.style.setProperty("display", "inline", "important");
		nimg.style.setProperty("left", `${nLeft}px`, "important");
		nimg.style.setProperty("top", `${nTop}px`, "important");
		nimg.style.setProperty("width", `${size.w}px`, "important");
		nimg.style.setProperty("height", `${size.h}px`, "important");
		nimg.style.setProperty("min-width", `${size.w}px`, "important");
		nimg.style.setProperty("min-height", `${size.h}px`, "important");
		nimg.style.setProperty("max-width", "none", "important");
		nimg.style.setProperty("max-height", "none", "important");
		nimg.style.setProperty("transform-origin", "50% 50%", "important");
		nimg.style.setProperty("cursor", w > size.w || h > size.h ? "zoom-in" : "default", "important");

		checkTarget(nimg, null, true);
	};

	if (nimg.complete && nimg.naturalWidth > 0) {
		onLoadSetup();
	} else {
		nimg.addEventListener("load", onLoadSetup);
	}

	nimg.addEventListener(
		"click",
		function (e) {
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();
			if (this.classList.contains(_draggedCls)) return;
			_current_element = this;
			ctxFit();
		},
		true
	);

	window.addEventListener(
		"wheel",
		function singlePageWheel(e) {
			if (!_zoom_ivpDrag || !nimg.isConnected) {
				window.removeEventListener("wheel", singlePageWheel, { capture: true });
				return;
			}

			const panel = getPanelHost();
			if (panel && panel.contains(e.target)) return;

			if (!_img_element || _img_element !== nimg) {
				setZoom(nimg, null, true);
				zoomEvent(e);
				e.preventDefault();
				e.stopPropagation();
			}
		},
		{ passive: false, capture: true }
	);
}

function resetAllChanges() {
	if (_hoverTimer) {
		clearTimeout(_hoverTimer);
		_hoverTimer = 0;
	}
	_hoverEventData = null;
	_hoverTarget = null;
	d("Reset All Changes for Excluded Domain", "Script disabled", "warn");

	detachWheelListeners();
	detachGlobalPointerListeners(true);

	stopRotation();
	stopQuickZoom();
	cancelDrag();

	if (_badgeTimer) {
		clearTimeout(_badgeTimer);
		_badgeTimer = null;
	}
	if (_rclickTimer) {
		clearTimeout(_rclickTimer);
		_rclickTimer = null;
	}
	if (_rclickHoldTimer) {
		clearTimeout(_rclickHoldTimer);
		_rclickHoldTimer = null;
	}
	if (_badgeHoldTimer) {
		clearTimeout(_badgeHoldTimer);
		_badgeHoldTimer = null;
	}
	if (_previewNavGuardTimer) {
		clearInterval(_previewNavGuardTimer);
		_previewNavGuardTimer = null;
	}
	if (_swTimer) {
		clearInterval(_swTimer);
		_swTimer = null;
	}

	destroyPanel();

	_rightBtnDown = false;
	stopExImgObserver();
	restoreOriginalDOM(false);

	const nimg = document.querySelector(`.${_imgSrcViewCls}`);
	if (nimg) {
		nimg.remove();
		const origImg = document.querySelector("img[data-zd-orig-src]");
		if (origImg) {
			origImg.setAttribute("src", origImg.getAttribute("data-zd-orig-src"));
			origImg.removeAttribute("data-zd-orig-src");
			origImg.style.removeProperty("display");
			origImg.style.removeProperty("opacity");
			origImg.style.removeProperty("pointer-events");
		}
		document.body.style.removeProperty("overflow");
		document.documentElement.style.removeProperty("overflow");
		document.body.style.removeProperty("margin");
	}

	const b = document.getElementById("zdImg_zoomBadge");
	if (b) b.remove();

	_img_element = null;
	_current_element = null;
	_ctx_show = true;
	enableContextMenus(false);
}

function settingData(setting) {
	if (!setting) return;
	if (setting.dim != null) _zoom_dim = setting.dim;
	if (setting.rotd != null) _zoom_rotd = setting.rotd;
	if (setting.rcCancel != null) _zoom_rcCancel = setting.rcCancel;
	if (setting.reverse != null) _zoom_reverse = setting.reverse;

	if (setting.bgImg != null) {
		const wasBgImg = _zoom_bgImg;
		_zoom_bgImg = setting.bgImg;
		if (wasBgImg && !_zoom_bgImg) resetAllChanges();
	}

	if (setting.autoRtn != null) _zoom_autoRtn = setting.autoRtn;
	if (setting.ctrlRvs != null) _zoom_ctrlRvs = setting.ctrlRvs;
	if (setting.enableCxt != null) {
		_zoom_enableCxt = setting.enableCxt;
	}

	if (setting.ivpDrag != null) {
		const wasIvpDrag = _zoom_ivpDrag;
		const isFirstApply = !_settingsLoaded;
		_zoom_ivpDrag = setting.ivpDrag;
		if (_zoom_ivpDrag && _singleImgPage && !_isExcludedHost) {
			if (!document.querySelector(`.${_imgSrcViewCls}`)) {
				if (!wasIvpDrag && (document.getElementById(_zdExImgId) || _modifiedElements.size > 0 || getPanelHost())) {
					resetAllChanges();
				}
				singlePageAltImg();
			}
		} else if (!_zoom_ivpDrag && _singleImgPage && (wasIvpDrag || isFirstApply)) {
			resetAllChanges();
		}
		_settingsLoaded = true;
	}

	if (setting.showZoomBadge != null) _zoom_showZoomBadge = setting.showZoomBadge;
	if (setting.enableKeyShortcuts != null) _zoom_enableKeyShortcuts = setting.enableKeyShortcuts;
	if (setting.hiResUpgrade != null) _zoom_hiResUpgrade = setting.hiResUpgrade;
	if (setting.frameColor != null || setting.pinColor != null || setting.frameOff != null || setting.pinFrameOff != null) {
		applyFrameColors(
			setting.frameColor ?? _zoom_frameColor,
			setting.pinColor ?? _zoom_pinColor,
			setting.frameOff ?? _zoom_frameOff,
			setting.pinFrameOff ?? _zoom_pinFrameOff
		);
	}
	if (setting.excludedDomains != null) {
		_zoom_excludedDomains = setting.excludedDomains;
		updateExcludedState();
	}

	if (setting.trackCursor != null) _zoom_trackCursor = setting.trackCursor;
	if (setting.clickSwap != null) {
		_zoom_clickSwap = setting.clickSwap;
		updateClickFunctions();
	}
}

function checkTarget(t, e, skipBadge = false) {
	flushHoverUpdate();
	if (_isExcludedHost) {
		enableContextMenus(false);
		_blockWheelZoom = true;
		return false;
	}

	if (isBlockedBySiteOverlay(t)) {
		enableContextMenus(false);
		_blockWheelZoom = true;
		if (!getPanelHost()) setZoom();
		return false;
	}

	if (t && isInactiveImageTarget(t, _lastMouseX, _lastMouseY)) {
		t = e ? findBgThumbUnderPoint(e.clientX, e.clientY) : null;
	}

	if (t) {
		const attach = (o, imgObj) => {
			let target = imgObj || o;
			const swMain = getSwitcherMainImage(target);
			if (swMain) {
				registerSwitcherImage(swMain);
				o = swMain;
				target = swMain;
			}

			if (isLockedOriginal(target)) {
				enableContextMenus(false);
				_blockWheelZoom = true;
				return false;
			}

			attachEvent(o, target);

			if (getPanelHost()) {
				_current_element = target;
			} else {
				setZoom(target, null, skipBadge);
			}
			enableContextMenus(true);
			_blockWheelZoom = false;
			return true;
		};

		if (!getElData(t, _firstkey)) {
			const host = t.closest ? t.closest(".imgContainer, .richImage") : null;
			if (host) {
				const mainImg = host.querySelector("img.ovrr") || host.querySelector(`img:not(.${_zdImgCls})`);
				if (mainImg) t = mainImg;
			}

			if (t.tagName === "IMG" || t.tagName === "CANVAS") {
				d("Image Type", t.tagName);
				return attach(t);
			}

			if (extractBgUrlIfEnabled(t)) {
				d("Image Type", "BG");
				return attach(t);
			}

			const bgThumb = e ? findBgThumbUnderPoint(e.clientX, e.clientY) : null;
			if (bgThumb) {
				d("Image Type", "BG-Under-Overlay");
				return attach(bgThumb);
			}

			if (_hoverTarget && _hoverTarget.isConnected && !isInactiveImageTarget(_hoverTarget, _lastMouseX, _lastMouseY)) {
				d("Image Type", "HoverTarget-Fallback");
				return attach(_hoverTarget);
			}

			enableContextMenus(false);
			_blockWheelZoom = true;
			if (!getPanelHost()) {
				_current_element = null;
				setZoom();
			}
		} else {
			const imgObj = t.tagName.toUpperCase() === "IMG" ? t : t.getElementsByTagName("img")[0] || t;
			if (isLockedOriginal(imgObj)) {
				enableContextMenus(false);
				_blockWheelZoom = true;
				return false;
			}

			enableContextMenus(true);
			if (getPanelHost()) _current_element = imgObj;
			else setZoom(imgObj, null, skipBadge);
			_blockWheelZoom = false;
		}
	} else {
		enableContextMenus(false);
		_blockWheelZoom = true;
		if (!getPanelHost()) {
			_current_element = null;
			setZoom();
		}
	}
}

function applyFrameColors(frameColor, pinColor, frameOff, pinFrameOff) {
	const frame = ZDShared.isHexColor(frameColor) ? frameColor.toLowerCase() : _frameColorDefault;
	const pin = ZDShared.isHexColor(pinColor) ? pinColor.toLowerCase() : _pinColorDefault;
	const noFrame = Boolean(frameOff);
	const noPinFrame = Boolean(pinFrameOff);
	if (
		frame === _zoom_frameColor &&
		pin === _zoom_pinColor &&
		noFrame === _zoom_frameOff &&
		noPinFrame === _zoom_pinFrameOff
	) {
		return;
	}

	_zoom_frameColor = frame;
	_zoom_pinColor = pin;
	_zoom_frameOff = noFrame;
	_zoom_pinFrameOff = noPinFrame;
	_floatFrameVisuals = noFrame ? _noFrameVisuals : buildFrameVisuals(frame, _floatIdleShadow);
	_pinFrameVisuals = noPinFrame ? _noFrameVisuals : buildFrameVisuals(pin, `0px 0px 4px 0px ${pin}`);

	const frameVar = frame === _frameColorDefault ? "" : frame;
	const pinVar = pin === _pinColorDefault ? "" : pin;
	const rootStyle = document.documentElement.style;
	const setVar = (name, value) => (value ? rootStyle.setProperty(name, value) : rootStyle.removeProperty(name));
	setVar("--zd-frame-color", noFrame ? "transparent" : frameVar);
	setVar("--zd-frame-idle", noFrame ? "transparent" : "");
	setVar("--zd-pin-color", noPinFrame ? "transparent" : pinVar);

	document.querySelectorAll(`img.${_zdImgCls}`).forEach((img) => {
		if (_floatFrames.has(img)) refreshFloatFrameVisual(img);
	});
	if (_img_element && getPanelHost()) {
		applyPanelBorder();
		const panelShadow = getPanelShadow();
		if (panelShadow) updateEffectButtons(panelShadow);
	}
}

function isPinned(el) {
	return Boolean(el && getElData(el, _pinkey));
}

function getScrollOffset(el) {
	return isPinned(el) ? { x: 0, y: 0 } : { x: window.scrollX, y: window.scrollY };
}

function getOffset(el) {
	const rect = el.getBoundingClientRect();
	const scrollOfs = getScrollOffset(el);
	return {
		left: rect.left + scrollOfs.x,
		top: rect.top + scrollOfs.y
	};
}

function keepPinnedVisible(img) {
	if (!isPinned(img) || !img.isConnected) return;

	const size = getElData(img, _sizekey);
	const left = parseFloat(img.style.left);
	const top = parseFloat(img.style.top);
	if (!size || isNaN(left) || isNaN(top)) return;

	const rad = ((getElData(img, _rotkey) || 0) * Math.PI) / 180;
	const cosA = Math.abs(Math.cos(rad));
	const sinA = Math.abs(Math.sin(rad));
	const visW = size.w * cosA + size.h * sinA;
	const visH = size.w * sinA + size.h * cosA;
	const visLeft = left + size.w / 2 - visW / 2;
	const visTop = top + size.h / 2 - visH / 2;

	const winW = document.documentElement.clientWidth;
	const winH = document.documentElement.clientHeight;
	const gripW = Math.min(_pinGrip, visW, winW);
	const gripH = Math.min(_pinGrip, visH, winH);

	let dx = 0;
	let dy = 0;
	if (visLeft + visW < gripW) dx = gripW - (visLeft + visW);
	else if (visLeft > winW - gripW) dx = winW - gripW - visLeft;
	if (visTop + visH < gripH) dy = gripH - (visTop + visH);
	else if (visTop > winH - gripH) dy = winH - gripH - visTop;
	if (dx === 0 && dy === 0) return;

	img.style.setProperty("left", `${left + dx}px`, "important");
	img.style.setProperty("top", `${top + dy}px`, "important");
	img.classList.add(_draggedCls);
}

function keepAllPinnedVisible() {
	if (_pinResizeRaf) return;
	_pinResizeRaf = requestAnimationFrame(() => {
		_pinResizeRaf = 0;
		document.querySelectorAll(`img[${_pinnedAttr}]`).forEach(keepPinnedVisible);
	});
}

function refreshPinVisuals(img) {
	syncFloatFrame(img);
	if (img === _img_element && getPanelHost()) applyPanelBorder();
}

function pinImage(img) {
	const isSinglePageImg = _singleImgPage && img?.classList.contains(_imgSrcViewCls);
	if (!img || isPinned(img) || (!getElData(img, _srckey) && !isSinglePageImg)) return false;

	const data = getElData(img, _firstkey);
	const scrX = window.scrollX;
	const scrY = window.scrollY;
	const rawLeft = parseFloat(img.style.left);
	const rawTop = parseFloat(img.style.top);
	const docPos = getOffset(img);

	disableAnim(img);
	img.style.setProperty("left", `${(isNaN(rawLeft) ? docPos.left : rawLeft) - scrX}px`, "important");
	img.style.setProperty("top", `${(isNaN(rawTop) ? docPos.top : rawTop) - scrY}px`, "important");
	if (data) {
		data.sx -= scrX;
		data.sy -= scrY;
	}

	setElData(img, _pinkey, true);
	img.setAttribute(_pinnedAttr, "");
	img.style.setProperty("position", "fixed", "important");
	img.getBoundingClientRect();

	keepPinnedVisible(img);
	refreshPinVisuals(img);
	return true;
}

function unpinImage(img) {
	if (!isPinned(img)) return false;

	const data = getElData(img, _firstkey);
	const src_elem = getElData(img, _srckey);
	const scrX = window.scrollX;
	const scrY = window.scrollY;
	const rawLeft = parseFloat(img.style.left);
	const rawTop = parseFloat(img.style.top);
	const newLeft = isNaN(rawLeft) ? NaN : rawLeft + scrX;
	const newTop = isNaN(rawTop) ? NaN : rawTop + scrY;

	disableAnim(img);
	if (!isNaN(newLeft)) img.style.setProperty("left", `${newLeft}px`, "important");
	if (!isNaN(newTop)) img.style.setProperty("top", `${newTop}px`, "important");
	if (data) {
		data.sx += scrX;
		data.sy += scrY;
	}

	if (src_elem && src_elem.isConnected && !isNaN(newLeft) && !isNaN(newTop)) {
		const srcOfs = getOffset(src_elem);
		if (Math.abs(newLeft - srcOfs.left) > 1 || Math.abs(newTop - srcOfs.top) > 1) {
			img.classList.add(_draggedCls);
		}
	}

	setElData(img, _pinkey, false);
	img.removeAttribute(_pinnedAttr);
	img.style.setProperty("position", "absolute", "important");
	img.getBoundingClientRect();

	refreshPinVisuals(img);
	return true;
}

function togglePinned(target) {
	_zdSuppressBadge = true;
	try {
		let el = ensureTargetReady(target);
		if (!el) return false;

		const isSinglePageImg = _singleImgPage && el.classList.contains(_imgSrcViewCls);
		if (!getElData(el, _srckey) && !isSinglePageImg) {
			if (el.tagName.toUpperCase() === "CANVAS") {
				return false;
			}

			ensureFloating();
			el = _img_element;
			if (!el || !getElData(el, _srckey)) return false;
		}

		if (isPinned(el)) {
			unpinImage(el);
			removePanelBorder();
			el = _img_element;
		} else {
			pinImage(el);
		}

		if (isSinglePageImg && el) {
			const size = getElData(el, _sizekey);
			if (size) checkSingleImgActivation(el, size.w, size.h);
		}

		if (isElementModified(el)) ensureElevatedZIndex(el);
		if (getPanelHost()) {
			syncPanelValues();
			applyPanelBorder();
		}
		return true;
	} finally {
		_zdSuppressBadge = false;
		hideBadgeImmediate();
	}
}

function handleShiftPinKey() {
	const pinnedImgs = document.querySelectorAll(`img[${_pinnedAttr}]`);
	if (!pinnedImgs.length) return false;

	_zdSuppressBadge = true;
	try {
		const prevActive = _img_element;
		const prevActiveSrc = prevActive ? getElData(prevActive, _srckey) || prevActive : null;
		const prevActiveSlot = prevActive ? getElData(prevActive, _swapSlotkey) : null;
		pinnedImgs.forEach((img) => {
			unpinImage(img);
			if (_singleImgPage && img.classList.contains(_imgSrcViewCls)) {
				const size = getElData(img, _sizekey);
				if (size) checkSingleImgActivation(img, size.w, size.h);
				return;
			}
			const src_elem = getElData(img, _srckey);
			const data = getElData(img, _firstkey);
			const size = getElData(img, _sizekey);
			const isUnmodified =
				src_elem &&
				!img.classList.contains(_draggedCls) &&
				(getElData(img, _rotkey) || 0) === 0 &&
				(getElData(img, _flipXkey) || 1) === 1 &&
				(getElData(img, _flipYkey) || 1) === 1 &&
				getOpacityPct(img) === 100 &&
				getBrightnessPct(img) === 100 &&
				!hasEffectMods(img) &&
				data &&
				size &&
				Math.abs(size.w - data.sw) < 2 &&
				Math.abs(size.h - data.sh) < 2;

			if (isUnmodified) {
				_img_element = img;
				clearImgEx(src_elem);
				_modifiedElements.delete(src_elem);
			}
		});
		if (prevActive && prevActive.isConnected) {
			_img_element = prevActive;
		} else if (getPanelHost() && !_img_element && prevActiveSrc) {
			rebindPanelOrActiveGalleryImg(prevActiveSrc, null, prevActiveSlot);
		}
		if (getPanelHost()) {
			syncPanelValues();
			applyPanelBorder();
		}
	} finally {
		_zdSuppressBadge = false;
		hideBadgeImmediate();
	}

	refreshShortcutTimeout();
	return true;
}

function handlePinKey(isActKey) {
	const target = getActiveImageTarget(isActKey);
	if (!target) return false;
	if (!togglePinned(target)) return false;

	refreshShortcutTimeout();
	return true;
}

function getShadowRoot(el) {
	if (!el || el.nodeType !== 1 || el.id === _zdPanelId) return null;
	if (el.shadowRoot) return el.shadowRoot;
	if (el.openOrClosedShadowRoot) return el.openOrClosedShadowRoot;
	if (el instanceof HTMLElement && typeof browser.dom?.openOrClosedShadowRoot === "function") {
		try {
			return browser.dom.openOrClosedShadowRoot(el) || null;
		} catch {
			return null;
		}
	}
	return null;
}

function deepElementFromPoint(x, y) {
	let el = document.elementFromPoint(x, y);
	while (el) {
		const sr = getShadowRoot(el);
		if (!sr || typeof sr.elementFromPoint !== "function") break;
		const sel = sr.elementFromPoint(x, y);
		if (!sel || sel === el) break;
		el = sel;
	}
	return el;
}

function isActiveGallerySlide(el) {
	if (!el || !el.closest) return false;
	if (
		el.closest(
			'.slick-slide:not(.slick-active), .swiper-slide:not(.swiper-slide-active), [aria-roledescription="slide"][aria-current="false"], [aria-roledescription="slide"][aria-hidden="true"], [inert]'
		)
	) {
		return false;
	}
	const activeIdxContainer = el.closest("[data-active-index]");
	if (activeIdxContainer) {
		const activeIdx = parseInt(activeIdxContainer.getAttribute("data-active-index"), 10);
		const slide = Array.from(activeIdxContainer.children).find((ch) => ch.contains(el));
		return Boolean(slide && !isNaN(activeIdx) && Array.prototype.indexOf.call(activeIdxContainer.children, slide) === activeIdx);
	}
	return Boolean(
		el.closest(
			'.slide.current, .mainImage.current, .curimgonview, .slick-current, .swiper-slide-active, [aria-roledescription="slide"][aria-current="true"], [aria-roledescription="slide"][aria-hidden="false"]'
		)
	);
}

function isInactiveImageTarget(el, x, y) {
	if (!el || !el.closest) return false;
	if (el.classList && el.classList.contains(_zdImgCls)) return false;
	if (isBlurBgCanvas(el)) return true;
	if (
		el.closest(".slick-slide:not(.slick-active)") ||
		el.closest(".swiper-slide:not(.swiper-slide-active)") ||
		el.closest('[aria-roledescription="slide"][aria-current="false"]') ||
		el.closest('[aria-roledescription="slide"][aria-hidden="true"]') ||
		el.closest("[inert]")
	) {
		return true;
	}

	const activeIdxContainer = el.closest("[data-active-index]");
	if (activeIdxContainer) {
		const activeIdx = parseInt(activeIdxContainer.getAttribute("data-active-index"), 10);
		const slide = Array.from(activeIdxContainer.children).find((ch) => ch.contains(el));
		if (slide && !isNaN(activeIdx) && Array.prototype.indexOf.call(activeIdxContainer.children, slide) !== activeIdx) {
			return true;
		}
	}

	if (!el.hasAttribute?.("data-zd-float-hidden") && !el.closest("[data-zd-card-lock]")) {
		for (let p = el; p && p !== document.body && p !== document.documentElement; p = composedParent(p)) {
			if (p.nodeType !== 1) continue;
			const pcs = window.getComputedStyle(p);
			if (pcs.display === "none" || (p === el && pcs.visibility === "hidden") || parseFloat(pcs.opacity) < 0.05) {
				return true;
			}
		}
	}

	const hasPoint = typeof x === "number" && typeof y === "number";
	const isVacatedFloatSlot = (node) =>
		Boolean(node && node.nodeType === 1 && node.querySelector && node.querySelector("[data-zd-float-hidden]"));
	const findHiddenAncestor = (start) => {
		for (let p = start; p && p !== document.body && p !== document.documentElement; p = composedParent(p)) {
			if (p.nodeType === 1 && p.getAttribute("aria-hidden") === "true") return p;
		}
		return null;
	};
	const hiddenRoot = findHiddenAncestor(el.tagName === "IMG" || el.tagName === "CANVAS" ? composedParent(el) : el);
	if (hiddenRoot) {
		const isLinkThumb = hiddenRoot.matches(_clickHostSel) || Boolean(el.closest && el.closest(_clickHostSel));
		const isSlideHidden = hiddenRoot.classList.contains("slide") || hiddenRoot.matches('[aria-roledescription="slide"]');
		const isCurrentlyActive = el === _img_element || isElementModified(el);
		if (!hasPoint) {
			if ((!isLinkThumb || isSlideHidden) && !isCurrentlyActive) return true;
		} else {
			let top = deepElementFromPoint(x, y);
			if (isInsidePanel(top)) top = deepElementsFromPoint(x, y).find((o) => !isInsidePanel(o)) || null;
			const isInsideHiddenRoot = Boolean(top && composedContains(hiddenRoot, top));
			const isUnderVacatedSlot = Boolean(top && !isSlideHidden && isVacatedFloatSlot(top) && inRect(el, x, y));
			const isNearOrInside =
				top &&
				(isInsideHiddenRoot ||
					isUnderVacatedSlot ||
					(!hiddenRoot.contains(el) && isNearRelated(el, top)) ||
					isPreviewVideoOverlay(top, el));
			if (!isNearOrInside && !(isLinkThumb && !isSlideHidden && inRect(hiddenRoot, x, y))) return true;
		}
	}

	if (hasPoint && (el.tagName === "IMG" || el.tagName === "CANVAS")) {
		const stack = deepElementsFromPoint(x, y).filter(
			(o) => !isOwnElement(o) && !isInsidePanel(o) && !(o.hasAttribute && o.hasAttribute("data-zd-float-hidden"))
		);
		if (stack.length > 0) {
			const previewVideos = findPreviewVideos(x, y, stack).filter((v) => isPreviewVideoOverlay(v, el));
			const elRect = el.getBoundingClientRect();
			const animOverlays = stack.filter(
				(o) =>
					o !== el &&
					isAnimatedPreviewImg(o) &&
					(sameBounds(o.getBoundingClientRect(), elRect) || rectsOverlap(o.getBoundingClientRect(), elRect))
			);
			const hasPreviewVideo = previewVideos.length > 0 || animOverlays.length > 0;
			const idx = stack.indexOf(el);
			const cs = window.getComputedStyle(el);
			const isPeNone = cs.pointerEvents === "none";
			const underVacatedSlot = isVacatedFloatSlot(stack[0]) && inRect(el, x, y);
			const noPointerEvents =
				isPeNone || cs.visibility === "hidden" || parseFloat(cs.opacity) < 0.05 || hasPreviewVideo || underVacatedSlot;

			if (idx === -1 && !noPointerEvents) return true;

			const limit = idx === -1 ? stack.length : idx;
			for (let i = 0; i < limit; i++) {
				const o = stack[i];
				if (idx === -1 && isPeNone && composedContains(o, el) && !(parseInt(cs.zIndex, 10) < 0)) break;
				if (composedContains(o, el) || composedContains(el, o)) continue;
				if (idx === -1 && isPeNone && o.contains && o.contains(el)) continue;
				if (isPreviewVideoOverlay(o, el) || animOverlays.includes(o)) continue;
				if (previewVideos.some((v) => o.contains(v) || findPreviewRoot(v).contains(o))) continue;
				if (
					(o.tagName === "IMG" || o.tagName === "CANVAS") &&
					o.closest('[aria-hidden="true"], [aria-roledescription="slide"][aria-current="false"], .slick-slide:not(.slick-active)')
				) {
					continue;
				}
				if (
					(o.tagName === "IMG" || o.tagName === "CANVAS") &&
					hasPreviewVideo &&
					sameBounds(o.getBoundingClientRect(), elRect)
				) {
					continue;
				}
				if (idx === -1 && isPeNone && isNearRelated(el, stack[0]) && !isNearRelated(o, stack[0])) {
					continue;
				}
				if (o.tagName === "IMG" || o.tagName === "CANVAS" || o.tagName === "VIDEO" || isOpaqueCover(o, elRect)) {
					if (isTransparentLayer(o)) continue;
					return true;
				}
			}

			if (!hasPreviewVideo && !underVacatedSlot && stack[0]) {
				if (hiddenRoot && !composedContains(hiddenRoot, stack[0])) {
					return true;
				}
				const gRoot = findGalleryRoot(el);
				if (gRoot && !composedContains(gRoot, stack[0]) && !composedContains(stack[0], gRoot)) {
					return true;
				}
				if (!isNearRelated(el, stack[0])) return true;
			}
		}
	}

	return false;
}

function deepElementsFromPoint(x, y, root = document, seen = new Set()) {
	seen.add(root);
	const out = [];
	for (const e of root.elementsFromPoint(x, y)) {
		const sr = getShadowRoot(e);
		if (sr && sr.elementsFromPoint && !seen.has(sr)) {
			for (const inner of deepElementsFromPoint(x, y, sr, seen)) {
				if (!out.includes(inner)) out.push(inner);
			}
		}
		if (!out.includes(e)) out.push(e);
	}
	return out;
}

function composedParent(n) {
	return n.parentNode || n.host || null;
}

function findGalleryRoot(el) {
	const seen = new Set();
	for (let n = el; n && !seen.has(n); n = composedParent(n)) {
		if (n.nodeType === 1 && n.matches(_galleryRootSel)) return n;
		seen.add(n);
	}
	return null;
}

function composedContains(a, b) {
	if (!a || !b) return false;
	const seen = new Set();
	for (let n = b; n && !seen.has(n); n = n.assignedSlot || n.parentNode || n.host || null) {
		if (n === a) return true;
		seen.add(n);
	}
	return false;
}

function isNearRelated(el, top) {
	if (composedContains(el, top) || composedContains(top, el)) return true;
	let anc = composedParent(el);
	for (let i = 0; i < 8 && anc && anc !== document.body && anc !== document.documentElement; i++) {
		if (composedContains(anc, top)) return true;
		anc = composedParent(anc);
	}
	return false;
}

function isInsidePanel(n) {
	const host = getPanelHost();
	return Boolean(host && n && composedContains(host, n));
}

function isOwnElement(o) {
	if (o.classList && (o.classList.contains(_zdImgCls) || o.classList.contains(_imgSrcViewCls))) return false;
	if (o.id && (o.id.startsWith("zdImg_") || o.id.startsWith("zd-"))) return true;
	if (!o.className || typeof o.className !== "string") return false;
	return o.className.split(/\s+/).some((c) => c.includes("zdImg") && !_zdStateCls.has(c));
}

function isTransparentLayer(o) {
	for (let p = o; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
		const pcs = window.getComputedStyle(p);
		if (pcs.display === "none" || pcs.visibility === "hidden" || parseFloat(pcs.opacity) < 0.05) return true;
	}
	return false;
}

function isOpaqueCover(o, refRect) {
	const cs = window.getComputedStyle(o);
	if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) < 0.85) return false;

	const nums = (cs.backgroundColor.match(/[\d.]+%?/g) || []).map((n) =>
		n.endsWith("%") ? parseFloat(n) / 100 : parseFloat(n)
	);
	if (nums.length < 3) return false;
	const alpha = nums.length >= 4 ? nums[3] : 1;

	if (alpha >= 0.85) {
		if (refRect && refRect.width > 0 && refRect.height > 0) {
			const r = o.getBoundingClientRect();
			if (r.width < refRect.width * 0.5 && r.height < refRect.height * 0.5) return false;
		}
		return true;
	}
	if (alpha >= 0.3 && cs.position === "fixed") {
		const r = o.getBoundingClientRect();
		if (r.width >= window.innerWidth * 0.9 && r.height >= window.innerHeight * 0.9) return true;
	}
	return false;
}

function hitCheck(obj, clientX, clientY) {
	const rect = obj.getBoundingClientRect();
	if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return false;
	if (isInactiveImageTarget(obj, clientX, clientY)) return false;

	const hasActiveVideoTwin = deepElementsFromPoint(clientX, clientY).some((el) => isPreviewVideoOverlay(el, obj));

	let node = obj;
	while (node && node !== document.body && node !== document.documentElement) {
		const style = window.getComputedStyle(node);
		if (style.display === "none") return false;
		if ((node === obj && style.visibility === "hidden") || parseFloat(style.opacity) < 0.01) {
			if (!hasActiveVideoTwin || !sameBounds(node.getBoundingClientRect(), rect)) return false;
		}
		if (
			node !== obj &&
			(style.overflow === "hidden" ||
				style.overflow === "scroll" ||
				style.overflow === "auto" ||
				style.overflow === "clip")
		) {
			const pRect = node.getBoundingClientRect();
			if (clientX < pRect.left || clientX > pRect.right || clientY < pRect.top || clientY > pRect.bottom) {
				return false;
			}
		}
		node = node.parentElement;
	}
	return true;
}

function getVisualTarget(x, y, fallback, allowDocFallback = true) {
	const panel = getPanelHost();
	if (panel) {
		const topEl = document.elementFromPoint(x, y);
		if (topEl && (topEl === panel || panel.contains(topEl))) return null;
	}

	const stack = deepElementsFromPoint(x, y);
	const deepEl = stack[0] || null;

	if (deepEl && deepEl.closest) {
		const host = deepEl.closest(".imgContainer, .richImage");
		if (host) {
			const imgs = host.querySelectorAll(`img.ovrr, img:not(.${_zdImgCls})`);
			for (const cand of imgs) {
				if (!isInactiveImageTarget(cand)) return cand;
			}
		}
	}

	const thumbUnderPreview = findThumbUnderPreview(x, y, stack);
	if (thumbUnderPreview) return thumbUnderPreview;

	for (const el of stack) {
		if ((el.tagName === "IMG" || el.tagName === "CANVAS") && !isOwnElement(el) && !isInactiveImageTarget(el, x, y)) {
			return el;
		}
	}

	const deepRoot = deepEl?.getRootNode?.();
	const searchRoot =
		(deepEl && deepEl.closest && deepEl.closest("article, figure, li, a, button, picture, [role='listitem']")) ||
		(deepEl && deepEl.parentElement) ||
		(deepRoot instanceof ShadowRoot ? deepRoot : allowDocFallback ? document : null);
	if (!searchRoot || (!allowDocFallback && (searchRoot === document.body || searchRoot === document.documentElement))) {
		return fallback;
	}
	const hasUsableCandidate = (list) =>
		Array.from(list).some(
			(c) => !c.hasAttribute("data-zd-float-hidden") && inRect(c, x, y) && !isInactiveImageTarget(c, x, y)
		);
	let candidates = searchRoot.querySelectorAll("img, canvas");
	if (!hasUsableCandidate(candidates)) {
		const seenRoots = new Set([searchRoot]);
		for (const el of stack) {
			const root = el.getRootNode?.();
			if (!(root instanceof ShadowRoot) || seenRoots.has(root)) continue;
			seenRoots.add(root);
			const srCandidates = root.querySelectorAll("img, canvas");
			if (hasUsableCandidate(srCandidates)) {
				candidates = srCandidates;
				break;
			}
		}
	}
	if (allowDocFallback && !hasUsableCandidate(candidates) && searchRoot !== document) {
		candidates = document.querySelectorAll("img, canvas");
	}

	let bestImg = null;
	let highestScore = -1;

	for (let i = 0; i < candidates.length; i++) {
		const img = candidates[i];
		const rect = img.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0 || x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
			continue;
		}

		if (hitCheck(img, x, y)) {
			let score = i;
			let parent = img.parentElement;
			while (parent && parent !== document.body) {
				const pStyle = window.getComputedStyle(parent);
				const z = parseInt(pStyle.zIndex, 10);
				if (!isNaN(z) && z > 0) score += z * 1000;
				if (pStyle.position === "fixed") score += 100000;
				parent = parent.parentElement;
			}
			if (window.getComputedStyle(img).pointerEvents === "none") score += 500000;

			if (score > highestScore) {
				highestScore = score;
				bestImg = img;
			}
		}
	}
	return bestImg || fallback;
}

function showZoomBadge() {
	if (_zdSuppressBadge || !_zoom_showZoomBadge || !_img_element) return;

	let b = document.getElementById("zdImg_zoomBadge");
	if (!b) {
		b = document.createElement("div");
		b.id = "zdImg_zoomBadge";
		b.className = "zdImg_zoomBadge";
		document.body.appendChild(b);
	}

	const data = getElData(_img_element, _firstkey);
	if (!data) return;

	const sizeData = getElData(_img_element, _sizekey);
	const curW = sizeData ? sizeData.w : _img_element.offsetWidth;
	const ratio = getZoomPct(curW, data.sw);
	const rot = normalizeRot(getElData(_img_element, _rotkey) || 0);

	b.textContent = rot !== 0 ? `${ratio}% \u2022 ${rot}\u00B0` : `${ratio}%`;

	const rect = _img_element.getBoundingClientRect();
	if (!_img_element.isConnected || (rect.width === 0 && rect.height === 0)) {
		b.style.opacity = "0";
		return;
	}

	let boxLeft = rect.left;
	let boxTop = rect.top;
	let boxW = rect.width;

	const isFloating =
		Boolean(getElData(_img_element, _srckey)) || (_singleImgPage && _img_element.classList.contains(_imgSrcViewCls));
	if (isFloating && sizeData) {
		const rawLeft = parseFloat(_img_element.style.left);
		const rawTop = parseFloat(_img_element.style.top);
		if (!isNaN(rawLeft) && !isNaN(rawTop)) {
			const rad = (rot * Math.PI) / 180;
			const cosA = Math.abs(Math.cos(rad));
			const sinA = Math.abs(Math.sin(rad));
			const visW = sizeData.w * cosA + sizeData.h * sinA;
			const visH = sizeData.w * sinA + sizeData.h * cosA;

			const centerDocX = rawLeft + sizeData.w / 2;
			const centerDocY = rawTop + sizeData.h / 2;

			const scrollOfs = getScrollOffset(_img_element);
			boxLeft = centerDocX - visW / 2 - scrollOfs.x;
			boxTop = centerDocY - visH / 2 - scrollOfs.y;
			boxW = visW;
		}
	}

	let cx = boxLeft + boxW / 2;
	const yOffset = ratio < 100 ? 45 - (100 - ratio) * 0.8 : 45;
	let cy = boxTop + yOffset;

	cx = Math.max(45, Math.min(window.innerWidth - 45, cx));
	cy = Math.max(25, Math.min(window.innerHeight - 25, cy));

	b.style.left = `${cx}px`;
	b.style.top = `${cy}px`;
	b.style.opacity = "1";

	scheduleBadgeFadeOut();
}

function updateSliderFill(input) {
	const min = parseFloat(input.min) || 0;
	const max = parseFloat(input.max) || 100;
	const parsedVal = parseFloat(input.value);
	const val = Math.min(max, Math.max(min, isNaN(parsedVal) ? min : parsedVal));
	const percent = ((val - min) / (max - min)) * 100;
	input.style.setProperty("--val", `${percent}%`);
}

const _svgSrcRe = /^data:image\/svg|\.svg(?:[?#]|$)/i;

function isSvgSource(el) {
	if (!el) return false;
	const bgUrl = getElData(el, _bgsrckey);
	if (bgUrl) return _svgSrcRe.test(bgUrl);
	if (el.tagName === "IMG") return _svgSrcRe.test(el.currentSrc || el.getAttribute("src") || "");
	return false;
}

function getNaturalSize(el) {
	if (!el) return null;
	if (el.tagName === "CANVAS") return el.width > 0 && el.height > 0 ? { w: el.width, h: el.height } : null;
	if (el.tagName === "IMG") {
		if (!(el.naturalWidth > 0 && el.naturalHeight > 0)) {
			if (!el.complete) {
				el.addEventListener(
					"load",
					() => {
						if (getPanelHost() && (_img_element === el || getElData(_img_element, _srckey) === el)) {
							syncBaseRect(_img_element);
							syncPanelValues();
							if (document.getElementById("zd-panel-frame")) applyPanelBorder();
						}
					},
					{ once: true }
				);
			}
			return null;
		}
		return isSvgSource(el) ? null : { w: el.naturalWidth, h: el.naturalHeight };
	}

	const bgUrl = getElData(el, _bgsrckey);
	if (bgUrl) {
		const bgSize = getElData(el, _bgsizekey);
		if (bgSize && bgSize.w > 0 && bgSize.h > 0) return { w: bgSize.w, h: bgSize.h };
		preloadBgNaturalSize(el, bgUrl);
	}
	return null;
}

const _imgFileSizes = new WeakMap();

function needsImgFileSize(el) {
	return Boolean(
		el &&
			el.tagName === "IMG" &&
			!el.classList.contains(_zdImgCls) &&
			!getElData(el, _srckey) &&
			(el.srcset || el.parentElement?.tagName === "PICTURE")
	);
}

function getImgFileSize(el, onReady = null, allowFallback = false) {
	const baseNat = getNaturalSize(el);
	if (!baseNat) return null;

	const url = el.currentSrc || el.src;
	if (!url) return baseNat;

	const cached = _imgFileSizes.get(el);
	if (cached && cached.url === url) {
		if (cached.status === "ok") return { w: cached.w, h: cached.h };
		if (cached.status === "error") return baseNat;
		if (onReady) cached.callbacks.push(onReady);
		return allowFallback ? baseNat : null;
	}

	const entry = { url, w: 0, h: 0, status: "loading", callbacks: onReady ? [onReady] : [] };
	_imgFileSizes.set(el, entry);

	const probe = new Image();
	if (el.crossOrigin) probe.crossOrigin = el.crossOrigin;
	if (el.referrerPolicy) probe.referrerPolicy = el.referrerPolicy;

	const notify = (size) => {
		const cbs = entry.callbacks;
		entry.callbacks = [];
		cbs.forEach((cb) => cb(size));
		if (getPanelHost() && (_img_element === el || getElData(_img_element, _srckey) === el)) {
			syncPanelValues();
		}
	};

	const commit = () => {
		if (_imgFileSizes.get(el) !== entry) return false;
		if (probe.naturalWidth > 0 && probe.naturalHeight > 0) {
			entry.w = probe.naturalWidth;
			entry.h = probe.naturalHeight;
			entry.status = "ok";
			return true;
		}
		return false;
	};

	probe.onload = () => {
		if (commit()) {
			notify({ w: entry.w, h: entry.h });
		} else if (_imgFileSizes.get(el) === entry) {
			entry.status = "error";
			notify(baseNat);
		}
	};
	probe.onerror = () => {
		if (_imgFileSizes.get(el) !== entry) return;
		entry.status = "error";
		notify(baseNat);
	};
	probe.src = url;

	if (probe.complete && commit()) {
		probe.onload = null;
		probe.onerror = null;
		entry.callbacks = [];
		return { w: entry.w, h: entry.h };
	}
	return allowFallback ? baseNat : null;
}

function getResolvedNaturalSize(el, onReady = null, allowFallback = false) {
	return needsImgFileSize(el) ? getImgFileSize(el, onReady, allowFallback) : getNaturalSize(el);
}

function updatePanelMeta(shadow) {
	const metaEl = shadow.getElementById("zd-panel-meta");
	if (!metaEl) return;

	const nat =
		getResolvedNaturalSize(_img_element, null, true) ||
		getResolvedNaturalSize(getElData(_img_element, _srckey), null, true);
	const size = getElData(_img_element, _sizekey);
	metaEl.textContent = nat && size ? `${nat.w} \u00D7 ${nat.h} px \u00B7 ${Math.round((size.w / nat.w) * 100)} %` : "";
}

function updateEffectButtons(shadow) {
	const fx = getFilterEffects(_img_element);
	const states = {
		"zd-btn-invert": fx.invert,
		"zd-btn-gray": fx.gray,
		"zd-btn-pixel": isPixelMode(_img_element),
		"zd-btn-pin": isPinned(_img_element)
	};

	for (const [id, isOn] of Object.entries(states)) {
		const btn = shadow.getElementById(id);
		if (!btn) continue;
		const isPin = id === "zd-btn-pin";
		btn.setAttribute("aria-pressed", String(isOn));
		btn.style.background = isOn ? (isPin ? _zoom_pinColor : "var(--bg-btn-flip-active)") : "var(--bg-btn-neutral)";
		btn.style.color = isOn
			? isPin
				? ZDShared.readableTextColor(_zoom_pinColor)
				: "var(--text-btn-flip-active)"
			: "var(--text-btn-neutral)";
	}
}

function syncPanelValues() {
	const panel = getPanelHost();
	const shadow = getPanelShadow();
	if (!panel || !_img_element || !shadow) return;

	document.querySelectorAll(`.${_zdImgCls}, .${_imgSrcViewCls}`).forEach((img) => {
		if (img !== _img_element) clearBorderStyles(img);
	});

	const data = getElData(_img_element, _firstkey);
	const size = getElData(_img_element, _sizekey);
	if (!data || !size) return;

	const btnFlipH = shadow.getElementById("zd-btn-flip-h");
	const btnFlipV = shadow.getElementById("zd-btn-flip-v");

	if (btnFlipH && btnFlipV) {
		const flipX = getElData(_img_element, _flipXkey) || 1;
		const flipY = getElData(_img_element, _flipYkey) || 1;

		btnFlipH.style.background = flipX === -1 ? "var(--bg-btn-flip-active)" : "var(--bg-btn-neutral)";
		btnFlipH.style.color = flipX === -1 ? "var(--text-btn-flip-active)" : "var(--text-btn-neutral)";
		btnFlipV.style.background = flipY === -1 ? "var(--bg-btn-flip-active)" : "var(--bg-btn-neutral)";
		btnFlipV.style.color = flipY === -1 ? "var(--text-btn-flip-active)" : "var(--text-btn-neutral)";
	}

	updateEffectButtons(shadow);
	updatePanelMeta(shadow);

	const curZoom = getZoomPct(size.w, data.sw);
	const curWidth = Math.round(size.w);
	const curRot = normalizeRot(getElData(_img_element, _rotkey) || 0);

	const zSl = shadow.getElementById("zd-sl-zoom");
	const zNum = shadow.getElementById("zd-num-zoom");
	if (zNum) zNum.min = String(Math.min(100, getZoomPct(20, data.sw)));
	const wSl = shadow.getElementById("zd-sl-width");
	const wNum = shadow.getElementById("zd-num-width");
	const rSl = shadow.getElementById("zd-sl-rot");
	const rNum = shadow.getElementById("zd-num-rot");
	const oSl = shadow.getElementById("zd-sl-opac");
	const oNum = shadow.getElementById("zd-num-opac");
	const bSl = shadow.getElementById("zd-sl-bright");
	const bNum = shadow.getElementById("zd-num-bright");

	const curOpac = getOpacityPct(_img_element);
	const curBright = getBrightnessPct(_img_element);

	const active = shadow.activeElement;
	const isTypingNum = active && active.tagName === "INPUT" && active.type === "number" && active.matches(":focus-visible");
	const isDraggingSlider = active && active.tagName === "INPUT" && active.type === "range" && active.matches(":active");
	const isInputBusy = isTypingNum || isDraggingSlider;
	const isSizeActive = isInputBusy && (active === zSl || active === zNum || active === wSl || active === wNum);
	const isRotActive = isInputBusy && (active === rSl || active === rNum);
	const isOpacActive = isInputBusy && (active === oSl || active === oNum);
	const isBrightActive = isInputBusy && (active === bSl || active === bNum);

	if (zSl && !isSizeActive && Math.abs(parseInt(zSl.value, 10) - curZoom) > 1) {
		zSl.value = zNum.value = curZoom;
	}
	if (wSl && !isSizeActive && Math.abs(parseInt(wSl.value, 10) - curWidth) > 1) {
		wSl.value = wNum.value = curWidth;
	}
	if (rSl && !isRotActive && parseInt(rSl.value, 10) !== curRot) {
		rSl.value = rNum.value = curRot;
	}
	if (oSl && !isOpacActive && parseInt(oSl.value, 10) !== curOpac) {
		oSl.value = oNum.value = curOpac;
	}
	if (bSl && !isBrightActive && parseInt(bSl.value, 10) !== curBright) {
		bSl.value = bNum.value = curBright;
	}

	[zSl, wSl, rSl, oSl, bSl].forEach((slider) => {
		if (slider) updateSliderFill(slider);
	});
}

function resolveBgSize(bgSize, nw, nh, boxW, boxH, pxScale) {
	const parts = bgSize.split(/\s+/);
	const parse = (token, boxDim) => {
		if (!token || token === "auto") return null;
		if (token.endsWith("%")) return (parseFloat(token) / 100) * boxDim;
		if (token.endsWith("px")) return parseFloat(token) * pxScale;
		return undefined;
	};
	const w = parse(parts[0], boxW);
	const h = parse(parts[1] ?? "auto", boxH);
	if (w === undefined || h === undefined || Number.isNaN(w) || Number.isNaN(h)) return null;

	let size;
	if (w === null && h === null) size = { w: nw * pxScale, h: nh * pxScale };
	else if (w === null) size = { w: h * (nw / nh), h };
	else if (h === null) size = { w, h: w * (nh / nw) };
	else size = { w, h };
	return size.w > 0 && size.h > 0 ? size : null;
}

function isBgRepeating(repeat) {
	const tokens = (repeat || "repeat").trim().split(/\s+/);
	const repeats = (t) => t === "repeat" || t === "repeat-x" || t === "repeat-y" || t === "space" || t === "round";
	return repeats(tokens[0]) || repeats(tokens[1] ?? "no-repeat");
}

function getRenderedContentBox(el, boxW, boxH, isBg) {
	if (!(boxW > 0 && boxH > 0)) return { w: boxW, h: boxH, offX: 0, offY: 0, shrunk: false };

	const compStyle = window.getComputedStyle(el);
	const pxScale = el.offsetWidth > 0 ? boxW / el.offsetWidth : 1;
	let fit = "fill";
	let posStr = "50% 50%";
	let nw = 0;
	let nh = 0;
	let explicitSize = null;

	const svgFit = isBg && isSvgImageElement(el) ? getSvgImageFit(el) : null;

	if (isBg) {
		const bgSize = svgFit ? svgFit.size : (compStyle.backgroundSize || "auto").trim();
		if (bgSize === "cover" || bgSize === "100% 100%") {
			return { w: boxW, h: boxH, offX: 0, offY: 0, shrunk: false };
		}
		const nat = getNaturalSize(el);
		if (!nat) return { w: boxW, h: boxH, offX: 0, offY: 0, shrunk: false };
		nw = nat.w;
		nh = nat.h;
		fit = bgSize === "contain" || bgSize === "scale-down" ? bgSize : bgSize === "auto" || bgSize === "auto auto" ? "none" : "contain";
		if (fit === "contain" && bgSize !== "contain") {
			const explicit = resolveBgSize(bgSize, nw, nh, boxW, boxH, pxScale);
			if (explicit) {
				if (isBgRepeating(compStyle.backgroundRepeat)) return { w: boxW, h: boxH, offX: 0, offY: 0, shrunk: false };
				explicitSize = explicit;
				fit = "explicit";
			}
		}
		posStr = svgFit ? svgFit.pos : compStyle.backgroundPosition || "50% 50%";
	} else if (el.tagName === "IMG") {
		const objFit = compStyle.objectFit || "fill";
		if (objFit !== "contain" && objFit !== "scale-down" && objFit !== "none") {
			return { w: boxW, h: boxH, offX: 0, offY: 0, shrunk: false };
		}
		const nat = getNaturalSize(el);
		if (!nat) return { w: boxW, h: boxH, offX: 0, offY: 0, shrunk: false };
		nw = nat.w;
		nh = nat.h;
		fit = objFit;
		posStr = compStyle.objectPosition || "50% 50%";
	} else {
		return { w: boxW, h: boxH, offX: 0, offY: 0, shrunk: false };
	}

	let w = boxW;
	let h = boxH;
	if (fit === "explicit") {
		w = explicitSize.w;
		h = explicitSize.h;
	} else if (fit === "none") {
		w = nw * pxScale;
		h = nh * pxScale;
	} else {
		const natRatio = nw / nh;
		const cssRatio = boxW / boxH;
		if (natRatio > cssRatio) h = boxW / natRatio;
		else w = boxH * natRatio;

		if (fit === "scale-down") {
			const natW = nw * pxScale;
			const natH = nh * pxScale;
			if (natW < w && natH < h) {
				w = natW;
				h = natH;
			}
		}
	}

	if (Math.abs(boxW - w) <= 0.5 && Math.abs(boxH - h) <= 0.5) {
		return { w: boxW, h: boxH, offX: 0, offY: 0, shrunk: false };
	}

	const pos = posStr.trim().split(/\s+(?![^(]*\))/);
	const left = resolveObjectPos(pos[0], boxW - w, pxScale);
	const top = resolveObjectPos(pos[1] ?? "50%", boxH - h, pxScale);
	const visL = Math.max(0, left);
	const visR = Math.min(boxW, left + w);
	const visT = Math.max(0, top);
	const visB = Math.min(boxH, top + h);

	if (visR > visL && visB > visT) {
		const visW = visR - visL;
		const visH = visB - visT;
		const offX = (visL + visR - boxW) / 2;
		const offY = (visT + visB - boxH) / 2;
		const shrunk = Math.abs(boxW - visW) > 0.5 || Math.abs(boxH - visH) > 0.5;
		return { w: visW, h: visH, offX, offY, shrunk };
	}

	return { w, h, offX: 0, offY: 0, shrunk: true };
}

function adjustSizeToNaturalAspectRatio(img, uw, uh, isBg) {
	const box = getRenderedContentBox(img, uw, uh, isBg);
	return { w: box.w, h: box.h, offX: box.offX, offY: box.offY };
}

function getObjectFitHeight(img, targetW, bData) {
	const origElem = getElData(img, _srckey) || img;
	const isBg = Boolean(getElData(origElem, _bgsrckey));
	const objFit = window.getComputedStyle(img).objectFit || "fill";

	if ((isBg || img.tagName === "IMG") && objFit !== "cover" && objFit !== "fill") {
		const nat = getNaturalSize(img) || getNaturalSize(origElem);
		if (nat) return targetW / (nat.w / nat.h);
	}
	return (bData.sh / bData.sw) * targetW;
}

function extractTransformMatrixData(img) {
	let txPct = 0;
	let tyPct = 0;
	let origMatrix = "";
	const compStyle = window.getComputedStyle(img);
	if (compStyle.transform && compStyle.transform !== "none" && !img.classList.contains("fullscreen")) {
		origMatrix = compStyle.transform;
		try {
			const matrix = new DOMMatrix(compStyle.transform);
			const rawW = img.offsetWidth || 1;
			const rawH = img.offsetHeight || 1;
			txPct = Math.round((matrix.m41 / rawW) * 100);
			tyPct = Math.round((matrix.m42 / rawH) * 100);
		} catch (e) {}
	}
	return { txPct, tyPct, origMatrix };
}

function hasRestWrapper(el) {
	if (!el || !el.parentElement || el.classList.contains("fullscreen")) return false;
	if (el.closest && el.closest(".fullscreen, .swiper-slide-zoomed, .swiper-zoom-container, .zoomed-in, .zoomable-in")) return false;
	return Boolean(el.parentElement.closest(".imgpt, .iusc, .isv-r, a, button, figure, picture"));
}

function getLiveScale(el) {
	let x = 1;
	let y = 1;
	if (el && el.isConnected && !el.classList.contains("fullscreen") && !hasRestWrapper(el)) {
		const transform = window.getComputedStyle(el).transform;
		if (transform && transform !== "none") {
			try {
				const matrix = new DOMMatrix(transform);
				x = Math.hypot(matrix.a, matrix.b) || 1;
				y = Math.hypot(matrix.c, matrix.d) || 1;
			} catch (e) {}
		}
	}
	return { x, y };
}

function hasRotationTransform(el) {
	const compStyle = window.getComputedStyle(el);
	if (compStyle.rotate && compStyle.rotate !== "none" && parseFloat(compStyle.rotate) !== 0) return true;
	const transform = compStyle.transform;
	if (!transform || transform === "none") return false;
	try {
		const matrix = new DOMMatrix(transform);
		return Math.abs(matrix.b) > _restRectEps || Math.abs(matrix.c) > _restRectEps;
	} catch (e) {
		return false;
	}
}

function syncBaseRect(img, lightweight = false) {
	if (!img) return;
	const data = getElData(img, _firstkey);
	if (!data || getElData(img, _srckey)) return;

	if (!isElementModified(img) && !img.classList.contains("zdImgCls_animated")) {
		if (!img.isConnected || isInactiveImageTarget(img)) return;

		if (lightweight && data.sw > 0 && data.sh > 0) {
			const liveRect = img.getBoundingClientRect();
			if (liveRect.width === 0 || liveRect.height === 0) return;
			const isBg = Boolean(getElData(img, _bgsrckey));
			const boxW = img.offsetWidth || liveRect.width;
			const boxH = img.offsetHeight || liveRect.height;
			const cBox = getRenderedContentBox(img, boxW, boxH, isBg);
			const cx = liveRect.left + window.scrollX + liveRect.width / 2 + cBox.offX;
			const cy = liveRect.top + window.scrollY + liveRect.height / 2 + cBox.offY;
			data.sx = cx - data.sw / 2;
			data.sy = cy - data.sh / 2;
			data.origSx = data.sx;
			data.origSy = data.sy;
			data.boxLeft = img.offsetLeft;
			data.boxTop = img.offsetTop;
			data.boxW = boxW;
			data.boxH = boxH;
			return;
		}

		if (hasRotationTransform(img)) return;

		const rect = img.classList.contains("fullscreen") ? img.getBoundingClientRect() : getRestRect(img);
		if (rect.width === 0 || rect.height === 0) return;
		let uw = rect.width || img.offsetWidth || img.naturalWidth || 100;
		let uh = rect.height || img.offsetHeight || img.naturalHeight || 100;
		let cx = rect.left + window.scrollX + rect.width / 2;
		let cy = rect.top + window.scrollY + rect.height / 2;

		const isBg = Boolean(getElData(img, _bgsrckey));
		const adjusted = adjustSizeToNaturalAspectRatio(img, uw, uh, isBg);
		uw = adjusted.w;
		uh = adjusted.h;
		cx += adjusted.offX;
		cy += adjusted.offY;

		data.sw = uw;
		data.sh = uh;
		data.sx = cx - uw / 2;
		data.sy = cy - uh / 2;
		data.origSx = data.sx;
		data.origSy = data.sy;
		data.boxLeft = img.offsetLeft;
		data.boxTop = img.offsetTop;
		data.boxW = img.offsetWidth || uw;
		data.boxH = img.offsetHeight || uh;

		if (!img.matches(":hover")) {
			const baseStyle = window.getComputedStyle(img);
			data.baseFilter = img.style.filter || (baseStyle.filter !== "none" ? baseStyle.filter : "");
			data.baseOpacity = img.style.opacity ? parseFloat(img.style.opacity) : parseFloat(baseStyle.opacity) || 1;
		}

		if (data.origStyle && !img.style.getPropertyPriority("min-width")) {
			data.origStyle.left = img.style.left;
			data.origStyle.top = img.style.top;
			data.origStyle.width = img.style.width;
			data.origStyle.height = img.style.height;
			data.origStyle.maxWidth = img.style.maxWidth;
			data.origStyle.maxHeight = img.style.maxHeight;
			data.origStyle.minWidth = img.style.minWidth;
			data.origStyle.minHeight = img.style.minHeight;
			data.origStyle.marginTop = img.style.marginTop;
			data.origStyle.marginRight = img.style.marginRight;
			data.origStyle.marginBottom = img.style.marginBottom;
			data.origStyle.marginLeft = img.style.marginLeft;
			data.origStyle.transform = img.style.transform;
			data.origStyle.transformOrigin = img.style.transformOrigin;
			if (!img.matches(":hover")) {
				data.origStyle.filter = img.style.filter;
				data.origStyle.opacity = img.style.opacity;
				data.origStyle.imageRendering = img.style.imageRendering;
			}
			if (isBg) {
				data.origStyle.backgroundSize = img.style.backgroundSize;
				data.origStyle.backgroundPosition = img.style.backgroundPosition;
				data.origStyle.backgroundPositionX = img.style.backgroundPositionX;
				data.origStyle.backgroundPositionY = img.style.backgroundPositionY;
				data.origStyle.backgroundRepeat = img.style.backgroundRepeat;
			}
		}

		const { txPct, tyPct, origMatrix } = extractTransformMatrixData(img);
		data.origMatrix = origMatrix;
		data.txPct = txPct;
		data.tyPct = tyPct;

		setElData(img, _sizekey, { w: uw, h: uh });
	}
}

const _restRectEps = 0.001;
const _inlineTransformTags = new Set(["IMG", "VIDEO", "CANVAS", "SVG", "IFRAME", "OBJECT", "EMBED"]);

function invertRestLevel(r, lv) {
	return {
		left: (r.left - lv.cx - lv.tx) / lv.sx + lv.cx,
		top: (r.top - lv.cy - lv.ty) / lv.sy + lv.cy,
		width: r.width / lv.sx,
		height: r.height / lv.sy
	};
}

function applyRestLevel(r, lv) {
	return {
		left: lv.sx * (r.left - lv.cx) + lv.cx + lv.tx,
		top: lv.sy * (r.top - lv.cy) + lv.cy + lv.ty,
		width: r.width * lv.sx,
		height: r.height * lv.sy
	};
}

function solveRestRect(imgRect, levels) {
	const n = levels.length;
	for (let i = n - 1; i >= 0; i--) {
		const lv = levels[i];
		let r = { left: lv.vis.left, top: lv.vis.top, width: lv.vis.width, height: lv.vis.height };
		for (let j = n - 1; j > i; j--) r = invertRestLevel(r, levels[j]);
		lv.cx = r.left - (1 - lv.sx) * lv.ox - lv.tx + lv.ox;
		lv.cy = r.top - (1 - lv.sy) * lv.oy - lv.ty + lv.oy;
	}

	let r = { left: imgRect.left, top: imgRect.top, width: imgRect.width, height: imgRect.height };
	for (let j = n - 1; j >= 0; j--) r = invertRestLevel(r, levels[j]);
	for (const lv of levels) {
		if (lv.inChain) {
			r.left += lv.tx;
			r.top += lv.ty;
		} else {
			r = applyRestLevel(r, lv);
		}
	}

	return {
		left: r.left,
		top: r.top,
		right: r.left + r.width,
		bottom: r.top + r.height,
		width: r.width,
		height: r.height
	};
}

function readRestRectLevel(el, inChain) {
	const compStyle = window.getComputedStyle(el);
	if (!compStyle.transform || compStyle.transform === "none") return null;
	if (compStyle.display === "inline" && !_inlineTransformTags.has(el.tagName.toUpperCase())) return null;
	if (el instanceof SVGElement && el.tagName.toLowerCase() !== "svg") return false;

	try {
		const m = new DOMMatrix(compStyle.transform);
		const origin = compStyle.transformOrigin.split(" ").map(parseFloat);
		const is3d = [m.m13, m.m23, m.m31, m.m32, m.m14, m.m24, m.m34].some((v) => Math.abs(v) > _restRectEps);
		const isPlanar = Math.abs(m.b) < _restRectEps && Math.abs(m.c) < _restRectEps;
		if (is3d || !isPlanar || m.a <= 0 || m.d <= 0 || !Number.isFinite(origin[0]) || !Number.isFinite(origin[1])) {
			return false;
		}

		const vis = el.getBoundingClientRect();
		return {
			inChain,
			sx: m.a,
			sy: m.d,
			tx: m.e,
			ty: m.f,
			ox: origin[0],
			oy: origin[1],
			vis: { left: vis.left, top: vis.top, width: vis.width, height: vis.height }
		};
	} catch (e) {
		return false;
	}
}

function computeRestRectExact(img, hoverWrapper, rect) {
	const levels = [];
	let inChain = true;
	for (let p = img; p; p = composedParent(p)) {
		if (p.nodeType !== 1) continue;
		const level = readRestRectLevel(p, inChain);
		if (level === false) return null;
		if (level) levels.push(level);
		if (p === hoverWrapper) inChain = false;
	}
	return solveRestRect(rect, levels);
}

function getRestRectApprox(rect, totalScaleX, totalScaleY) {
	const restW = rect.width / totalScaleX;
	const restH = rect.height / totalScaleY;
	const cx = rect.left + rect.width / 2;
	const cy = rect.top + rect.height / 2;

	return {
		left: cx - restW / 2,
		top: cy - restH / 2,
		right: cx + restW / 2,
		bottom: cy + restH / 2,
		width: restW,
		height: restH
	};
}

function getRestRect(img) {
	const rect = img.getBoundingClientRect();
	if (
		rect.width === 0 ||
		rect.height === 0 ||
		img.classList.contains("fullscreen") ||
		(img.closest && img.closest(".fullscreen, .swiper-slide-zoomed, .swiper-zoom-container, .zoomed-in, .zoomable-in"))
	) {
		return rect;
	}
	const hoverWrapper = img.parentElement
		? img.parentElement.closest(".imgpt, .iusc, .isv-r, a, button, figure, picture")
		: null;
	if (!hoverWrapper) return rect;

	let totalScaleX = 1;
	let totalScaleY = 1;
	let p = img;

	while (p && p !== hoverWrapper.parentElement) {
		const compStyle = window.getComputedStyle(p);
		if (compStyle.transform && compStyle.transform !== "none") {
			try {
				const matrix = new DOMMatrix(compStyle.transform);
				const sx = Math.hypot(matrix.a, matrix.b);
				const sy = Math.hypot(matrix.c, matrix.d);
				if (sx > 0 && Math.abs(sx - 1) > 0.001) totalScaleX *= sx;
				if (sy > 0 && Math.abs(sy - 1) > 0.001) totalScaleY *= sy;
			} catch (e) {}
		}
		p = p.parentElement;
	}

	if (Math.abs(totalScaleX - 1) <= 0.001 && Math.abs(totalScaleY - 1) <= 0.001) {
		return rect;
	}

	return computeRestRectExact(img, hoverWrapper, rect) || getRestRectApprox(rect, totalScaleX, totalScaleY);
}

function wheelGuard(e) {
	const panel = getPanelHost();
	if (panel && (panel.contains(e.target) || (e.composedPath && e.composedPath().includes(panel)))) return;
	if (_rightBtnDown && _img_element) {
		e.preventDefault();
		return;
	}
	const activeOrig = _img_element ? getElData(_img_element, _srckey) || _img_element : null;
	if (
		activeOrig &&
		activeOrig.isConnected &&
		activeOrig.classList?.contains("fullscreen") &&
		(panel || isElementModified(_img_element) || isElementModified(activeOrig))
	) {
		e.preventDefault();
		e.stopPropagation();
	}
}

function attachWheelListeners() {
	window.addEventListener("wheel", wheelGuard, { passive: false, capture: true });
	window.addEventListener("wheel", zoomEvent, { passive: false, capture: true });
}

function detachWheelListeners() {
	window.removeEventListener("wheel", wheelGuard, { capture: true });
	window.removeEventListener("wheel", zoomEvent, { capture: true });
}

function setZoom(img, def, skipBadge = false, keepBadge = false) {
	detachWheelListeners();

	if (_rclickTimer) {
		clearTimeout(_rclickTimer);
		_rclickTimer = null;
	}

	if (img) {
		if (_isExcludedHost) {
			_img_element = null;
			return;
		}

		if (_img_element && !isSameImageGroup(_img_element, img)) {
			const prevOrig = getElData(_img_element, _srckey) || _img_element;
			if (!isElementModified(_img_element) && !isElementModified(prevOrig)) {
				unlockContainers(prevOrig);
			}
		}

		d("ZoomTarget Set", "----------");
		_img_element = img;
		_current_element = img;

		if (!def && !getElData(img, _srckey)) {
			registerSwitcherImage(img);
		}
		watchPlayerVideos(getElData(img, _srckey) || img);

		const data = getElData(img, _firstkey);
		if (!getElData(img, _bgsrckey) && img.tagName !== "IMG" && img.tagName !== "CANVAS") {
			extractBgUrlIfEnabled(img);
		}
		const isBg = Boolean(getElData(img, _bgsrckey));

		if (!data) {
			const rect = def || img.classList.contains("fullscreen") ? img.getBoundingClientRect() : getRestRect(img);
			let uw = def ? def.sw : rect.width || img.offsetWidth || img.naturalWidth || 100;
			let uh = def ? def.sh : rect.height || img.offsetHeight || img.naturalHeight || 100;
			let cx = rect.left + window.scrollX + rect.width / 2;
			let cy = rect.top + window.scrollY + rect.height / 2;

			if (!def) {
				const adjusted = adjustSizeToNaturalAspectRatio(img, uw, uh, isBg);
				uw = adjusted.w;
				uh = adjusted.h;
				cx += adjusted.offX;
				cy += adjusted.offY;
			}

			const { txPct, tyPct, origMatrix } = extractTransformMatrixData(img);
			const baseStyle = window.getComputedStyle(img);

			const obj = {
				id: `zdImg_${Date.now().toString(16)}`,
				sw: uw,
				sh: uh,
				sx: def ? def.sx : cx - uw / 2,
				sy: def ? def.sy : cy - uh / 2,
				origSx: def ? def.sx : cx - uw / 2,
				origSy: def ? def.sy : cy - uh / 2,
				boxLeft: img.offsetLeft,
				boxTop: img.offsetTop,
				boxW: img.offsetWidth || uw,
				boxH: img.offsetHeight || uh,
				txPct,
				tyPct,
				origMatrix,
				baseFilter: img.style.filter || (baseStyle.filter !== "none" ? baseStyle.filter : ""),
				baseOpacity: img.style.opacity ? parseFloat(img.style.opacity) : parseFloat(baseStyle.opacity) || 1,
				origStyle: {
					left: img.style.left,
					top: img.style.top,
					width: img.style.width,
					height: img.style.height,
					maxWidth: img.style.maxWidth,
					maxHeight: img.style.maxHeight,
					minWidth: img.style.minWidth,
					minHeight: img.style.minHeight,
					marginTop: img.style.marginTop,
					marginRight: img.style.marginRight,
					marginBottom: img.style.marginBottom,
					marginLeft: img.style.marginLeft,
					justifySelf: img.style.justifySelf,
					alignSelf: img.style.alignSelf,
					transformOrigin: img.style.transformOrigin,
					transform: img.style.transform,
					zIndex: img.style.zIndex,
					objectFit: img.style.objectFit,
					filter: img.style.filter,
					opacity: img.style.opacity,
					imageRendering: img.style.imageRendering,
					backgroundImage: img.style.backgroundImage,
					backgroundSize: img.style.backgroundSize,
					backgroundPosition: img.style.backgroundPosition,
					backgroundPositionX: img.style.backgroundPositionX,
					backgroundPositionY: img.style.backgroundPositionY,
					backgroundRepeat: img.style.backgroundRepeat
				}
			};
			setElData(img, _firstkey, obj);
			setElData(img, _sizekey, { w: obj.sw, h: obj.sh });
			setElData(img, _rotkey, 0);
			setElData(img, _flipXkey, 1);
			setElData(img, _flipYkey, 1);
		} else {
			syncBaseRect(img);
		}

		attachWheelListeners();
		refreshShortcutTimeout();

		if (!skipBadge) showZoomBadge();
	} else {
		const panel = getPanelHost();
		if (panel) {
			syncPanelValues();
			if (panel.matches(":hover") || panelHasFocus()) {
				applyPanelBorder();
			}
			attachWheelListeners();
			return;
		}

		d("ZoomTarget Clear", "");

		if (_rclickHoldTimer) {
			clearTimeout(_rclickHoldTimer);
			_rclickHoldTimer = null;
		}

		if (!keepBadge) {
			const b = document.getElementById("zdImg_zoomBadge");
			if (b) b.style.opacity = "0";
		}

		if (_img_element) {
			if (_zoom_autoRtn && isRcModified(_img_element)) {
				autoResetImage();
			} else if (!isElementModified(_img_element)) {
				restoreElementZIndex(_img_element);
			}
		}

		_img_element = null;
		if (!_rightBtnDown) _ctx_show = true;
	}
}

function getRcKey(el) {
	return el ? getElData(el, _srckey) || el : null;
}

function markRcModified(el) {
	const target = el || _img_element;
	if (!_zoom_autoRtn || !_rightBtnDown || !target) return;
	_rcModifiedEls.add(getRcKey(target));
}

function isRcModified(el) {
	return Boolean(el && _rcModifiedEls.has(getRcKey(el)));
}

function autoResetImage() {
	_rcModifiedEls.delete(getRcKey(_img_element));

	_img_element.classList.remove(_draggedCls);
	restoreFilterAndOpacity(_img_element);
	_img_element.style.removeProperty("cursor");

	setElData(_img_element, _flipXkey, 1);
	setElData(_img_element, _flipYkey, 1);

	const floatImg = _img_element;
	const src_elem = getElData(floatImg, _srckey);
	if (src_elem) {
		const gRoot = getElData(floatImg, _galleryRootkey) || findGalleryRoot(src_elem);
		const swapSlot = getElData(floatImg, _swapSlotkey);
		_zdSuppressBadge = true;
		const sourceFullyReset = clearImgEx(src_elem);
		_zdSuppressBadge = false;
		_modifiedElements.delete(src_elem);
		if (sourceFullyReset) {
			_modifiedElements.delete(floatImg);
			rebindPanelOrActiveGalleryImg(src_elem, gRoot, swapSlot);
			hideBadgeImmediate();
			return;
		}
	}

	const resetTarget = _img_element;
	setImageRect();
	imgRotate(0);
	restoreElementZIndex(resetTarget);
	unlockContainers(resetTarget);
	_modifiedElements.delete(resetTarget);
	if (!getPanelHost()) {
		elementDataMap.delete(resetTarget);
	}
	hideBadgeImmediate();
}

function calcPos(zoomSize, forceFloating = false) {
	const winW = _singleImgPage ? window.innerWidth : document.documentElement.clientWidth;
	const winH = _singleImgPage ? window.innerHeight : document.documentElement.clientHeight;
	const scrX = window.scrollX;
	const scrY = window.scrollY;

	const data = getElData(_img_element, _firstkey);
	let rect = { x: data.sx, y: data.sy, w: data.sw, h: data.sh, r: data.sx + data.sw, b: data.sy + data.sh };

	const isDragged = _img_element.classList.contains(_draggedCls);
	if (isDragged) {
		const rawLeft = parseFloat(_img_element.style.left);
		const rawTop = parseFloat(_img_element.style.top);
		const ofst = {
			left: isNaN(rawLeft) ? getOffset(_img_element).left : rawLeft,
			top: isNaN(rawTop) ? getOffset(_img_element).top : rawTop
		};
		const currentSize = getElData(_img_element, _sizekey);
		const iesz = currentSize
			? { w: currentSize.w, h: currentSize.h }
			: { w: _img_element.offsetWidth, h: _img_element.offsetHeight };

		rect = { x: ofst.left, y: ofst.top, w: iesz.w, h: iesz.h, r: ofst.left + iesz.w, b: ofst.top + iesz.h };
	}

	const rot = getElData(_img_element, _rotkey) || 0;
	const rad = (rot * Math.PI) / 180;
	const cosA = Math.abs(Math.cos(rad));
	const sinA = Math.abs(Math.sin(rad));

	const visW = zoomSize.w * cosA + zoomSize.h * sinA;
	const visH = zoomSize.w * sinA + zoomSize.h * cosA;

	const cx = rect.x + rect.w / 2;
	const cy = rect.y + rect.h / 2;

	let visLeft = cx - visW / 2;
	let visTop = cy - visH / 2;

	const origElem = getElData(_img_element, _srckey) || _img_element;
	const isBg = Boolean(getElData(origElem, _bgsrckey));
	const isFloating = forceFloating || Boolean(getElData(_img_element, _srckey));

	if (!isDragged && !_singleImgPage && !isBg && !isFloating) {
		const scrRect = { x: scrX, y: scrY, w: winW, h: winH, r: scrX + winW, b: scrY + winH };

		const rectVisW = rect.w * cosA + rect.h * sinA;
		const rectVisH = rect.w * sinA + rect.h * cosA;
		const rectVisX = cx - rectVisW / 2;
		const rectVisY = cy - rectVisH / 2;

		if (rectVisX < scrRect.x) scrRect.x = rectVisX;
		if (rectVisX + rectVisW > scrRect.r) scrRect.r = rectVisX + rectVisW;
		if (rectVisY < scrRect.y) scrRect.y = rectVisY;
		if (rectVisY + rectVisH > scrRect.b) scrRect.b = rectVisY + rectVisH;

		if (visW <= scrRect.w) {
			if (visLeft < scrRect.x) visLeft = scrRect.x;
			if (visLeft + visW > scrRect.r) visLeft = scrRect.r - visW;
		} else {
			visLeft = scrRect.x - (visW - scrRect.w) / 2;
		}

		if (visH <= scrRect.h) {
			if (visTop < scrRect.y) visTop = scrRect.y;
			if (visTop + visH > scrRect.b) visTop = scrRect.b - visH;
		} else {
			visTop = scrRect.y - (visH - scrRect.h) / 2;
		}
	}

	const x = visLeft - (zoomSize.w - visW) / 2;
	const y = visTop - (zoomSize.h - visH) / 2;

	return { x, y, w: zoomSize.w, h: zoomSize.h };
}

function clampMaxSide(w, h) {
	const longer = Math.max(w, h);
	if (longer <= _maxExportSide) return { w, h };
	const scale = _maxExportSide / longer;
	return { w: w * scale, h: h * scale };
}

function getMaxWidth(data) {
	return Math.floor(_maxExportSide * Math.min(1, data.sw / data.sh));
}

function calcLimit(w, h, sw, sh, rot) {
	if (rot) {
		const rad = (rot * Math.PI) / 180;
		const cosA = Math.abs(Math.cos(rad));
		const sinA = Math.abs(Math.sin(rad));
		const bboxW = w * cosA + h * sinA;
		const bboxH = w * sinA + h * cosA;

		if (bboxW <= sw && bboxH <= sh) return { w, h };
		const scale = Math.min(sw / bboxW, sh / bboxH);
		return { w: w * scale, h: h * scale };
	}

	if (w > sw) {
		h = (h * sw) / w;
		w = sw;
	}
	if (h > sh) {
		w = (w * sh) / h;
		h = sh;
	}
	return { w, h };
}

function hideHostSiblingOverlays(element) {
	if (getElData(element, _bgsrckey)) {
		hideOverlappingBgDuplicates(element);
	}
	const host = element.closest(".imgContainer, .mainContainer, .richImage");
	if (!host) return;
	host.querySelectorAll(`.overlayContainer, img:not(.${_zdImgCls})`).forEach((sib) => {
		if (sib !== element && !element.contains(sib) && sib.style.visibility !== "hidden") {
			if (!sib.hasAttribute("data-zd-orig-vis")) {
				sib.setAttribute("data-zd-orig-vis", sib.style.visibility || "empty");
			}
			sib.style.setProperty("visibility", "hidden", "important");
		}
	});
}

function hideOverlappingBgDuplicates(element) {
	const bgUrl = getElData(element, _bgsrckey);
	if (!bgUrl || !element.isConnected) return;

	const rect = element.getBoundingClientRect();
	if (rect.width === 0 || rect.height === 0) return;

	const cx = rect.left + rect.width / 2;
	const cy = rect.top + rect.height / 2;
	const baseW = element.offsetWidth || rect.width;
	const baseH = element.offsetHeight || rect.height;

	let scope = element.parentElement;
	for (let i = 0; i < 3 && scope && scope.parentElement && scope.parentElement !== document.body; i++) {
		const p = scope.parentElement;
		const pRect = p.getBoundingClientRect();
		const pW = p.offsetWidth || pRect.width;
		const pH = p.offsetHeight || pRect.height;
		if (Math.abs(pW - baseW) <= 4 && Math.abs(pH - baseH) <= 4) {
			scope = p;
		} else {
			break;
		}
	}
	if (!scope) return;

	scope.querySelectorAll("*").forEach((cand) => {
		if (cand === element || cand.contains(element) || element.contains(cand) || isOwnElement(cand)) return;
		if (cand.hasAttribute("data-zd-orig-bg")) return;

		const cRect = cand.getBoundingClientRect();
		if (cRect.width === 0 || cRect.height === 0) return;

		const cCx = cRect.left + cRect.width / 2;
		const cCy = cRect.top + cRect.height / 2;
		const cW = cand.offsetWidth || cRect.width;
		const cH = cand.offsetHeight || cRect.height;

		if (Math.abs(cx - cCx) > 6 || Math.abs(cy - cCy) > 6 || Math.abs(baseW - cW) > 6 || Math.abs(baseH - cH) > 6) {
			return;
		}

		const bg = window.getComputedStyle(cand).backgroundImage;
		if (bg && bg !== "none" && bg.includes(bgUrl)) {
			cand.setAttribute("data-zd-orig-bg", cand.style.backgroundImage || "empty");
			_bgDupOwners.set(cand, element);
			cand.style.setProperty("background-image", "none", "important");
		}
	});
}

function getHostStackZ(el) {
	let z = 0;
	for (
		let node = el.parentElement;
		node && node !== document.body && node !== document.documentElement;
		node = node.parentElement || node.getRootNode()?.host
	) {
		const cs = window.getComputedStyle(node);
		const zi = parseInt(cs.zIndex, 10);
		const hasZ = cs.position !== "static" && !isNaN(zi);
		if (
			hasZ ||
			cs.position === "fixed" ||
			cs.position === "sticky" ||
			parseFloat(cs.opacity) < 1 ||
			cs.transform !== "none" ||
			cs.filter !== "none" ||
			cs.isolation === "isolate"
		) {
			z = hasZ ? zi : 0;
		}
	}
	return z;
}

function raiseAboveHost(target, el) {
	const hostZ = getHostStackZ(el);
	if (hostZ < _zdExImgBaseZ) return;
	const needed = Math.min(hostZ + 1, _zdMaxZ);
	if (needed > (parseInt(target.style.zIndex, 10) || 0)) {
		target.style.setProperty("z-index", String(needed), "important");
	}
}

function getExUiAnchor() {
	return document.body.querySelector(`:scope > #zdImg_zoomBadge, :scope > #${_zdPanelId}, :scope > #zd-panel-frame`);
}

function getEffectiveObjectFit(el, compStyle = window.getComputedStyle(el), svgFit = null) {
	if (!el) return "contain";
	if (getElData(el, _bgsrckey)) {
		const fit = svgFit || (isSvgImageElement(el) ? getSvgImageFit(el) : null);
		const bgSize = fit ? fit.size : (compStyle.backgroundSize || "").trim();
		return bgSize === "cover" ? "cover" : bgSize === "100% 100%" ? "fill" : "contain";
	}
	if (el.tagName.toUpperCase() !== "IMG") return "contain";
	const objFit = compStyle.objectFit || "fill";
	return objFit === "scale-down" || objFit === "none" ? "contain" : objFit;
}

function generateImgEx(size, keepCenter) {
	d("Create FloatImage", "");
	const prevScrollX = window.scrollX;
	const prevScrollY = window.scrollY;
	let exImgWrapper = document.getElementById(_zdExImgId);

	if (!exImgWrapper) {
		exImgWrapper = document.createElement("div");
		exImgWrapper.id = _zdExImgId;
		exImgWrapper.style.cssText =
			"display: block !important; visibility: visible !important; opacity: 1 !important; position: absolute !important; top: 0 !important; left: 0 !important; width: 0 !important; height: 0 !important; margin: 0 !important; padding: 0 !important; border: none !important; z-index: 2147483640 !important; overflow: visible !important; overflow-anchor: none !important;";
		document.body.insertBefore(exImgWrapper, getExUiAnchor());
	}
	raiseAboveHost(exImgWrapper, _img_element);

	const data = getElData(_img_element, _firstkey);
	const isBg = Boolean(getElData(_img_element, _bgsrckey));

	const isNativelyOverflowing =
		_singleImgPage &&
		(window.scrollX > 0 ||
			window.scrollY > 0 ||
			_img_element.clientWidth > window.innerWidth ||
			_img_element.clientHeight > window.innerHeight);

	if (_singleImgPage && !isNativelyOverflowing && !document.getElementById(data.id)) {
		if (_savedScrollPos === null) {
			_savedScrollPos = { x: window.scrollX, y: window.scrollY };
		}
		document.documentElement.style.setProperty("overflow", "hidden", "important");
		document.body.style.setProperty("overflow", "hidden", "important");
		window.scrollTo(0, 0);
	}

	if (!isBg && _img_element.tagName === "IMG") {
		const nat = getNaturalSize(_img_element);
		const objFit = window.getComputedStyle(_img_element).objectFit || "fill";
		if (nat && objFit !== "cover" && objFit !== "fill") {
			size.h = size.w / (nat.w / nat.h);
		}
	}

	if (!keepCenter && !getElData(_img_element, _srckey) && _img_element.isConnected) {
		const curRect = _img_element.getBoundingClientRect();
		if (curRect.width > 0 && curRect.height > 0) {
			const boxW = _img_element.offsetWidth || curRect.width;
			const boxH = _img_element.offsetHeight || curRect.height;
			const cBox = getRenderedContentBox(_img_element, boxW, boxH, isBg);
			data.sx = curRect.left + window.scrollX + curRect.width / 2 + cBox.offX - data.sw / 2;
			data.sy = curRect.top + window.scrollY + curRect.height / 2 + cBox.offY - data.sh / 2;
		}
	}

	const curOpacPct = getOpacityPct(_img_element);
	const curBrightPct = getBrightnessPct(_img_element);
	const curFx = getFilterEffects(_img_element);
	const curPixel = isPixelMode(_img_element);
	const curFlipX = getElData(_img_element, _flipXkey) || 1;
	const curFlipY = getElData(_img_element, _flipYkey) || 1;

	if (isBg) {
		if (data?.origStyle && data.origStyle.backgroundImage === undefined) {
			data.origStyle.backgroundImage = _img_element.style.backgroundImage;
		}
		hideOverlappingBgDuplicates(_img_element);
		resetInlineStyles(_img_element, data ? data.origStyle : null, true);
		restoreFilterAndOpacity(_img_element);
		_img_element.setAttribute("data-zd-float-hidden", "");
		_img_element.style.setProperty("background-image", "none", "important");
		if (isSvgImageElement(_img_element)) {
			_img_element.style.setProperty("visibility", "hidden", "important");
		}
		lockContainers(getElData(_img_element, _srckey) || _img_element);
	} else {
		hideHostSiblingOverlays(_img_element);
		resetInlineStyles(_img_element, data ? data.origStyle : null, true);
		restoreFilterAndOpacity(_img_element);
		_img_element.setAttribute("data-zd-float-hidden", "");
		_img_element.style.setProperty("visibility", "hidden", "important");
		lockContainers(getElData(_img_element, _srckey) || _img_element);
	}

	clearBorderStyles(_img_element);

	const rect = calcPos({ w: size.w, h: size.h }, true);
	const rot = normalizeRot(getElData(_img_element, _rotkey) || 0);
	let img = document.getElementById(data.id);

	if (!img) {
		img = document.createElement("img");
		img.id = data.id;
		img.className = _zdImgCls;
		img.src = getStaticPreviewSrc(
			_img_element.currentSrc || getElData(_img_element, _bgsrckey) || _img_element.getAttribute("src")
		);

		const compStyle = window.getComputedStyle(_img_element);
		const svgFit = isBg && isSvgImageElement(_img_element) ? getSvgImageFit(_img_element) : null;
		const objFit = getEffectiveObjectFit(_img_element, compStyle, svgFit);

		img.style.setProperty("position", "absolute", "important");
		img.style.setProperty("display", "block", "important");
		img.style.setProperty("object-fit", objFit, "important");
		img.style.setProperty(
			"object-position",
			objFit === "cover"
				? (svgFit ? svgFit.pos : isBg ? compStyle.backgroundPosition : compStyle.objectPosition) || "center"
				: "center",
			"important"
		);
		img.style.setProperty("box-sizing", "border-box", "important");
		img.style.setProperty("margin", "0", "important");
		img.style.setProperty("padding", "0", "important");
		img.style.setProperty("border", "none", "important");
		img.style.setProperty("transition", "none", "important");

		["mouseover", "drag", "dragstart", "dragend"].forEach((evt) => {
			img.addEventListener(evt, (e) => e.preventDefault());
		});
		img.addEventListener("pointerdown", (e) => e.stopPropagation());
		img.addEventListener("load", () => {
			if (img === _img_element) syncPanelValues();
		});

		const al = _img_element.closest("a");
		if (al) {
			const pt = document.createElement("a");
			pt.style.cssText =
				"position: static !important; display: inline !important; margin: 0 !important; padding: 0 !important; border: none !important; transform: none !important;";
			pt.addEventListener("dragstart", (e) => e.preventDefault());
			img.classList.add(_imgLinkCls);
			pt.appendChild(img);
			exImgWrapper.appendChild(pt);
		} else {
			img.classList.add(_imgNoLinkCls);
			exImgWrapper.appendChild(img);
		}

		const galleryRoot = findGalleryRoot(_img_element);
		if (galleryRoot) setElData(img, _galleryRootkey, galleryRoot);
		const swapSlot = findSwapSlotContainer(_img_element);
		if (swapSlot) setElData(img, _swapSlotkey, swapSlot);
		setElData(img, _origRectkey, getDocRect(_img_element));
		setElData(img, _srckey, _img_element);
		attachEvent(img);
		setZoom(img, { sx: data.sx, sy: data.sy, sw: data.sw, sh: data.sh });
		applyFilterAndOpacity(img, curOpacPct, curBrightPct, curFx);
		setPixelMode(img, curPixel);
		setElData(img, _flipXkey, curFlipX);
		setElData(img, _flipYkey, curFlipY);
		setImageRect({ w: rect.w, h: rect.h });
		imgRotate(rot);
		ensureFloatFrameObserver();
		syncFloatFrame(img);
		showZoomBadge();
	}

	if (!_singleImgPage && (window.scrollX !== prevScrollX || window.scrollY !== prevScrollY)) {
		window.scrollTo(prevScrollX, prevScrollY);
	}

	startExImgObserver();
}

function clearImgEx(src_elem, size) {
	d("Delete FloatImage", "");
	const data = getElData(_img_element, _firstkey);
	const rot = normalizeRot(getElData(_img_element, _rotkey) || 0);
	const flipX = getElData(_img_element, _flipXkey) || 1;
	const flipY = getElData(_img_element, _flipYkey) || 1;
	const opac = getOpacityPct(_img_element);
	const bright = getBrightnessPct(_img_element);
	const fxState = getFilterEffects(_img_element);
	const pixel = isPixelMode(_img_element);
	const pinShift = isPinned(_img_element) ? { x: window.scrollX, y: window.scrollY } : { x: 0, y: 0 };

	const isBg = Boolean(getElData(src_elem, _bgsrckey));
	if (isBg) {
		restoreSelfVisibility(src_elem);
		unlockContainers(src_elem);
	} else {
		restoreSelfVisibility(src_elem);
		restoreSiblingVisibilities(src_elem.closest(".imgContainer, .mainContainer, .richImage"));
		unlockContainers(src_elem);

		if (_singleImgPage && !document.querySelector(`.${_imgSrcViewCls}`)) {
			document.documentElement.style.removeProperty("overflow");
			document.body.style.removeProperty("overflow");
			if (_savedScrollPos !== null) {
				window.scrollTo(_savedScrollPos.x, _savedScrollPos.y);
				_savedScrollPos = null;
			}
		}
	}

	applyFilterAndOpacity(src_elem, opac, bright, fxState);
	setPixelMode(src_elem, pixel);

	clearBorderStyles(src_elem);

	const floatImg = _img_element;
	destroyFloatFrame(floatImg);
	const pnt = floatImg.closest("a");
	if (pnt && pnt.parentNode === document.getElementById(_zdExImgId)) {
		pnt.remove();
	} else {
		floatImg.remove();
	}

	_modifiedElements.delete(floatImg);
	elementDataMap.delete(floatImg);

	const isSrcInActiveSlide = isImageShownInViewport(src_elem, true);

	let sourceFullyReset = false;
	if (!size && !isSrcInActiveSlide) {
		sourceFullyReset = true;
		const srcData = getElData(src_elem, _firstkey);
		resetInlineStyles(src_elem, srcData ? srcData.origStyle : null, true);
		restoreFilterAndOpacity(src_elem);
		restoreSelfVisibility(src_elem);
		unlockContainers(src_elem);
		_modifiedElements.delete(src_elem);
		elementDataMap.delete(src_elem);
		_img_element = null;
		_current_element = null;
	} else {
		const baseSx = data.origSx !== undefined ? data.origSx : data.sx + pinShift.x;
		const baseSy = data.origSy !== undefined ? data.origSy : data.sy + pinShift.y;
		setZoom(src_elem, { sx: baseSx, sy: baseSy, sw: data.sw, sh: data.sh }, !size);
		setElData(src_elem, _flipXkey, flipX);
		setElData(src_elem, _flipYkey, flipY);
		setImageRect(size);
		imgRotate(rot);
		if (!size && !isElementModified(src_elem)) {
			restoreElementZIndex(src_elem);
			unlockContainers(src_elem);
		}
		if (size) showZoomBadge();
	}

	const exWrapper = document.getElementById(_zdExImgId);
	if (!exWrapper || exWrapper.children.length === 0) {
		stopExImgObserver();
	}
	return sourceFullyReset;
}

function checkSingleImgActivation(element, curW, curH) {
	if (!_singleImgPage || !element || !element.classList.contains(_imgSrcViewCls)) return;

	const data = getElData(element, _firstkey);
	if (!data) return;

	clearBorderStyles(element);

	if (!isElementModified(element) && Math.abs(curW - data.sw) < 2 && Math.abs(curH - data.sh) < 2) {
		element.style.setProperty("cursor", "zoom-in", "important");
		element.classList.remove(_zdImgCls);
	} else {
		element.style.setProperty("cursor", "grab", "important");
		element.classList.add(_zdImgCls);
		if (_img_element !== element) {
			setZoom(element, null, true);
		}
	}
}

function ensureElevatedZIndex(el) {
	if (!el) return;
	touchModified(el);

	const isFloating = Boolean(getElData(el, _srckey)) || (_singleImgPage && el.classList.contains(_imgSrcViewCls));

	if (isFloating) {
		bringFloatingToFront(el);
		return;
	}

	const inlineImages = Array.from(_modifiedElements).filter((item) => {
		return item && item.isConnected && !getElData(item, _srckey) && (!(_singleImgPage && item.classList.contains(_imgSrcViewCls)));
	});

	const maxZ = 5;
	const count = inlineImages.length;
	inlineImages.forEach((img, index) => {
		const zVal = Math.max(1, maxZ - (count - 1 - index));
		img.style.setProperty("z-index", String(zVal), "important");
	});
}

function bringFloatingToFront(el) {
	const exImgWrapper = document.getElementById(_zdExImgId);
	if (exImgWrapper && exImgWrapper.contains(el)) {
		const aWrap = el.closest("a");
		const targetNode = aWrap && aWrap.parentElement === exImgWrapper ? aWrap : el;
		const last = exImgWrapper.lastElementChild;
		const isInFront = last === targetNode || (last?.classList.contains(_floatFrameCls) && last.previousElementSibling === targetNode);
		if (targetNode.parentElement === exImgWrapper && !isInFront) {
			exImgWrapper.appendChild(targetNode);
		}
	}
}

function isPlaceholderImg(img) {
	const src = img.currentSrc || img.getAttribute("src") || "";
	return !src || src.startsWith("data:") || (img.naturalWidth > 0 && img.naturalWidth <= 2);
}

function toHiResUrl(raw) {
	const url = ZDShared.parseSafeHttpUrl(raw, document.baseURI, location.href);
	return url && ZDShared.hasImageExtension(url) ? url.href : null;
}

function getPlatformHiResUrl(raw) {
	const u = ZDShared.parseSafeHttpUrl(raw, document.baseURI, location.href);
	if (!u || u.hostname !== "pbs.twimg.com") return null;
	if (u.pathname.startsWith("/media/")) {
		if (u.searchParams.get("name") === "orig") return null;
		u.searchParams.set("name", "orig");
		return u.href;
	}
	if (u.pathname.startsWith("/profile_images/")) {
		const p = u.pathname.replace(/_(?:normal|bigger|mini|reasonably_small|x96|\d+x\d+)(\.\w+)$/i, "_400x400$1");
		return p !== u.pathname ? u.origin + p : null;
	}
	if (u.pathname.startsWith("/profile_banners/")) {
		const m = u.pathname.match(/^(\/profile_banners\/[^/]+\/[^/]+)(?:\/([^/]+))?\/?$/);
		if (!m || m[2] === "1500x500") return null;
		const dim = m[2]?.match(/^(\d+)x\d+$/);
		if (dim && Number(dim[1]) >= 1500) return null;
		return `${u.origin}${m[1]}/1500x500`;
	}
	return null;
}

function findHiResUrl(srcEl) {
	const current = srcEl.currentSrc || srcEl.src || "";
	const attrs = isPlaceholderImg(srcEl) ? [..._hiResDataAttrs, ..._hiResLazyAttrs] : _hiResDataAttrs;

	for (const attr of attrs) {
		const url = toHiResUrl(srcEl.getAttribute(attr));
		if (url && url !== current) return url;
	}

	const anchor = srcEl.closest("a[href]");
	const linkUrl = anchor ? toHiResUrl(anchor.getAttribute("href")) : null;
	if (linkUrl && linkUrl !== current) return linkUrl;

	return getPlatformHiResUrl(current);
}

const _srcsetState = new WeakMap();

function parseSrcsetW(srcset, baseUri) {
	const out = [];
	const str = String(srcset || "");
	let i = 0;
	while (i < str.length) {
		while (i < str.length && (str[i] === "," || /\s/.test(str[i]))) i++;
		if (i >= str.length) break;

		const urlStart = i;
		while (i < str.length && !/\s/.test(str[i])) i++;
		const rawUrl = str.slice(urlStart, i);
		if (rawUrl.endsWith(",")) continue;

		const descStart = i;
		let inParens = false;
		while (i < str.length) {
			const ch = str[i];
			if (ch === "(") inParens = true;
			else if (ch === ")") inParens = false;
			else if (ch === "," && !inParens) break;
			i++;
		}
		const m = str.slice(descStart, i).trim().match(/^(\d+)w$/);
		if (!m) continue;

		const w = Number(m[1]);
		const url = ZDShared.parseSafeHttpUrl(rawUrl, baseUri, location.href);
		if (url && w > 0) out.push({ url: url.href, w });
	}
	return out.sort((a, b) => a.w - b.w);
}

function maybeUpgradeSrcset(floatImg, width) {
	if (!floatImg || floatImg.getAttribute(_hiResStateAttr) === "done") return;

	const srcEl = getElData(floatImg, _srckey);
	if (!srcEl || srcEl.tagName !== "IMG" || !srcEl.srcset || getElData(srcEl, _bgsrckey)) return;

	let state = _srcsetState.get(floatImg);
	if (state === undefined) {
		const cands = parseSrcsetW(srcEl.srcset, srcEl.baseURI || document.baseURI);
		if (!cands.length) {
			_srcsetState.set(floatImg, null);
			return;
		}
		const curUrl = floatImg.currentSrc || floatImg.src;
		const curCand = cands.find((c) => c.url === curUrl);
		state = { cands, loadedW: curCand ? curCand.w : 0, pendingW: 0, failed: new Set(), upgraded: false };
		_srcsetState.set(floatImg, state);
	}
	if (!state) return;

	const data = getElData(floatImg, _firstkey);
	if (data && width <= data.sw) return;

	const curNatW = floatImg.naturalWidth || 0;
	const currentW = Math.max(state.loadedW, curNatW);
	if (!currentW) return;

	const neededW = Math.ceil(width);
	if (neededW <= currentW) return;

	const available = state.cands.filter((c) => !state.failed.has(c.url));
	const target = available.find((c) => c.w >= neededW) || available[available.length - 1];
	if (!target || target.w <= currentW || target.w <= state.pendingW) return;

	if (target.url === (floatImg.currentSrc || floatImg.src)) {
		state.loadedW = Math.max(state.loadedW, target.w);
		return;
	}

	state.pendingW = target.w;
	const curRatio = curNatW > 2 && floatImg.naturalHeight > 0 ? curNatW / floatImg.naturalHeight : 0;
	const probe = new Image();

	const swapIn = () => {
		if (state.pendingW === target.w) state.pendingW = 0;
		if (!floatImg.isConnected || floatImg.getAttribute(_hiResStateAttr) === "done" || target.w <= state.loadedW) return;

		const liveW = floatImg.naturalWidth || 0;
		const isLarger = probe.naturalWidth > Math.max(liveW, 2) && probe.naturalHeight > 0;
		const ratio = probe.naturalWidth / probe.naturalHeight;
		const sameShape = !curRatio || Math.abs(ratio - curRatio) / curRatio <= 0.03;

		if (!isLarger || !sameShape) {
			if (!isLarger && probe.naturalWidth > 0 && probe.naturalWidth < target.w) {
				state.cands.forEach((c) => {
					if (c.w >= target.w) state.failed.add(c.url);
				});
			} else {
				state.failed.add(target.url);
			}
			return;
		}

		floatImg.src = probe.src;
		state.loadedW = Math.max(state.loadedW, target.w);
		state.upgraded = true;
		d("Srcset upgrade", `${target.w}w -> ${probe.src}`);
		if (floatImg === _img_element) syncPanelValues();
	};

	probe.onload = () => {
		const decoded = typeof probe.decode === "function" ? probe.decode() : Promise.resolve();
		decoded.catch(() => {}).then(swapIn);
	};
	probe.onerror = () => {
		if (state.pendingW === target.w) state.pendingW = 0;
		state.failed.add(target.url);
	};
	probe.src = target.url;
}

function maybeUpgradeHiRes(floatImg) {
	if (!_zoom_hiResUpgrade || !floatImg || floatImg.hasAttribute(_hiResStateAttr)) return;

	const srcEl = getElData(floatImg, _srckey);
	if (!srcEl) return;

	const bgUrl = getElData(srcEl, _bgsrckey);
	if (!bgUrl && srcEl.tagName !== "IMG") return;

	const size = getElData(floatImg, _sizekey);
	if (!size) return;

	const bgSize = bgUrl ? getElData(srcEl, _bgsizekey) || getNaturalSize(floatImg) : null;
	if (!bgUrl && (srcEl.srcset || srcEl.parentElement?.tagName === "PICTURE") && !floatImg.naturalWidth) return;
	const useFloatNat = !bgUrl && floatImg.naturalWidth > 0 && floatImg.naturalHeight > 0;
	const natW = bgUrl ? (bgSize ? bgSize.w : 0) : useFloatNat ? floatImg.naturalWidth : srcEl.naturalWidth;
	const natH = bgUrl ? (bgSize ? bgSize.h : 0) : useFloatNat ? floatImg.naturalHeight : srcEl.naturalHeight;
	if (bgUrl && !natW) return;
	if (natW > 2 && Math.ceil(size.w) <= natW) return;

	const url = bgUrl ? getPlatformHiResUrl(bgUrl) : findHiResUrl(srcEl);
	if (!url) {
		floatImg.setAttribute(_hiResStateAttr, "none");
		return;
	}

	floatImg.setAttribute(_hiResStateAttr, "loading");
	const thumbRatio = natW > 2 && natH > 0 ? natW / natH : 0;
	const probe = new Image();

	const swapIn = () => {
		const isCurrent = floatImg.isConnected && floatImg.getAttribute(_hiResStateAttr) === "loading";
		const isLarger = probe.naturalWidth > Math.max(natW, floatImg.naturalWidth || 0, 2) && probe.naturalHeight > 0;
		const ratio = probe.naturalWidth / probe.naturalHeight;
		const sameShape = !thumbRatio || Math.abs(ratio - thumbRatio) / thumbRatio <= 0.03;

		if (!isCurrent) return;
		if (!isLarger || !sameShape) {
			floatImg.setAttribute(_hiResStateAttr, "failed");
			return;
		}

		floatImg.src = probe.src;
		floatImg.addEventListener(
			"load",
			() => {
				if (!floatImg.isConnected || floatImg.naturalWidth === probe.naturalWidth) return;
				floatImg.removeAttribute("src");
				floatImg.src = probe.src;
			},
			{ once: true }
		);
		floatImg.setAttribute(_hiResAttr, probe.src);
		floatImg.setAttribute(_hiResStateAttr, "done");
		d("HiRes upgrade", probe.src);
		if (floatImg === _img_element) syncPanelValues();
	};

	probe.onload = () => {
		const decoded = typeof probe.decode === "function" ? probe.decode() : Promise.resolve();
		decoded.catch(() => {}).then(swapIn);
	};
	probe.onerror = () => {
		if (floatImg.isConnected) floatImg.setAttribute(_hiResStateAttr, "failed");
	};
	probe.src = url;
}

function setCssBoxSize(element, cssW, cssH) {
	element.style.setProperty("width", `${cssW}px`, "important");
	element.style.setProperty("height", `${cssH}px`, "important");
	element.style.setProperty("min-width", `${cssW}px`, "important");
	element.style.setProperty("min-height", `${cssH}px`, "important");
}

function getLiveCenterAnchor(element, data) {
	const parent = element.offsetParent;
	if (!data || !element.isConnected || !parent || parent === document.body || parent === document.documentElement) return null;
	if (window.getComputedStyle(element).position !== "absolute" || hasRotationTransform(parent)) return null;

	const useX = data.txPct === -50 && !data.origStyle?.left && !element.style.getPropertyValue("left");
	const useY = data.tyPct === -50 && !data.origStyle?.top && !element.style.getPropertyValue("top");
	if (!useX && !useY) return null;

	const r = element.getBoundingClientRect();
	const p = parent.getBoundingClientRect();
	if (r.width === 0 || r.height === 0 || p.width === 0 || p.height === 0 || parent.offsetWidth === 0 || parent.offsetHeight === 0) {
		return null;
	}

	const scaleX = p.width / parent.offsetWidth;
	const scaleY = p.height / parent.offsetHeight;
	return {
		left: useX ? (r.left + r.width / 2 - p.left) / scaleX - parent.clientLeft + parent.scrollLeft : undefined,
		top: useY ? (r.top + r.height / 2 - p.top) / scaleY - parent.clientTop + parent.scrollTop : undefined
	};
}

function setImageRect(size, element = _img_element) {
	if (!element) return;
	const data = getElData(element, _firstkey);

	if (size && !getElData(element, _srckey) && !element.classList.contains("zdImgCls_animated")) suspendPageTransition(element);

	if (!size && !getElData(element, _srckey)) {
		unlockContainers(element);
		resetInlineStyles(element, data ? data.origStyle : null, false);
		if (!data) return;

		if (data.origSx !== undefined) {
			data.sx = data.origSx;
			data.sy = data.origSy;
		}

		if (((_singleImgPage && !_zoom_ivpDrag) || element.classList.contains("fullscreen")) && element.tagName === "IMG") {
			const rect = element.getBoundingClientRect();
			if (rect.width > 0 && rect.height > 0) {
				const isBg = Boolean(getElData(element, _bgsrckey));
				const adjusted = adjustSizeToNaturalAspectRatio(element, rect.width, rect.height, isBg);
				data.sw = adjusted.w;
				data.sh = adjusted.h;
				data.sx = rect.left + window.scrollX + rect.width / 2 + adjusted.offX - adjusted.w / 2;
				data.sy = rect.top + window.scrollY + rect.height / 2 + adjusted.offY - adjusted.h / 2;
			}
		}

		if (_singleImgPage && element.classList.contains(_imgSrcViewCls)) {
			const winW = window.innerWidth;
			const winH = window.innerHeight;
			const newFit = calcLimit(element.naturalWidth || data.sw, element.naturalHeight || data.sh, winW, winH);

			data.sw = newFit.w;
			data.sh = newFit.h;
			const nLeft = window.scrollX + (winW - newFit.w) / 2;
			const nTop = window.scrollY + (winH - newFit.h) / 2;

			element.style.setProperty("width", `${newFit.w}px`, "important");
			element.style.setProperty("height", `${newFit.h}px`, "important");
			element.style.setProperty("min-width", `${newFit.w}px`, "important");
			element.style.setProperty("min-height", `${newFit.h}px`, "important");
			element.style.setProperty("left", `${nLeft}px`, "important");
			element.style.setProperty("top", `${nTop}px`, "important");

			data.sx = nLeft;
			data.sy = nTop;

			element.style.setProperty("cursor", "zoom-in", "important");
			element.classList.remove(_zdImgCls);
			clearBorderStyles(element);
		}

		setElData(element, _sizekey, { w: data.sw, h: data.sh });
		d("ImageSize Reset", `${data.sw}, ${data.sh}`);

		if (element === _img_element) syncPanelValues();
		return;
	}

	if (!data) return;

	const liveAnchor = size && !getElData(element, _srckey) ? getLiveCenterAnchor(element, data) : null;
	const rect = size ? calcPos({ w: size.w, h: size.h }) : { x: data.sx, y: data.sy, w: data.sw, h: data.sh };

	if (size) {
		lockContainers(getElData(element, _srckey) || element);
		hideHostSiblingOverlays(element);
	} else if (!getElData(element, _srckey)) {
		restoreSiblingVisibilities(element.closest(".imgContainer, .mainContainer, .richImage"), element);
	}

	ensureElevatedZIndex(element);

	const isSinglePageImg = _singleImgPage && element.classList.contains(_imgSrcViewCls);
	const isFloating = Boolean(getElData(element, _srckey));
	if (isFloating || isSinglePageImg) {
		element.style.setProperty("left", `${rect.x}px`, "important");
		element.style.setProperty("top", `${rect.y}px`, "important");
	}

	const live = isFloating || isSinglePageImg ? { x: 1, y: 1 } : getLiveScale(element);
	data.scaleX = live.x;
	data.scaleY = live.y;
	setCssBoxSize(element, rect.w / live.x, rect.h / live.y);
	element.style.setProperty("max-width", "none", "important");
	element.style.setProperty("max-height", "none", "important");
	element.style.setProperty("flex-shrink", "0", "important");
	element.style.setProperty("contain", "none", "important");
	element.style.setProperty("transform-origin", "50% 50%", "important");

	setElData(element, _sizekey, { w: rect.w, h: rect.h });
	d("ImageSize", `${rect.w}, ${rect.h}`);

	if (!getElData(element, _srckey)) {
		const compPos = window.getComputedStyle(element).position;
		const isAbsOrFixed = compPos === "absolute" || compPos === "fixed";
		const isTxCentered = isAbsOrFixed && Math.abs(data.txPct) === 50;
		const isTyCentered = isAbsOrFixed && Math.abs(data.tyPct) === 50;

		element.style.setProperty("object-fit", "contain", "important");
		element.style.setProperty("margin", isSinglePageImg || isTxCentered || isTyCentered ? "0" : "auto", "important");
		if (!isTxCentered) {
			element.style.setProperty("justify-self", "center", "important");
		} else if (!data.origStyle?.left) {
			if (liveAnchor?.left !== undefined) {
				if (Math.abs(liveAnchor.left - data.boxLeft) >= 0.5) d("Anchor boxLeft refreshed", `${data.boxLeft} -> ${liveAnchor.left}`, "warn");
				data.boxLeft = liveAnchor.left;
			}
			const anchorLeft = data.txPct < 0 ? data.boxLeft : data.boxLeft + data.boxW - rect.w / live.x;
			element.style.setProperty("left", `${anchorLeft}px`, "important");
		}
		if (!isTyCentered) {
			element.style.setProperty("align-self", "center", "important");
		} else if (!data.origStyle?.top) {
			if (liveAnchor?.top !== undefined) {
				if (Math.abs(liveAnchor.top - data.boxTop) >= 0.5) d("Anchor boxTop refreshed", `${data.boxTop} -> ${liveAnchor.top}`, "warn");
				data.boxTop = liveAnchor.top;
			}
			const anchorTop = data.tyPct < 0 ? data.boxTop : data.boxTop + data.boxH - rect.h / live.y;
			element.style.setProperty("top", `${anchorTop}px`, "important");
		}

		if (getElData(element, _bgsrckey)) {
			element.style.setProperty("background-size", "contain", "important");
			element.style.setProperty("background-position", "center", "important");
			element.style.setProperty("background-repeat", "no-repeat", "important");
			if (isAbsOrFixed && data.boxW !== undefined) {
				const newLeft = data.boxLeft + (data.boxW - rect.w / live.x) / 2;
				const newTop = data.boxTop + (data.boxH - rect.h / live.y) / 2;
				element.style.setProperty("left", `${newLeft}px`, "important");
				element.style.setProperty("top", `${newTop}px`, "important");
				element.style.setProperty("margin", "0", "important");
				element.style.setProperty("justify-self", "start", "important");
				element.style.setProperty("align-self", "start", "important");
			}
		}

		if (isElementModified(element)) {
			element.style.setProperty("cursor", "default", "important");
		} else {
			element.style.removeProperty("cursor");
		}
	}

	if (isPinned(element)) keepPinnedVisible(element);

	if (isSinglePageImg) {
		checkSingleImgActivation(element, rect.w, rect.h);
	}
	if (element === _img_element) {
		syncPanelValues();
	}
	if (getElData(element, _srckey)) {
		maybeUpgradeSrcset(element, rect.w);
		maybeUpgradeHiRes(element);
	}
}

function canComposeTransform(element, data) {
	if (!data || getElData(element, _srckey) || !hasRestWrapper(element)) return false;
	if (data.origStyle?.transform && data.origStyle.transform !== "none") return false;
	if (data.txPct !== 0 || data.tyPct !== 0) return false;
	if (data.origMatrix && data.origMatrix !== "none") {
		try {
			const matrix = new DOMMatrix(data.origMatrix);
			if (Math.abs(matrix.b) > _restRectEps || Math.abs(matrix.c) > _restRectEps) return false;
			if (Math.abs(matrix.e) > 0.5 || Math.abs(matrix.f) > 0.5) return false;
		} catch (e) {
			return false;
		}
	}
	return true;
}

function imgRotate(rot, element = _img_element) {
	if (!element) return;
	const isFullscreen = element.classList.contains("fullscreen");
	if (
		((_singleImgPage && !element.classList.contains(_imgSrcViewCls)) || isFullscreen || isSvgImageElement(element)) &&
		!getElData(element, _srckey) &&
		rot !== 0
	) {
		const size = getElData(element, _sizekey) || { w: element.offsetWidth, h: element.offsetHeight };
		generateImgEx(size);
		element = _img_element;
		if (_rotParam && _rotParam.obj) _rotParam.obj = _img_element;
	}

	const flipX = getElData(element, _flipXkey) || 1;
	const flipY = getElData(element, _flipYkey) || 1;

	const prevRot = getElData(element, _rotkey) || 0;
	const transformActive = rot !== 0 || prevRot !== 0 || flipX !== 1 || flipY !== 1;
	const isInline = !getElData(element, _srckey);
	const composeData = isInline ? getElData(element, _firstkey) : null;
	const isComposable = canComposeTransform(element, composeData);
	const rotState = `${rot}|${flipX}|${flipY}|${isComposable}`;
	const rotChanged = isInline && _rotApplied.get(element) !== rotState;
	if (isInline) _rotApplied.set(element, rotState);
	if (transformActive && rotChanged && !element.classList.contains("zdImgCls_animated")) suspendPageTransition(element);

	setElData(element, _rotkey, rot);

	if (rot !== 0 || flipX !== 1 || flipY !== 1 || getElData(element, _srckey)) {
		lockContainers(getElData(element, _srckey) || element);
		ensureElevatedZIndex(element);
		hideHostSiblingOverlays(element);
	} else {
		const data = getElData(element, _firstkey);
		const size = getElData(element, _sizekey);
		if (data && size && Math.abs(size.w - data.sw) < 2) {
			restoreSiblingVisibilities(element.closest(".imgContainer, .mainContainer, .richImage"), element);
		}
	}

	if (isComposable) {
		element.style.removeProperty("transform");
		if (rot !== 0) element.style.setProperty("rotate", `${rot}deg`, "important");
		else element.style.removeProperty("rotate");
		if (flipX !== 1 || flipY !== 1) element.style.setProperty("scale", `${flipX} ${flipY}`, "important");
		else element.style.removeProperty("scale");
		if (rot !== 0 || flipX !== 1 || flipY !== 1) {
			element.style.setProperty("transform-origin", "50% 50%", "important");
			if (isElementModified(element)) element.style.setProperty("cursor", "default", "important");
		}
	} else if (rot === 0 && flipX === 1 && flipY === 1) {
		element.style.removeProperty("rotate");
		element.style.removeProperty("scale");
		if (!getElData(element, _srckey)) {
			const data = getElData(element, _firstkey);
			element.style.removeProperty("transform");
			if (data?.origStyle?.transform) {
				element.style.transform = data.origStyle.transform;
			}
		} else {
			element.style.setProperty("transform", "none", "important");
		}
	} else {
		element.style.removeProperty("rotate");
		element.style.removeProperty("scale");
		let transformStr = `rotate(${rot}deg) scale(${flipX}, ${flipY})`;
		const data = getElData(element, _firstkey);

		if (data && !getElData(element, _srckey)) {
			if (isElementModified(element)) {
				element.style.setProperty("cursor", "default", "important");
			} else {
				element.style.removeProperty("cursor");
			}

			let baseTransform = "";
			if (data.origStyle?.transform && data.origStyle.transform !== "none") {
				baseTransform = data.origStyle.transform;
			} else if (data.txPct !== 0 || data.tyPct !== 0) {
				baseTransform = `translate(${data.txPct}%, ${data.tyPct}%)`;
			} else if (data.origMatrix && data.origMatrix !== "none") {
				baseTransform = data.origMatrix;
			}

			if (baseTransform) {
				transformStr = `${baseTransform} ${transformStr}`;
			}
			element.style.setProperty("transform-origin", "50% 50%", "important");
		}

		element.style.setProperty("transform", transformStr, "important");
	}

	d("ImageRotate deg", rot);

	if (isPinned(element)) keepPinnedVisible(element);

	if (_singleImgPage && element.classList.contains(_imgSrcViewCls)) {
		const size = getElData(element, _sizekey);
		if (size) checkSingleImgActivation(element, size.w, size.h);
	}
	if (element === _img_element) {
		syncPanelValues();
	}
}

const _rotSnapTimers = new WeakMap();

function rotateWithAnim(el, deg) {
	if (!el) return;
	clearTimeout(_rotSnapTimers.get(el));
	_rotSnapTimers.delete(el);

	const rawNext = (getElData(el, _rotkey) || 0) + deg;
	const nextRot = normalizeRot(rawNext);

	if (getPanelHost() || nextRot === rawNext) {
		enableAnim(el);
		imgRotate(nextRot, el);
		return;
	}

	enableAnim(el);
	imgRotate(rawNext, el);
	_rotSnapTimers.set(
		el,
		setTimeout(() => {
			_rotSnapTimers.delete(el);
			if (!el.isConnected || el.hasAttribute("data-zd-float-hidden") || getElData(el, _rotkey) !== rawNext) return;
			disableAnim(el);
			imgRotate(nextRot, el);
		}, 220)
	);
}

function zoom(r, isZoomLimit) {
	const winW = _singleImgPage ? window.innerWidth : document.documentElement.clientWidth;
	const winH = _singleImgPage ? window.innerHeight : document.documentElement.clientHeight;

	const data = getElData(_img_element, _firstkey);
	const size = getElData(_img_element, _sizekey);
	const src_elem = getElData(_img_element, _srckey);

	let w = size.w * r;
	let h = size.h * r;
	const minWidth = 20;

	const origElem = src_elem || _img_element;
	const floating = shouldUseFloating(_img_element);

	d("Floating zoom", floating);

	const nat = getNaturalSize(_img_element) || getNaturalSize(origElem);
	const objFit = getEffectiveObjectFit(_img_element);
	const useNatRatio =
		Boolean(nat) &&
		(!floating || (objFit !== "cover" && objFit !== "fill"));

	if (w < minWidth) {
		w = minWidth;
		h = useNatRatio ? w / (nat.w / nat.h) : (data.sh / data.sw) * minWidth;
	} else if (useNatRatio) {
		h = w / (nat.w / nat.h);
	}

	const maxSiz = clampMaxSide(w, h);
	w = maxSiz.w;
	h = maxSiz.h;

	if (isZoomLimit) {
		const rot = getElData(_img_element, _rotkey);
		const limsiz = calcLimit(w, h, winW, winH, rot);
		w = limsiz.w;
		h = limsiz.h;
	}

	if (!src_elem) {
		if (!floating) setImageRect({ w, h });
		else generateImgEx({ w, h }, isZoomLimit);
	} else {
		if (!floating) clearImgEx(src_elem, { w, h });
		else setImageRect({ w, h });
	}

	showZoomBadge();
}

function getDocRect(el) {
	if (!el || !el.isConnected) return null;
	const r = el.getBoundingClientRect();
	return { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height };
}

function getNonZeroDocRect(el) {
	const r = getDocRect(el);
	return r && r.w > 0 && r.h > 0 ? r : null;
}

function isSameDocRect(a, b, tol = 2) {
	return Boolean(
		a &&
			b &&
			Math.abs(a.x - b.x) <= tol &&
			Math.abs(a.y - b.y) <= tol &&
			Math.abs(a.w - b.w) <= tol &&
			Math.abs(a.h - b.h) <= tol
	);
}

function docRectToViewportRect(r) {
	const left = r.x - window.scrollX;
	const top = r.y - window.scrollY;
	return { left, top, right: left + r.w, bottom: top + r.h, width: r.w, height: r.h };
}

function isImageShownInViewport(el, usePoint = false) {
	if (!el || !el.isConnected) return false;

	const rect = el.getBoundingClientRect();
	if (rect.width === 0 || rect.height === 0) return false;

	const winW = window.innerWidth || document.documentElement.clientWidth;
	const winH = window.innerHeight || document.documentElement.clientHeight;
	const minVisiblePx = 20;
	const overlapsViewport =
		rect.right > minVisiblePx && rect.left < winW - minVisiblePx && rect.bottom > minVisiblePx && rect.top < winH - minVisiblePx;
	if (!overlapsViewport) return false;

	let visLeft = Math.max(rect.left, 0);
	let visRight = Math.min(rect.right, winW);
	let visTop = Math.max(rect.top, 0);
	let visBottom = Math.min(rect.bottom, winH);

	for (let p = composedParent(el); p && p !== document.body && p !== document.documentElement; p = composedParent(p)) {
		if (p.nodeType !== 1) continue;
		const pStyle = window.getComputedStyle(p);
		if (
			pStyle.overflow === "hidden" ||
			pStyle.overflow === "scroll" ||
			pStyle.overflow === "auto" ||
			pStyle.overflow === "clip" ||
			pStyle.overflowX === "hidden" ||
			pStyle.overflowX === "clip"
		) {
			const pRect = p.getBoundingClientRect();
			if (pRect.width > 0 && pRect.height > 0) {
				const overlapsParent =
					rect.right > pRect.left + 4 &&
					rect.left < pRect.right - 4 &&
					rect.bottom > pRect.top + 4 &&
					rect.top < pRect.bottom - 4;
				if (!overlapsParent) return false;

				visLeft = Math.max(visLeft, pRect.left);
				visRight = Math.min(visRight, pRect.right);
				visTop = Math.max(visTop, pRect.top);
				visBottom = Math.min(visBottom, pRect.bottom);
				if (visRight <= visLeft || visBottom <= visTop) return false;
			}
		}
	}

	const cx = Math.min(Math.max((visLeft + visRight) / 2, 1), winW - 1);
	const cy = Math.min(Math.max((visTop + visBottom) / 2, 1), winH - 1);
	if (usePoint ? isInactiveImageTarget(el, cx, cy) : isInactiveImageTarget(el)) return false;

	return true;
}

function collectGalleryImagesDeep(root, out = [], seen = new Set()) {
	if (!root || seen.has(root)) return out;
	seen.add(root);

	if (root.querySelectorAll) {
		for (const el of root.querySelectorAll("*")) {
			if (el.tagName === "IMG" && !el.classList.contains(_zdImgCls) && !isOwnElement(el)) {
				out.push(findBgSiblingForHiddenImg(el) || el);
			}
			const sr = getShadowRoot(el);
			if (sr) collectGalleryImagesDeep(sr, out, seen);
		}
	}

	const rootSr = getShadowRoot(root);
	if (rootSr) collectGalleryImagesDeep(rootSr, out, seen);
	return out;
}

function isInlineImageSlidAway(el) {
	if (!el || !el.isConnected || !findGalleryRoot(el)) return false;
	if (el.classList.contains(_zdImgCls) || el.hasAttribute("data-zd-float-hidden") || getElData(el, _srckey)) return false;
	if (
		el.closest(
			'.slick-slide:not(.slick-active), [aria-roledescription="slide"][aria-current="false"], [aria-roledescription="slide"][aria-hidden="true"], [inert]'
		)
	) {
		return true;
	}

	const isClipping = (overflow) => overflow === "hidden" || overflow === "scroll" || overflow === "auto" || overflow === "clip";
	let base = el;
	if (isElementModified(el) && el.parentElement) {
		const slotRect = el.parentElement.getBoundingClientRect();
		if (slotRect.width > 0 && slotRect.height > 0) base = el.parentElement;
	}
	const rect = base.getBoundingClientRect();
	let left = rect.left;
	let right = rect.right;
	let top = rect.top;
	let bottom = rect.bottom;

	for (let p = base.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
		const pStyle = window.getComputedStyle(p);
		if (pStyle.display === "none") return true;

		const clipX = isClipping(pStyle.overflowX);
		const clipY = isClipping(pStyle.overflowY);
		if (!clipX && !clipY) continue;

		const pRect = p.getBoundingClientRect();
		if (pRect.width === 0 || pRect.height === 0) continue;
		if (clipX) {
			left = Math.max(left, pRect.left);
			right = Math.min(right, pRect.right);
		}
		if (clipY) {
			top = Math.max(top, pRect.top);
			bottom = Math.min(bottom, pRect.bottom);
		}
		if (right <= left || bottom <= top) return true;
	}
	return false;
}

function isInlineImageSupersededInGallery(el, galleryRoot) {
	if (!el || !el.isConnected || !el.parentElement || !galleryRoot || !galleryRoot.isConnected) return false;

	const r = galleryRoot.getBoundingClientRect();
	if (r.width < 40 || r.height < 40) return false;

	const cx = r.left + r.width / 2;
	const cy = r.top + r.height / 2;
	if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight) return false;
	if (inRect(el.parentElement, cx, cy)) return false;

	const top = deepElementsFromPoint(cx, cy).find(
		(o) => o.tagName === "IMG" && !isOwnElement(o) && !o.classList.contains(_zdImgCls) && composedContains(galleryRoot, o)
	);
	return Boolean(top) && !isSameImageGroup(top, el);
}

function isInlineImageSwapped(el) {
	if (!el || !el.isConnected || !_lockedSrcMap.has(el) || !findGalleryRoot(el)) return false;
	if (el.classList.contains(_zdImgCls) || el.hasAttribute("data-zd-float-hidden") || getElData(el, _srckey)) return false;

	const lockedSrc = _lockedSrcMap.get(el);
	const curSrc = el.getAttribute("src") || el.getAttribute("srcset") || "";
	if (curSrc === lockedSrc) return false;
	if (isOwnSrcSwitch(el, lockedSrc, curSrc)) {
		_lockedSrcMap.set(el, curSrc);
		return false;
	}
	return true;
}

function isGalleryRootShown(galleryRoot) {
	if (!galleryRoot || !galleryRoot.isConnected) return false;

	for (let p = galleryRoot; p && p !== document.body && p !== document.documentElement; p = composedParent(p)) {
		if (p.nodeType !== 1) continue;
		const cs = window.getComputedStyle(p);
		if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) < 0.01) return false;
	}
	return true;
}

function findSwapSlotContainer(el) {
	if (!el || !el.isConnected || el.classList?.contains(_zdImgCls)) return null;
	const data = getElData(el, _firstkey);
	const rect =
		data && !getElData(el, _srckey) && isElementModified(el) && data.sw > 0 && data.sh > 0
			? docRectToViewportRect({ x: data.origSx, y: data.origSy, w: data.sw, h: data.sh })
			: getRestRect(el);
	if (rect.width < 20 || rect.height < 20) return null;

	let slot = null;
	for (
		let p = el.parentElement, i = 0;
		i < 6 && p && p !== document.body && p !== document.documentElement;
		i++, p = p.parentElement
	) {
		if (isOwnElement(p)) break;
		const pRect = p.getBoundingClientRect();
		if (pRect.width === 0 || pRect.height === 0) continue;
		if (sameBounds(pRect, rect, 16)) slot = p;
		else break;
	}
	return slot;
}

function isRenderedInSlot(el, slot) {
	const r = el.getBoundingClientRect();
	if (r.width < 20 || r.height < 20) return false;
	const sRect = slot.getBoundingClientRect();
	if (sRect.width > 0 && sRect.height > 0 && r.width < sRect.width * 0.5 && r.height < sRect.height * 0.5) {
		return false;
	}
	for (let p = el; p && p !== slot && p !== document.body && p !== document.documentElement; p = composedParent(p)) {
		if (p.nodeType !== 1) continue;
		const cs = window.getComputedStyle(p);
		if (cs.display === "none" || (p === el && cs.visibility === "hidden")) return false;
	}
	return true;
}

function hasEnabledBgUrl(el) {
	if (!el || el.tagName === "BODY" || el.tagName === "HTML") return false;
	if (isSvgImageElement(el)) return Boolean(getSvgImageUrl(el));
	if (!_zoom_bgImg && !isMediaThumbBgElement(el)) return false;
	return Boolean(extractBgUrl(el));
}

function isSwapSlotAlive(slot) {
	if (!slot || !slot.isConnected || !isGalleryRootShown(slot)) return false;
	const r = slot.getBoundingClientRect();
	if (r.width < 20 || r.height < 20) return false;

	for (const img of slot.querySelectorAll(`img:not(.${_zdImgCls})`)) {
		if (
			!isOwnElement(img) &&
			!img.hasAttribute("data-zd-float-hidden") &&
			!isLockedOriginal(img) &&
			isRenderedInSlot(img, slot)
		) {
			return true;
		}
	}

	const bgCands = [slot, ...slot.querySelectorAll(_zoom_bgImg ? "*" : _bgThumbCandSel)];
	for (let i = bgCands.length - 1; i >= 0; i--) {
		const cand = bgCands[i];
		if (
			cand.tagName === "IMG" ||
			cand.tagName === "CANVAS" ||
			cand.tagName === "VIDEO" ||
			isOwnElement(cand) ||
			cand.hasAttribute("data-zd-float-hidden") ||
			isLockedOriginal(cand)
		) {
			continue;
		}
		if (isRenderedInSlot(cand, slot) && hasEnabledBgUrl(cand)) return true;
	}
	return false;
}

function findSlotReplacementImage(slot, excludeEl) {
	if (!slot || !slot.isConnected || !isGalleryRootShown(slot)) return null;

	const exWrapper = document.getElementById(_zdExImgId);
	const prevDisplay = exWrapper ? exWrapper.style.getPropertyValue("display") : "";
	const prevPriority = exWrapper ? exWrapper.style.getPropertyPriority("display") : "";
	if (exWrapper) exWrapper.style.setProperty("display", "none", "important");

	try {
		const imgs = Array.from(slot.querySelectorAll(`img:not(.${_zdImgCls})`));
		for (let i = imgs.length - 1; i >= 0; i--) {
			const cand = imgs[i];
			if (
				cand === excludeEl ||
				isOwnElement(cand) ||
				getElData(cand, _srckey) ||
				cand.hasAttribute("data-zd-float-hidden") ||
				isLockedOriginal(cand) ||
				isPlaceholderImg(cand)
			) {
				continue;
			}
			if (isRenderedInSlot(cand, slot) && isImageShownInViewport(cand, true) && !isBlockedBySiteOverlay(cand)) {
				return cand;
			}
		}

		const bgCands = [slot, ...slot.querySelectorAll(_zoom_bgImg ? "*" : _bgThumbCandSel)];
		for (let i = bgCands.length - 1; i >= 0; i--) {
			const cand = bgCands[i];
			if (
				cand === excludeEl ||
				cand.tagName === "IMG" ||
				cand.tagName === "CANVAS" ||
				cand.tagName === "VIDEO" ||
				isOwnElement(cand) ||
				getElData(cand, _srckey) ||
				cand.hasAttribute("data-zd-float-hidden") ||
				isLockedOriginal(cand)
			) {
				continue;
			}
			const r = cand.getBoundingClientRect();
			if (r.width < 20 || r.height < 20) continue;
			if (isImageShownInViewport(cand, true) && !isBlockedBySiteOverlay(cand) && extractBgUrlIfEnabled(cand)) {
				return cand;
			}
		}
		return null;
	} finally {
		if (exWrapper) {
			if (prevDisplay) exWrapper.style.setProperty("display", prevDisplay, prevPriority);
			else exWrapper.style.removeProperty("display");
		}
	}
}

function findActiveSlideBgThumb(scope) {
	const slide = scope.querySelector?.(
		'.slick-current, .swiper-slide-active, [aria-roledescription="slide"][aria-current="true"], [aria-roledescription="slide"][aria-hidden="false"]'
	);
	if (!slide) return null;

	const pickLargest = (sel, minSide) => {
		let best = null;
		let bestArea = 0;
		for (const el of slide.querySelectorAll(sel)) {
			if (isOwnElement(el)) continue;
			const r = el.getBoundingClientRect();
			if (r.width < minSide || r.height < minSide || r.width * r.height < bestArea) continue;
			if (!isImageShownInViewport(el, true) || !extractBgUrlIfEnabled(el)) continue;
			bestArea = r.width * r.height;
			best = el;
		}
		return best;
	};

	return pickLargest(_mediaThumbBgSel, 0) || (_zoom_bgImg ? pickLargest("*", 40) : null);
}

function findActiveGalleryImage(galleryRoot, prevImg) {
	if (!isGalleryRootShown(galleryRoot)) return null;

	const prevSlidAway = Boolean(
		prevImg &&
			isElementModified(prevImg) &&
			(isInlineImageSlidAway(prevImg) || isInlineImageSupersededInGallery(prevImg, galleryRoot))
	);
	if (
		prevImg &&
		prevImg.isConnected &&
		!prevSlidAway &&
		composedContains(galleryRoot, prevImg) &&
		!isInactiveImageTarget(prevImg) &&
		isImageShownInViewport(prevImg, true)
	) {
		return getRedirectedTarget(prevImg);
	}

	const mainSel = '#mainImageWindow, #mainImageViewer, #mainImageRegion, [data-testid="selectedMedia"]';
	const scope =
		(prevImg && prevImg.isConnected && prevImg.closest(mainSel)) ||
		galleryRoot.querySelector?.(mainSel) ||
		galleryRoot;
	const galleryMainSel = '.swiper, [aria-roledescription="carousel"], [data-testid="swipe-to-dismiss"]';
	const isGalleryThumb = (el) =>
		Boolean(
			el.closest?.('[data-testid="mediaItems"], [data-testid="Tweet-User-Avatar"]') ||
				el.getAttribute?.("data-testid") === "cdp-medias-preview-print-image" ||
				(scope.querySelector?.(galleryMainSel) && !el.closest?.(galleryMainSel))
		);

	const isReadySlideMedia = (cand) => {
		if (
			isOwnElement(cand) ||
			(prevSlidAway && cand === prevImg) ||
			(cand.tagName === "IMG" && isPlaceholderImg(cand)) ||
			isGalleryThumb(cand) ||
			cand.hasAttribute?.("data-zd-float-hidden") ||
			isLockedOriginal(cand) ||
			isInactiveImageTarget(cand)
		) {
			return false;
		}
		const r = cand.getBoundingClientRect();
		return r.width >= 20 && r.height >= 20;
	};

	const idxContainer = scope.matches?.("[data-active-index]") ? scope : scope.querySelector?.("[data-active-index]");
	if (idxContainer) {
		const activeIdx = parseInt(idxContainer.getAttribute("data-active-index"), 10);
		const activeSlide = !isNaN(activeIdx) ? idxContainer.children[activeIdx] : null;
		if (activeSlide) {
			for (const cand of activeSlide.querySelectorAll(`:is(img, canvas):not(.${_zdImgCls})`)) {
				if (isReadySlideMedia(cand)) return getRedirectedTarget(cand);
			}
		}
	}

	const priorityImgs = scope.querySelectorAll
		? scope.querySelectorAll(
				`.slide.current img:not(.${_zdImgCls}), .mainImage.current img:not(.${_zdImgCls}), .curimgonview img:not(.${_zdImgCls}), .slick-current :is(img, canvas):not(.${_zdImgCls}), .swiper-slide-active :is(img, canvas):not(.${_zdImgCls}), [aria-roledescription="slide"][aria-current="true"] :is(img, canvas):not(.${_zdImgCls}), [aria-roledescription="slide"][aria-hidden="false"] :is(img, canvas):not(.${_zdImgCls})`
			)
		: [];
	for (const cand of priorityImgs) {
		if (isReadySlideMedia(cand) && (isActiveGallerySlide(cand) || isImageShownInViewport(cand, true))) {
			return getRedirectedTarget(cand);
		}
	}

	const bgThumb = findActiveSlideBgThumb(scope);
	if (bgThumb) return getRedirectedTarget(bgThumb);

	const gRect = scope.getBoundingClientRect();
	if (gRect.width > 40 && gRect.height > 40) {
		const winW = window.innerWidth || document.documentElement.clientWidth;
		const winH = window.innerHeight || document.documentElement.clientHeight;
		const cx = Math.min(Math.max(gRect.left + gRect.width / 2, 1), winW - 1);
		const cy = Math.min(Math.max(gRect.top + gRect.height / 2, 1), winH - 1);
		const centerStack = deepElementsFromPoint(cx, cy);
		for (const el of centerStack) {
			if (
				el.tagName === "IMG" &&
				!(prevSlidAway && el === prevImg) &&
				!el.classList.contains(_zdImgCls) &&
				!isOwnElement(el) &&
				!isPlaceholderImg(el) &&
				!isGalleryThumb(el) &&
				composedContains(galleryRoot, el)
			) {
				const r = el.getBoundingClientRect();
				if (r.width >= 40 && r.height >= 40 && isImageShownInViewport(el, true)) {
					return getRedirectedTarget(el);
				}
			}
		}
		const centerBg = findBgThumbUnderPoint(cx, cy, centerStack);
		if (centerBg && !(prevSlidAway && centerBg === prevImg) && !isGalleryThumb(centerBg) && composedContains(galleryRoot, centerBg)) {
			const r = centerBg.getBoundingClientRect();
			if (r.width >= 40 && r.height >= 40 && isImageShownInViewport(centerBg, true)) {
				return getRedirectedTarget(centerBg);
			}
		}
	}

	const minW = Math.max(40, Math.min(_largestImageMinWidth, gRect.width * 0.25));
	const minH = Math.max(40, Math.min(_largestImageMinHeight, gRect.height * 0.25));
	let best = null;
	let bestArea = 0;
	for (const cand of collectGalleryImagesDeep(scope)) {
		if ((prevSlidAway && cand === prevImg) || isGalleryThumb(cand) || (cand.tagName === "IMG" && isPlaceholderImg(cand))) continue;
		const r = cand.getBoundingClientRect();
		if (r.width < 40 || r.height < 40 || (r.width < minW && r.height < minH)) continue;
		if (!isImageShownInViewport(cand, true)) continue;
		const area = r.width * r.height;
		if (area > bestArea) {
			bestArea = area;
			best = cand;
		}
	}
	return best ? getRedirectedTarget(best) : null;
}

function rebindPanelImage(img) {
	if (!getPanelHost() || !img || !img.isConnected) return false;
	const r = img.getBoundingClientRect();
	if (r.width < 20 || r.height < 20) return false;
	if (!isActiveGallerySlide(img) && !isImageShownInViewport(img, true)) return false;
	const winW = window.innerWidth || document.documentElement.clientWidth;
	const winH = window.innerHeight || document.documentElement.clientHeight;
	const cx = Math.min(Math.max((Math.max(r.left, 0) + Math.min(r.right, winW)) / 2, 1), winW - 1);
	const cy = Math.min(Math.max((Math.max(r.top, 0) + Math.min(r.bottom, winH)) / 2, 1), winH - 1);
	if (isInactiveImageTarget(img, cx, cy)) return false;

	_modifiedElements.delete(img);
	elementDataMap.delete(img);
	img.classList.remove(_draggedCls);

	setZoom(img, null, true);
	_modifiedElements.delete(img);
	syncPanelValues();
	return true;
}

function keepPanelBoundToImage(img) {
	if (!getPanelHost() || !img || !img.isConnected) return false;

	const rect = img.getBoundingClientRect();
	if (rect.width === 0 || rect.height === 0) return false;

	_modifiedElements.delete(img);
	elementDataMap.delete(img);
	img.classList.remove(_draggedCls);

	setZoom(img, null, true);
	_modifiedElements.delete(img);
	syncPanelValues();
	return true;
}

function bindPanelToModifiedImage(img) {
	if (!getPanelHost() || !img || !img.isConnected) return false;
	const r = img.getBoundingClientRect();
	if (r.width < 20 || r.height < 20) return false;

	setZoom(img, null, true);
	syncPanelValues();
	return true;
}

function rebindPanelOrActiveGalleryImg(origImg, fallbackRoot = null, fallbackSlot = null) {
	if (!getPanelHost()) return false;
	if (origImg && rebindPanelImage(origImg)) return true;

	const gRoot = (origImg && findGalleryRoot(origImg)) || fallbackRoot;
	if (gRoot && gRoot.isConnected) {
		const nextImg = findActiveGalleryImage(gRoot, origImg);
		if (nextImg) {
			attachEvent(nextImg);
			if (rebindPanelImage(nextImg)) return true;
		}
	}

	if (fallbackSlot && fallbackSlot.isConnected) {
		const nextImg = findSlotReplacementImage(fallbackSlot, origImg);
		if (nextImg) {
			attachEvent(nextImg);
			if (rebindPanelImage(nextImg)) return true;
		}
	}

	if (handOffPanelTo(findActiveImageInOpenGallery(origImg))) return true;

	return keepPanelBoundToImage(origImg);
}

function sizeFit() {
	if (getPanelHost() && _rightBtnDown && _current_element && !isSameImageGroup(_img_element, _current_element)) {
		setZoom(_current_element, null, true);
		syncPanelValues();
	}

	if (!_img_element) return true;

	disableAnim(_img_element);
	syncBaseRect(_img_element);

	const data = getElData(_img_element, _firstkey);
	const src_elem = getElData(_img_element, _srckey);
	const floatGalleryRoot = src_elem ? getElData(_img_element, _galleryRootkey) : null;
	const floatSwapSlot = src_elem ? getElData(_img_element, _swapSlotkey) : null;
	const curSize = getElData(_img_element, _sizekey);
	const bRect = _img_element.getBoundingClientRect();
	const w = curSize ? curSize.w : bRect.width;
	const h = curSize ? curSize.h : bRect.height;

	const origElem = src_elem || _img_element;
	const isBg = Boolean(getElData(origElem, _bgsrckey));
	const isSvg = isSvgSource(_img_element) || isSvgSource(origElem);
	const nat = getResolvedNaturalSize(_img_element) || getResolvedNaturalSize(origElem);
	const nw = nat ? nat.w : 0;
	const nh = nat ? nat.h : 0;
	const tag = _img_element.tagName.toUpperCase();
	const floating = shouldUseFloating(_img_element);

	d("Floating zoom", floating);

	let isReset = true;
	const rot = getElData(_img_element, _rotkey) || 0;
	const isFit = Math.abs(w - data.sw) < 2 && Math.abs(h - data.sh) < 2 && rot === 0;

	if (isFit && !isSvg && (tag === "IMG" || isBg) && !(nw > 0 && nh > 0) && !src_elem) {
		if (needsImgFileSize(origElem) && getNaturalSize(origElem)) {
			const startedWithRBtn = _rightBtnDown;
			getImgFileSize(origElem, (resolved) => {
				if (!resolved || !origElem.isConnected || isElementModified(origElem)) return;
				if (startedWithRBtn && !_rightBtnDown && _zoom_autoRtn) return;
				if (_img_element && !isSameImageGroup(_img_element, origElem)) return;
				const freshData = getElData(origElem, _firstkey) || data;
				if (Math.abs(resolved.w - freshData.sw) < 2 && Math.abs(resolved.h - freshData.sh) < 2) return;

				const hadTarget = Boolean(_img_element);
				if (!hadTarget) setZoom(origElem, null, true);
				if (!_img_element) return;

				if (floating && !getElData(_img_element, _srckey)) {
					_zdSuppressBadge = true;
					generateImgEx({ w, h });
					_zdSuppressBadge = false;
				}
				enableAnim(_img_element);
				const limSize = clampMaxSide(resolved.w, resolved.h);
				setImageRect({ w: limSize.w, h: limSize.h });
				_img_element.style.setProperty("object-fit", "contain", "important");
				if (getElData(_img_element, _srckey)) {
					_img_element.style.setProperty("object-position", "center", "important");
				}
				showZoomBadge();
				if (!hadTarget && !getPanelHost() && !_singleImgPage) setZoom(null, null, false, true);
			});
			markRcModified();
			_ctx_show = false;
			return false;
		}
		if (floating) {
			_zdSuppressBadge = true;
			generateImgEx({ w, h });
			_zdSuppressBadge = false;
		}
		const targetImg = _img_element;
		const applyWhenLoaded = () => {
			if (targetImg !== _img_element || !targetImg.isConnected) return;
			const fnw = targetImg.naturalWidth;
			const fnh = targetImg.naturalHeight;
			if (!(fnw > 0 && fnh > 0)) return;
			if (isBg) setElData(origElem, _bgsizekey, { url: getElData(origElem, _bgsrckey), w: fnw, h: fnh });
			enableAnim(targetImg);
			const limSize = clampMaxSide(fnw, fnh);
			setImageRect({ w: limSize.w, h: limSize.h }, targetImg);
			targetImg.style.setProperty("object-fit", "contain", "important");
			if (getElData(targetImg, _srckey)) {
				targetImg.style.setProperty("object-position", "center", "important");
			}
			showZoomBadge();
		};
		if (targetImg.complete && targetImg.naturalWidth > 0) applyWhenLoaded();
		else targetImg.addEventListener("load", applyWhenLoaded, { once: true });
		markRcModified();
		_ctx_show = false;
		return false;
	}

	const canExpandToNatural =
		isFit && (tag === "IMG" || isBg) && nw > 0 && nh > 0 && (Math.abs(nw - data.sw) >= 2 || Math.abs(nh - data.sh) >= 2);

	if (!canExpandToNatural) {
		unpinImage(_img_element);
		_img_element.classList.remove(_draggedCls);
		restoreFilterAndOpacity(_img_element);
		clearBorderStyles(_img_element);
		setElData(_img_element, _flipXkey, 1);
		setElData(_img_element, _flipYkey, 1);
		restoreElementZIndex(_img_element);
	}

	enableAnim(_img_element);

	if (!src_elem) {
		if (canExpandToNatural) {
			isReset = false;
			if (floating) {
				_zdSuppressBadge = true;
				generateImgEx({ w, h });
				_zdSuppressBadge = false;
				enableAnim(_img_element);
			}
			const limSize = clampMaxSide(nw, nh);
			setImageRect({ w: limSize.w, h: limSize.h });
			_img_element.style.setProperty("object-fit", "contain", "important");
			if (getElData(_img_element, _srckey)) {
				_img_element.style.setProperty("object-position", "center", "important");
			}
		} else {
			setImageRect();
			imgRotate(0);
		}
	} else if (canExpandToNatural) {
		isReset = false;
		const limSize = clampMaxSide(nw, nh);
		setImageRect({ w: limSize.w, h: limSize.h });
		_img_element.style.setProperty("object-fit", "contain", "important");
		_img_element.style.setProperty("object-position", "center", "important");
	} else {
		imgRotate(0);
		_zdSuppressBadge = true;
		clearImgEx(src_elem);
		_zdSuppressBadge = false;
	}

	if (isReset) {
		const origTarget = src_elem || _img_element;
		if (origTarget) {
			unlockContainers(origTarget);
			_modifiedElements.delete(origTarget);
			if (!getPanelHost() || !origTarget.isConnected || isInactiveImageTarget(origTarget)) {
				elementDataMap.delete(origTarget);
			}
		}
		if (getPanelHost()) {
			removePanelBorder();
			const nextTarget = findNextModifiedImage(origTarget);
			if (nextTarget) {
				attachEvent(nextTarget);
				setZoom(nextTarget, null, true);
				syncPanelValues();
				if (isPanelHovered() || panelHasFocus()) applyPanelBorder();
			} else if (rebindPanelOrActiveGalleryImg(origTarget, floatGalleryRoot, floatSwapSlot)) {
				if (isPanelHovered() || panelHasFocus()) applyPanelBorder();
			} else if (!_img_element) {
				if (destroyPanel()) setZoom();
			}
		}
		hideBadgeImmediate();
	} else {
		showZoomBadge();
	}

	markRcModified();
	_ctx_show = false;
	return false;
}

function windowFitting(fromCtxMenu) {
	if (getPanelHost() && _rightBtnDown && _current_element && !isSameImageGroup(_img_element, _current_element)) {
		setZoom(_current_element, null, true);
		syncPanelValues();
	}

	if (_img_element) {
		disableAnim(_img_element);
		syncBaseRect(_img_element);
		d("Window Fit", "");
		_img_element.classList.remove(_draggedCls);
		enableAnim(_img_element);

		const winW = _singleImgPage ? window.innerWidth : document.documentElement.clientWidth;
		const winH = _singleImgPage ? window.innerHeight : document.documentElement.clientHeight;
		const data = getElData(_img_element, _firstkey);

		if (data) {
			const scrollOfs = getScrollOffset(_img_element);
			data.sx = scrollOfs.x + winW / 2 - data.sw / 2;
			data.sy = scrollOfs.y + winH / 2 - data.sh / 2;
		}

		zoom(10000, true);
		markRcModified();
		_ctx_show = false;

		if (!getElData(_img_element, _srckey) && !_singleImgPage) {
			_img_element.scrollIntoView();
		}
		return false;
	} else if (fromCtxMenu && _current_element) {
		setZoom(_current_element, null, true);
		if (_img_element) windowFitting();
		setZoom(null, null, false, true);
	}
	return true;
}

function zoomEvent(e) {
	if (_isExcludedHost) {
		detachWheelListeners();
		return;
	}

	if (getPanelHost() && _rightBtnDown && _current_element && !isSameImageGroup(_img_element, _current_element)) {
		setZoom(_current_element, null, true);
		syncPanelValues();
	}

	if (!_img_element) {
		if (_singleImgPage && _hoverTarget) {
			setZoom(_hoverTarget, null, true);
		} else {
			d("Zoom Event Aborted", "Target image is missing", "warn");
			detachWheelListeners();
			return;
		}
	}

	disableAnim(_img_element);
	syncBaseRect(_img_element);

	if (_blockWheelZoom && _rightBtnDown) return;

	const panel = getPanelHost();
	if (panel && panel.contains(e.target)) return;
	if ((!_singleImgPage || !_zoom_ivpDrag) && !_rightBtnDown) return;

	let delta = e.deltaY ? -e.deltaY : e.wheelDelta ? e.wheelDelta : -e.detail;
	d("Wheel delta", delta);
	if (_zoom_reverse) delta = -delta;

	const wheelSteps = e.deltaMode === 0 && e.deltaY && Math.abs(e.deltaY) < 40 ? Math.abs(e.deltaY) / 40 : 1;
	const dim = _zoom_dim * 0.01 * wheelSteps;
	const r = delta < 0 ? 1 - dim : delta > 0 ? 1 + dim : 1;

	if (_rclickTimer) {
		refreshShortcutTimeout();
	}

	if (_accKeyState.alt) {
		imgRotate(normalizeRot(getElData(_img_element, _rotkey) + _zoom_rotd * (delta < 0 ? 1 : -1)));
		showZoomBadge();
	} else {
		const origElem = getElData(_img_element, _srckey) || _img_element;
		const isBg = Boolean(getElData(origElem, _bgsrckey));
		const isSinglePageImg = _singleImgPage && _img_element.classList.contains(_imgSrcViewCls);
		const floating = shouldUseFloating(_img_element);

		if ((floating || isSinglePageImg) && _zoom_trackCursor) {
			_zdSuppressBadge = true;
			if (!getElData(_img_element, _srckey) && !isSinglePageImg) {
				const size = getElData(_img_element, _sizekey);
				const adjusted = isBg ? { w: size.w, h: size.h } : adjustSizeToNaturalAspectRatio(_img_element, size.w, size.h, isBg);
				generateImgEx({ w: adjusted.w, h: adjusted.h });
			}

			_img_element.classList.add(_draggedCls);

			const scrollOfs = getScrollOffset(_img_element);
			const pointerX = e.clientX + scrollOfs.x;
			const pointerY = e.clientY + scrollOfs.y;

			const rect = _img_element.getBoundingClientRect();
			const cx = rect.left + scrollOfs.x + rect.width / 2;
			const cy = rect.top + scrollOfs.y + rect.height / 2;

			zoom(r);

			const newRect = _img_element.getBoundingClientRect();
			if (rect.width > 0 && rect.height > 0) {
				const actualR = newRect.width / rect.width;
				const ncx = newRect.left + scrollOfs.x + newRect.width / 2;
				const ncy = newRect.top + scrollOfs.y + newRect.height / 2;

				const rendered_Mx = ncx + (pointerX - cx) * actualR;
				const rendered_My = ncy + (pointerY - cy) * actualR;
				const directionMultiplier = r > 1 ? -1 : 1;

				const shiftX = (pointerX - rendered_Mx) * directionMultiplier;
				const shiftY = (pointerY - rendered_My) * directionMultiplier;

				const currentLeft = parseFloat(_img_element.style.left) || getOffset(_img_element).left;
				const currentTop = parseFloat(_img_element.style.top) || getOffset(_img_element).top;

				_img_element.style.setProperty("left", `${currentLeft + shiftX}px`, "important");
				_img_element.style.setProperty("top", `${currentTop + shiftY}px`, "important");

				const data = getElData(_img_element, _firstkey);
				if (data) {
					data.sx += shiftX;
					data.sy += shiftY;
				}
				if (isSinglePageImg) {
					const curSize = getElData(_img_element, _sizekey);
					if (curSize) checkSingleImgActivation(_img_element, curSize.w, curSize.h);
				}
			}
			_zdSuppressBadge = false;
			showZoomBadge();
		} else {
			zoom(r);
		}
	}

	markRcModified();
	_ctx_show = false;
	e.preventDefault();
	e.stopPropagation();
	e.stopImmediatePropagation();
	return false;
}

function ctxZoom(zin) {
	if (_current_element) {
		setZoom(_current_element, null, true);
		enableAnim(_img_element);
		zoom(zin ? 2.0 : 0.5);
		if (!_singleImgPage) setZoom(null, null, false, true);
	}
}

function getUnrotatedSize(rect, rot, ratio) {
	const rad = (rot * Math.PI) / 180;
	const cos = Math.abs(Math.cos(rad));
	const sin = Math.abs(Math.sin(rad));
	const w = rect.width / (cos + sin * ratio);
	return { w, h: w * ratio };
}

function resolveObjectPos(token, free, scale) {
	if (!token) return free / 2;
	const kw = token.toLowerCase();
	if (kw === "left" || kw === "top") return 0;
	if (kw === "right" || kw === "bottom") return free;
	if (kw === "center") return free / 2;
	const calc = token.match(/^calc\(\s*(-?[\d.]+)(%|px)\s*([+-])\s*(-?[\d.]+)(%|px)\s*\)$/);
	if (calc) {
		const part = (num, unit) => (unit === "%" ? (free * parseFloat(num)) / 100 : parseFloat(num) * scale);
		const a = part(calc[1], calc[2]);
		const b = part(calc[4], calc[5]);
		return calc[3] === "+" ? a + b : a - b;
	}
	const v = parseFloat(token);
	if (!Number.isFinite(v)) return free / 2;
	if (token.endsWith("%")) return (free * v) / 100;
	if (token.endsWith("px")) return v * scale;
	return free / 2;
}

function getMenuFocusIndex(key, count, current) {
	if (!count) return -1;
	if (key === "Home") return 0;
	if (key === "End") return count - 1;
	if (key === "ArrowDown") return current < 0 ? 0 : (current + 1) % count;
	if (key === "ArrowUp") return current < 0 ? count - 1 : (current - 1 + count) % count;
	return -1;
}

function closeSaveMenu() {
	const shadow = getPanelShadow();
	const menu = shadow && shadow.getElementById("zd-save-menu");
	if (!menu || menu.hidden) return;

	const hadFocus = Boolean(shadow.activeElement && menu.contains(shadow.activeElement));
	menu.hidden = true;
	const btn = shadow.getElementById("zd-btn-save-menu");
	if (!btn) return;
	btn.setAttribute("aria-expanded", "false");
	if (hadFocus) btn.focus();
}

function applyFloatOutlineInline(img) {
	if (!isOwnBorderTarget(img)) rememberInlineBorder(img);
	const visual = isPinned(img) ? _pinFrameVisuals.panel : _floatFrameVisuals.panel;
	img.style.setProperty("outline", visual.outline, "important");
	img.style.setProperty("outline-offset", "0px", "important");
	img.style.setProperty("box-shadow", visual.shadow, "important");
}

function needsFloatFrame(img) {
	return (
		_useFloatFrameOverlay &&
		Boolean(img) &&
		img.tagName === "IMG" &&
		Boolean(getElData(img, _srckey)) &&
		img.style.getPropertyValue("filter") !== ""
	);
}

function refreshFloatFrameVisual(img) {
	const rec = _floatFrames.get(img);
	if (!rec) return;

	const isActive = rec.hover || img.classList.contains("zdImgCls_actionActive");
	const visuals = isPinned(img) ? _pinFrameVisuals : _floatFrameVisuals;
	const visual = visuals[rec.panel ? "panel" : isActive ? "hover" : "idle"];
	rec.frame.style.setProperty("outline", visual.outline, "important");
	rec.frame.style.setProperty("outline-offset", "0px", "important");
	rec.frame.style.setProperty("box-shadow", visual.shadow, "important");
}

function placeFloatFrame(img, frame) {
	const wrapper = document.getElementById(_zdExImgId);
	let host = img;
	while (host.parentNode && host.parentNode !== wrapper) host = host.parentNode;
	if (host.parentNode === wrapper && host.nextSibling !== frame) host.after(frame);
}

function syncFloatFrameGeometry(img) {
	const rec = _floatFrames.get(img);
	if (!rec) return;

	const target = rec.frame.style;
	["position", "left", "top", "width", "height", "transform", "transform-origin", "display", "visibility"].forEach((prop) => {
		const val = img.style.getPropertyValue(prop);
		if (val) target.setProperty(prop, val, "important");
		else target.removeProperty(prop);
	});
	target.setProperty("z-index", img.style.getPropertyValue("z-index") || "2147483640", "important");

	const isAnimated = img.classList.contains("zdImgCls_animated") && img.style.getPropertyValue("transition") !== "none";
	rec.frame.classList.toggle("zdImgCls_animated", isAnimated);
	if (isAnimated) target.removeProperty("transition");
	else target.setProperty("transition", "none", "important");
}

function createFloatFrame(img) {
	const wrapper = document.getElementById(_zdExImgId);
	if (!wrapper || !wrapper.contains(img)) return;

	const frame = document.createElement("div");
	frame.className = _floatFrameCls;
	frame.setAttribute("aria-hidden", "true");
	frame.style.cssText =
		"position: absolute !important; margin: 0 !important; padding: 0 !important; border: none !important; box-sizing: border-box !important; background: transparent !important; pointer-events: none !important; overflow: visible !important;";

	const inlineOutline = img.style.getPropertyValue("outline");
	const rec = {
		frame,
		hover: false,
		panel: inlineOutline !== "" && inlineOutline !== "none",
		onEnter: () => {
			rec.hover = true;
			refreshFloatFrameVisual(img);
		},
		onLeave: () => {
			rec.hover = false;
			refreshFloatFrameVisual(img);
		}
	};

	_floatFrames.set(img, rec);
	img.addEventListener("pointerenter", rec.onEnter);
	img.addEventListener("pointerleave", rec.onLeave);
	img.style.removeProperty("outline");
	img.style.removeProperty("outline-offset");
	img.style.removeProperty("box-shadow");
	img.setAttribute(_frameExtAttr, "");
}

function destroyFloatFrame(img) {
	const rec = _floatFrames.get(img);
	if (!rec) return;

	_floatFrames.delete(img);
	img.removeEventListener("pointerenter", rec.onEnter);
	img.removeEventListener("pointerleave", rec.onLeave);
	rec.frame.remove();
	img.removeAttribute(_frameExtAttr);
	if (rec.panel && img.isConnected) applyFloatOutlineInline(img);
}

function syncFloatFrame(img) {
	if (!_useFloatFrameOverlay) return;
	if (!img.isConnected) {
		destroyFloatFrame(img);
		return;
	}

	if (!needsFloatFrame(img)) {
		destroyFloatFrame(img);
		return;
	}

	if (!_floatFrames.has(img)) createFloatFrame(img);
	const rec = _floatFrames.get(img);
	if (!rec) return;

	placeFloatFrame(img, rec.frame);
	syncFloatFrameGeometry(img);
	refreshFloatFrameVisual(img);
}

function onFloatFrameMutations(records) {
	const imgs = new Set();
	let isStructural = false;

	records.forEach((record) => {
		if (record.type === "childList") isStructural = true;
		else if (record.target.tagName === "IMG" && getElData(record.target, _srckey)) imgs.add(record.target);
	});

	if (isStructural) {
		for (const img of [..._floatFrames.keys()]) {
			if (!img.isConnected) destroyFloatFrame(img);
			else imgs.add(img);
		}
	}

	imgs.forEach(syncFloatFrame);
}

function ensureFloatFrameObserver() {
	if (!_useFloatFrameOverlay) return;
	const wrapper = document.getElementById(_zdExImgId);
	if (!wrapper || wrapper === _floatFrameObserved) return;

	if (_floatFrameObserver) _floatFrameObserver.disconnect();
	_floatFrameObserver = new MutationObserver(onFloatFrameMutations);
	_floatFrameObserver.observe(wrapper, {
		subtree: true,
		childList: true,
		attributes: true,
		attributeFilter: ["style", "class"]
	});
	_floatFrameObserved = wrapper;
}

function applyPanelBorder() {
	if (!getPanelHost() || !_img_element) return;

	if (!getElData(_img_element, _srckey) && isInactiveImageTarget(_img_element)) {
		const gRoot = findGalleryRoot(_img_element);
		if (gRoot) {
			const nextImg = findActiveGalleryImage(gRoot, _img_element);
			if (nextImg && nextImg !== _img_element) {
				resetInlineElement(_img_element);
				attachEvent(nextImg);
				rebindPanelImage(nextImg);
			}
		}
	}

	const data = getElData(_img_element, _firstkey);
	const size = getElData(_img_element, _sizekey);
	if (!data || !size) return;

	const isFloating = Boolean(getElData(_img_element, _srckey));
	const isSingleImgView = _singleImgPage && _img_element.classList.contains(_imgSrcViewCls);
	const isDragged = _img_element.classList.contains(_draggedCls);

	if (isSingleImgView) return;

	const origTarget = getElData(_img_element, _srckey) || _img_element;
	if (isFloating || isElementModified(_img_element) || origTarget.hasAttribute("data-zd-pe-img")) {
		lockContainers(origTarget);
	} else if (isPanelHovered()) {
		const card = findMediaCardRoot(origTarget);
		const ytThumb = origTarget.closest("ytd-thumbnail, yt-thumbnail-view-model");
		const ytPreview = document.querySelector("ytd-video-preview");
		if (_previewLeaveTarget !== origTarget && (ytThumb || ytPreview)) {
			_previewLeaveTarget = origTarget;
			const thumbHost = origTarget.closest(_clickHostSel);
			const hostRenderer = card && card.parentElement && card.parentElement.tagName.includes("-") ? card.parentElement : null;
			[origTarget, thumbHost, ytThumb, card, hostRenderer, ytPreview]
				.filter(Boolean)
				.forEach((t) => {
					t.dispatchEvent(new MouseEvent("mouseout", { bubbles: true, cancelable: true, relatedTarget: document.body }));
					t.dispatchEvent(new MouseEvent("mouseleave", { bubbles: false, cancelable: false, relatedTarget: document.body }));
					t.dispatchEvent(new PointerEvent("pointerout", { bubbles: true, cancelable: true, relatedTarget: document.body }));
					t.dispatchEvent(new PointerEvent("pointerleave", { bubbles: false, cancelable: false, relatedTarget: document.body }));
				});
		}
		suppressActivePreviewsForCard(origTarget, card);
		suppressAnimatedPreviewsForCard(origTarget, card);
	} else {
		restoreIdleVideoPreviews();
	}

	let frame = document.getElementById("zd-panel-frame");

	if (isFloating || isDragged) {
		if (frame) frame.style.setProperty("display", "none", "important");

		const floatRec = _floatFrames.get(_img_element);
		if (floatRec) {
			floatRec.panel = true;
			refreshFloatFrameVisual(_img_element);
			return;
		}

		applyFloatOutlineInline(_img_element);
		return;
	}

	if (isElementModified(_img_element)) {
		suppressInlineBorder(_img_element);
	}

	if (!frame) {
		frame = document.createElement("div");
		frame.id = "zd-panel-frame";
		frame.style.cssText =
			"visibility: visible !important; opacity: 1 !important; pointer-events: none !important; position: fixed !important; z-index: 2147483646 !important; box-sizing: border-box !important; margin: 0 !important; padding: 0 !important; background: transparent !important;";
		document.body.insertBefore(frame, getExUiAnchor());
	}
	raiseAboveHost(frame, _img_element);

	frame.style.setProperty("display", "block", "important");

	const isZoomed = Math.abs(size.w - data.sw) > 2 || Math.abs(size.h - data.sh) > 2;
	const rot = getElData(_img_element, _rotkey) || 0;

	const rect = _img_element.getBoundingClientRect();
	const cx = rect.left + rect.width / 2;
	const cy = rect.top + rect.height / 2;

	const live = isFloating ? { x: 1, y: 1 } : getLiveScale(_img_element);
	const boxW = _img_element.offsetWidth * live.x;
	const boxH = _img_element.offsetHeight * live.y;
	const boxRatio = boxW > 0 && boxH > 0 ? boxH / boxW : 0;
	const restRatio = boxRatio > 0 ? boxRatio : size.w > 0 ? size.h / size.w : 0;
	const rotatedSize = rot % 180 !== 0 && restRatio > 0 ? getUnrotatedSize(rect, rot, restRatio) : null;

	let frameW = rot % 180 === 0 ? rect.width : rotatedSize ? rotatedSize.w : isZoomed ? size.w : data.sw;
	let frameH = rot % 180 === 0 ? rect.height : rotatedSize ? rotatedSize.h : isZoomed ? size.h : data.sh;

	const isBg = Boolean(getElData(origTarget, _bgsrckey));
	let objectFitShrink = false;
	let posX = 0;
	let posY = 0;
	if (_img_element.tagName === "IMG" || isBg) {
		const cBox = getRenderedContentBox(_img_element, frameW, frameH, isBg);
		if (cBox.shrunk) {
			const flipX = getElData(_img_element, _flipXkey) || 1;
			const flipY = getElData(_img_element, _flipYkey) || 1;
			const offX = cBox.offX * flipX;
			const offY = cBox.offY * flipY;
			const rad = (rot * Math.PI) / 180;
			frameW = cBox.w;
			frameH = cBox.h;
			posX = offX * Math.cos(rad) - offY * Math.sin(rad);
			posY = offX * Math.sin(rad) + offY * Math.cos(rad);
			objectFitShrink = true;
		}
	}

	const frameX = cx + posX - frameW / 2;
	const frameY = cy + posY - frameH / 2;

	frame.style.setProperty("left", `${frameX}px`, "important");
	frame.style.setProperty("top", `${frameY}px`, "important");
	frame.style.setProperty("width", `${frameW}px`, "important");
	frame.style.setProperty("height", `${frameH}px`, "important");
	frame.style.setProperty("transform", `rotate(${rot}deg)`, "important");
	frame.style.setProperty("transform-origin", "50% 50%", "important");

	const frameRadius = { tl: "0px", tr: "0px", br: "0px", bl: "0px" };

	if (!objectFitShrink) {
		let checkEl = _img_element;
		const fLeft = frameX;
		const fTop = frameY;
		const fRight = frameX + frameW;
		const fBottom = frameY + frameH;
		const tol = 1.2;
		const normRot = ((rot % 360) + 360) % 360;

		while (checkEl && checkEl !== document.body) {
			const style = window.getComputedStyle(checkEl);
			if (checkEl === _img_element) {
				if (style.borderTopLeftRadius !== "0px" && frameRadius.tl === "0px") frameRadius.tl = style.borderTopLeftRadius;
				if (style.borderTopRightRadius !== "0px" && frameRadius.tr === "0px") frameRadius.tr = style.borderTopRightRadius;
				if (style.borderBottomRightRadius !== "0px" && frameRadius.br === "0px")
					frameRadius.br = style.borderBottomRightRadius;
				if (style.borderBottomLeftRadius !== "0px" && frameRadius.bl === "0px")
					frameRadius.bl = style.borderBottomLeftRadius;
			} else {
				const isClipping = style.overflow === "hidden" || style.overflow === "clip";
				if (isClipping && rot % 180 === 0 && !isZoomed && !isDragged) {
					const pRect = checkEl.getBoundingClientRect();
					let pTl = "0px";
					let pTr = "0px";
					let pBr = "0px";
					let pBl = "0px";

					if (Math.abs(pRect.left - fLeft) <= tol && Math.abs(pRect.top - fTop) <= tol) pTl = style.borderTopLeftRadius;
					if (Math.abs(pRect.right - fRight) <= tol && Math.abs(pRect.top - fTop) <= tol)
						pTr = style.borderTopRightRadius;
					if (Math.abs(pRect.right - fRight) <= tol && Math.abs(pRect.bottom - fBottom) <= tol)
						pBr = style.borderBottomRightRadius;
					if (Math.abs(pRect.left - fLeft) <= tol && Math.abs(pRect.bottom - fBottom) <= tol)
						pBl = style.borderBottomLeftRadius;

					if (normRot === 180) {
						if (pBr !== "0px" && frameRadius.tl === "0px") frameRadius.tl = pBr;
						if (pBl !== "0px" && frameRadius.tr === "0px") frameRadius.tr = pBl;
						if (pTl !== "0px" && frameRadius.br === "0px") frameRadius.br = pTl;
						if (pTr !== "0px" && frameRadius.bl === "0px") frameRadius.bl = pTr;
					} else {
						if (pTl !== "0px" && frameRadius.tl === "0px") frameRadius.tl = pTl;
						if (pTr !== "0px" && frameRadius.tr === "0px") frameRadius.tr = pTr;
						if (pBr !== "0px" && frameRadius.br === "0px") frameRadius.br = pBr;
						if (pBl !== "0px" && frameRadius.bl === "0px") frameRadius.bl = pBl;
					}
				}
			}

			if (frameRadius.tl !== "0px" && frameRadius.tr !== "0px" && frameRadius.br !== "0px" && frameRadius.bl !== "0px") {
				break;
			}
			checkEl = checkEl.parentElement;
		}
	}

	if (frameRadius.tl !== "0px" || frameRadius.tr !== "0px" || frameRadius.br !== "0px" || frameRadius.bl !== "0px") {
		frame.style.setProperty("border-top-left-radius", frameRadius.tl, "important");
		frame.style.setProperty("border-top-right-radius", frameRadius.tr, "important");
		frame.style.setProperty("border-bottom-right-radius", frameRadius.br, "important");
		frame.style.setProperty("border-bottom-left-radius", frameRadius.bl, "important");
	} else {
		frame.style.removeProperty("border-radius");
		frame.style.removeProperty("border-top-left-radius");
		frame.style.removeProperty("border-top-right-radius");
		frame.style.removeProperty("border-bottom-right-radius");
		frame.style.removeProperty("border-bottom-left-radius");
	}

	const frameBorder = _zoom_frameOff ? "transparent" : ZDShared.hexToRgba(_zoom_frameColor, 0.9);
	frame.style.setProperty("border", `3px solid ${frameBorder}`, "important");
	clearBorderStyles(frame);
	frame.style.setProperty(
		"box-shadow",
		_zoom_frameOff ? "none" : `inset 0 0 20px ${ZDShared.hexToRgba(_zoom_frameColor, 0.7)}`,
		"important"
	);
	frame.classList.remove("zdImgCls_animated");
}

function removePanelBorder() {
	_previewLeaveTarget = null;
	const frame = document.getElementById("zd-panel-frame");
	if (frame) frame.remove();

	if (!_img_element) return;

	const targetEl = _img_element;
	const src_elem = getElData(targetEl, _srckey);
	if (!src_elem && !isElementModified(targetEl)) {
		clearBorderStyles(targetEl);
		restoreIdleVideoPreviews();
		return;
	}

	const oldTrans = captureInlineTransition(targetEl);
	targetEl.style.setProperty("transition", "none", "important");
	clearBorderStyles(targetEl);

	const isSingleImgView = _singleImgPage && targetEl.classList.contains(_imgSrcViewCls);

	if (src_elem) {
		const data = getElData(targetEl, _firstkey);
		const size = getElData(targetEl, _sizekey);
		const rot = getElData(targetEl, _rotkey) || 0;
		const flipX = getElData(targetEl, _flipXkey) || 1;
		const flipY = getElData(targetEl, _flipYkey) || 1;
		const isDragged = targetEl.classList.contains(_draggedCls);
		const hasOpac = getOpacityPct(targetEl) !== 100;
		const hasBright = getBrightnessPct(targetEl) !== 100;
		const hasEffects = hasEffectMods(targetEl);
		const isActionActive = Boolean(_rotParam || _zoomParam || _dragParam);

		const isUnmodified =
			!isActionActive &&
			!isDragged &&
			!isPinned(targetEl) &&
			rot === 0 &&
			flipX === 1 &&
			flipY === 1 &&
			!hasOpac &&
			!hasBright &&
			!hasEffects &&
			data &&
			size &&
			Math.abs(size.w - data.sw) < 2 &&
			Math.abs(size.h - data.sh) < 2;

		if (isUnmodified) {
			const gRoot = getElData(targetEl, _galleryRootkey) || findGalleryRoot(src_elem);
			const swapSlot = getElData(targetEl, _swapSlotkey);
			const sourceFullyReset = clearImgEx(src_elem);
			_modifiedElements.delete(src_elem);
			if (sourceFullyReset && getPanelHost()) {
				rebindPanelOrActiveGalleryImg(src_elem, gRoot, swapSlot);
			}
		}
	} else if (!isSingleImgView) {
		const data = getElData(targetEl, _firstkey);
		const size = getElData(targetEl, _sizekey);
		const isZoomed = data && size && (Math.abs(size.w - data.sw) > 2 || Math.abs(size.h - data.sh) > 2);

		if (!isZoomed && data && data.origStyle && targetEl.style.minWidth) {
			if (!_singleImgPage) targetEl.style.removeProperty("display");
			const sizeProps = [
				"left", "top", "width", "height", "max-width", "max-height", "min-width", "min-height",
				"flex-shrink", "contain", "margin", "justify-self", "align-self", "object-fit",
				"background-size", "background-position", "background-repeat"
			];
			for (const prop of sizeProps) targetEl.style.removeProperty(prop);

			targetEl.style.left = data.origStyle.left;
			targetEl.style.top = data.origStyle.top;
			targetEl.style.width = data.origStyle.width;
			targetEl.style.height = data.origStyle.height;
			targetEl.style.maxWidth = data.origStyle.maxWidth;
			targetEl.style.maxHeight = data.origStyle.maxHeight;
			targetEl.style.minWidth = data.origStyle.minWidth || "";
			targetEl.style.minHeight = data.origStyle.minHeight || "";
			targetEl.style.marginTop = data.origStyle.marginTop || "";
			targetEl.style.marginRight = data.origStyle.marginRight || "";
			targetEl.style.marginBottom = data.origStyle.marginBottom || "";
			targetEl.style.marginLeft = data.origStyle.marginLeft || "";
			targetEl.style.justifySelf = data.origStyle.justifySelf || "";
			targetEl.style.alignSelf = data.origStyle.alignSelf || "";
			targetEl.style.objectFit = data.origStyle.objectFit || "";
			if (data.origStyle.backgroundSize !== undefined) {
				targetEl.style.backgroundSize = data.origStyle.backgroundSize;
			}
			if (data.origStyle.backgroundPosition) {
				targetEl.style.backgroundPosition = data.origStyle.backgroundPosition;
			} else {
				if (data.origStyle.backgroundPositionX !== undefined) {
					targetEl.style.backgroundPositionX = data.origStyle.backgroundPositionX;
				}
				if (data.origStyle.backgroundPositionY !== undefined) {
					targetEl.style.backgroundPositionY = data.origStyle.backgroundPositionY;
				}
			}
			if (data.origStyle.backgroundRepeat !== undefined) {
				targetEl.style.backgroundRepeat = data.origStyle.backgroundRepeat;
			}
		}
	}

	void targetEl.offsetHeight;
	if (oldTrans.length) restoreInlineTransition(targetEl, oldTrans);
	else releaseTransitionLock(targetEl);
}

function ensureFloating() {
	if (!_img_element || _img_element.tagName.toUpperCase() === "CANVAS") return;

	if (_singleImgPage && _img_element.classList.contains(_imgSrcViewCls)) {
		applyPanelBorder();
		return;
	}

	if (!getElData(_img_element, _srckey)) {
		syncBaseRect(_img_element);
		const bData = getElData(_img_element, _firstkey);
		if (!bData) return;

		if (_img_element.isConnected) {
			const curRect = _img_element.getBoundingClientRect();
			if (curRect.width > 0 && curRect.height > 0) {
				const isBg = Boolean(getElData(_img_element, _bgsrckey));
				const boxW = _img_element.offsetWidth || curRect.width;
				const boxH = _img_element.offsetHeight || curRect.height;
				const cBox = getRenderedContentBox(_img_element, boxW, boxH, isBg);
				bData.sx = curRect.left + window.scrollX + curRect.width / 2 + cBox.offX - bData.sw / 2;
				bData.sy = curRect.top + window.scrollY + curRect.height / 2 + cBox.offY - bData.sh / 2;
			}
		}

		const sz = getElData(_img_element, _sizekey) || { w: bData.sw, h: bData.sh };
		const prevSuppress = _zdSuppressBadge;
		_zdSuppressBadge = true;
		try {
			generateImgEx({ w: sz.w, h: sz.h });
		} finally {
			_zdSuppressBadge = prevSuppress;
		}
	}
	applyPanelBorder();
}

async function ctxZoomCustom() {
	if (!_current_element) return;
	setZoom(_current_element);

	if (_rclickTimer) {
		clearTimeout(_rclickTimer);
		_rclickTimer = null;
	}

	let initialData = getElData(_img_element, _firstkey);
	let initialSize = getElData(_img_element, _sizekey);
	if (!initialData || !initialSize) {
		setZoom();
		return;
	}

	const existingPanel = getPanelHost();
	if (existingPanel) {
		syncPanelValues();
		applyPanelBorder();
		return;
	}

	const t = (key, fallback) => (browser?.i18n && browser.i18n.getMessage(key)) || fallback;

	if (ctxZoomCustom.isBuilding) return;
	ctxZoomCustom.isBuilding = true;

	const panel = document.createElement("div");
	_panelHover = false;
	panel.id = _zdPanelId;
	panel.style.cssText =
		"display: block !important; visibility: visible !important; opacity: 1 !important; position: fixed !important; top: 20px; right: 20px; z-index: 2147483647 !important;";

	const shadowRoot = panel.attachShadow({ mode: "closed" });
	_panelShadow = shadowRoot;

	try {
		if (!_panelTemplate) {
			const response = await browser.runtime.sendMessage({ id: "get-panel-template" });
			if (!response?.ok || typeof response.html !== "string") {
				throw new Error(response?.error || "Failed to load panel template");
			}
			_panelTemplate = response.html;
		}

		if (_isExcludedHost || !_img_element || !_img_element.isConnected || getPanelHost()) {
			_panelShadow = null;
			ctxZoomCustom.isBuilding = false;
			return;
		}

		initialData = getElData(_img_element, _firstkey);
		initialSize = getElData(_img_element, _sizekey);
		if (!initialData || !initialSize) {
			_panelShadow = null;
			ctxZoomCustom.isBuilding = false;
			return;
		}

		const curZoom = getZoomPct(initialSize.w, initialData.sw);
		const curWidth = Math.round(initialSize.w);
		const curRot = normalizeRot(getElData(_img_element, _rotkey) || 0);
		const curOpac = getOpacityPct(_img_element);
		const curBright = getBrightnessPct(_img_element);

		const parsedPanel = new DOMParser().parseFromString(_panelTemplate, "text/html");
		const panelNodes = [
			...parsedPanel.head.querySelectorAll("style"),
			...parsedPanel.body.childNodes
		];
		shadowRoot.append(...panelNodes);

		shadowRoot.querySelectorAll("[data-i18n]").forEach((el) => {
			el.textContent = t(el.getAttribute("data-i18n"));
		});
		shadowRoot.querySelectorAll("[data-i18n-title]").forEach((el) => {
			el.title = t(el.getAttribute("data-i18n-title"));
			el.setAttribute("aria-label", el.title);
		});

		panel.setAttribute("role", "dialog");
		panel.setAttribute("aria-label", t("panel_title", "Zoom & Drag"));
		shadowRoot.querySelectorAll(".zd-panel-label").forEach((label) => {
			const row = label.parentElement;
			if (!row) return;
			row.querySelectorAll("input").forEach((input) => input.setAttribute("aria-label", label.textContent));
		});

		shadowRoot.querySelector("#zd-sl-zoom").value = curZoom;
		const initZoomNum = shadowRoot.querySelector("#zd-num-zoom");
		initZoomNum.min = String(Math.min(100, getZoomPct(20, initialData.sw)));
		initZoomNum.value = curZoom;
		shadowRoot.querySelector("#zd-sl-width").value = curWidth;
		shadowRoot.querySelector("#zd-num-width").value = curWidth;
		shadowRoot.querySelector("#zd-sl-rot").value = curRot;
		shadowRoot.querySelector("#zd-num-rot").value = curRot;
		shadowRoot.querySelector("#zd-sl-opac").value = curOpac;
		shadowRoot.querySelector("#zd-num-opac").value = curOpac;
		shadowRoot.querySelector("#zd-sl-bright").value = curBright;
		shadowRoot.querySelector("#zd-num-bright").value = curBright;
		updateEffectButtons(shadowRoot);
		updatePanelMeta(shadowRoot);

		document.body.appendChild(panel);

		requestAnimationFrame(() => {
			if (panel.isConnected) {
				const rect = panel.getBoundingClientRect();
				panel.style.left = `${rect.left}px`;
				panel.style.right = "auto";
			}
		});
	} catch (error) {
		console.error("[Zoom & Drag] Error loading panel.html:", error);
		_panelShadow = null;
		ctxZoomCustom.isBuilding = false;
		return;
	}

	ctxZoomCustom.isBuilding = false;

	shadowRoot.querySelectorAll(".zd-panel-label").forEach((label) => {
		if (label.scrollWidth > label.clientWidth) {
			label.title = label.textContent;
			label.style.cursor = "help";
		}
	});

	panel.addEventListener("mouseleave", () => {
		_panelHover = false;
		if (shadowRoot.activeElement) shadowRoot.activeElement.blur();
		removePanelBorder();
	});

	panel.addEventListener("mouseenter", () => {
		_panelHover = true;
		applyPanelBorder();
		triggerFrameTransitionSync(500);
	});

	shadowRoot.addEventListener("mousedown", (e) => {
		if (_img_element && !getElData(_img_element, _srckey) && !isElementModified(_img_element)) {
			syncBaseRect(_img_element);
			syncPanelValues();
		}
		const target = e.target;
		if (target.tagName.toUpperCase() === "BUTTON" || target.closest("button") || target.id === "zd-btn-x") {
			e.preventDefault();
			return;
		}
		if (target.tagName.toUpperCase() === "INPUT" || (target.id && (target.id.includes("opac") || target.id.includes("bright")))) {
			return;
		}
		if (target.id === "zd-panel-header" || target.closest("#zd-panel-header")) return;
		ensureFloating();
	});

	const onOutsideAction = (e) => {
		if (!getPanelHost()) {
			window.removeEventListener("mousedown", onOutsideAction, true);
			return;
		}
		if (panel && !e.composedPath().includes(panel)) {
			removePanelBorder();
		}
	};

	window.addEventListener("mousedown", onOutsideAction, true);

	const stopProp = (e) => e.stopPropagation();
	[
		"mousedown", "mouseup", "pointerdown", "pointerup", "wheel",
		"click", "dblclick", "contextmenu", "keydown", "keyup", "keypress",
		"beforeinput", "input", "compositionstart", "compositionupdate", "compositionend"
	].forEach((evt) => shadowRoot.addEventListener(evt, stopProp));

	const focusEvts = ["focusin", "focusout", "focus", "blur"];
	const shieldFocus = (e) => {
		if (!getPanelHost()) {
			focusEvts.forEach((evt) => window.removeEventListener(evt, shieldFocus, true));
			return;
		}
		if (e.composedPath().includes(panel) || e.relatedTarget === panel) {
			e.stopImmediatePropagation();
		}
	};

	focusEvts.forEach((evt) => window.addEventListener(evt, shieldFocus, true));

	const getInputStep = (id, shift) => {
		if (!shift) return 1;
		if (id.includes("rot")) return 15;
		if (id.includes("width")) return 100;
		if (id.includes("zoom")) return 10;
		return 5;
	};

	const stepInput = (target, dir, shift) => {
		const val = parseFloat(target.value);
		if (isNaN(val)) return;
		const minStr = target === els.zSl ? els.zNum.min : target.min;
		const min = minStr !== "" ? Number(minStr) : -Infinity;
		const max = target.max !== "" ? Number(target.max) : Infinity;
		const next = Math.min(max, Math.max(min, val + dir * getInputStep(target.id, shift)));
		if (next === val) return;
		target.value = next;
		target.dispatchEvent(new Event("input"));
	};

	let hoverInput = null;

	shadowRoot.addEventListener("mouseover", (e) => {
		const target = e.target;
		if (target.tagName === "INPUT" && (target.type === "range" || target.type === "number")) hoverInput = target;
	});

	shadowRoot.addEventListener("mouseout", (e) => {
		if (e.target === hoverInput) hoverInput = null;
	});

	const onHoverKey = (e) => {
		if (!getPanelHost()) {
			window.removeEventListener("keydown", onHoverKey, true);
			return;
		}
		const target = hoverInput;
		if (!target || !panel.matches(":hover") || e.ctrlKey || e.metaKey || e.altKey) return;
		if (e.key !== "ArrowUp" && e.key !== "ArrowRight" && e.key !== "ArrowDown" && e.key !== "ArrowLeft") return;
		if (shadowRoot.activeElement === target && target.type === "number") return;
		if (!e.composedPath().includes(panel) && (isEditableTarget(e.target) || isEditableTarget(document.activeElement))) return;

		e.preventDefault();
		e.stopPropagation();
		e.stopImmediatePropagation();

		const dir = e.key === "ArrowUp" || e.key === "ArrowRight" ? 1 : -1;
		stepInput(target, dir, e.shiftKey);
	};

	window.addEventListener("keydown", onHoverKey, true);

	shadowRoot.addEventListener(
		"wheel",
		(e) => {
			e.preventDefault();
			const target = e.target;
			if (target.tagName === "INPUT" && (target.type === "range" || target.type === "number")) {
				stepInput(target, e.deltaY < 0 ? 1 : -1, e.shiftKey);
			}
		},
		{ passive: false }
	);

	const keyEvts = ["keydown", "keypress", "keyup"];
	const shieldKey = (e) => {
		if (!panel.isConnected) {
			keyEvts.forEach((evt) => window.removeEventListener(evt, shieldKey, true));
			return;
		}
		if (!e.composedPath().includes(panel)) return;

		if (e.type === "keydown") {
			const target = shadowRoot.activeElement;
			if (target === menuBtn && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
				e.preventDefault();
				openMenu(true);
			} else if (!menuEl.hidden && target && menuEl.contains(target)) {
				if (e.key === "Escape") {
					e.preventDefault();
					closeMenu(true);
				} else if (e.key === "Tab") {
					closeMenu(false);
				} else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
					e.preventDefault();
					const items = [...menuEl.querySelectorAll(".zd-menu-item:not([disabled])")];
					const next = getMenuFocusIndex(e.key, items.length, items.indexOf(target));
					if (next >= 0) items[next].focus();
				}
			} else if (
				e.shiftKey &&
				target &&
				target.tagName === "INPUT" &&
				(target.type === "range" || target.type === "number") &&
				(e.key === "ArrowUp" || e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "ArrowLeft")
			) {
				e.preventDefault();
				const dir = e.key === "ArrowUp" || e.key === "ArrowRight" ? 1 : -1;
				stepInput(target, dir, true);
			}
		}

		e.stopImmediatePropagation();
	};

	keyEvts.forEach((evt) => window.addEventListener(evt, shieldKey, true));

	const els = {
		zSl: shadowRoot.getElementById("zd-sl-zoom"),
		zNum: shadowRoot.getElementById("zd-num-zoom"),
		wSl: shadowRoot.getElementById("zd-sl-width"),
		wNum: shadowRoot.getElementById("zd-num-width"),
		rSl: shadowRoot.getElementById("zd-sl-rot"),
		rNum: shadowRoot.getElementById("zd-num-rot"),
		oSl: shadowRoot.getElementById("zd-sl-opac"),
		oNum: shadowRoot.getElementById("zd-num-opac"),
		bSl: shadowRoot.getElementById("zd-sl-bright"),
		bNum: shadowRoot.getElementById("zd-num-bright")
	};

	const header = shadowRoot.getElementById("zd-panel-header");
	const btnX = shadowRoot.getElementById("zd-btn-x");
	let isDraggingPanel = false;
	let dragOffsetX = 0;
	let dragOffsetY = 0;

	header.addEventListener("mousedown", (e) => {
		if (e.target === btnX) return;
		isDraggingPanel = true;
		header.style.cursor = "grabbing";
		const rect = panel.getBoundingClientRect();
		dragOffsetX = e.clientX - rect.left;
		dragOffsetY = e.clientY - rect.top;
	});

	const onPanelMove = (e) => {
		if (!getPanelHost()) {
			window.removeEventListener("mousemove", onPanelMove, true);
			return;
		}
		if (!isDraggingPanel) return;
		panel.style.left = `${e.clientX - dragOffsetX}px`;
		panel.style.top = `${e.clientY - dragOffsetY}px`;
		panel.style.right = "auto";
	};

	const onPanelUp = () => {
		if (!getPanelHost()) {
			window.removeEventListener("mouseup", onPanelUp, true);
			return;
		}
		if (isDraggingPanel) {
			isDraggingPanel = false;
			header.style.cursor = "grab";
		}
	};

	window.addEventListener("mousemove", onPanelMove, true);
	window.addEventListener("mouseup", onPanelUp, true);

	let rafId = null;

	const updateSize = () => {
		const skipBadge = _zdSuppressBadge;

		if (!_img_element) {
			const target = getActiveImageTarget(false);
			if (target) setZoom(target, null, true);
			else return;
		}

		syncBaseRect(_img_element);

		const bData = getElData(_img_element, _firstkey);
		if (!bData) return;

		const targetW = Math.max(20, parseFloat(els.wNum.value));
		const isDefault = Math.abs(targetW - bData.sw) < 1;
		const isFloating = Boolean(getElData(_img_element, _srckey));

		if (!isDefault || isFloating) ensureFloating();
		if (rafId) cancelAnimationFrame(rafId);

		rafId = requestAnimationFrame(() => {
			if (!_img_element) return;
			disableAnim(_img_element);
			syncBaseRect(_img_element);
			if (isDefault && !getElData(_img_element, _srckey)) {
				setImageRect(null);
			} else {
				const origElem = getElData(_img_element, _srckey) || _img_element;
				const isBg = Boolean(getElData(origElem, _bgsrckey));
				if (isDefault && origElem !== _img_element && !isBg) {
					const origStyle = window.getComputedStyle(origElem);
					const origFit = origStyle.objectFit || "fill";
					const effectiveFit = origFit === "scale-down" || origFit === "none" ? "contain" : origFit;
					_img_element.style.setProperty("object-fit", effectiveFit, "important");
					_img_element.style.setProperty(
						"object-position",
						effectiveFit === "cover" ? origStyle.objectPosition || "center" : "center",
						"important"
					);
				}
				const targetH = getObjectFitHeight(_img_element, targetW, bData);
				const limSize = clampMaxSide(targetW, targetH);
				setImageRect({ w: limSize.w, h: limSize.h });
			}
			if (isPanelHovered() || panelHasFocus()) applyPanelBorder();
			if (!skipBadge) showZoomBadge();
		});
	};

	const updateRot = (skipBadge = false) => {
		if (!_img_element) {
			const target = getActiveImageTarget(false);
			if (target) setZoom(target, null, true);
			else return;
		}

		syncBaseRect(_img_element);

		const rot = parseInt(els.rNum.value, 10) || 0;
		if (rot !== 0 || getElData(_img_element, _srckey)) ensureFloating();

		disableAnim(_img_element);
		syncBaseRect(_img_element);
		imgRotate(rot);
		applyPanelBorder();
		if (!skipBadge) showZoomBadge();
	};

	const updateFilters = () => {
		if (!_img_element) {
			const target = getActiveImageTarget(false);
			if (target) setZoom(target, null, true);
			else return;
		}

		disableAnim(_img_element);
		syncBaseRect(_img_element);

		const opac = parseInt(els.oNum.value, 10) || 100;
		const bright = parseInt(els.bNum.value, 10) || 100;

		if (opac !== 100 || bright !== 100 || getElData(_img_element, _srckey)) {
			ensureFloating();
		}

		ensureElevatedZIndex(_img_element);

		applyFilterAndOpacity(_img_element, opac, bright);

		if (!getElData(_img_element, _srckey)) {
			if (isElementModified(_img_element)) {
				_img_element.style.setProperty("cursor", "default", "important");
			} else {
				_img_element.style.removeProperty("cursor");
			}
		} else {
			_img_element.style.removeProperty("cursor");
		}

		applyPanelBorder();

		if (_singleImgPage && _img_element.classList.contains(_imgSrcViewCls)) {
			const size = getElData(_img_element, _sizekey);
			if (size) checkSingleImgActivation(_img_element, size.w, size.h);
		}
	};

	const sync = (sl, num, type, defVal, min, max) => {
		const getLimit = () => {
			if (_img_element) syncBaseRect(_img_element);
			const bData = getElData(_img_element, _firstkey);
			if (type !== "size" || !bData) return max;
			const maxW = getMaxWidth(bData);
			return Math.min(max, num === els.zNum ? Math.floor((maxW / bData.sw) * 100) : maxW);
		};

		const getMin = () => {
			if (num !== els.zNum) return min;
			if (_img_element) syncBaseRect(_img_element);
			const bData = getElData(_img_element, _firstkey);
			return bData ? Math.min(100, getZoomPct(20, bData.sw)) : min;
		};

		const applyValues = (rawVal, forceInputUpdate) => {
			if (_img_element) syncBaseRect(_img_element);
			const bData = getElData(_img_element, _firstkey);
			if (!bData) return;

			let val = parseFloat(rawVal);
			if (isNaN(val)) val = defVal;
			const limit = getLimit();
			const lo = getMin();
			if (val > limit) val = limit;
			if (val < lo) val = lo;

			sl.value = val;
			if (forceInputUpdate) num.value = val;

			if (type === "size") {
				if (num === els.zNum || sl === els.zSl) {
					let newW = Math.round(bData.sw * (val / 100));
					if (newW < 20) {
						newW = 20;
						val = getZoomPct(20, bData.sw);
						sl.value = val;
						if (forceInputUpdate) num.value = val;
					}
					els.wSl.value = els.wNum.value = newW;
				} else {
					els.zSl.value = els.zNum.value = getZoomPct(val, bData.sw);
				}
				updateSize();
			} else if (type === "rot") {
				updateRot();
			} else {
				updateFilters();
			}
		};

		sl.addEventListener("input", (e) => {
			applyValues(e.target.value, true);
			updateSliderFill(e.target);
		});

		num.addEventListener("input", (e) => {
			const val = parseFloat(e.target.value);
			const limit = getLimit();
			if (val > limit) {
				applyValues(limit, true);
				updateSliderFill(sl);
			} else if (!isNaN(val) && val >= getMin()) {
				sl.value = val;
				const bData = getElData(_img_element, _firstkey);
				if (bData && type === "size") {
					if (num === els.zNum) {
						const newW = Math.max(20, Math.round(bData.sw * (val / 100)));
						els.wSl.value = els.wNum.value = newW;
						updateSliderFill(els.wSl);
					} else {
						els.zSl.value = els.zNum.value = getZoomPct(val, bData.sw);
						updateSliderFill(els.zSl);
					}
					updateSize();
				} else if (type === "rot") {
					updateRot();
				} else {
					updateFilters();
				}
				updateSliderFill(sl);
			}
		});

		num.addEventListener("change", (e) => {
			applyValues(e.target.value, true);
			updateSliderFill(sl);
		});

		num.addEventListener("blur", () => {
			const val = parseFloat(num.value);
			if (isNaN(val) || val < getMin() || val > getLimit()) {
				applyValues(num.value, true);
				updateSliderFill(sl);
			}
		});
	};

	sync(els.zSl, els.zNum, "size", 100, 1, Infinity);
	sync(els.wSl, els.wNum, "size", initialData.sw, 20, _maxExportSide);
	sync(els.rSl, els.rNum, "rot", 0, -180, 180);
	sync(els.oSl, els.oNum, "filter", 100, 10, 100);
	sync(els.bSl, els.bNum, "filter", 100, 10, 200);

	const bindMiniReset = (btnId, inputEl, defaultVal) => {
		const btn = shadowRoot.getElementById(btnId);
		if (!btn) return;
		btn.addEventListener("click", () => {
			const val = typeof defaultVal === "function" ? defaultVal() : defaultVal;
			_zdSuppressBadge = true;
			inputEl.value = val;
			inputEl.dispatchEvent(new Event("change"));
			hideBadgeImmediate();
			_zdSuppressBadge = false;
		});
	};

	bindMiniReset("zd-btn-reset-zoom", els.zNum, 100);
	bindMiniReset("zd-btn-reset-width", els.wNum, () => {
		const bData = getElData(_img_element, _firstkey);
		return bData ? Math.round(bData.sw) : 100;
	});
	bindMiniReset("zd-btn-reset-rot", els.rNum, 0);
	bindMiniReset("zd-btn-reset-opac", els.oNum, 100);
	bindMiniReset("zd-btn-reset-bright", els.bNum, 100);

	const btnFlipH = shadowRoot.getElementById("zd-btn-flip-h");
	const btnFlipV = shadowRoot.getElementById("zd-btn-flip-v");

	const handleFlip = (flipKey) => {
		if (!_img_element) {
			const target = getActiveImageTarget(false);
			if (target) setZoom(target, null, true);
			else return;
		}
		_zdSuppressBadge = true;
		ensureFloating();
		const currentFlip = (getElData(_img_element, flipKey) || 1) * -1;
		setElData(_img_element, flipKey, currentFlip);
		updateRot(true);
		hideBadgeImmediate();
		_zdSuppressBadge = false;
	};

	btnFlipH.addEventListener("click", () => handleFlip(_flipXkey));
	btnFlipV.addEventListener("click", () => handleFlip(_flipYkey));

	const handleEffect = (type) => {
		if (!_img_element) {
			const target = getActiveImageTarget(false);
			if (target) setZoom(target, null, true);
			else return;
		}
		_zdSuppressBadge = true;
		ensureFloating();
		disableAnim(_img_element);
		syncBaseRect(_img_element);

		if (type === "pixel") {
			setPixelMode(_img_element, !isPixelMode(_img_element));
		} else {
			const fx = getFilterEffects(_img_element);
			fx[type] = !fx[type];
			applyFilterAndOpacity(_img_element, getOpacityPct(_img_element), getBrightnessPct(_img_element), fx);
		}

		ensureElevatedZIndex(_img_element);
		updateEffectButtons(shadowRoot);
		applyPanelBorder();
		hideBadgeImmediate();
		_zdSuppressBadge = false;
	};

	shadowRoot.getElementById("zd-btn-invert").addEventListener("click", () => handleEffect("invert"));
	shadowRoot.getElementById("zd-btn-gray").addEventListener("click", () => handleEffect("gray"));
	shadowRoot.getElementById("zd-btn-pixel").addEventListener("click", () => handleEffect("pixel"));

	const handlePin = () => {
		if (!_img_element) {
			const target = getActiveImageTarget(false);
			if (target) setZoom(target, null, true);
			else return;
		}
		togglePinned(_img_element);
	};

	shadowRoot.getElementById("zd-btn-pin").addEventListener("click", handlePin);

	const getStableImgId = (imgEl) => {
		if (!imgEl) return null;
		const bgUrl = getElData(imgEl, _bgsrckey);
		return (
			imgEl.getAttribute("src") ||
			imgEl.getAttribute("srcset") ||
			imgEl.currentSrc ||
			imgEl.src ||
			(bgUrl ? extractBgUrl(imgEl) || (imgEl.hasAttribute("data-zd-float-hidden") ? bgUrl : null) : null)
		);
	};

	let initialPageKey = getPageKey();
	const initialOrigImg = _img_element ? getElData(_img_element, _srckey) || _img_element : null;
	let currentGalleryRoot = findGalleryRoot(initialOrigImg);
	let currentOuterRoot = findOuterGalleryRoot(initialOrigImg);
	let currentFixedOverlay = findFixedOverlayRoot(initialOrigImg);
	let currentSwapSlot =
		(_img_element && getElData(_img_element, _srckey) && getElData(_img_element, _swapSlotkey)) ||
		findSwapSlotContainer(initialOrigImg);
	let initialSrc = getStableImgId(initialOrigImg);
	let initialOrigRect = getDocRect(initialOrigImg);
	let currentlyObservedImg = _img_element;

	let _frameBurstRafId = 0;
	let _frameApplyRafId = 0;
	let _frameBurstEndTime = 0;
	let _lastSyncedRectStr = "";
	let _lastOffsetW = _img_element ? _img_element.offsetWidth : 0;
	let _lastOffsetH = _img_element ? _img_element.offsetHeight : 0;
	let _lastRectW = _img_element ? Math.round(_img_element.getBoundingClientRect().width) : 0;
	let _lastRectH = _img_element ? Math.round(_img_element.getBoundingClientRect().height) : 0;

	const syncUnmodifiedBaseSize = (preserveTransition = false) => {
		if (!_img_element || !_img_element.isConnected || getElData(_img_element, _srckey)) return;
		if (_img_element.hasAttribute("data-zd-float-hidden")) return;
		if (!isElementModified(_img_element)) {
			const curOffsetW = _img_element.offsetWidth;
			const curOffsetH = _img_element.offsetHeight;
			const curRect = _img_element.getBoundingClientRect();
			const curRectW = Math.round(curRect.width);
			const curRectH = Math.round(curRect.height);
			const layoutChanged =
				curOffsetW !== _lastOffsetW ||
				curOffsetH !== _lastOffsetH ||
				curRectW !== _lastRectW ||
				curRectH !== _lastRectH;
			_lastOffsetW = curOffsetW;
			_lastOffsetH = curOffsetH;
			_lastRectW = curRectW;
			_lastRectH = curRectH;

			if (layoutChanged) {
				const data = getElData(_img_element, _firstkey);
				if (data?.origStyle && !_img_element.style.getPropertyPriority("min-width")) {
					data.origStyle.width = _img_element.style.width;
					data.origStyle.height = _img_element.style.height;
				}
			}
			syncBaseRect(_img_element, preserveTransition && !layoutChanged);
			if (layoutChanged || !preserveTransition) {
				syncPanelValues();
			}
		}
	};

	const syncPageScale = () => {
		const el = _img_element;
		if (!el || !el.isConnected || getElData(el, _srckey) || _dragParam || _rotParam || _zoomParam) return;
		if (_singleImgPage && el.classList.contains(_imgSrcViewCls)) return;

		const data = getElData(el, _firstkey);
		const size = getElData(el, _sizekey);
		if (!data || !size || data.scaleX === undefined || !isElementModified(el)) return;

		const live = getLiveScale(el);
		if (Math.abs(live.x - data.scaleX) < 0.001 && Math.abs(live.y - data.scaleY) < 0.001) return;

		_ignoringSelfMutations = true;
		try {
			setCssBoxSize(el, size.w / live.x, size.h / live.y);
			data.scaleX = live.x;
			data.scaleY = live.y;
		} finally {
			frameSyncObserver.takeRecords();
			_ignoringSelfMutations = false;
		}
	};

	const syncFrameIfActive = () => {
		syncUnmodifiedBaseSize(true);
		syncPageScale();
		const activeFrame = document.getElementById("zd-panel-frame");
		if (activeFrame && activeFrame.style.display !== "none" && _img_element && _img_element.isConnected) {
			const r = _img_element.getBoundingClientRect();
			const rectStr = `${r.left.toFixed(2)}_${r.top.toFixed(2)}_${r.width.toFixed(2)}_${r.height.toFixed(2)}`;
			if (rectStr !== _lastSyncedRectStr) {
				_lastSyncedRectStr = rectStr;
				applyPanelBorder();
			}
		}
	};

	const runFrameBurst = () => {
		_frameBurstRafId = 0;
		if (!getPanelHost()) return;
		syncFrameIfActive();
		if (performance.now() < _frameBurstEndTime) {
			_frameBurstRafId = requestAnimationFrame(runFrameBurst);
		}
	};

	const triggerFrameTransitionSync = (durationMs = 500) => {
		if (!getPanelHost()) return;
		_frameBurstEndTime = Math.max(_frameBurstEndTime, performance.now() + durationMs);
		if (!_frameBurstRafId) {
			_frameBurstRafId = requestAnimationFrame(runFrameBurst);
		}
	};

	const onTransitionOrHoverChange = (e) => {
		if (!_img_element || !_img_element.isConnected) return;
		const path = e.composedPath ? e.composedPath() : [e.target];
		const isRelated = path.some(
			(n) => n && n.nodeType === 1 && (n === _img_element || n.contains?.(_img_element) || _img_element.contains?.(n))
		);
		if (isRelated) {
			if (e.type === "transitionend") {
				syncUnmodifiedBaseSize(false);
				_lastSyncedRectStr = "";
				syncFrameIfActive();
			} else {
				syncUnmodifiedBaseSize(true);
			}
			triggerFrameTransitionSync(500);
		}
	};

	const frameResizeObserver = new ResizeObserver(() => {
		syncUnmodifiedBaseSize();
		_lastSyncedRectStr = "";
		syncFrameIfActive();
	});

	window.addEventListener("scroll", syncFrameIfActive, { passive: true, capture: true });
	window.addEventListener("resize", syncFrameIfActive, { passive: true });
	window.addEventListener("transitionrun", onTransitionOrHoverChange, { passive: true, capture: true });
	window.addEventListener("transitionstart", onTransitionOrHoverChange, { passive: true, capture: true });
	window.addEventListener("transitionend", onTransitionOrHoverChange, { passive: true, capture: true });
	window.addEventListener("mouseover", onTransitionOrHoverChange, { passive: true, capture: true });
	window.addEventListener("mouseout", onTransitionOrHoverChange, { passive: true, capture: true });

	const watchedAttrs = ["style", "class", "aria-current", "aria-hidden", "data-active-index"];
	const observeImgAndAncestors = (imgEl) => {
		if (!imgEl) return;
		frameSyncObserver.observe(imgEl, { attributes: true, attributeOldValue: true, attributeFilter: watchedAttrs });
		frameResizeObserver.observe(imgEl);
		let p = composedParent(imgEl);
		for (let i = 0; i < 6 && p && p !== document.body && p !== document.documentElement; i++, p = composedParent(p)) {
			if (p.nodeType === 1) {
				frameSyncObserver.observe(p, { attributes: true, attributeOldValue: true, attributeFilter: watchedAttrs });
				frameResizeObserver.observe(p);
			}
		}
	};

	const isPanelFrameVisible = () => {
		const activeFrame = document.getElementById("zd-panel-frame");
		return Boolean(activeFrame && (activeFrame.style.display !== "none" || panel.matches(":hover") || panelHasFocus()));
	};

	const scheduleFrameApply = () => {
		if (_frameApplyRafId) return;
		_frameApplyRafId = requestAnimationFrame(() => {
			_frameApplyRafId = 0;
			if (!getPanelHost() || !isPanelFrameVisible()) return;
			_lastSyncedRectStr = "";
			applyPanelBorder();
		});
	};

	let _ignoringSelfMutations = false;

	const hasNetAttrChange = (mutations, attr) => {
		const firstOld = new Map();
		for (const m of mutations) {
			if (m.attributeName === attr && !firstOld.has(m.target)) {
				firstOld.set(m.target, m.oldValue ?? "");
			}
		}
		for (const [target, oldVal] of firstOld) {
			if ((target.getAttribute(attr) ?? "") !== oldVal) return true;
		}
		return false;
	};

	const frameSyncObserver = new MutationObserver((mutations) => {
		if (_ignoringSelfMutations) return;

		const slideAttrChanged =
			hasNetAttrChange(mutations, "aria-current") ||
			hasNetAttrChange(mutations, "aria-hidden") ||
			hasNetAttrChange(mutations, "data-active-index");
		const classChanged = hasNetAttrChange(mutations, "class") || slideAttrChanged;
		const styleChanged = hasNetAttrChange(mutations, "style");
		if (!classChanged && !styleChanged) return;

		_ignoringSelfMutations = true;
		try {
			if (_img_element && !getElData(_img_element, _srckey)) {
				if (!isElementModified(_img_element)) {
					const data = getElData(_img_element, _firstkey);
					if (data?.origStyle && !isZdTransitionLock(_img_element)) {
						data.origStyle.transform = _img_element.style.transform;
						data.origStyle.transformOrigin = _img_element.style.transformOrigin;
					}
					syncUnmodifiedBaseSize();
					triggerFrameTransitionSync(350);
				} else if (classChanged) {
					const inlineTransform = _img_element.style.getPropertyValue("transform");
					const inlinePriority = _img_element.style.getPropertyPriority("transform");

					_img_element.style.removeProperty("transform");

					const { txPct, tyPct, origMatrix } = extractTransformMatrixData(_img_element);
					const data = getElData(_img_element, _firstkey);
					const size = getElData(_img_element, _sizekey);

					if (data) {
						data.origMatrix = origMatrix;
						data.txPct = txPct;
						data.tyPct = tyPct;

						if (size && Math.abs(size.w - data.sw) <= 2 && Math.abs(size.h - data.sh) <= 2) {
							const curRect = getRestRect(_img_element);
							const rawSw = curRect.width || _img_element.offsetWidth;
							const rawSh = curRect.height || _img_element.offsetHeight;
							if (rawSw > 0 && rawSh > 0) {
								const isBg = Boolean(getElData(_img_element, _bgsrckey));
								const adjusted = adjustSizeToNaturalAspectRatio(_img_element, rawSw, rawSh, isBg);
								data.sw = size.w = adjusted.w;
								data.sh = size.h = adjusted.h;
							}
						}
					}

					if (inlineTransform) {
						_img_element.style.setProperty("transform", inlineTransform, inlinePriority);
					}

					imgRotate(getElData(_img_element, _rotkey) || 0, _img_element);
					syncPanelValues();
				}
			}
		} finally {
			frameSyncObserver.takeRecords();
			_ignoringSelfMutations = false;
		}

		if (!isPanelFrameVisible()) return;
		triggerFrameTransitionSync(500);
		scheduleFrameApply();
	});

	if (currentlyObservedImg) {
		observeImgAndAncestors(currentlyObservedImg);
	}

	triggerFrameTransitionSync(600);

	let panelCheckInterval = 0;

	const cleanupPanelObservers = () => {
		if (_panelShadow === shadowRoot) _panelShadow = null;
		if (_panelCleanup === cleanupPanelObservers) _panelCleanup = null;
		if (panelCheckInterval) {
			clearInterval(panelCheckInterval);
			panelCheckInterval = 0;
		}
		if (_frameBurstRafId) {
			cancelAnimationFrame(_frameBurstRafId);
			_frameBurstRafId = 0;
		}
		if (_frameApplyRafId) {
			cancelAnimationFrame(_frameApplyRafId);
			_frameApplyRafId = 0;
		}
		frameSyncObserver.disconnect();
		frameResizeObserver.disconnect();
		window.removeEventListener("scroll", syncFrameIfActive, { capture: true });
		window.removeEventListener("resize", syncFrameIfActive);
		window.removeEventListener("transitionrun", onTransitionOrHoverChange, { capture: true });
		window.removeEventListener("transitionstart", onTransitionOrHoverChange, { capture: true });
		window.removeEventListener("transitionend", onTransitionOrHoverChange, { capture: true });
		window.removeEventListener("mouseover", onTransitionOrHoverChange, { capture: true });
		window.removeEventListener("mouseout", onTransitionOrHoverChange, { capture: true });
		window.removeEventListener("mousemove", onPanelMove, true);
		window.removeEventListener("mouseup", onPanelUp, true);
		window.removeEventListener("mousedown", onOutsideAction, true);
		window.removeEventListener("mousedown", onMenuOutsideClick, true);
		focusEvts.forEach((evt) => window.removeEventListener(evt, shieldFocus, true));
		keyEvts.forEach((evt) => window.removeEventListener(evt, shieldKey, true));
		window.removeEventListener("keydown", onHoverKey, true);
	};
	_panelCleanup = cleanupPanelObservers;

	const closePanel = () => {
		destroyPanel();
		setZoom();
	};

	btnX.addEventListener("click", closePanel);
	shadowRoot.getElementById("zd-btn-close").addEventListener("click", closePanel);

	shadowRoot.getElementById("zd-btn-reset").addEventListener("click", () => {
		if (_singleImgPage && _zoom_ivpDrag) {
			const nimg = document.querySelector(`.${_imgSrcViewCls}`);
			if (nimg) {
				setZoom(nimg, null, true);
				els.zSl.value = els.zNum.value = 100;
				els.rSl.value = els.rNum.value = 0;
				els.oSl.value = els.oNum.value = 100;
				els.bSl.value = els.bNum.value = 100;

				unpinImage(nimg);
				nimg.classList.remove(_draggedCls);
				restoreFilterAndOpacity(nimg);
				setElData(nimg, _flipXkey, 1);
				setElData(nimg, _flipYkey, 1);
				imgRotate(0, nimg);
				setImageRect(null, nimg);
				removePanelBorder();
				setZoom();
				setZoom(nimg, null, true);
				syncPanelValues();
				applyPanelBorder();
				return;
			}
		}

		if (!_img_element) {
			const target = findNextModifiedImage(null);
			if (target) setZoom(target, null, true);
		}
		if (!_img_element) return;

		const bData = getElData(_img_element, _firstkey);
		if (!bData) return;

		if (rafId) cancelAnimationFrame(rafId);

		const currentImg = _img_element;
		const finalImg = getElData(currentImg, _srckey) || currentImg;
		const floatGalleryRoot = getElData(currentImg, _galleryRootkey) || findGalleryRoot(finalImg) || currentGalleryRoot;
		const floatSwapSlot = getElData(currentImg, _swapSlotkey) || findSwapSlotContainer(finalImg) || currentSwapSlot;

		enableAnim(currentImg);
		currentImg.classList.remove(_draggedCls);
		restoreElementZIndex(currentImg);
		restoreFilterAndOpacity(currentImg);

		setElData(currentImg, _flipXkey, 1);
		setElData(currentImg, _flipYkey, 1);

		const src_elem = getElData(currentImg, _srckey);
		let sourceFullyReset = false;
		if (src_elem) {
			imgRotate(0, currentImg);
			_zdSuppressBadge = true;
			sourceFullyReset = clearImgEx(src_elem);
			_zdSuppressBadge = false;
			_modifiedElements.delete(src_elem);
		}

		if (!sourceFullyReset) {
			setImageRect(null, finalImg);
			imgRotate(0, finalImg);
		}

		_img_element = finalImg;
		_current_element = finalImg;
		removePanelBorder();

		_modifiedElements.delete(currentImg);
		_modifiedElements.delete(finalImg);
		elementDataMap.delete(currentImg);
		elementDataMap.delete(finalImg);
		finalImg.classList.remove(_draggedCls);

		const onTransitionEnd = (e) => {
			e.target.removeEventListener("transitionend", onTransitionEnd);
			disableAnim(e.target);
		};
		finalImg.addEventListener("transitionend", onTransitionEnd);

		const isFinalVisible = !sourceFullyReset && isImageShownInViewport(finalImg, true);
		_lastResetElement = isFinalVisible ? finalImg : null;
		const nextTarget = findNextModifiedImage(finalImg);

		if (nextTarget) {
			unlockContainers(finalImg);
			attachEvent(nextTarget);
			setZoom(nextTarget, null, true);
			syncPanelValues();
			applyPanelBorder();
		} else if (isFinalVisible) {
			unlockContainers(finalImg);
			attachEvent(finalImg);
			setZoom(finalImg, null, true);
			_modifiedElements.delete(finalImg);
			const freshData = getElData(finalImg, _firstkey) || bData;
			syncPanelValues();

			els.zSl.value = els.zNum.value = 100;
			els.wSl.value = els.wNum.value = Math.round(freshData.sw);
			els.rSl.value = els.rNum.value = 0;
			els.oSl.value = els.oNum.value = 100;
			els.bSl.value = els.bNum.value = 100;

			[els.zSl, els.wSl, els.rSl, els.oSl, els.bSl].forEach((slider) => {
				if (slider) updateSliderFill(slider);
			});

			if (btnFlipH && btnFlipV) {
				btnFlipH.style.background = "var(--bg-btn-neutral)";
				btnFlipH.style.color = "var(--text-btn-neutral)";
				btnFlipV.style.background = "var(--bg-btn-neutral)";
				btnFlipV.style.color = "var(--text-btn-neutral)";
			}
			updateEffectButtons(shadowRoot);

			applyPanelBorder();
		} else if (rebindPanelOrActiveGalleryImg(finalImg, floatGalleryRoot, floatSwapSlot)) {
			unlockContainers(finalImg);
			_lastResetElement = _img_element;
			applyPanelBorder();
		} else {
			closePanel();
		}
	});

	const showPanelToast = (message, isNotice = false, isSuccess = false) => {
		const oldToast = shadowRoot.getElementById("zd-toast");
		if (oldToast) oldToast.remove();

		const toast = document.createElement("div");
		toast.id = "zd-toast";
		toast.setAttribute("role", "status");
		toast.textContent = message;
		const toastColors = isSuccess
			? "background: #6ea885; color: #fff;"
			: isNotice
				? "background: #f5a623; color: #1a1a1a;"
				: "background: #e63946; color: #fff;";
		toast.style.cssText = `margin: 0 20px 16px 20px; padding: 10px 12px; border-radius: 6px; font-size: 12px; line-height: 1.4; ${toastColors} white-space: pre-line; word-break: break-word; width: 0; min-width: calc(100% - 40px); box-sizing: border-box;`;
		shadowRoot.appendChild(toast);
		setTimeout(() => toast.remove(), isSuccess ? _toastSuccessDurationMs : _toastDurationMs);
	};

	const exportErrorMsg = () =>
		t(
			"panel_cors_error",
			"Could not save image.\n\nReason: The source server blocks exporting due to security policies (CORS)."
		);

	const exportTooLargeMsg = () =>
		t(
			"panel_export_source_too_large",
			"Could not save image.\n\nReason: The source server blocks exporting (CORS) and the image file is too large for the fallback download."
		);

	const loadImage = (url, useCors) =>
		new Promise((resolve, reject) => {
			const img = new Image();
			if (useCors) img.crossOrigin = "anonymous";
			img.onload = () => resolve(img);
			img.onerror = reject;
			img.src = url;
		});

	const loadExportSource = (url, isDerived = false) =>
		loadImage(url, true).catch((err) => {
			d("Image Load CORS fallback", err, "warn");
			return browser.runtime.sendMessage({ id: "fetch-image", url, derived: isDerived }).then((res) => {
				if (!res || !res.ok) {
					const fetchErr = new Error(res?.error || "fetch-image failed");
					fetchErr.code = res?.code;
					throw fetchErr;
				}
				return loadImage(res.dataUrl, false);
			});
		});

	const renderExportBlob = (format) =>
		new Promise((resolve, reject) => {
			if (!_img_element) {
				const target = getActiveImageTarget(false);
				if (target) setZoom(target, null, true);
			}

			const bData = _img_element ? getElData(_img_element, _firstkey) : null;
			if (!bData) {
				reject(Object.assign(new Error("No image selected"), { code: "no-target" }));
				return;
			}

			const fmt = _exportFormats[format] || _exportFormats.png;
			const targetW = Math.max(20, parseFloat(els.wNum.value));
			const targetH = getObjectFitHeight(_img_element, targetW, bData);

			const rot = parseInt(els.rNum.value, 10) || 0;
			const opac = parseInt(els.oNum.value, 10) || 100;
			const bright = parseInt(els.bNum.value, 10) || 100;
			const flipX = getElData(_img_element, _flipXkey) || 1;
			const flipY = getElData(_img_element, _flipYkey) || 1;
			const baseFilter = getBaseFilter(_img_element);
			const baseOpacity = getBaseOpacity(_img_element);
			const effectsFilter = getExportEffectsFilter(_img_element);
			const smoothing = !isPixelMode(_img_element);
			const fitStyle = window.getComputedStyle(_img_element);
			const fitMode = fitStyle.objectFit || "fill";
			const fitPos = fitStyle.objectPosition || "50% 50%";

			const rad = (rot * Math.PI) / 180;
			const cosA = Math.abs(Math.cos(rad));
			const sinA = Math.abs(Math.sin(rad));
			const canvasW = targetW * cosA + targetH * sinA;
			const canvasH = targetW * sinA + targetH * cosA;

			const exportScale = Math.min(
				1,
				_maxExportSide / Math.max(canvasW, canvasH),
				Math.sqrt(_maxExportPixels / (canvasW * canvasH))
			);

			const canvas = document.createElement("canvas");
			canvas.width = Math.max(1, canvasW * exportScale);
			canvas.height = Math.max(1, canvasH * exportScale);
			const ctx = canvas.getContext("2d");

			const srcImg = getElData(_img_element, _srckey) || _img_element;
			const bgUrl = getElData(srcImg, _bgsrckey);
			const originalUrl = bgUrl || srcImg.currentSrc || srcImg.src;
			const upgradedSrcsetUrl =
				!bgUrl &&
				_srcsetState.get(_img_element)?.upgraded &&
				_img_element.currentSrc &&
				_img_element.currentSrc !== originalUrl
					? _img_element.currentSrc
					: "";
			const hiResUrl = _img_element.getAttribute(_hiResAttr) || upgradedSrcsetUrl;
			let hiResFailed = false;

			const drawToBlob = (source) =>
				new Promise((done, fail) => {
					try {
						ctx.setTransform(1, 0, 0, 1, 0, 0);
						ctx.clearRect(0, 0, canvas.width, canvas.height);
						if (fmt.mime === "image/jpeg") {
							ctx.fillStyle = "#ffffff";
							ctx.fillRect(0, 0, canvas.width, canvas.height);
						}
						ctx.imageSmoothingEnabled = smoothing;
						ctx.filter = `${getExportFilter(baseFilter, exportScale)} brightness(${bright}%) ${effectsFilter}`.trim();
						ctx.globalAlpha = (baseOpacity * opac) / 100;

						ctx.translate((canvasW * exportScale) / 2, (canvasH * exportScale) / 2);
						ctx.scale(exportScale, exportScale);
						ctx.rotate(rad);
						ctx.scale(flipX, flipY);
						const natW = source.naturalWidth || source.width;
						const natH = source.naturalHeight || source.height;
						const crop = getCoverCropRect(fitMode, fitPos, natW, natH, targetW, targetH);
						if (crop) {
							const { sx, sy, sw, sh } = crop;
							ctx.drawImage(source, sx, sy, sw, sh, -targetW / 2, -targetH / 2, targetW, targetH);
						} else {
							ctx.drawImage(source, -targetW / 2, -targetH / 2, targetW, targetH);
						}

						canvas.toBlob(
							(blob) => (blob ? done(blob) : fail(new Error("Canvas export returned no data"))),
							fmt.mime,
							fmt.mime === "image/png" ? undefined : 0.92
						);
					} catch (err) {
						console.error("Canvas Export Error (CORS/DataURL):", err);
						fail(err);
					}
				});

			const finish = (blob) => resolve({ blob, scale: exportScale, hiResFailed });

			if (!bgUrl && srcImg.tagName?.toUpperCase() === "CANVAS") {
				drawToBlob(srcImg).then(finish).catch(reject);
				return;
			}

			const loadSource = hiResUrl
				? loadExportSource(hiResUrl, true).catch(() => {
						hiResFailed = true;
						return loadExportSource(originalUrl);
					})
				: loadExportSource(originalUrl);

			loadSource.then(drawToBlob).then(finish).catch(reject);
		});

	const reportExportError = (err) => {
		if (err?.code === "no-target") return;
		console.error("Image Fallback Error:", err);
		showPanelToast(err?.code === _fetchErrTooLarge ? exportTooLargeMsg() : exportErrorMsg());
	};

	const getExportNotices = (scale, hiResFailed) => {
		const notices = [];
		if (scale < 1) {
			notices.push(
				t(
					"panel_export_downscaled",
					"Image was saved at a reduced size.\n\nReason: The requested size exceeds the maximum export limit."
				)
			);
		}
		if (hiResFailed) {
			notices.push(
				t(
					"panel_export_hires_fallback",
					"The larger image file could not be exported (server restrictions). The displayed original was used instead."
				)
			);
		}
		return notices;
	};

	const saveBlob = (blob, scale, hiResFailed) => {
		const ext = Object.values(_exportFormats).find((f) => f.mime === blob.type)?.ext || "png";
		const now = new Date();
		const pad = (n) => String(n).padStart(2, "0");
		const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
		const blobUrl = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.dataset.zdIgnoreClick = "true";
		link.download = `zoom_drag_export_${timestamp}.${ext}`;
		link.href = blobUrl;
		link.rel = "noopener";
		link.style.display = "none";

		link.addEventListener(
			"click",
			(evt) => {
				evt.stopPropagation();
				evt.stopImmediatePropagation();
			},
			true
		);

		shadowRoot.appendChild(link);
		link.click();
		link.remove();
		setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

		const notices = getExportNotices(scale, hiResFailed);
		if (notices.length) showPanelToast(notices.join("\n\n"), true);
	};

	const canCopyImage = typeof ClipboardItem !== "undefined" && Boolean(navigator.clipboard?.write);

	const copyImage = () => {
		const rendered = renderExportBlob("png");
		let renderError = null;
		rendered.catch((err) => {
			renderError = err;
		});

		const blobPromise = rendered.then(({ blob }) => blob);
		blobPromise.catch(() => {});

		let writePromise;
		try {
			writePromise = navigator.clipboard.write([new ClipboardItem({ "image/png": blobPromise })]);
		} catch (err) {
			writePromise = blobPromise.then((blob) => navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]));
		}

		writePromise
			.then(() => rendered)
			.then(({ scale, hiResFailed }) => {
				const notices = getExportNotices(scale, hiResFailed);
				if (notices.length) showPanelToast(notices.join("\n\n"), true);
				else showPanelToast(t("panel_copy_ok", "Image copied to clipboard."), false, true);
			})
			.catch((err) => {
				if (renderError) {
					reportExportError(renderError);
					return;
				}
				console.error("Clipboard Error:", err);
				showPanelToast(
					t(
						"panel_copy_failed",
						"Could not copy the image.\n\nReason: The browser blocked clipboard access here. Try saving the image instead."
					)
				);
			});
	};

	const splitEl = shadowRoot.getElementById("zd-split-save");
	const menuEl = shadowRoot.getElementById("zd-save-menu");
	const menuBtn = shadowRoot.getElementById("zd-btn-save-menu");
	const fmtLabel = shadowRoot.getElementById("zd-fmt-label");
	const copyItem = shadowRoot.getElementById("zd-btn-copy");
	const fmtItems = [...menuEl.querySelectorAll("[data-format]")];
	let exportFormat = "png";

	const refreshFormatUi = () => {
		const active = fmtItems.find((item) => item.dataset.format === exportFormat) || fmtItems[0];
		fmtLabel.textContent = active.textContent;
		fmtItems.forEach((item) => item.setAttribute("aria-checked", String(item === active)));
	};

	const closeMenu = (refocus = false) => {
		if (menuEl.hidden) return;
		menuEl.hidden = true;
		menuBtn.setAttribute("aria-expanded", "false");
		if (refocus) menuBtn.focus();
	};

	const openMenu = (viaKeyboard) => {
		menuEl.hidden = false;
		menuBtn.setAttribute("aria-expanded", "true");
		if (!viaKeyboard) {
			menuEl.focus({ preventScroll: true });
			return;
		}
		const active = fmtItems.find((item) => item.dataset.format === exportFormat) || fmtItems[0];
		active.focus();
	};

	const onMenuOutsideClick = (e) => {
		if (!e.composedPath().includes(panel)) closeMenu();
	};
	window.addEventListener("mousedown", onMenuOutsideClick, true);
	shadowRoot.addEventListener(
		"mousedown",
		(e) => {
			if (!e.composedPath().includes(splitEl)) closeMenu();
		},
		true
	);

	menuBtn.addEventListener("click", (e) => (menuEl.hidden ? openMenu(e.detail === 0) : closeMenu(e.detail === 0)));

	fmtItems.forEach((item) => {
		item.addEventListener("click", (e) => {
			exportFormat = item.dataset.format;
			refreshFormatUi();
			closeMenu(e.detail === 0);
			browser.storage.local.set({ panelPrefs: { exportFormat } }).catch(() => {});
		});
	});

	if (canCopyImage) {
		copyItem.addEventListener("click", (e) => {
			closeMenu(e.detail === 0);
			copyImage();
		});
	} else {
		copyItem.disabled = true;
	}

	browser.storage.local
		.get("panelPrefs")
		.then((data) => {
			const saved = data?.panelPrefs?.exportFormat;
			if (_exportFormats[saved]) {
				exportFormat = saved;
				refreshFormatUi();
			}
		})
		.catch(() => {});

	shadowRoot.getElementById("zd-btn-save").addEventListener("click", () => {
		renderExportBlob(exportFormat)
			.then(({ blob, scale, hiResFailed }) => saveBlob(blob, scale, hiResFailed))
			.catch(reportExportError);
	});

	[els.zSl, els.wSl, els.rSl, els.oSl, els.bSl].forEach((slider) => {
		if (slider) updateSliderFill(slider);
	});

	if (!getElData(_img_element, _srckey)) {
		applyPanelBorder();
	}

	let gallerySwitchWaitSince = 0;
	let sliderGraceStart = 0;
	let floatGoneSince = 0;

	const hasReplacementImg = () => {
		if (!initialSrc || !initialOrigRect) return false;
		const ref = docRectToViewportRect(initialOrigRect);
		return Array.from(document.getElementsByTagName("img")).some(
			(img) =>
				img !== _img_element &&
				!getElData(img, _srckey) &&
				getStableImgId(img) === initialSrc &&
				rectsOverlap(img.getBoundingClientRect(), ref)
		);
	};

	const normalizeImgId = (id) => (id ? id.split(/\s+/)[0].split("?")[0] : "");

	const findReplacementGalleryRoot = () => {
		if (!initialOrigRect) return null;
		const ref = docRectToViewportRect(initialOrigRect);
		const cx = ref.left + ref.width / 2;
		const cy = ref.top + ref.height / 2;
		const baseSrc = normalizeImgId(initialSrc);
		const winW = window.innerWidth || document.documentElement.clientWidth;
		const winH = window.innerHeight || document.documentElement.clientHeight;

		let bestWithSrc = null;
		let bestWithSrcArea = Infinity;
		let bestOverlap = null;
		let bestOverlapArea = Infinity;
		let bestVisible = null;
		let bestVisibleArea = 0;

		for (const root of document.querySelectorAll(_galleryRootSel)) {
			if (!isGalleryRootShown(root)) continue;
			const r = root.getBoundingClientRect();
			if (r.width < 40 || r.height < 40) continue;

			const imgs = Array.from(root.getElementsByTagName("img")).filter(
				(img) =>
					!getElData(img, _srckey) &&
					!isOwnElement(img) &&
					img.getAttribute("data-testid") !== "cdp-medias-preview-print-image"
			);
			if (imgs.length === 0) continue;

			const area = r.width * r.height;
			const hasMatchingSrc =
				Boolean(initialSrc) &&
				imgs.some((img) => {
					const candId = getStableImgId(img);
					return candId === initialSrc || (baseSrc && normalizeImgId(candId) === baseSrc);
				});

			if (hasMatchingSrc && area < bestWithSrcArea) {
				bestWithSrc = root;
				bestWithSrcArea = area;
			}

			const containsCenter = cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
			const xOverlap = Math.max(0, Math.min(r.right, ref.right) - Math.max(r.left, ref.left));
			const yOverlap = Math.max(0, Math.min(r.bottom, ref.bottom) - Math.max(r.top, ref.top));
			const hasAnyOverlap = xOverlap > 20 && yOverlap > 20;

			if ((containsCenter || rectsOverlap(r, ref) || hasAnyOverlap) && area < bestOverlapArea) {
				bestOverlap = root;
				bestOverlapArea = area;
			}

			const inViewport = r.right > 40 && r.left < winW - 40 && r.bottom > 40 && r.top < winH - 40;
			if (inViewport && findActiveGalleryImage(root, null) && area > bestVisibleArea) {
				bestVisible = root;
				bestVisibleArea = area;
			}
		}
		return bestWithSrc || bestOverlap || bestVisible;
	};

	panelCheckInterval = setInterval(() => {
		if (!panel.isConnected) {
			cleanupPanelObservers();
			return;
		}

		removeOrphanedFloats(_img_element);

		const originalImg = _img_element ? getElData(_img_element, _srckey) || _img_element : null;
		const isFloating = Boolean(_img_element && getElData(_img_element, _srckey));
		const wasHandOffAdopted = _handOffAdopted;
		if (_handOffAdopted) {
			_handOffAdopted = false;
			floatGoneSince = 0;
			currentGalleryRoot = originalImg ? findGalleryRoot(originalImg) : null;
			currentOuterRoot = originalImg ? findOuterGalleryRoot(originalImg) : null;
			currentFixedOverlay = originalImg ? findFixedOverlayRoot(originalImg) : null;
			currentSwapSlot = originalImg
				? (isFloating && getElData(_img_element, _swapSlotkey)) || findSwapSlotContainer(originalImg)
				: null;
			if (originalImg) {
				initialSrc = getStableImgId(originalImg);
				initialOrigRect = getDocRect(originalImg);
				initialPageKey = getPageKey();
			}
		}
		if (originalImg && _img_element !== currentlyObservedImg) {
			currentGalleryRoot =
				(isFloating && getElData(_img_element, _galleryRootkey)) ||
				findGalleryRoot(originalImg) ||
				(originalImg.isConnected ? null : currentGalleryRoot);
			currentOuterRoot = findOuterGalleryRoot(originalImg);
			currentFixedOverlay = findFixedOverlayRoot(originalImg) || (originalImg.isConnected ? null : currentFixedOverlay);
		}
		const inHandOffGrace = performance.now() < _handOffGraceUntil;
		const hadGalleryContext = Boolean(currentGalleryRoot || (isFloating && getElData(_img_element, _galleryRootkey)));
		const fixedOverlayClosed = Boolean(currentFixedOverlay && !isFixedOverlayShown(currentFixedOverlay));
		const outerGone = Boolean(
			isFloating &&
				((currentOuterRoot && !(currentOuterRoot.isConnected && isGalleryRootShown(currentOuterRoot))) ||
					fixedOverlayClosed)
		);
		let gRoot = isFloating
			? getElData(_img_element, _galleryRootkey)
			: (originalImg && findGalleryRoot(originalImg)) || currentGalleryRoot;
		const needsReplacementRoot = !(gRoot && gRoot.isConnected) && !(isFloating && !hadGalleryContext) && !outerGone;
		const keepOwnInlineImg = Boolean(
			needsReplacementRoot &&
				!isFloating &&
				!hadGalleryContext &&
				originalImg &&
				originalImg.isConnected &&
				!isBlockedBySiteOverlay(originalImg)
		);
		if (needsReplacementRoot && !keepOwnInlineImg) {
			const replacementRoot = findReplacementGalleryRoot();
			if (replacementRoot) {
				gRoot = replacementRoot;
				if (isFloating) setElData(_img_element, _galleryRootkey, replacementRoot);
			}
		}
		if (gRoot && gRoot.isConnected) {
			currentGalleryRoot = gRoot;
			currentOuterRoot = findOuterGalleryRoot(gRoot) || gRoot;
		}
		const isInlineInGallery = Boolean(_img_element && !isFloating && ((gRoot && gRoot.isConnected) || hadGalleryContext));
		const activeGRoot = gRoot || currentGalleryRoot;
		const playerAnchorEl = originalImg?.isConnected ? originalImg : currentSwapSlot;
		const livePlayerRect =
			(currentSwapSlot?.isConnected && getNonZeroDocRect(currentSwapSlot)) ||
			(originalImg?.isConnected && !isElementModified(originalImg) && getNonZeroDocRect(originalImg)) ||
			initialOrigRect;
		const playerVideoStarted = Boolean(_img_element && hasStartedVideoOverDocRect(livePlayerRect, playerAnchorEl));
		const playerStarted = hasRecentPlayerStart(activeGRoot, livePlayerRect) || playerVideoStarted;
		const isPlayerTakeover = () =>
			playerVideoStarted || (!hasReplacementImg() && hasPlayerOverDocRect(livePlayerRect, activeGRoot, playerAnchorEl));
		const inGalleryGrace =
			(isFloating || isInlineInGallery) &&
			((gRoot && gRoot.isConnected) ||
				(hadGalleryContext && (!gallerySwitchWaitSince || performance.now() - gallerySwitchWaitSince < _gallerySwitchGraceMs)));
		const resolveByReplacementRoot = () => {
			const root = originalImg ? findReplacementGalleryRoot() : null;
			if (root && !composedContains(root, originalImg)) {
				const img = findActiveGalleryImage(root, originalImg);
				if (img) return img;
			}
			const ov = originalImg ? findCoveringOverlayForHandOff(originalImg) : null;
			return ov ? findActiveGalleryImage(ov, originalImg) : null;
		};
		const inNativeFullscreen = Boolean(document.fullscreenElement && !composedContains(document.fullscreenElement, panel));
		const galleryOpenedOver = Boolean(originalImg && isGalleryOpenedOver(originalImg));
		const coveringOverlay =
			!isFloating && !galleryOpenedOver && !inNativeFullscreen && originalImg && originalImg.isConnected
				? findCoveringOverlayForHandOff(originalImg)
				: null;
		const viewChanged = Boolean(_img_element) && (outerGone || galleryOpenedOver || (getPageKey() !== initialPageKey && !inGalleryGrace));
		let triggerReset = !_img_element || viewChanged || (!isFloating && fixedOverlayClosed) || playerStarted;
		let overlayHandOffFailed = false;
		if (
			!isFloating &&
			coveringOverlay &&
			!playerStarted &&
			!isPlayerTakeover()
		) {
			const res = handOffInlinePanel(
				originalImg,
				() => {
					const ov = findCoveringOverlayForHandOff(originalImg);
					return ov ? findActiveGalleryImage(ov, originalImg) : null;
				},
				0,
				true
			);
			if (res !== false) return;
			overlayHandOffFailed = true;
			triggerReset = true;
		}
		if (triggerReset && viewChanged && isFloating && (outerGone || galleryOpenedOver) && !playerStarted) {
			if (resetActiveFloatAndHandOff(resolveByReplacementRoot) !== false) return;
		}
		if (triggerReset && viewChanged && !isFloating && galleryOpenedOver && !playerStarted) {
			if (handOffInlinePanel(originalImg, resolveByReplacementRoot) !== false) return;
		}
		if (
			triggerReset &&
			viewChanged &&
			!isFloating &&
			!hadGalleryContext &&
			!galleryOpenedOver &&
			originalImg &&
			originalImg.isConnected &&
			!playerStarted
		) {
			if (shouldWaitForHandOff(originalImg)) return;
		}
		if (
			triggerReset &&
			viewChanged &&
			originalImg &&
			!playerStarted &&
			resetImagesOutsideGallery(true).handedOff
		) {
			return;
		}
		let switchAttempted = false;
		let floatCloseReason = "";
		let isHiddenInPlace = false;

		const trySwitchToNextGalleryImg = () => {
			if (!isInlineInGallery) return false;
			let searchRoot =
				gRoot && gRoot.isConnected
					? gRoot
					: (currentGalleryRoot && currentGalleryRoot.isConnected && currentGalleryRoot) || findReplacementGalleryRoot();
			if (!searchRoot) return false;

			let nextImg = findActiveGalleryImage(searchRoot, originalImg);
			if (!nextImg) {
				const altRoot = findReplacementGalleryRoot();
				if (altRoot && altRoot !== searchRoot) {
					searchRoot = altRoot;
					nextImg = findActiveGalleryImage(searchRoot, originalImg);
				}
			}
			if (!nextImg) return false;

			const origStillUsable =
				originalImg &&
				originalImg.isConnected &&
				!composedContains(searchRoot, originalImg) &&
				isImageShownInViewport(originalImg, true) &&
				!isBlockedBySiteOverlay(originalImg);
			if (origStillUsable) return false;

			if (originalImg && originalImg !== nextImg) {
				if (isElementModified(originalImg) || originalImg.hasAttribute("data-zd-pe-img")) {
					resetInlineElement(originalImg);
				} else {
					unlockContainers(originalImg);
					_modifiedElements.delete(originalImg);
					elementDataMap.delete(originalImg);
				}
			}

			attachEvent(nextImg);
			if (!rebindPanelImage(nextImg)) return false;
			currentlyObservedImg = nextImg;
			gRoot = currentGalleryRoot = findGalleryRoot(nextImg) || searchRoot;
			currentOuterRoot = findOuterGalleryRoot(nextImg);
			currentFixedOverlay = findFixedOverlayRoot(nextImg);
			frameSyncObserver.disconnect();
			frameResizeObserver.disconnect();
			observeImgAndAncestors(currentlyObservedImg);
			initialPageKey = getPageKey();
			initialSrc = getStableImgId(nextImg);
			initialOrigRect = getDocRect(nextImg);
			_lastSyncedRectStr = "";
			applyPanelBorder();
			triggerFrameTransitionSync(500);
			return true;
		};

		const adoptPanelSwapTarget = (nextImg) => {
			attachEvent(nextImg);
			if (!rebindPanelImage(nextImg)) return false;
			currentlyObservedImg = nextImg;
			currentGalleryRoot = findGalleryRoot(nextImg);
			currentOuterRoot = findOuterGalleryRoot(nextImg);
			currentFixedOverlay = findFixedOverlayRoot(nextImg);
			currentSwapSlot = findSwapSlotContainer(nextImg) || currentSwapSlot;
			frameSyncObserver.disconnect();
			frameResizeObserver.disconnect();
			observeImgAndAncestors(currentlyObservedImg);
			initialPageKey = getPageKey();
			initialSrc = getStableImgId(nextImg);
			initialOrigRect = getDocRect(nextImg);

			const activeFrame = document.getElementById("zd-panel-frame");
			if (panel.matches(":hover") || panelHasFocus() || (activeFrame && activeFrame.style.display !== "none")) {
				_lastSyncedRectStr = "";
				applyPanelBorder();
				triggerFrameTransitionSync(500);
			} else {
				removePanelBorder();
			}
			return true;
		};

		const trySwitchToSlotImg = () => {
			if (isFloating || !isSwapSlotAlive(currentSwapSlot)) return false;
			const nextImg = findSlotReplacementImage(currentSwapSlot, originalImg);
			if (!nextImg || nextImg === originalImg) return false;

			if (originalImg) {
				if (isElementModified(originalImg) || originalImg.hasAttribute("data-zd-pe-img")) {
					resetInlineElement(originalImg);
				} else {
					unlockContainers(originalImg);
					_modifiedElements.delete(originalImg);
					elementDataMap.delete(originalImg);
				}
			}
			return adoptPanelSwapTarget(nextImg);
		};

		const trySwitchToInPlaceImg = (switchedSrc) => {
			if (isFloating || !originalImg || !originalImg.isConnected || !switchedSrc) return false;
			if (originalImg.tagName === "IMG" && isPlaceholderImg(originalImg)) return false;
			if (originalImg.tagName !== "IMG" && !getElData(originalImg, _bgsrckey)) return false;
			if (!isImageShownInViewport(originalImg, true) || isBlockedBySiteOverlay(originalImg)) return false;

			if (getElData(originalImg, _bgsrckey)) {
				const origData = getElData(originalImg, _firstkey);
				if (origData?.origStyle && originalImg.style.backgroundImage !== "none") {
					origData.origStyle.backgroundImage = originalImg.style.backgroundImage;
				}
			}

			if (isElementModified(originalImg) || originalImg.hasAttribute("data-zd-pe-img")) {
				resetInlineElement(originalImg);
			} else {
				unlockContainers(originalImg);
				_modifiedElements.delete(originalImg);
				elementDataMap.delete(originalImg);
			}

			if (!adoptPanelSwapTarget(originalImg)) return false;
			gallerySwitchWaitSince = 0;
			sliderGraceStart = 0;
			return true;
		};

		const trySwitchOrWait = () => {
			if (isPlayerTakeover()) return false;
			switchAttempted = true;
			if (trySwitchToNextGalleryImg() || trySwitchToSlotImg()) {
				gallerySwitchWaitSince = 0;
				sliderGraceStart = 0;
				return true;
			}
			const canWaitInSlot = !isFloating && isSwapSlotAlive(currentSwapSlot);
			if (!canWaitInSlot && (!isInlineInGallery || (!isGalleryRootShown(gRoot) && !hadGalleryContext))) return false;

			const now = performance.now();
			if (!gallerySwitchWaitSince) {
				gallerySwitchWaitSince = now;
				sliderGraceStart = now;
				d("Switch wait", `grace=${_gallerySwitchGraceMs}ms`);
			}
			return now - gallerySwitchWaitSince < _gallerySwitchGraceMs;
		};

		if (_img_element && !triggerReset) {
			if (_img_element !== currentlyObservedImg) {
				_handOffWait.orig = null;
				sliderGraceStart = 0;
				floatGoneSince = 0;
				frameSyncObserver.disconnect();
				frameResizeObserver.disconnect();
				currentlyObservedImg = _img_element;
				currentGalleryRoot =
					(isFloating && getElData(_img_element, _galleryRootkey)) ||
					findGalleryRoot(originalImg) ||
					(originalImg && originalImg.isConnected ? null : currentGalleryRoot);
				currentOuterRoot = findOuterGalleryRoot(originalImg);
				currentFixedOverlay = findFixedOverlayRoot(originalImg) || (originalImg && originalImg.isConnected ? null : currentFixedOverlay);
				currentSwapSlot =
					(isFloating && getElData(_img_element, _swapSlotkey)) ||
					findSwapSlotContainer(originalImg) ||
					(originalImg && originalImg.isConnected ? null : currentSwapSlot);
				initialPageKey = getPageKey();
				initialSrc = getStableImgId(originalImg);
				initialOrigRect = getDocRect(originalImg);

				observeImgAndAncestors(currentlyObservedImg);

				const activeFrame = document.getElementById("zd-panel-frame");
				if (wasHandOffAdopted || panel.matches(":hover") || panelHasFocus() || (activeFrame && activeFrame.style.display !== "none")) {
					_lastSyncedRectStr = "";
					applyPanelBorder();
					triggerFrameTransitionSync(500);
				} else {
					removePanelBorder();
				}
			}

			if (!isFloating) floatGoneSince = 0;

			if (isFloating) {
				const currentGRoot = getElData(_img_element, _galleryRootkey);
				const isSourceGoneNow =
					!inHandOffGrace &&
					!hadGalleryContext &&
					isFloatSourceGone(originalImg) &&
					!isSwapSlotAlive(currentSwapSlot);
				if (!isSourceGoneNow) floatGoneSince = 0;

				if (!_img_element.isConnected) floatCloseReason = "floatDetached";
				else if (!originalImg.isConnected && isPlayerTakeover()) floatCloseReason = "playerTakeover";
				else if (isCoveredByStartedPlayer(originalImg, livePlayerRect)) floatCloseReason = "playerCovered";
				else if (!inHandOffGrace && currentGRoot && !isGalleryRootShown(currentGRoot)) floatCloseReason = "rootHidden";
				else if (isSourceGoneNow) {
					const now = performance.now();
					if (!floatGoneSince) floatGoneSince = now;
					else if (now - floatGoneSince >= _gallerySwitchGraceMs) floatCloseReason = "sourceGone";
				} else if (
					!inHandOffGrace &&
					!currentGRoot &&
					isSameDocRect(initialOrigRect, getDocRect(originalImg)) &&
					isImageShownInViewport(originalImg) &&
					isBlockedBySiteOverlay(originalImg)
				) {
					floatCloseReason = "siteOverlay";
				}
				if (floatCloseReason) triggerReset = true;
			} else if (!originalImg.isConnected) {
				floatGoneSince = 0;
				if (!trySwitchOrWait()) {
					triggerReset = true;
				}
			} else {
				const rect = originalImg.getBoundingClientRect();
				let isHiddenBySlider = false;

				const winW = window.innerWidth || document.documentElement.clientWidth;
				const winH = window.innerHeight || document.documentElement.clientHeight;

				const minVisiblePx = 20;
				const overlapsViewport =
					rect.right > minVisiblePx &&
					rect.left < winW - minVisiblePx &&
					rect.bottom > minVisiblePx &&
					rect.top < winH - minVisiblePx;
				if (!overlapsViewport) isHiddenBySlider = true;

				const origStyle = window.getComputedStyle(originalImg);
				if (origStyle.display === "none" || rect.width === 0 || rect.height === 0) {
					isHiddenBySlider = true;
					isHiddenInPlace = true;
				}

				const inLockedCard = Boolean(originalImg.closest("[data-zd-card-lock]"));
				const hasActivePreview =
					!inLockedCard &&
					Boolean(
						originalImg.closest("ytd-thumbnail, yt-thumbnail-view-model") ||
							findPreviewVideos(rect.left + rect.width / 2, rect.top + rect.height / 2).length > 0
					);
				if (!inLockedCard && !hasActivePreview && origStyle.visibility === "hidden") {
					isHiddenBySlider = true;
					isHiddenInPlace = true;
				}
				if (
					!isHiddenBySlider &&
					(isBlockedBySiteOverlay(originalImg) ||
						isInactiveImageTarget(originalImg) ||
						(!inLockedCard && !hasActivePreview && !isActiveGallerySlide(originalImg) && !isImageShownInViewport(originalImg, true)))
				) {
					isHiddenBySlider = true;
				}
				if (
					!isHiddenBySlider &&
					isInlineInGallery &&
					isElementModified(originalImg) &&
					(isInlineImageSlidAway(originalImg) || (composedContains(gRoot, originalImg) && isInlineImageSupersededInGallery(originalImg, gRoot)))
				) {
					isHiddenBySlider = true;
				}

				let pNode = composedParent(originalImg);
				while (pNode && pNode !== document.body && pNode !== document.documentElement && !isHiddenBySlider) {
					if (pNode.nodeType !== 1) {
						pNode = composedParent(pNode);
						continue;
					}
					const pStyle = window.getComputedStyle(pNode);
					if (
						pStyle.display === "none" ||
						(pNode.getAttribute("aria-hidden") === "true" &&
							!pNode.matches(_clickHostSel) &&
							(!originalImg.closest(_clickHostSel) || pNode.hasAttribute("inert") || pNode.classList.contains("slide")))
					) {
						isHiddenBySlider = true;
						isHiddenInPlace = true;
						break;
					}
					if (!inLockedCard && !hasActivePreview && parseFloat(pStyle.opacity) < 0.01) {
						isHiddenBySlider = true;
						isHiddenInPlace = true;
						break;
					}
					if (
						pStyle.overflow === "hidden" ||
						pStyle.overflow === "scroll" ||
						pStyle.overflow === "auto" ||
						pStyle.overflow === "clip" ||
						pStyle.overflowX === "hidden" ||
						pStyle.overflowX === "clip"
					) {
						const pRect = pNode.getBoundingClientRect();
						if (pRect.width > 0 && pRect.height > 0) {
							const overlapsParent =
								rect.right > pRect.left + 4 &&
								rect.left < pRect.right - 4 &&
								rect.bottom > pRect.top + 4 &&
								rect.top < pRect.bottom - 4;
							if (!overlapsParent) {
								isHiddenBySlider = true;
								break;
							}
						}
					}
					pNode = composedParent(pNode);
				}

				if (isHiddenBySlider) {
					if (!trySwitchOrWait()) {
						triggerReset = true;
					}
				} else if (initialSrc && getStableImgId(originalImg) !== initialSrc) {
					const switchedSrc = getStableImgId(originalImg);
					if (isOwnSrcSwitch(originalImg, initialSrc, switchedSrc)) {
						initialSrc = switchedSrc;
					} else if (!trySwitchToInPlaceImg(switchedSrc) && !trySwitchOrWait()) {
						triggerReset = true;
					}
				}
			}
		}

		if (!switchAttempted) gallerySwitchWaitSince = 0;

		const isStaleBesideVideo = Boolean(_img_element && isInlineInGallery && originalImg && isStaleNextToPosterlessSlideVideo(originalImg, activeGRoot));
		if (isStaleBesideVideo) triggerReset = true;

		if (triggerReset) {
			const canHandOff =
				!isStaleBesideVideo &&
				!overlayHandOffFailed &&
				!inNativeFullscreen &&
				Boolean(_img_element && originalImg) &&
				!playerStarted &&
				floatCloseReason !== "playerTakeover" &&
				floatCloseReason !== "playerCovered";
			if (canHandOff && !isFloating && (isInlineInGallery || fixedOverlayClosed)) {
				const graceStart =
					sliderGraceStart && performance.now() - sliderGraceStart < _gallerySwitchGraceMs * _gallerySwitchGraceStaleFactor
						? sliderGraceStart
						: 0;
				if (handOffInlinePanel(originalImg, resolveByReplacementRoot, graceStart) !== false) return;
			}
			if (
				canHandOff &&
				!isFloating &&
				!isInlineInGallery &&
				!fixedOverlayClosed &&
				!viewChanged &&
				(!originalImg.isConnected || isHiddenInPlace)
			) {
				const sameFallback = () => findVisibleFallbackImages(originalImg).same;
				if (handOffInlinePanel(originalImg, sameFallback, 0, true) !== false) return;
			}
			if (canHandOff && isFloating && !viewChanged) {
				if (resetActiveFloatAndHandOff(resolveByReplacementRoot) !== false) return;
			}
			d(
				"Panel auto-close",
				`img=${Boolean(_img_element)} floating=${isFloating} inGallery=${isInlineInGallery} reason=${floatCloseReason || (playerStarted ? "playerStarted" : viewChanged ? "viewChanged" : "other")}`,
				"warn"
			);
			restoreOriginalDOM(false);
			closePanel();
			_hoverTarget = null;
			_current_element = null;
			_img_element = null;
			setZoom();
		} else {
			_handOffWait.orig = null;
		}
	}, 200);
}

function ctxRotation(rot) {
	if (_current_element) {
		setZoom(_current_element, null, true);
		if (_img_element) {
			rotateWithAnim(_img_element, rot);
			showZoomBadge();
		}
		if (!_singleImgPage) setZoom(null, null, false, true);
	}
}

function ctxFit() {
	if (_current_element) {
		setZoom(_current_element, null, true);
		sizeFit();
		if (!_singleImgPage) setZoom(null, null, false, true);
	}
}

function attachEvent(elem, imgObj) {
	if (_isExcludedHost || !elem || _attachedElements.has(elem)) return;
	_attachedElements.add(elem);
	d("Attach Event", "");

	const targetToCheck = imgObj || elem;

	elem.addEventListener("click", (e) => {
		if (_isExcludedHost || elem.dataset?.zdIgnoreClick === "true" || isLockedOriginal(targetToCheck) || isBgTargetBlocked(targetToCheck)) return;

		if (_cancelNextClick) {
			_cancelNextClick = false;
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();
			return false;
		}

		if (!_rightBtnDown && _draggingCnt < 8 && forwardPassThroughClick(e, elem)) {
			_draggingCnt = 0;
			return;
		}

		let jdg = true;
		if (_rightBtnDown) {
			jdg = _clickFunc() && _draggingCnt < 8;
		}
		_draggingCnt = 0;

		const isInlineModified =
			!getElData(elem, _srckey) &&
			Boolean(getElData(elem, _firstkey) && getElData(elem, _sizekey)) &&
			isElementModified(elem);

		if (
			!jdg ||
			elem.classList.contains(_zdImgCls) ||
			(isInlineModified && !(isPassThroughClick(e) && hasPassThroughHost(e)))
		) {
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();
		}
	});

	elem.addEventListener("auxclick", (e) => {
		if (_isExcludedHost || isLockedOriginal(targetToCheck) || isBgTargetBlocked(targetToCheck)) return;

		if (!_rightBtnDown && _draggingCnt < 8 && forwardPassThroughClick(e, elem)) {
			_draggingCnt = 0;
			return;
		}

		if (e.button === 1 && (_rightBtnDown || elem.classList.contains(_imgSrcViewCls))) {
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();
		}
	});

	elem.addEventListener("mousedown", function (e) {
		if (_isExcludedHost || isLockedOriginal(targetToCheck) || isBgTargetBlocked(targetToCheck)) return;

		const isAlt = e.altKey || _accKeyState.alt;
		const isCtrl = e.ctrlKey || _accKeyState.ctrl;
		const activeTarget = imgObj || this;

		if (isAlt && ((e.button === 0 && (_rightBtnDown || e.buttons & 2)) || (e.button === 2 && e.buttons & 1))) {
			_ctx_show = false;
			if (isCtrl) startQuickZoom(e, activeTarget);
			else startRotation(e, activeTarget);
			e.preventDefault();
			e.stopPropagation();
			return;
		}

		if (e.button === 2) {
			_rightBtnDown = true;
			if (_zoom_showZoomBadge) {
				_rclickHoldTimer = setTimeout(() => {
					_ctx_show = false;
				}, 600);
			}

			if (getPanelHost()) _current_element = activeTarget;
			else setZoom(activeTarget, null, true);
		} else if (e.button === 0) {
			const isDraggable =
				this.classList.contains(_zdImgCls) ||
				(this.classList.contains(_imgSrcViewCls) && this.style.cursor === "grab");

			if (isDraggable && !_rightBtnDown) {
				if (_img_element !== this) setZoom(this, null, true);

				ensureElevatedZIndex(this);
				touchModified(this);

				if (getPanelHost()) {
					syncPanelValues();
					applyPanelBorder();
				}

				const rawLeft = parseFloat(this.style.left);
				const rawTop = parseFloat(this.style.top);
				const ofs = {
					left: isNaN(rawLeft) ? getOffset(this).left : rawLeft,
					top: isNaN(rawTop) ? getOffset(this).top : rawTop
				};

				disableAnim(this);
				lockContainers(getElData(this, _srckey) || this);
				const pointer = isPinned(this) ? { x: e.clientX, y: e.clientY } : { x: e.pageX, y: e.pageY };
				_dragParam = { obj: this, x: pointer.x - ofs.left, y: pointer.y - ofs.top };
				this.classList.add("zdImgCls_draggingCur");

				window.addEventListener("pointermove", onGlobalMouseMove, true);
				window.addEventListener("pointerup", onGlobalMouseUp, true);
				window.addEventListener("pointercancel", onGlobalMouseUp, true);
				d("Drag Start", "");

				e.preventDefault();
				e.stopPropagation();
			}
		} else if (e.button === 1 && (_rightBtnDown || this.classList.contains(_imgSrcViewCls))) {
			e.preventDefault();
			e.stopPropagation();
		}
	});

	elem.addEventListener("mouseup", function (e) {
		if (_isExcludedHost || isLockedOriginal(targetToCheck) || isBgTargetBlocked(targetToCheck)) return;

		this.classList.remove("zdImgCls_draggingCur");
		if (e.button === 1 && (_rightBtnDown || this.classList.contains(_imgSrcViewCls))) {
			_mdownFunc();
			e.preventDefault();
			e.stopPropagation();
		}
	});

	const resetCtx = () => {
		if (!_img_element && !_rightBtnDown) _ctx_show = true;
	};

	elem.addEventListener("mouseenter", resetCtx);
	elem.addEventListener("mouseleave", resetCtx);
	elem.addEventListener("blur", resetCtx);
}

function checkExImgWrapper() {
	_exImgCheckRafId = 0;
	const exImgWrapper = document.getElementById(_zdExImgId);
	if (!exImgWrapper) {
		stopExImgObserver();
		return;
	}

	const imgs = exImgWrapper.getElementsByTagName("img");
	if (imgs.length !== 0) {
		for (let i = imgs.length - 1; i >= 0; i--) {
			const img = imgs[i];
			const se = getElData(img, _srckey);
			if (!se) continue;

			const isPanelTarget = img === _img_element && Boolean(getPanelHost());
			const gRoot = getElData(img, _galleryRootkey);
			const swapSlot = getElData(img, _swapSlotkey);
			const origRect = getElData(img, _origRectkey);
			const playerTakeover =
				!isPanelTarget && (!se.isConnected || gRoot) && hasPlayerOverDocRect(origRect, gRoot, se.isConnected ? se : swapSlot);

			if (!se.isConnected || playerTakeover) {
				if (elementDataMap.has(se)) {
					const seData = getElData(se, _firstkey);
					resetInlineStyles(se, seData ? seData.origStyle : null, true);
					restoreFilterAndOpacity(se);
					restoreSelfVisibility(se);
					unlockContainers(se);
					_modifiedElements.delete(se);
					elementDataMap.delete(se);
				}

				if (isPanelTarget) continue;
				if ((isGalleryRootShown(gRoot) || isSwapSlotAlive(swapSlot)) && !playerTakeover) continue;

				destroyFloatFrame(img);
				const pnt = img.closest("a");
				if (pnt && pnt.parentNode === exImgWrapper) pnt.remove();
				else img.remove();

				_modifiedElements.delete(img);
				elementDataMap.delete(img);
				if (_img_element === img) setZoom();
			}
		}
	} else {
		exImgWrapper.remove();
		stopExImgObserver();
	}
}

function isOwnUiMutation(record) {
	const t = record.target;
	if (t && t.nodeType === 1 && isOwnElement(t) && t.id !== _zdExImgId) return true;
	const nodes = [...record.addedNodes, ...record.removedNodes];
	return nodes.length > 0 && nodes.every((n) => n.nodeType === 1 && isOwnElement(n) && n.id !== _zdExImgId);
}

function startExImgObserver() {
	if (_floatingMutationObserver || !document.body) return;

	_floatingMutationObserver = new MutationObserver((records) => {
		if (_exImgCheckRafId || records.every(isOwnUiMutation)) return;
		_exImgCheckRafId = requestAnimationFrame(checkExImgWrapper);
	});

	_floatingMutationObserver.observe(document.body, { childList: true, subtree: true });
}

function stopExImgObserver() {
	if (_exImgCheckRafId) {
		cancelAnimationFrame(_exImgCheckRafId);
		_exImgCheckRafId = 0;
	}
	if (_floatingMutationObserver) {
		_floatingMutationObserver.disconnect();
		_floatingMutationObserver = null;
	}
	for (const img of [..._floatFrames.keys()]) {
		destroyFloatFrame(img);
	}
	if (_floatFrameObserver) {
		_floatFrameObserver.disconnect();
		_floatFrameObserver = null;
	}
	_floatFrameObserved = null;
}

function imgDrag(x, y) {
	if (!_dragParam) return;

	if (getPanelHost() && _dragParam.obj && _img_element !== _dragParam.obj) {
		setZoom(_dragParam.obj, null, true);
		syncPanelValues();
	}

	const obj = _dragParam.obj;
	const scrollOfs = getScrollOffset(obj);
	obj.style.setProperty("left", `${scrollOfs.x + (x - _dragParam.x)}px`, "important");
	obj.style.setProperty("top", `${scrollOfs.y + (y - _dragParam.y)}px`, "important");
	if (isPinned(obj)) keepPinnedVisible(obj);

	if (!obj.classList.contains(_draggedCls) && _draggingCnt > 8) {
		obj.classList.add(_draggedCls);
	}
	_draggingCnt++;
}

function enableContextMenus(enable) {
	const desired = _zoom_enableCxt ? Boolean(enable) : false;
	browser.runtime.sendMessage({ id: "set-context", data: desired }).catch(() => {});
}

function checkSendGetSetting() {
	d("Load Setting", "");
	browser.storage.local
		.get("setting")
		.then((stored) => {
			if (stored && stored.setting) settingData(stored.setting);
		})
		.catch((error) => d("Load Setting failed", error, "error"));
}

let _booted = false;

function isTinyFrame() {
	return window !== window.top && (window.innerWidth <= 1 || window.innerHeight <= 1);
}

function boot() {
	if (_booted) return;
	_booted = true;

	browser.storage.onChanged.addListener((changes, area) => {
		if (area === "local" && changes.setting) {
			d("Storage changed, updating settings", changes.setting.newValue);
			settingData(changes.setting.newValue);
		}
	});

	browser.runtime.onMessage.addListener((msg) => {
		if (!msg || _isExcludedHost) return;

		_rightBtnDown = false;
		if (_img_element) setZoom();

		switch (msg.id) {
			case "zoom-custom":
				ctxZoomCustom();
				break;
			case "zoom-in":
				ctxZoom(true);
				break;
			case "zoom-out":
				ctxZoom(false);
				break;
			case "r90":
				ctxRotation(90);
				break;
			case "l90":
				ctxRotation(-90);
				break;
			case "180":
				ctxRotation(180);
				break;
			case "fit-win":
				windowFitting(true);
				break;
			case "fit":
				ctxFit();
				break;
			default:
				d("Message Listener", `Unknown command: ${msg.id}`, "warn");
				break;
		}
	});

	if (!_endInit) {
		if (document.readyState === "loading") {
			document.addEventListener("DOMContentLoaded", init, { once: true });
		} else {
			init();
		}
	}

	checkSendGetSetting();
	requestTopHost();

	if (window === window.top) {
		ZDShared.watchTheme();
	}
}

if (isTinyFrame()) {
	const onFrameResize = () => {
		if (isTinyFrame()) return;
		window.removeEventListener("resize", onFrameResize);
		boot();
	};
	window.addEventListener("resize", onFrameResize, { passive: true });
} else {
	boot();
}