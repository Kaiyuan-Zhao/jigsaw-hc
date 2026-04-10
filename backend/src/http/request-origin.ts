import type express from 'express'

export function getRequestOrigin(req: express.Request): string {
	const proto = req.get('x-forwarded-proto') || req.protocol || 'http'
	return `${proto}://${req.get('host')}`
}
