import type express from 'express'
import { getSessionFromRequest } from '../auth/session.js'
import { IS_PROD } from '../config.js'
import { adjustUserPieces, getUserPieceBalance } from '../piece-store.js'

export function registerPieceRoutes(app: express.Express): void {
	app.get('/pieces/me', async (req, res) => {
		try {
			const sessionData = getSessionFromRequest(req)
			if (!sessionData) {
				res.status(401).json({ error: 'Unauthorized' })
				return
			}
			res.json({
				pieces: await getUserPieceBalance(sessionData.session.user.id),
			})
		} catch (error) {
			console.error('[pieces] failed to fetch balance', error)
			res.status(500).json({ error: 'Failed to fetch pieces' })
		}
	})

	app.post('/pieces/test-adjust', async (req, res) => {
		try {
			if (IS_PROD) {
				res.status(403).json({ error: 'Disabled in production' })
				return
			}

			const sessionData = getSessionFromRequest(req)
			if (!sessionData) {
				res.status(401).json({ error: 'Unauthorized' })
				return
			}

			const { amount } = (req.body || {}) as { amount?: number }
			if (!Number.isFinite(amount) || Math.floor(Number(amount)) === 0) {
				res.status(400).json({ error: 'amount must be a non-zero integer' })
				return
			}

			const delta = Math.floor(Number(amount))
			const userId = sessionData.session.user.id
			const nextBalance = await adjustUserPieces(userId, delta)

			res.json({
				success: true,
				amount: delta,
				pieces: nextBalance,
			})
		} catch (error) {
			console.error('[pieces] failed to adjust balance', error)
			res.status(500).json({ error: 'Failed to adjust pieces' })
		}
	})
}
