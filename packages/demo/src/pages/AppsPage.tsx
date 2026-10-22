import { css, type Component } from "dreamland/core";

export type AppShortcut = {
	name: string;
	url: string;
	// Optional bundled icon (files in packages/demo/public/icons/). When set,
	// it is used instead of the CDN favicon lookup.
	icon?: string;
};

export type AppSection = {
	title: string;
	apps: AppShortcut[];
};

// Static launcher data only. Shortcuts are opened by App.tsx through the
// existing browser frame (controller + wisp transport + scramjet rewriting),
// so nothing here talks to the network or touches proxy/flag configuration.
export const APP_SECTIONS: AppSection[] = [
	{
		title: "Custom Apps & Links",
		apps: [
			{
				name: "GAMES!",
				url: "https://playobsidian.com",
				icon: "icons/games.svg",
			},
			// hianime.at is an alternate mirror of the same site.
			{
				name: "HiAnime",
				url: "https://hianime.to",
			},
			{
				name: "AniWatch",
				url: "https://aniwatch.ai.studio/",
				icon: "icons/aniwatch.png",
			},
			{
				name: "Geometry Dash",
				url: "https://web-dashers.github.io/",
				icon: "icons/geometry-dash.png",
			},
			{ name: "Cloud Moon", url: "https://web.cloudmoonapp.com/" },
			{ name: "Kazwire", url: "https://kazwire.com/" },
		],
	},
	{
		title: "Popular Apps",
		apps: [
			{ name: "Discord", url: "https://discord.com" },
			{ name: "ChatGPT", url: "https://chatgpt.com" },
			{ name: "Google Gemini", url: "https://gemini.google.com" },
			{ name: "YouTube", url: "https://youtube.com" },
			{ name: "Anime Stream / Movie Player", url: "https://fmoviesz.to" },
			{ name: "GeForce NOW / Gaming", url: "https://play.geforcenow.com" },
			{ name: "X (Twitter)", url: "https://x.com" },
			{ name: "Instagram", url: "https://instagram.com" },
			{ name: "Reddit", url: "https://reddit.com" },
			{ name: "Twitch", url: "https://twitch.tv" },
			{ name: "TikTok", url: "https://tiktok.com" },
			{ name: "Spotify", url: "https://open.spotify.com" },
		],
	},
];

// Reliable CDN favicon service (SVG/PNG per site, sz=128 for crisp tiles).
export function faviconFor(url: string) {
	let host = url;
	try {
		host = new URL(url).host;
	} catch {
		// keep raw value; the service also accepts full URLs
	}
	return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
		host
	)}&sz=128`;
}

function hostOf(url: string) {
	try {
		return new URL(url).host.replace(/^www\./, "");
	} catch {
		return url;
	}
}

const AppsView: Component<
	{
		launch: (url: string) => void;
	},
	{},
	{}
> = function () {
	return (
		<div class="apps-view">
			<div class="apps-header">
				<h2>Apps</h2>
				<p>
					Shortcuts open in the Browser tab and load through the active
					Scramjet transport (wisp + URL rewriting) — the same proxied
					navigation path as typing into the omnibox.
				</p>
			</div>
			{APP_SECTIONS.map((section) => (
				<section class="apps-section">
					<h3 class="apps-section-title">{section.title}</h3>
					<div class="apps-grid">
						{section.apps.map((app) => (
							<button
								type="button"
								class="app-tile"
								on:click={() => this.launch(app.url)}
							>
								<span class="app-icon">
									<span class="app-icon-fallback">{app.name.charAt(0)}</span>
									<img
										src={app.icon ?? faviconFor(app.url)}
										alt=""
										width="26"
										height="26"
										loading="lazy"
										on:error={(e: Event) => {
											const img = e.target as HTMLImageElement;
											img.style.display = "none";
											const fallback =
												img.previousElementSibling as HTMLElement | null;
											if (fallback) fallback.style.display = "flex";
										}}
									/>
								</span>
								<span class="app-name">{app.name}</span>
								<span class="app-host">{hostOf(app.url)}</span>
							</button>
						))}
					</div>
				</section>
			))}
		</div>
	);
};

AppsView.style = css`
	:scope {
		display: block;
		flex: 1;
		min-width: 0;
		min-height: 0;
		padding: 16px;
		background: #0f0f0f;
		color: #e5e7eb;
		overflow: auto;
		font-family:
			system-ui,
			-apple-system,
			"Segoe UI",
			sans-serif;
		box-sizing: border-box;
	}

	.apps-header {
		margin-bottom: 16px;
		padding-bottom: 12px;
		border-bottom: 1px solid #222;
	}

	.apps-header h2 {
		margin: 0 0 6px;
		font-size: 1rem;
		font-weight: 600;
	}

	.apps-header p {
		margin: 0;
		max-width: 720px;
		color: #a8a8a8;
		line-height: 1.45;
		font-size: 0.84rem;
	}

	.apps-section + .apps-section {
		margin-top: 20px;
	}

	.apps-section-title {
		margin: 0 0 10px;
		font-size: 0.74rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #8f8f8f;
	}

	.apps-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 10px;
	}

	.app-tile {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		gap: 9px;
		padding: 16px 10px 13px;
		border: 1px solid #262626;
		border-radius: 14px;
		background: #161616;
		color: #e5e7eb;
		font: inherit;
		text-align: center;
		cursor: pointer;
		transition:
			background 130ms ease,
			border-color 130ms ease,
			transform 130ms ease,
			box-shadow 130ms ease;
	}

	.app-tile:hover {
		background: #1e1e1e;
		border-color: #4d4d4d;
		transform: translateY(-2px);
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
	}

	.app-tile:active {
		transform: translateY(0);
		box-shadow: none;
	}

	.app-tile:focus-visible {
		outline: none;
		border-color: #6a6a6a;
	}

	.app-icon {
		position: relative;
		width: 42px;
		height: 42px;
		border-radius: 12px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		background: #f4f4f5;
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
	}

	.app-icon img {
		position: relative;
		width: 26px;
		height: 26px;
		object-fit: contain;
		display: block;
	}

	.app-icon-fallback {
		position: absolute;
		inset: 0;
		display: none;
		align-items: center;
		justify-content: center;
		font-size: 18px;
		font-weight: 700;
		color: #3f3f46;
		background: #e4e4e7;
	}

	.app-name {
		max-width: 100%;
		font-size: 0.84rem;
		font-weight: 600;
		line-height: 1.25;
		color: #e5e7eb;
		overflow-wrap: anywhere;
	}

	.app-host {
		max-width: 100%;
		font-size: 0.68rem;
		color: #6f7680;
		overflow-wrap: anywhere;
	}
`;

export default AppsView;
