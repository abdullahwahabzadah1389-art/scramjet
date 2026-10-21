import { viteStaticCopy } from "vite-plugin-static-copy";

// The browser transport needs to reach the wisp server from whatever origin
// the app is served on (public preview URLs cannot reach the dedicated wisp
// port directly), so proxy websocket upgrades for /wisp/ to the local server.
const wispPort = Number(process.env.WISP_PORT || 4142);

export default {
	server: {
		proxy: {
			"/wisp/": {
				target: `ws://127.0.0.1:${wispPort}`,
				ws: true,
			},
		},
	},
	plugins: [
		viteStaticCopy({
			structured: false,
			targets: [
				{
					src: "node_modules/@mercuryworkshop/scramjet/dist/*",
					dest: "scramjet",
				},
				{
					src: "node_modules/@mercuryworkshop/scramjet-controller/dist/*",
					dest: "controller",
				},
			],
			watch: {
				reloadPageOnChange: true,
			},
		}),
	],
};
