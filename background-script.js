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

import { DEFAULT_SETTING } from "./default_settings.js";
import "./shared-utils.js";
globalThis.browser = globalThis.browser || globalThis.chrome;

const TOP_MENU_ID = "top-menu";
const CHANGELOG_URL = "https://github.com/pscholz-src/zoom-and-drag/blob/main/CHANGELOG.md";
const HAS_FILE_READER = typeof FileReader !== "undefined";
const MAX_FETCH_IMAGE_BYTES = (HAS_FILE_READER ? 100 : 40) * 1024 * 1024;
const FETCH_ERR_TOO_LARGE = "image-too-large";
const BADGE_UPDATE = { text: "!", color: "#FFC107" };
const BADGE_DISABLED = { text: "X", color: "#D32F2F" };

let currentContextMenuState = null;
let contextMenuQueue = Promise.resolve();

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

function enqueueContextMenuOp(fn) {
	contextMenuQueue = contextMenuQueue.then(fn, fn);
	return contextMenuQueue;
}

async function rebuildContextMenus(visible) {
	const gm = (n) => browser.i18n.getMessage(n);
	await browser.contextMenus.removeAll();

	browser.contextMenus.create({
		id: TOP_MENU_ID,
		contexts: ["all"],
		title: gm("cmTopMenu"),
		visible
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

	currentContextMenuState = visible;
}

function createContextMenus(enable) {
	return enqueueContextMenuOp(() => rebuildContextMenus(Boolean(enable)));
}

function setContextMenuVisible(enable) {
	return enqueueContextMenuOp(async () => {
		const visible = Boolean(enable);
		if (currentContextMenuState === visible) return;

		try {
			await browser.contextMenus.update(TOP_MENU_ID, { visible });
			currentContextMenuState = visible;
		} catch {
			await rebuildContextMenus(visible);
		}
	});
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

function createTooLargeError() {
	const err = new Error("Image too large");
	err.code = FETCH_ERR_TOO_LARGE;
	return err;
}

async function readBlobWithLimit(response, limit) {
	if (!response.body || typeof response.body.getReader !== "function") {
		const blob = await response.blob();
		if (blob.size > limit) throw createTooLargeError();
		return blob;
	}

	const reader = response.body.getReader();
	const chunks = [];
	let received = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		received += value.byteLength;
		if (received > limit) {
			reader.cancel().catch(() => {});
			throw createTooLargeError();
		}
		chunks.push(value);
	}
	return new Blob(chunks, { type: response.headers.get("content-type") || "" });
}

async function fetchImageAsDataUrl(url, senderUrl, isDerived) {
	const parsed = ZDShared.parseSafeHttpUrl(url, undefined, senderUrl);
	if (!parsed) throw new Error("Unsupported or blocked URL");

	const sameOrigin = parsed.origin === new URL(senderUrl).origin;
	const response = await fetch(parsed.href, { credentials: isDerived && !sameOrigin ? "omit" : "include" });
	if (!response.ok) throw new Error(`HTTP ${response.status}`);
	if (response.url && !ZDShared.parseSafeHttpUrl(response.url, undefined, senderUrl)) {
		throw new Error("Blocked redirect target");
	}

	const declaredSize = Number(response.headers.get("content-length"));
	if (declaredSize > MAX_FETCH_IMAGE_BYTES) throw createTooLargeError();

	const blob = await readBlobWithLimit(response, MAX_FETCH_IMAGE_BYTES);
	if (!blob.type.startsWith("image/")) throw new Error("Not an image");

	return await blobToDataUrl(blob);
}

async function getBadgeState() {
	const data = await browser.storage.local.get(["setting", "updateBadge"]);
	return {
		excludedDomains: data.setting?.excludedDomains ?? DEFAULT_SETTING.excludedDomains,
		updateBadge: Boolean(data.updateBadge)
	};
}

async function updateBadgeForTab(tab, state) {
	if (!tab || tab.id === undefined || tab.id < 0) return;

	const host = ZDShared.hostFromUrl(tab.url);
	const isDisabled = Boolean(host) && ZDShared.isExcluded(host, state.excludedDomains);
	const badge = state.updateBadge ? BADGE_UPDATE : isDisabled ? BADGE_DISABLED : null;
	const title = browser.i18n.getMessage(isDisabled ? "actionTitleDisabled" : "extensionName");

	try {
		await browser.action.setBadgeText({ tabId: tab.id, text: badge ? badge.text : "" });
		if (badge) await browser.action.setBadgeBackgroundColor({ tabId: tab.id, color: badge.color });
		await browser.action.setTitle({ tabId: tab.id, title });
	} catch {
	}
}

async function refreshAllBadges() {
	const state = await getBadgeState();
	await browser.action.setBadgeText({ text: state.updateBadge ? BADGE_UPDATE.text : "" });
	await browser.action.setBadgeBackgroundColor({ color: BADGE_UPDATE.color });

	const tabs = await browser.tabs.query({});
	await Promise.all(tabs.map((tab) => updateBadgeForTab(tab, state)));
}

async function refreshTabBadge(tabOrId) {
	try {
		const tab = typeof tabOrId === "number" ? await browser.tabs.get(tabOrId) : tabOrId;
		await updateBadgeForTab(tab, await getBadgeState());
	} catch {
	}
}

async function checkStorageData() {
	const d = await browser.storage.local.get("setting");
	const setting = { ...DEFAULT_SETTING, ...d.setting };

	if (!d.setting || Object.keys(DEFAULT_SETTING).some((k) => d.setting[k] === undefined)) {
		await browser.storage.local.set({ setting });
	}

	await createContextMenus(setting.enableCxt ?? true);
	await refreshAllBadges();
}

browser.contextMenus.onClicked.addListener((info, tab) => {
	if (info.menuItemId === "setting") {
		browser.runtime.openOptionsPage();
	} else if (tab?.id) {
		browser.tabs.sendMessage(tab.id, { id: info.menuItemId }, { frameId: info.frameId }).catch(() => {});
	}
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	if (changeInfo.url !== undefined || changeInfo.status !== undefined) refreshTabBadge(tab);
});

browser.tabs.onActivated.addListener(({ tabId }) => {
	refreshTabBadge(tabId);
});

browser.storage.onChanged.addListener((changes, area) => {
	if (area !== "local") return;

	const excludedChanged = changes.setting && changes.setting.oldValue?.excludedDomains !== changes.setting.newValue?.excludedDomains;
	if (excludedChanged || changes.updateBadge) refreshAllBadges();
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
				browser.storage.local.set({ updateNotice: { version: currentVersion }, updateBadge: true });
			}
		}
	}
});

browser.runtime.onStartup.addListener(() => {
	checkStorageData();
});

browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
	switch (msg?.id) {
		case "set-context":
			setContextMenuVisible(msg.data);
			break;
		case "fetch-image":
			if (!sender.tab || typeof msg.url !== "string") {
				sendResponse({ ok: false, error: "Invalid request" });
				break;
			}
			fetchImageAsDataUrl(msg.url, sender.url || sender.tab.url, msg.derived === true).then(
				(dataUrl) => sendResponse({ ok: true, dataUrl }),
				(error) => sendResponse({ ok: false, error: String(error?.message || error), code: error?.code })
			);
			return true;
	}
});