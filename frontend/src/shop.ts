import { buildPuzzlePath, gridPieceEdges } from './puzzle-path'
import { API_BASE_URL } from './config'
import { fetchJson } from './lib/api'
import { htmlToElement } from './lib/dom'
import { PASTELS } from './lib/palette'
import { SHOP_ITEMS, buildOverlaySvg, colsForPrice, type ShopDisplayItem } from './shop-display'
import type { AuthMeResponse, ApiErrorResponse } from './types/auth'
import { puzzleSVG } from './ui/puzzle-svg'

// --- types -------------------------------------------------------------------

export type ShopItem = ShopDisplayItem

type PurchaseOkResponse = {
	success: true
	purchaseId: number
	balance: number
	itemId: string
	pricePieces: number
	title: string
}

type ShopCardRefs = {
	item: ShopItem
	card: HTMLElement
	visual: HTMLElement
	statusEl: HTMLElement
	btn: HTMLButtonElement
	maskRevealGroup: SVGGElement | null
	affordOutlineGroup: SVGGElement | null
	fillOutlineGroup: SVGGElement | null
	isUnlockAnimating: boolean
	cols: number
	cell: number
	cellOrder: Array<{ row: number; col: number }>
}

// --- constants + catalog -----------------------------------------------------

const PRICE_MIN = 180
const PRICE_MAX = 720
const PIECE_FLYER_LIMIT = 30
const SVG_NS = 'http://www.w3.org/2000/svg'

// --- pricing -----------------------------------------------------------------

function normPrice(price: number): number {
	return Math.min(1, Math.max(0, (price - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)))
}

function imageScaleForPrice(price: number): number {
	return 1 + normPrice(price) * 0.14
}

function clamp01(value: number): number {
	return Math.max(0, Math.min(1, value))
}

// --- dom ---------------------------------------------------------------------

function setPiecePill(balance: number): void {
	const pill = document.querySelector<HTMLElement>('[data-ui-hook="piece-pill"], .c-site-piece-pill')
	if (pill) pill.textContent = `🧩 ${balance}`
}

function setCardStatus(el: HTMLElement, message: string, kind: 'idle' | 'error' | 'success' | 'pending'): void {
	el.textContent = message
	el.classList.remove('is-error', 'is-success', 'is-pending')
	if (kind === 'error') el.classList.add('is-error')
	if (kind === 'success') el.classList.add('is-success')
	if (kind === 'pending') el.classList.add('is-pending')
}

async function postPurchase(itemId: string): Promise<PurchaseOkResponse> {
	try {
		const payload = await fetchJson<PurchaseOkResponse>('/shop/purchase', {
			method: 'POST',
			credentials: 'include',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ itemId }),
		})
		if (!payload.success) {
			throw new Error('Purchase failed')
		}
		return payload
	} catch (error) {
		const apiError = (error as { status?: number; payload?: ApiErrorResponse }) || {}
		if (apiError.status === 401) {
			const returnTo = encodeURIComponent(window.location.href)
			window.location.href = `${API_BASE_URL}/auth/login?returnTo=${returnTo}`
			throw new Error('Redirecting to sign in')
		}
		if (apiError.payload?.error === 'insufficient_pieces') {
			const have = typeof apiError.payload.pieces === 'number' ? apiError.payload.pieces : 0
			throw new Error(`Not enough pieces (you have ${have}).`)
		}
		if (error instanceof Error) throw error
		throw new Error('Purchase failed')
	}
}

async function fetchCurrentPieces(): Promise<number> {
	try {
		const payload = await fetchJson<AuthMeResponse>('/auth/me', {
			credentials: 'include',
		})
		if (!payload.authenticated) return 0
		return payload.user?.pieces || 0
	} catch {
		return 0
	}
}

function clearAffordOutlines(group: SVGGElement | null): void {
	if (!group) return
	while (group.firstChild) {
		group.removeChild(group.firstChild)
	}
}

function cellPathForOverlay(row: number, col: number, cols: number): string {
	const edges = gridPieceEdges(row, col, cols, cols)
	return buildPuzzlePath(edges.top, edges.right, edges.bottom, edges.left, 50)
}

function setAffordPieceOutlines(refs: ShopCardRefs, balance: number): void {
	const group = refs.affordOutlineGroup
	if (!group) return
	clearAffordOutlines(group)
	if (refs.card.classList.contains('is-unlocked')) return

	const progress = refs.isUnlockAnimating ? 1 : clamp01(balance / refs.item.pricePieces)
	const total = refs.cellOrder.length
	const outlined = Math.max(0, Math.min(total, Math.floor(progress * total)))
	if (!outlined) return

	const s = refs.cell / 100
	for (let i = 0; i < outlined; i += 1) {
		const step = refs.cellOrder[i]
		const d = cellPathForOverlay(step.row, step.col, refs.cols)
		const path = document.createElementNS(SVG_NS, 'path')
		path.setAttribute('d', d)
		path.setAttribute('transform', `translate(${step.col * refs.cell} ${step.row * refs.cell}) scale(${s})`)
		path.setAttribute('fill', 'none')
		path.setAttribute('stroke', '#86efac')
		path.setAttribute('stroke-width', '1.95')
		path.setAttribute('stroke-linejoin', 'round')
		path.setAttribute('vector-effect', 'non-scaling-stroke')
		group.appendChild(path)
	}
}

function updateAffordProgress(cards: ShopCardRefs[], balance: number): void {
	for (const refs of cards) {
		setAffordPieceOutlines(refs, balance)
	}
}

function getCellOrder(cols: number): Array<{ row: number; col: number }> {
	const order: Array<{ row: number; col: number }> = []
	for (let row = 0; row < cols; row += 1) {
		for (let col = 0; col < cols; col += 1) {
			order.push({ row, col })
		}
	}
	return order
}

function clearMaskReveal(group: SVGGElement | null): void {
	if (!group) return
	while (group.firstChild) {
		group.removeChild(group.firstChild)
	}
}

function appendFillOutline(refs: ShopCardRefs, step: { row: number; col: number }): void {
	const group = refs.fillOutlineGroup
	if (!group) return
	const cellKey = `${step.row}-${step.col}`
	if (group.querySelector(`[data-cell="${cellKey}"]`)) return
	const d = cellPathForOverlay(step.row, step.col, refs.cols)
	const s = refs.cell / 100
	const path = document.createElementNS(SVG_NS, 'path')
	path.setAttribute('data-cell', cellKey)
	path.setAttribute('d', d)
	path.setAttribute('transform', `translate(${step.col * refs.cell} ${step.row * refs.cell}) scale(${s})`)
	path.setAttribute('fill', 'none')
	path.setAttribute('stroke', '#86efac')
	path.setAttribute('stroke-width', '2.65')
	path.setAttribute('stroke-linejoin', 'round')
	path.setAttribute('vector-effect', 'non-scaling-stroke')
	group.appendChild(path)
}

function revealMaskCell(refs: ShopCardRefs, step: { row: number; col: number }): void {
	if (!refs.maskRevealGroup) return
	const d = cellPathForOverlay(step.row, step.col, refs.cols)
	const s = refs.cell / 100
	const path = document.createElementNS(SVG_NS, 'path')
	path.setAttribute('d', d)
	path.setAttribute('transform', `translate(${step.col * refs.cell} ${step.row * refs.cell}) scale(${s})`)
	path.setAttribute('fill', 'white')
	path.setAttribute('stroke', 'none')
	refs.maskRevealGroup.appendChild(path)
}

function spawnCellGlow(visual: HTMLElement, cols: number, step: { row: number; col: number }): void {
	const glow = document.createElement('span')
	glow.className = 'c-shop-cell-glow'
	glow.style.setProperty('--c-shop-cell-col', String(step.col))
	glow.style.setProperty('--c-shop-cell-row', String(step.row))
	glow.style.setProperty('--c-shop-cell-cols', String(cols))
	visual.appendChild(glow)
	window.setTimeout(() => {
		glow.remove()
	}, 520)
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => {
		window.setTimeout(resolve, ms)
	})
}

function prefersReducedMotion(): boolean {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

async function animateFlyersToCard(visual: HTMLElement, totalDurationMs: number): Promise<void> {
	const origin = document.querySelector<HTMLElement>('[data-ui-hook="piece-pill"], .c-site-piece-pill')
	if (!origin) return
	const originRect = origin.getBoundingClientRect()
	const targetRect = visual.getBoundingClientRect()
	if (!originRect.width || !targetRect.width) return

	const sx = originRect.left + originRect.width / 2
	const sy = originRect.top + originRect.height / 2
	const ex = targetRect.left + targetRect.width / 2
	const ey = targetRect.top + targetRect.height / 2
	const flyerCount = Math.min(PIECE_FLYER_LIMIT, Math.max(16, Math.round(totalDurationMs / 95)))
	const flyerDuration = Math.max(420, Math.min(760, Math.round(totalDurationMs * 0.34)))
	const spawnWindow = Math.max(1, totalDurationMs - flyerDuration)
	const animations: Array<Promise<void>> = []

	for (let i = 0; i < flyerCount; i += 1) {
		const along = 0.72 + Math.random() * 0.28
		const tx = sx + (ex - sx) * along + (Math.random() * 2 - 1) * 14
		const ty = sy + (ey - sy) * along + (Math.random() * 2 - 1) * 8
		const cx = sx + (ex - sx) * 0.48 + (Math.random() * 2 - 1) * 12
		const cy = Math.min(sy, ey) - 56 - Math.random() * 24
		const delay = Math.round((i / Math.max(1, flyerCount - 1)) * spawnWindow)

		const flyer = document.createElement('span')
		flyer.className = 'c-shop-piece-flyer'
		flyer.textContent = '🧩'
		document.body.appendChild(flyer)

		const animation = flyer.animate(
			[
				{ transform: `translate(${sx}px, ${sy}px) scale(0.86)`, opacity: 0 },
				{ transform: `translate(${cx}px, ${cy}px) scale(1.05)`, opacity: 1, offset: 0.5 },
				{ transform: `translate(${tx}px, ${ty}px) scale(0.74)`, opacity: 0.92 },
			],
			{
				duration: flyerDuration,
				delay,
				easing: 'cubic-bezier(0.2, 0.86, 0.2, 1)',
				fill: 'forwards',
			}
		)

		animations.push(
			animation.finished
				.then(() => undefined)
				.catch(() => undefined)
				.finally(() => {
					flyer.remove()
				})
		)
	}

	await Promise.all(animations)
}

async function runUnlockAnimation(refs: ShopCardRefs): Promise<void> {
	const order = refs.cellOrder
	if (!order.length) {
		refs.card.classList.add('is-unlocked')
		return
	}

	clearMaskReveal(refs.maskRevealGroup)
	refs.card.classList.remove('is-unlocked')

	if (prefersReducedMotion()) {
		for (const step of order) {
			revealMaskCell(refs, step)
			appendFillOutline(refs, step)
		}
		refs.card.classList.add('is-unlocked')
		return
	}

	const delay = Math.max(12, Math.min(80, Math.round(3000 / order.length)))
	const totalDuration = delay * order.length
	const flyPromise = animateFlyersToCard(refs.visual, totalDuration)

	for (const step of order) {
		revealMaskCell(refs, step)
		appendFillOutline(refs, step)
		spawnCellGlow(refs.visual, refs.cols, step)
		await sleep(delay)
	}

	await flyPromise
	refs.card.classList.add('is-unlocked')
}

// --- card --------------------------------------------------------------------

function buildShopCard(
	item: ShopItem,
	onPurchaseSuccess: (refs: ShopCardRefs, balance: number) => Promise<void>
): ShopCardRefs {
	const cols = colsForPrice(item.pricePieces)
	const scale = imageScaleForPrice(item.pricePieces)
	const overlay = buildOverlaySvg(item.id, item.image, cols)

	const card = htmlToElement(`
		<article class="c-shop-card" style="--c-shop-img-scale:${scale}">
			<div class="c-shop-card-visual">
				<img class="c-shop-card-img" src="${item.image}" alt="" width="640" height="640" decoding="async" />
				<div class="c-shop-card-overlay" aria-hidden="true">${overlay.markup}</div>
			</div>
			<div class="c-shop-card-body">
				<h2 class="c-shop-card-title">${item.title}</h2>
				<p class="c-shop-card-blurb">${item.blurb}</p>
				<p class="c-shop-card-status" aria-live="polite"></p>
				<div class="c-shop-card-footer">
					<p class="c-shop-card-price">
						<span class="c-shop-card-price-icon" aria-hidden="true">🧩</span>
						<span class="c-shop-card-price-value">${item.pricePieces}</span>
						<span class="sr-only">pieces</span>
					</p>
					<button type="button" class="c-shop-purchase-btn">Purchase</button>
				</div>
			</div>
		</article>
	`)

	const visual = card.querySelector<HTMLElement>('.c-shop-card-visual')
	const statusEl = card.querySelector<HTMLElement>('.c-shop-card-status')
	const btn = card.querySelector<HTMLButtonElement>('.c-shop-purchase-btn')
	const maskRevealGroup = card.querySelector<SVGGElement>(`#${overlay.maskRevealGroupId}`)
	const affordOutlineGroup = card.querySelector<SVGGElement>(`#${overlay.affordOutlineGroupId}`)
	const fillOutlineGroup = card.querySelector<SVGGElement>(`#${overlay.fillOutlineGroupId}`)
	if (!visual || !statusEl || !btn) {
		throw new Error('Shop card failed to build')
	}

	const refs: ShopCardRefs = {
		item,
		card,
		visual,
		statusEl,
		btn,
		maskRevealGroup,
		affordOutlineGroup,
		fillOutlineGroup,
		isUnlockAnimating: false,
		cols,
		cell: overlay.cell,
		cellOrder: getCellOrder(cols),
	}

	btn.addEventListener('click', async () => {
		btn.disabled = true
		setCardStatus(statusEl, 'Purchasing…', 'pending')
		try {
			const result = await postPurchase(item.id)
			setPiecePill(result.balance)
			await onPurchaseSuccess(refs, result.balance)
			setCardStatus(statusEl, 'Ordered!', 'success')
		} catch (err) {
			if (err instanceof Error && err.message === 'Redirecting to sign in') {
				setCardStatus(statusEl, '', 'idle')
				return
			}
			setCardStatus(statusEl, err instanceof Error ? err.message : 'Purchase failed', 'error')
		} finally {
			btn.disabled = false
		}
	})

	return refs
}

// --- entry -------------------------------------------------------------------

export function initShop(root: HTMLElement): void {
	const page = htmlToElement(`
		<div class="c-shop-page">
			<div class="c-shop-floater c-shop-floater-1">
				${puzzleSVG({ fill: PASTELS.blue, stroke: 'transparent', top: 'flat', right: 'tab', bottom: 'tab', left: 'flat', cls: '' })}
			</div>
			<div class="c-shop-floater c-shop-floater-2">
				${puzzleSVG({ fill: PASTELS.green, stroke: 'transparent', top: 'hole', right: 'flat', bottom: 'hole', left: 'tab', cls: '' })}
			</div>
			<div class="c-shop-floater c-shop-floater-3">
				${puzzleSVG({ fill: PASTELS.pink, stroke: 'transparent', top: 'tab', right: 'flat', bottom: 'flat', left: 'hole', cls: '' })}
			</div>
			<div class="c-shop-floater c-shop-floater-4">
				${puzzleSVG({ fill: PASTELS.blue, stroke: 'transparent', top: 'flat', right: 'tab', bottom: 'hole', left: 'flat', cls: '' })}
			</div>
			<div class="c-shop-floater c-shop-floater-5">
				${puzzleSVG({ fill: PASTELS.green, stroke: 'transparent', top: 'hole', right: 'tab', bottom: 'tab', left: 'flat', cls: '' })}
			</div>
			<header class="c-shop-head">
				<div class="c-shop-title-wrap">
					<h1 class="c-shop-title c-page-title">Shop</h1>
				</div>
			</header>
			<div class="c-shop-grid"></div>
		</div>
	`)

	const grid = page.querySelector<HTMLElement>('.c-shop-grid')
	if (!grid) {
		root.appendChild(page)
		return
	}

	const cards: ShopCardRefs[] = []
	for (const item of SHOP_ITEMS) {
		const refs = buildShopCard(item, async (cardRefs, balance) => {
			cardRefs.isUnlockAnimating = true
			updateAffordProgress(cards, balance)
			try {
				await runUnlockAnimation(cardRefs)
			} finally {
				cardRefs.isUnlockAnimating = false
				updateAffordProgress(cards, balance)
			}
		})
		cards.push(refs)
		grid.appendChild(refs.card)
	}

	root.appendChild(page)
	void (async () => {
		const pieces = await fetchCurrentPieces()
		updateAffordProgress(cards, pieces)
	})()
}
