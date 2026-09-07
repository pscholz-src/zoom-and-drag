/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Original work Copyright (c) Amu (http://crossblade.her.jp/)
 * Modified work Copyright (c) 2026 pscholz
 * Project: Zoom & Drag
 */

import { DEFAULT_SETTING } from './default_setting.js';
globalThis.browser = globalThis.browser || globalThis.chrome;


let currentContextMenuState = null;

function createContextMenus(enable) {
    if (currentContextMenuState === enable) return;
    currentContextMenuState = enable;

    const gm = n => browser.i18n.getMessage(n);
    browser.contextMenus.removeAll();
    
    if (enable) {
	const top_id = 'top-menu';
	browser.contextMenus.create({ id: top_id, contexts: ['all'], title: gm('cmTopMenu') });
	browser.contextMenus.create({ id: 'zoom-custom', parentId: top_id, contexts: ['all'], title: gm('cmZoomCustom') });
	browser.contextMenus.create({ id: 'zoom-in', parentId: top_id, contexts: ['all'], title: gm('cmZoomIn') });
	browser.contextMenus.create({ id: 'zoom-out', parentId: top_id, contexts: ['all'], title: gm('cmZoomOut') });
	browser.contextMenus.create({ id: 'r90', parentId: top_id, contexts: ['all'], title: gm('cmR90') });
	browser.contextMenus.create({ id: 'l90', parentId: top_id, contexts: ['all'], title: gm('cmL90') });
	browser.contextMenus.create({ id: '180', parentId: top_id, contexts: ['all'], title: gm('cmRot180') });
	browser.contextMenus.create({ id: 'fit-win', parentId: top_id, contexts: ['all'], title: gm('cmFitWin') });
	browser.contextMenus.create({ id: 'fit', parentId: top_id, contexts: ['all'], title: gm('cmFit') });
	browser.contextMenus.create({ id: 'separator-1', parentId: top_id, type: 'separator', contexts: ['all'] });
	browser.contextMenus.create({ id: 'setting', parentId: top_id, contexts: ['all'], title: gm('cmSetting') });
    }
}
async function checkStorageData() {
	const d = await browser.storage.local.get('setting');
	let setting = d.setting;
	if (!setting) {
		setting = DEFAULT_SETTING;
		await browser.storage.local.set({ 'setting': DEFAULT_SETTING });
	}
	createContextMenus(setting.enableCxt !== undefined ? setting.enableCxt : true);
}

browser.contextMenus.onClicked.addListener((info, tab) => {
	if (info.menuItemId === 'setting') {
        browser.runtime.openOptionsPage();
    } else {
        if (tab && tab.id) {
            browser.tabs.sendMessage(tab.id, { id: info.menuItemId }, { frameId: info.frameId });
        }
    }
});

browser.action.onClicked.addListener(() => {
    browser.runtime.openOptionsPage();
});

browser.runtime.onInstalled.addListener((details) => {
    checkStorageData();

    if (details.reason === 'install' || details.reason === 'update') {
        browser.tabs.create({
            url: 'https://github.com/pscholz-src/zoom-and-drag'
        });
    }
});

browser.runtime.onStartup.addListener(() => {
    checkStorageData();
});

browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
	switch (msg.id) {
		case 'get-setting':
			browser.storage.local.get('setting').then(d => {
                if (sender.tab && sender.tab.id) {
                    browser.tabs.sendMessage(sender.tab.id, { id: 'set-setting', data: d.setting }, { frameId: sender.frameId });
                }
            });
			break;
		case 'set-context':
			createContextMenus(msg.data);
			break;
	}
});
