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

import { DEFAULT_SETTING } from "../default_settings.js";
globalThis.browser = globalThis.browser || globalThis.chrome;

const gm = (n) => browser.i18n.getMessage(n);

const SELECT_IDS = ["dim", "rotd", "rcCancel"];
const COLOR_IDS = ["frameColor", "pinColor"];
const COLOR_OFF_IDS = { frameColor: "frameOff", pinColor: "pinFrameOff" };
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
	"trackCursor",
	"hiResUpgrade",
	"frameOff",
	"pinFrameOff"
];

const SELECT_UNITS = { dim: "%", rotd: "°", rcCancel: "" };

function setSelectValue(select, stored, fallback) {
	select.querySelectorAll("option[data-zd-extra]").forEach((option) => option.remove());

	const num = Number(stored);
	const valid = stored !== null && stored !== "" && Number.isFinite(num);
	const value = String(valid ? num : fallback);

	if (![...select.options].some((option) => option.value === value)) {
		const extra = new Option(`${value}${SELECT_UNITS[select.id] ?? ""}`, value);
		extra.dataset.zdExtra = "true";
		const options = [...select.options];
		const next =
			options.find((option) => Number(option.value) >= 0 && Number(option.value) > Number(value)) ||
			options.find((option) => Number(option.value) < 0) ||
			null;
		select.add(extra, next);
	}
	select.value = value;
}

async function restore() {
	const data = await browser.storage.local.get("setting");
	const s = { ...DEFAULT_SETTING, ...data.setting };

	for (const id of SELECT_IDS) {
		setSelectValue(document.getElementById(id), s[id], DEFAULT_SETTING[id]);
	}
	for (const id of CHECKBOX_IDS) {
		document.getElementById(id).checked = Boolean(s[id]);
	}
	for (const id of COLOR_IDS) {
		document.getElementById(id).value = ZDShared.isHexColor(s[id]) ? s[id] : DEFAULT_SETTING[id];
		updateFramePreview(id);
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
	for (const id of COLOR_IDS) {
		setting[id] = document.getElementById(id).value;
	}

	await browser.storage.local.set({ setting });
}

function updateFramePreview(id) {
	const input = document.getElementById(id);
	const off = document.getElementById(COLOR_OFF_IDS[id]).checked;
	const color = input.value;
	const preview = input.closest("tr").querySelector(".frame_prev");
	input.disabled = off;
	preview.classList.toggle("off", off);
	preview.style.setProperty("--c", color);
	preview.style.setProperty("--c5", ZDShared.hexToRgba(color, 0.5));
	preview.style.setProperty("--c4", ZDShared.hexToRgba(color, 0.4));
	preview.style.setProperty("--idle", id === "pinColor" ? color : "#666666");
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
	await browser.storage.local.remove("updateBadge");
}

document.title = `${gm("extensionName")} - ${gm("h2Setting")}`;

document.querySelectorAll("[data-i18n]").forEach((el) => {
	const translation = gm(el.getAttribute("data-i18n"));
	if (translation) el.textContent = translation;
});

document.querySelectorAll("[data-i18n-title]").forEach((el) => {
	const translation = gm(el.getAttribute("data-i18n-title"));
	if (translation) {
		el.title = translation;
		el.setAttribute("aria-label", translation);
	}
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

document.querySelectorAll('select, input[type="checkbox"], input[type="color"], textarea').forEach((el) => {
	el.addEventListener("change", save);
});

COLOR_IDS.forEach((id) => {
	document.getElementById(id).addEventListener("input", () => updateFramePreview(id));
	document.getElementById(COLOR_OFF_IDS[id]).addEventListener("change", () => updateFramePreview(id));
});

document.querySelectorAll(".color_reset").forEach((btn) => {
	btn.addEventListener("click", () => {
		const id = btn.dataset.reset;
		document.getElementById(id).value = DEFAULT_SETTING[id];
		document.getElementById(COLOR_OFF_IDS[id]).checked = DEFAULT_SETTING[COLOR_OFF_IDS[id]];
		updateFramePreview(id);
		save();
	});
});

document.getElementById("ctrlRvs").addEventListener("change", rvs_ctrl);
document.getElementById("clickSwap").addEventListener("change", rvs_click);

browser.storage.onChanged.addListener((changes, area) => {
	if (area !== "local" || !changes.setting) return;

	const field = document.getElementById("excludedDomains");
	const next = changes.setting.newValue?.excludedDomains ?? "";
	if (document.activeElement !== field && field.value.trim() !== next) field.value = next;
});

restore();
showUpdateNotice();