import { getSupabase } from './supabase.js'

function requireSupabase() {
	const db = getSupabase()
	if (!db) {
		throw new Error('Supabase is not configured (set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env)')
	}
	return db
}

type PuzzleRewardInput = {
	targetUserId: string
	puzzleId: string
	amount: number
	reason?: string
}

export type ArcadeUpvoteResult =
	| { ok: true; newUpvote: boolean; likeCount: number }
	| { ok: false; error: 'unknown_puzzle' }

export type ArcadePuzzleUpvoteState = {
	puzzleId: string
	likeCount: number
	likedByMe: boolean
	ownPuzzle: boolean
}

export type ArcadeSolutionRecord = {
	puzzleId: string
	creatorUserId: string
	rewardPuzzleId: string
	password: string
}

const SHOP_CATALOG = [
	{ id: 'puzzlewarehouse-giftcard-10', pricePieces: 360, title: 'PuzzleWarehouse $10 Gift Card' },
	{ id: 'puzzlewarehouse-giftcard-15', pricePieces: 450, title: 'PuzzleWarehouse $15 Gift Card' },
	{ id: 'puzzlewarehouse-giftcard-25', pricePieces: 720, title: 'PuzzleWarehouse $25 Gift Card' },
	{ id: 'storyteller', pricePieces: 540, title: 'Storyteller (Steam)' },
	{ id: 'bento-blocks', pricePieces: 450, title: 'Bento Blocks (Steam)' },
	{ id: 'superliminal', pricePieces: 640, title: 'Superliminal (Steam)' },
	{ id: 'bloxpath', pricePieces: 180, title: 'Bloxpath (Steam)' },
	{ id: 'portal', pricePieces: 400, title: 'Portal (Steam)' },
	{ id: 'baba-is-you', pricePieces: 480, title: 'Baba Is You (Steam)' },
	{ id: 'level-devil', pricePieces: 230, title: 'Level Devil (Steam)' },
	{ id: 'bga-premium-1-month', pricePieces: 180, title: 'Board Game Arena Premium (1 Month)' },
] as const
const SHOP_CATALOG_BY_ID = Object.fromEntries(SHOP_CATALOG.map((item) => [item.id, item])) as Record<
	string,
	{ id: string; pricePieces: number; title: string }
>

export type ShopCatalogItem = {
	id: string
	pricePieces: number
	title: string
}

export type ShopPurchaseResult =
	| { success: true; purchaseId: number; balance: number; itemId: string; pricePieces: number; title: string }
	| { success: false; error: 'unknown_item' }
	| { success: false; error: 'insufficient_pieces'; pieces: number }

export function getPieceStorageBackend(): string {
	return 'supabase'
}

export function getShopCatalog(): ShopCatalogItem[] {
	return SHOP_CATALOG.map((item) => ({ ...item }))
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

function normalizeArcadePuzzleIds(puzzleIds: readonly string[]): string[] {
	return Array.from(new Set(puzzleIds.map((id) => String(id || '').trim()).filter(Boolean))).slice(0, 200)
}

export async function listArcadePuzzleUpvotes(
	puzzleIds: readonly string[],
	voterUserId?: string
): Promise<ArcadePuzzleUpvoteState[]> {
	const ids = normalizeArcadePuzzleIds(puzzleIds)
	if (!ids.length) return []
	const supabase = getSupabase()
	if (!supabase) {
		return ids.map((puzzleId) => ({ puzzleId, likeCount: 0, likedByMe: false, ownPuzzle: false }))
	}
	const voter = (voterUserId || '').trim()
	const { data: upvoteRows, error: upvoteError } = await supabase
		.from('arcade_upvotes')
		.select('puzzle_id,voter_user_id')
		.in('puzzle_id', ids)
	if (upvoteError) throw upvoteError
	const { data: solutionRows, error: solutionError } = await supabase
		.from('arcade_solutions')
		.select('puzzle_id,creator_user_id')
		.in('puzzle_id', ids)
	if (solutionError) throw solutionError

	const likeCountByPuzzle = new Map<string, number>()
	const likedByMe = new Set<string>()
	const ownerByPuzzle = new Map<string, string>()
	for (const row of upvoteRows || []) {
		likeCountByPuzzle.set(row.puzzle_id, (likeCountByPuzzle.get(row.puzzle_id) || 0) + 1)
		if (voter && row.voter_user_id === voter) {
			likedByMe.add(row.puzzle_id)
		}
	}
	for (const row of solutionRows || []) {
		ownerByPuzzle.set(row.puzzle_id, String(row.creator_user_id || '').trim())
	}
	return ids.map((puzzleId) => ({
		puzzleId,
		likeCount: likeCountByPuzzle.get(puzzleId) || 0,
		likedByMe: likedByMe.has(puzzleId),
		ownPuzzle: Boolean(voter && ownerByPuzzle.get(puzzleId) === voter),
	}))
}

export async function getArcadeSolutionRecord(puzzleId: string): Promise<ArcadeSolutionRecord | null> {
	const id = String(puzzleId || '').trim()
	if (!id) return null
	const supabase = getSupabase()
	if (!supabase) return null
	const { data, error } = await supabase
		.from('arcade_solutions')
		.select('puzzle_id,creator_user_id,reward_puzzle_id,password')
		.eq('puzzle_id', id)
		.maybeSingle()
	if (error) throw error
	if (!data) return null
	return {
		puzzleId: String(data.puzzle_id || '').trim(),
		creatorUserId: String(data.creator_user_id || '').trim(),
		rewardPuzzleId: String(data.reward_puzzle_id || '').trim(),
		password: String(data.password || '').trim().toLowerCase(),
	}
}

export async function applyArcadeUpvote(
	voterUserId: string,
	puzzleId: string
): Promise<ArcadeUpvoteResult> {
	const id = puzzleId.trim()
	if (!id) {
		return { ok: false, error: 'unknown_puzzle' }
	}

	const supabase = requireSupabase()
	const inserted = await supabase.from('arcade_upvotes').insert({
		puzzle_id: id,
		voter_user_id: voterUserId,
		created_at: Date.now(),
	})
	const newUpvote = !inserted.error
	if (inserted.error && inserted.error.code !== '23505') throw inserted.error
	const { count, error: countError } = await supabase
		.from('arcade_upvotes')
		.select('puzzle_id', { count: 'exact', head: true })
		.eq('puzzle_id', id)
	if (countError) throw countError
	return { ok: true, newUpvote, likeCount: Number(count || 0) }
}

export async function purchaseShopItem(userId: string, rawItemId: string): Promise<ShopPurchaseResult> {
	const itemId = rawItemId.trim()
	const catalog = SHOP_CATALOG_BY_ID[itemId]
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
