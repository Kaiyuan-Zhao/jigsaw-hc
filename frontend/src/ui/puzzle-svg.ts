import { buildPuzzlePath, type EdgeType } from '../puzzle-path'

export type PuzzleSvgOptions = {
	fill?: string
	stroke?: string
	strokeWidth?: number
	top?: EdgeType
	right?: EdgeType
	bottom?: EdgeType
	left?: EdgeType
	mid?: number
	cls?: string
}

export function puzzleSVG(opts: PuzzleSvgOptions = {}): string {
	const {
		fill = '#ffffff',
		stroke = '#111827',
		strokeWidth = 3,
		top = 'tab',
		right = 'tab',
		bottom = 'tab',
		left = 'tab',
		cls = 'j-puzzle-svg',
		mid = 50,
	} = opts

	const path = buildPuzzlePath(top, right, bottom, left, mid)

	return `
<svg class="${cls}" viewBox="-16 -16 132 132"
     xmlns="http://www.w3.org/2000/svg"
     style="position:absolute;left:-16%;top:-16%;width:132%;height:132%;overflow:visible;display:block;pointer-events:none">
  <path d="${path}" fill="${fill}"/>
  <path d="${path}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"
        stroke-linejoin="round" paint-order="stroke fill"/>
</svg>`
}
