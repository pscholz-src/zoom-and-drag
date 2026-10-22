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
const HAS_FILE_READER = typeof FileReader !== "undefined";
const MAX_FETCH_IMAGE_BYTES = (HAS_FILE_READER ? 100 : 40) * 1024 * 1024;
const FETCH_ERR_TOO_LARGE = "image-too-large";

let currentContextMenuState = null;

const MENU_ITEMS = [
	{ id: "zoom-custom", titleKey: "cmZoomCustom" },
	{ id: "zoom-in", titleKey: "cmZoomIn" },
	{ id: "zoom-out", titleKey: "cmZoomOut" },
	{ id: "r90", titleKey: "cmR90" },
	{ id: "l90", titleKey: "cmL90" },
	{ id: "180", titleKey: "cmRot180" },
	{ id: "fit-win", titleKey: "cmFitWin" },
	{ id: "fit", titleKey: "cmFit" },
	{ id: "separator-1", type: "separator" },
	{ id: "setting", titleKey: "cmSetting" }
];

async function createContextMenus(enable) {
	const gm = (n) => browser.i18n.getMessage(n);
	await browser.contextMenus.removeAll();

	browser.contextMenus.create({
		id: TOP_MENU_ID,
		contexts: ["all"],
		title: gm("cmTopMenu"),
		visible: Boolean(enable)
	});

	for (const item of MENU_ITEMS) {
		const config = {
			id: item.id,
			parentId: TOP_MENU_ID,
			contexts: ["all"]
		};
		if (item.type) config.type = item.type;
		if (item.titleKey) config.title = gm(item.titleKey);
		browser.contextMenus.create(config);
	}

	currentContextMenuState = Boolean(enable);
}

async function setContextMenuVisible(enable) {
	const visible = Boolean(enable);
	if (currentContextMenuState === visible) return;

	try {
		await browser.contextMenus.update(TOP_MENU_ID, { visible });
		currentContextMenuState = visible;
	} catch {
		await createContextMenus(visible);
	}
}

async function blobToDataUrl(blob) {
	if (HAS_FILE_READER) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result);
			reader.onerror = () => reject(reader.error);
			reader.readAsDataURL(blob);
		});
	}

	const bytes = new Uint8Array(await blob.arrayBuffer());
	const CHUNK_SIZE = 0x8000;
	let binary = "";
	for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
		binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK_SIZE));
	}
	return `data:${blob.type};base64,${btoa(binary)}`;
}

async function fetchImageAsDataUrl(url) {
	const parsed = new URL(url);
	if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
		throw new Error("Unsupported protocol");
	}

	const response = await fetch(parsed.href, { credentials: "include" });
	if (!response.ok) throw new Error(`HTTP ${response.status}`);

	const blob = await response.blob();
	if (!blob.type.startsWith("image/")) throw new Error("Not an image");
	if (blob.size > MAX_FETCH_IMAGE_BYTES) {
		const err = new Error("Image too large");
		err.code = FETCH_ERR_TOO_LARGE;
		throw err;
	}

	return await blobToDataUrl(blob);
}

async function checkStorageData() {
	const d = await browser.storage.local.get("setting");
	const setting = { ...DEFAULT_SETTING, ...d.setting };

	if (!d.setting || Object.keys(DEFAULT_SETTING).some((k) => d.setting[k] === undefined)) {
		await browser.storage.local.set({ setting });
	}

	await createContextMenus(setting.enableCxt ?? true);
}

browser.contextMenus.onClicked.addListener((info, tab) => {
	if (info.menuItemId === "setting") {
		browser.runtime.openOptionsPage();
	} else if (tab?.id) {
		browser.tabs.sendMessage(tab.id, { id: info.menuItemId }, { frameId: info.frameId }).catch(() => {});
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
			const [prevMajor = "0", prevMinor = "0"] = previousVersion.split(".");
			const [currMajor = "0", currMinor = "0"] = currentVersion.split(".");

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
				(dataUrl) => sendResponse({ ok: true, dataUrl }),
				(error) => sendResponse({ ok: false, error: String(error?.message || error), code: error?.code })
			);
			return true;
	}
});