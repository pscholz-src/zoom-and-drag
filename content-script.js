/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Original work Copyright (c) Amu (http://crossblade.her.jp/)
 * Modified work Copyright (c) 2026 pscholz
 * Project: Zoom & Drag
 */

var _logOutput = (location.href.indexOf('zoomimagelog=1') > 0);
function d(t,v) { if(_logOutput) console.log('[ZoomImage] '+t+': '+v); }
d('Log Start', '==========');

var _uqid = new Date().getTime().toString(16) + '_';
var _firstkey = _uqid + 'first';
var _srckey = _uqid + 'source';
var _sizekey = _uqid + 'size';
var _rotkey = _uqid + 'rotate';

var _zoomExImgId = 'zoomImg_' + _uqid + 'floatImgWraper';
var _zoomImgCls = 'zoomImgCls_b6ig4jvwe';
var _draggedCls = 'zoomImgCls_dragged';
var _imgSrcViewCls = 'zoomImgCls_imgSrcView';
var _imgLinkCls = 'zoomImgCls_mhdt687po';
var _imgNoLinkCls = 'zoomImgCls_asntrs58f';
var _endInit = false;
var _img_element = null;
var _current_element = null;
var _wrapper_element = null;
var _ctx_show = true;
var _accKeyState = {ctrl: false, alt: false};
var _dragParam = null;
var _draggingCnt = 0;
var _clickFunc = null;
var _mdownFunc = null;
var _rclickCancelCnt = 0;
var _rclickTimer = null;

var _zoom_dim = 10;
var _zoom_rotd = 15;
var _zoom_rcCancel = 3000;
var _zoom_reverse = false;
var _zoom_bgImg = false;
var _zoom_autoRtn = false;
var _zoom_ctrlRvs = false;
var _zoom_enableCxt = true;
var _zoom_ivpDrag = false;
var _zoom_clickSwap = false;

var _singleImgPage = isSingleImgPage();

const elementDataMap = new WeakMap();
function getElData(el, key) {
    if (!el || !elementDataMap.has(el)) return undefined;
    return elementDataMap.get(el)[key];
}
function setElData(el, key, value) {
    if (!el) return;
    if (!elementDataMap.has(el)) elementDataMap.set(el, {});
    elementDataMap.get(el)[key] = value;
}

function isSingleImgPage() {
    var es = document.body.getElementsByTagName('*');
    return (es && es.length === 1 && es[0].tagName.toUpperCase() === 'IMG');
}

function init() {
    d('Init Start', '');
    
    if(_singleImgPage) singlePageAltImg();
    
    if(_zoom_clickSwap) {
        _clickFunc = windowFiting;
        _mdownFunc = sizeFit;
    } else {
        _clickFunc = sizeFit;
        _mdownFunc = windowFiting;
    }
    
    document.body.addEventListener('mousedown', e => {
        if(e.button === 2) { 
            var t = document.elementFromPoint(e.clientX, e.clientY);
            checkTarget(t, e);
        }
    });
    
    document.body.addEventListener('mouseup', e => {
        if(_dragParam) {
            _dragParam = null;
            d('Drag End', '');
        }
        if(e.button === 2 && _img_element) {
            setTimeout(() => setZoom(), 100);
        }
    });
    
    document.body.addEventListener('mousemove', e => imgDrag(e.clientX, e.clientY));
    document.body.addEventListener('keydown', e => { _accKeyState.ctrl = e.ctrlKey; _accKeyState.alt = e.altKey; });
    document.body.addEventListener('keyup', e => { _accKeyState.ctrl = _accKeyState.alt = false; });
    
    window.addEventListener('contextmenu', e => {
        if(!_ctx_show) e.preventDefault();
    });
    
    document.addEventListener('blur', e => {
        _accKeyState.ctrl = _accKeyState.alt = false;
        if(_img_element) setZoom();
    });
    
    initExImgObserver();
    
    _endInit = true;
    d('Init End', '');
}

function singlePageAltImg() {
    if(!_zoom_ivpDrag) return;
    
    d('ImageView Sorce Page', '');
    var img = document.body.children[0];
    const modeFitCls = 'zoomImgCls_modeFit';
    img.style.display = 'none';
    
    var nimg = document.createElement('img');
    nimg.className = _imgSrcViewCls;
    nimg.src = img.src;
    _current_element = nimg;
    
    nimg.addEventListener('load', function() { 
        var w = this.naturalWidth, h = this.naturalHeight;
        var sw = document.documentElement.scrollWidth, sh = document.documentElement.scrollHeight;
        var size = calcLimit(w, h, sw, sh);
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
        if(setting.clickSwap != null) _zoom_clickSwap = setting.clickSwap; 
    }
}

function checkTarget(t, e) {
    if(t) {
        var attach = (o, imgObj) => {
            attachEvent(o, imgObj ? imgObj : null);
            setZoom(imgObj ? imgObj : o);
            enableContextMenus(true);
            return true;
        };
        _wrapper_element = null;
        
        if(!getElData(t, _firstkey)) {
            var tag = t.tagName.toUpperCase();
            if(tag === 'IMG' || tag === 'CANVAS') {
                d('Image Type', 'Normal');
                return attach(t);
            }
            var imgs = t.getElementsByTagName('img');
            if(imgs.length > 0 && e && hitCheck(imgs[0], {x: e.pageX, y: e.pageY})) {
                d('Image Type', 'Inner');
                _wrapper_element = t;
                return attach(t, imgs[0]);
            }
            if(_zoom_bgImg) {
                var bgi = window.getComputedStyle(t).backgroundImage;
                if(/url/i.test(bgi) && tag !== 'BODY') {
                    t.setAttribute('src', bgi.trim().replace(/['"]/gi, '').slice(4, -1));
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
    var ofs = getOffset(obj);
    var style = window.getComputedStyle(obj);
    var op = {
        x: ofs.left + (parseInt(style.borderLeftWidth) || 0) + (parseInt(style.paddingLeft) || 0), 
        y: ofs.top + (parseInt(style.borderTopWidth) || 0) + (parseInt(style.paddingTop) || 0)
    };
    var rect = {x: op.x, y: op.y, r: op.x + obj.offsetWidth, b: op.y + obj.offsetHeight};
    return (rect.x < pos.x && pos.x < rect.r && rect.y < pos.y && pos.y < rect.b);
}

const defEventCancel = e => e.preventDefault();

function setZoom(img, def) {
    window.removeEventListener('wheel', zoomEvent);
    window.addEventListener('wheel', defEventCancel, {passive: false});

    if(_rclickTimer) {
        clearTimeout(_rclickTimer);
        _rclickTimer = null;
    }

    if(img) {
        d('ZoomTarget Set', '----------');
        _img_element = img;
        _current_element = img;
        var data = getElData(img, _firstkey);
        
        if(!data) {
            var ofs = getOffset(img);
            var obj = { 
                id: 'zoomImg_' + new Date().getTime().toString(16),
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
                var ofs = getOffset(img);
                data.sx = ofs.left;
                data.sy = ofs.top;
            }
        }
        
        window.addEventListener('wheel', zoomEvent, {passive: false});

        if (_zoom_rcCancel > 0) {
            _rclickTimer = setTimeout(() => {
                setZoom();
            }, _zoom_rcCancel);
        }

    } else {
        d('ZoomTarget Clear', '');
        window.removeEventListener('wheel', defEventCancel, {passive: false});

        if(_zoom_autoRtn && _img_element) {
            var src_elem = getElData(_img_element, _srckey);
            if(src_elem) clearImgEx(src_elem);
            setImageRect();
            imgRotate(0);
        }
        _img_element = null;
        _ctx_show = true;
    }
}

function calcPos(zoomSize) {
    var winW = _singleImgPage ? document.documentElement.scrollWidth : window.innerWidth;
    var winH = _singleImgPage ? document.documentElement.scrollHeight : window.innerHeight;
    var scrX = window.scrollX;
    var scrY = window.scrollY;
    
    var data = getElData(_img_element, _firstkey);
    var firstSize = {w: data.sw, h: data.sh};
    var rect = {x: data.sx, y: data.sy, w: data.sw, h: data.sh, r: data.sx + data.sw, b: data.sy + data.sh};
    var x = rect.x, y = rect.y;

    if(firstSize.w < zoomSize.w && firstSize.h < zoomSize.h) {
        if(_img_element.classList.contains(_draggedCls)) {
            var ofst = getOffset(_img_element);
            var iesz = {w: _img_element.offsetWidth, h: _img_element.offsetHeight};
            rect = {x: ofst.left, y: ofst.top, w: iesz.w, h: iesz.h, r: ofst.left + iesz.w, b: ofst.top + iesz.h};
        }
        
        x = rect.x - ((zoomSize.w - rect.w) / 2);
        y = rect.y - ((zoomSize.h - rect.h) / 2);
        
        if(!_img_element.classList.contains(_draggedCls) && !_singleImgPage) {
            var r = x + zoomSize.w, b = y + zoomSize.h;
            var scrRect = {x: scrX, y: scrY, w: winW, h: winH, r: scrX + winW, b: scrY + winH};
            
            if(rect.x < scrRect.x) scrRect.x = rect.x;
            if(rect.r > scrRect.r) scrRect.r = rect.r;
            if(rect.y < scrRect.y) scrRect.y = rect.y;
            if(rect.b > scrRect.b) scrRect.b = rect.b;
            
            if(zoomSize.w <= scrRect.w) {
                if(x < scrRect.x) x = scrRect.x;
                if(r > scrRect.r) x = scrRect.r - zoomSize.w;
            } else {
                x = scrRect.x - ((zoomSize.w - scrRect.w) / 2);
            }
            if(zoomSize.h <= scrRect.h) {
                if(y < scrRect.y) y = scrRect.y;
                if(b > scrRect.b) y = scrRect.b - zoomSize.h;
            } else {
                y = scrRect.y - ((zoomSize.h - scrRect.h) / 2);
            }
        }
    }
    return {x: x, y: y, w: zoomSize.w, h: zoomSize.h};
}

function calcLimit(w, h, sw, sh) {
    if(w > sw) { h = (h*sw) / w; w = sw; }
    if(h > sh) { w = (w*sh) / h; h = sh; }
    return {w: w, h: h};
}

function generateImgEx(size) {
    d('Create FloatImage', '');
    var exImgWrapper = document.getElementById(_zoomExImgId);
    if(!exImgWrapper) {
        exImgWrapper = document.createElement('div');
        exImgWrapper.id = _zoomExImgId;
        document.body.appendChild(exImgWrapper);
    }
    
    var data = getElData(_img_element, _firstkey);
    _img_element.style.visibility = 'hidden';
    var rect = calcPos({w: size.w, h: size.h});
    var rot = getElData(_img_element, _rotkey);
    var img = document.getElementById(data.id);
    
    if(!img) {
        img = document.createElement('img');
        img.id = data.id;
        img.className = _zoomImgCls;
        img.src = _img_element.getAttribute('src');
        img.addEventListener('mouseover', e => e.preventDefault());
        img.addEventListener('drag', e => e.preventDefault());
        img.addEventListener('dragstart', e => e.preventDefault());
        img.addEventListener('dragend', e => e.preventDefault());
        
        var al = _img_element.closest('a');
        if(al) {
            var pt = document.createElement('a');
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
    var data = getElData(_img_element, _firstkey);
    var rot = getElData(_img_element, _rotkey);
    src_elem.style.visibility = 'visible';
    
    var pnt = _img_element.closest('a');
    if(pnt && pnt.parentNode === document.getElementById(_zoomExImgId)) pnt.remove(); 
    else _img_element.remove();
    
    setZoom(src_elem, {sx: data.sx, sy: data.sy, sw: data.sw, sh: data.sh});
    setImageRect(size);
    imgRotate(rot);
}

function setImageRect(size, element) {
    if(!element) element = _img_element;
    var data = getElData(element, _firstkey);
    var rect = size ? calcPos({w: size.w, h: size.h}) : {x: data.sx, y: data.sy, w: data.sw, h: data.sh};
    
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
    var winW = _singleImgPage ? document.documentElement.scrollWidth : window.innerWidth;
    var winH = _singleImgPage ? document.documentElement.scrollHeight : window.innerHeight;
    
    var data = getElData(_img_element, _firstkey);
    var size = getElData(_img_element, _sizekey);
    var src_elem = getElData(_img_element, _srckey);
    var w = size.w * r, h = size.h * r;
    var floating = _zoom_ctrlRvs ? _accKeyState.ctrl : !_accKeyState.ctrl;
    var tag = _img_element.tagName.toUpperCase();
    
    if(tag === 'CANVAS') floating = false;
    d('Floating zoom', floating);
    
    if(isZoomLimit) {
        var limsiz = calcLimit(w, h, winW, winH);
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
}

function sizeFit() {
    if(_img_element) {
        var data = getElData(_img_element, _firstkey);
        var src_elem = getElData(_img_element, _srckey);
        var w = _img_element.offsetWidth, h = _img_element.offsetHeight;
        var nw = _img_element.naturalWidth, nh = _img_element.naturalHeight;
        var floating = _zoom_ctrlRvs ? _accKeyState.ctrl : !_accKeyState.ctrl;
        var tag = _img_element.tagName.toUpperCase();
        
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
        
        _ctx_show = false;
        return false;
    }
    return true;
}

function windowFiting(fromCtxMenu) {
    if(_img_element) {
        d('Window Fit', '');
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
    if(!_img_element) return;
    var delta = e.deltaY ? -(e.deltaY) : (e.wheelDelta ? e.wheelDelta : -(e.detail));
    d('Wheel delta', delta);
    delta = _zoom_reverse ? -delta : delta;
    var dim = _zoom_dim * 0.01;
    var r = delta < 0 ? 1 - dim : (delta > 0 ? 1 + dim : 1);

    if(_rclickTimer) {
        clearTimeout(_rclickTimer);
        _rclickTimer = setTimeout(() => { setZoom(); }, _zoom_rcCancel);
    }

    if(_accKeyState.alt) {
        imgRotate((getElData(_img_element, _rotkey) + _zoom_rotd * (delta < 0 ? 1 : -1)) % 360);
    } else {
        zoom(r);
    }
    
    _ctx_show = false;
    e.preventDefault();
    return false;
}

function ctxZoom(zin) {
    if(_current_element) {
        setZoom(_current_element);
        zoom(zin ? 2.0 : 0.5);
        setZoom();
    }
}

function ctxRotation(rot) {
    if(_current_element) {
        setZoom(_current_element);
        imgRotate((getElData(_img_element, _rotkey) + rot) % 360);
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
    d('Attach Event', '');
    elem.addEventListener('click', e => {
        var jdg = _clickFunc() && _draggingCnt < 8;
        _draggingCnt = 0;
        if(!jdg) e.preventDefault();
    });
    elem.addEventListener('mousedown', function(e) {
        if(e.button === 2) setZoom(imgObj ? imgObj : this); 
        else if(e.button === 0) {
            if(this.classList.contains(_zoomImgCls) && !_img_element) {
                var ofs = getOffset(this);
                _dragParam = {obj: this, x: e.pageX - ofs.left, y: e.pageY - ofs.top};
                this.classList.add('zoomImgCls_draggingCur');
                d('Drag Start', '');
                e.preventDefault();
            }
        }
    });
    elem.addEventListener('mouseup', function(e) { 
        this.classList.remove('zoomImgCls_draggingCur');
        if(e.button === 1) _mdownFunc();
    });
    const resetCtx = e => { if(!_img_element) _ctx_show = true; };
    elem.addEventListener('mouseenter', resetCtx);
    elem.addEventListener('mouseleave', resetCtx);
    elem.addEventListener('blur', resetCtx);
}

function initExImgObserver() {
    const observer = new MutationObserver((mutations) => {
        var exImgWrapper = document.getElementById(_zoomExImgId);
        if(exImgWrapper) {
            var imgs = exImgWrapper.getElementsByTagName('img');
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
    
    var obj = _dragParam.obj;
    obj.style.left = (window.scrollX + (x - _dragParam.x)) + 'px';
    obj.style.top = (window.scrollY + (y - _dragParam.y)) + 'px';
    
    if(!obj.classList.contains(_draggedCls) && _draggingCnt > 8) {
        obj.classList.add(_draggedCls);
    }
    _draggingCnt++;
}

function enableContextMenus(enable) {
    browser.runtime.sendMessage({id: 'set-context', data: _zoom_enableCxt ? enable : false});
}

function checkSendGetSetting() {
        d('SendMessage GetSetting', '');
        browser.runtime.sendMessage({id: 'get-setting'});
}

browser.runtime.onMessage.addListener((msg) => {
    switch (msg.id) {
    case 'set-setting':
        settingData(msg.data);
        if(!_endInit) init();
        break;
    case 'zoom-in': ctxZoom(true); break;
    case 'zoom-out': ctxZoom(false); break;
    case 'r90': ctxRotation(90); break;
    case 'l90': ctxRotation(-90); break;
    case '180': ctxRotation(180); break;
    case 'fit-win': windowFiting(true); break;
    case 'fit': ctxFit(); break;
    }
});

checkSendGetSetting();
