import { buildPuzzlePath, gridPieceEdges } from './puzzle-path'

export type ShopDisplayItem = {
	id: string
	title: string
	image: string
	pricePieces: number
	blurb: string
}

const OVERLAY_VB = 320

const IMG_PUZZLEWAREHOUSE_10 = new URL('./assets/shop/puzzlewarehouse-giftcard-10.svg', import.meta.url).href
const IMG_PUZZLEWAREHOUSE_15 = new URL('./assets/shop/puzzlewarehouse-giftcard-15.svg', import.meta.url).href
const IMG_PUZZLEWAREHOUSE_25 = new URL('./assets/shop/puzzlewarehouse-giftcard-25.svg', import.meta.url).href
const IMG_STORYTELLER = new URL('./assets/shop/storyteller.jpg', import.meta.url).href
const IMG_BENTO_BLOCKS = new URL('./assets/shop/bento-blocks.jpg', import.meta.url).href
const IMG_SUPERLIMINAL = new URL('./assets/shop/superliminal.jpg', import.meta.url).href
const IMG_BLOXPATH = new URL('./assets/shop/bloxpath.jpg', import.meta.url).href
const IMG_PORTAL = new URL('./assets/shop/portal.jpeg', import.meta.url).href
const IMG_BABA_IS_YOU = new URL('./assets/shop/baba-is-you.jpg', import.meta.url).href
const IMG_LEVEL_DEVIL = new URL('./assets/shop/level-devil.jpg', import.meta.url).href
const IMG_BGA_PREMIUM = new URL('./assets/shop/bga-premium-1-month.svg', import.meta.url).href

export const SHOP_ITEMS: readonly ShopDisplayItem[] = [
	{
		id: 'puzzlewarehouse-giftcard-10',
		title: 'PuzzleWarehouse $10 Gift Card',
		image: IMG_PUZZLEWAREHOUSE_10,
		pricePieces: 360,
		blurb: 'Gift card from PuzzleWarehouse.',
	},
	{
		id: 'puzzlewarehouse-giftcard-15',
		title: 'PuzzleWarehouse $15 Gift Card',
		image: IMG_PUZZLEWAREHOUSE_15,
		pricePieces: 450,
		blurb: 'Gift card from PuzzleWarehouse.',
	},
	{
		id: 'puzzlewarehouse-giftcard-25',
		title: 'PuzzleWarehouse $25 Gift Card',
		image: IMG_PUZZLEWAREHOUSE_25,
		pricePieces: 720,
		blurb: 'Gift card from PuzzleWarehouse.',
	},
	{
		id: 'storyteller',
		title: 'Storyteller (Steam)',
		image: IMG_STORYTELLER,
		pricePieces: 540,
		blurb: 'Steam game reward option.',
	},
	{
		id: 'bento-blocks',
		title: 'Bento Blocks (Steam)',
		image: IMG_BENTO_BLOCKS,
		pricePieces: 450,
		blurb: 'Steam game reward option.',
	},
	{
		id: 'superliminal',
		title: 'Superliminal (Steam)',
		image: IMG_SUPERLIMINAL,
		pricePieces: 640,
		blurb: 'Steam game reward option.',
	},
	{
		id: 'bloxpath',
		title: 'Bloxpath (Steam)',
		image: IMG_BLOXPATH,
		pricePieces: 180,
		blurb: 'Steam game reward option.',
	},
	{
		id: 'portal',
		title: 'Portal 2 (Steam)',
		image: IMG_PORTAL,
		pricePieces: 400,
		blurb: 'Steam game reward option.',
	},
	{
		id: 'baba-is-you',
		title: 'Baba Is You (Steam)',
		image: IMG_BABA_IS_YOU,
		pricePieces: 480,
		blurb: 'Steam game reward option.',
	},
	{
		id: 'level-devil',
		title: 'Level Devil (Steam)',
		image: IMG_LEVEL_DEVIL,
		pricePieces: 230,
		blurb: 'Steam game reward option.',
	},
	{
		id: 'bga-premium-1-month',
		title: 'Board Game Arena Premium (1 Month)',
		image: IMG_BGA_PREMIUM,
		pricePieces: 180,
		blurb: '1-month Board Game Arena premium subscription.',
	},
]

export function colsForPrice(price: number): number {
	const PRICE_MIN = 180
	const PRICE_MAX = 720
	const progress = Math.min(1, Math.max(0, (price - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)))
	return Math.round(3 + progress * 6)
}

export function buildOverlaySvg(
	itemId: string,
	imageSrc: string,
	cols: number
): {
	markup: string
	maskRevealGroupId: string
	affordOutlineGroupId: string
	fillOutlineGroupId: string
	cell: number
} {
	const safeId = itemId.replace(/[^a-zA-Z0-9_-]/g, '')
	const maskId = `c-shop-mask-${safeId}`
	const maskRevealGroupId = `c-shop-mask-reveal-${safeId}`
	const affordOutlineGroupId = `c-shop-afford-outline-${safeId}`
	const fillOutlineGroupId = `c-shop-fill-outline-${safeId}`
	const imgVividFilterId = `c-shop-img-vivid-${safeId}`
	const cell = OVERLAY_VB / cols
	const s = cell / 100
	const safeImageSrc = imageSrc.replace(/"/g, '&quot;')
	const lockStroke = 'rgba(248, 113, 113, 0.92)'
	const lockFill = 'rgba(148,163,184,0.34)'
	const vividStroke = '#0f172a'
	const vividFill = 'rgba(255,250,235,0.42)'

	const lockPaths: string[] = []
	const vividPaths: string[] = []
	for (let row = 0; row < cols; row += 1) {
		for (let col = 0; col < cols; col += 1) {
			const edges = gridPieceEdges(row, col, cols, cols)
			const d = buildPuzzlePath(edges.top, edges.right, edges.bottom, edges.left, 50)
			const transform = `translate(${col * cell} ${row * cell}) scale(${s})`
			lockPaths.push(
				`<path d="${d}" transform="${transform}" fill="${lockFill}" stroke="${lockStroke}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="1.2 8.6" pathLength="100" paint-order="fill stroke"/>`
			)
			vividPaths.push(
				`<path d="${d}" transform="${transform}" fill="${vividFill}" stroke="${vividStroke}" stroke-width="3" stroke-linejoin="round" paint-order="stroke fill"/>`
			)
		}
	}

	const markup = `
<svg class="c-shop-card-overlay-svg" viewBox="0 0 ${OVERLAY_VB} ${OVERLAY_VB}" preserveAspectRatio="none" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="${imgVividFilterId}" color-interpolation-filters="sRGB">
      <feColorMatrix type="saturate" values="1.45"/>
      <feComponentTransfer>
        <feFuncR type="linear" slope="1.08" intercept="0"/>
        <feFuncG type="linear" slope="1.08" intercept="0"/>
        <feFuncB type="linear" slope="1.08" intercept="0"/>
      </feComponentTransfer>
    </filter>
    <mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="${OVERLAY_VB}" height="${OVERLAY_VB}">
      <rect width="${OVERLAY_VB}" height="${OVERLAY_VB}" fill="black"/>
      <g id="${maskRevealGroupId}"></g>
    </mask>
  </defs>
  <g>${lockPaths.join('')}</g>
  <image href="${safeImageSrc}" x="0" y="0" width="${OVERLAY_VB}" height="${OVERLAY_VB}" preserveAspectRatio="xMidYMid slice" mask="url(#${maskId})" filter="url(#${imgVividFilterId})"/>
  <g mask="url(#${maskId})" opacity="0.72">${vividPaths.join('')}</g>
  <g id="${affordOutlineGroupId}"></g>
  <g id="${fillOutlineGroupId}"></g>
</svg>`.trim()

	return { markup, maskRevealGroupId, affordOutlineGroupId, fillOutlineGroupId, cell }
}
