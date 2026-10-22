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

import { DEFAULT_SETTING } from "../default_setting.js";
globalThis.browser = globalThis.browser || globalThis.chrome;

const gm = (n) => browser.i18n.getMessage(n);

const SELECT_IDS = ["dim", "rotd", "rcCancel"];
const CHECKBOX_IDS = [
	"ctrlRvs",
	"reverse",
	"bgImg",
	"autoRtn",
	"enableCxt",
	"ivpDrag",
	"clickSwap",
	"showZoomBadge",
	"enableKeyShortcuts",
	"trackCursor"
];

async function restore() {
	const data = await browser.storage.local.get("setting");
	const s = { ...DEFAULT_SETTING, ...data.setting };

	for (const id of SELECT_IDS) {
		document.getElementById(id).value = String(s[id]);
	}
	for (const id of CHECKBOX_IDS) {
		document.getElementById(id).checked = Boolean(s[id]);
	}
	document.getElementById("excludedDomains").value = s.excludedDomains ?? "";

	rvs_ctrl();
	rvs_click();
}

async function save() {
	const setting = {
		dim: Number(document.getElementById("dim").value),
		rotd: Number(document.getElementById("rotd").value),
		rcCancel: Number(document.getElementById("rcCancel").value),
		excludedDomains: document.getElementById("excludedDomains").value.trim()
	};

	for (const id of CHECKBOX_IDS) {
		setting[id] = document.getElementById(id).checked;
	}

	await browser.storage.local.set({ setting });
}

function rvs_ctrl() {
	const isSwapped = document.getElementById("ctrlRvs").checked;
	document.getElementById("ctrl_op1").textContent = isSwapped ? gm("lblCtrlRightWheel") : gm("lblRightWheel");
	document.getElementById("ctrl_op2").textContent = isSwapped ? gm("lblRightWheel") : gm("lblCtrlRightWheel");
}

function rvs_click() {
	const isSwapped = document.getElementById("clickSwap").checked;
	document.getElementById("click_op1").textContent = isSwapped ? gm("lblRightMiddleClick") : gm("lblRightLeftClick");
	document.getElementById("click_op2").textContent = isSwapped ? gm("lblRightLeftClick") : gm("lblRightMiddleClick");
}

async function reset() {
	await browser.storage.local.set({ setting: DEFAULT_SETTING });
	await restore();
}

async function showUpdateNotice() {
	const { updateNotice } = await browser.storage.local.get("updateNotice");
	if (!updateNotice) return;

	document.getElementById("update_version").textContent = updateNotice.version ? `(v${updateNotice.version})` : "";
	document.getElementById("update_notice").hidden = false;
	browser.action.setBadgeText({ text: "" });
}

document.title = `${gm("extensionName")} - ${gm("h2Setting")}`;

document.querySelectorAll("[data-i18n]").forEach((el) => {
	const translation = gm(el.getAttribute("data-i18n"));
	if (translation) el.textContent = translation;
});

document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
	const translation = gm(el.getAttribute("data-i18n-placeholder"));
	if (translation) el.placeholder = translation;
});

document.getElementById("reset_btn").addEventListener("click", () => {
	if (confirm(gm("msgResetConfirm"))) reset();
});

const dismissBtn = document.getElementById("update_dismiss");
dismissBtn.title = gm("btnDismissNotice");
dismissBtn.setAttribute("aria-label", gm("btnDismissNotice"));
dismissBtn.addEventListener("click", async () => {
	document.getElementById("update_notice").hidden = true;
	await browser.storage.local.remove("updateNotice");
});

document.querySelectorAll('select, input[type="checkbox"], textarea').forEach((el) => {
	el.addEventListener("change", save);
});

document.getElementById("ctrlRvs").addEventListener("change", rvs_ctrl);
document.getElementById("clickSwap").addEventListener("change", rvs_click);

restore();
showUpdateNotice();