import { createStore } from "dreamland/core";

export type AvailableTransports = "libcurl" | "epoxy";

export const AVAILABLE_TRANSPORTS: ReadonlyArray<{
	value: AvailableTransports;
	label: string;
}> = [
	{ value: "libcurl", label: "Libcurl" },
	{ value: "epoxy", label: "Epoxy" },
];
const ENV_WISP_URL = import.meta.env.VITE_WISP_URL;

function sameOriginWispUrl() {
	return `${location.protocol === "https:" ? "wss:" : "ws:"}//${
		location.host
	}/wisp/`;
}

function isLoopbackHostname(hostname: string) {
	return (
		hostname === "localhost" ||
		hostname === "127.0.0.1" ||
		hostname === "::1" ||
		hostname === "[::1]"
	);
}

const DEFAULT_WISP_URL = ENV_WISP_URL || sameOriginWispUrl();
const DEFAULT_TRANSPORT: AvailableTransports = "libcurl";
const DEFAULT_HOME_URL = "https://google.com";
const DEFAULT_MAX_REQUESTS = 200;

export const demoSettingsStore = createStore(
	{
		transport: DEFAULT_TRANSPORT as AvailableTransports,
		wispUrl: DEFAULT_WISP_URL,
		homeUrl: DEFAULT_HOME_URL,
		maxRequests: DEFAULT_MAX_REQUESTS,
	},
	{
		ident: "scramjet-demo-settings",
		backing: "localstorage",
		autosave: "auto",
	}
);

// A loopback wisp URL (e.g. ws://localhost:4142/) only works when the page is
// served from that same machine. When the app is opened through a remote
// preview/host URL, fall back to the page origin, where the dev server proxies
// /wisp/ to the local wisp server. Explicit non-loopback URLs are left alone.
try {
	const storedWisp = new URL(demoSettingsStore.wispUrl);
	if (
		isLoopbackHostname(storedWisp.hostname) &&
		!isLoopbackHostname(location.hostname)
	) {
		demoSettingsStore.wispUrl = normalizeWispUrl(sameOriginWispUrl());
	}
} catch {
	// malformed persisted value: leave it, Settings can fix it
}

export function normalizeWispUrl(value: string) {
	const trimmed = value.trim();
	if (!trimmed) {
		throw new TypeError("Wisp URL is required.");
	}

	let normalized = trimmed;
	if (!normalized.startsWith("ws://") && !normalized.startsWith("wss://")) {
		normalized = `ws://${normalized}`;
	}

	const parsed = new URL(normalized);
	if (!parsed.pathname || parsed.pathname === "") {
		parsed.pathname = "/";
	}
	if (!parsed.pathname.endsWith("/")) {
		parsed.pathname = `${parsed.pathname}/`;
	}

	return parsed.toString();
}

export function normalizeHomeUrl(value: string) {
	const trimmed = value.trim();
	if (!trimmed) {
		throw new TypeError("Home page URL is required.");
	}

	const normalized = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)
		? trimmed
		: `https://${trimmed}`;

	return new URL(normalized).toString();
}

export function normalizeTransport(value: string): AvailableTransports {
	if (AVAILABLE_TRANSPORTS.some((t) => t.value === value)) {
		return value as AvailableTransports;
	}
	throw new TypeError(`Unknown transport: ${value}`);
}

export function normalizeMaxRequests(value: string | number) {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) {
		throw new TypeError("Request log limit must be a number.");
	}

	const rounded = Math.round(parsed);
	if (rounded < 10 || rounded > 5000) {
		throw new RangeError("Request log limit must be between 10 and 5000.");
	}

	return rounded;
}

export const demoSettingsDefaults = {
	wispUrl: normalizeWispUrl(DEFAULT_WISP_URL),
	transport: DEFAULT_TRANSPORT,
	homeUrl: normalizeHomeUrl(DEFAULT_HOME_URL),
	maxRequests: DEFAULT_MAX_REQUESTS,
};
