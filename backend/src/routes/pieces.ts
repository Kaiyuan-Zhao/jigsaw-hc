import type express from 'express'
import { IS_PROD } from '../config.js'
import { adjustUserPieces, getUserPieceBalance } from '../piece-store.js'
import type { RouteContext } from './context.js'

export function registerPieceRoutes(app: express.Express, context: RouteContext): void {
	app.get('/pieces/me', (req, res) => {
		const sessionData = context.getSessionFromRequest(req)
		if (!sessionData) {
			res.status(401).json({ error: 'Unauthorized' })
			return
		}

		res.json({
			pieces: getUserPieceBalance(sessionData.session.user.id),
		})
	})

	app.post('/pieces/test-adjust', (req, res) => {
		if (IS_PROD) {
			res.status(403).json({ error: 'Disabled in production' })
			return
		}

		const sessionData = context.getSessionFromRequest(req)
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
		const nextBalance = adjustUserPieces(userId, delta)

		res.json({
			success: true,
			amount: delta,
			pieces: nextBalance,
		})
	})
}
