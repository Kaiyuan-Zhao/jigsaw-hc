import express from 'express'
import cookieParser from 'cookie-parser'
import { registerHealthRoutes } from './routes/health.js'
import { registerAuthRoutes } from './routes/auth.js'
import { registerPieceRoutes } from './routes/pieces.js'
import { registerArcadeRoutes } from './routes/arcade.js'
import { registerShopRoutes } from './routes/shop.js'

export function createApp(): express.Express {
	const app = express()
	app.use(express.json())
	app.use(cookieParser())

	registerHealthRoutes(app)
	registerAuthRoutes(app)
	registerPieceRoutes(app)
	registerArcadeRoutes(app)
	registerShopRoutes(app)

	return app
}
