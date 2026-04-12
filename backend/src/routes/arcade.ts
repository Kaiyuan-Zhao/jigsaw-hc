import type express from 'express'
import { getSessionFromRequest } from '../auth/session.js'
import { applyArcadeUpvote, claimPuzzleReward, getUserPieceBalance, hasPuzzleClaim, listArcadePuzzles, registerOrUpdateArcadePuzzle } from '../piece-store.js'

const ARCADE_SOLUTION_CREDIT_PIECES = 2
const DEFAULT_ARCADE_SOLUTION_PASSWORD = 'angel'
const ARCADE_EXAMPLE_SOLUTIONS: Record<string, { password: string; rewardPuzzleId: string }> = {
	'game-of-gods': {
		password: 'angel',
		rewardPuzzleId: 'arcade-solution:game-of-gods',
	},
}

function resolveArcadeSolution(exampleId: string): { expectedPassword: string; rewardPuzzleId: string } {
	const solution = ARCADE_EXAMPLE_SOLUTIONS[exampleId]
	return {
		expectedPassword: String(solution?.password || DEFAULT_ARCADE_SOLUTION_PASSWORD).trim().toLowerCase(),
		rewardPuzzleId: String(solution?.rewardPuzzleId || `arcade-solution:${exampleId}`).slice(0, 200),
	}
}

export function registerArcadeRoutes(app: express.Express): void {
	app.get('/arcade/puzzles', async (req, res) => {
		try {
			const sessionData = getSessionFromRequest(req)
			const voterId = sessionData?.session.user.id
			res.json({ puzzles: await listArcadePuzzles(voterId) })
		} catch (error) {
			console.error('[arcade] failed to list puzzles', error)
			res.status(500).json({ error: 'Failed to list puzzles' })
		}
	})

	app.post('/arcade/puzzles', async (req, res) => {
		try {
			const sessionData = getSessionFromRequest(req)
			if (!sessionData) {
				res.status(401).json({ error: 'Unauthorized' })
				return
			}

			const body = (req.body || {}) as {
				puzzleId?: string
				title?: string
				genre?: string
				thumbnail?: string
				gameUrl?: string
				authorLabel?: string
			}
			const puzzleId = String(body.puzzleId || '').trim()
			const title = String(body.title || '').trim()
			if (!puzzleId || !title) {
				res.status(400).json({ error: 'puzzleId and title are required' })
				return
			}

			const authorFromSession = sessionData.session.user.name || sessionData.session.user.email || 'Creator'
			const authorLabel =
				String(body.authorLabel || '').trim() || (authorFromSession.startsWith('by ') ? authorFromSession : `by ${authorFromSession}`)

			const result = await registerOrUpdateArcadePuzzle(sessionData.session.user.id, {
				puzzleId,
				title,
				genre: body.genre,
				thumbnail: body.thumbnail,
				gameUrl: body.gameUrl,
				authorLabel,
			})
			if (result.ok === false) {
				if (result.error === 'invalid_input') {
					res.status(400).json({ error: 'Invalid puzzleId or title' })
					return
				}
				res.status(409).json({ error: 'This puzzle ID is already registered to another creator' })
				return
			}

			res.json({ success: true, puzzleId })
		} catch (error) {
			console.error('[arcade] failed to save puzzle', error)
			res.status(500).json({ error: 'Failed to save puzzle' })
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

			const result = await applyArcadeUpvote(sessionData.session.user.id, puzzleId)
			if (result.ok === false) {
				if (result.error === 'unknown_puzzle') {
					res.status(404).json({ error: 'Unknown puzzle' })
					return
				}
				res.status(400).json({ error: 'Cannot upvote your own puzzle' })
				return
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

			const body = (req.body || {}) as { exampleId?: string; password?: string }
			const exampleId = String(body.exampleId || '').trim().toLowerCase()
			const password = String(body.password || '').trim().toLowerCase()
			if (!exampleId || !password) {
				res.status(400).json({ error: 'exampleId and password are required' })
				return
			}

			const { expectedPassword, rewardPuzzleId } = resolveArcadeSolution(exampleId)
			if (password !== expectedPassword) {
				res.status(400).json({ error: 'Incorrect solve password' })
				return
			}

			const nextBalance = await claimPuzzleReward({
				targetUserId: sessionData.session.user.id,
				puzzleId: rewardPuzzleId,
				amount: ARCADE_SOLUTION_CREDIT_PIECES,
				reason: `Arcade solution verify:${exampleId}`,
			})
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
			const body = (req.body || {}) as { exampleIds?: unknown }
			const rawExampleIds = Array.isArray(body.exampleIds) ? body.exampleIds : []
			const exampleIds = rawExampleIds
				.map((id) => String(id || '').trim().toLowerCase())
				.filter(Boolean)
				.slice(0, 100)

			const solvedByExampleId: Record<string, boolean> = {}
			for (const exampleId of exampleIds) {
				solvedByExampleId[exampleId] = false
			}

			if (!sessionData || exampleIds.length === 0) {
				res.json({ success: true, solvedByExampleId })
				return
			}

			const checks = await Promise.all(
				exampleIds.map(async (exampleId) => {
					const { rewardPuzzleId } = resolveArcadeSolution(exampleId)
					const solved = await hasPuzzleClaim(sessionData.session.user.id, rewardPuzzleId)
					return { exampleId, solved }
				})
			)
			for (const item of checks) {
				solvedByExampleId[item.exampleId] = item.solved
			}

			res.json({ success: true, solvedByExampleId })
		} catch (error) {
			console.error('[arcade] failed to fetch solution status', error)
			res.status(500).json({ error: 'Failed to fetch solution status' })
		}
	})
}
