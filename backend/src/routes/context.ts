import type express from 'express'
import type { SessionRecord } from '../auth/types.js'

export type SessionData = { id: string; session: SessionRecord }

export type RouteContext = {
	getSessionFromRequest: (req: express.Request) => SessionData | null
}
