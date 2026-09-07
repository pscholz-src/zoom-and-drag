/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Original work Copyright (c) Amu (http://crossblade.her.jp/)
 * Modified work Copyright (c) 2026 pscholz
 * Project: Zoom & Drag
 */

globalThis.browser = globalThis.browser || globalThis.chrome;


const _logOutput = (location.href.indexOf('zoomdraglog=1') > 0);
function d(t,v) { if(_logOutput) console.log('[ZoomDrag] '+t+': '+v); }
d('Log Start', '==========');

const _uqid = new Date().getTime().toString(16) + '_';
const _firstkey = _uqid + 'first';
const _srckey = _uqid + 'source';
const _sizekey = _uqid + 'size';
const _rotkey = _uqid + 'rotate';
const _bgsrckey = _uqid + 'bgsrc';

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
const _accKeyState = {ctrl: false, alt: false};
let _dragParam = null;
let _draggingCnt = 0;
let _rotParam = null;
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
let _hoverTarget = null;
let _zoom_excludedDomains = '';
let _isExcludedHost = false;

function enableAnim(el) {
    if (el && !el.classList.contains('zdImgCls_animated')) el.classList.add('zdImgCls_animated');
}
function disableAnim(el) {
    if (el) el.classList.remove('zdImgCls_animated');
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

const _singleImgPage = isSingleImgPage();

const elementDataMap = new WeakMap();
const _modifiedElements = new Set();
function getElData(el, key) {
    if (!el || !elementDataMap.has(el)) return undefined;
    return elementDataMap.get(el)[key];
}
function setElData(el, key, value) {
    if (!el) return;
    _modifiedElements.add(el);
    if (!elementDataMap.has(el)) elementDataMap.set(el, {});
    elementDataMap.get(el)[key] = value;
}

function isSingleImgPage() {
    const es = document.body ? document.body.getElementsByTagName('*') : [];
    return (es && es.length === 1 && es[0].tagName.toUpperCase() === 'IMG');
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
    window.addEventListener('mousemove', onGlobalMouseMove);
    window.addEventListener('mouseup', onGlobalMouseUp);
    d('Rotation Start', 'deg: ' + baseRot);
}

function handleRotationMove(e) {
    if (!_rotParam || !_rotParam.obj) return;
    const curAngle = Math.atan2(e.clientY - _rotParam.cy, e.clientX - _rotParam.cx) * (180 / Math.PI);
    const delta = curAngle - _rotParam.startAngle;
    let newDeg = Math.round((_rotParam.baseRot + delta) % 360);
    if (newDeg < 0) newDeg += 360;
    
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
                if (b && !_rightBtnDown && !_rotParam) b.style.opacity = '0';
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

function onGlobalMouseMove(e) {
    if (_rotParam) {
        handleRotationMove(e);
    } else if (_dragParam) {
        imgDrag(e.clientX, e.clientY);
    }
}

function onGlobalMouseUp(e) {
    if (_rotParam) {
        stopRotation();
    }
    if (_dragParam) {
        if (_dragParam.obj) {
            _dragParam.obj.classList.remove('zdImgCls_draggingCur');
        }
        _dragParam = null;
        d('Drag End', '');
    }
    if (!_rotParam && !_dragParam) {
        window.removeEventListener('mousemove', onGlobalMouseMove);
        window.removeEventListener('mouseup', onGlobalMouseUp);
    }
}

function isEditableTarget(el) {
    if (!el) return false;
    const tag = el.tagName ? el.tagName.toUpperCase() : '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (el.isContentEditable) return true;
    if (el.getAttribute && el.getAttribute('role') === 'textbox') return true;
    return false;
}

function getActiveImageTarget() {
    if (_img_element && _img_element.isConnected) return _img_element;
    if (_hoverTarget && _hoverTarget.isConnected) return _hoverTarget;
    if (_current_element && _current_element.isConnected) return _current_element;
    return null;
}

function ensureTargetReady(target) {
    if (!target || _isExcludedHost) return null;
    if (!getElData(target, _firstkey)) {
        attachEvent(target);
    }
    if (_img_element !== target) {
        setZoom(target);
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

function handleZoomKey(zoomIn, shiftPressed) {
    let target = getActiveImageTarget();
    if (!target) return false;
    target = ensureTargetReady(target);
    if (!target) return false;

    let dim = _zoom_dim * 0.01;
    if (shiftPressed) {
        dim *= 2;
    }
    const r = zoomIn ? (1 + dim) : (1 - dim);
    
    enableAnim(target);
    zoom(r);
    refreshShortcutTimeout();
    return true;
}

function handleArrowKey(dx, dy) {
    let target = getActiveImageTarget();
    if (!target) return false;
    target = ensureTargetReady(target);
    if (!target) return false;

    const src_elem = getElData(target, _srckey);
    if (!src_elem) {
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
    showZoomBadge();
    refreshShortcutTimeout();
    return true;
}

function handleRotationKey(deg) {
    let target = getActiveImageTarget();
    if (!target) return false;
    target = ensureTargetReady(target);
    if (!target) return false;

    const curRot = getElData(target, _rotkey) || 0;
    const newRot = ((curRot + deg) % 360 + 360) % 360;
    enableAnim(target);
    imgRotate(newRot);
    showZoomBadge();
    refreshShortcutTimeout();
    return true;
}

function handleFitWindowKey() {
    let target = getActiveImageTarget();
    if (!target) return false;
    target = ensureTargetReady(target);
    if (!target) return false;
    
    enableAnim(target);
    windowFiting();
    refreshShortcutTimeout();
    return true;
}

function handleEscapeKey() {
    let target = getActiveImageTarget();
    if (!target) return false;
    target = ensureTargetReady(target);
    if (!target) return false;
    
    enableAnim(target);
    const src_elem = getElData(target, _srckey);
    if (src_elem) {
        clearImgEx(src_elem);
    }
    setImageRect();
    imgRotate(0);
    setZoom();
    return true;
}

function init() {
    d('Init Start', '');
    
    if(!document.body) return;
    if(_singleImgPage && !_isExcludedHost) singlePageAltImg();
    
    updateClickFunctions();
    
    document.body.addEventListener('mousedown', e => {
        if (_isExcludedHost) return;
        const isAlt = e.altKey || _accKeyState.alt;
        if(e.button === 2) { 
            _rightBtnDown = true;
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
                if (!_img_element) checkTarget(t, e);
                if (_img_element) {
                    _ctx_show = false;
                    startRotation(e, _img_element);
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        }
    });
    
    document.body.addEventListener('mouseup', e => {
        if (_isExcludedHost) {
            if (_rotParam || _img_element) resetAllChanges();
            return;
        }
        if (_rotParam) {
            stopRotation();
        }
        if(e.button === 2) {
            if (_rclickHoldTimer) {
                clearTimeout(_rclickHoldTimer);
                _rclickHoldTimer = null;
            }
            _rightBtnDown = false;
            if (_img_element) {
                showZoomBadge();
                setTimeout(() => setZoom(), 100);
            }
        }
    });
    
    document.addEventListener('mouseover', e => {
        if (_isExcludedHost) return;
        const t = e.target;
        if (!t) return;
        if (t.tagName === 'IMG' || t.tagName === 'CANVAS' || (t.classList && t.classList.contains(_zdImgCls))) {
            _hoverTarget = t;
        } else if (t.querySelector) {
            const img = t.querySelector('img, canvas');
            if (img) _hoverTarget = img;
        }
    }, { passive: true });

    document.body.addEventListener('keydown', e => { 
        _accKeyState.ctrl = e.ctrlKey; 
        _accKeyState.alt = e.altKey; 
        if (e.key === 'Alt' && _img_element) {
            e.preventDefault();
        }

        if (!_zoom_enableKeyShortcuts || _isExcludedHost) return;

        if (isEditableTarget(e.target) || isEditableTarget(document.activeElement)) {
            return;
        }

        if (e.ctrlKey || e.metaKey || e.altKey) {
            return;
        }

        let handled = false;
        const key = e.key;

        if (key === '+' || key === '=' || key === '*' || e.code === 'NumpadAdd') {
            handled = handleZoomKey(true, e.shiftKey);
        } else if (key === '-' || key === '_' || e.code === 'NumpadSubtract') {
            handled = handleZoomKey(false, e.shiftKey);
        } else if (key === 'ArrowUp') {
            handled = handleArrowKey(0, e.shiftKey ? -60 : -20);
        } else if (key === 'ArrowDown') {
            handled = handleArrowKey(0, e.shiftKey ? 60 : 20);
        } else if (key === 'ArrowLeft') {
            handled = handleArrowKey(e.shiftKey ? -60 : -20, 0);
        } else if (key === 'ArrowRight') {
            handled = handleArrowKey(e.shiftKey ? 60 : 20, 0);
        } else if (key === '0') {
            handled = handleFitWindowKey();
        } else if (key === 'Escape') {
            handled = handleEscapeKey();
        } else if (key === 'r' || key === 'R') {
            handled = handleRotationKey(e.shiftKey ? 45 : 90);
        } else if (key === 'l' || key === 'L') {
            handled = handleRotationKey(e.shiftKey ? -45 : -90);
        }

        if (handled) {
            e.preventDefault();
            e.stopPropagation();
        }
    });
    
    document.body.addEventListener('keyup', e => { 
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
    
    window.addEventListener('contextmenu', e => {
        if(!_ctx_show) e.preventDefault();
    });
    
    document.addEventListener('blur', () => {
        _accKeyState.ctrl = _accKeyState.alt = false;
        if(_img_element) setZoom();
    });
    
    initExImgObserver();
    
    _endInit = true;
    d('Init End', '');
}

function updateClickFunctions() {
    if(_zoom_clickSwap) {
        _clickFunc = windowFiting;
        _mdownFunc = sizeFit;
    } else {
        _clickFunc = sizeFit;
        _mdownFunc = windowFiting;
    }
}

function singlePageAltImg() {
    if(!_zoom_ivpDrag || !document.body || !document.body.children[0]) return;
    
    d('ImageView Sorce Page', '');
    const img = document.body.children[0];
    const modeFitCls = 'zdImgCls_modeFit';
    img.style.display = 'none';
    
    const nimg = document.createElement('img');
    nimg.className = _imgSrcViewCls;
    nimg.src = img.src;
    _current_element = nimg;
    
    nimg.addEventListener('load', function() { 
        const w = this.naturalWidth, h = this.naturalHeight;
        const sw = document.documentElement.scrollWidth, sh = document.documentElement.scrollHeight;
        const size = calcLimit(w, h, sw, sh);
        if (w > size.w || h > size.h) this.classList.add(modeFitCls);
        else this.classList.remove(modeFitCls);
        
        Object.assign(this.style, {
            display: 'inline', 
            left: ((sw - size.w) / 2) + 'px', 
            top: ((sh - size.h) / 2) + 'px', 
            width: size.w + 'px', 
            height: size.h + 'px'
        });
        checkTarget(this);
        setZoom();
    });
    
    nimg.addEventListener('click', function() {
        if(!_img_element && this.classList.contains(modeFitCls)) ctxFit();
    });
    
    document.body.appendChild(nimg);
}

function resetAllChanges() {
    _hoverTarget = null;
    d('Reset All Changes for Excluded Domain', '');
    window.removeEventListener('wheel', zoomEvent);
    window.removeEventListener('wheel', defEventCancel);
    window.removeEventListener('mousemove', onGlobalMouseMove);
    window.removeEventListener('mouseup', onGlobalMouseUp);
    stopRotation();
    if (_dragParam) {
        if (_dragParam.obj) _dragParam.obj.classList.remove('zdImgCls_draggingCur');
        _dragParam = null;
    }
    if (_badgeTimer) { clearTimeout(_badgeTimer); _badgeTimer = null; }
    if (_rclickTimer) { clearTimeout(_rclickTimer); _rclickTimer = null; }
    if (_rclickHoldTimer) { clearTimeout(_rclickHoldTimer); _rclickHoldTimer = null; }
    _rightBtnDown = false;
    
    const exWrapper = document.getElementById(_zdExImgId);
    if (exWrapper) {
        const imgs = exWrapper.getElementsByTagName('img');
        for (let i = 0; i < imgs.length; i++) {
            const orig = getElData(imgs[i], _srckey);
            if (orig) {
                orig.style.visibility = 'visible';
            }
        }
        exWrapper.remove();
    }
    
    for (const el of _modifiedElements) {
        if (el && el.nodeType === 1) {
            el.style.width = '';
            el.style.height = '';
            el.style.left = '';
            el.style.top = '';
            el.style.transform = '';
            el.style.visibility = 'visible';
            el.classList.remove(_draggedCls);
            el.classList.remove('zdImgCls_draggingCur');
        }
        elementDataMap.delete(el);
    }
    _modifiedElements.clear();
    
    const nimg = document.querySelector('.' + _imgSrcViewCls);
    if (nimg) {
        nimg.remove();
        if (document.body && document.body.children && document.body.children[0]) {
            document.body.children[0].style.display = '';
        }
    }
    
    const b = document.getElementById('zdImg_zoomBadge');
    if (b) b.remove();
    
    _img_element = null;
    _current_element = null;
    _ctx_show = true;
    enableContextMenus(false);
}

function settingData(setting) {
    if(setting) {
        if(setting.dim != null) _zoom_dim = setting.dim;
        if(setting.rotd != null) _zoom_rotd = setting.rotd;
        if(setting.rcCancel != null) _zoom_rcCancel = setting.rcCancel;
        if(setting.reverse != null) _zoom_reverse = setting.reverse;
        if(setting.bgImg != null) _zoom_bgImg = setting.bgImg;
        if(setting.autoRtn != null) _zoom_autoRtn = setting.autoRtn;
        if(setting.ctrlRvs != null) _zoom_ctrlRvs = setting.ctrlRvs;
        if(setting.enableCxt != null) _zoom_enableCxt = setting.enableCxt;
        if(setting.ivpDrag != null) _zoom_ivpDrag = setting.ivpDrag;
        if(setting.showZoomBadge != null) _zoom_showZoomBadge = setting.showZoomBadge;
        if(setting.enableKeyShortcuts != null) _zoom_enableKeyShortcuts = setting.enableKeyShortcuts;
        if(setting.excludedDomains != null) {
            _zoom_excludedDomains = setting.excludedDomains;
            const wasExcluded = _isExcludedHost;
            _isExcludedHost = checkIsExcluded(_zoom_excludedDomains);
            if (_isExcludedHost) {
                resetAllChanges();
            }
        }
        if(setting.clickSwap != null) {
            _zoom_clickSwap = setting.clickSwap;
            updateClickFunctions();
        }
    }
}

function checkTarget(t, e) {
    if (_isExcludedHost) {
        enableContextMenus(false);
        return false;
    }
    if(t) {
        const attach = (o, imgObj) => {
            attachEvent(o, imgObj ? imgObj : null);
            setZoom(imgObj ? imgObj : o);
            enableContextMenus(true);
            return true;
        };
        
        if(!getElData(t, _firstkey)) {
            const tag = t.tagName.toUpperCase();
            if(tag === 'IMG' || tag === 'CANVAS') {
                d('Image Type', 'Normal');
                return attach(t);
            }
            const imgs = t.getElementsByTagName('img');
            if(imgs.length > 0 && e && hitCheck(imgs[0], {x: e.pageX, y: e.pageY})) {
                d('Image Type', 'Inner');
                return attach(t, imgs[0]);
            }
            if(_zoom_bgImg) {
                const bgi = window.getComputedStyle(t).backgroundImage;
                if(/url/i.test(bgi) && tag !== 'BODY') {
                    setElData(t, _bgsrckey, bgi.trim().replace(/['"]/gi, '').slice(4, -1));
                    d('Image Type', 'BG');
                    return attach(t);
                }
            }
            enableContextMenus(false);
        } else {
            enableContextMenus(true);
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
    const rect = {x: op.x, y: op.y, r: op.x + obj.offsetWidth, b: op.y + obj.offsetHeight};
    return (rect.x < pos.x && pos.x < rect.r && rect.y < pos.y && pos.y < rect.b);
}

const defEventCancel = e => {
    e.preventDefault();
    e.stopPropagation();
};

function showZoomBadge() {
    if(!_zoom_showZoomBadge || !_img_element) return;
    
    let b = document.getElementById('zdImg_zoomBadge');
    if(!b) {
        b = document.createElement('div');
        b.id = 'zdImg_zoomBadge';
        b.className = 'zdImg_zoomBadge';
        document.body.appendChild(b);
    }
    
    const data = getElData(_img_element, _firstkey);
    if(!data) return;
    
    const ratio = Math.round((_img_element.offsetWidth / data.sw) * 100);
    const rot = getElData(_img_element, _rotkey) || 0;
    
    let text = ratio + '%';
    if(rot !== 0) text += ' • ' + rot + '°';
    
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
    
    if(_badgeTimer) clearTimeout(_badgeTimer);
    
    if(!_rightBtnDown && !_rotParam) {
        _badgeTimer = setTimeout(() => {
            if(b) b.style.opacity = '0';
        }, 800);
    }
}

function setZoom(img, def) {
    window.removeEventListener('wheel', zoomEvent);
    window.removeEventListener('wheel', defEventCancel);

    if(_rclickTimer) {
        clearTimeout(_rclickTimer);
        _rclickTimer = null;
    }

    if(img) {
        if (_isExcludedHost) {
            _img_element = null;
            return;
        }
        d('ZoomTarget Set', '----------');
        _img_element = img;
        _current_element = img;
        let data = getElData(img, _firstkey);
        
        if(!data) {
            const ofs = getOffset(img);
            const obj = { 
                id: 'zdImg_' + new Date().getTime().toString(16),
                sw: (def ? def.sw : img.offsetWidth),
                sh: (def ? def.sh : img.offsetHeight),
                sx: (def ? def.sx : ofs.left),
                sy: (def ? def.sy : ofs.top)
            };
            setElData(img, _firstkey, obj);
            setElData(img, _sizekey, {w: obj.sw, h: obj.sh});
            setElData(img, _rotkey,  0);
        } else {
            if(!getElData(img, _srckey) && img.offsetWidth >= data.sw && img.offsetHeight >= data.sh) {
                const ofs = getOffset(img);
                data.sx = ofs.left;
                data.sy = ofs.top;
            }
        }
        
        window.addEventListener('wheel', zoomEvent, {passive: false});

        if (_zoom_rcCancel > 0) {
            _rclickTimer = setTimeout(() => {
                if (_rotParam) return;
                setZoom();
            }, _zoom_rcCancel);
        }
        
        showZoomBadge();

    } else {
        d('ZoomTarget Clear', '');
        
        if (_rclickHoldTimer) {
            clearTimeout(_rclickHoldTimer);
            _rclickHoldTimer = null;
        }
        
        let b = document.getElementById('zdImg_zoomBadge');
        if(b) b.style.opacity = '0';

        if(_zoom_autoRtn && _img_element) {
            const src_elem = getElData(_img_element, _srckey);
            if(src_elem) clearImgEx(src_elem);
            setImageRect();
            imgRotate(0);
        }
        _img_element = null;
        _ctx_show = true;
    }
}

function calcPos(zoomSize) {
    const winW = _singleImgPage ? document.documentElement.scrollWidth : window.innerWidth;
    const winH = _singleImgPage ? document.documentElement.scrollHeight : window.innerHeight;
    const scrX = window.scrollX;
    const scrY = window.scrollY;
    
    const data = getElData(_img_element, _firstkey);
    const firstSize = {w: data.sw, h: data.sh};
    let rect = {x: data.sx, y: data.sy, w: data.sw, h: data.sh, r: data.sx + data.sw, b: data.sy + data.sh};
    let x = rect.x, y = rect.y;

    if (firstSize.w < zoomSize.w && firstSize.h < zoomSize.h) {
        const isDragged = _img_element.classList.contains(_draggedCls);
        if (isDragged) {
            const rawLeft = parseFloat(_img_element.style.left);
            const rawTop = parseFloat(_img_element.style.top);
            const ofst = {
                left: isNaN(rawLeft) ? getOffset(_img_element).left : rawLeft,
                top: isNaN(rawTop) ? getOffset(_img_element).top : rawTop
            };
            const iesz = {w: _img_element.offsetWidth, h: _img_element.offsetHeight};
            rect = {x: ofst.left, y: ofst.top, w: iesz.w, h: iesz.h, r: ofst.left + iesz.w, b: ofst.top + iesz.h};
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

        if (!isDragged && !_singleImgPage) {
            const scrRect = {x: scrX, y: scrY, w: winW, h: winH, r: scrX + winW, b: scrY + winH};
            
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
                visLeft = scrRect.x - ((visW - scrRect.w) / 2);
            }
            
            if (visH <= scrRect.h) {
                if (visTop < scrRect.y) visTop = scrRect.y;
                if (visTop + visH > scrRect.b) visTop = scrRect.b - visH;
            } else {
                visTop = scrRect.y - ((visH - scrRect.h) / 2);
            }
        }

        x = visLeft - (zoomSize.w - visW) / 2;
        y = visTop - (zoomSize.h - visH) / 2;
    }
    return {x: x, y: y, w: zoomSize.w, h: zoomSize.h};
}

function calcLimit(w, h, sw, sh, rot) {
    if (rot) {
        const rad = rot * Math.PI / 180;
        const cosA = Math.abs(Math.cos(rad));
        const sinA = Math.abs(Math.sin(rad));
        const bboxW = w * cosA + h * sinA;
        const bboxH = w * sinA + h * cosA;
        if (bboxW <= sw && bboxH <= sh) return {w: w, h: h};
        const scale = Math.min(sw / bboxW, sh / bboxH);
        return {w: w * scale, h: h * scale};
    }
    if(w > sw) { h = (h*sw) / w; w = sw; }
    if(h > sh) { w = (w*sh) / h; h = sh; }
    return {w: w, h: h};
}

function generateImgEx(size) {
    d('Create FloatImage', '');
    let exImgWrapper = document.getElementById(_zdExImgId);
    if(!exImgWrapper) {
        exImgWrapper = document.createElement('div');
        exImgWrapper.id = _zdExImgId;
        document.body.appendChild(exImgWrapper);
    }
    
    const data = getElData(_img_element, _firstkey);
    _img_element.style.visibility = 'hidden';
    const rect = calcPos({w: size.w, h: size.h});
    const rot = getElData(_img_element, _rotkey);
    let img = document.getElementById(data.id);
    
    if(!img) {
        img = document.createElement('img');
        img.id = data.id;
        img.className = _zdImgCls;
        img.src = _img_element.currentSrc || getElData(_img_element, _bgsrckey) || _img_element.getAttribute('src');
        img.addEventListener('mouseover', e => e.preventDefault());
        img.addEventListener('drag', e => e.preventDefault());
        img.addEventListener('dragstart', e => e.preventDefault());
        img.addEventListener('dragend', e => e.preventDefault());
        
        const al = _img_element.closest('a');
        if(al) {
            const pt = document.createElement('a');
            pt.href = al.getAttribute('href');
            pt.target = al.getAttribute('target') || '_self';
            img.classList.add(_imgLinkCls);
            pt.appendChild(img);
            exImgWrapper.appendChild(pt);
        } else {
            img.classList.add(_imgNoLinkCls);
            exImgWrapper.appendChild(img);
        }
        
        setElData(img, _srckey, _img_element);
        attachEvent(img);
        setZoom(img, {sx: data.sx, sy: data.sy, sw: data.sw, sh: data.sh});
        setImageRect({w: rect.w, h: rect.h});
        imgRotate(rot);
    }
}

function clearImgEx(src_elem, size) {
    d('Delete FloatImage', '');
    const data = getElData(_img_element, _firstkey);
    const rot = getElData(_img_element, _rotkey);
    src_elem.style.visibility = 'visible';
    
    const pnt = _img_element.closest('a');
    if(pnt && pnt.parentNode === document.getElementById(_zdExImgId)) pnt.remove(); 
    else _img_element.remove();
    
    setZoom(src_elem, {sx: data.sx, sy: data.sy, sw: data.sw, sh: data.sh});
    setImageRect(size);
    imgRotate(rot);
}

function setImageRect(size, element) {
    if(!element) element = _img_element;
    const data = getElData(element, _firstkey);
    const rect = size ? calcPos({w: size.w, h: size.h}) : {x: data.sx, y: data.sy, w: data.sw, h: data.sh};
    
    if(getElData(_img_element, _srckey)) {
        element.style.left = rect.x + 'px';
        element.style.top = rect.y + 'px';
    }
    element.style.width = rect.w + 'px';
    element.style.height = rect.h + 'px';
    setElData(element, _sizekey, {w: rect.w, h: rect.h});
    d('ImageSize', rect.w + ', ' + rect.h);
}

function imgRotate(rot, element) {
    if(!element) element = _img_element;
    if(rot === 0) element.style.transform = '';
    else element.style.transform = 'rotate(' + rot + 'deg)';
    d('ImageRotate deg', rot);
    setElData(element, _rotkey, rot);
}

function zoom(r, isZoomLimit) {
    const winW = _singleImgPage ? document.documentElement.scrollWidth : window.innerWidth;
    const winH = _singleImgPage ? document.documentElement.scrollHeight : window.innerHeight;
    
    const data = getElData(_img_element, _firstkey);
    const size = getElData(_img_element, _sizekey);
    const src_elem = getElData(_img_element, _srckey);
    let w = size.w * r, h = size.h * r;
    let floating = _zoom_ctrlRvs ? _accKeyState.ctrl : !_accKeyState.ctrl;
    const tag = _img_element.tagName.toUpperCase();
    
    if(tag === 'CANVAS') floating = false;
    d('Floating zoom', floating);
    
    if(isZoomLimit) {
        const rot = getElData(_img_element, _rotkey);
        const limsiz = calcLimit(w, h, winW, winH, rot);
        w = limsiz.w; h = limsiz.h;
    }
    
    if(!src_elem) {
        if((w <= data.sw && h <= data.sh) || !floating) setImageRect({w: w, h: h});
        else generateImgEx({w: w, h: h});
    } else {
        if(!floating) clearImgEx(src_elem, {w: w, h: h});
        else {
            if(w <= data.sw && h <= data.sh) clearImgEx(src_elem);
            else setImageRect({w: w, h: h});
        }
    }
    showZoomBadge();
}

function sizeFit() {
    if(_img_element) {
        _img_element.classList.remove(_draggedCls);
        enableAnim(_img_element);
        
        const data = getElData(_img_element, _firstkey);
        const src_elem = getElData(_img_element, _srckey);
        const w = _img_element.offsetWidth, h = _img_element.offsetHeight;
        const nw = _img_element.naturalWidth, nh = _img_element.naturalHeight;
        let floating = _zoom_ctrlRvs ? _accKeyState.ctrl : !_accKeyState.ctrl;
        const tag = _img_element.tagName.toUpperCase();
        
        if(tag === 'CANVAS') floating = false;
        d('Floating zoom', floating);
        
        if(!src_elem) {
            if(w === data.sw && h === data.sh && tag === 'IMG') {
                if((nw > data.sw && nh > data.sh) && floating) generateImgEx({w: w, h: h});
                setImageRect({w: nw, h: nh});
            } else {
                setImageRect();
                imgRotate(0);
            }
        } else {
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
    if(_img_element) {
        d('Window Fit', '');
        _img_element.classList.remove(_draggedCls);
        enableAnim(_img_element);
        zoom(10000, true);
        _ctx_show = false;
        if(!getElData(_img_element, _srckey)) _img_element.scrollIntoView();
        return false;
    } else if(fromCtxMenu && _current_element) {
        setZoom(_current_element);
        if(_img_element) windowFiting();
        setZoom();
    }
    return true;
}

function zoomEvent(e) {
    if(_isExcludedHost || !_img_element) {
        window.removeEventListener('wheel', zoomEvent);
        return;
    }
    
    disableAnim(_img_element);
    
    let delta = e.deltaY ? -(e.deltaY) : (e.wheelDelta ? e.wheelDelta : -(e.detail));
    d('Wheel delta', delta);
    delta = _zoom_reverse ? -delta : delta;
    const dim = _zoom_dim * 0.01;
    const r = delta < 0 ? 1 - dim : (delta > 0 ? 1 + dim : 1);

    if(_rclickTimer) {
        clearTimeout(_rclickTimer);
        _rclickTimer = setTimeout(() => {
            if (_rotParam) return;
            setZoom();
        }, _zoom_rcCancel);
    }

    if(_accKeyState.alt) {
        imgRotate((getElData(_img_element, _rotkey) + _zoom_rotd * (delta < 0 ? 1 : -1)) % 360);
        showZoomBadge();
    } else {
        zoom(r);
    }
    
    _ctx_show = false;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return false;
}

function ctxZoom(zin) {
    if(_current_element) {
        setZoom(_current_element);
        enableAnim(_img_element);
        zoom(zin ? 2.0 : 0.5);
        setZoom();
    }
}

function ctxZoomCustom() {
    if(_current_element) {
        setZoom(_current_element);
        const data = getElData(_current_element, _firstkey);
        const size = getElData(_current_element, _sizekey);
        if(data && size) {
            const currentPct = Math.round((size.w / data.sw) * 100);
            const input = prompt(browser.i18n.getMessage('promptZoom') || "Zoom %:", currentPct);
            if (input !== null) {
                const targetPct = parseFloat(input);
                if (!isNaN(targetPct) && targetPct > 0) {
                    const targetW = data.sw * (targetPct / 100);
                    const r = targetW / size.w;
                    enableAnim(_img_element);
                    zoom(r);
                }
            }
        }
        setZoom();
    }
}

function ctxRotation(rot) {
    if(_current_element) {
        setZoom(_current_element);
        enableAnim(_img_element);
        imgRotate((getElData(_img_element, _rotkey) + rot) % 360);
        showZoomBadge();
        setZoom();
    }
}

function ctxFit() {
    if(_current_element) {
        setZoom(_current_element);
        sizeFit();
        setZoom();
    }
}

function attachEvent(elem, imgObj) {
    if (_isExcludedHost) return;
    d('Attach Event', '');
    
    elem.addEventListener('click', e => {
        if (_isExcludedHost) return;
        if (_cancelNextClick) {
            _cancelNextClick = false;
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        }
        const jdg = _clickFunc() && _draggingCnt < 8;
        _draggingCnt = 0;
        if(!jdg) {
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
        
        if (isAlt && ((e.button === 0 && (_rightBtnDown || (e.buttons & 2))) || (e.button === 2 && (e.buttons & 1)))) {
            _ctx_show = false;
            startRotation(e, imgObj ? imgObj : this);
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        
        if(e.button === 2) {
            _rightBtnDown = true;
            if (_zoom_showZoomBadge) {
                _rclickHoldTimer = setTimeout(() => {
                    _ctx_show = false;
                }, 600);
            }
            setZoom(imgObj ? imgObj : this); 
        }
        else if(e.button === 0) {
            if(this.classList.contains(_zdImgCls) && !_img_element) {
                const rawLeft = parseFloat(this.style.left);
                const rawTop = parseFloat(this.style.top);
                const ofs = {
                    left: isNaN(rawLeft) ? getOffset(this).left : rawLeft,
                    top: isNaN(rawTop) ? getOffset(this).top : rawTop
                };
                
                disableAnim(this);
                _dragParam = {obj: this, x: e.pageX - ofs.left, y: e.pageY - ofs.top};
                this.classList.add('zdImgCls_draggingCur');
                window.addEventListener('mousemove', onGlobalMouseMove);
                window.addEventListener('mouseup', onGlobalMouseUp);
                d('Drag Start', '');
                e.preventDefault();
                e.stopPropagation();
            }
        }
        else if(e.button === 1) {
            if (_rightBtnDown || _img_element) {
                e.preventDefault();
                e.stopPropagation();
            }
        }
    });
    
    elem.addEventListener('mouseup', function(e) { 
        if (_isExcludedHost) return;
        this.classList.remove('zdImgCls_draggingCur');
        if(e.button === 1) {
            _mdownFunc();
            e.preventDefault();
            e.stopPropagation();
        }
    });
    
    const resetCtx = () => { if(!_img_element) _ctx_show = true; };
    elem.addEventListener('mouseenter', resetCtx);
    elem.addEventListener('mouseleave', resetCtx);
    elem.addEventListener('blur', resetCtx);
}

function initExImgObserver() {
    if(!document.body) return;
    const observer = new MutationObserver((mutations) => {
        const exImgWrapper = document.getElementById(_zdExImgId);
        if(exImgWrapper) {
            const imgs = exImgWrapper.getElementsByTagName('img');
            if(imgs.length !== 0) {
                for(let i = 0; i < imgs.length; i++) {
                    let img = imgs[i];
                    let se = getElData(img, _srckey);
                    if(se && window.getComputedStyle(se).display === 'none') {
                        let pnt = img.closest('a');
                        if(pnt) pnt.remove(); else img.remove();
                        se.style.visibility = 'visible';
                    }
                }
            } else {
                exImgWrapper.remove();
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

function imgDrag(x, y) {
    if(!_dragParam) return;
    
    const obj = _dragParam.obj;
    obj.style.left = (window.scrollX + (x - _dragParam.x)) + 'px';
    obj.style.top = (window.scrollY + (y - _dragParam.y)) + 'px';
    
    if(!obj.classList.contains(_draggedCls) && _draggingCnt > 8) {
        obj.classList.add(_draggedCls);
    }
    showZoomBadge();
    _draggingCnt++;
}

function enableContextMenus(enable) {
    browser.runtime.sendMessage({id: 'set-context', data: _zoom_enableCxt ? enable : false});
}

function checkSendGetSetting() {
    d('SendMessage GetSetting', '');
    browser.runtime.sendMessage({id: 'get-setting'});
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
    switch (msg.id) {
    case 'zoom-custom': ctxZoomCustom(); break;
    case 'zoom-in': ctxZoom(true); break;
    case 'zoom-out': ctxZoom(false); break;
    case 'r90': ctxRotation(90); break;
    case 'l90': ctxRotation(-90); break;
    case '180': ctxRotation(180); break;
    case 'fit-win': windowFiting(true); break;
    case 'fit': ctxFit(); break;
    }
});

if(!_endInit) {
    if(document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
}

checkSendGetSetting();
