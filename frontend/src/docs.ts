import { API_BASE_URL } from './config'

type DocSlug = 'index' | 'solve-crediting' | 'puzzle-design'

const PATH_BY_SLUG: Record<DocSlug, string> = {
	index: '/docs',
	'solve-crediting': '/docs/solve-crediting',
	'puzzle-design': '/docs/puzzle-design',
}

const SLUG_BY_PATH = new Map<string, DocSlug>([
	['/docs', 'index'],
	['/docs/solve-crediting', 'solve-crediting'],
	['/docs/puzzle-design', 'puzzle-design'],
])

const NAV: { slug: DocSlug; label: string; description: string }[] = [
	{ slug: 'index', label: 'Overview', description: 'What lives in this guide' },
	{ slug: 'solve-crediting', label: 'Solve crediting', description: 'Coins, SDK, and one-time claims' },
	{ slug: 'puzzle-design', label: 'Puzzle design', description: 'Make fair, fun experiences' },
]

function pathFromSlug(slug: DocSlug): string {
	return PATH_BY_SLUG[slug]
}

function normalizeDocPath(pathname: string): string {
	const trimmed = pathname.replace(/\/$/, '') || '/docs'
	return trimmed === '/' ? '/docs' : trimmed
}

function slugFromPath(pathname: string): DocSlug {
	return SLUG_BY_PATH.get(normalizeDocPath(pathname)) || 'index'
}

function el(html: string): HTMLElement {
	const d = document.createElement('div')
	d.innerHTML = html.trim()
	return d.firstElementChild as HTMLElement
}

function renderArticle(slug: DocSlug): string {
	const sdkOrigin = API_BASE_URL

	if (slug === 'index') {
		return `
			<article class="j-docs-article">
				<h1 class="j-docs-h1">Documentation</h1>
				<p class="j-docs-lead">
					Guides for puzzle creators on Jigsaw: how solve crediting awards Arcade coins, and how to design puzzles players love.
				</p>
				<div class="j-docs-cards">
					<a class="j-docs-card" href="/docs/solve-crediting" data-docs-nav>
						<span class="j-docs-card-title">Solve crediting</span>
						<span class="j-docs-card-desc">SDK integration, claim flow, limits, and server configuration.</span>
					</a>
					<a class="j-docs-card" href="/docs/puzzle-design" data-docs-nav>
						<span class="j-docs-card-title">Puzzle design</span>
						<span class="j-docs-card-desc">Clarity, fairness, puzzle IDs, and playtesting your solve path.</span>
					</a>
				</div>
			</article>
		`
	}

	if (slug === 'solve-crediting') {
		return `
			<article class="j-docs-article">
				<h1 class="j-docs-h1">Solve crediting</h1>
				<p class="j-docs-lead">
					When a player finishes your puzzle, you can credit their solve once per puzzle version. Rewards are tracked as <strong>Arcade coins</strong> on their Jigsaw account.
				</p>

				<h2 class="j-docs-h2">What players get</h2>
				<ul class="j-docs-list">
					<li><strong>10 coins</strong> per successful claim (server default).</li>
					<li><strong>One claim per player per <code class="j-docs-code">puzzleId</code></strong> — changing the ID lets you ship a new version with a fresh reward window.</li>
					<li>Claims are recorded in the server ledger (<code class="j-docs-code">puzzleClaims</code> and grant history) so repeats are rejected with <em>Puzzle reward already claimed</em>.</li>
				</ul>

				<h2 class="j-docs-h2">Third-party sites: <code class="j-docs-code">sdk.js</code></h2>
				<p class="j-docs-p">
					Host your puzzle anywhere allowlisted. The script loads from the Jigsaw API origin so crediting does not depend on third-party cookies on your domain.
				</p>
				<ol class="j-docs-list j-docs-list-ol">
					<li>Player clicks your win button (or you call <code class="j-docs-code">JigsawGames.claim()</code>).</li>
					<li>A popup opens on the API origin; the player signs in with Hack Club if needed.</li>
					<li>The opener receives a short-lived <strong>claim token</strong> via <code class="j-docs-code">postMessage</code>.</li>
					<li>The SDK POSTs to <code class="j-docs-code">${sdkOrigin}/games/redeem-token</code> with the token and your <code class="j-docs-code">puzzleId</code>. The server verifies the token audience matches your page origin, credits coins, then redirects (default: Arcade).</li>
				</ol>

				<h3 class="j-docs-h3">Drop-in button</h3>
				<pre class="j-docs-pre" role="region" aria-label="Example HTML"><code>&lt;script src="${sdkOrigin}/games/sdk.js" defer&gt;&lt;/script&gt;
&lt;button
  data-jigsaw-win
  data-puzzle-id="my-puzzle-v1"
  data-redirect-url="https://yoursite.com/arcade"
  data-status-target="#reward-status"
&gt;
  Claim reward
&lt;/button&gt;
&lt;p id="reward-status" aria-live="polite"&gt;&lt;/p&gt;</code></pre>
				<dl class="j-docs-dl">
					<dt><code class="j-docs-code">data-jigsaw-win</code></dt>
					<dd>Marks the control as the reward trigger.</dd>
					<dt><code class="j-docs-code">data-puzzle-id</code> (required)</dt>
					<dd>Stable ID for this puzzle revision (e.g. <code class="j-docs-code">my-game-v2</code>).</dd>
					<dt><code class="j-docs-code">data-redirect-url</code></dt>
					<dd>After success, where to send the player (defaults to the configured Arcade URL).</dd>
					<dt><code class="j-docs-code">data-status-target</code></dt>
					<dd>Optional CSS selector for status messages (authenticating, success, errors).</dd>
				</dl>

				<h3 class="j-docs-h3">Programmatic claim</h3>
				<pre class="j-docs-pre" role="region" aria-label="Example JavaScript"><code>await window.JigsawGames.claim({
  puzzleId: 'my-puzzle-v1',
  redirectUrl: 'https://yoursite.com/arcade',
  statusEl: document.querySelector('#reward-status'),
})</code></pre>

				<h2 class="j-docs-h2">Operator checklist (backend)</h2>
				<ul class="j-docs-list">
					<li>Add every puzzle origin to <code class="j-docs-code">GAME_ALLOWED_ORIGINS</code> (comma-separated). CORS and the claim popup both use this list.</li>
					<li>Set <code class="j-docs-code">CLAIM_TOKEN_SECRET</code> to a long random value in production (defaults to session secret only for dev).</li>
					<li>Optional: <code class="j-docs-code">CLAIM_TOKEN_TTL_SECONDS</code> (default 180) — how long the signed token remains valid.</li>
					<li>Ensure <code class="j-docs-code">FRONTEND_URL</code> matches your Jigsaw web app for OAuth return URLs.</li>
				</ul>

				<h2 class="j-docs-h2">Common errors</h2>
				<ul class="j-docs-list">
					<li><strong>Popup blocked</strong> — ask players to allow popups for your site.</li>
					<li><strong>Origin not allowed</strong> / <strong>Origin mismatch</strong> — origin missing from <code class="j-docs-code">GAME_ALLOWED_ORIGINS</code> or token audience does not match the requesting page.</li>
					<li><strong>Puzzle reward already claimed</strong> — that account already claimed this <code class="j-docs-code">puzzleId</code>.</li>
					<li><strong>Invalid or expired token</strong> / <strong>Token already used</strong> — retry with a fresh solve flow; tokens are single-use.</li>
				</ul>

				<h2 class="j-docs-h2">Ledger (reference)</h2>
				<p class="j-docs-p">
					Persistent file <code class="j-docs-code">backend/data/coin-ledger.json</code> stores balances, grant audit rows (including reasons like <code class="j-docs-code">Puzzle reward:your-id</code>), and dedupe keys <code class="j-docs-code">userId:puzzleId</code>.
				</p>
			</article>
		`
	}

	return `
		<article class="j-docs-article">
			<h1 class="j-docs-h1">Good puzzle design</h1>
			<p class="j-docs-lead">
				Jigsaw welcomes weird, creative ideas. These practices help players feel respected and keep solve crediting trustworthy.
			</p>

			<h2 class="j-docs-h2">Make the goal obvious</h2>
			<p class="j-docs-p">
				Players should understand what “solved” means without reading your mind. A clear win moment — message, animation, or state change — reduces confusion and support burden.
			</p>

			<h2 class="j-docs-h2">Keep it fair</h2>
			<ul class="j-docs-list">
				<li>Avoid ultra-tiny click targets, unreadable text, and “guess what I’m thinking” leaps.</li>
				<li>If something is hidden, leave fair clues; pixel hunts and brute-force gates frustrate players.</li>
				<li>Test on a small screen and with keyboard-only input if your puzzle allows it.</li>
			</ul>

			<h2 class="j-docs-h2">Stable <code class="j-docs-code">puzzleId</code> discipline</h2>
			<p class="j-docs-p">
				Each ID should map to one rewardable edition. Bump the ID when you materially change the solve (e.g. <code class="j-docs-code">riddle-run-v1</code> → <code class="j-docs-code">riddle-run-v2</code>) so veterans can earn the new version without breaking accounting for the old one.
			</p>

			<h2 class="j-docs-h2">Test the full claim path</h2>
			<ul class="j-docs-list">
				<li>Run through login, popup, and redirect on the same origin you will ship.</li>
				<li>Confirm your domain appears in <code class="j-docs-code">GAME_ALLOWED_ORIGINS</code> before launch.</li>
				<li>Try claiming twice with the same account to verify the duplicate message appears and no double credit occurs.</li>
			</ul>

			<h2 class="j-docs-h2">Arcade listing</h2>
			<p class="j-docs-p">
				Your thumbnail and blurb are the promise of the puzzle. Avoid spoiling the aha; do show tone and difficulty. Honest descriptions build trust and better retention.
			</p>

			<h2 class="j-docs-h2">Accessibility and comfort</h2>
			<ul class="j-docs-list">
				<li>Prefer sufficient contrast and legible type sizes.</li>
				<li>Warn for motion, sound, or flashing if your experience uses them intensely.</li>
				<li>Offer a way to recover from mistakes (undo, reset) when feasible.</li>
			</ul>
		</article>
	`
}

function updateNavActive(sidebar: HTMLElement, slug: DocSlug): void {
	sidebar.querySelectorAll('.j-docs-side-link').forEach((node) => {
		const link = node as HTMLAnchorElement
		const isActive = link.dataset.slug === slug
		link.classList.toggle('is-active', isActive)
		if (isActive) link.setAttribute('aria-current', 'page')
		else link.removeAttribute('aria-current')
	})
}

function navigate(slug: DocSlug, sidebar: HTMLElement, main: HTMLElement, push: boolean): void {
	const path = pathFromSlug(slug)
	if (push && window.location.pathname !== path) {
		history.pushState({ docSlug: slug }, '', path)
	}
	document.title = slug === 'index' ? 'Docs · Jigsaw' : `${NAV.find((n) => n.slug === slug)?.label || 'Docs'} · Jigsaw`
	main.innerHTML = renderArticle(slug)
	updateNavActive(sidebar, slug)
}

export function initDocs(root: HTMLElement): void {
	const initialSlug = slugFromPath(window.location.pathname)

	const layout = el(`
		<div class="j-docs-shell">
			<aside class="j-docs-sidebar" aria-label="Documentation">
				<div class="j-docs-sidebar-head">
					<a class="j-docs-sidebar-brand" href="/docs" data-docs-nav>Docs</a>
					<p class="j-docs-sidebar-tagline">Creators</p>
				</div>
				<nav class="j-docs-side-nav" aria-label="Guide sections">
					${NAV.map(
						(item) => `
						<a
							class="j-docs-side-link"
							href="${PATH_BY_SLUG[item.slug]}"
							data-docs-nav
							data-slug="${item.slug}"
						>
							<span class="j-docs-side-label">${item.label}</span>
							<span class="j-docs-side-meta">${item.description}</span>
						</a>
					`
					).join('')}
				</nav>
			</aside>
			<div class="j-docs-main-wrap">
				<main class="j-docs-main" id="docs-main"></main>
				<footer class="j-docs-footer">
					<a class="j-docs-footer-link" href="/">← Jigsaw home</a>
					<a class="j-docs-footer-link" href="/arcade">Arcade →</a>
				</footer>
			</div>
		</div>
	`)

	const sidebar = layout.querySelector<HTMLElement>('.j-docs-sidebar')!
	const main = layout.querySelector<HTMLElement>('.j-docs-main')!

	root.appendChild(layout)

	navigate(initialSlug, sidebar, main, false)

	const onNavClick = (event: MouseEvent): void => {
		const target = (event.target as HTMLElement).closest<HTMLAnchorElement>('[data-docs-nav]')
		if (!target || !target.href) return
		const url = new URL(target.href)
		if (url.origin !== window.location.origin) return
		const p = normalizeDocPath(url.pathname)
		if (!SLUG_BY_PATH.has(p)) return
		event.preventDefault()
		navigate(slugFromPath(p), sidebar, main, true)
	}

	layout.addEventListener('click', onNavClick)

	window.addEventListener('popstate', () => {
		navigate(slugFromPath(window.location.pathname), sidebar, main, false)
	})
}
