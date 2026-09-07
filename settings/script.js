/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Original work Copyright (c) Amu (http://crossblade.her.jp/)
 * Modified work Copyright (c) 2026 pscholz
 * Project: Zoom & Drag
 */

async function restore() {
    const data = await browser.storage.local.get('setting');
    if (data.setting) {
        const df = DEFAULT_SETTING;
        const a = data.setting;
        
        document.getElementById('dim').value = a.dim != null ? String(a.dim) : df.dim;
        document.getElementById('rotd').value = a.rotd != null ? String(a.rotd) : df.rotd;
        document.getElementById('rcCancel').value = a.rcCancel != null ? String(a.rcCancel) : df.rcCancel;
        
        document.getElementById('ctrlRvs').checked = a.ctrlRvs != null ? a.ctrlRvs : df.ctrlRvs;
        document.getElementById('reverse').checked = a.reverse != null ? a.reverse : df.reverse;
        document.getElementById('bgImg').checked = a.bgImg != null ? a.bgImg : df.bgImg;
        document.getElementById('autoRtn').checked = a.autoRtn != null ? a.autoRtn : df.autoRtn;
        document.getElementById('enableCxt').checked = a.enableCxt != null ? a.enableCxt : df.enableCxt;
        document.getElementById('ivpDrag').checked = a.ivpDrag != null ? a.ivpDrag : df.ivpDrag;
        document.getElementById('clickSwap').checked = a.clickSwap != null ? a.clickSwap : df.clickSwap;
    }
    
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
        "clickSwap": document.getElementById('clickSwap').checked
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
    document.getElementById('click_op1').textContent = isSwapped ? gm('td_17') : gm('td_7');
    document.getElementById('click_op2').textContent = isSwapped ? gm('td_7') : gm('td_17');
}

async function reset() {
    await browser.storage.local.set({ 'setting': DEFAULT_SETTING });
    location.reload();
}

const gm = n => browser.i18n.getMessage(n);

document.getElementById('h2Setting').textContent = gm('h2Setting');
document.getElementById('thFunc').textContent = gm('thFunc');
document.getElementById('thCtrl').textContent = gm('thCtrl');

document.getElementById('reset_btn').addEventListener('click', () => reset());

for (let i = 1; i < 40; i++) {
    const elements = document.querySelectorAll('.td_' + i);
    const me = gm('td_' + i);
    
    if (me) {
        elements.forEach(el => {
            if (el.tagName.toUpperCase() === 'INPUT') {
                el.value = me;
            } else {
                el.textContent = me;
            }
        });
    }
}

document.querySelectorAll('select, input[type="checkbox"]').forEach(el => {
    el.addEventListener('change', () => save());
});

document.getElementById('ctrlRvs').addEventListener('change', () => rvs_ctrl());
document.getElementById('clickSwap').addEventListener('change', () => rvs_click());

restore();
