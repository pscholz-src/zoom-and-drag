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

	const msg = "[ZoomDrag] " + t + ": " + v;

	if (level === "warn") {
		console.warn(msg);
	} else if (level === "error") {
		console.error(msg);
	} else {
		console.debug(msg);
	}
}

d("Log Start", "==========");

const _uqid = new Date().getTime().toString(16) + "_";
const _firstkey = _uqid + "first";
const _srckey = _uqid + "source";
const _sizekey = _uqid + "size";
const _rotkey = _uqid + "rotate";
const _bgsrckey = _uqid + "bgsrc";
const _flipXkey = _uqid + "flipX";
const _flipYkey = _uqid + "flipY";

const _zdExImgId = "zdImg_" + _uqid + "floatImgWraper";
const _zdImgCls = "zdImgCls_b6ig4jvwe";
const _draggedCls = "zdImgCls_dragged";
const _imgSrcViewCls = "zdImgCls_imgSrcView";
const _imgLinkCls = "zdImgCls_mhdt687po";
const _imgNoLinkCls = "zdImgCls_asntrs58f";

let _endInit = false;
let _img_element = null;
let _current_element = null;
let _ctx_show = true;
const _accKeyState = { ctrl: false, alt: false };
let _dragParam = null;
let _draggingCnt = 0;
let _rotParam = null;
let _zoomParam = null;
let _cancelNextClick = false;
let _clickFunc = null;
let _mdownFunc = null;
let _rclickCancelCnt = 0;
let _rclickTimer = null;

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
let _zoom_trackCursor = false;
let _hoverTarget = null;
let _lastMouseX = 0;
let _lastMouseY = 0;
let _zoom_excludedDomains = "";
let _isExcludedHost = false;
let _savedScrollPos = null;
let _zIndexCounter = 10;

const _zdPanelId = "zd-custom-panel";
const _maxExportSide = 16384;
const _maxExportPixels = 100000000;
let _blockWheelZoom = false;
let _blockNextEscKeyup = false;
let _zdSuppressBadge = false;
let _settingsLoaded = false;
let _panelShadow = null;
let _panelTemplate = null;
let _hoverRafId = 0;
let _hoverEventData = null;
let _panelFrameRafId = 0;

function getPanelHost() {
	return document.getElementById(_zdPanelId);
}

function getPanelShadow() {
	const host = getPanelHost();
	return host && _panelShadow && _panelShadow.host === host ? _panelShadow : null;
}

function panelHasFocus() {
	const shadow = getPanelShadow();
	return !!(shadow && shadow.activeElement);
}

function needsFloatingForNativeZoom(img) {
	const isFullscreen = img.classList.contains("fullscreen");
	if (((_singleImgPage && !_zoom_ivpDrag) || isFullscreen) && img.tagName === "IMG") {
		const winW = window.innerWidth;
		const winH = window.innerHeight;
		const isNativelyZoomed =
			window.getComputedStyle(img).cursor === "zoom-out" || img.clientWidth > winW || img.clientHeight > winH;
		return isNativelyZoomed || isFullscreen;
	}
	return false;
}

function normalizeRot(deg) {
	let d = deg % 360;
	if (d > 180) {
		d -= 360;
	}
	if (d < -180) {
		d += 360;
	}
	return d;
}

function enableAnim(el) {
	if (getPanelHost()) {
		disableAnim(el);
		return;
	}
	if (el && !el.classList.contains("zdImgCls_animated")) {
		el.classList.add("zdImgCls_animated");
	}
}

function disableAnim(el) {
	if (el) {
		el.classList.remove("zdImgCls_animated");
	}
}

const _clickHostSel = "a[href], button, [role='link'], [role='button']";

function lockContainers(curr) {
	if (!curr || curr.tagName === "BODY") return;

	if (!curr.hasAttribute("data-zd-pe-img")) {
		curr.setAttribute("data-zd-pe-img", curr.style.pointerEvents || "empty");
		curr.style.setProperty("pointer-events", "auto", "important");
	}

	let node = curr;
	for (let i = 0; i < 3 && node.parentElement && node.parentElement.tagName !== "BODY"; i++) {
		let p = node.parentElement;
		if (!p.hasAttribute("data-zd-pe")) {
			p.setAttribute("data-zd-pe", p.style.pointerEvents || "empty");
			p.style.setProperty("pointer-events", p.matches(_clickHostSel) ? "auto" : "none", "important");
		}
		for (const sibling of p.children) {
			if (sibling !== node) {
				if (!sibling.hasAttribute("data-zd-pe")) {
					sibling.setAttribute("data-zd-pe", sibling.style.pointerEvents || "empty");
					sibling.style.setProperty("pointer-events", "none", "important");
				}
			}
		}
		node = p;
	}
}

function unlockContainers(curr) {
	if (!curr) return;

	if (curr.hasAttribute("data-zd-pe-img")) {
		const origPe = curr.getAttribute("data-zd-pe-img");
		if (origPe === "empty") curr.style.removeProperty("pointer-events");
		else curr.style.setProperty("pointer-events", origPe, "important");
		curr.removeAttribute("data-zd-pe-img");
	}

	let topParent = curr.parentElement;
	for (
		let i = 0;
		i < 2 && topParent && topParent.parentElement && topParent.parentElement.tagName !== "BODY";
		i++
	) {
		topParent = topParent.parentElement;
	}
	if (topParent) {
		if (topParent.hasAttribute("data-zd-pe")) {
			const origPe = topParent.getAttribute("data-zd-pe");
			if (origPe === "empty") topParent.style.removeProperty("pointer-events");
			else topParent.style.setProperty("pointer-events", origPe, "important");
			topParent.removeAttribute("data-zd-pe");
		}
		topParent.querySelectorAll("[data-zd-pe]").forEach((el) => {
			const origPe = el.getAttribute("data-zd-pe");
			if (origPe === "empty") el.style.removeProperty("pointer-events");
			else el.style.setProperty("pointer-events", origPe, "important");
			el.removeAttribute("data-zd-pe");
		});
	}
}

function checkIsExcluded(excludedStr) {
	if (!excludedStr) return false;

	const currentHost = location.hostname.toLowerCase();
	if (!currentHost) return false;

	const lines = excludedStr.split(/[\r\n,]+/);
	return lines.some((line) => {
		let rule = line.trim().toLowerCase();
		if (!rule) return false;

		rule = rule.replace(/^[a-z]+:\/\//i, "").split("/")[0];
		return currentHost === rule || currentHost.endsWith("." + rule);
	});
}

let _badgeTimer = null;
let _rightBtnDown = false;
const _rcModifiedEls = new WeakSet();
let _rclickHoldTimer = null;

let _singleImgPage = false;

function isBlockedBySiteOverlay(target) {
	if (!target || !location.hostname) return false;

	if (
		target.id === "zd-custom-panel" ||
		target.closest("#zd-custom-panel") ||
		target.closest('[id$="floatImgWraper"]') ||
		target.classList.contains("zdImgCls_b6ig4jvwe")
	) {
		return false;
	}

	const overlayRules = [
		{
			hostMatch: "bing.com",
			maskId: "OverlayMask",
			containerSelector: ".idp-refresh-page-main-line"
		}
	];

	for (const rule of overlayRules) {
		if (location.hostname.includes(rule.hostMatch)) {
			const overlay = document.getElementById(rule.maskId);
			if (overlay && window.getComputedStyle(overlay).display !== "none") {
				if (!target.closest(rule.containerSelector)) {
					return true;
				}
			}
		}
	}
	return false;
}

function isSingleImgPage() {
	if (document.contentType && document.contentType.startsWith("image/")) {
		return true;
	}

	if (document.body) {
		let imgCount = 0;
		let nonImgCount = 0;

		for (let i = 0; i < document.body.childNodes.length; i++) {
			const node = document.body.childNodes[i];
			if (node.nodeType === 1) {
				if (node.tagName === "SCRIPT" || node.tagName === "STYLE" || node.tagName === "LINK") {
					continue;
				}

				if (node.tagName === "IMG") {
					imgCount++;
				} else {
					nonImgCount++;
				}
			}
		}

		if (imgCount === 1 && nonImgCount === 0) {
			return true;
		}
	}
	return false;
}

const elementDataMap = new WeakMap();
const _modifiedElements = new Set();

const _switcherSel = '[class*="image-switcher" i], [class*="imageswitcher" i], [class*="img-switcher" i]';
let _swTimer = null;
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
		if (h > 0) host.style.setProperty("--zd-sw-h", h + "px");
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
	if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return true;
	return e.type === "auxclick" && e.button === 1;
}

function inRect(el, x, y) {
	const r = el.getBoundingClientRect();
	return r.width > 0 && r.height > 0 && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

function dispatchPassThroughClick(host, e) {
	e.preventDefault();
	e.stopPropagation();
	e.stopImmediatePropagation();
	host.dispatchEvent(
		new MouseEvent("click", {
			bubbles: true,
			cancelable: true,
			composed: true,
			clientX: e.clientX,
			clientY: e.clientY,
			ctrlKey: e.ctrlKey,
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
			if (sib === node || isOwnElement(sib) || !sib.matches(_clickHostSel)) continue;
			if (inRect(sib, x, y)) return sib;
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
	const cands = new Set([host]);
	if (t && t.nodeType === 1 && !isOwnElement(t)) cands.add(t);
	host.querySelectorAll("[data-zd-pe-img]").forEach((i) => cands.add(i));
	if (t && t !== host && t.nodeType === 1 && !isOwnElement(t)) {
		t.querySelectorAll("[data-zd-pe-img]").forEach((i) => {
			if (inRect(i, x, y)) cands.add(i);
		});
	}
	for (const c of cands) {
		if (nativeCursor(c).startsWith("zoom-")) return true;
	}
	return false;
}

function resolvePassThrough(e) {
	const t = e.target;
	if (!t || t.nodeType !== 1) return null;
	const x = e.clientX;
	const y = e.clientY;

	let host = null;
	let kind = "";

	const path = e.composedPath ? e.composedPath() : [t];
	host = path.find((n) => n && n.nodeType === 1 && !isOwnElement(n) && n.matches(_clickHostSel)) || null;
	if (host) {
		kind = "path";
	} else if ((t.tagName === "IMG" || t.tagName === "CANVAS") && !isOwnElement(t)) {
		host = findOverlayClickHost(t, x, y);
		kind = "overlay";
	} else {
		host = findLockedContainerHost(t, x, y);
		kind = "container";
	}

	if (!host || isPageZoomClick(host, t, x, y)) return null;
	return { host, kind };
}

function findLockedContainerHost(t, x, y) {
	if (!t || t.nodeType !== 1 || isOwnElement(t) || t.matches(_clickHostSel)) return null;
	for (const h of document.querySelectorAll("[data-zd-pe]")) {
		if (h === t || !h.matches(_clickHostSel) || isOwnElement(h) || !t.contains(h)) continue;
		if (inRect(h, x, y)) return h;
	}
	return null;
}

function hasPassThroughHost(e) {
	return !!resolvePassThrough(e);
}

function forwardPassThroughClick(e, el) {
	if (e.type !== "click" || !e.isTrusted || !isPassThroughClick(e)) return false;
	if (el.classList.contains(_zdImgCls)) return false;

	const r = resolvePassThrough(e);
	if (!r || r.kind !== "overlay") return false;

	dispatchPassThroughClick(r.host, e);
	return true;
}

function onContainerPassThroughClick(e) {
	if (_isExcludedHost || !e.isTrusted || e.type !== "click" || _rightBtnDown) return;
	if (!isPassThroughClick(e) || e.button !== 0) return;

	const r = resolvePassThrough(e);
	if (r && r.kind === "container") dispatchPassThroughClick(r.host, e);
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

function restoreSelfVisibility(el) {
	const saved = el.getAttribute("data-zd-self-vis");
	if (saved === null) {
		el.style.visibility = "visible";
		return;
	}
	el.removeAttribute("data-zd-self-vis");
	if (saved === "empty") el.style.removeProperty("visibility");
	else el.style.visibility = saved;
}

let _lastResetElement = null;

function touchModified(el) {
	if (!el) return;
	_modifiedElements.delete(el);
	_modifiedElements.add(el);
}

function isElementModified(el) {
	if (!el || !el.isConnected) return false;
	if (getElData(el, _srckey) || el.classList.contains(_zdImgCls)) return true;
	if (el.classList.contains(_draggedCls)) return true;

	const d = getElData(el, _firstkey);
	const s = getElData(el, _sizekey);
	const r = getElData(el, _rotkey) || 0;
	const fx = getElData(el, _flipXkey) || 1;
	const fy = getElData(el, _flipYkey) || 1;
	const hasOpac = el.style.opacity && parseFloat(el.style.opacity) !== 1;
	const hasBright = el.style.filter && !el.style.filter.includes("brightness(100%)") && !el.style.filter.includes("brightness(1)");

	if (d && s && (Math.abs(s.w - d.sw) > 2 || Math.abs(s.h - d.sh) > 2)) return true;
	if (r !== 0 || fx !== 1 || fy !== 1 || hasOpac || hasBright) return true;
	return false;
}

function findNextModifiedImage(excludeImg) {
	const getRedirectedTarget = (el) => {
		if (!el) return el;
		const hData = getElData(el, _firstkey);
		if (hData && hData.id && !getElData(el, _srckey)) {
			const floatingCopy = document.getElementById(hData.id);
			if (floatingCopy && floatingCopy.classList.contains(_zdImgCls)) {
				return floatingCopy;
			}
		}
		return el;
	};

	const isExcluded = (target) => {
		if (!target) return true;
		if (excludeImg) {
			if (target === excludeImg) return true;
			if (getElData(target, _srckey) === excludeImg) return true;
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
		const floatImgs = Array.from(exImgWrapper.querySelectorAll("img." + _zdImgCls));
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

	if (_lastResetElement && _lastResetElement.isConnected) {
		return _lastResetElement;
	}

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

function isLockedOriginal(el) {
	if (!el) return false;
	const data = getElData(el, _firstkey);
	if (data && data.id && !getElData(el, _srckey)) {
		const floatingCopy = document.getElementById(data.id);
		if (floatingCopy && floatingCopy.classList.contains(_zdImgCls)) {
			return true;
		}
	}
	return false;
}

function cancelDrag() {
	if (!_dragParam) return;
	if (_dragParam.obj) {
		_dragParam.obj.classList.remove("zdImgCls_draggingCur");
	}
	_dragParam = null;
}

function startRotation(e, targetEl) {
	if (_isExcludedHost) return;

	const el = targetEl || _img_element || _current_element;
	if (!el) return;

	cancelDrag();

	const isSameGroup =
		_img_element &&
		(_img_element === el ||
			getElData(_img_element, _srckey) === el ||
			getElData(el, _srckey) === _img_element);

	if (!_img_element || (getPanelHost() && !isSameGroup)) {
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
		cx: cx,
		cy: cy,
		startAngle: startAngle,
		baseRot: baseRot,
		hasRotated: false
	};

	_ctx_show = false;
	showZoomBadge();

	window.addEventListener("pointermove", onGlobalMouseMove, true);
	window.addEventListener("pointerup", onGlobalMouseUp, true);
	window.addEventListener("pointercancel", onGlobalMouseUp, true);
	d("Rotation Start", "deg: " + baseRot);
}

function handleRotationMove(e) {
	if (!_rotParam || !_rotParam.obj) return;

	const curAngle = Math.atan2(e.clientY - _rotParam.cy, e.clientX - _rotParam.cx) * (180 / Math.PI);
	const delta = curAngle - _rotParam.startAngle;
	let newDeg = normalizeRot(Math.round(_rotParam.baseRot + delta));

	imgRotate(newDeg, _rotParam.obj);
	showZoomBadge();

	_rotParam.hasRotated = true;
	markRcModified(_rotParam.obj);
	_ctx_show = false;

	e.preventDefault();
	e.stopPropagation();
}

function stopRotation() {
	if (_rotParam) {
		if (_rotParam.obj) {
			_rotParam.obj.classList.remove("zdImgCls_actionActive");
		}
		if (_rotParam.hasRotated) {
			_cancelNextClick = true;
			_ctx_show = false;
		}
		_rotParam = null;
		d("Rotation End", "");

		if (!_rightBtnDown) {
			if (_badgeTimer) clearTimeout(_badgeTimer);
			_badgeTimer = setTimeout(() => {
				let b = document.getElementById("zdImg_zoomBadge");
				if (b && !_rightBtnDown && !_rotParam) {
					b.style.opacity = "0";
				}
			}, 800);
		}

		if (_zoom_rcCancel > 0) {
			if (_rclickTimer) clearTimeout(_rclickTimer);
			_rclickTimer = setTimeout(() => {
				if (_rotParam || _zoomParam || _dragParam) return;
				setZoom();
			}, _zoom_rcCancel);
		}
	}
}

function startQuickZoom(e, targetEl) {
	if (_isExcludedHost) return;

	const el = targetEl || _img_element || _current_element;
	if (!el) return;

	cancelDrag();

	const isSameGroup =
		_img_element &&
		(_img_element === el ||
			getElData(_img_element, _srckey) === el ||
			getElData(el, _srckey) === _img_element);

	if (!_img_element || (getPanelHost() && !isSameGroup)) {
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
	d("QuickZoom Start", "W: " + _zoomParam.startW);
}

function handleQuickZoomMove(e) {
	if (!_zoomParam || !_zoomParam.obj) return;

	const deltaY = e.clientY - _zoomParam.startY;
	let scale = Math.exp(deltaY * 0.01);

	let newW = _zoomParam.startW * scale;
	let newH = _zoomParam.startH * scale;

	const data = getElData(_zoomParam.obj, _firstkey);
	if (data) {
		const minWidth = 20;

		if (newW < minWidth) {
			newW = minWidth;
			newH = (data.sh / data.sw) * minWidth;
		}
	}

	setImageRect({ w: newW, h: newH });
	showZoomBadge();

	_zoomParam.hasZoomed = true;
	markRcModified(_zoomParam.obj);
	_ctx_show = false;

	e.preventDefault();
	e.stopPropagation();
}

function stopQuickZoom() {
	if (_zoomParam) {
		if (_zoomParam.obj) {
			_zoomParam.obj.classList.remove("zdImgCls_actionActive");
		}
		if (_zoomParam.hasZoomed) {
			_cancelNextClick = true;
			_ctx_show = false;
		}
		_zoomParam = null;
		d("QuickZoom End", "");

		if (!_rightBtnDown) {
			if (_badgeTimer) clearTimeout(_badgeTimer);
			_badgeTimer = setTimeout(() => {
				let b = document.getElementById("zdImg_zoomBadge");
				if (b && !_rightBtnDown && !_rotParam && !_zoomParam) {
					b.style.opacity = "0";
				}
			}, 800);
		}

		if (_zoom_rcCancel > 0) {
			if (_rclickTimer) clearTimeout(_rclickTimer);
			_rclickTimer = setTimeout(() => {
				if (_rotParam || _zoomParam) return;
				setZoom();
			}, _zoom_rcCancel);
		}
	}
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
		if (_dragParam.obj) {
			_dragParam.obj.classList.remove("zdImgCls_draggingCur");
		}
		if (_draggingCnt > 2) {
			_cancelNextClick = true;
		}
		_dragParam = null;
		d("Drag End", "");
		stoppedAction = true;
	}

	if (stoppedAction) {
		e.preventDefault();
		e.stopPropagation();
		e.stopImmediatePropagation();
	}

	if (!_rotParam && !_zoomParam && !_dragParam) {
		window.removeEventListener("pointermove", onGlobalMouseMove, true);
		window.removeEventListener("pointerup", onGlobalMouseUp, true);
		window.removeEventListener("pointercancel", onGlobalMouseUp, true);
	}
}

function isEditableTarget(el) {
	if (!el) return false;
	const tag = el.tagName ? el.tagName.toUpperCase() : "";
	if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
		return true;
	}
	if (el.isContentEditable) {
		return true;
	}
	if (el.getAttribute && el.getAttribute("role") === "textbox") {
		return true;
	}
	return false;
}

function updateHoverTarget(data) {
	const x = data.x;
	const y = data.y;
	const path = data.path;

	let t = data.target;
	if (path.length > 0) {
		t = path.find((el) => el.tagName === "IMG" || el.tagName === "CANVAS") || path[0];
	}

	const visualImg = getVisualTarget(x, y, t);
	if (visualImg && (visualImg.tagName === "IMG" || visualImg.tagName === "CANVAS")) {
		t = visualImg;
	}

	if (!t) return;

	if (isBlockedBySiteOverlay(t)) {
		_hoverTarget = null;
		return;
	}

	const panel = getPanelHost();
	if (panel && (t === panel || panel.contains(t) || path.includes(panel))) {
		_hoverTarget = null;
		return;
	}

	if (isInactiveImageTarget(t, x, y)) {
		_hoverTarget = null;
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

	const wrapper = t.closest("a, button, picture, figure");
	if (wrapper) {
		const img = wrapper.querySelector("img, canvas");
		if (img) {
			const rect = img.getBoundingClientRect();
			if (rect.width > 0 && rect.height > 0 && hitCheck(img, x, y)) {
				_hoverTarget = img;
				return;
			}
		}
	}

	if (t.parentNode) {
		const img = t.parentNode.querySelector("img, canvas");
		if (img) {
			const rect = img.getBoundingClientRect();
			if (rect.width > 0 && rect.height > 0 && hitCheck(img, x, y)) {
				_hoverTarget = img;
				return;
			}
		}
	}

	_hoverTarget = null;
}

let _lastFocusAttempt = 0;

function ensureKeyboardFocus() {
	if (!_zoom_enableKeyShortcuts) return;

	const now = Date.now();
	if (now - _lastFocusAttempt < 300) return;

	const ae = document.activeElement;
	if (isEditableTarget(ae)) return;

	const focusInChildFrame = !!ae && (ae.tagName === "IFRAME" || ae.tagName === "FRAME");
	if (document.hasFocus() && !focusInChildFrame) return;

	_lastFocusAttempt = now;
	try {
		if (focusInChildFrame) ae.blur();
		window.focus();
	} catch (err) {
	}
}

function flushHoverUpdate() {
	if (_hoverRafId) {
		cancelAnimationFrame(_hoverRafId);
		_hoverRafId = 0;
	}
	const data = _hoverEventData;
	_hoverEventData = null;
	if (!data || _isExcludedHost) return;
	if ((_rightBtnDown && _img_element) || _rotParam || _zoomParam || _dragParam) return;
	updateHoverTarget(data);
	if (_hoverTarget && _hoverTarget.isConnected) ensureKeyboardFocus();
}

function getActiveImageTarget(isActivationKey = true, isReset = false) {
	flushHoverUpdate();
	const getRedirectedTarget = (el) => {
		if (!el) return el;
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
	};

	if (isReset) {
		return getTargetForPanel();
	}

	if (isActivationKey) {
		if (_hoverTarget && isInactiveImageTarget(_hoverTarget, _lastMouseX, _lastMouseY)) {
			_hoverTarget = null;
		}

		if (typeof _hoverTarget !== "undefined" && _hoverTarget && _hoverTarget.isConnected) {
			const rect = _hoverTarget.getBoundingClientRect();
			if (rect.width > 0 && rect.height > 0) {
				return getRedirectedTarget(_hoverTarget);
			}
		}

		let elFromPoint = document.elementFromPoint(_lastMouseX, _lastMouseY);
		while (elFromPoint && elFromPoint.shadowRoot) {
			let sel = elFromPoint.shadowRoot.elementFromPoint(_lastMouseX, _lastMouseY);
			if (!sel || sel === elFromPoint) break;
			elFromPoint = sel;
		}

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

			if (_zoom_bgImg) {
				const bg = window.getComputedStyle(elFromPoint).backgroundImage;
				if (bg !== "none" && bg.includes("url") && elFromPoint.tagName !== "BODY" && elFromPoint.tagName !== "HTML") {
					const match = bg.match(/url\(['"]?(.*?)['"]?\)/i);
					if (match && match[1]) {
						setElData(elFromPoint, _bgsrckey, match[1]);
						return getRedirectedTarget(elFromPoint);
					}
				}
			}
		}

		const visualImg = getVisualTarget(_lastMouseX, _lastMouseY, null);
		if (visualImg && visualImg.isConnected) {
			return getRedirectedTarget(visualImg);
		}

		const hovers = document.querySelectorAll(":hover");
		if (hovers && hovers.length > 0 && !isInactiveImageTarget(hovers[hovers.length - 1], _lastMouseX, _lastMouseY)) {
			let target = hovers[hovers.length - 1];
			if (target.tagName === "IMG" || target.tagName === "CANVAS") {
				return getRedirectedTarget(target);
			} else if (_zoom_bgImg) {
				const bg = window.getComputedStyle(target).backgroundImage;
				if (bg !== "none" && bg.includes("url") && target.tagName !== "BODY" && target.tagName !== "HTML") {
					const match = bg.match(/url\(['"]?(.*?)['"]?\)/i);
					if (match && match[1]) {
						setElData(target, _bgsrckey, match[1]);
						return getRedirectedTarget(target);
					}
				}
			}
		}
	}

	if (typeof _hoverTarget !== "undefined" && _hoverTarget && _hoverTarget.isConnected) {
		return getRedirectedTarget(_hoverTarget);
	}

	if (_img_element && _img_element.isConnected) {
		return getRedirectedTarget(_img_element);
	}

	if (!isReset) {
		const modArr = Array.from(_modifiedElements);
		for (let i = modArr.length - 1; i >= 0; i--) {
			let el = getRedirectedTarget(modArr[i]);
			if (el && el.isConnected && isElementModified(el)) {
				return el;
			}
		}
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

	if (!getElData(target, _firstkey)) {
		attachEvent(target);
	}

	if (_img_element !== target) {
		setZoom(target, null, skipBadge);
	}

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

	let dim = _zoom_dim * 0.01;
	if (shiftPressed) {
		dim *= 2;
	}

	const r = zoomIn ? 1 + dim : 1 - dim;

	zoom(r);
	refreshShortcutTimeout();
	return true;
}

function handleArrowKey(dx, dy, isActKey) {
	let target = null;

	if (_img_element && _img_element.isConnected) {
		const isFloating = !!getElData(_img_element, _srckey) || (_singleImgPage && _img_element.classList.contains(_imgSrcViewCls));
		if (isFloating) {
			target = _img_element;
		}
	}

	if (!target) {
		const modArr = Array.from(_modifiedElements);
		for (let i = modArr.length - 1; i >= 0; i--) {
			const el = modArr[i];
			if (el && el.isConnected) {
				const hData = getElData(el, _firstkey);
				if (hData && hData.id && !getElData(el, _srckey)) {
					const floatingCopy = document.getElementById(hData.id);
					if (floatingCopy && floatingCopy.classList.contains(_zdImgCls)) {
						target = floatingCopy;
						break;
					}
				} else if (getElData(el, _srckey)) {
					target = el;
					break;
				}
			}
		}
	}

	if (!target) {
		return false;
	}

	if (_img_element !== target) {
		setZoom(target, null, true);
	}

	ensureElevatedZIndex(target);

	const rawLeft = parseFloat(target.style.left);
	const rawTop = parseFloat(target.style.top);
	const curLeft = isNaN(rawLeft) ? getOffset(target).left : rawLeft;
	const curTop = isNaN(rawTop) ? getOffset(target).top : rawTop;

	enableAnim(target);
	target.style.setProperty("left", curLeft + dx + "px", "important");
	target.style.setProperty("top", curTop + dy + "px", "important");
	target.classList.add(_draggedCls);

	if (_singleImgPage && target.classList.contains(_imgSrcViewCls)) {
		const size = getElData(target, _sizekey);
		if (size) {
			checkSingleImgActivation(target, size.w, size.h);
		}
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

	const curRot = getElData(target, _rotkey) || 0;
	const newRot = normalizeRot(curRot + deg);

	enableAnim(target);
	imgRotate(newRot);
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
	windowFiting();
	refreshShortcutTimeout();
	return true;
}

function handlePanelKey(isActKey) {
	const panel = getPanelHost();
	if (panel) {
		const panelShadow = getPanelShadow();
		const closeBtn = panelShadow ? panelShadow.getElementById("zd-btn-close") : null;
		if (closeBtn) {
			closeBtn.click();
		} else {
			panel.remove();
			if (typeof _img_element !== "undefined" && _img_element) {
				_img_element.style.removeProperty("outline");
				_img_element.style.removeProperty("outline-offset");
				_img_element.style.removeProperty("box-shadow");
			}
		}
		return true;
	}

	let validImg = getActiveImageTarget(isActKey);

	if (!validImg) return false;
	const rect = validImg.getBoundingClientRect();
	if (rect.width === 0 || rect.height === 0) return false;

	if (typeof _current_element !== "undefined") {
		_current_element = validImg;
	}

	let finalTarget = ensureTargetReady(validImg);
	if (!finalTarget) return false;

	ctxZoomCustom();
	refreshShortcutTimeout();
	return true;
}

function restoreOriginalDOM(withAnimation) {
	const exWrapper = document.getElementById(_zdExImgId);
	if (exWrapper) {
		const imgs = exWrapper.querySelectorAll("img");
		imgs.forEach((img) => {
			const orig = getElData(img, _srckey);
			if (orig) {
				restoreSelfVisibility(orig);

				unlockContainers(orig);
			}
		});
		exWrapper.remove();
	}

	document.querySelectorAll("img[data-zd-orig-vis]").forEach((sibImg) => {
		const origVis = sibImg.getAttribute("data-zd-orig-vis");
		if (origVis === "empty") {
			sibImg.style.removeProperty("visibility");
		} else {
			sibImg.style.setProperty("visibility", origVis);
		}
		sibImg.removeAttribute("data-zd-orig-vis");
	});

	stopExImgObserver();

	for (const el of _modifiedElements) {
		if (el && el.nodeType === 1) {
			if (withAnimation) {
				enableAnim(el);
			}

			unlockContainers(el);

			const data = getElData(el, _firstkey);

			el.style.removeProperty("left");
			el.style.removeProperty("top");
			el.style.removeProperty("width");
			el.style.removeProperty("height");
			el.style.removeProperty("max-width");
			el.style.removeProperty("max-height");
			el.style.removeProperty("min-width");
			el.style.removeProperty("min-height");
			el.style.removeProperty("transform");
			el.style.removeProperty("z-index");
			el.style.removeProperty("background-image");
			el.style.removeProperty("flex-shrink");
			el.style.removeProperty("contain");
			el.style.removeProperty("object-fit");
			el.style.removeProperty("object-position");
			el.style.removeProperty("transform-origin");

			if (data && data.origStyle) {
				el.style.left = data.origStyle.left;
				el.style.top = data.origStyle.top;
				el.style.width = data.origStyle.width;
				el.style.height = data.origStyle.height;
				el.style.maxWidth = data.origStyle.maxWidth;
				el.style.maxHeight = data.origStyle.maxHeight;
				el.style.minWidth = data.origStyle.minWidth || "";
				el.style.minHeight = data.origStyle.minHeight || "";
				el.style.transform = data.origStyle.transform;
				if (data.origStyle.zIndex !== undefined) {
					el.style.zIndex = data.origStyle.zIndex;
				}
				if (data.origStyle.backgroundImage !== undefined) {
					el.style.backgroundImage = data.origStyle.backgroundImage;
				}
				if (data.origStyle.objectFit !== undefined) {
					el.style.objectFit = data.origStyle.objectFit;
				}
				if (data.origStyle.transformOrigin !== undefined) {
					el.style.transformOrigin = data.origStyle.transformOrigin;
				}
			}

			el.style.removeProperty("opacity");
			el.style.removeProperty("filter");
			el.style.removeProperty("outline");
			el.style.removeProperty("outline-offset");
			el.style.removeProperty("box-shadow");
			el.style.removeProperty("cursor");
			restoreSelfVisibility(el);
			el.classList.remove(_draggedCls);
			el.classList.remove("zdImgCls_draggingCur");

			if (_singleImgPage && el.classList.contains(_imgSrcViewCls)) {
				el.classList.remove(_zdImgCls);
				el.style.setProperty("cursor", "zoom-in", "important");
			}

			if (_singleImgPage && !document.querySelector("." + _imgSrcViewCls)) {
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
	_modifiedElements.clear();

	_zIndexCounter = 10;
}

function handleShiftEscapeKey() {
	let didSomething = false;
	if (_rotParam) {
		stopRotation();
		didSomething = true;
	}
	if (_dragParam) {
		if (_dragParam.obj) _dragParam.obj.classList.remove("zdImgCls_draggingCur");
		_dragParam = null;
		didSomething = true;
	}

	const panel = getPanelHost();
	if (panel) didSomething = true;

	const checkMod = (el) => {
		if (!el) return false;
		if (getElData(el, _srckey)) return true;
		if (el.classList.contains(_draggedCls)) return true;
		const d = getElData(el, _firstkey),
			s = getElData(el, _sizekey),
			r = getElData(el, _rotkey) || 0;
		const fx = getElData(el, _flipXkey) || 1,
			fy = getElData(el, _flipYkey) || 1;
		if (d && s && (Math.abs(s.w - d.sw) > 2 || Math.abs(s.h - d.sh) > 2)) return true;
		if (r !== 0 || fx !== 1 || fy !== 1) return true;
		if (el.style.opacity || el.style.filter) return true;
		return false;
	};

	let anyModified = false;
	for (const el of _modifiedElements) {
		if (el && el.isConnected && checkMod(el)) {
			anyModified = true;
			break;
		}
	}

	if (_singleImgPage && _zoom_ivpDrag) {
		const nimg = document.querySelector("." + _imgSrcViewCls);
		if (checkMod(nimg)) anyModified = true;
	}

	if (!anyModified && !didSomething) {
		return false;
	}

	if (_singleImgPage && _zoom_ivpDrag) {
		const nimg = document.querySelector("." + _imgSrcViewCls);
		if (nimg) {
			nimg.classList.remove(_draggedCls);
			nimg.style.removeProperty("opacity");
			nimg.style.removeProperty("filter");
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
			return true;
		}
	}

	let activeImg = _img_element;
	if (activeImg) {
		const srcElem = getElData(activeImg, _srckey);
		if (srcElem) activeImg = srcElem;
	}

	let activeData = null;
	if (activeImg) activeData = getElData(activeImg, _firstkey);

	restoreOriginalDOM(true);

	if (panel && activeImg && activeImg.isConnected) {
		if (activeData) {
			setElData(activeImg, _firstkey, activeData);
			setElData(activeImg, _sizekey, { w: activeData.sw, h: activeData.sh });
			setElData(activeImg, _rotkey, 0);
			setElData(activeImg, _flipXkey, 1);
			setElData(activeImg, _flipYkey, 1);
		}

		setZoom(activeImg);
		syncPanelValues();

		if (panel.matches(":hover") || panelHasFocus()) {
			const needsFloat = needsFloatingForNativeZoom(activeImg);
			if (needsFloat && !getElData(activeImg, _srckey)) {
				const bData = getElData(activeImg, _firstkey);
				if (bData) {
					const sz = getElData(activeImg, _sizekey) || { w: bData.sw, h: bData.sh };
					generateImgEx({ w: sz.w, h: sz.h });
				}
			}
			applyPanelBorder();
		}
	} else {
		setZoom();
	}

	return true;
}

function handleEscapeKey(isActKey = false) {
	let didSomething = false;
	const panel = getPanelHost();
	if (panel) {
		removePanelBorder();
		panel.remove();
		didSomething = true;
	}

	let target = getActiveImageTarget(isActKey, true);

	let isModified = false;
	if (target) {
		if (getElData(target, _srckey)) isModified = true;
		else if (target.classList.contains(_draggedCls)) isModified = true;
		else {
			const data = getElData(target, _firstkey);
			const size = getElData(target, _sizekey);
			const rot = getElData(target, _rotkey) || 0;
			const flipX = getElData(target, _flipXkey) || 1;
			const flipY = getElData(target, _flipYkey) || 1;

			if (data && size && (Math.abs(size.w - data.sw) > 2 || Math.abs(size.h - data.sh) > 2)) isModified = true;
			if (rot !== 0 || flipX !== 1 || flipY !== 1) isModified = true;
			if (target.style.opacity || target.style.filter) isModified = true;
		}
	}

	if (!target || !isModified) return didSomething;

	target = ensureTargetReady(target);
	if (!target) return didSomething;

	enableAnim(target);
	target.classList.remove(_draggedCls);

	target.style.removeProperty("opacity");
	target.style.removeProperty("filter");
	target.style.removeProperty("outline");
	target.style.removeProperty("outline-offset");
	target.style.removeProperty("box-shadow");
	target.style.removeProperty("cursor");

	setElData(target, _flipXkey, 1);
	setElData(target, _flipYkey, 1);

	const data = getElData(target, _firstkey);
	if (data && data.origStyle && data.origStyle.zIndex !== undefined) {
		target.style.removeProperty("z-index");
		target.style.zIndex = data.origStyle.zIndex;
	} else {
		target.style.removeProperty("z-index");
	}

	const src_elem = getElData(target, _srckey);
	if (src_elem) {
		imgRotate(0, target);
		clearImgEx(src_elem);
	} else {
		setImageRect(undefined, target);
		imgRotate(0, target);
	}

	setZoom();

	return true;
}

function init() {
	d("Init Start", "");

	if (!document.body) {
		d("Init Aborted", "document.body is not ready", "error");
		return;
	}

	_singleImgPage = isSingleImgPage();
	if (_singleImgPage && !_isExcludedHost) {
		singlePageAltImg();
	}

	updateClickFunctions();

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
					if (e.type === "mousedown" || e.type === "pointerdown" || e.type === "touchstart") {
						return;
					}
					e.preventDefault();
					e.stopPropagation();
					e.stopImmediatePropagation();
					return;
				}

				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();

				if (e.type === "mouseup" || e.type === "pointerup" || e.type === "touchend") {
					_cancelNextClick = true;
					_clickFunc();
					_draggingCnt = 0;
				}
				return;
			}

			const isClickEvent = ["click", "dblclick", "mousedown", "pointerdown", "mouseup", "pointerup", "touchstart", "touchend"].includes(e.type);

			if (isClickEvent && (e.button === 0 || e.button === undefined)) {

				if (e.target && e.target.dataset && e.target.dataset.zdIgnoreClick === "true") {
					return;
				}

				if (_cancelNextClick && (e.type === "click" || e.type === "dblclick")) {
					e.preventDefault();
					e.stopPropagation();
					e.stopImmediatePropagation();
					if (e.type === "click") _cancelNextClick = false;
					return;
				}

				const isExtClass = e.target && e.target.classList && e.target.classList.contains(_zdImgCls);
				if (e.target && !(isPassThroughClick(e) && (e.type !== "click" || hasPassThroughHost(e))) && !isExtClass) {
					let shouldBlock = false;

					const checkMod = (el) => {
						if (!el || !el.isConnected) return false;

						if (el.hasAttribute && el.hasAttribute("data-zd-pe-img")) return true;
						if (el.style && el.style.getPropertyValue("cursor") === "default") return true;

						const data = getElData(el, _firstkey);
						if (!data || !!getElData(el, _srckey)) return false;

						const size = getElData(el, _sizekey);
						const rot = getElData(el, _rotkey) || 0;
						const flipX = getElData(el, _flipXkey) || 1;
						const flipY = getElData(el, _flipYkey) || 1;
						const isDragged = el.classList && el.classList.contains(_draggedCls);

						const hasOpacity = el.style.opacity && parseFloat(el.style.opacity) !== 1;
						const hasBright = el.style.filter && !el.style.filter.includes("brightness(100%)") && !el.style.filter.includes("brightness(1)");

						return (size && (Math.abs(size.w - data.sw) > 2 || Math.abs(size.h - data.sh) > 2 || rot !== 0 || flipX !== 1 || flipY !== 1 || isDragged || hasOpacity || hasBright));
					};

					const clickPath = e.composedPath ? e.composedPath() : [e.target];
					const strictMod = isPassThroughClick(e);

					if (e.target.tagName === "IMG" || e.target.tagName === "CANVAS") {
						if (checkMod(e.target)) shouldBlock = true;
					}

					if (!shouldBlock) {
						for (const el of _modifiedElements) {
							if (!el.isConnected) continue;
							if (checkMod(el)) {
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
								const wrapper = el.parentElement || el.closest("a, button, picture, figure, [class*='expandable'], [class*='image'], [class*='lightbox']");
								if (wrapper && (clickPath.includes(wrapper) || wrapper.contains(e.target))) {
									shouldBlock = true;
									break;
								}

								const sharedHosts = [el.closest(".imgpt, .iusc, .isv-r")];
								for (let h = el.closest(_clickHostSel); h; h = h.parentElement ? h.parentElement.closest(_clickHostSel) : null) {
									sharedHosts.push(h);
								}
								if (sharedHosts.some((h) => h && (clickPath.includes(h) || h.contains(e.target)))) {
									shouldBlock = true;
									break;
								}
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

	window.addEventListener("pointerdown", captureShield, true);
	window.addEventListener("mousedown", captureShield, true);
	window.addEventListener("pointerup", captureShield, true);
	window.addEventListener("mouseup", captureShield, true);
	window.addEventListener("click", captureShield, true);

	["click", "auxclick"].forEach((type) => {
		window.addEventListener(type, onSwitcherLinkClick, true);
	});

	window.addEventListener("click", onContainerPassThroughClick, true);

	window.addEventListener(
		"dragstart",
		(e) => {
			if (_isExcludedHost) return;
			if (
				_img_element ||
				_dragParam ||
				_rightBtnDown ||
				(e.target && e.target.classList && e.target.classList.contains(_zdImgCls))
			) {
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
			if (
				panel &&
				(e.target === panel || panel.contains(e.target) || (e.composedPath && e.composedPath().includes(panel)))
			) {
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

				checkTarget(t, e);
				const activeTarget = _current_element || _img_element;
				if (isAlt && e.buttons & 1 && activeTarget) {
					_ctx_show = false;
					const isCtrl = e.ctrlKey || _accKeyState.ctrl;
					if (isCtrl) {
						startQuickZoom(e, activeTarget);
					} else {
						startRotation(e, activeTarget);
					}
					e.preventDefault();
					e.stopPropagation();
				}
			} else if (e.button === 0) {
				if (isAlt && (_rightBtnDown || e.buttons & 2)) {
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
						const isCtrl = e.ctrlKey || _accKeyState.ctrl;
						if (isCtrl) {
							startQuickZoom(e, activeTarget);
						} else {
							startRotation(e, activeTarget);
						}
						e.preventDefault();
						e.stopPropagation();
					}
				}
			}
		},
		true
	);

	window.addEventListener(
		"mouseup",
		(e) => {
			if (_isExcludedHost) {
				if (_rotParam || _img_element) {
					resetAllChanges();
				}
				return;
			}

			const panel = getPanelHost();
			if (
				panel &&
				(e.target === panel || panel.contains(e.target) || (e.composedPath && e.composedPath().includes(panel)))
			) {
				return;
			}

			if (_rotParam) {
				stopRotation();
			}

			if (e.button === 2) {
				if (_rclickHoldTimer) {
					clearTimeout(_rclickHoldTimer);
					_rclickHoldTimer = null;
				}
				_rightBtnDown = false;

				if (_img_element) {
					const panelOpen = getPanelHost();

					if (!_blockWheelZoom) {
						showZoomBadge();
					}

					if (panelOpen) {
						if (_zoom_autoRtn && isRcModified(_img_element)) {
							autoResetImage();
							removePanelBorder();
							syncPanelValues();
						}
						setTimeout(() => {
							let b = document.getElementById("zdImg_zoomBadge");
							if (b && !_rightBtnDown) {
								b.style.opacity = "0";
							}
							_ctx_show = true;
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
			if (_isExcludedHost) return;

			if ((_rightBtnDown && _img_element) || _rotParam || _zoomParam || _dragParam) {
				return;
			}

			_lastMouseX = e.clientX;
			_lastMouseY = e.clientY;

			_hoverEventData = {
				x: e.clientX,
				y: e.clientY,
				target: e.target,
				path: e.composedPath ? e.composedPath() : []
			};
			if (_hoverRafId) return;
			_hoverRafId = requestAnimationFrame(flushHoverUpdate);
		},
		{ passive: true, capture: true }
	);

	window.addEventListener(
		"wheel",
		(e) => {
			const panel = getPanelHost();
			if (panel && panel.contains(e.target)) return;

			if ((!_singleImgPage || !_zoom_ivpDrag) && !_rightBtnDown) {
				return;
			}

			if (_rightBtnDown && _img_element) {
				e.preventDefault();
			}
		},
		{ passive: false, capture: true }
	);

	window.addEventListener(
		"keydown",
		(e) => {
			_accKeyState.ctrl = e.ctrlKey;
			_accKeyState.alt = e.altKey;

			if (e.key === "Alt" && _img_element) {
				e.preventDefault();
			}

			if (!_zoom_enableKeyShortcuts || _isExcludedHost) return;

			const panel = getPanelHost();
			const panelShadowEl = getPanelShadow();
			const panelActiveEl = panelShadowEl && panelShadowEl.activeElement;
			const inPanelInput = !!panelActiveEl && panelActiveEl.tagName === "INPUT";

			if (isEditableTarget(e.target) || isEditableTarget(document.activeElement) || inPanelInput) {
				if (!(inPanelInput && e.key === "Escape")) {
					if (inPanelInput) return;

					flushHoverUpdate();
					const visualImg = getVisualTarget(_lastMouseX, _lastMouseY, null);
					const isHoveringImage = visualImg || (_hoverTarget && _hoverTarget.isConnected);

					if (!isHoveringImage) {
						return;
					}
				}
			}

			if (e.ctrlKey || e.metaKey || e.altKey) {
				return;
			}

			const key = e.key;

			if (panel && (panel.matches(":hover") || inPanelInput)) {
				const deadZoneKeys = [
					"+",
					"=",
					"*",
					"-",
					"_",
					"l",
					"L",
					"r",
					"R",
					"0",
					"ArrowUp",
					"ArrowDown",
					"ArrowLeft",
					"ArrowRight"
				];
				if (deadZoneKeys.includes(key) || e.code === "NumpadAdd" || e.code === "NumpadSubtract") {
					if (inPanelInput && key.startsWith("Arrow")) {
						return;
					}

					e.preventDefault();
					e.stopPropagation();
					return;
				}
			}

			let handled = false;

			const isActKey =
				key === "+" ||
				key === "=" ||
				key === "*" ||
				e.code === "NumpadAdd" ||
				key === "-" ||
				key === "_" ||
				e.code === "NumpadSubtract" ||
				key === "0" ||
				key === "r" ||
				key === "R" ||
				key === "l" ||
				key === "L" ||
				key === "p" ||
				key === "P";

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

			let currentHoverEl = document.elementFromPoint(_lastMouseX, _lastMouseY);
			while (currentHoverEl && currentHoverEl.shadowRoot) {
				const shadowEl = currentHoverEl.shadowRoot.elementFromPoint(_lastMouseX, _lastMouseY);
				if (!shadowEl || shadowEl === currentHoverEl) break;
				currentHoverEl = shadowEl;
			}

			if (isBlockedBySiteOverlay(currentHoverEl)) {
				return;
			}

			if (key === "+" || key === "=" || key === "*" || e.code === "NumpadAdd") {
				handled = handleZoomKey(true, e.shiftKey, isActKey);
			} else if (key === "-" || key === "_" || e.code === "NumpadSubtract") {
				handled = handleZoomKey(false, e.shiftKey, isActKey);
			} else if (key.startsWith("Arrow")) {
				let dx = 0,
					dy = 0;
				const step = e.shiftKey ? 60 : 20;
				if (key === "ArrowUp") dy = -step;
				else if (key === "ArrowDown") dy = step;
				else if (key === "ArrowLeft") dx = -step;
				else if (key === "ArrowRight") dx = step;

				handled = handleArrowKey(dx, dy, isActKey);

				if (handled) {
					e.preventDefault();
					e.stopPropagation();
					e.stopImmediatePropagation();
					return;
				}
			} else if (key === "0") {
				handled = handleFitWindowKey(isActKey);
			} else if (key === "r" || key === "R") {
				handled = handleRotationKey(e.shiftKey ? 45 : 90, isActKey);
			} else if (key === "l" || key === "L") {
				handled = handleRotationKey(e.shiftKey ? -45 : -90, isActKey);
			} else if (key === "p" || key === "P") {
				handled = handlePanelKey(isActKey);
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
			_accKeyState.ctrl = _accKeyState.alt = false;

			if (e.key === "Escape" && _blockNextEscKeyup) {
				_blockNextEscKeyup = false;
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();
				return;
			}

			if (e.key === "Alt") {
				if (_rotParam) {
					stopRotation();
				}
				if (_img_element) {
					e.preventDefault();
				}
			}
		},
		true
	);

	window.addEventListener("contextmenu", (e) => {
		if (!_ctx_show) {
			e.preventDefault();
		}
	});

	const releaseInputState = () => {
		_accKeyState.ctrl = _accKeyState.alt = false;
		_rightBtnDown = false;

		if (_rotParam) stopRotation();
		if (_zoomParam) stopQuickZoom();

		if (_dragParam) {
			if (_dragParam.obj) {
				_dragParam.obj.classList.remove("zdImgCls_draggingCur");
			}
			_dragParam = null;
		}

		if (_img_element) {
			setZoom();
		}
	};

	window.addEventListener("blur", releaseInputState);
	window.addEventListener("pagehide", releaseInputState);
	window.addEventListener("pageshow", (e) => {
		if (e.persisted) releaseInputState();
	});
	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState === "hidden") releaseInputState();
	});

	_endInit = true;
	d("Init End", "");
}

function updateClickFunctions() {
	if (_zoom_clickSwap) {
		_clickFunc = windowFiting;
		_mdownFunc = sizeFit;
	} else {
		_clickFunc = sizeFit;
		_mdownFunc = windowFiting;
	}
}

function singlePageAltImg() {
	if (!_zoom_ivpDrag || !document.body) return;

	const img = document.querySelector("img:not(." + _zdImgCls + ")");
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

		if (w > size.w || h > size.h) {
			nimg.classList.add(modeFitCls);
		} else {
			nimg.classList.remove(modeFitCls);
		}

		const nLeft = (sw - size.w) / 2;
		const nTop = (sh - size.h) / 2;

		nimg.style.setProperty("position", "absolute", "important");
		nimg.style.setProperty("display", "inline", "important");
		nimg.style.setProperty("left", nLeft + "px", "important");
		nimg.style.setProperty("top", nTop + "px", "important");
		nimg.style.setProperty("width", size.w + "px", "important");
		nimg.style.setProperty("height", size.h + "px", "important");

		nimg.style.setProperty("min-width", size.w + "px", "important");
		nimg.style.setProperty("min-height", size.h + "px", "important");
		nimg.style.setProperty("max-width", "none", "important");
		nimg.style.setProperty("max-height", "none", "important");
		nimg.style.setProperty("transform-origin", "50% 50%", "important");

		if (w > size.w || h > size.h) {
			nimg.style.setProperty("cursor", "zoom-in", "important");
		} else {
			nimg.style.setProperty("cursor", "default", "important");
		}

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
	_hoverTarget = null;
	d("Reset All Changes for Excluded Domain", "Script disabled", "warn");

	window.removeEventListener("wheel", zoomEvent, { capture: true });
	window.removeEventListener("wheel", defEventCancel, { capture: true });
	window.removeEventListener("pointermove", onGlobalMouseMove, true);
	window.removeEventListener("pointerup", onGlobalMouseUp, true);
	window.removeEventListener("pointercancel", onGlobalMouseUp, true);

	stopRotation();
	stopQuickZoom();

	if (_zoomParam) _zoomParam = null;

	if (_dragParam) {
		if (_dragParam.obj) {
			_dragParam.obj.classList.remove("zdImgCls_draggingCur");
		}
		_dragParam = null;
	}

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

	_rightBtnDown = false;

	stopExImgObserver();
	restoreOriginalDOM(false);

	const nimg = document.querySelector("." + _imgSrcViewCls);
	if (nimg) {
		nimg.remove();

		const origImg = document.querySelector("img[data-zd-orig-src]");
		if (origImg) {
			origImg.setAttribute("src", origImg.getAttribute("data-zd-orig-src"));
			origImg.removeAttribute("data-zd-orig-src");
			origImg.style.removeProperty("display");
			origImg.style.removeProperty("opacity");
			origImg.style.removeProperty("pointer-events");
		} else if (document.body && document.body.children && document.body.children[0]) {
			document.body.children[0].style.display = "";
		}

		document.body.style.removeProperty("overflow");
		document.documentElement.style.removeProperty("overflow");
		document.body.style.removeProperty("margin");
	}

	const b = document.getElementById("zdImg_zoomBadge");
	if (b) {
		b.remove();
	}

	_img_element = null;
	_current_element = null;
	_ctx_show = true;

	enableContextMenus(false);
}

function settingData(setting) {
	if (setting) {
		if (setting.dim != null) _zoom_dim = setting.dim;
		if (setting.rotd != null) _zoom_rotd = setting.rotd;
		if (setting.rcCancel != null) _zoom_rcCancel = setting.rcCancel;
		if (setting.reverse != null) _zoom_reverse = setting.reverse;

		if (setting.bgImg != null) {
			const wasBgImg = _zoom_bgImg;
			_zoom_bgImg = setting.bgImg;
			if (wasBgImg && !_zoom_bgImg) {
				resetAllChanges();
			}
		}

		if (setting.autoRtn != null) _zoom_autoRtn = setting.autoRtn;
		if (setting.ctrlRvs != null) _zoom_ctrlRvs = setting.ctrlRvs;
		if (setting.enableCxt != null) _zoom_enableCxt = setting.enableCxt;

		if (setting.ivpDrag != null) {
			const wasIvpDrag = _zoom_ivpDrag;
			const isFirstApply = !_settingsLoaded;
			_zoom_ivpDrag = setting.ivpDrag;
			if (_zoom_ivpDrag && _singleImgPage && !_isExcludedHost) {
				if (!document.querySelector("." + _imgSrcViewCls)) {
					singlePageAltImg();
				}
			} else if (!_zoom_ivpDrag && _singleImgPage && (wasIvpDrag || isFirstApply)) {

				resetAllChanges();
			}
			_settingsLoaded = true;
		}

		if (setting.showZoomBadge != null) _zoom_showZoomBadge = setting.showZoomBadge;
		if (setting.enableKeyShortcuts != null) _zoom_enableKeyShortcuts = setting.enableKeyShortcuts;
		if (setting.excludedDomains != null) {
			_zoom_excludedDomains = setting.excludedDomains;
			const wasExcluded = _isExcludedHost;
			_isExcludedHost = checkIsExcluded(_zoom_excludedDomains);
			if (_isExcludedHost && !wasExcluded) {
				resetAllChanges();
			}
		}

		if (setting.trackCursor != null) _zoom_trackCursor = setting.trackCursor;
		if (setting.clickSwap != null) {
			_zoom_clickSwap = setting.clickSwap;
			updateClickFunctions();
		}
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
		if (!getPanelHost()) {
			setZoom();
		}
		return false;
	}

	if (t && isInactiveImageTarget(t, _lastMouseX, _lastMouseY)) {
		t = null;
	}

	if (t) {
		const attach = (o, imgObj) => {
			let target = imgObj ? imgObj : o;
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
				enableContextMenus(true);
				_blockWheelZoom = false;
				return true;
			}

			setZoom(target, null, skipBadge);
			enableContextMenus(true);
			_blockWheelZoom = false;
			return true;
		};

		if (!getElData(t, _firstkey)) {
			const host = t.closest ? t.closest(".imgContainer, .richImage") : null;
			if (host) {
				const mainImg = host.querySelector("img.ovrr") || host.querySelector("img:not(.zdImgCls_b6ig4jvwe)");
				if (mainImg) {
					t = mainImg;
				}
			}

			const tag = t.tagName.toUpperCase();

			if (_zoom_bgImg) {
				const bgi = window.getComputedStyle(t).backgroundImage;
				if (/url/i.test(bgi) && tag !== "BODY") {
					const match = bgi.match(/url\(['"]?(.*?)['"]?\)/i);
					if (match && match[1]) {
						setElData(t, _bgsrckey, match[1]);
						d("Image Type", "BG");
						return attach(t);
					}
				}
			}

			if (_hoverTarget && _hoverTarget.isConnected && !isInactiveImageTarget(_hoverTarget, _lastMouseX, _lastMouseY)) {
				d("Image Type", "HoverTarget-Fallback");
				return attach(_hoverTarget);
			}

			enableContextMenus(false);
			_blockWheelZoom = true;

			if (!getPanelHost()) {
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

			if (getPanelHost()) {
				_current_element = imgObj;
			} else {
				setZoom(imgObj, null, skipBadge);
			}

			_blockWheelZoom = false;
		}
	} else {
		_blockWheelZoom = true;
		if (!getPanelHost()) {
			setZoom();
		}
	}
}

function getOffset(el) {
	const rect = el.getBoundingClientRect();
	return {
		left: rect.left + window.scrollX,
		top: rect.top + window.scrollY
	};
}

function deepElementFromPoint(x, y) {
	let el = document.elementFromPoint(x, y);
	while (el && el.shadowRoot) {
		const sel = el.shadowRoot.elementFromPoint(x, y);
		if (!sel || sel === el) break;
		el = sel;
	}
	return el;
}

function isInactiveImageTarget(el, x, y) {
	if (!el || !el.closest) return false;

	if (el.classList && el.classList.contains(_zdImgCls)) return false;

	if (el.closest(".slick-slide:not(.slick-active)")) return true;

	if (el.closest("[inert]")) return true;

	const hasPoint = typeof x === "number" && typeof y === "number";

	const hiddenRoot = el.closest('[aria-hidden="true"]');
	if (hiddenRoot) {
		if (hasPoint) {
			const top = deepElementFromPoint(x, y);
			if (top && hiddenRoot.contains(top)) return false;
		}
		return true;
	}

	if (hasPoint && (el.tagName === "IMG" || el.tagName === "CANVAS") && !getElData(el, _firstkey)) {
		const stack = deepElementsFromPoint(x, y).filter((o) => !isOwnElement(o));
		if (stack.length > 0) {
			const idx = stack.indexOf(el);
			const noPointerEvents = window.getComputedStyle(el).pointerEvents === "none";

			if (idx === -1 && !noPointerEvents) return true;

			for (let i = 0; i < idx; i++) {
				const o = stack[i];
				if (composedContains(o, el) || composedContains(el, o)) continue;
				if (o.tagName === "IMG" || o.tagName === "CANVAS" || o.tagName === "VIDEO") return true;
				if (isOpaqueCover(o)) return true;
			}

			if (!isNearRelated(el, stack[0])) return true;
		}
	}

	return false;
}

function deepElementsFromPoint(x, y, root, seen) {
	seen = seen || new Set();
	root = root || document;
	seen.add(root);
	const out = [];
	for (const e of root.elementsFromPoint(x, y)) {
		const sr = e.shadowRoot || e.openOrClosedShadowRoot;
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

function composedContains(a, b) {
	for (let n = b; n; n = composedParent(n)) {
		if (n === a) return true;
	}
	return false;
}

function isNearRelated(el, top) {
	if (composedContains(el, top) || composedContains(top, el)) return true;
	let anc = composedParent(el);
	for (let i = 0; i < 5 && anc && anc !== document.body && anc !== document.documentElement; i++) {
		if (composedContains(anc, top)) return true;
		anc = composedParent(anc);
	}
	return false;
}

function isOwnElement(o) {
	if (o.id && (o.id.startsWith("zdImg_") || o.id.startsWith("zd-"))) return true;
	return !!(o.className && typeof o.className === "string" && o.className.includes("zdImg"));
}

function isOpaqueCover(o) {
	const cs = window.getComputedStyle(o);
	if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) < 0.85) return false;

	const nums = (cs.backgroundColor.match(/[\d.]+%?/g) || []).map((n) => (n.endsWith("%") ? parseFloat(n) / 100 : parseFloat(n)));
	if (nums.length < 3) return false;
	const alpha = nums.length >= 4 ? nums[3] : 1;

	if (alpha >= 0.85) return true;

	if (alpha >= 0.3 && cs.position === "fixed") {
		const r = o.getBoundingClientRect();
		if (r.width >= window.innerWidth * 0.9 && r.height >= window.innerHeight * 0.9) return true;
	}

	return false;
}

function hitCheck(obj, clientX, clientY) {
	const rect = obj.getBoundingClientRect();
	if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
		return false;
	}

	if (isInactiveImageTarget(obj, clientX, clientY)) {
		return false;
	}

	let node = obj;
	while (node && node !== document.body && node !== document.documentElement) {
		const style = window.getComputedStyle(node);
		if (style.display === "none" || style.visibility === "hidden" || parseFloat(style.opacity) < 0.01) {
			return false;
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

const defEventCancel = (e) => {
	e.preventDefault();
	e.stopPropagation();
};

function getVisualTarget(x, y, fallback) {
	const panel = getPanelHost();
	if (panel) {
		const topEl = document.elementFromPoint(x, y);
		if (topEl && (topEl === panel || panel.contains(topEl) || (topEl.shadowRoot && topEl === panel))) {
			return null;
		}
	}

	let deepEl = document.elementFromPoint(x, y);
	while (deepEl && deepEl.shadowRoot) {
		let sel = deepEl.shadowRoot.elementFromPoint(x, y);
		if (!sel || sel === deepEl) break;
		deepEl = sel;
	}

	if (deepEl) {
		const host = deepEl.closest(".imgContainer, .richImage");
		if (host) {
			const mainImg = host.querySelector("img.ovrr") || host.querySelector("img:not(.zdImgCls_b6ig4jvwe)");
			if (mainImg) {
				return mainImg;
			}
		}
	}

	if (deepEl && (deepEl.tagName === "IMG" || deepEl.tagName === "CANVAS") && !isInactiveImageTarget(deepEl, x, y)) {
		return deepEl;
	}

	const imgs = Array.from(document.querySelectorAll("img, canvas"));
	let bestImg = null;
	let highestScore = -1;

	for (let i = 0; i < imgs.length; i++) {
		const img = imgs[i];
		const rect = img.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) continue;
		if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) continue;

		if (hitCheck(img, x, y)) {
			let score = i;

			let parent = img.parentElement;
			while (parent && parent !== document.body) {
				const pStyle = window.getComputedStyle(parent);
				const z = parseInt(pStyle.zIndex);
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
		b.style.cssText =
			"position: fixed !important; z-index: 2147483647 !important; background: rgba(0,0,0,0.15) !important; color: #fff !important; text-shadow: 0 1px 3px rgba(0,0,0,0.8) !important; padding: 5px 14px !important; border-radius: 20px !important; font-size: 13px !important; font-family: system-ui, sans-serif !important; font-weight: 500 !important; pointer-events: none !important; transition: opacity 0.2s !important; transform: translate(-50%, -50%) !important; text-align: center !important; line-height: 1.2 !important; letter-spacing: normal !important; box-shadow: 0 2px 6px rgba(0,0,0,0.15) !important; width: auto !important; height: auto !important; margin: 0 !important; border: 1px solid rgba(255,255,255,0.1) !important;";
		document.body.appendChild(b);
	}

	const data = getElData(_img_element, _firstkey);
	if (!data) return;

	const sizeData = getElData(_img_element, _sizekey);
	const curW = sizeData ? sizeData.w : _img_element.offsetWidth;
	let ratio = 100;

	if (data.sw > 0) {
		ratio = Math.round((curW / data.sw) * 100);
	}
	const rot = getElData(_img_element, _rotkey) || 0;

	let text = ratio + "%";
	if (rot !== 0) {
		text += " • " + rot + "°";
	}

	b.textContent = text;

	const rect = _img_element.getBoundingClientRect();
	if (!_img_element.isConnected || (rect.width === 0 && rect.height === 0)) {
		b.style.opacity = "0";
		return;
	}
	let cx = rect.left + rect.width / 2;

	let yOffset = 45;
	if (ratio < 100) {
		yOffset = 45 - (100 - ratio) * 0.8;
	}
	let cy = rect.top + yOffset;

	const marginX = 45;
	const marginY = 25;

	cx = Math.max(marginX, Math.min(window.innerWidth - marginX, cx));
	cy = Math.max(marginY, Math.min(window.innerHeight - marginY, cy));

	b.style.left = cx + "px";
	b.style.top = cy + "px";
	b.style.opacity = "1";

	if (_badgeTimer) {
		clearTimeout(_badgeTimer);
	}

	if (!_rightBtnDown && !_rotParam) {
		_badgeTimer = setTimeout(() => {
			if (b) {
				b.style.opacity = "0";
			}
		}, 800);
	}
}

function updateSliderFill(input) {
	const min = parseFloat(input.min) || 0;
	const max = parseFloat(input.max) || 100;
	const val = parseFloat(input.value);
	const percent = ((val - min) / (max - min)) * 100;
	input.style.setProperty("--val", `${percent}%`);
}

function syncPanelValues() {
	const panel = getPanelHost();
	const shadow = getPanelShadow();
	if (!panel || !_img_element || !shadow) return;

	document.querySelectorAll(".zdImgCls_b6ig4jvwe, .zdImgCls_imgSrcView").forEach((img) => {
		if (img !== _img_element) {
			img.style.removeProperty("outline");
			img.style.removeProperty("outline-offset");
			img.style.removeProperty("box-shadow");
		}
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

	let curZoom = Math.round((size.w / data.sw) * 100);
	let curWidth = Math.round(size.w);
	let curRot = getElData(_img_element, _rotkey) || 0;

	const zSl = shadow.getElementById("zd-sl-zoom"),
		zNum = shadow.getElementById("zd-num-zoom");
	const wSl = shadow.getElementById("zd-sl-width"),
		wNum = shadow.getElementById("zd-num-width");
	const rSl = shadow.getElementById("zd-sl-rot"),
		rNum = shadow.getElementById("zd-num-rot");
	const oSl = shadow.getElementById("zd-sl-opac"),
		oNum = shadow.getElementById("zd-num-opac");
	const bSl = shadow.getElementById("zd-sl-bright"),
		bNum = shadow.getElementById("zd-num-bright");

	let curOpac = 100;
	const rawOpac = _img_element.style.getPropertyValue("opacity") || _img_element.style.opacity;
	if (rawOpac) {
		curOpac = Math.round(parseFloat(rawOpac) * 100);
	}

	let curBright = 100;
	const rawFilter = _img_element.style.getPropertyValue("filter") || _img_element.style.filter;
	if (rawFilter && rawFilter.includes("brightness")) {
		const match = rawFilter.match(/brightness\((\d+)%\)/);
		if (match) {
			curBright = parseInt(match[1]);
		} else {
			const matchFloat = rawFilter.match(/brightness\(([\d.]+)\)/);
			if (matchFloat) curBright = Math.round(parseFloat(matchFloat[1]) * 100);
		}
	}

	const active = shadow.activeElement;
	const isSizeActive = active === zSl || active === zNum || active === wSl || active === wNum;
	const isRotActive = active === rSl || active === rNum;
	const isOpacActive = active === oSl || active === oNum;
	const isBrightActive = active === bSl || active === bNum;

	if (zSl && !isSizeActive && Math.abs(parseInt(zSl.value) - curZoom) > 1) {
		zSl.value = curZoom;
		zNum.value = curZoom;
	}
	if (wSl && !isSizeActive && Math.abs(parseInt(wSl.value) - curWidth) > 1) {
		wSl.value = curWidth;
		wNum.value = curWidth;
	}
	if (rSl && !isRotActive && parseInt(rSl.value) !== curRot) {
		rSl.value = curRot;
		rNum.value = curRot;
	}
	if (oSl && !isOpacActive && parseInt(oSl.value) !== curOpac) {
		oSl.value = curOpac;
		oNum.value = curOpac;
	}
	if (bSl && !isBrightActive && parseInt(bSl.value) !== curBright) {
		bSl.value = curBright;
		bNum.value = curBright;
	}

	[zSl, wSl, rSl, oSl, bSl].forEach((slider) => {
		if (slider) {
			updateSliderFill(slider);
		}
	});
}

function syncBaseRect(img) {
	if (!img) return;
	const data = getElData(img, _firstkey);
	if (!data || getElData(img, _srckey)) return;

	const curSize = getElData(img, _sizekey);
	const isSizeModified = curSize && (Math.abs(curSize.w - data.sw) > 2 || Math.abs(curSize.h - data.sh) > 2);
	const isRotModified = (getElData(img, _rotkey) || 0) !== 0;
	const isDragged = img.classList.contains(_draggedCls);

	if (!isSizeModified && !isRotModified && !isDragged && !img.classList.contains("zdImgCls_animated")) {
		let uw = img.offsetWidth || img.naturalWidth || 100;
		let uh = img.offsetHeight || img.naturalHeight || 100;

		let rect;
		if (img.classList.contains("fullscreen")) {
			rect = img.getBoundingClientRect();
			uw = rect.width;
			uh = rect.height;
		} else {
			rect = getRestRect(img);
		}
		let cx = rect.left + window.scrollX + rect.width / 2;
		let cy = rect.top + window.scrollY + rect.height / 2;

		const isBg = !!getElData(img, _bgsrckey);
		if (((_singleImgPage && !_zoom_ivpDrag) || img.classList.contains("fullscreen")) && !isBg && img.tagName === "IMG") {
			const winW = window.innerWidth;
			const winH = window.innerHeight;
			const fitSize = calcLimit(img.naturalWidth || uw, img.naturalHeight || uh, winW, winH);
			uw = fitSize.w;
			uh = fitSize.h;
			cx = window.scrollX + winW / 2;
			cy = window.scrollY + winH / 2;
		} else if (!isBg && img.tagName === "IMG" && img.naturalWidth > 0 && img.naturalHeight > 0) {
			const natRatio = img.naturalWidth / img.naturalHeight;
			const cssRatio = uw / uh;
			const objFit = window.getComputedStyle(img).objectFit || "fill";

			if (objFit !== "cover" && objFit !== "fill" && Math.abs(cssRatio - natRatio) > 0.01) {
				if (natRatio > cssRatio) {
					uh = uw / natRatio;
				} else {
					uw = uh * natRatio;
				}
			}
		}

		data.sw = uw;
		data.sh = uh;
		data.sx = cx - uw / 2;
		data.sy = cy - uh / 2;
		data.origSx = data.sx;
		data.origSy = data.sy;

		const compStyle = window.getComputedStyle(img);
		let newTxPct = 0;
		let newTyPct = 0;
		let newOrigMatrix = "";

		if (compStyle.transform && compStyle.transform !== "none" && !img.classList.contains("fullscreen")) {
			newOrigMatrix = compStyle.transform;
			try {
				const matrix = new DOMMatrix(compStyle.transform);
				const rawW = img.offsetWidth || 1;
				const rawH = img.offsetHeight || 1;
				newTxPct = Math.round((matrix.m41 / rawW) * 100);
				newTyPct = Math.round((matrix.m42 / rawH) * 100);
			} catch (e) {}
		}
		data.origMatrix = newOrigMatrix;
		data.txPct = newTxPct;
		data.tyPct = newTyPct;

		setElData(img, _sizekey, { w: uw, h: uh });
	}
}

function getRestRect(img) {
	const hoverWrapper = img.closest(".imgpt, .iusc, .isv-r, .mimg, a, button, figure, picture");
	if (!hoverWrapper) return img.getBoundingClientRect();

	const resetEls = [];
	let p = img;

	while (p && p !== hoverWrapper.parentElement) {
		const compStyle = window.getComputedStyle(p);
		let newTransform = null;

		if (compStyle.transform && compStyle.transform !== "none") {
			try {
				const matrix = new DOMMatrix(compStyle.transform);
				if (Math.abs(matrix.a - 1) > 0.001 || Math.abs(matrix.d - 1) > 0.001) {
					matrix.a = 1;
					matrix.d = 1;
					newTransform = matrix.toString();
				}
			} catch (e) {}
		}

		if (newTransform) {
			resetEls.push({
				el: p,
				inlineTransform: p.style.getPropertyValue("transform"),
				inlineTransformPriority: p.style.getPropertyPriority("transform"),
				inlineTransition: p.style.getPropertyValue("transition"),
				inlineTransitionPriority: p.style.getPropertyPriority("transition"),
				newTransform: newTransform
			});
		}
		p = p.parentElement;
	}

	if (resetEls.length === 0) return img.getBoundingClientRect();

	resetEls.forEach((item) => {
		item.el.style.setProperty("transition", "none", "important");
	});
	img.getBoundingClientRect();

	resetEls.forEach((item) => {
		item.el.style.setProperty("transform", item.newTransform, "important");
	});

	const rect = img.getBoundingClientRect();

	resetEls.forEach((item) => {
		if (item.inlineTransform) {
			item.el.style.setProperty("transform", item.inlineTransform, item.inlineTransformPriority);
		} else {
			item.el.style.removeProperty("transform");
		}
	});
	img.getBoundingClientRect();

	resetEls.forEach((item) => {
		if (item.inlineTransition) {
			item.el.style.setProperty("transition", item.inlineTransition, item.inlineTransitionPriority);
		} else {
			item.el.style.removeProperty("transition");
		}
	});

	return rect;
}

function setZoom(img, def, skipBadge = false) {
	window.removeEventListener("wheel", zoomEvent, { capture: true });
	window.removeEventListener("wheel", defEventCancel, { capture: true });

	if (_rclickTimer) {
		clearTimeout(_rclickTimer);
		_rclickTimer = null;
	}

	if (img) {
		if (_isExcludedHost) {
			_img_element = null;
			return;
		}

		d("ZoomTarget Set", "----------");
		_img_element = img;
		_current_element = img;

		if (!def && !getElData(img, _srckey)) {
			registerSwitcherImage(img);
		}

		let data = getElData(img, _firstkey);
		const isBg = !!getElData(img, _bgsrckey);

		if (!data) {
			let uw = def ? def.sw : img.offsetWidth || img.naturalWidth || 100;
			let uh = def ? def.sh : img.offsetHeight || img.naturalHeight || 100;

			let rect;
			if (def) {
				rect = img.getBoundingClientRect();
			} else if (img.classList.contains("fullscreen")) {
				rect = img.getBoundingClientRect();
				uw = rect.width;
				uh = rect.height;
			} else {
				rect = getRestRect(img);
			}
			let cx = rect.left + window.scrollX + rect.width / 2;
			let cy = rect.top + window.scrollY + rect.height / 2;

			if (
				!def &&
				((_singleImgPage && !_zoom_ivpDrag) || img.classList.contains("fullscreen")) &&
				!isBg &&
				img.tagName === "IMG"
			) {
				const winW = window.innerWidth;
				const winH = window.innerHeight;
				const fitSize = calcLimit(img.naturalWidth || uw, img.naturalHeight || uh, winW, winH);
				uw = fitSize.w;
				uh = fitSize.h;
				cx = window.scrollX + winW / 2;
				cy = window.scrollY + winH / 2;
			} else if (!def && !isBg && img.tagName === "IMG" && img.naturalWidth > 0 && img.naturalHeight > 0) {
				const natRatio = img.naturalWidth / img.naturalHeight;
				const cssRatio = uw / uh;
				const compStyle = window.getComputedStyle(img);
				const objFit = compStyle.objectFit || "fill";

				if (objFit !== "cover" && objFit !== "fill" && Math.abs(cssRatio - natRatio) > 0.01) {
					if (natRatio > cssRatio) {
						uh = uw / natRatio;
					} else {
						uw = uh * natRatio;
					}
				}
			}

			let txPct = 0,
				tyPct = 0;
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
				} catch (e) {
					d("DOMMatrix error", e.message, "error");
				}
			}

			const obj = {
				id: "zdImg_" + new Date().getTime().toString(16),
				sw: uw,
				sh: uh,
				sx: def ? def.sx : cx - uw / 2,
				sy: def ? def.sy : cy - uh / 2,
				origSx: def ? def.sx : cx - uw / 2,
				origSy: def ? def.sy : cy - uh / 2,
				txPct: txPct,
				tyPct: tyPct,
				origMatrix: origMatrix,
				origStyle: {
					left: img.style.left,
					top: img.style.top,
					width: img.style.width,
					height: img.style.height,
					maxWidth: img.style.maxWidth,
					maxHeight: img.style.maxHeight,
					minWidth: img.style.minWidth,
					minHeight: img.style.minHeight,
					transformOrigin: img.style.transformOrigin,
					transform: img.style.transform,
					zIndex: img.style.zIndex,
					objectFit: img.style.objectFit,
					backgroundImage: img.style.backgroundImage
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

		window.addEventListener("wheel", zoomEvent, { passive: false, capture: true });

		if (_zoom_rcCancel > 0) {
			_rclickTimer = setTimeout(() => {
				if (_rotParam || _zoomParam || _dragParam) return;
				setZoom();
			}, _zoom_rcCancel);
		}

		if (!skipBadge) {
			showZoomBadge();
		}
	} else {
		const panel = getPanelHost();
		if (panel) {
			syncPanelValues();
			if (panel.matches(":hover") || panel.contains(document.activeElement)) {
				applyPanelBorder();
			}
			window.addEventListener("wheel", zoomEvent, { passive: false, capture: true });
			return;
		}

		d("ZoomTarget Clear", "");

		if (_rclickHoldTimer) {
			clearTimeout(_rclickHoldTimer);
			_rclickHoldTimer = null;
		}

		let b = document.getElementById("zdImg_zoomBadge");
		if (b) {
			b.style.opacity = "0";
		}

		if (_img_element) {
			if (_zoom_autoRtn && isRcModified(_img_element)) {
				autoResetImage();
			} else {
				const data = getElData(_img_element, _firstkey);
				const size = getElData(_img_element, _sizekey);
				const rot = getElData(_img_element, _rotkey) || 0;
				const isFloating = !!getElData(_img_element, _srckey);
				const isDragged = _img_element.classList.contains(_draggedCls);

				if (
					data &&
					size &&
					Math.abs(size.w - data.sw) < 2 &&
					Math.abs(size.h - data.sh) < 2 &&
					rot === 0 &&
					!isFloating &&
					!isDragged
				) {
					if (data.origStyle && data.origStyle.zIndex !== undefined) {
						_img_element.style.removeProperty("z-index");
						_img_element.style.zIndex = data.origStyle.zIndex;
					} else {
						_img_element.style.removeProperty("z-index");
					}
				}
			}
		}

		_img_element = null;
		_ctx_show = true;
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
	return !!el && _rcModifiedEls.has(getRcKey(el));
}

function autoResetImage() {
	_rcModifiedEls.delete(getRcKey(_img_element));

	_img_element.classList.remove(_draggedCls);
	_img_element.style.removeProperty("opacity");
	_img_element.style.removeProperty("filter");
	_img_element.style.removeProperty("cursor");

	setElData(_img_element, _flipXkey, 1);
	setElData(_img_element, _flipYkey, 1);

	const src_elem = getElData(_img_element, _srckey);
	if (src_elem) {
		clearImgEx(src_elem);
		_modifiedElements.delete(src_elem);
	}

	setImageRect();
	imgRotate(0);

	const bDataReset = getElData(_img_element, _firstkey);
	if (bDataReset && bDataReset.origStyle && bDataReset.origStyle.zIndex !== undefined) {
		_img_element.style.removeProperty("z-index");
		_img_element.style.zIndex = bDataReset.origStyle.zIndex;
	} else {
		_img_element.style.removeProperty("z-index");
	}

	_modifiedElements.delete(_img_element);
}

function calcPos(zoomSize, forceFloating = false) {
	const winW = _singleImgPage ? window.innerWidth : document.documentElement.clientWidth;
	const winH = _singleImgPage ? window.innerHeight : document.documentElement.clientHeight;
	const scrX = window.scrollX;
	const scrY = window.scrollY;

	const data = getElData(_img_element, _firstkey);
	let rect = { x: data.sx, y: data.sy, w: data.sw, h: data.sh, r: data.sx + data.sw, b: data.sy + data.sh };
	let x = rect.x,
		y = rect.y;

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
	const isBg = !!getElData(origElem, _bgsrckey);
	const isFloating = forceFloating || !!getElData(_img_element, _srckey);

	if (!isDragged && !_singleImgPage && !isBg && !isFloating) {
		const scrRect = { x: scrX, y: scrY, w: winW, h: winH, r: scrX + winW, b: scrY + winH };

		const rectVisW = rect.w * cosA + rect.h * sinA;
		const rectVisH = rect.w * sinA + rect.h * cosA;
		const rectVisX = cx - rectVisW / 2;
		const rectVisY = cy - rectVisH / 2;

		if (rectVisX < scrRect.x) {
			scrRect.x = rectVisX;
		}
		if (rectVisX + rectVisW > scrRect.r) {
			scrRect.r = rectVisX + rectVisW;
		}
		if (rectVisY < scrRect.y) {
			scrRect.y = rectVisY;
		}
		if (rectVisY + rectVisH > scrRect.b) {
			scrRect.b = rectVisY + rectVisH;
		}

		if (visW <= scrRect.w) {
			if (visLeft < scrRect.x) {
				visLeft = scrRect.x;
			}
			if (visLeft + visW > scrRect.r) {
				visLeft = scrRect.r - visW;
			}
		} else {
			visLeft = scrRect.x - (visW - scrRect.w) / 2;
		}

		if (visH <= scrRect.h) {
			if (visTop < scrRect.y) {
				visTop = scrRect.y;
			}
			if (visTop + visH > scrRect.b) {
				visTop = scrRect.b - visH;
			}
		} else {
			visTop = scrRect.y - (visH - scrRect.h) / 2;
		}
	}

	x = visLeft - (zoomSize.w - visW) / 2;
	y = visTop - (zoomSize.h - visH) / 2;

	return { x: x, y: y, w: zoomSize.w, h: zoomSize.h };
}

function calcLimit(w, h, sw, sh, rot) {
	if (rot) {
		const rad = (rot * Math.PI) / 180;
		const cosA = Math.abs(Math.cos(rad));
		const sinA = Math.abs(Math.sin(rad));
		const bboxW = w * cosA + h * sinA;
		const bboxH = w * sinA + h * cosA;

		if (bboxW <= sw && bboxH <= sh) {
			return { w: w, h: h };
		}

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

	return { w: w, h: h };
}

function generateImgEx(size) {
	d("Create FloatImage", "");
	let exImgWrapper = document.getElementById(_zdExImgId);

	if (!exImgWrapper) {
		exImgWrapper = document.createElement("div");
		exImgWrapper.id = _zdExImgId;
		exImgWrapper.style.cssText =
			"position: absolute !important; top: 0 !important; left: 0 !important; margin: 0 !important; padding: 0 !important; border: none !important; z-index: 2147483640 !important; overflow: visible !important;";
		document.body.appendChild(exImgWrapper);
	}

	const data = getElData(_img_element, _firstkey);
	const isBg = !!getElData(_img_element, _bgsrckey);

	if (_singleImgPage && !document.getElementById(data.id)) {
		if (_savedScrollPos === null) {
			_savedScrollPos = { x: window.scrollX, y: window.scrollY };
		}

		document.documentElement.style.setProperty("overflow", "hidden", "important");
		document.body.style.setProperty("overflow", "hidden", "important");

		window.scrollTo(0, 0);

		if (!_zoom_ivpDrag && !isBg && _img_element.tagName === "IMG") {
			data.sx = window.scrollX + window.innerWidth / 2 - data.sw / 2;
			data.sy = window.scrollY + window.innerHeight / 2 - data.sh / 2;
		}
	}

	if (!isBg && _img_element.tagName === "IMG" && _img_element.naturalWidth > 0 && _img_element.naturalHeight > 0) {
		const natRatio = _img_element.naturalWidth / _img_element.naturalHeight;
		const cssRatio = size.w / size.h;
		if (Math.abs(cssRatio - natRatio) > 0.01) {
			size.h = size.w / natRatio;
		}
	}

	const isNativeSingleImg = _singleImgPage && !_zoom_ivpDrag && !isBg && _img_element.tagName === "IMG";
	if (!isNativeSingleImg && !getElData(_img_element, _srckey) && _img_element.isConnected) {
		const curRect = _img_element.getBoundingClientRect();
		if (curRect.width > 0 && curRect.height > 0) {
			const curCx = curRect.left + window.scrollX + curRect.width / 2;
			const curCy = curRect.top + window.scrollY + curRect.height / 2;
			data.sx = curCx - data.sw / 2;
			data.sy = curCy - data.sh / 2;
		}
	}

	if (isBg) {
		if (data && data.origStyle && data.origStyle.backgroundImage === undefined) {
			data.origStyle.backgroundImage = _img_element.style.backgroundImage;
		}
		_img_element.style.setProperty("background-image", "none", "important");
	} else {
		_img_element.style.setProperty("visibility", "hidden", "important");

		const hostContainer = _img_element.closest(".imgContainer, .mainContainer, .richImage");
		if (hostContainer) {
			hostContainer.querySelectorAll("img:not(." + _zdImgCls + ")").forEach((sibImg) => {
				if (sibImg !== _img_element) {
					if (!sibImg.hasAttribute("data-zd-orig-vis")) {
						sibImg.setAttribute("data-zd-orig-vis", sibImg.style.visibility || "empty");
					}
					sibImg.style.setProperty("visibility", "hidden", "important");
				}
			});
		}

		lockContainers(getElData(_img_element, _srckey) || _img_element);
	}

	_img_element.style.removeProperty("outline");
	_img_element.style.removeProperty("outline-offset");
	_img_element.style.removeProperty("box-shadow");

	const rect = calcPos({ w: size.w, h: size.h }, true);
	const rot = getElData(_img_element, _rotkey);
	let img = document.getElementById(data.id);

	if (!img) {
		img = document.createElement("img");
		img.id = data.id;
		img.className = _zdImgCls;
		img.src = _img_element.currentSrc || getElData(_img_element, _bgsrckey) || _img_element.getAttribute("src");

		if (_img_element.srcset) {
			img.srcset = _img_element.srcset;
		}
		if (_img_element.sizes) {
			img.sizes = _img_element.sizes;
		}

		const compStyle = window.getComputedStyle(_img_element);
		let objFit = compStyle.objectFit || "fill";

		if (objFit === "scale-down" || objFit === "none") {
			objFit = "contain";
		}

		if (isBg) {
			const bgSize = compStyle.backgroundSize || "";
			if (bgSize.includes("contain")) {
				objFit = "contain";
			} else {
				objFit = "cover";
			}
		}

		img.style.setProperty("position", "absolute", "important");
		img.style.setProperty("display", "block", "important");
		img.style.setProperty("object-fit", objFit, "important");
		img.style.setProperty("object-position", compStyle.objectPosition || "center", "important");
		img.style.setProperty("box-sizing", "border-box", "important");
		img.style.setProperty("margin", "0", "important");
		img.style.setProperty("padding", "0", "important");
		img.style.setProperty("border", "none", "important");

		if (_img_element.style.opacity) {
			img.style.setProperty("opacity", _img_element.style.opacity, "important");
		}
		if (_img_element.style.filter) {
			img.style.setProperty("filter", _img_element.style.filter, "important");
		}

		img.addEventListener("mouseover", (e) => e.preventDefault());
		img.addEventListener("drag", (e) => e.preventDefault());
		img.addEventListener("dragstart", (e) => e.preventDefault());
		img.addEventListener("dragend", (e) => e.preventDefault());
		img.addEventListener("pointerdown", (e) => e.stopPropagation());

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

		setElData(img, _srckey, _img_element);
		attachEvent(img);
		setZoom(img, { sx: data.sx, sy: data.sy, sw: data.sw, sh: data.sh });
		setImageRect({ w: rect.w, h: rect.h });
		imgRotate(rot);

		showZoomBadge();
	}

	startExImgObserver();
}

function clearImgEx(src_elem, size) {
	d("Delete FloatImage", "");
	const data = getElData(_img_element, _firstkey);
	const rot = getElData(_img_element, _rotkey);

	const isBg = !!getElData(src_elem, _bgsrckey);
	if (isBg) {
		const srcData = getElData(src_elem, _firstkey);
		src_elem.style.removeProperty("background-image");
		if (srcData && srcData.origStyle && srcData.origStyle.backgroundImage !== undefined) {
			src_elem.style.backgroundImage = srcData.origStyle.backgroundImage;
		}
	} else {
		restoreSelfVisibility(src_elem);

		const hostContainer = src_elem.closest(".imgContainer, .mainContainer, .richImage");
		if (hostContainer) {
			hostContainer.querySelectorAll("img[data-zd-orig-vis]").forEach((sibImg) => {
				const origVis = sibImg.getAttribute("data-zd-orig-vis");
				if (origVis === "empty") {
					sibImg.style.removeProperty("visibility");
				} else {
					sibImg.style.setProperty("visibility", origVis);
				}
				sibImg.removeAttribute("data-zd-orig-vis");
			});
		}

		unlockContainers(src_elem);

		if (_singleImgPage && !document.querySelector("." + _imgSrcViewCls)) {
			document.documentElement.style.removeProperty("overflow");
			document.body.style.removeProperty("overflow");

			if (_savedScrollPos !== null) {
				window.scrollTo(_savedScrollPos.x, _savedScrollPos.y);
				_savedScrollPos = null;
			}
		}
	}

	if (_img_element.style.opacity) {
		src_elem.style.setProperty("opacity", _img_element.style.opacity, "important");
	} else {
		src_elem.style.removeProperty("opacity");
	}

	if (_img_element.style.filter) {
		src_elem.style.setProperty("filter", _img_element.style.filter, "important");
	} else {
		src_elem.style.removeProperty("filter");
	}

	src_elem.style.removeProperty("outline");
	src_elem.style.removeProperty("outline-offset");
	src_elem.style.removeProperty("box-shadow");

	const floatImg = _img_element;
	const pnt = floatImg.closest("a");
	if (pnt && pnt.parentNode === document.getElementById(_zdExImgId)) {
		pnt.remove();
	} else {
		floatImg.remove();
	}

	_modifiedElements.delete(floatImg);
	elementDataMap.delete(floatImg);

	setZoom(src_elem, { sx: data.sx, sy: data.sy, sw: data.sw, sh: data.sh });
	setImageRect(size);
	imgRotate(rot);

	showZoomBadge();

	const exWrapper = document.getElementById(_zdExImgId);
	if (!exWrapper || exWrapper.children.length === 0) {
		stopExImgObserver();
	}
}

function checkSingleImgActivation(element, curW, curH) {
	if (!_singleImgPage || !element || !element.classList.contains(_imgSrcViewCls)) return;

	const data = getElData(element, _firstkey);
	if (!data) return;

	const rot = getElData(element, _rotkey) || 0;
	const flipX = getElData(element, _flipXkey) || 1;
	const flipY = getElData(element, _flipYkey) || 1;

	const hasOpacity = element.style.opacity && parseFloat(element.style.opacity) !== 1;
	const hasBright = element.style.filter && !element.style.filter.includes("brightness(100%)");

	const isDragged = element.classList.contains(_draggedCls);

	const isUnmodified =
		!isDragged &&
		Math.abs(curW - data.sw) < 2 &&
		Math.abs(curH - data.sh) < 2 &&
		rot === 0 &&
		flipX === 1 &&
		flipY === 1 &&
		!hasOpacity &&
		!hasBright;

	if (isUnmodified) {
		element.style.setProperty("cursor", "zoom-in", "important");
		element.classList.remove(_zdImgCls);
		element.style.removeProperty("outline");
		element.style.removeProperty("outline-offset");
		element.style.removeProperty("box-shadow");
	} else {
		element.style.setProperty("cursor", "grab", "important");
		element.classList.add(_zdImgCls);

		element.style.removeProperty("outline");
		element.style.removeProperty("outline-offset");
		element.style.removeProperty("box-shadow");

		if (typeof _img_element !== "undefined" && _img_element !== element) {
			setZoom(element, null, true);
		}
	}
}

function ensureElevatedZIndex(el) {
	if (!el) return;
	touchModified(el);

	const currentZ = parseInt(el.style.getPropertyValue("z-index")) || 0;

	if (currentZ === _zIndexCounter && _zIndexCounter >= 10) {
		bringFloatingToFront(el);
		return;
	}

	_zIndexCounter++;
	if (_zIndexCounter > 1000000) _zIndexCounter = 10;
	el.style.setProperty("z-index", _zIndexCounter.toString(), "important");

	bringFloatingToFront(el);
}

function bringFloatingToFront(el) {
	const exImgWrapper = document.getElementById(_zdExImgId);
	if (exImgWrapper && exImgWrapper.contains(el)) {
		const aWrap = el.closest("a");
		const targetNode = (aWrap && aWrap.parentElement === exImgWrapper) ? aWrap : el;
		if (targetNode.parentElement === exImgWrapper && exImgWrapper.lastElementChild !== targetNode) {
			exImgWrapper.appendChild(targetNode);
		}
	}
}

function setImageRect(size, element) {
	if (!element) {
		element = _img_element;
	}
	const data = getElData(element, _firstkey);

	if (!size && !getElData(element, _srckey)) {
		unlockContainers(element);
		if (data && data.origStyle) {
			element.style.removeProperty("left");
			element.style.removeProperty("top");
			element.style.removeProperty("width");
			element.style.removeProperty("height");
			element.style.removeProperty("max-width");
			element.style.removeProperty("max-height");
			element.style.removeProperty("min-width");
			element.style.removeProperty("min-height");
			element.style.removeProperty("transform-origin");
			element.style.removeProperty("object-fit");
			element.style.removeProperty("background-image");
			element.style.removeProperty("cursor");
			element.style.removeProperty("flex-shrink");
			element.style.removeProperty("contain");

			element.style.left = data.origStyle.left;
			element.style.top = data.origStyle.top;
			element.style.width = data.origStyle.width;
			element.style.height = data.origStyle.height;
			element.style.maxWidth = data.origStyle.maxWidth;
			element.style.maxHeight = data.origStyle.maxHeight;
			element.style.minWidth = data.origStyle.minWidth || "";
			element.style.minHeight = data.origStyle.minHeight || "";
			element.style.transformOrigin = data.origStyle.transformOrigin;
			element.style.objectFit = data.origStyle.objectFit || "";

			if (data.origStyle.backgroundImage !== undefined) {
				element.style.backgroundImage = data.origStyle.backgroundImage;
			}
		} else {
			element.style.removeProperty("left");
			element.style.removeProperty("top");
			element.style.removeProperty("width");
			element.style.removeProperty("height");
			element.style.removeProperty("max-width");
			element.style.removeProperty("max-height");
			element.style.removeProperty("min-width");
			element.style.removeProperty("min-height");
			element.style.removeProperty("transform-origin");
			element.style.removeProperty("object-fit");
			element.style.removeProperty("background-image");
			element.style.removeProperty("cursor");
			element.style.removeProperty("flex-shrink");
			element.style.removeProperty("contain");
		}

		if (data && data.origSx !== undefined) {
			data.sx = data.origSx;
			data.sy = data.origSy;
		}

		if (((_singleImgPage && !_zoom_ivpDrag) || element.classList.contains("fullscreen")) && element.tagName === "IMG") {
			if (data) {
				const winW = window.innerWidth;
				const winH = window.innerHeight;
				const fitSize = calcLimit(element.naturalWidth || 100, element.naturalHeight || 100, winW, winH);
				data.sw = fitSize.w;
				data.sh = fitSize.h;
				data.sx = window.scrollX + winW / 2 - fitSize.w / 2;
				data.sy = window.scrollY + winH / 2 - fitSize.h / 2;
			}
		}

		const isSinglePageImg = _singleImgPage && element.classList.contains(_imgSrcViewCls);
		if (isSinglePageImg) {
			const winW = window.innerWidth;
			const winH = window.innerHeight;

			const natW = element.naturalWidth || data.sw;
			const natH = element.naturalHeight || data.sh;
			const newFit = calcLimit(natW, natH, winW, winH);

			data.sw = newFit.w;
			data.sh = newFit.h;

			const nLeft = window.scrollX + (winW - newFit.w) / 2;
			const nTop = window.scrollY + (winH - newFit.h) / 2;

			element.style.setProperty("width", newFit.w + "px", "important");
			element.style.setProperty("height", newFit.h + "px", "important");
			element.style.setProperty("min-width", newFit.w + "px", "important");
			element.style.setProperty("min-height", newFit.h + "px", "important");
			element.style.setProperty("left", nLeft + "px", "important");
			element.style.setProperty("top", nTop + "px", "important");

			data.sx = nLeft;
			data.sy = nTop;

			element.style.setProperty("cursor", "zoom-in", "important");
			element.classList.remove(_zdImgCls);

			element.style.removeProperty("outline");
			element.style.removeProperty("outline-offset");
			element.style.removeProperty("box-shadow");
		}

		setElData(element, _sizekey, { w: data.sw, h: data.sh });
		d("ImageSize Reset", data.sw + ", " + data.sh);

		if (!element || element === _img_element) {
			syncPanelValues();
		}
		return;
	}

	const rect = size ? calcPos({ w: size.w, h: size.h }) : { x: data.sx, y: data.sy, w: data.sw, h: data.sh };

	if (size) {
		lockContainers(getElData(element, _srckey) || element);

		const host = element.closest(".imgContainer, .mainContainer, .richImage");
		if (host) {
			host.querySelectorAll(".overlayContainer, img:not(." + _zdImgCls + ")").forEach((sib) => {
				if (sib !== element && !element.contains(sib) && sib.style.visibility !== "hidden") {
					if (!sib.hasAttribute("data-zd-orig-vis")) {
						sib.setAttribute("data-zd-orig-vis", sib.style.visibility || "empty");
					}
					sib.style.setProperty("visibility", "hidden", "important");
				}
			});
		}
	} else if (!getElData(element, _srckey)) {
		const host = element.closest(".imgContainer, .mainContainer, .richImage");
		if (host) {
			host.querySelectorAll("[data-zd-orig-vis]").forEach((sib) => {
				const origVis = sib.getAttribute("data-zd-orig-vis");
				if (origVis === "empty") sib.style.removeProperty("visibility");
				else sib.style.setProperty("visibility", origVis);
				sib.removeAttribute("data-zd-orig-vis");
			});
		}
	}

	ensureElevatedZIndex(element);

	const isSinglePageImg = _singleImgPage && element.classList.contains(_imgSrcViewCls);
	if (getElData(element, _srckey) || isSinglePageImg) {
		element.style.setProperty("left", rect.x + "px", "important");
		element.style.setProperty("top", rect.y + "px", "important");
	}

	element.style.setProperty("width", rect.w + "px", "important");
	element.style.setProperty("height", rect.h + "px", "important");
	element.style.setProperty("min-width", rect.w + "px", "important");
	element.style.setProperty("min-height", rect.h + "px", "important");
	element.style.setProperty("max-width", "none", "important");
	element.style.setProperty("max-height", "none", "important");

	element.style.setProperty("flex-shrink", "0", "important");
	element.style.setProperty("contain", "none", "important");
	element.style.setProperty("transform-origin", "50% 50%", "important");

	if (!getElData(element, _srckey)) {
		element.style.setProperty("object-fit", "contain", "important");

		const data = getElData(element, _firstkey);
		const rot = getElData(element, _rotkey) || 0;
		const flipX = getElData(element, _flipXkey) || 1;
		const flipY = getElData(element, _flipYkey) || 1;
		const hasOpac = element.style.opacity && parseFloat(element.style.opacity) !== 1;
		const hasBright = element.style.filter && !element.style.filter.includes("brightness(100%)") && !element.style.filter.includes("brightness(1)");

		if ((data && (Math.abs(rect.w - data.sw) > 2 || Math.abs(rect.h - data.sh) > 2)) || rot !== 0 || flipX !== 1 || flipY !== 1 || hasOpac || hasBright) {
			element.style.setProperty("cursor", "default", "important");
		} else {
			element.style.removeProperty("cursor");
		}
	}

	setElData(element, _sizekey, { w: rect.w, h: rect.h });
	d("ImageSize", rect.w + ", " + rect.h);

	if (isSinglePageImg) {
		checkSingleImgActivation(element, rect.w, rect.h);
	}

	if (!element || element === _img_element) {
		syncPanelValues();
	}
}

function imgRotate(rot, element) {
	if (!element) {
		element = _img_element;
	}

	const isFullscreen = element.classList.contains("fullscreen");
	if (
		((_singleImgPage && !element.classList.contains(_imgSrcViewCls)) || isFullscreen) &&
		!getElData(element, _srckey) &&
		rot !== 0
	) {
		const size = getElData(element, _sizekey) || { w: element.offsetWidth, h: element.offsetHeight };
		generateImgEx(size);
		element = _img_element;

		if (typeof _rotParam !== "undefined" && _rotParam && _rotParam.obj) {
			_rotParam.obj = _img_element;
		}
	}

	const flipX = getElData(element, _flipXkey) || 1;
	const flipY = getElData(element, _flipYkey) || 1;

	if (rot !== 0 || flipX !== 1 || flipY !== 1 || getElData(element, _srckey)) {
		lockContainers(getElData(element, _srckey) || element);
		ensureElevatedZIndex(element);

		const host = element.closest(".imgContainer, .mainContainer, .richImage");
		if (host) {
			host.querySelectorAll(".overlayContainer, img:not(." + _zdImgCls + ")").forEach((sib) => {
				if (sib !== element && !element.contains(sib) && sib.style.visibility !== "hidden") {
					if (!sib.hasAttribute("data-zd-orig-vis")) {
						sib.setAttribute("data-zd-orig-vis", sib.style.visibility || "empty");
					}
					sib.style.setProperty("visibility", "hidden", "important");
				}
			});
		}
	} else if (rot === 0 && flipX === 1 && flipY === 1 && !getElData(element, _srckey)) {
		const data = getElData(element, _firstkey);
		const size = getElData(element, _sizekey);
		if (data && size && Math.abs(size.w - data.sw) < 2) {
			const host = element.closest(".imgContainer, .mainContainer, .richImage");
			if (host) {
				host.querySelectorAll("[data-zd-orig-vis]").forEach((sib) => {
					const origVis = sib.getAttribute("data-zd-orig-vis");
					if (origVis === "empty") sib.style.removeProperty("visibility");
					else sib.style.setProperty("visibility", origVis);
					sib.removeAttribute("data-zd-orig-vis");
				});
			}
		}
	}

	if (rot === 0 && flipX === 1 && flipY === 1) {
		if (!getElData(element, _srckey)) {
			const data = getElData(element, _firstkey);
			if (data && data.origStyle && data.origStyle.transform) {
				element.style.removeProperty("transform");
				element.style.transform = data.origStyle.transform;
			} else {
				element.style.removeProperty("transform");
			}
		} else {
			element.style.setProperty("transform", "none", "important");
		}
	} else {
		let transformStr = `rotate(${rot}deg) scale(${flipX}, ${flipY})`;
		const data = getElData(element, _firstkey);

		if (data && !getElData(element, _srckey)) {
			const size = getElData(element, _sizekey);
			const hasOpac = element.style.opacity && parseFloat(element.style.opacity) !== 1;
			const hasBright = element.style.filter && !element.style.filter.includes("brightness(100%)") && !element.style.filter.includes("brightness(1)");

			if (rot !== 0 || flipX !== 1 || flipY !== 1 || (size && data && (Math.abs(size.w - data.sw) > 2 || Math.abs(size.h - data.sh) > 2)) || hasOpac || hasBright) {
				element.style.setProperty("cursor", "default", "important");
			} else {
				element.style.removeProperty("cursor");
			}

			let baseTransform = "";
			if (data.origStyle && data.origStyle.transform && data.origStyle.transform !== "none") {
				baseTransform = data.origStyle.transform;
			} else if (data.txPct !== 0 || data.tyPct !== 0) {
				baseTransform = `translate(${data.txPct}%, ${data.tyPct}%)`;
			} else if (data.origMatrix && data.origMatrix !== "none") {
				baseTransform = data.origMatrix;
			}

			if (baseTransform) {
				transformStr = `${baseTransform} rotate(${rot}deg) scale(${flipX}, ${flipY})`;
			} else {
				transformStr = `rotate(${rot}deg) scale(${flipX}, ${flipY})`;
			}

			element.style.setProperty("transform-origin", "50% 50%", "important");
		}

		element.style.setProperty("transform", transformStr, "important");
	}

	d("ImageRotate deg", rot);
	setElData(element, _rotkey, rot);

	if (_singleImgPage && element.classList.contains(_imgSrcViewCls)) {
		const size = getElData(element, _sizekey);
		if (size) {
			checkSingleImgActivation(element, size.w, size.h);
		}
	}

	if (!element || element === _img_element) {
		syncPanelValues();
	}
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

	const tag = _img_element.tagName.toUpperCase();
	const origElem = getElData(_img_element, _srckey) || _img_element;
	const isBg = !!getElData(origElem, _bgsrckey);

	if (w < minWidth) {
		w = minWidth;
		if (!isBg && tag === "IMG" && _img_element.naturalWidth > 0 && _img_element.naturalHeight > 0) {
			h = w / (_img_element.naturalWidth / _img_element.naturalHeight);
		} else {
			h = (data.sh / data.sw) * minWidth;
		}
	}

	let floating = _zoom_ctrlRvs ? _accKeyState.ctrl : !_accKeyState.ctrl;

	if (tag === "CANVAS") floating = false;
	if (isBg) floating = true;
	if (_singleImgPage) {
		floating = !_img_element.classList.contains(_imgSrcViewCls);
	}
	if (_img_element.classList.contains("fullscreen") || origElem.classList.contains("fullscreen")) {
		floating = true;
	}

	d("Floating zoom", floating);

	if (!isBg && tag === "IMG" && _img_element.naturalWidth > 0 && _img_element.naturalHeight > 0) {
		const natRatio = _img_element.naturalWidth / _img_element.naturalHeight;
		const cssRatio = w / h;
		if (Math.abs(cssRatio - natRatio) > 0.01) {
			h = w / natRatio;
		}
	}

	if (isZoomLimit) {
		const rot = getElData(_img_element, _rotkey);
		const limsiz = calcLimit(w, h, winW, winH, rot);
		w = limsiz.w;
		h = limsiz.h;
	}

	if (!src_elem) {
		if (!floating) {
			setImageRect({ w: w, h: h });
		} else {
			generateImgEx({ w: w, h: h });
		}
	} else {
		if (!floating) {
			clearImgEx(src_elem, { w: w, h: h });
		} else {
			setImageRect({ w: w, h: h });
		}
	}

	showZoomBadge();
}

function sizeFit() {
	if (getPanelHost() && _rightBtnDown && _current_element && _img_element !== _current_element) {
		const isSameGroup =
			_img_element &&
			(_img_element === _current_element ||
				getElData(_img_element, _srckey) === _current_element ||
				getElData(_current_element, _srckey) === _img_element);

		if (!isSameGroup) {
			setZoom(_current_element, null, true);
			syncPanelValues();
		}
	}

	if (_img_element) {
		disableAnim(_img_element);
		syncBaseRect(_img_element);
		_img_element.classList.remove(_draggedCls);

		_img_element.style.removeProperty("opacity");
		_img_element.style.removeProperty("filter");
		_img_element.style.removeProperty("outline");
		_img_element.style.removeProperty("outline-offset");
		_img_element.style.removeProperty("box-shadow");

		setElData(_img_element, _flipXkey, 1);
		setElData(_img_element, _flipYkey, 1);

		const data = getElData(_img_element, _firstkey);
		if (data && data.origStyle && data.origStyle.zIndex !== undefined) {
			_img_element.style.removeProperty("z-index");
			_img_element.style.zIndex = data.origStyle.zIndex;
		} else {
			_img_element.style.removeProperty("z-index");
		}

		enableAnim(_img_element);

		const src_elem = getElData(_img_element, _srckey);
		const bRect = _img_element.getBoundingClientRect();
		const w = bRect.width;
		const h = bRect.height;

		const nw = _img_element.naturalWidth;
		const nh = _img_element.naturalHeight;

		let floating = _zoom_ctrlRvs ? _accKeyState.ctrl : !_accKeyState.ctrl;
		const tag = _img_element.tagName.toUpperCase();
		const origElem = getElData(_img_element, _srckey) || _img_element;
		const isBg = !!getElData(origElem, _bgsrckey);

		if (tag === "CANVAS") floating = false;
		if (isBg) floating = true;
		if (_singleImgPage) {
			floating = !_img_element.classList.contains(_imgSrcViewCls);
		}
		if (_img_element.classList.contains("fullscreen") || origElem.classList.contains("fullscreen")) {
			floating = true;
		}

		d("Floating zoom", floating);

		if (!src_elem) {
			const rot = getElData(_img_element, _rotkey) || 0;
			const flipX = getElData(_img_element, _flipXkey) || 1;
			const flipY = getElData(_img_element, _flipYkey) || 1;
			const isFit = Math.abs(w - data.sw) < 2 && Math.abs(h - data.sh) < 2 && rot === 0 && flipX === 1 && flipY === 1;

			if (isFit && tag === "IMG") {
				if (nw > data.sw && nh > data.sh && floating) {
					generateImgEx({ w: w, h: h });
				}
				setImageRect({ w: nw, h: nh });
			} else {
				setImageRect();
				imgRotate(0);
			}
		} else {
			imgRotate(0);
			clearImgEx(src_elem);
		}

		showZoomBadge();
		markRcModified();
		_ctx_show = false;
		return false;
	}
	return true;
}

function windowFiting(fromCtxMenu) {
	if (getPanelHost() && _rightBtnDown && _current_element && _img_element !== _current_element) {
		const isSameGroup =
			_img_element &&
			(_img_element === _current_element ||
				getElData(_img_element, _srckey) === _current_element ||
				getElData(_current_element, _srckey) === _img_element);

		if (!isSameGroup) {
			setZoom(_current_element, null, true);
			syncPanelValues();
		}
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
			data.sx = window.scrollX + winW / 2 - data.sw / 2;
			data.sy = window.scrollY + winH / 2 - data.sh / 2;
		}

		zoom(10000, true);
		markRcModified();
		_ctx_show = false;

		if (!getElData(_img_element, _srckey) && !_singleImgPage) {
			_img_element.scrollIntoView();
		}
		return false;
	} else if (fromCtxMenu && _current_element) {
		setZoom(_current_element);

		if (_img_element) {
			windowFiting();
		}
		setZoom();
	}
	return true;
}

function zoomEvent(e) {
	if (_isExcludedHost) {
		window.removeEventListener("wheel", zoomEvent, { capture: true });
		return;
	}

	if (getPanelHost() && _rightBtnDown && _current_element && _img_element !== _current_element) {
		const isSameGroup =
			_img_element &&
			(_img_element === _current_element ||
				getElData(_img_element, _srckey) === _current_element ||
				getElData(_current_element, _srckey) === _img_element);

		if (!isSameGroup) {
			setZoom(_current_element, null, true);
			syncPanelValues();
		}
	}

	if (!_img_element) {
		if (_singleImgPage && _hoverTarget) {
			setZoom(_hoverTarget, null, true);
		} else {
			d("Zoom Event Aborted", "Target image is missing", "warn");
			window.removeEventListener("wheel", zoomEvent, { capture: true });
			return;
		}
	}

	disableAnim(_img_element);
	syncBaseRect(_img_element);

	if (_blockWheelZoom && _rightBtnDown) {
		return;
	}

	const panel = getPanelHost();
	if (panel && panel.contains(e.target)) return;

	if ((!_singleImgPage || !_zoom_ivpDrag) && !_rightBtnDown) {
		return;
	}

	let delta = e.deltaY ? -e.deltaY : e.wheelDelta ? e.wheelDelta : -e.detail;
	d("Wheel delta", delta);
	delta = _zoom_reverse ? -delta : delta;

	const wheelSteps = e.deltaMode === 0 && e.deltaY && Math.abs(e.deltaY) < 40 ? Math.abs(e.deltaY) / 40 : 1;
	const dim = _zoom_dim * 0.01 * wheelSteps;
	const r = delta < 0 ? 1 - dim : delta > 0 ? 1 + dim : 1;

	if (_rclickTimer) {
		clearTimeout(_rclickTimer);
		_rclickTimer = setTimeout(() => {
			if (_rotParam || _zoomParam) return;
			setZoom();
		}, _zoom_rcCancel);
	}

	if (_accKeyState.alt) {
		imgRotate(normalizeRot(getElData(_img_element, _rotkey) + _zoom_rotd * (delta < 0 ? 1 : -1)));
		showZoomBadge();
	} else {
		let floating = _zoom_ctrlRvs ? _accKeyState.ctrl : !_accKeyState.ctrl;
		const origElem = getElData(_img_element, _srckey) || _img_element;
		const isBg = !!getElData(origElem, _bgsrckey);

		if (_img_element.tagName && _img_element.tagName.toUpperCase() === "CANVAS") floating = false;
		if (isBg) floating = true;
		if (_singleImgPage) {
			floating = !_img_element.classList.contains(_imgSrcViewCls);
		}
		if (_img_element.classList.contains("fullscreen") || origElem.classList.contains("fullscreen")) {
			floating = true;
		}

		if (floating && _zoom_trackCursor) {
			if (!getElData(_img_element, _srckey)) {
				const size = getElData(_img_element, _sizekey);
				let w = size.w;
				let h = size.h;

				if (!isBg && _img_element.tagName === "IMG" && _img_element.naturalWidth > 0 && _img_element.naturalHeight > 0) {
					const natRatio = _img_element.naturalWidth / _img_element.naturalHeight;
					const cssRatio = w / h;
					if (Math.abs(cssRatio - natRatio) > 0.01) {
						h = w / natRatio;
					}
				}
				generateImgEx({ w: w, h: h });
			}

			if (!_img_element.classList.contains(_draggedCls)) {
				_img_element.classList.add(_draggedCls);
			}

			const rect = _img_element.getBoundingClientRect();
			const cx = rect.left + window.scrollX + rect.width / 2;
			const cy = rect.top + window.scrollY + rect.height / 2;

			zoom(r);

			const newRect = _img_element.getBoundingClientRect();
			if (rect.width > 0 && rect.height > 0) {
				const actualR = newRect.width / rect.width;
				const ncx = newRect.left + window.scrollX + newRect.width / 2;
				const ncy = newRect.top + window.scrollY + newRect.height / 2;

				const rendered_Mx = ncx + (e.pageX - cx) * actualR;
				const rendered_My = ncy + (e.pageY - cy) * actualR;

				const directionMultiplier = r > 1 ? -1 : 1;

				const shiftX = (e.pageX - rendered_Mx) * directionMultiplier;
				const shiftY = (e.pageY - rendered_My) * directionMultiplier;

				const currentLeft = parseFloat(_img_element.style.left) || getOffset(_img_element).left;
				const currentTop = parseFloat(_img_element.style.top) || getOffset(_img_element).top;

				_img_element.style.setProperty("left", currentLeft + shiftX + "px", "important");
				_img_element.style.setProperty("top", currentTop + shiftY + "px", "important");

				const data = getElData(_img_element, _firstkey);
				if (data) {
					data.sx += shiftX;
					data.sy += shiftY;
				}
			}
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
		setZoom(_current_element);
		enableAnim(_img_element);
		zoom(zin ? 2.0 : 0.5);
		if (!_singleImgPage) setZoom();
	}
}

function applyPanelBorder() {
	if (!getPanelHost()) return;

	if (typeof _img_element !== "undefined" && _img_element) {
		const data = getElData(_img_element, _firstkey);
		const size = getElData(_img_element, _sizekey);
		if (!data || !size) return;

		const isFloating = !!getElData(_img_element, _srckey);
		const isSingleImgView = _singleImgPage && _img_element.classList.contains(_imgSrcViewCls);
		const isDragged = _img_element.classList.contains(_draggedCls);

		if (isSingleImgView) return;

		let frame = document.getElementById("zd-panel-frame");

		if (isFloating || isDragged) {
			if (frame) frame.style.setProperty("display", "none", "important");

			_img_element.style.setProperty("outline", "2px solid rgba(53, 117, 221, 0.5)", "important");
			_img_element.style.setProperty("outline-offset", "0px", "important");
			_img_element.style.setProperty("box-shadow", "0 0 15px rgba(53, 117, 221, 0.4)", "important");
			return;
		}

		_img_element.style.setProperty("outline", "none", "important");
		_img_element.style.setProperty("box-shadow", "none", "important");

		if (!frame) {
			frame = document.createElement("div");
			frame.id = "zd-panel-frame";
			frame.style.setProperty("pointer-events", "none", "important");
			frame.style.setProperty("position", "absolute", "important");
			frame.style.setProperty("z-index", "2147483646", "important");
			frame.style.setProperty("box-sizing", "border-box", "important");
			frame.style.setProperty("margin", "0", "important");
			frame.style.setProperty("padding", "0", "important");
			frame.style.setProperty("background", "transparent", "important");
			document.body.appendChild(frame);
		}

		frame.style.setProperty("display", "block", "important");

		const isZoomed = Math.abs(size.w - data.sw) > 2 || Math.abs(size.h - data.sh) > 2;
		const rot = getElData(_img_element, _rotkey) || 0;

		const rect = _img_element.getBoundingClientRect();
		const cx = rect.left + window.scrollX + rect.width / 2;
		const cy = rect.top + window.scrollY + rect.height / 2;

		let frameX, frameY, frameW, frameH;

		if (isZoomed) {
			frameW = size.w;
			frameH = size.h;
		} else {
			if (rot % 180 === 0) {
				frameW = rect.width;
				frameH = rect.height;
			} else {
				frameW = data.sw;
				frameH = data.sh;
			}
		}

		let objectFitShrink = false;
		if (_img_element.tagName === "IMG") {
			const style = window.getComputedStyle(_img_element);
			const objFit = style.objectFit;

			if (objFit === "contain" || objFit === "scale-down") {
				const nw = _img_element.naturalWidth;
				const nh = _img_element.naturalHeight;
				if (nw > 0 && nh > 0) {
					const natRatio = nw / nh;
					const cssRatio = frameW / frameH;
					if (Math.abs(natRatio - cssRatio) > 0.01) {
						objectFitShrink = true;
						if (natRatio > cssRatio) {
							frameH = frameW / natRatio;
						} else {
							frameW = frameH * natRatio;
						}
					}
				}
			}
		}

		frameX = cx - frameW / 2;
		frameY = cy - frameH / 2;

		frame.style.setProperty("left", frameX + "px", "important");
		frame.style.setProperty("top", frameY + "px", "important");
		frame.style.setProperty("width", frameW + "px", "important");
		frame.style.setProperty("height", frameH + "px", "important");

		frame.style.setProperty("transform", `rotate(${rot}deg)`, "important");
		frame.style.setProperty("transform-origin", "50% 50%", "important");

		let frameRadius = { tl: "0px", tr: "0px", br: "0px", bl: "0px" };

		if (!objectFitShrink) {
			let checkEl = _img_element;
			const fLeft = frameX,
				fTop = frameY,
				fRight = frameX + frameW,
				fBottom = frameY + frameH;
			const tol = 1.2;
			const normRot = ((rot % 360) + 360) % 360;

			while (checkEl && checkEl !== document.body) {
				const style = window.getComputedStyle(checkEl);
				const isImg = checkEl === _img_element;

				if (isImg) {
					if (style.borderTopLeftRadius !== "0px" && frameRadius.tl === "0px")
						frameRadius.tl = style.borderTopLeftRadius;
					if (style.borderTopRightRadius !== "0px" && frameRadius.tr === "0px")
						frameRadius.tr = style.borderTopRightRadius;
					if (style.borderBottomRightRadius !== "0px" && frameRadius.br === "0px")
						frameRadius.br = style.borderBottomRightRadius;
					if (style.borderBottomLeftRadius !== "0px" && frameRadius.bl === "0px")
						frameRadius.bl = style.borderBottomLeftRadius;
				} else {
					const isClipping = style.overflow === "hidden" || style.overflow === "clip";

					if (isClipping && rot % 180 === 0 && !isZoomed && !isDragged) {
						const pRect = checkEl.getBoundingClientRect();
						const pLeft = pRect.left + window.scrollX;
						const pTop = pRect.top + window.scrollY;
						const pRight = pLeft + pRect.width;
						const pBottom = pTop + pRect.height;

						let pTl = "0px",
							pTr = "0px",
							pBr = "0px",
							pBl = "0px";

						if (Math.abs(pLeft - fLeft) <= tol && Math.abs(pTop - fTop) <= tol) pTl = style.borderTopLeftRadius;
						if (Math.abs(pRight - fRight) <= tol && Math.abs(pTop - fTop) <= tol) pTr = style.borderTopRightRadius;
						if (Math.abs(pRight - fRight) <= tol && Math.abs(pBottom - fBottom) <= tol)
							pBr = style.borderBottomRightRadius;
						if (Math.abs(pLeft - fLeft) <= tol && Math.abs(pBottom - fBottom) <= tol) pBl = style.borderBottomLeftRadius;

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

				if (frameRadius.tl !== "0px" && frameRadius.tr !== "0px" && frameRadius.br !== "0px" && frameRadius.bl !== "0px")
					break;

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

		frame.style.setProperty("border", "3px solid rgba(53, 117, 221, 0.9)", "important");
		frame.style.removeProperty("outline");
		frame.style.removeProperty("outline-offset");
		frame.style.setProperty("box-shadow", "inset 0 0 20px rgba(53, 117, 221, 0.7)", "important");

		frame.classList.remove("zdImgCls_animated");
	}
}

function removePanelBorder() {
	const frame = document.getElementById("zd-panel-frame");
	if (frame) frame.remove();

	if (typeof _img_element !== "undefined" && _img_element) {
		let targetEl = _img_element;
		const oldTrans = targetEl.style.transition;
		targetEl.style.setProperty("transition", "none", "important");

		targetEl.style.removeProperty("outline");
		targetEl.style.removeProperty("outline-offset");
		targetEl.style.removeProperty("box-shadow");

		const isSingleImgView = _singleImgPage && targetEl.classList.contains(_imgSrcViewCls);
		const src_elem = getElData(targetEl, _srckey);

		if (src_elem) {
			const data = getElData(targetEl, _firstkey);
			const size = getElData(targetEl, _sizekey);
			const rot = getElData(targetEl, _rotkey) || 0;
			const flipX = getElData(targetEl, _flipXkey) || 1;
			const flipY = getElData(targetEl, _flipYkey) || 1;
			const isDragged = targetEl.classList.contains(_draggedCls);

			let opac = 100;
			const rawOpac = targetEl.style.getPropertyValue("opacity") || targetEl.style.opacity;
			if (rawOpac) opac = Math.round(parseFloat(rawOpac) * 100);

			let bright = 100;
			const rawFilter = targetEl.style.getPropertyValue("filter") || targetEl.style.filter;
			if (rawFilter && rawFilter.includes("brightness")) {
				const match = rawFilter.match(/brightness\((\d+)%\)/);
				if (match) {
					bright = parseInt(match[1]);
				} else {
					const matchFloat = rawFilter.match(/brightness\(([\d.]+)\)/);
					if (matchFloat) bright = Math.round(parseFloat(matchFloat[1]) * 100);
				}
			}

			const isActionActive = _rotParam || _zoomParam || _dragParam;

			const isUnmodified =
				!isActionActive &&
				!isDragged &&
				rot === 0 &&
				flipX === 1 &&
				flipY === 1 &&
				opac === 100 &&
				bright === 100 &&
				data &&
				size &&
				Math.abs(size.w - data.sw) < 2 &&
				Math.abs(size.h - data.sh) < 2;

			if (isUnmodified) {
				clearImgEx(src_elem);
				_modifiedElements.delete(src_elem);
			}
		} else if (!isSingleImgView) {
			const data = getElData(targetEl, _firstkey);
			const size = getElData(targetEl, _sizekey);
			const isZoomed = data && size && (Math.abs(size.w - data.sw) > 2 || Math.abs(size.h - data.sh) > 2);

			if (!isZoomed) {
				if (!_singleImgPage) {
					targetEl.style.removeProperty("margin");
					targetEl.style.removeProperty("display");
				}
				if (data && data.origStyle) {
					targetEl.style.width = data.origStyle.width;
					targetEl.style.height = data.origStyle.height;
				}
			}
		}

		void targetEl.offsetHeight;
		if (oldTrans) {
			targetEl.style.setProperty("transition", oldTrans);
		} else {
			targetEl.style.removeProperty("transition");
		}
	}
}

async function ctxZoomCustom() {
	if (!_current_element) return;
	setZoom(_current_element);

	if (document.activeElement && document.activeElement !== document.body) {
		document.activeElement.blur();
	}

	if (_rclickTimer) {
		clearTimeout(_rclickTimer);
		_rclickTimer = null;
	}

	const initialData = getElData(_img_element, _firstkey);
	const initialSize = getElData(_img_element, _sizekey);
	if (!initialData || !initialSize) {
		setZoom();
		return;
	}

	const ensureFloating = () => {
		if (!_img_element || _img_element.tagName.toUpperCase() === "CANVAS") return;

		if (_singleImgPage && _img_element.classList.contains(_imgSrcViewCls)) {
			applyPanelBorder();
			return;
		}

		if (!getElData(_img_element, _srckey)) {
			const bData = getElData(_img_element, _firstkey);
			if (!bData) return;

			if (
				((_singleImgPage && !_zoom_ivpDrag) || _img_element.classList.contains("fullscreen")) &&
				_img_element.tagName === "IMG"
			) {
				const winW = window.innerWidth;
				const winH = window.innerHeight;
				const fitSize = calcLimit(_img_element.naturalWidth || 100, _img_element.naturalHeight || 100, winW, winH);
				bData.sw = fitSize.w;
				bData.sh = fitSize.h;
				bData.sx = window.scrollX + winW / 2 - fitSize.w / 2;
				bData.sy = window.scrollY + winH / 2 - fitSize.h / 2;
				setElData(_img_element, _sizekey, { w: bData.sw, h: bData.sh });
			} else if (_img_element.isConnected) {
				const curRect = _img_element.getBoundingClientRect();
				if (curRect.width > 0 && curRect.height > 0) {
					bData.sx = curRect.left + window.scrollX + curRect.width / 2 - bData.sw / 2;
					bData.sy = curRect.top + window.scrollY + curRect.height / 2 - bData.sh / 2;
				}
			}

			const sz = getElData(_img_element, _sizekey) || { w: bData.sw, h: bData.sh };
			generateImgEx({ w: sz.w, h: sz.h });
		}
		applyPanelBorder();
	};

	const existingPanel = getPanelHost();
	if (existingPanel) {
		if (existingPanel.matches(":hover") || panelHasFocus()) {
			ensureFloating();
			syncPanelValues();
		} else {
			syncPanelValues();
			if (!getElData(_img_element, _srckey)) {
				const needsFloat = needsFloatingForNativeZoom(_img_element);
				if (needsFloat) ensureFloating();
				else applyPanelBorder();
			}
		}
		return;
	}

	let curZoom = initialData.sw ? Math.round((initialSize.w / initialData.sw) * 100) : 100;
	let curWidth = Math.round(initialSize.w);
	let curRot = getElData(_img_element, _rotkey) || 0;

	let curOpac = 100;
	if (_img_element.style.opacity) {
		curOpac = Math.round(parseFloat(_img_element.style.opacity) * 100);
	}

	let curBright = 100;
	if (_img_element.style.filter && _img_element.style.filter.includes("brightness")) {
		const match = _img_element.style.filter.match(/brightness\((\d+)%\)/);
		if (match) {
			curBright = parseInt(match[1]);
		}
	}

	const t = (key, fallback) => (typeof browser !== "undefined" && browser.i18n && browser.i18n.getMessage(key)) || fallback;

	if (ctxZoomCustom.isBuilding) return;
	ctxZoomCustom.isBuilding = true;

	const panel = document.createElement("div");
	panel.id = _zdPanelId;
	panel.style.cssText = "position: fixed; top: 20px; right: 20px; z-index: 2147483647;";

	const shadowRoot = panel.attachShadow({ mode: "closed" });
	_panelShadow = shadowRoot;

	try {
		if (!_panelTemplate) {
			const htmlURL = browser.runtime.getURL("panel.html");
			const response = await fetch(htmlURL);
			_panelTemplate = await response.text();
		}

		const parsedPanel = new DOMParser().parseFromString(_panelTemplate, "text/html");
		const panelNodes = [];
		parsedPanel.head.querySelectorAll("style").forEach((styleEl) => panelNodes.push(styleEl));
		parsedPanel.body.childNodes.forEach((node) => panelNodes.push(node));
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
		const closeX = shadowRoot.getElementById("zd-btn-x");
		if (closeX) closeX.setAttribute("role", "button");
		shadowRoot.querySelectorAll(".zd-panel-label").forEach((label) => {
			const row = label.parentElement;
			if (!row) return;
			row.querySelectorAll("input").forEach((input) => input.setAttribute("aria-label", label.textContent));
		});

		shadowRoot.querySelector("#zd-sl-zoom").value = curZoom;
		shadowRoot.querySelector("#zd-num-zoom").value = curZoom;
		shadowRoot.querySelector("#zd-sl-width").value = curWidth;
		shadowRoot.querySelector("#zd-num-width").value = curWidth;
		shadowRoot.querySelector("#zd-sl-rot").value = curRot;
		shadowRoot.querySelector("#zd-num-rot").value = curRot;
		shadowRoot.querySelector("#zd-sl-opac").value = curOpac;
		shadowRoot.querySelector("#zd-num-opac").value = curOpac;
		shadowRoot.querySelector("#zd-sl-bright").value = curBright;
		shadowRoot.querySelector("#zd-num-bright").value = curBright;

		document.body.appendChild(panel);

		requestAnimationFrame(() => {
			if (panel && panel.isConnected) {
				const rect = panel.getBoundingClientRect();
				panel.style.left = rect.left + "px";
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

	const labels = shadowRoot.querySelectorAll(".zd-panel-label");
	labels.forEach((label) => {
		if (label.scrollWidth > label.clientWidth) {
			label.title = label.textContent;
			label.style.cursor = "help";
		}
	});

	panel.addEventListener("mouseleave", () => {
		if (shadowRoot.activeElement) {
			shadowRoot.activeElement.blur();
		}
		removePanelBorder();
	});

	panel.addEventListener("mouseenter", () => {
		let needsFloat = false;
		if (_img_element && !getElData(_img_element, _srckey)) {
			needsFloat = needsFloatingForNativeZoom(_img_element);
		}
		if (needsFloat) ensureFloating();
		else applyPanelBorder();
	});

	shadowRoot.addEventListener("mousedown", (e) => {
		const t = e.target;
		if (t.tagName.toUpperCase() === "BUTTON" || t.closest("button") || t.id === "zd-btn-x") {
			e.preventDefault();
			return;
		}
		if (t.tagName.toUpperCase() === "INPUT" || (t.id && (t.id.includes("opac") || t.id.includes("bright")))) {
			return;
		}
		if (t.id === "zd-panel-header" || t.closest("#zd-panel-header")) {
			return;
		}
		ensureFloating();
	});

	const onOutsideAction = (e) => {
		if (!getPanelHost()) {
			window.removeEventListener("mousedown", onOutsideAction, true);
			window.removeEventListener("wheel", onOutsideAction, true);
			window.removeEventListener("keydown", onOutsideAction, true);
			return;
		}
		if (e.type === "keydown" || e.type === "wheel") {
			return;
		}
		if (panel && !e.composedPath().includes(panel)) {
			removePanelBorder();
		}
	};

	window.addEventListener("mousedown", onOutsideAction, true);
	window.addEventListener("wheel", onOutsideAction, true);
	window.addEventListener("keydown", onOutsideAction, true);

	const stopProp = (e) => e.stopPropagation();
	["mousedown", "mouseup", "pointerdown", "pointerup", "wheel", "click", "dblclick", "contextmenu"].forEach((evt) => {
		shadowRoot.addEventListener(evt, stopProp);
	});

	shadowRoot.addEventListener("mouseover", (e) => {
		if (e.target.tagName === "INPUT") {
			e.target.focus();
		}
	});

	shadowRoot.addEventListener(
		"wheel",
		(e) => {
			e.preventDefault();
			const t = e.target;
			if (t.tagName === "INPUT" && (t.type === "range" || t.type === "number")) {
				const dir = e.deltaY < 0 ? 1 : -1;
				let step = 1;
				if (t.id.includes("rot")) {
					step = e.shiftKey ? 15 : 1;
				} else if (t.id.includes("width")) {
					step = e.shiftKey ? 100 : 1;
				} else if (t.id.includes("zoom")) {
					step = e.shiftKey ? 10 : 1;
				} else {
					step = e.shiftKey ? 5 : 1;
				}
				let val = parseFloat(t.value);
				if (!isNaN(val)) {
					t.value = val + dir * step;
					t.dispatchEvent(new Event("input"));
				}
			}
		},
		{ passive: false }
	);

	shadowRoot.addEventListener("mouseout", (e) => {
		if (e.target.tagName === "INPUT") {
			e.target.blur();
		}
	});

	shadowRoot.addEventListener("keydown", (e) => {
		const t = e.target;
		if (t.tagName === "INPUT" && (t.type === "range" || t.type === "number")) {
			if (e.key === "ArrowUp" || e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "ArrowLeft") {
				if (e.shiftKey) {
					e.preventDefault();
					const dir = e.key === "ArrowUp" || e.key === "ArrowRight" ? 1 : -1;
					let step = 1;
					if (t.id.includes("rot")) {
						step = 15;
					} else if (t.id.includes("width")) {
						step = 100;
					} else if (t.id.includes("zoom")) {
						step = 10;
					} else {
						step = 5;
					}
					let val = parseFloat(t.value);
					if (!isNaN(val)) {
						t.value = val + dir * step;
						t.dispatchEvent(new Event("input"));
					}
				}
			}
		}
	});

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
		panel.style.left = e.clientX - dragOffsetX + "px";
		panel.style.top = e.clientY - dragOffsetY + "px";
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
		if (!_img_element) {
			let t = getActiveImageTarget(false);
			if (t) setZoom(t, null, true);
			else return;
		}

		syncBaseRect(_img_element);

		const bData = getElData(_img_element, _firstkey);
		if (!bData) return;

		const targetW = Math.max(20, parseFloat(els.wNum.value));
		const isDefault = Math.abs(targetW - bData.sw) < 1;
		const isFloating = !!getElData(_img_element, _srckey);

		if (!isDefault || isFloating) {
			ensureFloating();
		}

		if (rafId) cancelAnimationFrame(rafId);

		rafId = requestAnimationFrame(() => {
			if (!_img_element) return;
			disableAnim(_img_element);
			syncBaseRect(_img_element);
			let targetH = (bData.sh / bData.sw) * targetW;
			const isBg = !!getElData(_img_element, _bgsrckey);
			if (!isBg && _img_element.tagName === "IMG" && _img_element.naturalWidth > 0 && _img_element.naturalHeight > 0) {
				targetH = targetW / (_img_element.naturalWidth / _img_element.naturalHeight);
			}
			setImageRect({ w: targetW, h: targetH });
			applyPanelBorder();
			showZoomBadge();
		});
	};

	const updateRot = (skipBadge = false) => {
		if (!_img_element) {
			let t = getActiveImageTarget(false);
			if (t) setZoom(t, null, true);
			else return;
		}

		syncBaseRect(_img_element);

		const rot = parseInt(els.rNum.value) || 0;
		const isFloating = !!getElData(_img_element, _srckey);
		if (rot !== 0 || isFloating) {
			ensureFloating();
		}
		disableAnim(_img_element);
		syncBaseRect(_img_element);
		imgRotate(rot);
		applyPanelBorder();
		if (!skipBadge) {
			showZoomBadge();
		}
	};

	const updateFilters = () => {
		if (!_img_element) {
			let t = getActiveImageTarget(false);
			if (t) setZoom(t, null, true);
			else return;
		}

		disableAnim(_img_element);
		syncBaseRect(_img_element);

		const opac = parseInt(els.oNum.value) || 100;
		const bright = parseInt(els.bNum.value) || 100;
		let isFloating = !!getElData(_img_element, _srckey);

		if (opac !== 100 || bright !== 100 || isFloating) {
			ensureFloating();
		}

		if (_img_element) {
			ensureElevatedZIndex(_img_element);
		}

		if (opac === 100) {
			_img_element.style.removeProperty("opacity");
		} else {
			_img_element.style.setProperty("opacity", (opac / 100).toString(), "important");
		}

		if (bright === 100) {
			_img_element.style.removeProperty("filter");
		} else {
			_img_element.style.setProperty("filter", `brightness(${bright}%)`, "important");
		}

		isFloating = !!getElData(_img_element, _srckey);

		if (!isFloating) {
			const data = getElData(_img_element, _firstkey);
			const size = getElData(_img_element, _sizekey);
			const rot = getElData(_img_element, _rotkey) || 0;
			const flipX = getElData(_img_element, _flipXkey) || 1;
			const flipY = getElData(_img_element, _flipYkey) || 1;
			const isZoomed = data && size && (Math.abs(size.w - data.sw) > 2 || Math.abs(size.h - data.sh) > 2);

			if (opac !== 100 || bright !== 100 || rot !== 0 || flipX !== 1 || flipY !== 1 || isZoomed) {
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
			if (size) {
				checkSingleImgActivation(_img_element, size.w, size.h);
			}
		}
	};

	const sync = (sl, num, type, defVal, min, max) => {
		const applyValues = (rawVal, forceInputUpdate) => {
			const bData = getElData(_img_element, _firstkey);
			if (!bData) return;

			let val = parseFloat(rawVal);
			if (isNaN(val)) val = defVal;
			if (val > max) val = max;
			if (val < min) val = min;

			sl.value = val;
			if (forceInputUpdate) {
				num.value = val;
			}

			if (type === "size") {
				if (num === els.zNum || sl === els.zSl) {
					let newW = Math.round(bData.sw * (val / 100));
					if (newW < 20) {
						newW = 20;
						val = Math.round((20 / bData.sw) * 100);
						sl.value = val;
						if (forceInputUpdate) num.value = val;
					}
					els.wSl.value = els.wNum.value = newW;
				} else {
					if (val < 20) {
						val = 20;
						sl.value = val;
						if (forceInputUpdate) num.value = val;
					}
					const newZ = Math.round((val / bData.sw) * 100);
					els.zSl.value = els.zNum.value = newZ;
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
			let val = parseFloat(e.target.value);
			if (val > max) {
				applyValues(max, true);
				updateSliderFill(sl);
			} else if (!isNaN(val)) {
				sl.value = val;
				const bData = getElData(_img_element, _firstkey);
				if (bData && type === "size") {
					if (num === els.zNum) {
						let newW = Math.round(bData.sw * (val / 100));
						if (newW < 20) newW = 20;
						els.wSl.value = els.wNum.value = newW;
						updateSliderFill(els.wSl);
					} else {
						let safeVal = val < 20 ? 20 : val;
						els.zSl.value = els.zNum.value = Math.round((safeVal / bData.sw) * 100);
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
	};

	sync(els.zSl, els.zNum, "size", 100, 1, 2000);
	sync(els.wSl, els.wNum, "size", initialData.sw, 20, 5000);
	sync(els.rSl, els.rNum, "rot", 0, -180, 180);
	sync(els.oSl, els.oNum, "filter", 100, 10, 100);
	sync(els.bSl, els.bNum, "filter", 100, 10, 200);

	const bindMiniReset = (btnId, inputEl, defaultVal) => {
		const btn = shadowRoot.getElementById(btnId);
		if (btn) {
			btn.addEventListener("click", () => {
				const val = typeof defaultVal === "function" ? defaultVal() : defaultVal;
				inputEl.value = val;
				inputEl.dispatchEvent(new Event("change"));
			});
		}
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

	btnFlipH.addEventListener("click", () => {
		if (!_img_element) {
			let t = getActiveImageTarget(false);
			if (t) setZoom(t, null, true);
			else return;
		}
		_zdSuppressBadge = true;
		ensureFloating();
		let currentX = getElData(_img_element, _flipXkey) || 1;
		currentX *= -1;
		setElData(_img_element, _flipXkey, currentX);
		updateRot();
		let b = document.getElementById("zdImg_zoomBadge");
		if (b) b.style.opacity = "0";
		_zdSuppressBadge = false;
	});

	btnFlipV.addEventListener("click", () => {
		if (!_img_element) {
			let t = getActiveImageTarget(false);
			if (t) setZoom(t, null, true);
			else return;
		}
		_zdSuppressBadge = true;
		ensureFloating();
		let currentY = getElData(_img_element, _flipYkey) || 1;
		currentY *= -1;
		setElData(_img_element, _flipYkey, currentY);
		updateRot();
		let b = document.getElementById("zdImg_zoomBadge");
		if (b) b.style.opacity = "0";
		_zdSuppressBadge = false;
	});

	const closePanel = () => {
		if (_panelFrameRafId) {
			cancelAnimationFrame(_panelFrameRafId);
			_panelFrameRafId = 0;
		}
		window.removeEventListener("mousemove", onPanelMove, true);
		window.removeEventListener("mouseup", onPanelUp, true);
		window.removeEventListener("mousedown", onOutsideAction, true);
		window.removeEventListener("wheel", onOutsideAction, true);
		window.removeEventListener("keydown", onOutsideAction, true);

		removePanelBorder();
		panel.remove();
		setZoom();
	};

	btnX.addEventListener("click", closePanel);
	shadowRoot.getElementById("zd-btn-close").addEventListener("click", closePanel);

	shadowRoot.getElementById("zd-btn-reset").addEventListener("click", () => {
		if (_singleImgPage && _zoom_ivpDrag) {
			const nimg = document.querySelector("." + _imgSrcViewCls);
			if (nimg) {
				setZoom(nimg, null, true);
				if (typeof els !== "undefined" && els.zNum) {
					els.zSl.value = els.zNum.value = 100;
					els.rSl.value = els.rNum.value = 0;
					els.oSl.value = els.oNum.value = 100;
					els.bSl.value = els.bNum.value = 100;
				}
				nimg.classList.remove(_draggedCls);
				nimg.style.removeProperty("opacity");
				nimg.style.removeProperty("filter");
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
			let t = findNextModifiedImage(null);
			if (t) setZoom(t, null, true);
		}
		if (!_img_element) return;

		const bData = getElData(_img_element, _firstkey);
		if (!bData) return;

		if (rafId) cancelAnimationFrame(rafId);

		let currentImg = _img_element;
		let finalImg = getElData(currentImg, _srckey) || currentImg;

		enableAnim(currentImg);
		currentImg.classList.remove(_draggedCls);

		const bDataReset = getElData(currentImg, _firstkey);
		if (bDataReset && bDataReset.origStyle && bDataReset.origStyle.zIndex !== undefined) {
			currentImg.style.removeProperty("z-index");
			currentImg.style.zIndex = bDataReset.origStyle.zIndex;
		} else {
			currentImg.style.removeProperty("z-index");
		}

		currentImg.style.removeProperty("opacity");
		currentImg.style.removeProperty("filter");

		setElData(currentImg, _flipXkey, 1);
		setElData(currentImg, _flipYkey, 1);

		const src_elem = getElData(currentImg, _srckey);
		if (src_elem) {
			imgRotate(0, currentImg);
			clearImgEx(src_elem);
			_modifiedElements.delete(src_elem);
		}

		setImageRect(null, finalImg);
		imgRotate(0, finalImg);

		_modifiedElements.delete(currentImg);
		_modifiedElements.delete(finalImg);
		elementDataMap.delete(currentImg);
		elementDataMap.delete(finalImg);
		finalImg.classList.remove(_draggedCls);

		unlockContainers(finalImg);
		removePanelBorder();

		const onTransitionEnd = (e) => {
			const el = e.target;
			el.removeEventListener("transitionend", onTransitionEnd);
			disableAnim(el);
		};
		finalImg.addEventListener("transitionend", onTransitionEnd);

		_lastResetElement = finalImg;

		const nextTarget = findNextModifiedImage(finalImg);

		if (nextTarget) {
			setZoom(nextTarget, null, true);
			syncPanelValues();
			applyPanelBorder();
		} else {
			setZoom(finalImg, null, true);
			syncPanelValues();

			els.zSl.value = els.zNum.value = 100;
			els.wSl.value = els.wNum.value = Math.round(bData.sw);
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

			applyPanelBorder();
		}
	});

	const showPanelToast = (message) => {
		const oldToast = shadowRoot.getElementById("zd-toast");
		if (oldToast) oldToast.remove();

		const toast = document.createElement("div");
		toast.id = "zd-toast";
		toast.setAttribute("role", "status");
		toast.textContent = message.replace(/\s*\n+\s*/g, " ");
		toast.style.cssText =
			"margin: 0 20px 16px 20px; padding: 8px 10px; border-radius: 6px; font-size: 12px; background: #e63946; color: #fff;";
		shadowRoot.appendChild(toast);
		setTimeout(() => toast.remove(), 6000);
	};

	shadowRoot.getElementById("zd-btn-save").addEventListener("click", (e) => {
		if (!_img_element) {
			let t = getActiveImageTarget(false);
			if (t) setZoom(t, null, true);
		}
		if (!_img_element) return;

		const bData = getElData(_img_element, _firstkey);
		if (!bData) return;

		const targetW = Math.max(20, parseFloat(els.wNum.value));
		let targetH = (bData.sh / bData.sw) * targetW;
		const isBg = !!getElData(_img_element, _bgsrckey);
		if (!isBg && _img_element.tagName === "IMG" && _img_element.naturalWidth > 0 && _img_element.naturalHeight > 0) {
			targetH = targetW / (_img_element.naturalWidth / _img_element.naturalHeight);
		}
		const rot = parseInt(els.rNum.value) || 0;
		const opac = parseInt(els.oNum.value) || 100;
		const bright = parseInt(els.bNum.value) || 100;

		const flipX = getElData(_img_element, _flipXkey) || 1;
		const flipY = getElData(_img_element, _flipYkey) || 1;

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
		const bgUrl = getElData(_img_element, _bgsrckey);

		const exportErrorMsg = () =>
			t(
				"panel_cors_error",
				"Could not save image.\n\nReason: The source server blocks exporting due to security policies (CORS)."
			);

		const exportCanvas = (source) => {
			try {
				ctx.setTransform(1, 0, 0, 1, 0, 0);
				ctx.clearRect(0, 0, canvas.width, canvas.height);
				ctx.filter = `brightness(${bright}%)`;
				ctx.globalAlpha = opac / 100;

				ctx.translate((canvasW * exportScale) / 2, (canvasH * exportScale) / 2);
				ctx.scale(exportScale, exportScale);
				ctx.rotate(rad);
				ctx.scale(flipX, flipY);
				ctx.drawImage(source, -targetW / 2, -targetH / 2, targetW, targetH);

				canvas.toBlob((blob) => {
					if (!blob) {
						showPanelToast(exportErrorMsg());
						return;
					}

					const now = new Date();
					const yyyy = now.getFullYear();
					const MM = String(now.getMonth() + 1).padStart(2, "0");
					const dd = String(now.getDate()).padStart(2, "0");
					const hh = String(now.getHours()).padStart(2, "0");
					const mm = String(now.getMinutes()).padStart(2, "0");
					const ss = String(now.getSeconds()).padStart(2, "0");

					const timestamp = `${yyyy}${MM}${dd}${hh}${mm}${ss}`;
					const blobUrl = URL.createObjectURL(blob);
					const link = document.createElement("a");
					link.dataset.zdIgnoreClick = "true";
					link.download = "zoom_drag_export_" + timestamp + ".png";
					link.href = blobUrl;
					document.body.appendChild(link);
					link.click();
					document.body.removeChild(link);
					setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
				}, "image/png");
			} catch (err) {
				console.error("Canvas Export Error (CORS/DataURL):", err);
				showPanelToast(exportErrorMsg());
			}
		};

		const loadImage = (url, useCors) =>
			new Promise((resolve, reject) => {
				const img = new Image();
				if (useCors) img.crossOrigin = "anonymous";
				img.onload = () => resolve(img);
				img.onerror = reject;
				img.src = url;
			});

		if (!bgUrl && srcImg.tagName && srcImg.tagName.toUpperCase() === "CANVAS") {
			exportCanvas(srcImg);
			return;
		}

		const imageUrl = bgUrl ? bgUrl : srcImg.currentSrc || srcImg.src;
		loadImage(imageUrl, true)
			.then(exportCanvas)
			.catch((err) => {
				console.error("Image Load Error:", err);
				return browser.runtime
					.sendMessage({ id: "fetch-image", url: imageUrl })
					.then((res) => {
						if (!res || !res.ok) throw new Error((res && res.error) || "fetch-image failed");
						return loadImage(res.dataUrl, false);
					})
					.then(exportCanvas);
			})
			.catch((err) => {
				console.error("Image Fallback Error:", err);
				showPanelToast(exportErrorMsg());
			});
	});

	[els.zSl, els.wSl, els.rSl, els.oSl, els.bSl].forEach((slider) => {
		if (slider) {
			updateSliderFill(slider);
		}
	});

	if (!getElData(_img_element, _srckey)) {
		const needsFloat = needsFloatingForNativeZoom(_img_element);
		if (needsFloat) ensureFloating();
		else applyPanelBorder();
	}

	const initialUrl = location.href;
	let initialSrc = _img_element ? _img_element.currentSrc || _img_element.src : null;

	let currentlyObservedImg = _img_element;

	const frameSyncObserver = new MutationObserver((mutations) => {
		if (document.getElementById("zd-panel-frame")) {
			let classChanged = false;
			for (let i = 0; i < mutations.length; i++) {
				if (mutations[i].attributeName === "class") {
					classChanged = true;
					break;
				}
			}

			if (classChanged && _img_element && !getElData(_img_element, _srckey)) {
				const inlineTransform = _img_element.style.getPropertyValue("transform");
				const inlinePriority = _img_element.style.getPropertyPriority("transform");

				_img_element.style.removeProperty("transform");

				const compStyle = window.getComputedStyle(_img_element);
				let newTxPct = 0;
				let newTyPct = 0;
				let newOrigMatrix = "";

				if (compStyle.transform && compStyle.transform !== "none") {
					newOrigMatrix = compStyle.transform;
					try {
						const matrix = new DOMMatrix(compStyle.transform);
						const rawW = _img_element.offsetWidth || 1;
						const rawH = _img_element.offsetHeight || 1;
						newTxPct = Math.round((matrix.m41 / rawW) * 100);
						newTyPct = Math.round((matrix.m42 / rawH) * 100);
					} catch (e) {}
				}

				const data = getElData(_img_element, _firstkey);
				const size = getElData(_img_element, _sizekey);

				if (data) {
					data.origMatrix = newOrigMatrix;
					data.txPct = newTxPct;
					data.tyPct = newTyPct;

				if (size && Math.abs(size.w - data.sw) <= 2 && Math.abs(size.h - data.sh) <= 2) {
					let newSw = _img_element.offsetWidth;
					let newSh = _img_element.offsetHeight;
					if (newSw > 0 && newSh > 0) {
						if (
							_img_element.tagName === "IMG" &&
							!getElData(_img_element, _bgsrckey) &&
							_img_element.naturalWidth > 0 &&
							_img_element.naturalHeight > 0
						) {
							const natRatio = _img_element.naturalWidth / _img_element.naturalHeight;
							const cssRatio = newSw / newSh;
							const objFit = window.getComputedStyle(_img_element).objectFit || "fill";

							if (objFit !== "cover" && objFit !== "fill" && Math.abs(cssRatio - natRatio) > 0.01) {
								if (natRatio > cssRatio) {
									newSh = newSw / natRatio;
								} else {
									newSw = newSh * natRatio;
								}
							}
						}
						data.sw = newSw;
						data.sh = newSh;
						size.w = newSw;
						size.h = newSh;
						}
					}
				}

				if (inlineTransform) {
					_img_element.style.setProperty("transform", inlineTransform, inlinePriority);
				}

				const rot = getElData(_img_element, _rotkey) || 0;
				imgRotate(rot, _img_element);

				syncPanelValues();
			}

			applyPanelBorder();
		}
	});

	if (currentlyObservedImg) {
		frameSyncObserver.observe(currentlyObservedImg, { attributes: true, attributeFilter: ["style", "class"] });
	}

	let lastFrameState = "";
	let lastRectState = "";
	let frameTick = 0;
	const fastFrameSync = () => {
		_panelFrameRafId = 0;
		if (!getPanelHost()) return;

		if (_img_element && _img_element.isConnected) {
			const r = _img_element.getBoundingClientRect();
			const rectState = `${r.left}_${r.top}_${r.width}_${r.height}`;

			frameTick = (frameTick + 1) % 6;
			if (rectState !== lastRectState || frameTick === 0) {
				lastRectState = rectState;
				const style = window.getComputedStyle(_img_element);

				let pStyleStr = "";
				if (_img_element.parentElement) {
					const pStyle = window.getComputedStyle(_img_element.parentElement);
					pStyleStr = `${pStyle.borderTopLeftRadius}_${pStyle.borderTopRightRadius}_${pStyle.borderBottomRightRadius}_${pStyle.borderBottomLeftRadius}`;
				}

				const currentState =
					`${rectState}_` +
					`${style.borderTopLeftRadius}_${style.borderTopRightRadius}_${style.borderBottomRightRadius}_${style.borderBottomLeftRadius}_` +
					pStyleStr;

				if (currentState !== lastFrameState) {
					lastFrameState = currentState;
					applyPanelBorder();
				}
			}
		}
		_panelFrameRafId = requestAnimationFrame(fastFrameSync);
	};
	if (_panelFrameRafId) cancelAnimationFrame(_panelFrameRafId);
	_panelFrameRafId = requestAnimationFrame(fastFrameSync);

	const panelCheckInterval = setInterval(() => {
		if (!getPanelHost()) {
			clearInterval(panelCheckInterval);
			frameSyncObserver.disconnect();
			if (_panelFrameRafId) {
				cancelAnimationFrame(_panelFrameRafId);
				_panelFrameRafId = 0;
			}
			return;
		}

		let triggerReset = false;

		if (location.href !== initialUrl) {
			triggerReset = true;
		}

		if (_img_element) {
			const originalImg = getElData(_img_element, _srckey) || _img_element;
			const isFloating = !!getElData(_img_element, _srckey);

			if (_img_element !== currentlyObservedImg) {
				frameSyncObserver.disconnect();
				currentlyObservedImg = _img_element;

				initialSrc = originalImg.currentSrc || originalImg.src;

				frameSyncObserver.observe(currentlyObservedImg, { attributes: true, attributeFilter: ["style", "class"] });

				applyPanelBorder();
			}

			if (!originalImg.isConnected) {
				triggerReset = true;
			} else {
				const rect = originalImg.getBoundingClientRect();
				let isHiddenBySlider = false;

				const winW = window.innerWidth || document.documentElement.clientWidth;
				const winH = window.innerHeight || document.documentElement.clientHeight;

				if (!isFloating) {
					const minVisiblePx = 20;
					const overlapsViewport =
						rect.right > minVisiblePx &&
						rect.left < winW - minVisiblePx &&
						rect.bottom > minVisiblePx &&
						rect.top < winH - minVisiblePx;

					if (!overlapsViewport) {
						isHiddenBySlider = true;
					}
				}

				const origStyle = window.getComputedStyle(originalImg);
				if (origStyle.display === "none" || rect.width === 0 || rect.height === 0) {
					isHiddenBySlider = true;
				}

				if (!isFloating && origStyle.visibility === "hidden") {
					isHiddenBySlider = true;
				}

				let pNode = originalImg.parentElement;
				while (pNode && pNode !== document.body && pNode !== document.documentElement && !isHiddenBySlider) {
					const pStyle = window.getComputedStyle(pNode);

					if (pStyle.display === "none" || pStyle.visibility === "hidden" || parseFloat(pStyle.opacity) < 0.01) {
						isHiddenBySlider = true;
						break;
					}

					if (!isFloating) {
						if (
							pStyle.overflow === "hidden" ||
							pStyle.overflow === "scroll" ||
							pStyle.overflow === "auto" ||
							pStyle.overflow === "clip"
						) {
							const pRect = pNode.getBoundingClientRect();

							const overlapsParent =
								rect.right > pRect.left &&
								rect.left < pRect.right &&
								rect.bottom > pRect.top &&
								rect.top < pRect.bottom;

							if (!overlapsParent) {
								isHiddenBySlider = true;
								break;
							}
						}
					}
					pNode = pNode.parentElement;
				}

				if (isHiddenBySlider) {
					triggerReset = true;
				} else if (initialSrc) {
					const currentSrc = originalImg.currentSrc || originalImg.src;
					if (currentSrc !== initialSrc) {
						triggerReset = true;
					}
				}
			}
		}

		if (triggerReset) {
			clearInterval(panelCheckInterval);
			frameSyncObserver.disconnect();

			restoreOriginalDOM(false);
			closePanel();

			_hoverTarget = null;
			_current_element = null;
			_img_element = null;

			setZoom();
		}
	}, 200);
}

function ctxRotation(rot) {
	if (_current_element) {
		setZoom(_current_element);
		enableAnim(_img_element);
		imgRotate(normalizeRot(getElData(_img_element, _rotkey) + rot));
		showZoomBadge();

		if (!_singleImgPage) {
			setZoom();
		}
	}
}

function ctxFit() {
	if (_current_element) {
		setZoom(_current_element);
		sizeFit();

		if (!_singleImgPage) {
			setZoom();
		}
	}
}

function attachEvent(elem, imgObj) {
	if (_isExcludedHost) return;
	d("Attach Event", "");

	const targetToCheck = imgObj ? imgObj : elem;

	elem.addEventListener("click", (e) => {
		if (_isExcludedHost) return;

		if (elem.dataset && elem.dataset.zdIgnoreClick === "true") return;

		if (isLockedOriginal(targetToCheck)) return;

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

		let isInlineModified = false;
		const data = getElData(elem, _firstkey);
		if (data) {
			const size = getElData(elem, _sizekey);
			const rot = getElData(elem, _rotkey) || 0;
			const flipX = getElData(elem, _flipXkey) || 1;
			const flipY = getElData(elem, _flipYkey) || 1;
			const isDragged = elem.classList.contains(_draggedCls);
			if (size && (Math.abs(size.w - data.sw) > 2 || Math.abs(size.h - data.sh) > 2 || rot !== 0 || flipX !== 1 || flipY !== 1 || isDragged || elem.style.opacity || elem.style.filter)) {
				isInlineModified = true;
			}
		}

		if (!jdg || elem.classList.contains(_zdImgCls) || (isInlineModified && !(isPassThroughClick(e) && hasPassThroughHost(e)))) {
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();
		}
	});

	elem.addEventListener("auxclick", function (e) {
		if (_isExcludedHost) return;

		if (isLockedOriginal(targetToCheck)) return;

		if (e.button === 1 && (_rightBtnDown || _img_element)) {
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();
		}
	});

	elem.addEventListener("mousedown", function (e) {
		if (_isExcludedHost) return;

		if (isLockedOriginal(targetToCheck)) return;

		const isAlt = e.altKey || _accKeyState.alt;
		const isCtrl = e.ctrlKey || _accKeyState.ctrl;

		if (
			isAlt &&
			isCtrl &&
			((e.button === 0 && (_rightBtnDown || e.buttons & 2)) || (e.button === 2 && e.buttons & 1))
		) {
			_ctx_show = false;
			startQuickZoom(e, imgObj ? imgObj : this);
			e.preventDefault();
			e.stopPropagation();
			return;
		} else if (
			isAlt &&
			!isCtrl &&
			((e.button === 0 && (_rightBtnDown || e.buttons & 2)) || (e.button === 2 && e.buttons & 1))
		) {
			_ctx_show = false;
			startRotation(e, imgObj ? imgObj : this);
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

			if (getPanelHost()) {
				_current_element = imgObj ? imgObj : this;
			} else {
				setZoom(imgObj ? imgObj : this);
			}
		} else if (e.button === 0) {
			let isDraggable = this.classList.contains(_zdImgCls);
			if (this.classList.contains(_imgSrcViewCls) && this.style.cursor === "grab") {
				isDraggable = true;
			}

			if (isDraggable && !_rightBtnDown) {
				if (_img_element !== this) {
					setZoom(this, null, true);
				}

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
				_dragParam = { obj: this, x: e.pageX - ofs.left, y: e.pageY - ofs.top };
				this.classList.add("zdImgCls_draggingCur");

				window.addEventListener("pointermove", onGlobalMouseMove, true);
				window.addEventListener("pointerup", onGlobalMouseUp, true);
				window.addEventListener("pointercancel", onGlobalMouseUp, true);
				d("Drag Start", "");

				e.preventDefault();
				e.stopPropagation();
			}
		} else if (e.button === 1) {
			if (_rightBtnDown || _img_element) {
				e.preventDefault();
				e.stopPropagation();
			}
		}
	});

	elem.addEventListener("mouseup", function (e) {
		if (_isExcludedHost) return;

		if (isLockedOriginal(targetToCheck)) return;

		this.classList.remove("zdImgCls_draggingCur");
		if (e.button === 1) {
			_mdownFunc();
			e.preventDefault();
			e.stopPropagation();
		}
	});

	const resetCtx = () => {
		if (!_img_element) {
			_ctx_show = true;
		}
	};

	elem.addEventListener("mouseenter", resetCtx);
	elem.addEventListener("mouseleave", resetCtx);
	elem.addEventListener("blur", resetCtx);
}

let _floatingMutationObserver = null;

function startExImgObserver() {
	if (_floatingMutationObserver || !document.body) return;

	_floatingMutationObserver = new MutationObserver(() => {
		const exImgWrapper = document.getElementById(_zdExImgId);
		if (!exImgWrapper) {
			stopExImgObserver();
			return;
		}

		const imgs = exImgWrapper.getElementsByTagName("img");
		if (imgs.length !== 0) {
			for (let i = 0; i < imgs.length; i++) {
				const img = imgs[i];
				const se = getElData(img, _srckey);

				if (se && (!se.isConnected || window.getComputedStyle(se).display === "none")) {
					const pnt = img.closest("a");
					if (pnt) {
						pnt.remove();
					} else {
						img.remove();
					}
					restoreSelfVisibility(se);
				}
			}
		} else {
			exImgWrapper.remove();
			stopExImgObserver();
		}
	});

	_floatingMutationObserver.observe(document.body, { childList: true, subtree: true });
}

function stopExImgObserver() {
	if (_floatingMutationObserver) {
		_floatingMutationObserver.disconnect();
		_floatingMutationObserver = null;
	}
}

function imgDrag(x, y) {
	if (!_dragParam) return;

	if (getPanelHost() && _dragParam.obj && _img_element !== _dragParam.obj) {
		setZoom(_dragParam.obj, null, true);
		syncPanelValues();
	}

	const obj = _dragParam.obj;
	obj.style.left = window.scrollX + (x - _dragParam.x) + "px";
	obj.style.top = window.scrollY + (y - _dragParam.y) + "px";

	if (!obj.classList.contains(_draggedCls) && _draggingCnt > 8) {
		obj.classList.add(_draggedCls);
	}
	_draggingCnt++;
}

function enableContextMenus(enable) {
	browser.runtime.sendMessage({ id: "set-context", data: _zoom_enableCxt ? enable : false });
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

browser.storage.onChanged.addListener((changes, area) => {
	if (area === "local" && changes.setting) {
		d("Storage changed, updating settings", changes.setting.newValue);
		settingData(changes.setting.newValue);
	}
});

browser.runtime.onMessage.addListener((msg) => {
	if (_isExcludedHost) return;

	_rightBtnDown = false;
	if (_img_element) {
		setZoom();
	}

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
			windowFiting(true);
			break;
		case "fit":
			ctxFit();
			break;
		default:
			d("Message Listener", "Unknown command: " + msg.id, "warn");
			break;
	}
});

if (!_endInit) {
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
}

checkSendGetSetting();