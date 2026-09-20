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

const _logOutput = location.href.includes('zoomdraglog=1');

function d(t, v, level = 'debug') {
    if (!_logOutput) return;

    const msg = '[ZoomDrag] ' + t + ': ' + v;

    if (level === 'warn') {
        console.warn(msg);
    } else if (level === 'error') {
        console.error(msg);
    } else {
        console.debug(msg);
    }
}

d('Log Start', '==========');

const _uqid = new Date().getTime().toString(16) + '_';
const _firstkey = _uqid + 'first';
const _srckey = _uqid + 'source';
const _sizekey = _uqid + 'size';
const _rotkey = _uqid + 'rotate';
const _bgsrckey = _uqid + 'bgsrc';
const _flipXkey = _uqid + 'flipX';
const _flipYkey = _uqid + 'flipY';

const _zdExImgId = 'zdImg_' + _uqid + 'floatImgWraper';
const _zdImgCls = 'zdImgCls_b6ig4jvwe';
const _draggedCls = 'zdImgCls_dragged';
const _imgSrcViewCls = 'zdImgCls_imgSrcView';
const _imgLinkCls = 'zdImgCls_mhdt687po';
const _imgNoLinkCls = 'zdImgCls_asntrs58f';

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
let _zoom_excludedDomains = '';
let _isExcludedHost = false;

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
    if (el && !el.classList.contains('zdImgCls_animated')) {
        el.classList.add('zdImgCls_animated');
    }
}

function disableAnim(el) {
    if (el) {
        el.classList.remove('zdImgCls_animated');
    }
}

function checkIsExcluded(excludedStr) {
    if (!excludedStr) return false;
    
    const currentHost = location.hostname.toLowerCase();
    if (!currentHost) return false;
    
    const lines = excludedStr.split(/[\r\n,]+/);
    return lines.some(line => {
        let rule = line.trim().toLowerCase();
        if (!rule) return false;
        
        rule = rule.replace(/^[a-z]+:\/\//i, '').split('/')[0];
        return currentHost === rule || currentHost.endsWith('.' + rule);
    });
}

let _badgeTimer = null;
let _rightBtnDown = false;
let _rclickHoldTimer = null;

let _singleImgPage = false; 

function isSingleImgPage() {
    if (document.contentType && document.contentType.startsWith('image/')) {
        return true;
    }
    
    if (document.body) {
        let imgCount = 0;
        let nonImgCount = 0;
        
        for (let i = 0; i < document.body.childNodes.length; i++) {
            const node = document.body.childNodes[i];
            if (node.nodeType === 1) { 
                if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE' || node.tagName === 'LINK') {
                    continue;
                }
                
                if (node.tagName === 'IMG') {
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

function getElData(el, key) {
    if (!el || !elementDataMap.has(el)) return undefined;
    return elementDataMap.get(el)[key];
}

function setElData(el, key, value) {
    if (!el) return;
    
    _modifiedElements.add(el);
    if (!elementDataMap.has(el)) {
        elementDataMap.set(el, {});
    }
    elementDataMap.get(el)[key] = value;
}

function startRotation(e, targetEl) {
    if (_isExcludedHost) return;
    
    const el = targetEl || _img_element || _current_element;
    if (!el) return;
    
    if (!_img_element) {
        setZoom(el);
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
    
    window.addEventListener('mousemove', onGlobalMouseMove, true);
    window.addEventListener('pointermove', onGlobalMouseMove, true);
    window.addEventListener('mouseup', onGlobalMouseUp, true);
    window.addEventListener('pointerup', onGlobalMouseUp, true);
    d('Rotation Start', 'deg: ' + baseRot);
}

function handleRotationMove(e) {
    if (!_rotParam || !_rotParam.obj) return;
    
    const curAngle = Math.atan2(e.clientY - _rotParam.cy, e.clientX - _rotParam.cx) * (180 / Math.PI);
    const delta = curAngle - _rotParam.startAngle;
    let newDeg = normalizeRot(Math.round(_rotParam.baseRot + delta));
    
    imgRotate(newDeg, _rotParam.obj);
    showZoomBadge();
    
    _rotParam.hasRotated = true;
    _ctx_show = false;
    
    e.preventDefault();
    e.stopPropagation();
}

function stopRotation() {
    if (_rotParam) {
        if (_rotParam.hasRotated) {
            _cancelNextClick = true;
            _ctx_show = false;
        }
        _rotParam = null;
        d('Rotation End', '');
        
        if (!_rightBtnDown) {
            if (_badgeTimer) clearTimeout(_badgeTimer);
            _badgeTimer = setTimeout(() => {
                let b = document.getElementById('zdImg_zoomBadge');
                if (b && !_rightBtnDown && !_rotParam) {
                    b.style.opacity = '0';
                }
            }, 800);
        }
        
        if (_zoom_rcCancel > 0) {
            if (_rclickTimer) clearTimeout(_rclickTimer);
            _rclickTimer = setTimeout(() => {
                if (_rotParam) return;
                setZoom();
            }, _zoom_rcCancel);
        }
    }
}

function startQuickZoom(e, targetEl) {
    if (_isExcludedHost) return;
    
    const el = targetEl || _img_element || _current_element;
    if (!el) return;

    if (!_img_element) {
        setZoom(el);
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

    const src_elem = getElData(target, _srckey);
    if (!src_elem) {
        generateImgEx({ w: target.offsetWidth, h: target.offsetHeight });
    }

    const currentSize = getElData(target, _sizekey) || { w: target.offsetWidth, h: target.offsetHeight };

    _zoomParam = {
        obj: target,
        startY: e.clientY,
        startW: currentSize.w,
        startH: currentSize.h,
        hasZoomed: false
    };

    _ctx_show = false;
    showZoomBadge();
    
    window.addEventListener('mousemove', onGlobalMouseMove, true);
    window.addEventListener('pointermove', onGlobalMouseMove, true);
    window.addEventListener('mouseup', onGlobalMouseUp, true);
    window.addEventListener('pointerup', onGlobalMouseUp, true);
    d('QuickZoom Start', 'W: ' + _zoomParam.startW);
}

function handleQuickZoomMove(e) {
    if (!_zoomParam || !_zoomParam.obj) return;

    const deltaY = e.clientY - _zoomParam.startY;
    let scale = Math.exp(deltaY * 0.01);

    let newW = _zoomParam.startW * scale;
    let newH = _zoomParam.startH * scale;

    const data = getElData(_zoomParam.obj, _firstkey);
    if (data) {
        const minWidth = Math.max(data.sw * 0.05, 20);
        
        if (newW < minWidth) {
            newW = minWidth;
            newH = (data.sh / data.sw) * minWidth;
        }
    }

    setImageRect({ w: newW, h: newH });
    showZoomBadge();
    
    _zoomParam.hasZoomed = true;
    _ctx_show = false;

    e.preventDefault();
    e.stopPropagation();
}

function stopQuickZoom() {
    if (_zoomParam) {
        if (_zoomParam.hasZoomed) {
            _cancelNextClick = true;
            _ctx_show = false;
        }
        _zoomParam = null;
        d('QuickZoom End', '');

        if (!_rightBtnDown) {
            if (_badgeTimer) clearTimeout(_badgeTimer);
            _badgeTimer = setTimeout(() => {
                let b = document.getElementById('zdImg_zoomBadge');
                if (b && !_rightBtnDown && !_rotParam && !_zoomParam) {
                    b.style.opacity = '0';
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
    if (_rotParam) stopRotation();
    if (_zoomParam) stopQuickZoom();

    if (_dragParam) {
        if (_dragParam.obj) {
            _dragParam.obj.classList.remove('zdImgCls_draggingCur');
        }
        if (_draggingCnt > 2) {
            _cancelNextClick = true;
        }
        _dragParam = null;
        d('Drag End', '');
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
    }

    if (!_rotParam && !_zoomParam && !_dragParam) {
        window.removeEventListener('mousemove', onGlobalMouseMove, true);
        window.removeEventListener('pointermove', onGlobalMouseMove, true);
        window.removeEventListener('mouseup', onGlobalMouseUp, true);
        window.removeEventListener('pointerup', onGlobalMouseUp, true);
    }
}

function isEditableTarget(el) {
    if (!el) return false;
    const tag = el.tagName ? el.tagName.toUpperCase() : '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        return true;
    }
    if (el.isContentEditable) {
        return true;
    }
    if (el.getAttribute && el.getAttribute('role') === 'textbox') {
        return true;
    }
    return false;
}

function getActiveImageTarget(isActivationKey = true) {
    if (_hoverTarget && _hoverTarget.isConnected) {
        if (isActivationKey) {
            return _hoverTarget;
        }
    }

    if ((document.getElementById('zd-custom-panel') || _rightBtnDown) && _img_element && _img_element.isConnected) {
        return _img_element;
    }

    if (_current_element && _current_element.isConnected) {
        const rot = getElData(_current_element, _rotkey) || 0;
        const size = getElData(_current_element, _sizekey);
        const data = getElData(_current_element, _firstkey);
        const isFloating = !!getElData(_current_element, _srckey);
        
        if (isFloating || (data && size && (Math.abs(size.w - data.sw) > 2 || rot !== 0 || _current_element.classList.contains(_draggedCls)))) {
            return _current_element;
        }
    }

    const exWrapper = document.getElementById(_zdExImgId);
    if (exWrapper) {
        const floatingImg = exWrapper.querySelector('img.' + _zdImgCls);
        if (floatingImg) return floatingImg;
    }

    if (_singleImgPage && _current_element && _current_element.isConnected) {
        return _current_element;
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
            if (_rotParam) return;
            setZoom();
        }, _zoom_rcCancel);
    }
}

function handleZoomKey(zoomIn, shiftPressed, isActKey) {
    let target = getActiveImageTarget(isActKey);
    if (!target) return false;
    
    target = ensureTargetReady(target);
    if (!target) return false;

    let dim = _zoom_dim * 0.01;
    if (shiftPressed) {
        dim *= 2;
    }
    
    const r = zoomIn ? (1 + dim) : (1 - dim);

    disableAnim(target);
    zoom(r);
    refreshShortcutTimeout();
    return true;
}

function handleArrowKey(dx, dy, isActKey) {
    let target = getActiveImageTarget(isActKey);
    if (!target) return false;
    
    target = ensureTargetReady(target, true);
    if (!target) return false;

    const src_elem = getElData(target, _srckey);
    const isSinglePageImg = _singleImgPage && target.classList.contains(_imgSrcViewCls);

    if (!src_elem && !isSinglePageImg) {
        const size = getElData(target, _sizekey) || { w: target.offsetWidth, h: target.offsetHeight };
        generateImgEx(size);
        target = _img_element;
    }

    if (!target) return false;

    const rawLeft = parseFloat(target.style.left);
    const rawTop = parseFloat(target.style.top);
    const curLeft = isNaN(rawLeft) ? getOffset(target).left : rawLeft;
    const curTop = isNaN(rawTop) ? getOffset(target).top : rawTop;

    enableAnim(target);
    target.style.left = (curLeft + dx) + 'px';
    target.style.top = (curTop + dy) + 'px';
    target.classList.add(_draggedCls);

    if (isSinglePageImg) {
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
    
    enableAnim(target);
    windowFiting();
    refreshShortcutTimeout();
    return true;
}

function handlePanelKey() {
    const panel = document.getElementById('zd-custom-panel');
    if (panel) {
        panel.remove();
        if (typeof _img_element !== 'undefined' && _img_element) {
            _img_element.style.removeProperty('outline');
            _img_element.style.removeProperty('outline-offset');
            _img_element.style.removeProperty('box-shadow');
        }
        return true;
    }

    const hovers = document.querySelectorAll(':hover');
    if (!hovers || hovers.length === 0) return false;

    let target = hovers[hovers.length - 1];
    let validImg = null;

    if (target.tagName === 'IMG' || target.tagName === 'CANVAS') {
        validImg = target;
    } else {
        const bg = window.getComputedStyle(target).backgroundImage;
        if (bg !== 'none' && bg.includes('url') && target.tagName !== 'BODY' && target.tagName !== 'HTML') {
            validImg = target;
        }
    }

    if (!validImg) return false;
    if (validImg.offsetWidth === 0 || validImg.offsetHeight === 0) return false;

    if (typeof _current_element !== 'undefined') {
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
        const imgs = exWrapper.querySelectorAll('img');
        imgs.forEach(img => {
            const orig = getElData(img, _srckey);
            if (orig) {
                orig.style.visibility = 'visible';
            }
        });
        exWrapper.remove();
    }
    
    for (const el of _modifiedElements) {
        if (el && el.nodeType === 1) {
            if (withAnimation) {
                enableAnim(el);
            }

            const data = getElData(el, _firstkey);
            
            el.style.removeProperty('left');
            el.style.removeProperty('top');
            el.style.removeProperty('width');
            el.style.removeProperty('height');
            el.style.removeProperty('max-width');
            el.style.removeProperty('max-height');
            el.style.removeProperty('min-width');
            el.style.removeProperty('min-height');
            el.style.removeProperty('transform');
            el.style.removeProperty('z-index');
            el.style.removeProperty('background-image');
            el.style.removeProperty('flex-shrink');
            el.style.removeProperty('contain');
            
            if (data && data.origStyle) {
                el.style.left = data.origStyle.left;
                el.style.top = data.origStyle.top;
                el.style.width = data.origStyle.width;
                el.style.height = data.origStyle.height;
                el.style.maxWidth = data.origStyle.maxWidth;
                el.style.maxHeight = data.origStyle.maxHeight;
                el.style.minWidth = data.origStyle.minWidth || '';
                el.style.minHeight = data.origStyle.minHeight || '';
                el.style.transform = data.origStyle.transform;
                if (data.origStyle.zIndex !== undefined) {
                    el.style.zIndex = data.origStyle.zIndex;
                }
                if (data.origStyle.backgroundImage !== undefined) {
                    el.style.backgroundImage = data.origStyle.backgroundImage;
                }
            }

            el.style.removeProperty('opacity');
            el.style.removeProperty('filter');
            el.style.removeProperty('outline');
            el.style.removeProperty('outline-offset');
            el.style.removeProperty('box-shadow');
            el.style.removeProperty('cursor');
            el.style.visibility = 'visible';
            el.classList.remove(_draggedCls);
            el.classList.remove('zdImgCls_draggingCur');

            if (_singleImgPage && !document.querySelector('.' + _imgSrcViewCls)) {
                document.documentElement.style.removeProperty('overflow');
                document.body.style.removeProperty('overflow');
            }
        }
        elementDataMap.delete(el);
    }
    _modifiedElements.clear();

    setZoom.zIndexCounter = 10;
}

function handleShiftEscapeKey() {
    if (_rotParam) {
        stopRotation();
    }
    
    if (_dragParam) {
        if (_dragParam.obj) {
            _dragParam.obj.classList.remove('zdImgCls_draggingCur');
        }
        _dragParam = null;
    }

    let activeImg = _img_element;
    if (activeImg) {
        const srcElem = getElData(activeImg, _srckey);
        if (srcElem) {
            activeImg = srcElem;
        }
    }

    const panel = document.getElementById('zd-custom-panel');

    restoreOriginalDOM(true);

    if (panel && activeImg && activeImg.isConnected) {
        setZoom(activeImg);
        if (typeof syncPanelValues === 'function') {
            syncPanelValues();
        }

        if (panel.matches(':hover') || panel.contains(document.activeElement)) {
            const isFloating = !!getElData(activeImg, _srckey);
            const isSingleImgView = _singleImgPage && activeImg.classList.contains(_imgSrcViewCls);
            
            if (isSingleImgView) {
                activeImg.style.removeProperty('outline');
                activeImg.style.removeProperty('outline-offset');
                activeImg.style.removeProperty('box-shadow');
            } else {
                activeImg.style.setProperty('outline', '2px solid rgba(53, 117, 221, 0.5)', 'important');
                
                if (isFloating) {
                    activeImg.style.setProperty('outline-offset', '0px', 'important');
                    activeImg.style.setProperty('box-shadow', '0 0 15px rgba(53, 117, 221, 0.4)', 'important');
                } else {
                    activeImg.style.setProperty('outline', '3px solid rgba(53, 117, 221, 0.9)', 'important');
                    activeImg.style.setProperty('outline-offset', '-3px', 'important');
                    activeImg.style.setProperty('box-shadow', 'inset 0 0 0 1px rgba(255, 255, 255, 0.9), inset 0 0 20px rgba(53, 117, 221, 0.7)', 'important');
                }
            }
        }
    } else {
        setZoom();
    }
    
    return true;
}

function handleEscapeKey(isActKey = false) {
    let target = getActiveImageTarget(isActKey);

    const panel = document.getElementById('zd-custom-panel');
    if (panel) {
        panel.remove();
        if (_img_element) {
            _img_element.style.removeProperty('outline');
            _img_element.style.removeProperty('outline-offset');
            _img_element.style.removeProperty('box-shadow');
        }
    }

    if (!target) return panel ? true : false;
    
    target = ensureTargetReady(target);
    if (!target) return panel ? true : false;

    enableAnim(target);
    target.classList.remove(_draggedCls);

    target.style.removeProperty('opacity');
    target.style.removeProperty('filter');
    target.style.removeProperty('outline');
    target.style.removeProperty('outline-offset');
    target.style.removeProperty('box-shadow');
    target.style.removeProperty('cursor');
    
    setElData(target, _flipXkey, 1);
    setElData(target, _flipYkey, 1);

    const data = getElData(target, _firstkey);
    if (data && data.origStyle && data.origStyle.zIndex !== undefined) {
        target.style.removeProperty('z-index');
        target.style.zIndex = data.origStyle.zIndex;
    } else {
        target.style.removeProperty('z-index');
    }

    const src_elem = getElData(target, _srckey);
    if (src_elem) {
        imgRotate(0, target);
        clearImgEx(src_elem);
    }
    
    setImageRect();
    imgRotate(0);
    setZoom();
    
    return true;
}

function init() {
    d('Init Start', '');

    if (!document.body) {
        d('Init Aborted', 'document.body is not ready', 'error');
        return;
    }
    
    _singleImgPage = isSingleImgPage();
    if (_singleImgPage && !_isExcludedHost) {
        singlePageAltImg();
    }

    updateClickFunctions();
    
    const captureShield = (e) => {
        if (e.type === 'mousedown' || e.type === 'pointerdown') {
            _cancelNextClick = false;
        }

        if (e.type === 'click') {
            if (_cancelNextClick) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                _cancelNextClick = false;
                return;
            }

            if (e.button === 0 && e.isTrusted && e.target && (e.target.tagName === 'IMG' || e.target.tagName === 'CANVAS')) {
                const data = getElData(e.target, _firstkey);
                if (data) {
                    const size = getElData(e.target, _sizekey);
                    const rot = getElData(e.target, _rotkey) || 0;
                    if (size && (Math.abs(size.w - data.sw) > 2 || Math.abs(size.h - data.sh) > 2 || rot !== 0)) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        return;
                    }
                }
            }
        }

        if (_rightBtnDown && e.button === 0 && _img_element) {
            if (e.altKey || _accKeyState.alt) return;

            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            if (e.type === 'mouseup') {
                _cancelNextClick = true;
                _clickFunc();
                _draggingCnt = 0;
            }
        }
    };

    window.addEventListener('pointerdown', captureShield, true);
    window.addEventListener('mousedown', captureShield, true);
    window.addEventListener('pointerup', captureShield, true);
    window.addEventListener('mouseup', captureShield, true);
    window.addEventListener('click', captureShield, true);

    window.addEventListener('dragstart', (e) => {
        if (_isExcludedHost) return;
        if (_img_element || _dragParam || _rightBtnDown || (e.target && e.target.classList && e.target.classList.contains(_zdImgCls))) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
        }
    }, true);
  
    document.body.addEventListener('mousedown', (e) => {
        if (_isExcludedHost) return;
        
        const isAlt = e.altKey || _accKeyState.alt;
        
        if (e.button === 2) { 
            _rightBtnDown = true;
            _ctx_show = true;
            const t = document.elementFromPoint(e.clientX, e.clientY);
            checkTarget(t, e);
            if (isAlt && (e.buttons & 1) && _img_element) {
                _ctx_show = false;
                startRotation(e, _img_element);
                e.preventDefault();
                e.stopPropagation();
            }
        } else if (e.button === 0) {
            if (isAlt && (_rightBtnDown || (e.buttons & 2))) {
                const t = document.elementFromPoint(e.clientX, e.clientY);
                if (!_img_element) {
                    checkTarget(t, e);
                }
                if (_img_element) {
                    _ctx_show = false;
                    startRotation(e, _img_element);
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        }
    });
    
    document.body.addEventListener('mouseup', (e) => {
        if (_isExcludedHost) {
            if (_rotParam || _img_element) {
                resetAllChanges();
            }
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
                const panelOpen = document.getElementById('zd-custom-panel');
                showZoomBadge();
                
                if (panelOpen) {
                    setTimeout(() => {
                        let b = document.getElementById('zdImg_zoomBadge');
                        if (b && !_rightBtnDown) {
                            b.style.opacity = '0';
                        }
                        _ctx_show = true;
                    }, 100);
                    return; 
                }

                setTimeout(() => setZoom(), 100);
            }
        }
    });
    
    document.addEventListener('mouseover', (e) => {
        if (_isExcludedHost) return;
        
        const t = e.target;
        if (!t) return;

        if (t.tagName === 'IMG' || t.tagName === 'CANVAS' || (t.classList && t.classList.contains(_zdImgCls))) {
            if (t.offsetWidth > 0 && t.offsetHeight > 0) {
                _hoverTarget = t;
                return;
            }
        } else {
            const wrapper = t.closest('a, picture, figure');
            if (wrapper) {
                const img = wrapper.querySelector('img, canvas');
                if (img && img.offsetWidth > 0 && img.offsetHeight > 0) {
                    _hoverTarget = img;
                    return;
                }
            }
            if (t.parentNode) {
                const img = t.parentNode.querySelector('img, canvas');
                if (img && img.offsetWidth > 0 && img.offsetHeight > 0) {
                    _hoverTarget = img;
                    return;
                }
            }
        }

        _hoverTarget = null;
    }, { passive: true });

    window.addEventListener('wheel', (e) => {
        const panel = document.getElementById('zd-custom-panel');
        if (panel) {
            if (panel.contains(e.target)) return;
            
            const isHoveringImg = e.target === _img_element || (e.target && e.target.classList && e.target.classList.contains(_zdImgCls));
            if (!isHoveringImg && !_singleImgPage && !_rightBtnDown) {
                return;
            }
        }

        if (_rightBtnDown && _img_element) {
            e.preventDefault();
        }
    }, { passive: false, capture: true });

    window.addEventListener('keydown', (e) => { 
        _accKeyState.ctrl = e.ctrlKey; 
        _accKeyState.alt = e.altKey; 
        
        if (e.key === 'Alt' && _img_element) {
            e.preventDefault();
        }

        if (!_zoom_enableKeyShortcuts || _isExcludedHost) return;

        const panel = document.getElementById('zd-custom-panel');
        const inPanelInput = panel && panel.contains(document.activeElement);

        if (isEditableTarget(e.target) || isEditableTarget(document.activeElement)) {
            if (!(inPanelInput && e.key === 'Escape')) {
                return; 
            }
        }

        if (e.ctrlKey || e.metaKey || e.altKey) {
            return;
        }

        let handled = false;
        const key = e.key;

        const isActKey = (
            key === '+' || key === '=' || key === '*' || e.code === 'NumpadAdd' ||
            key === '-' || key === '_' || e.code === 'NumpadSubtract' ||
            key === '0' || key === 'r' || key === 'R' || key === 'l' || key === 'L' ||
            key === 'p' || key === 'P'
        );

        if (key === 'Escape') {
            handled = e.shiftKey ? handleShiftEscapeKey() : handleEscapeKey(false);
            if (handled) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
            }
            return;
        }

        if (panel && (panel.contains(e.target) || panel.matches(':hover'))) {
            const activeTag = document.activeElement ? document.activeElement.tagName : '';
            if (activeTag !== 'INPUT' && (key.startsWith('Arrow') || key === ' ')) {
                e.preventDefault();
            }
            if (key !== 'p' && key !== 'P') {
                return; 
            }
        }

        if (key === '+' || key === '=' || key === '*' || e.code === 'NumpadAdd') {
            handled = handleZoomKey(true, e.shiftKey, isActKey);
        } else if (key === '-' || key === '_' || e.code === 'NumpadSubtract') {
            handled = handleZoomKey(false, e.shiftKey, isActKey);
        } else if (key === 'ArrowUp') {
            handled = handleArrowKey(0, e.shiftKey ? -60 : -20, isActKey);
        } else if (key === 'ArrowDown') {
            handled = handleArrowKey(0, e.shiftKey ? 60 : 20, isActKey);
        } else if (key === 'ArrowLeft') {
            handled = handleArrowKey(e.shiftKey ? -60 : -20, 0, isActKey);
        } else if (key === 'ArrowRight') {
            handled = handleArrowKey(e.shiftKey ? 60 : 20, 0, isActKey);
        } else if (key === '0') {
            handled = handleFitWindowKey(isActKey);
        } else if (key === 'r' || key === 'R') {
            handled = handleRotationKey(e.shiftKey ? 45 : 90, isActKey);
        } else if (key === 'l' || key === 'L') {
            handled = handleRotationKey(e.shiftKey ? -45 : -90, isActKey);
        } else if (key === 'p' || key === 'P') {
            handled = handlePanelKey(isActKey);
        }

        if (handled) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
        }
    }, true);
    
    document.body.addEventListener('keyup', (e) => { 
        _accKeyState.ctrl = _accKeyState.alt = false; 
        
        if (e.key === 'Alt') {
            if (_rotParam) {
                stopRotation();
            }
            if (_img_element) {
                e.preventDefault();
            }
        }
    });
    
    window.addEventListener('contextmenu', (e) => {
        if (!_ctx_show) {
            e.preventDefault();
        }
    });
    
    window.addEventListener('blur', () => {
        _accKeyState.ctrl = _accKeyState.alt = false;
        _rightBtnDown = false;
        
        if (_rotParam) stopRotation();
        if (_zoomParam) stopQuickZoom();
        
        if (_dragParam) {
            if (_dragParam.obj) {
                _dragParam.obj.classList.remove('zdImgCls_draggingCur');
            }
            _dragParam = null;
        }
        
        if (_img_element) {
            setZoom();
        }
    });
    
    initExImgObserver();
    
    _endInit = true;
    d('Init End', '');
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
    
    const img = document.querySelector('img:not(.' + _zdImgCls + ')');
    if (!img) return;
    
    d('ImageView Source Page', '');
    const modeFitCls = 'zdImgCls_modeFit';
    
    const imgSrc = img.src || img.currentSrc;
    
    img.setAttribute('data-zd-orig-src', imgSrc);
    img.style.setProperty('display', 'none', 'important');
    img.style.setProperty('opacity', '0', 'important');
    img.style.setProperty('pointer-events', 'none', 'important');
    img.removeAttribute('src');

    document.body.style.setProperty('overflow', 'hidden', 'important');
    document.documentElement.style.setProperty('overflow', 'hidden', 'important');
    document.body.style.setProperty('margin', '0', 'important');
    window.scrollTo(0, 0);

    const nimg = document.createElement('img');
    nimg.className = _imgSrcViewCls;
    nimg.src = imgSrc;
    _current_element = nimg;

    document.body.appendChild(nimg);

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

        nimg.style.setProperty('position', 'absolute', 'important');
        nimg.style.setProperty('display', 'inline', 'important');
        nimg.style.setProperty('left', nLeft + 'px', 'important');
        nimg.style.setProperty('top', nTop + 'px', 'important');
        nimg.style.setProperty('width', size.w + 'px', 'important');
        nimg.style.setProperty('height', size.h + 'px', 'important');

        nimg.style.setProperty('min-width', size.w + 'px', 'important');
        nimg.style.setProperty('min-height', size.h + 'px', 'important');
        nimg.style.setProperty('max-width', 'none', 'important');
        nimg.style.setProperty('max-height', 'none', 'important');
        nimg.style.setProperty('transform-origin', '50% 50%', 'important');

        if (w > size.w || h > size.h) {
            nimg.style.setProperty('cursor', 'zoom-in', 'important'); 
        } else {
            nimg.style.setProperty('cursor', 'default', 'important'); 
        }

        checkTarget(nimg, null, true);
    };

    if (nimg.complete && nimg.naturalWidth > 0) {
        onLoadSetup();
    } else {
        nimg.addEventListener('load', onLoadSetup);
    }
    
    nimg.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        if (this.classList.contains(_draggedCls)) return;
        
        _current_element = this;
        ctxFit();
    }, true);

    window.addEventListener('wheel', function singlePageWheel(e) {
        if (!_zoom_ivpDrag || !nimg.isConnected) {
            window.removeEventListener('wheel', singlePageWheel, { capture: true });
            return;
        }
        
        const panel = document.getElementById('zd-custom-panel');
        if (panel && panel.contains(e.target)) return;

        if (!_img_element || _img_element !== nimg) {
            setZoom(nimg, null, true);
            zoomEvent(e);
            e.preventDefault();
            e.stopPropagation();
        }
    }, { passive: false, capture: true });
}

function resetAllChanges() {
    _hoverTarget = null;
    d('Reset All Changes for Excluded Domain', 'Script disabled', 'warn');
    
    window.removeEventListener('wheel', zoomEvent, { capture: true });
    window.removeEventListener('wheel', defEventCancel, { capture: true });
    window.removeEventListener('mousemove', onGlobalMouseMove, true);
    window.removeEventListener('pointermove', onGlobalMouseMove, true);
    window.removeEventListener('mouseup', onGlobalMouseUp, true);
    window.removeEventListener('pointerup', onGlobalMouseUp, true);
    
    stopRotation();
    stopQuickZoom();
    
    if (_zoomParam) _zoomParam = null;
    
    if (_dragParam) {
        if (_dragParam.obj) {
            _dragParam.obj.classList.remove('zdImgCls_draggingCur');
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
    restoreOriginalDOM(false);
    
    const nimg = document.querySelector('.' + _imgSrcViewCls);
    if (nimg) {
        nimg.remove();
        
        const origImg = document.querySelector('img[data-zd-orig-src]');
        if (origImg) {
            origImg.setAttribute('src', origImg.getAttribute('data-zd-orig-src'));
            origImg.removeAttribute('data-zd-orig-src');
            origImg.style.removeProperty('display');
            origImg.style.removeProperty('opacity');
            origImg.style.removeProperty('pointer-events');
        } else if (document.body && document.body.children && document.body.children[0]) {
            document.body.children[0].style.display = '';
        }
        
        document.body.style.removeProperty('overflow');
        document.documentElement.style.removeProperty('overflow');
        document.body.style.removeProperty('margin');
    }
    
    const b = document.getElementById('zdImg_zoomBadge');
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
            _zoom_ivpDrag = setting.ivpDrag;
            if (_zoom_ivpDrag && _singleImgPage && !_isExcludedHost) {
                if (!document.querySelector('.' + _imgSrcViewCls)) {
                    singlePageAltImg();
                }
            } else if (!_zoom_ivpDrag && _singleImgPage) {
                resetAllChanges();
            }
        }

        if (setting.showZoomBadge != null) _zoom_showZoomBadge = setting.showZoomBadge;
        if (setting.enableKeyShortcuts != null) _zoom_enableKeyShortcuts = setting.enableKeyShortcuts;
        if (setting.excludedDomains != null) {
            _zoom_excludedDomains = setting.excludedDomains;
            const wasExcluded = _isExcludedHost;
            _isExcludedHost = checkIsExcluded(_zoom_excludedDomains);
            if (_isExcludedHost) {
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
    if (_isExcludedHost) {
        enableContextMenus(false);
        return false;
    }
    
    if (t) {
        const attach = (o, imgObj) => {
            attachEvent(o, imgObj ? imgObj : null);
            setZoom(imgObj ? imgObj : o, null, skipBadge);
            enableContextMenus(true);
            return true;
        };
        
        if (!getElData(t, _firstkey)) {
            const tag = t.tagName.toUpperCase();
            
            if (tag === 'IMG' || tag === 'CANVAS') {
                d('Image Type', 'Normal');
                return attach(t);
            }
            
            const imgs = t.getElementsByTagName('img');
            if (imgs.length > 0 && e && hitCheck(imgs[0], { x: e.pageX, y: e.pageY })) {
                d('Image Type', 'Inner');
                return attach(t, imgs[0]);
            }
            
            if (_zoom_bgImg) {
                const bgi = window.getComputedStyle(t).backgroundImage;
                if (/url/i.test(bgi) && tag !== 'BODY') {
                    const match = bgi.match(/url\(['"]?(.*?)['"]?\)/i);
                    if (match && match[1]) {
                        setElData(t, _bgsrckey, match[1]);
                        d('Image Type', 'BG');
                        return attach(t);
                    }
                }
            }
            enableContextMenus(false);
        } else {
            enableContextMenus(true);
            const imgObj = t.tagName.toUpperCase() === 'IMG' ? t : (t.getElementsByTagName('img')[0] || t);
            setZoom(imgObj, null, skipBadge);
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

function hitCheck(obj, pos) {
    const ofs = getOffset(obj);
    const style = window.getComputedStyle(obj);
    const op = {
        x: ofs.left + (parseInt(style.borderLeftWidth) || 0) + (parseInt(style.paddingLeft) || 0), 
        y: ofs.top + (parseInt(style.borderTopWidth) || 0) + (parseInt(style.paddingTop) || 0)
    };
    const rect = { 
        x: op.x, 
        y: op.y, 
        r: op.x + obj.offsetWidth, 
        b: op.y + obj.offsetHeight 
    };
    return (rect.x < pos.x && pos.x < rect.r && rect.y < pos.y && pos.y < rect.b);
}

const defEventCancel = (e) => {
    e.preventDefault();
    e.stopPropagation();
};

function showZoomBadge() {
    if (window._zdSuppressBadge || !_zoom_showZoomBadge || !_img_element) return;
    
    let b = document.getElementById('zdImg_zoomBadge');
    if (!b) {
        b = document.createElement('div');
        b.id = 'zdImg_zoomBadge';
        b.className = 'zdImg_zoomBadge';
        b.style.cssText = 'position: fixed !important; z-index: 2147483647 !important; background: rgba(0,0,0,0.15) !important; color: #fff !important; text-shadow: 0 1px 3px rgba(0,0,0,0.8) !important; padding: 5px 14px !important; border-radius: 20px !important; font-size: 13px !important; font-family: system-ui, sans-serif !important; font-weight: 500 !important; pointer-events: none !important; transition: opacity 0.2s !important; transform: translate(-50%, -50%) !important; text-align: center !important; line-height: 1.2 !important; letter-spacing: normal !important; box-shadow: 0 2px 6px rgba(0,0,0,0.15) !important; width: auto !important; height: auto !important; margin: 0 !important; border: 1px solid rgba(255,255,255,0.1) !important;';
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
    
    let text = ratio + '%';
    if (rot !== 0) {
        text += ' • ' + rot + '°';
    }
    
    b.textContent = text;
    
    const rect = _img_element.getBoundingClientRect();
    let cx = rect.left + rect.width / 2;
    let cy = rect.top + 45;
    
    const marginX = 45; 
    const marginY = 25;
    
    cx = Math.max(marginX, Math.min(window.innerWidth - marginX, cx));
    cy = Math.max(marginY, Math.min(window.innerHeight - marginY, cy));
    
    b.style.left = cx + 'px';
    b.style.top = cy + 'px';
    b.style.opacity = '1';
    
    if (_badgeTimer) {
        clearTimeout(_badgeTimer);
    }
    
    if (!_rightBtnDown && !_rotParam) {
        _badgeTimer = setTimeout(() => {
            if (b) {
                b.style.opacity = '0';
            }
        }, 800);
    }
}

function updateSliderFill(input) {
    const min = parseFloat(input.min) || 0;
    const max = parseFloat(input.max) || 100;
    const val = parseFloat(input.value);
    const percent = ((val - min) / (max - min)) * 100;
    input.style.setProperty('--val', `${percent}%`);
}

function syncPanelValues() {
    const panel = document.getElementById('zd-custom-panel');
    if (!panel || !_img_element) return;

    document.querySelectorAll('.zdImgCls_b6ig4jvwe, .zdImgCls_imgSrcView').forEach(img => {
        if (img !== _img_element) {
            img.style.removeProperty('outline');
            img.style.removeProperty('outline-offset');
            img.style.removeProperty('box-shadow');
        }
    });

    const data = getElData(_img_element, _firstkey);
    const size = getElData(_img_element, _sizekey);
    if (!data || !size) return;

    const btnFlipH = document.getElementById('zd-btn-flip-h');
    const btnFlipV = document.getElementById('zd-btn-flip-v');
    
    if (btnFlipH && btnFlipV) {
        const flipX = getElData(_img_element, _flipXkey) || 1;
        const flipY = getElData(_img_element, _flipYkey) || 1;

        btnFlipH.style.background = flipX === -1 ? 'var(--bg-btn-flip-active)' : 'var(--bg-btn-neutral)';
        btnFlipH.style.color = flipX === -1 ? 'var(--text-btn-flip-active)' : 'var(--text-btn-neutral)';

        btnFlipV.style.background = flipY === -1 ? 'var(--bg-btn-flip-active)' : 'var(--bg-btn-neutral)';
        btnFlipV.style.color = flipY === -1 ? 'var(--text-btn-flip-active)' : 'var(--text-btn-neutral)';
    }

    let curZoom = Math.round((size.w / data.sw) * 100);
    let curWidth = Math.round(size.w);
    let curRot = getElData(_img_element, _rotkey) || 0;

    const zSl = document.getElementById('zd-sl-zoom'), zNum = document.getElementById('zd-num-zoom');
    const wSl = document.getElementById('zd-sl-width'), wNum = document.getElementById('zd-num-width');
    const rSl = document.getElementById('zd-sl-rot'), rNum = document.getElementById('zd-num-rot');
    const oSl = document.getElementById('zd-sl-opac'), oNum = document.getElementById('zd-num-opac');
    const bSl = document.getElementById('zd-sl-bright'), bNum = document.getElementById('zd-num-bright');

    let curOpac = 100;
    if (_img_element.style.opacity) {
        curOpac = Math.round(parseFloat(_img_element.style.opacity) * 100);
    }
    
    let curBright = 100;
    if (_img_element.style.filter && _img_element.style.filter.includes('brightness')) {
        const match = _img_element.style.filter.match(/brightness\((\d+)%\)/);
        if (match) {
            curBright = parseInt(match[1]);
        }
    }

    const active = document.activeElement;
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
    
    [zSl, wSl, rSl, oSl, bSl].forEach(slider => {
        if (slider) {
            updateSliderFill(slider);
        }
    });
}

function setZoom(img, def, skipBadge = false) {
    window.removeEventListener('wheel', zoomEvent, { capture: true });
    window.removeEventListener('wheel', defEventCancel, { capture: true });

    if (_rclickTimer) {
        clearTimeout(_rclickTimer);
        _rclickTimer = null;
    }

    if (img) {
        if (_isExcludedHost) {
            _img_element = null;
            return;
        }
        
        d('ZoomTarget Set', '----------');
        _img_element = img;
        _current_element = img;

        let data = getElData(img, _firstkey);
        const isBg = !!getElData(img, _bgsrckey);
        
        if (!data) {
            let uw = def ? def.sw : (img.offsetWidth || img.naturalWidth || 100);
            let uh = def ? def.sh : (img.offsetHeight || img.naturalHeight || 100);

            if (!def && !isBg && img.tagName === 'IMG' && img.naturalWidth > 0 && img.naturalHeight > 0) {
                const natRatio = img.naturalWidth / img.naturalHeight;
                const cssRatio = uw / uh;
                const compStyle = window.getComputedStyle(img);
                const objFit = compStyle.objectFit || 'fill';
                
                if (objFit !== 'cover' && objFit !== 'contain' && Math.abs(cssRatio - natRatio) > 0.01) {
                    if (natRatio > cssRatio) {
                        uh = uw / natRatio;
                    } else {
                        uw = uh * natRatio;
                    }
                }
            }

            const rect = img.getBoundingClientRect();
            const cx = rect.left + window.scrollX + rect.width / 2;
            const cy = rect.top + window.scrollY + rect.height / 2;

            let txPct = 0, tyPct = 0;
            const compStyle = window.getComputedStyle(img);
            if (compStyle.transform && compStyle.transform !== 'none') {
                try {
                    const matrix = new DOMMatrix(compStyle.transform);
                    if (uw > 0) txPct = Math.round((matrix.m41 / uw) * 100);
                    if (uh > 0) tyPct = Math.round((matrix.m42 / uh) * 100);
                } catch (e) {
                    d('DOMMatrix error', e.message, 'error');
                }
            }

            const obj = { 
                id: 'zdImg_' + new Date().getTime().toString(16),
                sw: uw,
                sh: uh,
                sx: def ? def.sx : (cx - uw / 2),
                sy: def ? def.sy : (cy - uh / 2),
                txPct: txPct,
                tyPct: tyPct,
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
            setElData(img, _rotkey,  0);
            setElData(img, _flipXkey, 1);
            setElData(img, _flipYkey, 1);
        } else {
            if (!getElData(img, _srckey)) {
                const curSize = getElData(img, _sizekey);
                const isSizeModified = curSize && (curSize.w !== data.sw || curSize.h !== data.sh);
                const isRotModified = (getElData(img, _rotkey) || 0) !== 0;
                const isDragged = img.classList.contains(_draggedCls);

                if (!isSizeModified && !isRotModified && !isDragged && !img.classList.contains('zdImgCls_animated')) {
                    let uw = img.offsetWidth || img.naturalWidth || 100;
                    let uh = img.offsetHeight || img.naturalHeight || 100;
                    
                    if (!isBg && img.tagName === 'IMG' && img.naturalWidth > 0 && img.naturalHeight > 0) {
                        const natRatio = img.naturalWidth / img.naturalHeight;
                        const cssRatio = uw / uh;
                        if (Math.abs(cssRatio - natRatio) > 0.01) {
                            if (natRatio > cssRatio) {
                                uh = uw / natRatio;
                            } else {
                                uw = uh * natRatio;
                            }
                        }
                    }

                    const rect = img.getBoundingClientRect();
                    data.sw = uw;
                    data.sh = uh;
                    data.sx = rect.left + window.scrollX + (rect.width - uw) / 2;
                    data.sy = rect.top + window.scrollY + (rect.height - uh) / 2;
                }
            }
        }

        setZoom.zIndexCounter = (setZoom.zIndexCounter || 10) + 1;
        if (setZoom.zIndexCounter > 1000000) {
            setZoom.zIndexCounter = 10;
        }
        
        _img_element.style.setProperty('z-index', setZoom.zIndexCounter.toString(), 'important');
        window.addEventListener('wheel', zoomEvent, { passive: false, capture: true });

        if (_zoom_rcCancel > 0) {
            _rclickTimer = setTimeout(() => {
                if (_rotParam) return;
                setZoom();
            }, _zoom_rcCancel);
        }

        if (!skipBadge) {
            showZoomBadge();
        }

    } else {
        if (document.getElementById('zd-custom-panel')) {
            d('ZoomTarget Clear', 'Blocked because custom panel is open', 'debug');
            _ctx_show = true;
            return;
        }

        d('ZoomTarget Clear', '');

        if (_rclickHoldTimer) {
            clearTimeout(_rclickHoldTimer);
            _rclickHoldTimer = null;
        }

        let b = document.getElementById('zdImg_zoomBadge');
        if (b) {
            b.style.opacity = '0';
        }

        if (_img_element) {
            if (_zoom_autoRtn) {
                const src_elem = getElData(_img_element, _srckey);
                if (src_elem) {
                    clearImgEx(src_elem);
                }
                setImageRect();
                imgRotate(0);
            } else {
                const data = getElData(_img_element, _firstkey);
                const size = getElData(_img_element, _sizekey);
                const rot = getElData(_img_element, _rotkey) || 0;
                const isFloating = !!getElData(_img_element, _srckey);
                const isDragged = _img_element.classList.contains(_draggedCls);
                
                if (data && size && Math.abs(size.w - data.sw) < 2 && Math.abs(size.h - data.sh) < 2 && rot === 0 && !isFloating && !isDragged) {
                    if (data.origStyle && data.origStyle.zIndex !== undefined) {
                        _img_element.style.removeProperty('z-index');
                        _img_element.style.zIndex = data.origStyle.zIndex;
                    } else {
                        _img_element.style.removeProperty('z-index');
                    }
                }
            }
        }
        
        _img_element = null;
        _ctx_show = true;
    }
}

function calcPos(zoomSize) {
    const winW = _singleImgPage ? window.innerWidth : document.documentElement.clientWidth;
    const winH = _singleImgPage ? window.innerHeight : document.documentElement.clientHeight;
    const scrX = window.scrollX;
    const scrY = window.scrollY;
    
    const data = getElData(_img_element, _firstkey);
    let rect = { x: data.sx, y: data.sy, w: data.sw, h: data.sh, r: data.sx + data.sw, b: data.sy + data.sh };
    let x = rect.x, y = rect.y;

    const isDragged = _img_element.classList.contains(_draggedCls);
    if (isDragged) {
        const rawLeft = parseFloat(_img_element.style.left);
        const rawTop = parseFloat(_img_element.style.top);
        const ofst = {
            left: isNaN(rawLeft) ? getOffset(_img_element).left : rawLeft,
            top: isNaN(rawTop) ? getOffset(_img_element).top : rawTop
        };
        const currentSize = getElData(_img_element, _sizekey);
        const iesz = currentSize ? { w: currentSize.w, h: currentSize.h } : { w: _img_element.offsetWidth, h: _img_element.offsetHeight };
            
        rect = { x: ofst.left, y: ofst.top, w: iesz.w, h: iesz.h, r: ofst.left + iesz.w, b: ofst.top + iesz.h };
    }
    
    const rot = getElData(_img_element, _rotkey) || 0;
    const rad = rot * Math.PI / 180;
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

    if (!isDragged && !_singleImgPage && !isBg) {
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
            visLeft = scrRect.x - ((visW - scrRect.w) / 2);
        }
        
        if (visH <= scrRect.h) {
            if (visTop < scrRect.y) {
                visTop = scrRect.y;
            }
            if (visTop + visH > scrRect.b) {
                visTop = scrRect.b - visH;
            }
        } else {
            visTop = scrRect.y - ((visH - scrRect.h) / 2);
        }
    }

    x = visLeft - (zoomSize.w - visW) / 2;
    y = visTop - (zoomSize.h - visH) / 2;

    return { x: x, y: y, w: zoomSize.w, h: zoomSize.h };
}

function calcLimit(w, h, sw, sh, rot) {
    if (rot) {
        const rad = rot * Math.PI / 180;
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
    d('Create FloatImage', '');
    let exImgWrapper = document.getElementById(_zdExImgId);
    
    if (!exImgWrapper) {
        exImgWrapper = document.createElement('div');
        exImgWrapper.id = _zdExImgId;
        exImgWrapper.style.cssText = 'position: absolute !important; top: 0 !important; left: 0 !important; margin: 0 !important; padding: 0 !important; border: none !important; z-index: 2147483640 !important; overflow: visible !important;';
        document.body.appendChild(exImgWrapper);

        if (_singleImgPage) {
            document.documentElement.style.setProperty('overflow', 'hidden', 'important');
            document.body.style.setProperty('overflow', 'hidden', 'important');
        }
    }
 
    const data = getElData(_img_element, _firstkey);
    const isBg = !!getElData(_img_element, _bgsrckey);
    
    if (isBg) {
        if (data && data.origStyle && data.origStyle.backgroundImage === undefined) {
            data.origStyle.backgroundImage = _img_element.style.backgroundImage;
        }
        _img_element.style.setProperty('background-image', 'none', 'important');
    } else {
        _img_element.style.visibility = 'hidden';
    }

    _img_element.style.removeProperty('outline');
    _img_element.style.removeProperty('outline-offset');
    _img_element.style.removeProperty('box-shadow');

    const rect = calcPos({ w: size.w, h: size.h });
    const rot = getElData(_img_element, _rotkey);
    let img = document.getElementById(data.id);

    if (!img) {
        img = document.createElement('img');
        img.id = data.id;
        img.className = _zdImgCls;
        img.src = _img_element.currentSrc || getElData(_img_element, _bgsrckey) || _img_element.getAttribute('src');

        if (_img_element.srcset) {
            img.srcset = _img_element.srcset;
        }
        if (_img_element.sizes) {
            img.sizes = _img_element.sizes;
        }

        const compStyle = window.getComputedStyle(_img_element);
        let objFit = compStyle.objectFit || 'fill';
        
        if (objFit === 'scale-down' || objFit === 'none') {
            objFit = 'contain';
        }

        if (isBg) {
            const bgSize = compStyle.backgroundSize || '';
            if (bgSize.includes('contain')) {
                objFit = 'contain';
            } else {
                objFit = 'cover';
            }
        }

        img.style.setProperty('object-fit', objFit, 'important');
        img.style.setProperty('object-position', compStyle.objectPosition || 'center', 'important');
        img.style.setProperty('box-sizing', 'border-box', 'important');
        img.style.setProperty('margin', '0', 'important');
        img.style.setProperty('padding', '0', 'important');
        img.style.setProperty('border', 'none', 'important');

        if (_img_element.style.opacity) {
            img.style.setProperty('opacity', _img_element.style.opacity, 'important');
        }
        if (_img_element.style.filter) {
            img.style.setProperty('filter', _img_element.style.filter, 'important');
        }

        img.addEventListener('mouseover', e => e.preventDefault());
        img.addEventListener('drag', e => e.preventDefault());
        img.addEventListener('dragstart', e => e.preventDefault());
        img.addEventListener('dragend', e => e.preventDefault());
        img.addEventListener('pointerdown', e => e.stopPropagation());

        const al = _img_element.closest('a');
        if (al) {
            const pt = document.createElement('a');

            pt.style.cssText = 'position: static !important; display: inline !important; margin: 0 !important; padding: 0 !important; border: none !important; transform: none !important;';
            pt.addEventListener('dragstart', e => e.preventDefault());

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
}

function clearImgEx(src_elem, size) {
    d('Delete FloatImage', '');
    const data = getElData(_img_element, _firstkey);
    const rot = getElData(_img_element, _rotkey);
    
    const isBg = !!getElData(src_elem, _bgsrckey);
    if (isBg) {
        const srcData = getElData(src_elem, _firstkey);
        src_elem.style.removeProperty('background-image');
        if (srcData && srcData.origStyle && srcData.origStyle.backgroundImage !== undefined) {
            src_elem.style.backgroundImage = srcData.origStyle.backgroundImage;
        }
    } else {
        src_elem.style.visibility = 'visible';

        if (_singleImgPage && !document.querySelector('.' + _imgSrcViewCls)) {
            document.documentElement.style.removeProperty('overflow');
            document.body.style.removeProperty('overflow');
        }
    }

    if (_img_element.style.opacity) {
        src_elem.style.setProperty('opacity', _img_element.style.opacity, 'important');
    } else {
        src_elem.style.removeProperty('opacity');
    }
    
    if (_img_element.style.filter) {
        src_elem.style.setProperty('filter', _img_element.style.filter, 'important');
    } else {
        src_elem.style.removeProperty('filter');
    }

    src_elem.style.removeProperty('outline');
    src_elem.style.removeProperty('outline-offset');
    src_elem.style.removeProperty('box-shadow');

    const pnt = _img_element.closest('a');
    if (pnt && pnt.parentNode === document.getElementById(_zdExImgId)) {
        pnt.remove();
    } else {
        _img_element.remove();
    }
    
    setZoom(src_elem, { sx: data.sx, sy: data.sy, sw: data.sw, sh: data.sh });
    setImageRect(size);
    imgRotate(rot);

    showZoomBadge();
}

function checkSingleImgActivation(element, curW, curH) {
    if (!_singleImgPage || !element || !element.classList.contains(_imgSrcViewCls)) return;

    const data = getElData(element, _firstkey);
    if (!data) return;

    const rot = getElData(element, _rotkey) || 0;
    const flipX = getElData(element, _flipXkey) || 1;
    const flipY = getElData(element, _flipYkey) || 1;

    const hasOpacity = element.style.opacity && parseFloat(element.style.opacity) !== 1;
    const hasBright = element.style.filter && !element.style.filter.includes('brightness(100%)');

    const isDragged = element.classList.contains(_draggedCls);

    const isUnmodified = !isDragged && Math.abs(curW - data.sw) < 2 && Math.abs(curH - data.sh) < 2 && rot === 0 && flipX === 1 && flipY === 1 && !hasOpacity && !hasBright;

    if (isUnmodified) {
        element.style.setProperty('cursor', 'zoom-in', 'important');
        element.classList.remove(_zdImgCls);
        element.style.removeProperty('outline');
        element.style.removeProperty('outline-offset');
        element.style.removeProperty('box-shadow');
    } else {
        element.style.setProperty('cursor', 'grab', 'important');
        element.classList.add(_zdImgCls);

        element.style.removeProperty('outline');
        element.style.removeProperty('outline-offset');
        element.style.removeProperty('box-shadow');
        
        if (typeof _img_element !== 'undefined' && _img_element !== element) {
            setZoom(element, null, true);
        }
    }
}

function setImageRect(size, element) {
    if (!element) {
        element = _img_element;
    }
    const data = getElData(element, _firstkey);

    if (!size && !getElData(element, _srckey)) {
        if (data && data.origStyle) {
            element.style.removeProperty('left');
            element.style.removeProperty('top');
            element.style.removeProperty('width');
            element.style.removeProperty('height');
            element.style.removeProperty('max-width');
            element.style.removeProperty('max-height');
            element.style.removeProperty('min-width');
            element.style.removeProperty('min-height');
            element.style.removeProperty('transform-origin');
            element.style.removeProperty('object-fit');
            element.style.removeProperty('background-image');
            element.style.removeProperty('cursor');
            element.style.removeProperty('flex-shrink');
            element.style.removeProperty('contain');

            element.style.left = data.origStyle.left;
            element.style.top = data.origStyle.top;
            element.style.width = data.origStyle.width;
            element.style.height = data.origStyle.height;
            element.style.maxWidth = data.origStyle.maxWidth;
            element.style.maxHeight = data.origStyle.maxHeight;
            element.style.minWidth = data.origStyle.minWidth || '';
            element.style.minHeight = data.origStyle.minHeight || '';
            element.style.transformOrigin = data.origStyle.transformOrigin;
            element.style.objectFit = data.origStyle.objectFit || '';
            
            if (data.origStyle.backgroundImage !== undefined) {
                element.style.backgroundImage = data.origStyle.backgroundImage;
            }
        } else {
            element.style.removeProperty('left');
            element.style.removeProperty('top');
            element.style.removeProperty('width');
            element.style.removeProperty('height');
            element.style.removeProperty('max-width');
            element.style.removeProperty('max-height');
            element.style.removeProperty('min-width');
            element.style.removeProperty('min-height');
            element.style.removeProperty('transform-origin');
            element.style.removeProperty('object-fit');
            element.style.removeProperty('background-image');
            element.style.removeProperty('cursor');
            element.style.removeProperty('flex-shrink');
            element.style.removeProperty('contain');
        }

        if (_singleImgPage && !_zoom_ivpDrag && element.tagName === 'IMG') {
            const isNativelyZoomed = element.clientWidth === element.naturalWidth && 
                                     (element.naturalWidth > window.innerWidth || element.naturalHeight > window.innerHeight);
            
            if (isNativelyZoomed) {
                setTimeout(() => {
                    element.click();
                    setTimeout(() => {
                        if (data) {
                            data.sw = element.offsetWidth;
                            data.sh = element.offsetHeight;
                            setElData(element, _sizekey, { w: data.sw, h: data.sh });
                        }
                    }, 50);
                }, 10);
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
            
            element.style.setProperty('width', newFit.w + 'px', 'important');
            element.style.setProperty('height', newFit.h + 'px', 'important');
            element.style.setProperty('min-width', newFit.w + 'px', 'important');
            element.style.setProperty('min-height', newFit.h + 'px', 'important');
            element.style.setProperty('left', nLeft + 'px', 'important');
            element.style.setProperty('top', nTop + 'px', 'important');
            
            data.sx = nLeft;
            data.sy = nTop;
            
            element.style.setProperty('cursor', 'zoom-in', 'important');
            element.classList.remove(_zdImgCls);
            
            element.style.removeProperty('outline');
            element.style.removeProperty('outline-offset');
            element.style.removeProperty('box-shadow');
        }

        setElData(element, _sizekey, { w: data.sw, h: data.sh });
        d('ImageSize Reset', data.sw + ', ' + data.sh);
        
        if (!element || element === _img_element) {
            syncPanelValues();
        }
        return;
    }

    const rect = size ? calcPos({ w: size.w, h: size.h }) : { x: data.sx, y: data.sy, w: data.sw, h: data.sh };

    const isSinglePageImg = _singleImgPage && element.classList.contains(_imgSrcViewCls);
    if (getElData(element, _srckey) || isSinglePageImg) {
        element.style.setProperty('left', rect.x + 'px', 'important');
        element.style.setProperty('top', rect.y + 'px', 'important');
    }
    
    element.style.setProperty('width', rect.w + 'px', 'important');
    element.style.setProperty('height', rect.h + 'px', 'important');
    element.style.setProperty('min-width', rect.w + 'px', 'important');
    element.style.setProperty('min-height', rect.h + 'px', 'important');
    element.style.setProperty('max-width', 'none', 'important');
    element.style.setProperty('max-height', 'none', 'important');

    element.style.setProperty('flex-shrink', '0', 'important');
    element.style.setProperty('contain', 'none', 'important');
    element.style.setProperty('transform-origin', '50% 50%', 'important');

    if (!getElData(element, _srckey)) {
        element.style.setProperty('object-fit', 'contain', 'important');
    }

    setElData(element, _sizekey, { w: rect.w, h: rect.h });
    d('ImageSize', rect.w + ', ' + rect.h);

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

    if (_singleImgPage && !element.classList.contains(_imgSrcViewCls) && !getElData(element, _srckey) && rot !== 0) {
        const size = getElData(element, _sizekey) || { w: element.offsetWidth, h: element.offsetHeight };
        generateImgEx(size);
        element = _img_element;

        if (typeof _rotParam !== 'undefined' && _rotParam && _rotParam.obj) {
            _rotParam.obj = _img_element;
        }
    }
    
    const flipX = getElData(element, _flipXkey) || 1;
    const flipY = getElData(element, _flipYkey) || 1;

    if (rot === 0 && flipX === 1 && flipY === 1) {
        if (!getElData(element, _srckey)) {
            const data = getElData(element, _firstkey);
            if (data && data.origStyle && data.origStyle.transform) {
                element.style.removeProperty('transform');
                element.style.transform = data.origStyle.transform;
            } else {
                element.style.removeProperty('transform');
            }
        } else {
            element.style.setProperty('transform', 'none', 'important');
        }
    } else {
        let transformStr = `rotate(${rot}deg) scale(${flipX}, ${flipY})`;
        const data = getElData(element, _firstkey);

        if (data && !getElData(element, _srckey)) {
            if (data.txPct !== 0 || data.tyPct !== 0) {
                transformStr = `translate(${data.txPct}%, ${data.tyPct}%) rotate(${rot}deg) scale(${flipX}, ${flipY})`;
            }
        }

        element.style.setProperty('transform', transformStr, 'important');
    }
    
    d('ImageRotate deg', rot);
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

    const minWidth = Math.max(data.sw * 0.05, 20);
    
    if (w < minWidth) {
        w = minWidth;
        h = (data.sh / data.sw) * minWidth;
    }

    let floating = _zoom_ctrlRvs ? _accKeyState.ctrl : !_accKeyState.ctrl;
    const tag = _img_element.tagName.toUpperCase();
    const origElem = getElData(_img_element, _srckey) || _img_element;
    const isBg = !!getElData(origElem, _bgsrckey);

    if (tag === 'CANVAS') floating = false;
    if (isBg) floating = true;
    if (_singleImgPage) {
        floating = !_img_element.classList.contains(_imgSrcViewCls);
    } 
    
    d('Floating zoom', floating);

    if (!isBg && floating && tag === 'IMG' && _img_element.naturalWidth > 0 && _img_element.naturalHeight > 0) {
        const natRatio = _img_element.naturalWidth / _img_element.naturalHeight;
        const cssRatio = w / h;
        if (Math.abs(cssRatio - natRatio) > 0.01) {
            if (natRatio > cssRatio) {
                h = w / natRatio;
            } else {
                w = h * natRatio;
            }
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
    if (_img_element) {
        _img_element.classList.remove(_draggedCls);

        _img_element.style.removeProperty('opacity');
        _img_element.style.removeProperty('filter');
        _img_element.style.removeProperty('outline');
        _img_element.style.removeProperty('outline-offset');
        _img_element.style.removeProperty('box-shadow');
        
        setElData(_img_element, _flipXkey, 1);
        setElData(_img_element, _flipYkey, 1);

        const data = getElData(_img_element, _firstkey);
        if (data && data.origStyle && data.origStyle.zIndex !== undefined) {
            _img_element.style.removeProperty('z-index');
            _img_element.style.zIndex = data.origStyle.zIndex;
        } else {
            _img_element.style.removeProperty('z-index');
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

        if (tag === 'CANVAS') floating = false;
        if (isBg) floating = true;
        if (_singleImgPage) {
            floating = !_img_element.classList.contains(_imgSrcViewCls);
        } 
        
        d('Floating zoom', floating);

        if (!src_elem) {
            const isFit = Math.abs(w - data.sw) < 2 && Math.abs(h - data.sh) < 2;
            if (isFit && tag === 'IMG') {
                if ((nw > data.sw && nh > data.sh) && floating) {
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
            setImageRect();
            imgRotate(0);
        }

        showZoomBadge();
        _ctx_show = false;
        return false;
    }
    return true;
}

function windowFiting(fromCtxMenu) {
    if (_img_element) {
        d('Window Fit', '');
        _img_element.classList.remove(_draggedCls);
        enableAnim(_img_element);

        const winW = _singleImgPage ? window.innerWidth : document.documentElement.clientWidth;
        const winH = _singleImgPage ? window.innerHeight : document.documentElement.clientHeight;
        const data = getElData(_img_element, _firstkey);
        
        if (data) {
            data.sx = window.scrollX + (winW / 2) - (data.sw / 2);
            data.sy = window.scrollY + (winH / 2) - (data.sh / 2);
        }

        zoom(10000, true);
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
        window.removeEventListener('wheel', zoomEvent, { capture: true });
        return;
    }
    
    if (!_img_element) {
        if (_singleImgPage && _hoverTarget) {
            setZoom(_hoverTarget, null, true);
        } else {
            d('Zoom Event Aborted', 'Target image is missing', 'warn');
            window.removeEventListener('wheel', zoomEvent, { capture: true });
            return;
        }
    }

    const panel = document.getElementById('zd-custom-panel');
    if (panel) {
        if (panel.contains(e.target)) return;
        
        const isHoveringImg = e.target === _img_element || (e.target && e.target.classList && e.target.classList.contains(_zdImgCls));
        if (!isHoveringImg && !_singleImgPage && !_rightBtnDown) {
            return;
        }
    }

    disableAnim(_img_element);
    
    let delta = e.deltaY ? -(e.deltaY) : (e.wheelDelta ? e.wheelDelta : -(e.detail));
    d('Wheel delta', delta);
    delta = _zoom_reverse ? -delta : delta;
    
    const dim = _zoom_dim * 0.01;
    const r = delta < 0 ? 1 - dim : (delta > 0 ? 1 + dim : 1);

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

        if (_img_element.tagName && _img_element.tagName.toUpperCase() === 'CANVAS') floating = false;
        if (isBg) floating = true;
        if (_singleImgPage) {
            floating = !_img_element.classList.contains(_imgSrcViewCls);
        }

        if (floating && _zoom_trackCursor) {
            if (!getElData(_img_element, _srckey)) {
                const size = getElData(_img_element, _sizekey);
                let w = size.w;
                let h = size.h;
                
                if (!isBg && _img_element.tagName === 'IMG' && _img_element.naturalWidth > 0 && _img_element.naturalHeight > 0) {
                    const natRatio = _img_element.naturalWidth / _img_element.naturalHeight;
                    const cssRatio = w / h;
                    if (Math.abs(cssRatio - natRatio) > 0.01) {
                        if (natRatio > cssRatio) {
                            h = w / natRatio;
                        } else {
                            w = h * natRatio;
                        }
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

                const directionMultiplier = (r > 1) ? -1 : 1;
                
                const shiftX = (e.pageX - rendered_Mx) * directionMultiplier;
                const shiftY = (e.pageY - rendered_My) * directionMultiplier;

                const currentLeft = parseFloat(_img_element.style.left) || getOffset(_img_element).left;
                const currentTop = parseFloat(_img_element.style.top) || getOffset(_img_element).top;
                
                _img_element.style.setProperty('left', (currentLeft + shiftX) + 'px', 'important');
                _img_element.style.setProperty('top', (currentTop + shiftY) + 'px', 'important');

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

function ctxZoomCustom() {
    if (!_current_element) return;
    setZoom(_current_element);

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

    const applyPanelBorder = () => {
        if (!document.getElementById('zd-custom-panel')) return; 

        if (_img_element) {
            const isFloating = !!getElData(_img_element, _srckey);
            const isSingleImgView = _singleImgPage && _img_element.classList.contains(_imgSrcViewCls);
            
            if (isSingleImgView) {
                _img_element.style.removeProperty('outline');
                _img_element.style.removeProperty('outline-offset');
                _img_element.style.removeProperty('box-shadow');
            } else {
                _img_element.style.setProperty('outline', '2px solid rgba(53, 117, 221, 0.5)', 'important');
                
                if (isFloating) {
                    _img_element.style.setProperty('outline-offset', '0px', 'important');
                    _img_element.style.setProperty('box-shadow', '0 0 15px rgba(53, 117, 221, 0.4)', 'important');
                } else {
                    _img_element.style.setProperty('outline', '3px solid rgba(53, 117, 221, 0.9)', 'important');
                    _img_element.style.setProperty('outline-offset', '-3px', 'important');
                    _img_element.style.setProperty('box-shadow', 'inset 0 0 0 1px rgba(255, 255, 255, 0.9), inset 0 0 20px rgba(53, 117, 221, 0.7)', 'important');
                }
            }
        }
    };

    const removePanelBorder = () => {
        if (_img_element) {
            _img_element.style.removeProperty('outline');
            _img_element.style.removeProperty('outline-offset');
            _img_element.style.removeProperty('box-shadow');
        }
    };

    const ensureFloating = () => {
        if (!_img_element || _img_element.tagName.toUpperCase() === 'CANVAS') return;
        
        if (_singleImgPage && _img_element.classList.contains(_imgSrcViewCls)) {
            applyPanelBorder();
            return;
        }
        
        if (!getElData(_img_element, _srckey)) {
            const bData = getElData(_img_element, _firstkey);
            if (!bData) return;
            const sz = getElData(_img_element, _sizekey) || { w: bData.sw, h: bData.sh };
            generateImgEx({ w: sz.w, h: sz.h }); 
        }
        applyPanelBorder(); 
    };

    if (document.getElementById('zd-custom-panel')) {
        ensureFloating();
        syncPanelValues();
        return;
    }

    let curZoom = Math.round((initialSize.w / initialData.sw) * 100);
    let curWidth = Math.round(initialSize.w);
    let curRot = getElData(_img_element, _rotkey) || 0;

    let curOpac = 100;
    if (_img_element.style.opacity) {
        curOpac = Math.round(parseFloat(_img_element.style.opacity) * 100);
    }
    
    let curBright = 100;
    if (_img_element.style.filter && _img_element.style.filter.includes('brightness')) {
        const match = _img_element.style.filter.match(/brightness\((\d+)%\)/);
        if (match) {
            curBright = parseInt(match[1]);
        }
    }

    const t = (key, fallback) => (typeof browser !== 'undefined' && browser.i18n && browser.i18n.getMessage(key)) || fallback;
    
    const panel = document.createElement('div');
    panel.id = 'zd-custom-panel';
    panel.style.cssText = 'position: fixed; top: 20px; right: 20px; width: fit-content; min-width: 420px; border-radius: 12px; font-family: system-ui, sans-serif; box-shadow: 0 10px 30px rgba(0,0,0,0.25); z-index: 2147483647; backdrop-filter: blur(8px); display: flex; flex-direction: column; overflow: hidden;';
    
    panel.innerHTML = `
        <style>
            #zd-custom-panel,
            #zd-custom-panel * {
                box-sizing: border-box !important;
                font-family: system-ui, -apple-system, sans-serif !important;
                letter-spacing: normal !important;
                word-spacing: normal !important;
                text-transform: none !important;
                text-indent: 0 !important;
                text-shadow: none !important;
                white-space: normal !important;
                line-height: normal !important;
            }

            #zd-custom-panel {
                width: max-content !important;
                min-width: 420px !important;
                max-width: none !important;
                margin: 0 !important;

                --bg-panel: rgba(255, 255, 255, 0.95);
                --text-main: #333;
                --border-panel: #ccc;
                --bg-header: #f4f6fa;
                --text-header: #1a1a1a;
                --bg-input: #fff;
                --border-input: #ccc;
                --bg-btn-neutral: #f0f0f4 !important;
                --text-btn-neutral: #333 !important;
                --bg-btn-reset: #d46a6a !important;
                --text-btn-reset: #ffffff !important;
                --bg-btn-save: #6ea885 !important;
                --text-btn-save: #ffffff !important;
                --bg-btn-close: #689af8 !important;
                --text-btn-close: #ffffff !important;
                --bg-btn-flip-active: #d3e0f0 !important;
                --text-btn-flip-active: #2c3e50 !important;
                --border-btn: rgba(0, 0, 0, 0.15) !important;
                --hover-bright: 0.92;

                background: var(--bg-panel) !important;
                color: var(--text-main) !important;
                border: 1px solid var(--border-panel) !important;
            }

            #zd-panel-header h3 {
                font-size: 15px !important;
                font-weight: 500 !important;
                margin: 0 !important;
                padding: 0 !important;
                line-height: 1.2 !important;
            }

            @media (prefers-color-scheme: dark) {
                #zd-custom-panel {
                    --bg-panel: rgba(30, 30, 32, 0.95);
                    --text-main: #e8e8e8;
                    --border-panel: #444;
                    --bg-header: #2a2a2c;
                    --text-header: #fff;
                    --bg-input: #2a2a2c;
                    --border-input: #555;
                    --bg-btn-neutral: #3a3a3c !important;
                    --text-btn-neutral: #e8e8e8 !important;
                    --bg-btn-reset: #b05c5c !important;
                    --text-btn-reset: #ffffff !important;
                    --bg-btn-save: #528265 !important;
                    --text-btn-save: #ffffff !important;
                    --bg-btn-close: #3166d4 !important;
                    --text-btn-close: #ffffff !important;
                    --bg-btn-flip-active: #2c3b4e !important;
                    --text-btn-flip-active: #e8e8e8 !important;
                    --border-btn: rgba(255, 255, 255, 0.1) !important;
                    --hover-bright: 1.15;
                }
            }

            #zd-custom-panel input[type="range"] {
                -webkit-appearance: none !important;
                appearance: none !important;
                background: transparent !important;
            }

            @supports (-moz-appearance: none) {
                #zd-custom-panel input[type="range"] {
                    appearance: auto !important;
                    -moz-appearance: auto !important;
                }
            }

            #zd-custom-panel input[type="range"]:focus,
            #zd-custom-panel input[type="range"]:active {
                outline: none !important;
                box-shadow: none !important;
            }

            #zd-custom-panel input[type="range"]::-webkit-slider-runnable-track {
                height: 6px !important;
                border-radius: 3px !important;
                background: linear-gradient(to right, #0d6efd var(--val, 50%), var(--border-input) var(--val, 50%)) !important;
            }

            #zd-custom-panel input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none !important;
                appearance: none !important;
                width: 16px !important;
                height: 16px !important;
                background: #5a5f68 !important;
                border: 2px solid #ffffff !important;
                border-radius: 50% !important;
                box-shadow: 0 1px 3px rgba(0,0,0,0.3) !important;
                margin-top: -5px !important;
                cursor: pointer !important;
            }

            .zd-input-num {
                all: revert !important; 
                
                appearance: auto !important; 
                -webkit-appearance: auto !important;
                -moz-appearance: number-input !important; 
                background: var(--bg-input) !important;
                color: var(--text-main) !important;
                border: 1px solid var(--border-input) !important;
                border-radius: 4px !important;
                text-align: right !important;
                width: 65px !important;
                padding: 4px 2px 4px 6px !important;
                outline: none !important;
                font-size: 13px !important;
                height: 26px !important; 
                margin: 0 !important;
                box-sizing: border-box !important;
            }

            .zd-input-num::-webkit-inner-spin-button, 
            .zd-input-num::-webkit-outer-spin-button {
                all: revert !important; 
                -webkit-appearance: inner-spin-button !important;
                opacity: 1 !important;
            }
            .zd-input-num:focus {
                border-color: #3575dd !important;
                box-shadow: 0 0 0 2px rgba(53, 117, 221, 0.3) !important;
            }

            .zd-mini-reset {
                background: transparent !important;
                border: none !important;
                color: var(--text-main) !important;
                cursor: pointer !important;
                padding: 2px 4px !important;
                margin: 0 !important;
                font-size: 16px !important;
                opacity: 0.5 !important;
                transition: opacity 0.2s, transform 0.2s, color 0.2s !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                line-height: 1 !important;
                width: auto !important;
                height: auto !important;
            }

            .zd-mini-reset:hover {
                opacity: 1 !important;
                transform: rotate(-45deg) !important;
                color: #3575dd !important;
            }

            .zd-panel-btn {
                transition: all 0.2s ease !important;
                border: 1px solid var(--border-btn) !important;
                border-radius: 6px !important;
                cursor: pointer !important;
                font-weight: 500 !important;
                padding: 7px 8px !important;
                margin: 0 !important;
                flex: 1 !important;
                font-size: 13px !important;
                line-height: 1.2 !important;
                width: auto !important;
                height: auto !important;
                display: block !important;
                text-align: center !important;
            }
            .zd-panel-btn:hover {
                transform: translateY(-2px) !important;
                box-shadow: 0 4px 10px rgba(0,0,0,0.2) !important;
                filter: brightness(var(--hover-bright)) !important;
            }
            .zd-panel-btn:active {
                transform: translateY(1px) !important;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
                filter: brightness(1) !important;
            }
            #zd-btn-x {
                transition: color 0.2s ease, transform 0.2s ease !important;
                color: #888 !important;
                padding: 0 4px !important;
                margin: 0 !important;
            }
            #zd-btn-x:hover {
                color: #e63946 !important;
                transform: scale(1.2) !important;
            }
            .zd-panel-label {
                width: 85px !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                flex-shrink: 0 !important;
                font-weight: 500 !important;
                font-size: 13px !important;
                margin: 0 !important;
                padding: 0 0 2px 0 !important;
                line-height: 1.3 !important;
            }
        </style>

        <div id="zd-panel-header" style="background: var(--bg-header); padding: 12px 20px; border-bottom: 1px solid var(--border-panel); cursor: grab; display: flex; justify-content: space-between; align-items: center; user-select: none;">
            <h3 style="margin: 0; font-size: 15px; color: var(--text-header);">${t('panel_title')}</h3>
            <div id="zd-btn-x" title="${t('panel_tooltip_close')}" style="cursor: pointer; font-size: 22px; font-weight: bold; line-height: 1; padding: 0 4px;">&times;</div>
        </div>
        
        <div style="padding: 20px; display: grid; gap: 14px; font-size: 13px;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <span class="zd-panel-label">${t('panel_label_zoom')}</span>
                <input type="range" id="zd-sl-zoom" min="5" max="500" value="${curZoom}" style="flex: 1; cursor: pointer;">
                <input type="number" id="zd-num-zoom" class="zd-input-num" value="${curZoom}">
                <button id="zd-btn-reset-zoom" class="zd-mini-reset" title="${t('panel_tooltip_reset_zoom')}">&#x21BA;</button>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <span class="zd-panel-label">${t('panel_label_width')}</span>
                <input type="range" id="zd-sl-width" min="20" max="5000" value="${curWidth}" style="flex: 1; cursor: pointer;">
                <input type="number" id="zd-num-width" class="zd-input-num" value="${curWidth}">
                <button id="zd-btn-reset-width" class="zd-mini-reset" title="${t('panel_tooltip_reset_width')}">&#x21BA;</button>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <span class="zd-panel-label">${t('panel_label_rot')}</span>
                <input type="range" id="zd-sl-rot" min="-180" max="180" value="${curRot}" style="flex: 1; cursor: pointer;">
                <input type="number" id="zd-num-rot" class="zd-input-num" value="${curRot}">
                <button id="zd-btn-reset-rot" class="zd-mini-reset" title="${t('panel_tooltip_reset_rot')}">&#x21BA;</button>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <span class="zd-panel-label">${t('panel_label_opacity')}</span>
                <input type="range" id="zd-sl-opac" min="10" max="100" value="${curOpac}" style="flex: 1; cursor: pointer;">
                <input type="number" id="zd-num-opac" class="zd-input-num" value="${curOpac}">
                <button id="zd-btn-reset-opac" class="zd-mini-reset" title="${t('panel_tooltip_reset_opac')}">&#x21BA;</button>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <span class="zd-panel-label">${t('panel_label_brightness')}</span>
                <input type="range" id="zd-sl-bright" min="10" max="200" value="${curBright}" style="flex: 1; cursor: pointer;">
                <input type="number" id="zd-num-bright" class="zd-input-num" value="${curBright}">
                <button id="zd-btn-reset-bright" class="zd-mini-reset" title="${t('panel_tooltip_reset_bright')}">&#x21BA;</button>
            </div>
            <div style="display: flex; align-items: center; gap: 10px; margin-top: 4px;">
                <span class="zd-panel-label">${t('panel_label_flip')}</span>
                <div style="display: flex; gap: 8px; flex: 1;">
                    <button id="zd-btn-flip-h" class="zd-panel-btn" style="background: var(--bg-btn-neutral); color: var(--text-btn-neutral);">${t('panel_btn_flip_h')}</button>
                    <button id="zd-btn-flip-v" class="zd-panel-btn" style="background: var(--bg-btn-neutral); color: var(--text-btn-neutral);">${t('panel_btn_flip_v')}</button>
                </div>
            </div>
        </div>
        
        <div style="padding: 0 20px 20px 20px; display: flex; justify-content: space-between; gap: 8px;">
            <button id="zd-btn-reset" class="zd-panel-btn" style="background: var(--bg-btn-reset); color: var(--text-btn-reset);">${t('panel_btn_reset')}</button>
            <button id="zd-btn-save" class="zd-panel-btn" style="background: var(--bg-btn-save); color: var(--text-btn-save);">${t('panel_btn_save')}</button>
            <button id="zd-btn-close" class="zd-panel-btn" style="background: var(--bg-btn-close); color: var(--text-btn-close);">${t('panel_btn_close')}</button>
        </div>
    `;
    document.body.appendChild(panel);

    const labels = panel.querySelectorAll('.zd-panel-label');
    labels.forEach(label => {
        if (label.scrollWidth > label.clientWidth) {
            label.title = label.textContent;
            label.style.cursor = 'help';
        }
    });

    panel.addEventListener('mouseleave', () => {
        if (panel.contains(document.activeElement)) {
            document.activeElement.blur(); 
        }
        removePanelBorder();

        if (_singleImgPage) {
            const nimg = document.querySelector('.' + _imgSrcViewCls);
            if (nimg) {
                setZoom(nimg, null, true);
            }
        } else if (_img_element) {
            setZoom(_img_element, null, true);
        }
    });

    panel.addEventListener('mouseenter', () => {
        applyPanelBorder();
    });

    panel.addEventListener('mousedown', (e) => {
        const t = e.target;

        if (t.tagName.toUpperCase() === 'BUTTON' || t.closest('button') || t.id === 'zd-btn-x') {
            e.preventDefault();
            return;
        }

        if (t.id && (t.id.includes('opac') || t.id.includes('bright'))) {
            return;
        }
        
        ensureFloating();
    });

    const onOutsideAction = (e) => {
        if (!document.getElementById('zd-custom-panel')) {
            window.removeEventListener('mousedown', onOutsideAction, true);
            window.removeEventListener('wheel', onOutsideAction, true);
            window.removeEventListener('keydown', onOutsideAction, true);
            return;
        }
        if (panel && !panel.contains(e.target)) {
            removePanelBorder(); 
        }
    };
    
    window.addEventListener('mousedown', onOutsideAction, true);
    window.addEventListener('wheel', onOutsideAction, true);
    window.addEventListener('keydown', onOutsideAction, true);

    const stopProp = (e) => e.stopPropagation();
    ['mousedown', 'mouseup', 'pointerdown', 'pointerup', 'wheel', 'click', 'dblclick', 'contextmenu'].forEach(evt => {
        panel.addEventListener(evt, stopProp);
    });

    panel.addEventListener('mouseover', (e) => {
        if (e.target.tagName === 'INPUT') {
            e.target.focus();
        }
    });

    panel.addEventListener('wheel', (e) => {
        const t = e.target;
        if (t.tagName === 'INPUT' && (t.type === 'range' || t.type === 'number')) {
            e.preventDefault(); 
            const dir = e.deltaY < 0 ? 1 : -1;
            
            let step = 1;
            if (t.id.includes('rot')) {
                step = e.shiftKey ? 15 : 1;
            } else if (t.id.includes('width')) {
                step = e.shiftKey ? 100 : 1;
            } else if (t.id.includes('zoom')) {
                step = e.shiftKey ? 10 : 1;
            } else {
                step = e.shiftKey ? 5 : 1;
            }
            
            let val = parseFloat(t.value);
            if (!isNaN(val)) {
                t.value = val + (dir * step);
                t.dispatchEvent(new Event('input')); 
            }
        }
    }, { passive: false });

    panel.addEventListener('mouseout', (e) => {
        if (e.target.tagName === 'INPUT') {
            e.target.blur();
        }
    });

    panel.addEventListener('keydown', (e) => {
        const t = e.target;
        if (t.tagName === 'INPUT' && (t.type === 'range' || t.type === 'number')) {
            if (e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
                if (e.shiftKey) {
                    e.preventDefault();
                    const dir = (e.key === 'ArrowUp' || e.key === 'ArrowRight') ? 1 : -1;
                    
                    let step = 1;
                    if (t.id.includes('rot')) {
                        step = 15;
                    } else if (t.id.includes('width')) {
                        step = 100;
                    } else if (t.id.includes('zoom')) {
                        step = 10;
                    } else {
                        step = 5;
                    }
                    
                    let val = parseFloat(t.value);
                    if (!isNaN(val)) {
                        t.value = val + (dir * step);
                        t.dispatchEvent(new Event('input'));
                    }
                }
            }
        }
    });

    const els = {
        zSl: document.getElementById('zd-sl-zoom'), zNum: document.getElementById('zd-num-zoom'),
        wSl: document.getElementById('zd-sl-width'), wNum: document.getElementById('zd-num-width'),
        rSl: document.getElementById('zd-sl-rot'), rNum: document.getElementById('zd-num-rot'),
        oSl: document.getElementById('zd-sl-opac'), oNum: document.getElementById('zd-num-opac'),
        bSl: document.getElementById('zd-sl-bright'), bNum: document.getElementById('zd-num-bright')
    };

    const header = document.getElementById('zd-panel-header');
    const btnX = document.getElementById('zd-btn-x');
    let isDraggingPanel = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    header.addEventListener('mousedown', (e) => {
        if (e.target === btnX) return;
        isDraggingPanel = true;
        header.style.cursor = 'grabbing';
        
        const rect = panel.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
    });

    const onPanelMove = (e) => {
        if (!document.getElementById('zd-custom-panel')) {
            window.removeEventListener('mousemove', onPanelMove, true);
            return;
        }
        if (!isDraggingPanel) return;
        
        panel.style.left = (e.clientX - dragOffsetX) + 'px';
        panel.style.top = (e.clientY - dragOffsetY) + 'px';
        panel.style.right = 'auto'; 
    };

    const onPanelUp = () => {
        if (!document.getElementById('zd-custom-panel')) {
            window.removeEventListener('mouseup', onPanelUp, true);
            return;
        }
        if (isDraggingPanel) {
            isDraggingPanel = false;
            header.style.cursor = 'grab';
        }
    };

    window.addEventListener('mousemove', onPanelMove, true);
    window.addEventListener('mouseup', onPanelUp, true);

    let rafId = null;
    
    const updateSize = () => {
        if (!_img_element) return;
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
            disableAnim(_img_element);
            const targetH = (bData.sh / bData.sw) * targetW; 
            setImageRect({ w: targetW, h: targetH });
            applyPanelBorder(); 
            showZoomBadge();
        });
    };

    const updateRot = (skipBadge = false) => {
        if (!_img_element) return;
        
        const rot = parseInt(els.rNum.value) || 0;
        const isFloating = !!getElData(_img_element, _srckey);
        
        if (rot !== 0 || isFloating) {
            ensureFloating();
        }
        
        disableAnim(_img_element);
        imgRotate(rot);
        applyPanelBorder();

        if (!skipBadge) {
            showZoomBadge();
        }
    };

    const updateFilters = () => {
        if (!_img_element) return;
        
        const opac = parseInt(els.oNum.value) || 100;
        const bright = parseInt(els.bNum.value) || 100;
        const isFloating = !!getElData(_img_element, _srckey);
        
        if (opac !== 100 || bright !== 100 || isFloating) {
            ensureFloating();
        }

        _img_element.style.setProperty('opacity', (opac / 100).toString(), 'important');
        _img_element.style.setProperty('filter', `brightness(${bright}%)`, 'important');
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

            if (type === 'size') {
                if (num === els.zNum || sl === els.zSl) {
                    const newW = Math.round(bData.sw * (val / 100));
                    els.wSl.value = els.wNum.value = newW;
                } else {
                    const newZ = Math.round((val / bData.sw) * 100);
                    els.zSl.value = els.zNum.value = newZ;
                }
                updateSize();
            } else if (type === 'rot') {
                updateRot();
            } else {
                updateFilters();
            }
        };

        sl.addEventListener('input', (e) => {
            applyValues(e.target.value, true);
            updateSliderFill(e.target);
        });

        num.addEventListener('input', (e) => {
            let val = parseFloat(e.target.value);
            
            if (val > max) {
                applyValues(max, true);
                updateSliderFill(sl);
            } else if (!isNaN(val)) {
                sl.value = val;
                
                const bData = getElData(_img_element, _firstkey);
                if (bData && type === 'size') {
                    if (num === els.zNum) {
                        els.wSl.value = els.wNum.value = Math.round(bData.sw * (val / 100));
                        updateSliderFill(els.wSl);
                    } else {
                        els.zSl.value = els.zNum.value = Math.round((val / bData.sw) * 100);
                        updateSliderFill(els.zSl);
                    }
                    updateSize();
                } else if (type === 'rot') {
                    updateRot();
                } else {
                    updateFilters();
                }
                updateSliderFill(sl);
            }
        });

        num.addEventListener('change', (e) => {
            applyValues(e.target.value, true);
            updateSliderFill(sl);
        });
    };

    sync(els.zSl, els.zNum, 'size', 100, 5, 2000);
    sync(els.wSl, els.wNum, 'size', initialData.sw, 20, 5000); 
    sync(els.rSl, els.rNum, 'rot', 0, -180, 180);
    sync(els.oSl, els.oNum, 'filter', 100, 10, 100);
    sync(els.bSl, els.bNum, 'filter', 100, 10, 200);

    const bindMiniReset = (btnId, inputEl, defaultVal) => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', () => {
                const val = typeof defaultVal === 'function' ? defaultVal() : defaultVal;
                inputEl.value = val;
                inputEl.dispatchEvent(new Event('change'));
            });
        }
    };

    bindMiniReset('zd-btn-reset-zoom', els.zNum, 100);
    bindMiniReset('zd-btn-reset-width', els.wNum, () => {
        const bData = getElData(_img_element, _firstkey);
        return bData ? Math.round(bData.sw) : 100;
    });
    bindMiniReset('zd-btn-reset-rot', els.rNum, 0);
    bindMiniReset('zd-btn-reset-opac', els.oNum, 100);
    bindMiniReset('zd-btn-reset-bright', els.bNum, 100);

    const btnFlipH = document.getElementById('zd-btn-flip-h');
    const btnFlipV = document.getElementById('zd-btn-flip-v');

    btnFlipH.addEventListener('click', () => {
        window._zdSuppressBadge = true;
        
        ensureFloating();
        let currentX = getElData(_img_element, _flipXkey) || 1;
        currentX *= -1;
        setElData(_img_element, _flipXkey, currentX);
        updateRot(); 
        
        let b = document.getElementById('zdImg_zoomBadge');
        if (b) {
            b.style.opacity = '0';
        }
        
        window._zdSuppressBadge = false;
    });

    btnFlipV.addEventListener('click', () => {
        window._zdSuppressBadge = true;
        
        ensureFloating();
        let currentY = getElData(_img_element, _flipYkey) || 1;
        currentY *= -1;
        setElData(_img_element, _flipYkey, currentY);
        updateRot(); 
        
        let b = document.getElementById('zdImg_zoomBadge');
        if (b) {
            b.style.opacity = '0';
        }
        
        window._zdSuppressBadge = false;
    });

    const closePanel = () => {
        window.removeEventListener('mousemove', onPanelMove, true);
        window.removeEventListener('mouseup', onPanelUp, true);
        window.removeEventListener('mousedown', onOutsideAction, true);
        window.removeEventListener('wheel', onOutsideAction, true);
        window.removeEventListener('keydown', onOutsideAction, true);
        
        removePanelBorder();
        panel.remove();

        setZoom();
    };

    btnX.addEventListener('click', closePanel);
    document.getElementById('zd-btn-close').addEventListener('click', closePanel);

    document.getElementById('zd-btn-reset').addEventListener('click', () => {
        const bData = getElData(_img_element, _firstkey);
        if (!bData) return;
        
        if (rafId) {
            cancelAnimationFrame(rafId);
        }

        els.zSl.value = els.zNum.value = 100;
        els.wSl.value = els.wNum.value = Math.round(bData.sw);
        els.rSl.value = els.rNum.value = 0;
        els.oSl.value = els.oNum.value = 100;
        els.bSl.value = els.bNum.value = 100;

        if (!_img_element) return;
        
        enableAnim(_img_element);
        _img_element.classList.remove(_draggedCls);
        imgRotate(0);

        const bDataReset = getElData(_img_element, _firstkey);
        if (bDataReset && bDataReset.origStyle && bDataReset.origStyle.zIndex !== undefined) {
            _img_element.style.removeProperty('z-index');
            _img_element.style.zIndex = bDataReset.origStyle.zIndex;
        } else {
            _img_element.style.removeProperty('z-index');
        }

        const src_elem = getElData(_img_element, _srckey);
        if (src_elem) {
            clearImgEx(src_elem); 
        }

        _img_element.style.removeProperty('opacity');
        _img_element.style.removeProperty('filter');

        setElData(_img_element, _flipXkey, 1);
        setElData(_img_element, _flipYkey, 1);

        setImageRect(); 
        imgRotate(0);

        removePanelBorder();

        const onTransitionEnd = (e) => {
            _img_element.removeEventListener('transitionend', onTransitionEnd);
            disableAnim(_img_element);
            showZoomBadge();
        };
        _img_element.addEventListener('transitionend', onTransitionEnd);
        
        if (btnFlipH && btnFlipV) {
            btnFlipH.style.background = 'var(--bg-btn-neutral)';
            btnFlipH.style.color = 'var(--text-btn-neutral)';
            btnFlipV.style.background = 'var(--bg-btn-neutral)';
            btnFlipV.style.color = 'var(--text-btn-neutral)';
        }
        
        [els.zSl, els.wSl, els.rSl, els.oSl, els.bSl].forEach(slider => {
            if (slider) {
                updateSliderFill(slider);
            }
        });

        if (_singleImgPage) {
            const nimg = document.querySelector('.' + _imgSrcViewCls);
            if (nimg) setZoom(nimg, null, true);
        } else if (_img_element) {
            setZoom(_img_element, null, true);
        }
    });

    document.getElementById('zd-btn-save').addEventListener('click', (e) => {
        if (!_img_element) return;

        const bData = getElData(_img_element, _firstkey);
        if (!bData) return;

        const targetW = Math.max(20, parseFloat(els.wNum.value));
        const targetH = (bData.sh / bData.sw) * targetW;
        const rot = parseInt(els.rNum.value) || 0;
        const opac = parseInt(els.oNum.value) || 100;
        const bright = parseInt(els.bNum.value) || 100;

        const flipX = getElData(_img_element, _flipXkey) || 1;
        const flipY = getElData(_img_element, _flipYkey) || 1;

        const rad = rot * Math.PI / 180;
        const cosA = Math.abs(Math.cos(rad));
        const sinA = Math.abs(Math.sin(rad));
        const canvasW = targetW * cosA + targetH * sinA;
        const canvasH = targetW * sinA + targetH * cosA;

        const canvas = document.createElement('canvas');
        canvas.width = canvasW;
        canvas.height = canvasH;
        const ctx = canvas.getContext('2d');

        try {
            ctx.filter = `brightness(${bright}%)`;
            ctx.globalAlpha = opac / 100;

            ctx.translate(canvasW / 2, canvasH / 2);
            ctx.rotate(rad);
            ctx.scale(flipX, flipY);

            const srcImg = getElData(_img_element, _srckey) || _img_element;
            const bgUrl = getElData(_img_element, _bgsrckey);

            const imageToDraw = new Image();
            imageToDraw.crossOrigin = "anonymous";
            
            imageToDraw.onload = () => {
                ctx.drawImage(imageToDraw, -targetW / 2, -targetH / 2, targetW, targetH);
                
                try {
                    const dataUrl = canvas.toDataURL('image/png');
                    
                    const d = new Date();
                    const yyyy = d.getFullYear();
                    const MM = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    const hh = String(d.getHours()).padStart(2, '0');
                    const mm = String(d.getMinutes()).padStart(2, '0');
                    const ss = String(d.getSeconds()).padStart(2, '0');
                    
                    const timestamp = `${yyyy}${MM}${dd}${hh}${mm}${ss}`;
                    
                    const link = document.createElement('a');
                    link.download = 'zoom_drag_export_' + timestamp + '.png';
                    link.href = dataUrl;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } catch (err) {
                    console.error('Canvas Export Fehler (CORS/DataURL):', err);
                    alert(t('panel_cors_error', 'Das Bild konnte nicht gespeichert werden.\n\nGrund: Der Quell-Server des Bildes blockiert den Export aus Sicherheitsgründen (CORS).'));
                }
            };
            
            imageToDraw.onerror = (err) => {
                console.error('Image Load Fehler:', err);
                alert(t('panel_cors_error', 'Das Bild konnte nicht geladen oder gespeichert werden.\n\nGrund: Der Quell-Server blockiert den Zugriff.'));
            };

            imageToDraw.src = bgUrl ? bgUrl : (srcImg.currentSrc || srcImg.src);

        } catch (err) {
            console.error('Canvas Setup Fehler:', err);
        }
    });

    [els.zSl, els.wSl, els.rSl, els.oSl, els.bSl].forEach(slider => {
        if (slider) {
            updateSliderFill(slider);
        }
    });

    ensureFloating();
    applyPanelBorder();
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
    d('Attach Event', '');

    elem.addEventListener('click', (e) => {
        if (_isExcludedHost) return;
        
        if (_cancelNextClick) {
            _cancelNextClick = false;
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        }

        let jdg = true;
        if (_rightBtnDown) {
            jdg = _clickFunc() && _draggingCnt < 8;
        }
        _draggingCnt = 0;
        
        if (!jdg || elem.classList.contains(_zdImgCls)) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
        }
    });

    elem.addEventListener('auxclick', function(e) {
        if (_isExcludedHost) return;
        
        if (e.button === 1 && (_rightBtnDown || _img_element)) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
        }
    });

    elem.addEventListener('mousedown', function(e) {
        if (_isExcludedHost) return;
        
        const isAlt = e.altKey || _accKeyState.alt;
        const isCtrl = e.ctrlKey || _accKeyState.ctrl;

        if (isAlt && isCtrl && ((e.button === 0 && (_rightBtnDown || (e.buttons & 2))) || (e.button === 2 && (e.buttons & 1)))) {
            _ctx_show = false;
            startQuickZoom(e, imgObj ? imgObj : this);
            e.preventDefault();
            e.stopPropagation();
            return;
        } else if (isAlt && !isCtrl && ((e.button === 0 && (_rightBtnDown || (e.buttons & 2))) || (e.button === 2 && (e.buttons & 1)))) {
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
            setZoom(imgObj ? imgObj : this); 
        } else if (e.button === 0) {
            let isDraggable = this.classList.contains(_zdImgCls);
            if (this.classList.contains(_imgSrcViewCls) && this.style.cursor === 'grab') {
                isDraggable = true;
            }

            if (isDraggable && !_rightBtnDown) {
                if (_img_element !== this) {
                    setZoom(this, null, true);
                    if (typeof syncPanelValues === 'function') {
                        syncPanelValues();
                    }
                }

                const rawLeft = parseFloat(this.style.left);
                const rawTop = parseFloat(this.style.top);
                const ofs = {
                    left: isNaN(rawLeft) ? getOffset(this).left : rawLeft,
                    top: isNaN(rawTop) ? getOffset(this).top : rawTop
                };
                
                disableAnim(this);
                _dragParam = { obj: this, x: e.pageX - ofs.left, y: e.pageY - ofs.top };
                this.classList.add('zdImgCls_draggingCur');
                
                window.addEventListener('mousemove', onGlobalMouseMove, true);
                window.addEventListener('pointermove', onGlobalMouseMove, true);
                window.addEventListener('mouseup', onGlobalMouseUp, true);
                window.addEventListener('pointerup', onGlobalMouseUp, true);
                d('Drag Start', '');
                
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
    
    elem.addEventListener('mouseup', function(e) { 
        if (_isExcludedHost) return;
        
        this.classList.remove('zdImgCls_draggingCur');
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
    
    elem.addEventListener('mouseenter', resetCtx);
    elem.addEventListener('mouseleave', resetCtx);
    elem.addEventListener('blur', resetCtx);
}

function initExImgObserver() {
    if (!document.body) {
        d('Observer Init', 'document.body is missing', 'error');
        return;
    }
    
    const observer = new MutationObserver((mutations) => {
        const exImgWrapper = document.getElementById(_zdExImgId);
        if (!exImgWrapper) return; 
        
        const imgs = exImgWrapper.getElementsByTagName('img');
        if (imgs.length !== 0) {
            for (let i = 0; i < imgs.length; i++) {
                let img = imgs[i];
                let se = getElData(img, _srckey);
                
                if (se && window.getComputedStyle(se).display === 'none') {
                    let pnt = img.closest('a');
                    if (pnt) {
                        pnt.remove();
                    } else {
                        img.remove();
                    }
                    se.style.visibility = 'visible';
                }
            }
        } else {
            exImgWrapper.remove();
        }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
}

function imgDrag(x, y) {
    if (!_dragParam) return;
    
    const obj = _dragParam.obj;
    obj.style.left = (window.scrollX + (x - _dragParam.x)) + 'px';
    obj.style.top = (window.scrollY + (y - _dragParam.y)) + 'px';
    
    if (!obj.classList.contains(_draggedCls) && _draggingCnt > 8) {
        obj.classList.add(_draggedCls);
    }
    _draggingCnt++;
}

function enableContextMenus(enable) {
    browser.runtime.sendMessage({ id: 'set-context', data: _zoom_enableCxt ? enable : false });
}

function checkSendGetSetting() {
    d('SendMessage GetSetting', '');
    browser.runtime.sendMessage({ id: 'get-setting' });
}

browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.setting) {
        d('Storage changed, updating settings', changes.setting.newValue);
        settingData(changes.setting.newValue);
    }
});

browser.runtime.onMessage.addListener((msg) => {
    if (msg.id === 'set-setting') {
        settingData(msg.data);
        return;
    }
    
    if (_isExcludedHost) return;

    _rightBtnDown = false;
    if (_img_element) {
        setZoom();
    }

    switch (msg.id) {
        case 'zoom-custom': 
            ctxZoomCustom(); 
            break;
        case 'zoom-in': 
            ctxZoom(true); 
            break;
        case 'zoom-out': 
            ctxZoom(false); 
            break;
        case 'r90': 
            ctxRotation(90); 
            break;
        case 'l90': 
            ctxRotation(-90); 
            break;
        case '180': 
            ctxRotation(180); 
            break;
        case 'fit-win': 
            windowFiting(true); 
            break;
        case 'fit': 
            ctxFit(); 
            break;
        default:
            d('Message Listener', 'Unknown command: ' + msg.id, 'warn');
            break;
    }
});

if (!_endInit) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}

checkSendGetSetting();
