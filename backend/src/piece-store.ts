import { getSupabase } from './supabase.js'

function requireSupabase() {
	const db = getSupabase()
	if (!db) {
		throw new Error('Supabase is not configured (set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env)')
	}
	return db
}

type PieceGrantInput = {
	targetUserId: string
	amount: number
	reason?: string
}

type PuzzleRewardInput = {
	targetUserId: string
	puzzleId: string
	amount: number
	reason?: string
}

const ARCADE_UPVOTE_PIECES_FOR_CREATOR = 2

export type ArcadePuzzleListItem = {
	puzzleId: string
	creatorUserId: string
	title: string
	genre: string
	thumbnail: string
	gameUrl: string | null
	authorLabel: string
	createdAt: number
	likeCount: number
	likedByMe: boolean
}

export type RegisterArcadePuzzleInput = {
	puzzleId: string
	title: string
	genre?: string
	thumbnail?: string
	gameUrl?: string
	authorLabel?: string
}

export type ArcadeUpvoteResult =
	| { ok: true; newUpvote: boolean; likeCount: number }
	| { ok: false; error: 'unknown_puzzle' | 'self_upvote' }

/** Server-side prices; must stay in sync with frontend shop catalog. */
const SHOP_CATALOG: Record<string, { pricePieces: number; title: string }> = {
	'puzzlewarehouse-giftcard-10': { pricePieces: 360, title: 'PuzzleWarehouse $10 Gift Card' },
	'puzzlewarehouse-giftcard-15': { pricePieces: 450, title: 'PuzzleWarehouse $15 Gift Card' },
	'puzzlewarehouse-giftcard-25': { pricePieces: 720, title: 'PuzzleWarehouse $25 Gift Card' },
	storyteller: { pricePieces: 540, title: 'Storyteller (Steam)' },
	'bento-blocks': { pricePieces: 450, title: 'Bento Blocks (Steam)' },
	superliminal: { pricePieces: 640, title: 'Superliminal (Steam)' },
	bloxpath: { pricePieces: 180, title: 'Bloxpath (Steam)' },
	portal: { pricePieces: 400, title: 'Portal (Steam)' },
	'baba-is-you': { pricePieces: 480, title: 'Baba Is You (Steam)' },
	'level-devil': { pricePieces: 230, title: 'Level Devil (Steam)' },
	'bga-premium-1-month': { pricePieces: 180, title: 'Board Game Arena Premium (1 Month)' },
}

export type ShopPurchaseResult =
	| { success: true; purchaseId: number; balance: number; itemId: string; pricePieces: number; title: string }
	| { success: false; error: 'unknown_item' }
	| { success: false; error: 'insufficient_pieces'; pieces: number }

export function getPieceDbPath(): string {
	return 'supabase'
}

export async function getUserPieceBalance(userId: string): Promise<number> {
	const supabase = getSupabase()
	if (!supabase) return 0
	const { data, error } = await supabase
		.from('piece_balances')
		.select('pieces')
		.eq('user_id', userId)
		.maybeSingle()
	if (error) throw error
	return Number(data?.pieces || 0)
}

export async function adjustUserPieces(targetUserId: string, delta: number): Promise<number> {
	const supabase = requireSupabase()
	const now = Date.now()
	const current = await getUserPieceBalance(targetUserId)
	const safeDelta = Math.floor(delta)
	const nextBalance = Math.max(0, current + safeDelta)
	const { error } = await supabase.from('piece_balances').upsert(
		{
			user_id: targetUserId,
			pieces: nextBalance,
			updated_at: now,
		},
		{ onConflict: 'user_id' }
	)
	if (error) throw error
	return nextBalance
}

export async function grantPieces(
	targetUserId: string,
	amount: number,
	reason?: string
): Promise<number> {
	const supabase = requireSupabase()
	const safeAmount = Math.floor(amount)
	const nextBalance = await adjustUserPieces(targetUserId, safeAmount)
	const { error } = await supabase.from('piece_grants').insert({
		target_user_id: targetUserId,
		amount: safeAmount,
		reason: reason || null,
		created_at: Date.now(),
	})
	if (error) throw error
	return nextBalance
}

export async function hasPuzzleClaim(userId: string, puzzleId: string): Promise<boolean> {
	const supabase = getSupabase()
	if (!supabase) return false
	const { data, error } = await supabase
		.from('puzzle_claims')
		.select('user_id')
		.eq('user_id', userId)
		.eq('puzzle_id', puzzleId)
		.limit(1)
		.maybeSingle()
	if (error) throw error
	return Boolean(data)
}

export async function markPuzzleClaimed(userId: string, puzzleId: string): Promise<void> {
	const supabase = requireSupabase()
	const { error } = await supabase.from('puzzle_claims').upsert(
		{
			user_id: userId,
			puzzle_id: puzzleId,
			created_at: Date.now(),
		},
		{ onConflict: 'user_id,puzzle_id' }
	)
	if (error) throw error
}

export async function claimPuzzleReward(input: PuzzleRewardInput): Promise<number | null> {
	const supabase = requireSupabase()
	const inserted = await supabase.from('puzzle_claims').insert({
		user_id: input.targetUserId,
		puzzle_id: input.puzzleId,
		created_at: Date.now(),
	})
	if (inserted.error) {
		if (inserted.error.code === '23505') return null
		throw inserted.error
	}
	return grantPieces(input.targetUserId, input.amount, input.reason)
}

export async function listArcadePuzzles(voterUserId?: string): Promise<ArcadePuzzleListItem[]> {
	const supabase = getSupabase()
	if (!supabase) return []
	const voter = (voterUserId || '').trim()
	const { data: puzzleRows, error: puzzleError } = await supabase
		.from('arcade_puzzles')
		.select('puzzle_id,creator_user_id,title,genre,thumbnail,game_url,author_label,created_at')
		.order('created_at', { ascending: false })
	if (puzzleError) throw puzzleError
	const puzzleIds = (puzzleRows || []).map((row) => row.puzzle_id)
	const likeCountByPuzzle = new Map<string, number>()
	const likedByMe = new Set<string>()
	if (puzzleIds.length > 0) {
		const { data: upvoteRows, error: upvoteError } = await supabase
			.from('arcade_upvotes')
			.select('puzzle_id,voter_user_id')
			.in('puzzle_id', puzzleIds)
		if (upvoteError) throw upvoteError
		for (const row of upvoteRows || []) {
			likeCountByPuzzle.set(row.puzzle_id, (likeCountByPuzzle.get(row.puzzle_id) || 0) + 1)
			if (voter && row.voter_user_id === voter) {
				likedByMe.add(row.puzzle_id)
			}
		}
	}
	return (puzzleRows || []).map((row) => ({
		puzzleId: row.puzzle_id,
		creatorUserId: row.creator_user_id,
		title: row.title,
		genre: row.genre || '',
		thumbnail: row.thumbnail || '',
		gameUrl: row.game_url,
		authorLabel: row.author_label || 'Creator',
		createdAt: Number(row.created_at) || Date.now(),
		likeCount: likeCountByPuzzle.get(row.puzzle_id) || 0,
		likedByMe: likedByMe.has(row.puzzle_id),
	}))
}

export async function registerOrUpdateArcadePuzzle(
	creatorUserId: string,
	input: RegisterArcadePuzzleInput
): Promise<{ ok: true } | { ok: false; error: 'puzzle_id_taken' | 'invalid_input' }> {
	const puzzleId = input.puzzleId.trim()
	const title = input.title.trim()
	if (!puzzleId || puzzleId.length > 200 || !title) {
		return { ok: false, error: 'invalid_input' }
	}
	const genre = (input.genre || '').trim()
	const thumbnail = (input.thumbnail || '').trim()
	const gameUrlRaw = input.gameUrl?.trim()
	const gameUrl = gameUrlRaw ? gameUrlRaw : null
	const authorLabel = (input.authorLabel || '').trim() || 'Creator'

	const supabase = requireSupabase()
	const { data: existing, error: existingError } = await supabase
		.from('arcade_puzzles')
		.select('creator_user_id')
		.eq('puzzle_id', puzzleId)
		.maybeSingle()
	if (existingError) throw existingError
	if (existing && existing.creator_user_id !== creatorUserId) {
		return { ok: false, error: 'puzzle_id_taken' }
	}

	if (!existing) {
		const { error } = await supabase.from('arcade_puzzles').insert({
			puzzle_id: puzzleId,
			creator_user_id: creatorUserId,
			title,
			genre,
			thumbnail,
			game_url: gameUrl,
			author_label: authorLabel,
			created_at: Date.now(),
		})
		if (error) throw error
		return { ok: true }
	}

	const { error } = await supabase
		.from('arcade_puzzles')
		.update({
			title,
			genre,
			thumbnail,
			game_url: gameUrl,
			author_label: authorLabel,
		})
		.eq('puzzle_id', puzzleId)
		.eq('creator_user_id', creatorUserId)
	if (error) throw error
	return { ok: true }
}

export async function applyArcadeUpvote(voterUserId: string, puzzleId: string): Promise<ArcadeUpvoteResult> {
	const id = puzzleId.trim()
	if (!id) {
		return { ok: false, error: 'unknown_puzzle' }
	}

	const supabase = requireSupabase()
	const { data: row, error: rowError } = await supabase
		.from('arcade_puzzles')
		.select('creator_user_id')
		.eq('puzzle_id', id)
		.maybeSingle()
	if (rowError) throw rowError
	if (!row) return { ok: false, error: 'unknown_puzzle' }
	if (row.creator_user_id === voterUserId) return { ok: false, error: 'self_upvote' }

	const inserted = await supabase.from('arcade_upvotes').insert({
		puzzle_id: id,
		voter_user_id: voterUserId,
		created_at: Date.now(),
	})
	const newUpvote = !inserted.error
	if (inserted.error && inserted.error.code !== '23505') throw inserted.error
	if (newUpvote) {
		await grantPieces(
			row.creator_user_id,
			ARCADE_UPVOTE_PIECES_FOR_CREATOR,
			`Arcade upvote:${id}:voter=${voterUserId}`
		)
	}
	const { count, error: countError } = await supabase
		.from('arcade_upvotes')
		.select('puzzle_id', { count: 'exact', head: true })
		.eq('puzzle_id', id)
	if (countError) throw countError
	return { ok: true, newUpvote, likeCount: Number(count || 0) }
}

export async function purchaseShopItem(userId: string, rawItemId: string): Promise<ShopPurchaseResult> {
	const itemId = rawItemId.trim()
	const catalog = SHOP_CATALOG[itemId]
	if (!catalog) {
		return { success: false, error: 'unknown_item' }
	}
	const balance = await getUserPieceBalance(userId)
	if (balance < catalog.pricePieces) {
		return { success: false, error: 'insufficient_pieces', pieces: balance }
	}
	const supabase = requireSupabase()
	const nextBalance = await adjustUserPieces(userId, -catalog.pricePieces)
	const { data, error } = await supabase
		.from('shop_purchases')
		.insert({
			user_id: userId,
			item_id: itemId,
			price_pieces: catalog.pricePieces,
			title_snapshot: catalog.title,
			created_at: Date.now(),
		})
		.select('id')
		.single()
	if (error) throw error
	return {
		success: true,
		purchaseId: Number(data.id),
		balance: nextBalance,
		itemId,
		pricePieces: catalog.pricePieces,
		title: catalog.title,
	}
}
