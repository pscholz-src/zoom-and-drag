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

const els = {
	dot: document.getElementById("status_dot"),
	host: document.getElementById("host"),
	status: document.getElementById("status_text"),
	ruleBox: document.getElementById("rule_box"),
	ruleValue: document.getElementById("rule_value"),
	ruleHint: document.getElementById("rule_hint"),
	toggle: document.getElementById("toggle_btn"),
	scopeBox: document.getElementById("scope_box"),
	scopeHostBtn: document.getElementById("scope_host_btn"),
	scopeHostRule: document.getElementById("scope_host_rule"),
	scopeDomainBtn: document.getElementById("scope_domain_btn"),
	scopeDomainRule: document.getElementById("scope_domain_rule"),
	scopeCancel: document.getElementById("scope_cancel_btn"),
	settings: document.getElementById("settings_btn"),
	updateBadge: document.getElementById("update_badge")
};

let currentHost = "";

async function getActiveHost() {
	const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
	return ZDShared.hostFromUrl(tab?.url);
}

async function getSetting() {
	const data = await browser.storage.local.get("setting");
	return { ...DEFAULT_SETTING, ...data.setting };
}

function setRuleInfo(host, rules) {
	const isOwnRule = (rule) => rule === host || rule === `www.${host}`;
	const others = rules.filter((rule) => !isOwnRule(rule));

	els.ruleBox.hidden = rules.length === 0;
	els.ruleValue.textContent = rules.join(", ");
	els.ruleHint.hidden = others.length === 0;
}

function getWholeDomainChoice(host) {
	const domain = ZDShared.getRegistrableDomain(host);
	const isPlain = !domain || host === domain || host === `www.${domain}`;
	return isPlain ? "" : domain;
}

function showScopeChoice(host, domain) {
	els.scopeHostRule.textContent = host;
	els.scopeDomainRule.textContent = domain;
	els.scopeBox.hidden = false;
	els.toggle.hidden = true;
	els.scopeHostBtn.focus();
}

function hideScopeChoice() {
	els.scopeBox.hidden = true;
	els.toggle.hidden = false;
}

async function renderUpdateBadge() {
	const data = await browser.storage.local.get("updateBadge");
	els.updateBadge.hidden = !data.updateBadge;
	els.updateBadge.title = gm("msgUpdateNotice");
}

async function render() {
	currentHost = await getActiveHost();
	const setting = await getSetting();
	hideScopeChoice();
	renderUpdateBadge();

	if (!currentHost) {
		els.dot.className = "dot";
		els.host.textContent = gm("extensionName");
		els.status.textContent = gm("popup_unsupported");
		els.toggle.textContent = gm("popup_disable");
		els.toggle.classList.remove("enable");
		els.toggle.disabled = true;
		setRuleInfo("", []);
		return;
	}

	const rules = ZDShared.findMatchingRules(currentHost, setting.excludedDomains);
	const isDisabled = rules.length > 0;

	els.host.textContent = currentHost;
	els.host.title = currentHost;
	els.dot.className = isDisabled ? "dot off" : "dot on";
	els.status.textContent = gm(isDisabled ? "popup_status_disabled" : "popup_status_active");
	els.toggle.textContent = gm(isDisabled ? "popup_enable" : "popup_disable");
	els.toggle.classList.toggle("enable", isDisabled);
	els.toggle.disabled = false;
	setRuleInfo(currentHost, rules);
}

async function updateExcludedDomains(change) {
	const setting = await getSetting();
	setting.excludedDomains = change(setting.excludedDomains);
	await browser.storage.local.set({ setting });
	await render();
}

async function toggleCurrentHost() {
	if (!currentHost) return;

	const setting = await getSetting();
	if (ZDShared.isExcluded(currentHost, setting.excludedDomains)) {
		els.toggle.disabled = true;
		await updateExcludedDomains((str) => ZDShared.removeMatchingRules(str, currentHost));
		return;
	}

	const domain = getWholeDomainChoice(currentHost);
	if (domain) {
		showScopeChoice(currentHost, domain);
		return;
	}

	els.toggle.disabled = true;
	await updateExcludedDomains((str) => ZDShared.addRule(str, currentHost));
}

document.querySelectorAll("[data-i18n]").forEach((el) => {
	const translation = gm(el.getAttribute("data-i18n"));
	if (translation) el.textContent = translation;
});

els.toggle.addEventListener("click", () => {
	toggleCurrentHost().catch((error) => {
		console.error("[Zoom & Drag] Could not update the excluded domains:", error);
		render();
	});
});

const reportError = (error) => {
	console.error("[Zoom & Drag] Could not update the excluded domains:", error);
	render();
};

els.scopeHostBtn.addEventListener("click", () => {
	updateExcludedDomains((str) => ZDShared.addRule(str, currentHost)).catch(reportError);
});

els.scopeDomainBtn.addEventListener("click", () => {
	const domain = getWholeDomainChoice(currentHost);
	updateExcludedDomains((str) => ZDShared.addRule(str, domain)).catch(reportError);
});

els.scopeCancel.addEventListener("click", () => {
	hideScopeChoice();
	els.toggle.focus();
});

els.settings.addEventListener("click", () => {
	browser.runtime.openOptionsPage();
	window.close();
});

browser.storage.onChanged.addListener((changes, area) => {
	if (area !== "local") return;
	if (changes.setting) render();
	else if (changes.updateBadge) renderUpdateBadge();
});

render();
