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

import { DEFAULT_SETTING } from "./default_setting.js";
globalThis.browser = globalThis.browser || globalThis.chrome;

const TOP_MENU_ID = "top-menu";
const CHANGELOG_URL = "https://github.com/pscholz-src/zoom-and-drag/blob/main/CHANGELOG.md";
const MAX_FETCH_IMAGE_BYTES = 100 * 1024 * 1024;

let currentContextMenuState = null;

async function createContextMenus(enable) {
	const gm = (n) => browser.i18n.getMessage(n);
	await browser.contextMenus.removeAll();

	const top_id = TOP_MENU_ID;
	browser.contextMenus.create({ id: top_id, contexts: ["all"], title: gm("cmTopMenu"), visible: enable });
	browser.contextMenus.create({ id: "zoom-custom", parentId: top_id, contexts: ["all"], title: gm("cmZoomCustom") });
	browser.contextMenus.create({ id: "zoom-in", parentId: top_id, contexts: ["all"], title: gm("cmZoomIn") });
	browser.contextMenus.create({ id: "zoom-out", parentId: top_id, contexts: ["all"], title: gm("cmZoomOut") });
	browser.contextMenus.create({ id: "r90", parentId: top_id, contexts: ["all"], title: gm("cmR90") });
	browser.contextMenus.create({ id: "l90", parentId: top_id, contexts: ["all"], title: gm("cmL90") });
	browser.contextMenus.create({ id: "180", parentId: top_id, contexts: ["all"], title: gm("cmRot180") });
	browser.contextMenus.create({ id: "fit-win", parentId: top_id, contexts: ["all"], title: gm("cmFitWin") });
	browser.contextMenus.create({ id: "fit", parentId: top_id, contexts: ["all"], title: gm("cmFit") });
	browser.contextMenus.create({ id: "separator-1", parentId: top_id, type: "separator", contexts: ["all"] });
	browser.contextMenus.create({ id: "setting", parentId: top_id, contexts: ["all"], title: gm("cmSetting") });
	currentContextMenuState = enable;
}

async function setContextMenuVisible(enable) {
	if (currentContextMenuState === enable) return;

	try {
		await browser.contextMenus.update(TOP_MENU_ID, { visible: enable });
		currentContextMenuState = enable;
	} catch (error) {
		await createContextMenus(enable);
	}
}

async function fetchImageAsDataUrl(url) {
	const parsed = new URL(url);
	if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
		throw new Error("Unsupported protocol");
	}

	const response = await fetch(parsed.href, { credentials: "include" });
	if (!response.ok) throw new Error("HTTP " + response.status);

	const blob = await response.blob();
	if (!blob.type.startsWith("image/")) throw new Error("Not an image");
	if (blob.size > MAX_FETCH_IMAGE_BYTES) throw new Error("Image too large");

	return await new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result);
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(blob);
	});
}

async function checkStorageData() {
	const d = await browser.storage.local.get("setting");
	let setting = d.setting;

	if (!setting) {
		setting = DEFAULT_SETTING;
		await browser.storage.local.set({ setting: DEFAULT_SETTING });
	} else {
		let needsUpdate = false;
		for (const key of Object.keys(DEFAULT_SETTING)) {
			if (setting[key] === undefined) {
				setting[key] = DEFAULT_SETTING[key];
				needsUpdate = true;
			}
		}
		if (needsUpdate) {
			await browser.storage.local.set({ setting: setting });
		}
	}
	createContextMenus(setting.enableCxt !== undefined ? setting.enableCxt : true);
}

browser.contextMenus.onClicked.addListener((info, tab) => {
	if (info.menuItemId === "setting") {
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

	if (details.reason === "install") {
		browser.tabs.create({ url: CHANGELOG_URL });
	} else if (details.reason === "update") {
		const currentVersion = browser.runtime.getManifest().version;
		const previousVersion = details.previousVersion;

		if (previousVersion && currentVersion) {
			const prevParts = previousVersion.split(".");
			const currParts = currentVersion.split(".");

			const prevMajor = prevParts[0] || "0";
			const prevMinor = prevParts[1] || "0";
			const currMajor = currParts[0] || "0";
			const currMinor = currParts[1] || "0";

			if (prevMajor !== currMajor || prevMinor !== currMinor) {
				browser.storage.local.set({ updateNotice: { version: currentVersion } });
				browser.action.setBadgeText({ text: "!" });
				browser.action.setBadgeBackgroundColor({ color: "#FFC107" });
			}
		}
	}
});

browser.runtime.onStartup.addListener(() => {
	checkStorageData();
});

browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
	switch (msg.id) {
		case "set-context":
			setContextMenuVisible(msg.data);
			break;
		case "fetch-image":
			if (!sender.tab || typeof msg.url !== "string") {
				sendResponse({ ok: false, error: "Invalid request" });
				break;
			}
			fetchImageAsDataUrl(msg.url).then(
				(dataUrl) => sendResponse({ ok: true, dataUrl: dataUrl }),
				(error) => sendResponse({ ok: false, error: String((error && error.message) || error) })
			);
			return true;
	}
});