/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Original work Copyright (c) Amu (http://crossblade.her.jp/)
 * Modified work Copyright (c) 2026 pscholz
 * Project: Zoom & Drag
 */

import { DEFAULT_SETTING } from '../default_setting.js';
globalThis.browser = globalThis.browser || globalThis.chrome;


async function restore() {
    const data = await browser.storage.local.get('setting');
    const df = DEFAULT_SETTING;
    const a = data.setting || df;
    
    document.getElementById('dim').value = a.dim != null ? String(a.dim) : String(df.dim);
    document.getElementById('rotd').value = a.rotd != null ? String(a.rotd) : String(df.rotd);
    document.getElementById('rcCancel').value = a.rcCancel != null ? String(a.rcCancel) : String(df.rcCancel);
    
    document.getElementById('ctrlRvs').checked = a.ctrlRvs != null ? a.ctrlRvs : df.ctrlRvs;
    document.getElementById('reverse').checked = a.reverse != null ? a.reverse : df.reverse;
    document.getElementById('bgImg').checked = a.bgImg != null ? a.bgImg : df.bgImg;
    document.getElementById('autoRtn').checked = a.autoRtn != null ? a.autoRtn : df.autoRtn;
    document.getElementById('enableCxt').checked = a.enableCxt != null ? a.enableCxt : df.enableCxt;
    document.getElementById('ivpDrag').checked = a.ivpDrag != null ? a.ivpDrag : df.ivpDrag;
    document.getElementById('clickSwap').checked = a.clickSwap != null ? a.clickSwap : df.clickSwap;
    document.getElementById('showZoomBadge').checked = a.showZoomBadge != null ? a.showZoomBadge : df.showZoomBadge;
    document.getElementById('enableKeyShortcuts').checked = a.enableKeyShortcuts != null ? a.enableKeyShortcuts : (df.enableKeyShortcuts !== undefined ? df.enableKeyShortcuts : true);
    document.getElementById('excludedDomains').value = a.excludedDomains != null ? a.excludedDomains : (df.excludedDomains || '');
    
    rvs_ctrl();
    rvs_click();
}

async function save() {
    const a = {
        "dim": Number(document.getElementById('dim').value),
        "rotd": Number(document.getElementById('rotd').value),
        "rcCancel": Number(document.getElementById('rcCancel').value),
        "reverse": document.getElementById('reverse').checked,
        "bgImg": document.getElementById('bgImg').checked,
        "autoRtn": document.getElementById('autoRtn').checked,
        "ctrlRvs": document.getElementById('ctrlRvs').checked,
        "enableCxt": document.getElementById('enableCxt').checked,
        "ivpDrag": document.getElementById('ivpDrag').checked,
        "clickSwap": document.getElementById('clickSwap').checked,
        "showZoomBadge": document.getElementById('showZoomBadge').checked,
        "enableKeyShortcuts": document.getElementById('enableKeyShortcuts').checked,
        "excludedDomains": document.getElementById('excludedDomains').value.trim()
    };
    await browser.storage.local.set({ 'setting': a });
}

function rvs_ctrl() {
    const inputs = Array.from(document.querySelectorAll('input.ctrl_op_d'));
    if (document.getElementById('ctrlRvs').checked) {
        inputs.reverse();
    }
    document.getElementById('ctrl_op1').textContent = inputs[0].value;
    document.getElementById('ctrl_op2').textContent = inputs[1].value;
}

function rvs_click() {
    const isSwapped = document.getElementById('clickSwap').checked;
    document.getElementById('click_op1').textContent = isSwapped ? gm('lblRightMiddleClick') : gm('lblRightLeftClick');
    document.getElementById('click_op2').textContent = isSwapped ? gm('lblRightLeftClick') : gm('lblRightMiddleClick');
}

async function reset() {
    await browser.storage.local.set({ 'setting': DEFAULT_SETTING });
    await restore();
}

const gm = n => browser.i18n.getMessage(n);

document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translation = gm(key);
    
    if (translation) {
        if (el.tagName.toUpperCase() === 'INPUT') {
            el.value = translation;
        } else {
            el.textContent = translation;
        }
    }
});

document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const translation = gm(key);
    if (translation) {
        el.placeholder = translation;
    }
});

document.getElementById('reset_btn').addEventListener('click', () => reset());

document.querySelectorAll('select, input[type="checkbox"], textarea').forEach(el => {
    el.addEventListener('change', () => save());
});

document.getElementById('ctrlRvs').addEventListener('change', () => rvs_ctrl());
document.getElementById('clickSwap').addEventListener('change', () => rvs_click());

restore();
