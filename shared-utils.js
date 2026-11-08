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

(function (root) {
	"use strict";

	const IMAGE_EXT_RE = /\.(?:jpe?g|png|webp|avif|gif|bmp)$/i;

	function hostFromUrl(url) {
		try {
			const u = new URL(url);
			if (u.protocol !== "http:" && u.protocol !== "https:") return "";
			return u.hostname.toLowerCase();
		} catch {
			return "";
		}
	}

	function normalizeRule(raw) {
		let rule = String(raw || "").trim().toLowerCase();
		rule = rule.replace(/^(?:[a-z]+|\*):\/\//, "").split("/")[0];

		const withPort = rule.match(/^(\[[^\]]*\]|[^:]*):(?:\d+|\*)$/);
		if (withPort) rule = withPort[1];

		rule = rule.replace(/\.$/, "");
		rule = rule.replace(/^(?:\*?\.)+/, "");
		rule = rule.replace(/\*{2,}/g, "*");

		return /[a-z0-9]/.test(rule) ? rule : "";
	}

	function globMatch(pattern, text) {
		let p = 0;
		let t = 0;
		let star = -1;
		let mark = 0;
		while (t < text.length) {
			if (p < pattern.length && pattern[p] === "*") {
				star = p++;
				mark = t;
			} else if (p < pattern.length && pattern[p] === text[t]) {
				p++;
				t++;
			} else if (star !== -1) {
				p = star + 1;
				t = ++mark;
			} else {
				return false;
			}
		}
		while (p < pattern.length && pattern[p] === "*") p++;
		return p === pattern.length;
	}

	function globMatchesHost(pattern, host) {
		let start = 0;
		for (;;) {
			if (globMatch(pattern, host.slice(start))) return true;
			const dot = host.indexOf(".", start);
			if (dot === -1) return false;
			start = dot + 1;
		}
	}

	function parseRules(str) {
		return String(str || "")
			.split(/[\r\n,]+/)
			.map((raw) => raw.trim())
			.filter(Boolean)
			.map((raw) => ({ raw, rule: normalizeRule(raw) }))
			.filter((entry) => entry.rule);
	}

	function ruleMatchesHost(rule, host) {
		if (!rule || !host) return false;

		if (rule.includes("*")) {
			if (globMatchesHost(rule, host)) return true;
			const bare = rule.startsWith("www.") ? rule.slice(4) : "";
			return /[a-z0-9]/.test(bare) && globMatch(bare, host);
		}

		if (host === rule || host.endsWith(`.${rule}`)) return true;
		return rule.length > 4 && rule.startsWith("www.") && host === rule.slice(4);
	}

	function isExcluded(host, str) {
		const h = String(host || "").toLowerCase();
		if (!h) return false;
		return parseRules(str).some((entry) => ruleMatchesHost(entry.rule, h));
	}

	function findMatchingRules(host, str) {
		const h = String(host || "").toLowerCase();
		if (!h) return [];
		const rules = parseRules(str)
			.filter((entry) => ruleMatchesHost(entry.rule, h))
			.map((entry) => entry.rule);
		return [...new Set(rules)];
	}

	function addRule(str, host) {
		const base = String(str || "").trim();
		const rule = normalizeRule(host);
		if (!rule || parseRules(base).some((entry) => entry.rule === rule)) return base;
		return base ? `${base}\n${rule}` : rule;
	}

	function removeMatchingRules(str, host) {
		const h = String(host || "").toLowerCase();
		return String(str || "")
			.split(/[\r\n,]+/)
			.map((raw) => raw.trim())
			.filter(Boolean)
			.filter((raw) => !ruleMatchesHost(normalizeRule(raw), h))
			.join("\n");
	}

	const CC_SECOND_LEVEL = new Set(["co", "com", "org", "net", "gov", "edu", "ac", "or", "ne", "go"]);

	const SHARED_SUFFIXES = [
		"github.io",
		"gitlab.io",
		"blogspot.com",
		"herokuapp.com",
		"netlify.app",
		"vercel.app",
		"pages.dev",
		"workers.dev",
		"web.app",
		"firebaseapp.com",
		"appspot.com",
		"azurewebsites.net",
		"myshopify.com",
		"wordpress.com",
		"tumblr.com",
		"onrender.com",
		"fly.dev"
	];

	function getRegistrableDomain(host) {
		const h = String(host || "").toLowerCase().replace(/\.$/, "");
		if (!h || h.includes(":") || !h.includes(".") || /^\d+(\.\d+){3}$/.test(h)) return "";

		const labels = h.split(".");
		const shared = SHARED_SUFFIXES.find((suffix) => h === suffix || h.endsWith(`.${suffix}`));
		if (shared) {
			const keep = shared.split(".").length + 1;
			return labels.length <= keep ? h : labels.slice(-keep).join(".");
		}

		const last = labels[labels.length - 1];
		const second = labels[labels.length - 2];
		const keep = last.length === 2 && CC_SECOND_LEVEL.has(second) && labels.length >= 3 ? 3 : 2;
		return labels.length <= keep ? h : labels.slice(-keep).join(".");
	}

	function isPrivateHost(hostname) {
		const h = String(hostname || "").toLowerCase().replace(/^\[|\]$/g, "");
		if (!h) return true;
		if (h.includes(":")) {
			return h === "::1" || h === "::" || /^f[cd][0-9a-f]{2}:/.test(h) || /^fe[89ab][0-9a-f]:/.test(h) || h.startsWith("::ffff:");
		}
		if (!h.includes(".")) return true;
		if (h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".lan") || h.endsWith(".home.arpa")) {
			return true;
		}

		const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
		if (!v4) return false;
		const a = Number(v4[1]);
		const b = Number(v4[2]);
		const c = Number(v4[3]);
		return (
			a === 0 ||
			a === 10 ||
			a === 127 ||
			a >= 224 ||
			(a === 100 && b >= 64 && b <= 127) ||
			(a === 169 && b === 254) ||
			(a === 172 && b >= 16 && b <= 31) ||
			(a === 192 && b === 0 && c === 0) ||
			(a === 192 && b === 168) ||
			(a === 198 && (b === 18 || b === 19))
		);
	}

	function parseSafeHttpUrl(raw, baseUri, pageUrl) {
		if (typeof raw !== "string") return null;
		const trimmed = raw.trim();
		if (!trimmed || trimmed.length > 4096) return null;

		let u;
		let page;
		try {
			u = new URL(trimmed, baseUri);
			page = new URL(pageUrl);
		} catch {
			return null;
		}

		if (u.protocol !== "http:" && u.protocol !== "https:") return null;
		if (u.username || u.password) return null;
		if (page.protocol === "https:" && u.protocol === "http:") return null;
		if (u.origin !== page.origin && isPrivateHost(u.hostname) && !isPrivateHost(page.hostname)) return null;
		return u;
	}

	function hasImageExtension(url) {
		return IMAGE_EXT_RE.test(url.pathname);
	}

	function isHexColor(value) {
		return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
	}

	function hexToRgba(hex, alpha) {
		const n = isHexColor(hex) ? parseInt(hex.slice(1), 16) : 0;
		return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
	}

	function readableTextColor(hex) {
		const n = isHexColor(hex) ? parseInt(hex.slice(1), 16) : 0;
		const lin = (c) => {
			const v = c / 255;
			return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
		};
		const lum = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
		return 1.05 / (lum + 0.05) >= (lum + 0.05) / 0.05 ? "#ffffff" : "#000000";
	}

	root.ZDShared = Object.freeze({
		hostFromUrl,
		normalizeRule,
		parseRules,
		isExcluded,
		findMatchingRules,
		addRule,
		removeMatchingRules,
		getRegistrableDomain,
		isPrivateHost,
		parseSafeHttpUrl,
		hasImageExtension,
		isHexColor,
		hexToRgba,
		readableTextColor
	});
})(globalThis);
