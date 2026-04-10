export type EdgeType = 'tab' | 'hole' | 'flat'

/** Single cell path in 0–100 space; tile with top=hole, right=tab, bottom=tab, left=hole for a seamless sheet. */
export function buildPuzzlePath(
	top: EdgeType,
	right: EdgeType,
	bottom: EdgeType,
	left: EdgeType,
	mid: number
): string {
	const tab = 25
	const neck = 15
	const segs: string[] = ['M 0 0']

	if (top === 'tab') {
		segs.push(`L ${mid - neck} 0`)
		segs.push(`C ${mid - neck} ${-tab} ${mid + neck} ${-tab} ${mid + neck} 0`)
	} else if (top === 'hole') {
		segs.push(`L ${mid - neck} 0`)
		segs.push(`C ${mid - neck} ${tab} ${mid + neck} ${tab} ${mid + neck} 0`)
	}
	segs.push('L 100 0')

	if (right === 'tab') {
		segs.push(`L 100 ${mid - neck}`)
		segs.push(`C ${100 + tab} ${mid - neck} ${100 + tab} ${mid + neck} 100 ${mid + neck}`)
	} else if (right === 'hole') {
		segs.push(`L 100 ${mid - neck}`)
		segs.push(`C ${100 - tab} ${mid - neck} ${100 - tab} ${mid + neck} 100 ${mid + neck}`)
	}
	segs.push('L 100 100')

	if (bottom === 'tab') {
		segs.push(`L ${mid + neck} 100`)
		segs.push(`C ${mid + neck} ${100 + tab} ${mid - neck} ${100 + tab} ${mid - neck} 100`)
	} else if (bottom === 'hole') {
		segs.push(`L ${mid + neck} 100`)
		segs.push(`C ${mid + neck} ${100 - tab} ${mid - neck} ${100 - tab} ${mid - neck} 100`)
	}
	segs.push('L 0 100')

	if (left === 'tab') {
		segs.push(`L 0 ${mid + neck}`)
		segs.push(`C ${-tab} ${mid + neck} ${-tab} ${mid - neck} 0 ${mid - neck}`)
	} else if (left === 'hole') {
		segs.push(`L 0 ${mid + neck}`)
		segs.push(`C ${tab} ${mid + neck} ${tab} ${mid - neck} 0 ${mid - neck}`)
	}
	segs.push('L 0 0 Z')

	return segs.join(' ')
}
