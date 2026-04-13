import type express from 'express'
import { getSessionFromRequest } from '../auth/session.js'
import { applyArcadeUpvote, claimPuzzleReward, getArcadeSolutionRecord, getUserPieceBalance, grantPieces, hasPuzzleClaim, listArcadePuzzleUpvotes } from '../piece-store.js'

const ARCADE_SOLUTION_CREDIT_PIECES = 2
const ARCADE_PUZZLE_OWNER_SOLVE_PIECES = 1
const ARCADE_UPVOTE_CREDIT_PIECES = 4

export function registerArcadeRoutes(app: express.Express): void {
	app.post('/arcade/upvote-status', async (req, res) => {
		try {
			const sessionData = getSessionFromRequest(req)
			const voterId = sessionData?.session.user.id
			const body = (req.body || {}) as { puzzleIds?: unknown }
			const puzzleIds = (Array.isArray(body.puzzleIds) ? body.puzzleIds : [])
				.map((value) => String(value || '').trim())
				.filter(Boolean)
				.slice(0, 200)
			const rows = await listArcadePuzzleUpvotes(puzzleIds, voterId)
			const byPuzzleId: Record<string, { likeCount: number; likedByMe: boolean; ownPuzzle: boolean }> = {}
			for (const row of rows) {
				byPuzzleId[row.puzzleId] = {
					likeCount: row.likeCount,
					likedByMe: row.likedByMe,
					ownPuzzle: row.ownPuzzle,
				}
			}
			res.json({ success: true, byPuzzleId })
		} catch (error) {
			console.error('[arcade] failed to list upvote status', error)
			res.status(500).json({ error: 'Failed to fetch upvote status' })
		}
	})

	app.post('/arcade/upvote', async (req, res) => {
		try {
			const sessionData = getSessionFromRequest(req)
			if (!sessionData) {
				res.status(401).json({ error: 'Sign in with Hack Club to upvote' })
				return
			}

			const puzzleId = String((req.body || {}).puzzleId || '').trim()
			if (!puzzleId) {
				res.status(400).json({ error: 'puzzleId is required' })
				return
			}
			const solution = await getArcadeSolutionRecord(puzzleId)
			if (!solution) {
				res.status(400).json({ error: 'Unknown puzzle' })
				return
			}
			if (solution.creatorUserId && solution.creatorUserId === sessionData.session.user.id) {
				res.status(400).json({ error: 'Cannot upvote your own puzzle' })
				return
			}

			const result = await applyArcadeUpvote(sessionData.session.user.id, puzzleId)
			if (result.ok === false) {
				res.status(400).json({ error: 'Unknown puzzle' })
				return
			}
			if (result.newUpvote) {
				await grantPieces(
					solution.creatorUserId,
					ARCADE_UPVOTE_CREDIT_PIECES,
					`Arcade upvote:${puzzleId}:voter=${sessionData.session.user.id}`
				)
			}

			res.json({
				success: true,
				likeCount: result.likeCount,
				newUpvote: result.newUpvote,
			})
		} catch (error) {
			console.error('[arcade] failed to upvote', error)
			res.status(500).json({ error: 'Failed to upvote puzzle' })
		}
	})

	app.post('/arcade/verify-solution', async (req, res) => {
		try {
			const sessionData = getSessionFromRequest(req)
			if (!sessionData) {
				res.status(401).json({ error: 'Sign in with Hack Club to claim solution credit' })
				return
			}

			const body = (req.body || {}) as { puzzleId?: string; exampleId?: string; password?: string }
			const rawPuzzleId = body.puzzleId || body.exampleId || ''
			const puzzleId = String(rawPuzzleId).trim().toLowerCase()
			const password = String(body.password || '').trim().toLowerCase()
			if (!puzzleId || !password) {
				res.status(400).json({ error: 'puzzleId and password are required' })
				return
			}
			const solution = await getArcadeSolutionRecord(puzzleId)
			if (!solution) {
				res.status(400).json({ error: 'Unknown puzzle' })
				return
			}
			if (password !== solution.password) {
				res.status(400).json({ error: 'Incorrect solve password' })
				return
			}
			if (solution.creatorUserId && solution.creatorUserId === sessionData.session.user.id) {
				res.status(400).json({ error: 'Cannot claim solve credit for your own puzzle' })
				return
			}

			const nextBalance = await claimPuzzleReward({
				targetUserId: sessionData.session.user.id,
				puzzleId: solution.rewardPuzzleId,
				amount: ARCADE_SOLUTION_CREDIT_PIECES,
				reason: `Arcade solution verify:${puzzleId}`,
			})
			if (solution.creatorUserId) {
				await claimPuzzleReward({
					targetUserId: solution.creatorUserId,
					puzzleId: `arcade-owner-solve:${puzzleId}:solver=${sessionData.session.user.id}`,
					amount: ARCADE_PUZZLE_OWNER_SOLVE_PIECES,
					reason: `Arcade puzzle solved:${puzzleId}:solver=${sessionData.session.user.id}`,
				})
			}
			if (nextBalance === null) {
				const currentBalance = await getUserPieceBalance(sessionData.session.user.id)
				res.json({
					success: true,
					verified: true,
					newCredit: false,
					amount: 0,
					pieces: currentBalance,
				})
				return
			}

			res.json({
				success: true,
				verified: true,
				newCredit: true,
				amount: ARCADE_SOLUTION_CREDIT_PIECES,
				pieces: nextBalance,
			})
		} catch (error) {
			console.error('[arcade] failed to verify solution', error)
			res.status(500).json({ error: 'Failed to verify solution' })
		}
	})

	app.post('/arcade/solution-status', async (req, res) => {
		try {
			const sessionData = getSessionFromRequest(req)
			const body = (req.body || {}) as { puzzleIds?: unknown; exampleIds?: unknown }
			const rawPuzzleIds = Array.isArray(body.puzzleIds) ? body.puzzleIds : Array.isArray(body.exampleIds) ? body.exampleIds : []
			const puzzleIds = rawPuzzleIds
				.map((id) => String(id || '').trim().toLowerCase())
				.filter(Boolean)
				.slice(0, 100)

			const solvedByPuzzleId: Record<string, boolean> = {}
			for (const puzzleId of puzzleIds) {
				solvedByPuzzleId[puzzleId] = false
			}

			if (!sessionData || puzzleIds.length === 0) {
				res.json({ success: true, solvedByPuzzleId })
				return
			}

			const checks = await Promise.all(
				puzzleIds.map(async (puzzleId) => {
					const solution = await getArcadeSolutionRecord(puzzleId)
					const rewardPuzzleId = solution?.rewardPuzzleId || `arcade-solution:${puzzleId}`
					const solved = await hasPuzzleClaim(sessionData.session.user.id, rewardPuzzleId)
					return { puzzleId, solved }
				})
			)
			for (const item of checks) {
				solvedByPuzzleId[item.puzzleId] = item.solved
			}

			res.json({ success: true, solvedByPuzzleId })
		} catch (error) {
			console.error('[arcade] failed to fetch solution status', error)
			res.status(500).json({ error: 'Failed to fetch solution status' })
		}
	})
}
