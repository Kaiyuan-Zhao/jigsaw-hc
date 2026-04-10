import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { ALLOWED_CORS_ORIGINS } from './config.js'
import { getSessionFromRequest } from './auth/session.js'
import { cleanupRewardTickets } from './games/reward-tickets.js'
import { registerHealthRoutes } from './routes/health.js'
import { registerGameRoutes } from './routes/games.js'
import { registerAuthRoutes } from './routes/auth.js'
import { registerPieceRoutes } from './routes/pieces.js'
import { registerArcadeRoutes } from './routes/arcade.js'
import { registerShopRoutes } from './routes/shop.js'
import { cleanupExpiredSessions } from './auth/session.js'

export function createApp(): express.Express {
	const app = express()
	app.use(express.json())
	app.use(cookieParser())
	app.use(
		cors({
			origin: (origin, callback) => {
				if (!origin) {
					callback(null, true)
					return
				}
				if (ALLOWED_CORS_ORIGINS.has(origin)) {
					callback(null, true)
					return
				}
				callback(new Error('CORS origin not allowed'))
			},
			credentials: true,
		})
	)

	const routeContext = { getSessionFromRequest }

	registerHealthRoutes(app)
	registerGameRoutes(app, routeContext)
	registerAuthRoutes(app, routeContext)
	registerPieceRoutes(app, routeContext)
	registerArcadeRoutes(app, routeContext)
	registerShopRoutes(app, routeContext)

	return app
}

export function startBackgroundCleanup(): void {
	setInterval(() => {
		cleanupExpiredSessions()
		cleanupRewardTickets()
	}, 60_000)
}
