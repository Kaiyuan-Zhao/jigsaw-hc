import { htmlToElement } from './lib/dom'
type DocPage = {
	id: string
	title: string
	description: string
	category: string
	content: string
}

const DOC_PAGES: DocPage[] = [
	{
		id: 'solve-crediting',
		title: 'Solve Crediting',
		description: 'How to track and credit puzzle solves reliably.',
		category: 'Guides',
		content: `
			<h1>Solve Crediting</h1>
			<p class="j-docs-lead">Use this guide to make sure every valid solve gets credited to the right puzzle and the right solver.</p>

			<h2>What solve crediting means</h2>
			<p>Solve crediting is the process that records a completed solve in Jigsaw. A correct integration should:</p>
			<ul>
				<li>uniquely identify the puzzle that was solved</li>
				<li>associate the solve with the authenticated user</li>
				<li>ignore duplicate solve submissions from the same player</li>
				<li>keep your puzzle logic private while still reporting completion</li>
			</ul>

			<h2>Recommended flow</h2>
			<ol>
				<li>Host your puzzle on your own domain.</li>
				<li>Detect your puzzle’s “win state” in client code.</li>
				<li>Call your backend endpoint to submit the solve event.</li>
				<li>Your backend validates the request and forwards a signed solve credit to Jigsaw.</li>
			</ol>

			<h2>Client-side trigger example</h2>
			<pre class="j-docs-code"><code>async function onPuzzleSolved() {
  await fetch('/api/solve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ puzzleId: 'color-cipher-v1' })
  })
}</code></pre>

			<h2>Backend validation checklist</h2>
			<ul>
				<li>verify the user session before recording anything</li>
				<li>validate the puzzle ID against your allowlist</li>
				<li>enforce idempotency so a user only gets credited once per puzzle</li>
				<li>log each accepted solve with timestamp and request metadata</li>
			</ul>

			<h2>Common mistakes</h2>
			<ul>
				<li><strong>Client-only trust:</strong> never trust a raw browser request as final proof of solve.</li>
				<li><strong>No replay protection:</strong> solve endpoints without dedupe can be spammed.</li>
				<li><strong>Weak puzzle IDs:</strong> use stable unique IDs, not mutable display names.</li>
			</ul>
		`,
	},
	{
		id: 'good-puzzle-design',
		title: 'Good Puzzle Design',
		description: 'Principles for making puzzles clear, fair, and fun.',
		category: 'Principles',
		content: `
			<h1>Good Puzzle Design</h1>
			<p class="j-docs-lead">A great puzzle feels difficult but fair. Players should feel clever when they solve it, not confused by unclear rules.</p>

			<h2>Core principles</h2>
			<ul>
				<li><strong>Clarity first:</strong> players should understand the objective quickly.</li>
				<li><strong>One main leap:</strong> center each puzzle around a key insight.</li>
				<li><strong>Progressive hinting:</strong> provide layered hints that preserve challenge.</li>
				<li><strong>Respect player time:</strong> remove repetitive or low-signal steps.</li>
			</ul>

			<h2>Good difficulty design</h2>
			<p>Difficulty should come from reasoning, not obscurity. Prefer constraints that guide thought over hidden rules that punish exploration.</p>
			<ul>
				<li>Start with a discoverable entry point.</li>
				<li>Escalate with intentional complexity, not randomness.</li>
				<li>Test with new players and watch where they stall.</li>
			</ul>

			<h2>Interactive puzzle patterns</h2>
			<ul>
				<li>stateful UI puzzles with visible feedback loops</li>
				<li>signal decoding challenges with partial clues</li>
				<li>multi-step web mysteries where each solve unlocks context</li>
			</ul>

			<h2>Design anti-patterns</h2>
			<ul>
				<li>pixel hunting without clueing</li>
				<li>solutions requiring random brute force</li>
				<li>external knowledge that is never hinted in-game</li>
				<li>ambiguous “correct answers” with no deterministic check</li>
			</ul>

			<h2>Pre-launch checklist</h2>
			<ol>
				<li>Can a first-time player explain the objective in one sentence?</li>
				<li>Does each step produce meaningful feedback?</li>
				<li>Can the final answer be validated deterministically?</li>
				<li>Is solve crediting wired and tested end-to-end?</li>
			</ol>
		`,
	},
]

function getCurrentDocId(pathname: string): string {
	const slug = pathname.replace(/^\/docs\/?/, '').replace(/\/$/, '')
	return slug || 'solve-crediting'
}

export function initDocs(root: HTMLElement): void {
	const activeId = getCurrentDocId(window.location.pathname)
	const index = Math.max(0, DOC_PAGES.findIndex((page) => page.id === activeId))
	const selectedPage = DOC_PAGES[index]
	const prev = index > 0 ? DOC_PAGES[index - 1] : null
	const next = index < DOC_PAGES.length - 1 ? DOC_PAGES[index + 1] : null

	const sidebarItems = DOC_PAGES.map((page) => {
		const isActive = page.id === selectedPage.id
		return `
			<a class="j-docs-nav-link ${isActive ? 'is-active' : ''}" href="/docs/${page.id}">
				<span class="j-docs-nav-title">${page.title}</span>
				<span class="j-docs-nav-desc">${page.description}</span>
			</a>
		`
	}).join('')

	root.innerHTML = ''
	root.appendChild(
		htmlToElement(`
			<section class="j-docs-page">
				<div class="j-docs-shell">
					<aside class="j-docs-sidebar">
						<div class="j-docs-sidebar-inner">
							<p class="j-docs-sidebar-label">Jigsaw Docs</p>
							<nav class="j-docs-nav" aria-label="Documentation navigation">
								${sidebarItems}
							</nav>
						</div>
					</aside>

					<main class="j-docs-content">
						<div class="j-docs-breadcrumbs" aria-label="Breadcrumb">
							<a href="/docs/solve-crediting">Docs</a>
							<span>/</span>
							<span>${selectedPage.category}</span>
						</div>
						<article class="j-docs-article">
							${selectedPage.content}
						</article>
						<div class="j-docs-pagination">
							${prev ? `<a class="j-docs-page-link" href="/docs/${prev.id}">Previous: ${prev.title}</a>` : '<span></span>'}
							${next ? `<a class="j-docs-page-link" href="/docs/${next.id}">Next: ${next.title}</a>` : '<span></span>'}
						</div>
					</main>
				</div>
			</section>
		`)
	)
}
