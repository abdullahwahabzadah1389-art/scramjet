import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { stdout } from "node:process";
import { execSync } from "node:child_process";
import http from "node:http";
import zlib from "node:zlib";
import chalk from "chalk";
import { createServer } from "vite";
//@ts-expect-error no typedefs
import { server as wisp } from "@mercuryworkshop/wisp-js/server";
import {
	normalizeWebsocketUrl,
	warnOnUrlEscape,
	runRspack,
	black,
	printBanner,
} from "./devlib.ts";
import rspackConfig from "./rspack.config.ts";

const image = await fs.readFile("./assets/scramjet-mini-noalpha.png");

const commit = execSync("git rev-parse --short HEAD", {
	encoding: "utf-8",
}).replace(/\r?\n|\r/g, "");
const branch = execSync("git rev-parse --abbrev-ref HEAD", {
	encoding: "utf-8",
}).replace(/\r?\n|\r/g, "");
const packagejson = JSON.parse(await fs.readFile("./package.json", "utf-8"));
const version = packagejson.version;

// Default port 4141 (never 8080, so it won't collide with other proxies on
// the same machine). Override with DEMO_PORT=5000 (or PORT) without editing
// any files.
const DEMO_PORT =
	process.env.PORT || process.env.DEMO_PORT || 4141;
const WISP_PORT = process.env.WISP_PORT || 4142;

if (process.env.VITE_WISP_URL) {
	process.env.VITE_WISP_URL = normalizeWebsocketUrl(process.env.VITE_WISP_URL);
}
// Without an explicit override, the demo derives its wisp URL from the page
// origin and the Vite dev server proxies /wisp/ to the wisp server below,
// so remote preview URLs (where localhost:4142 is the visitor's machine) work.

const wispserver = http.createServer((req, res) => {
	res.writeHead(200, { "Content-Type": "text/plain" });
	res.end("wisp server js rewrite");
});
wisp.options.allow_private_ips = true;
wisp.options.allow_loopback_ips = true;

wispserver.on("upgrade", (req, socket, head) => {
	wisp.routeRequest(req, socket, head);
});

// Loopback only: the browser reaches wisp through the Vite /wisp/ proxy on
// the main port, so listening on 0.0.0.0 would just publish an open TCP
// relay on the LAN when self-hosting.
wispserver.listen(Number(WISP_PORT), "127.0.0.1");

const server = await createServer({
	configFile: "./packages/demo/vite.config.ts",
	root: "./packages/demo",
	server: {
		host: "0.0.0.0",
		port: Number(DEMO_PORT),
		strictPort: true,
	},
});

warnOnUrlEscape(server);

// The dev server serves large bundles (scramjet + monaco + transports) that
// cross the network uncompressed otherwise. Gzip GET responses for text-like
// assets; bytes are identical after decoding, so service worker caching,
// scramjet proxying and websocket upgrades are unaffected.
const COMPRESSIBLE_PATH =
	/^\/$|\.(m?js|cjs|jsx|tsx?|css|json|map|html|svg|txt)([?#]|$)/;

function compressionMiddleware(
	req: http.IncomingMessage,
	res: http.ServerResponse,
	next: (err?: unknown) => void
) {
	const accept = String(req.headers["accept-encoding"] ?? "");
	const path = (req.url ?? "").split("?")[0] ?? "";
	if (
		req.method !== "GET" ||
		!accept.includes("gzip") ||
		/\bupgrade\b/i.test(String(req.headers.connection ?? "")) ||
		!COMPRESSIBLE_PATH.test(path)
	) {
		return next();
	}

	const gzip = zlib.createGzip();
	const writeHead = res.writeHead.bind(res);
	const write = res.write.bind(res);
	const end = res.end.bind(res);
	let started = false;
	let passthrough = false;

	const start = () => {
		if (started || passthrough) return;
		started = true;
		res.removeHeader("content-length");
		res.setHeader("content-encoding", "gzip");
		res.setHeader("vary", "Accept-Encoding");
		gzip.on("data", (chunk: Buffer) => write(chunk));
		gzip.on("end", () => end());
		gzip.on("error", (err: Error) => {
			console.error("[gzip]", req.url, err.message);
			try {
				res.destroy();
			} catch {}
		});
	};

	res.writeHead = ((statusOrCode: number, ...rest: any[]) => {
		// 204/304 have no body; don't mark them as gzipped
		if (statusOrCode === 204 || statusOrCode === 304) passthrough = true;
		else start();
		// writeHead's explicit headers override setHeader values, so strip
		// stale content-length/content-encoding from them as well
		for (let i = 0; i < rest.length; i++) {
			const h = rest[i];
			if (h && typeof h === "object" && !Array.isArray(h)) {
				const rec = h as Record<string, unknown>;
				for (const k of Object.keys(rec)) {
					if (k.toLowerCase() === "content-length" && !passthrough)
						delete rec[k];
				}
			}
		}
		return writeHead(statusOrCode, ...rest);
	}) as typeof res.writeHead;

	res.write = ((chunk: any, ...args: any[]) => {
		if (passthrough) return write(chunk, ...args);
		start();
		// accept everything: producers like fs streams wait for a 'drain'
		// on the response object that would never fire for the gzip buffer
		(gzip.write as any)(chunk, ...args);
		return true;
	}) as typeof res.write;

	res.end = ((chunk?: any, ...args: any[]) => {
		if (passthrough) return end(chunk, ...args);
		start();
		(gzip.end as any)(chunk, ...args);
		return res;
	}) as typeof res.end;

	next();
}

server.middlewares.stack.unshift({
	route: "",
	handle: compressionMiddleware,
});

await server.listen();

const accent = (text: string) => chalk.hex("#f1855bff").bold(text);
const highlight = (text: string) => chalk.hex("#fdd76cff").bold(text);
const urlColor = (text: string) => chalk.hex("#64DFDF").underline(text);
const note = (text: string) => chalk.hex("#CDB4DB")(text);
const connector = chalk.hex("#8D99AE").dim("@");

const lines = [
	black()(`${highlight("SCRAMJET DEV SERVER")}`),
	black()(
		`${accent("demo")} ${connector} ${urlColor(
			`http://localhost:${DEMO_PORT}/`
		)}`
	),
	black()(
		`${accent("wisp")} ${connector} ${urlColor(
			process.env.VITE_WISP_URL ??
				`same-origin /wisp/ (ws://localhost:${WISP_PORT}/)`
		)}`
	),
	black()(chalk.dim(`[${branch}] ${commit} scramjet/${version}`)),
];

runRspack(rspackConfig);

printBanner(image, lines);
