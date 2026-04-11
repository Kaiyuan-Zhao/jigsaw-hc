import type express from 'express'
import { purchaseShopItem } from '../piece-store.js'
import type { RouteContext } from './context.js'

export function registerShopRoutes(app: express.Express, context: RouteContext): void {
	app.post('/shop/purchase', async (req, res) => {
		try {
			const sessionData = context.getSessionFromRequest(req)
			if (!sessionData) {
				res.status(401).json({ error: 'Unauthorized' })
				return
			}

			const { itemId } = (req.body || {}) as { itemId?: string }
			if (!itemId || typeof itemId !== 'string' || !itemId.trim()) {
				res.status(400).json({ error: 'itemId is required' })
				return
			}

			const result = await purchaseShopItem(sessionData.session.user.id, itemId)
			if (!result.success) {
				if (result.error === 'unknown_item') {
					res.status(400).json({ error: 'unknown_item', message: 'Unknown shop item' })
					return
				}
				res.status(400).json({
					error: 'insufficient_pieces',
					pieces: result.pieces,
					message: 'Not enough pieces for this item',
				})
				return
			}

			res.json({
				success: true,
				purchaseId: result.purchaseId,
				balance: result.balance,
				itemId: result.itemId,
				pricePieces: result.pricePieces,
				title: result.title,
			})
		} catch (error) {
			console.error('[shop] purchase failed', error)
			res.status(500).json({ error: 'Purchase failed' })
		}
	})
}
