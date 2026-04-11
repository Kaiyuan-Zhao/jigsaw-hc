import express from 'express'
import cookieParser from 'cookie-parser'
import { getSessionFromRequest } from './auth/session.js'
import { cleanupRewardTickets } from './games/reward-tickets.js'
import { registerHealthRoutes } from './routes/health.js'
import { registerGameRoutes } from './routes/games.js'
import { registerAuthRoutes } from './routes/auth.js'
import { registerPieceRoutes } from './routes/pieces.js'
import { registerArcadeRoutes } from './routes/arcade.js'
import { registerShopRoutes } from './routes/shop.js'

export function createApp(): express.Express {
	const app = express()
	app.use(express.json())
	app.use(cookieParser())

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
		cleanupRewardTickets()
	}, 60_000)
}
