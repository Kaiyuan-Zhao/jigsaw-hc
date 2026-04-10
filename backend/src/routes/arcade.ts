import type express from 'express'
import { applyArcadeUpvote, listArcadePuzzles, registerOrUpdateArcadePuzzle } from '../piece-store.js'
import type { RouteContext } from './context.js'

export function registerArcadeRoutes(app: express.Express, context: RouteContext): void {
	app.get('/arcade/puzzles', (req, res) => {
		const sessionData = context.getSessionFromRequest(req)
		const voterId = sessionData?.session.user.id
		res.json({ puzzles: listArcadePuzzles(voterId) })
	})

	app.post('/arcade/puzzles', (req, res) => {
		const sessionData = context.getSessionFromRequest(req)
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

		const result = registerOrUpdateArcadePuzzle(sessionData.session.user.id, {
			puzzleId,
			title,
			genre: body.genre,
			thumbnail: body.thumbnail,
			gameUrl: body.gameUrl,
			authorLabel,
		})
		if (!result.ok) {
			if (result.error === 'invalid_input') {
				res.status(400).json({ error: 'Invalid puzzleId or title' })
				return
			}
			res.status(409).json({ error: 'This puzzle ID is already registered to another creator' })
			return
		}

		res.json({ success: true, puzzleId })
	})

	app.post('/arcade/upvote', (req, res) => {
		const sessionData = context.getSessionFromRequest(req)
		if (!sessionData) {
			res.status(401).json({ error: 'Sign in with Hack Club to upvote' })
			return
		}

		const puzzleId = String((req.body || {}).puzzleId || '').trim()
		if (!puzzleId) {
			res.status(400).json({ error: 'puzzleId is required' })
			return
		}

		const result = applyArcadeUpvote(sessionData.session.user.id, puzzleId)
		if (!result.ok) {
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
	})
}
