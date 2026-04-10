import type express from 'express'

export function registerHealthRoutes(app: express.Express): void {
	app.get('/health', (_req, res) => {
		res.json({ ok: true })
	})
}
