import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

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

const MAX_GRANT_HISTORY = 500

const defaultDbPath = path.resolve(process.cwd(), 'data/pieces.sqlite')
const configuredDbPath =
	process.env.PIECE_DB_PATH?.trim() || process.env.COIN_DB_PATH?.trim() || defaultDbPath
const resolvedDbPath = path.isAbsolute(configuredDbPath)
	? configuredDbPath
	: path.resolve(process.cwd(), configuredDbPath)

fs.mkdirSync(path.dirname(resolvedDbPath), { recursive: true })

const db = new DatabaseSync(resolvedDbPath)
db.exec('PRAGMA journal_mode = WAL;')
db.exec('PRAGMA foreign_keys = ON;')

db.exec(`
	CREATE TABLE IF NOT EXISTS piece_balances (
		user_id TEXT PRIMARY KEY,
		pieces INTEGER NOT NULL CHECK (pieces >= 0),
		updated_at INTEGER NOT NULL
	);

	CREATE TABLE IF NOT EXISTS piece_grants (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		target_user_id TEXT NOT NULL,
		amount INTEGER NOT NULL CHECK (amount > 0),
		reason TEXT,
		created_at INTEGER NOT NULL
	);

	CREATE TABLE IF NOT EXISTS puzzle_claims (
		user_id TEXT NOT NULL,
		puzzle_id TEXT NOT NULL,
		created_at INTEGER NOT NULL,
		PRIMARY KEY (user_id, puzzle_id)
	);

	CREATE TABLE IF NOT EXISTS shop_purchases (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id TEXT NOT NULL,
		item_id TEXT NOT NULL,
		price_pieces INTEGER NOT NULL CHECK (price_pieces > 0),
		title_snapshot TEXT NOT NULL,
		created_at INTEGER NOT NULL,
		fulfilled_at INTEGER
	);

	CREATE INDEX IF NOT EXISTS idx_shop_purchases_user ON shop_purchases (user_id, created_at DESC);

	CREATE TABLE IF NOT EXISTS arcade_puzzles (
		puzzle_id TEXT PRIMARY KEY,
		creator_user_id TEXT NOT NULL,
		title TEXT NOT NULL,
		genre TEXT NOT NULL DEFAULT '',
		thumbnail TEXT NOT NULL DEFAULT '',
		game_url TEXT,
		author_label TEXT NOT NULL DEFAULT '',
		created_at INTEGER NOT NULL
	);

	CREATE TABLE IF NOT EXISTS arcade_upvotes (
		puzzle_id TEXT NOT NULL,
		voter_user_id TEXT NOT NULL,
		created_at INTEGER NOT NULL,
		PRIMARY KEY (puzzle_id, voter_user_id)
	);

	CREATE INDEX IF NOT EXISTS idx_arcade_upvotes_puzzle ON arcade_upvotes (puzzle_id);
`)

function migrateLegacyCoinTablesIfNeeded(): void {
	const hasCoinBalances = Boolean(
		db.prepare(`SELECT 1 FROM sqlite_master WHERE type='table' AND name='coin_balances'`).get()
	)
	if (!hasCoinBalances) return

	db.exec('BEGIN IMMEDIATE')
	try {
		db.exec(`
			INSERT OR REPLACE INTO piece_balances (user_id, pieces, updated_at)
			SELECT user_id, coins, updated_at FROM coin_balances
		`)
		const hasCoinGrants = Boolean(
			db.prepare(`SELECT 1 FROM sqlite_master WHERE type='table' AND name='coin_grants'`).get()
		)
		if (hasCoinGrants) {
			db.exec(`
				INSERT INTO piece_grants (target_user_id, amount, reason, created_at)
				SELECT target_user_id, amount, reason, created_at FROM coin_grants
			`)
		}
		db.exec('DROP TABLE IF EXISTS coin_grants')
		db.exec('DROP TABLE IF EXISTS coin_balances')
		db.exec('COMMIT')
	} catch (error) {
		db.exec('ROLLBACK')
		throw error
	}
}

migrateLegacyCoinTablesIfNeeded()

const getBalanceStmt = db.prepare('SELECT pieces FROM piece_balances WHERE user_id = ?')
const hasClaimStmt = db.prepare('SELECT 1 FROM puzzle_claims WHERE user_id = ? AND puzzle_id = ? LIMIT 1')
const upsertBalanceStmt = db.prepare(`
	INSERT INTO piece_balances (user_id, pieces, updated_at)
	VALUES (?, ?, ?)
	ON CONFLICT(user_id) DO UPDATE SET pieces = excluded.pieces, updated_at = excluded.updated_at
`)
const insertGrantStmt = db.prepare(`
	INSERT INTO piece_grants (target_user_id, amount, reason, created_at)
	VALUES (?, ?, ?, ?)
`)
const trimGrantHistoryStmt = db.prepare(`
	DELETE FROM piece_grants
	WHERE id NOT IN (
		SELECT id FROM piece_grants
		ORDER BY created_at DESC, id DESC
		LIMIT ?
	)
`)
const insertClaimStmt = db.prepare(
	'INSERT OR IGNORE INTO puzzle_claims (user_id, puzzle_id, created_at) VALUES (?, ?, ?)'
)
const insertShopPurchaseStmt = db.prepare(`
	INSERT INTO shop_purchases (user_id, item_id, price_pieces, title_snapshot, created_at)
	VALUES (?, ?, ?, ?, ?)
`)
const lastInsertRowIdStmt = db.prepare('SELECT last_insert_rowid() AS id')

const ARCADE_UPVOTE_PIECES_FOR_CREATOR = 2

const getArcadePuzzleCreatorStmt = db.prepare(
	'SELECT creator_user_id AS creatorUserId FROM arcade_puzzles WHERE puzzle_id = ? LIMIT 1'
)
const insertArcadePuzzleStmt = db.prepare(`
	INSERT INTO arcade_puzzles (puzzle_id, creator_user_id, title, genre, thumbnail, game_url, author_label, created_at)
	VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`)
const updateArcadePuzzleStmt = db.prepare(`
	UPDATE arcade_puzzles
	SET title = ?, genre = ?, thumbnail = ?, game_url = ?, author_label = ?
	WHERE puzzle_id = ? AND creator_user_id = ?
`)
const listArcadePuzzlesStmt = db.prepare(`
	SELECT
		p.puzzle_id AS puzzleId,
		p.creator_user_id AS creatorUserId,
		p.title AS title,
		p.genre AS genre,
		p.thumbnail AS thumbnail,
		p.game_url AS gameUrl,
		p.author_label AS authorLabel,
		p.created_at AS createdAt,
		(SELECT COUNT(*) FROM arcade_upvotes u WHERE u.puzzle_id = p.puzzle_id) AS likeCount,
		EXISTS (
			SELECT 1 FROM arcade_upvotes v
			WHERE v.puzzle_id = p.puzzle_id AND v.voter_user_id = ? AND length(?) > 0
		) AS likedByMe
	FROM arcade_puzzles p
	ORDER BY p.created_at DESC
`)
const insertArcadeUpvoteStmt = db.prepare(
	'INSERT OR IGNORE INTO arcade_upvotes (puzzle_id, voter_user_id, created_at) VALUES (?, ?, ?)'
)
const countArcadeUpvotesStmt = db.prepare(
	'SELECT COUNT(*) AS c FROM arcade_upvotes WHERE puzzle_id = ?'
)

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

function runInTransaction<T>(work: () => T): T {
	db.exec('BEGIN IMMEDIATE')
	try {
		const result = work()
		db.exec('COMMIT')
		return result
	} catch (error) {
		db.exec('ROLLBACK')
		throw error
	}
}

function adjustUserPiecesInternal(targetUserId: string, delta: number): number {
	const now = Date.now()
	const row = getBalanceStmt.get(targetUserId) as { pieces: number } | undefined
	const current = row?.pieces || 0
	const safeDelta = Math.floor(delta)
	const nextBalance = Math.max(0, current + safeDelta)
	upsertBalanceStmt.run(targetUserId, nextBalance, now)
	return nextBalance
}

function grantPiecesInternal(input: PieceGrantInput): number {
	const safeAmount = Math.floor(input.amount)
	const nextBalance = adjustUserPiecesInternal(input.targetUserId, safeAmount)
	insertGrantStmt.run(
		input.targetUserId,
		safeAmount,
		input.reason || null,
		Date.now()
	)
	trimGrantHistoryStmt.run(MAX_GRANT_HISTORY)
	return nextBalance
}

function claimPuzzleRewardInternal(input: PuzzleRewardInput): number | null {
	const existingClaim = hasClaimStmt.get(input.targetUserId, input.puzzleId)
	if (existingClaim) return null

	const nextBalance = grantPiecesInternal({
		targetUserId: input.targetUserId,
		amount: input.amount,
		reason: input.reason,
	})
	insertClaimStmt.run(input.targetUserId, input.puzzleId, Date.now())
	return nextBalance
}

export function getPieceDbPath(): string {
	return resolvedDbPath
}

export function getUserPieceBalance(userId: string): number {
	const row = getBalanceStmt.get(userId) as { pieces: number } | undefined
	return row?.pieces || 0
}

export function adjustUserPieces(targetUserId: string, delta: number): number {
	return runInTransaction(() => adjustUserPiecesInternal(targetUserId, delta))
}

export function grantPieces(
	targetUserId: string,
	amount: number,
	reason?: string
): number {
	return runInTransaction(() => grantPiecesInternal({targetUserId, amount, reason }))
}

export function hasPuzzleClaim(userId: string, puzzleId: string): boolean {
	return Boolean(hasClaimStmt.get(userId, puzzleId))
}

export function markPuzzleClaimed(userId: string, puzzleId: string): void {
	insertClaimStmt.run(userId, puzzleId, Date.now())
}

export function claimPuzzleReward(input: PuzzleRewardInput): number | null {
	return runInTransaction(() => claimPuzzleRewardInternal(input))
}

export function listArcadePuzzles(voterUserId?: string): ArcadePuzzleListItem[] {
	const voter = (voterUserId || '').trim()
	const rows = listArcadePuzzlesStmt.all(voter, voter) as Array<{
		puzzleId: string
		creatorUserId: string
		title: string
		genre: string
		thumbnail: string
		gameUrl: string | null
		authorLabel: string
		createdAt: number
		likeCount: number
		likedByMe: number | boolean
	}>
	return rows.map((r) => ({
		puzzleId: r.puzzleId,
		creatorUserId: r.creatorUserId,
		title: r.title,
		genre: r.genre,
		thumbnail: r.thumbnail,
		gameUrl: r.gameUrl,
		authorLabel: r.authorLabel,
		createdAt: r.createdAt,
		likeCount: Number(r.likeCount) || 0,
		likedByMe: Boolean(r.likedByMe),
	}))
}

export function registerOrUpdateArcadePuzzle(
	creatorUserId: string,
	input: RegisterArcadePuzzleInput
): { ok: true } | { ok: false; error: 'puzzle_id_taken' | 'invalid_input' } {
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

	return runInTransaction(() => {
		const existing = getArcadePuzzleCreatorStmt.get(puzzleId) as { creatorUserId: string } | undefined
		if (existing && existing.creatorUserId !== creatorUserId) {
			return { ok: false, error: 'puzzle_id_taken' as const }
		}
		const now = Date.now()
		if (!existing) {
			insertArcadePuzzleStmt.run(puzzleId, creatorUserId, title, genre, thumbnail, gameUrl, authorLabel, now)
		} else {
			updateArcadePuzzleStmt.run(title, genre, thumbnail, gameUrl, authorLabel, puzzleId, creatorUserId)
		}
		return { ok: true as const }
	})
}

export function applyArcadeUpvote(voterUserId: string, puzzleId: string): ArcadeUpvoteResult {
	const id = puzzleId.trim()
	if (!id) {
		return { ok: false, error: 'unknown_puzzle' }
	}
	return runInTransaction(() => {
		const row = getArcadePuzzleCreatorStmt.get(id) as { creatorUserId: string } | undefined
		if (!row) {
			return { ok: false, error: 'unknown_puzzle' as const }
		}
		if (row.creatorUserId === voterUserId) {
			return { ok: false, error: 'self_upvote' as const }
		}
		const now = Date.now()
		const runResult = insertArcadeUpvoteStmt.run(id, voterUserId, now) as { changes?: number }
		const newUpvote = Number(runResult.changes) > 0
		if (newUpvote) {
			grantPiecesInternal({
				targetUserId: row.creatorUserId,
				amount: ARCADE_UPVOTE_PIECES_FOR_CREATOR,
				reason: `Arcade upvote:${id}:voter=${voterUserId}`,
			})
		}
		const countRow = countArcadeUpvotesStmt.get(id) as { c: number } | undefined
		const likeCount = Number(countRow?.c) || 0
		return { ok: true, newUpvote, likeCount }
	})
}

function purchaseShopItemInternal(
	userId: string,
	itemId: string,
	catalog: { pricePieces: number; title: string }
): ShopPurchaseResult {
	const row = getBalanceStmt.get(userId) as { pieces: number } | undefined
	const balance = row?.pieces ?? 0
	if (balance < catalog.pricePieces) {
		return { success: false, error: 'insufficient_pieces', pieces: balance }
	}

	const nextBalance = adjustUserPiecesInternal(userId, -catalog.pricePieces)
	const now = Date.now()
	insertShopPurchaseStmt.run(userId, itemId, catalog.pricePieces, catalog.title, now)
	const lastRow = lastInsertRowIdStmt.get() as { id: number | bigint }
	const purchaseId = Number(lastRow.id)

	return {
		success: true,
		purchaseId,
		balance: nextBalance,
		itemId,
		pricePieces: catalog.pricePieces,
		title: catalog.title,
	}
}

export function purchaseShopItem(userId: string, rawItemId: string): ShopPurchaseResult {
	const itemId = rawItemId.trim()
	const catalog = SHOP_CATALOG[itemId]
	if (!catalog) {
		return { success: false, error: 'unknown_item' }
	}

	return runInTransaction(() => purchaseShopItemInternal(userId, itemId, catalog))
}
