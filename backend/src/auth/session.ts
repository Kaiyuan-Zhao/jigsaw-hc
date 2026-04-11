import crypto from 'node:crypto'
import type express from 'express'
import { IS_PROD, SESSION_SECRET, SESSION_TTL_MS } from '../config.js'
import type { SessionRecord, SessionUser } from './types.js'

export const SESSION_COOKIE = 'jigsaw_session'

const sessions = new Map<string, SessionRecord>()

export function signSessionValue(sessionId: string): string {
	const signature = crypto.createHmac('sha256', SESSION_SECRET).update(sessionId).digest('hex')
	return `${sessionId}.${signature}`
}

function verifySessionValue(raw: string): string | null {
	const parts = raw.split('.')
	if (parts.length !== 2) return null
	const [sessionId, signature] = parts
	const expected = crypto.createHmac('sha256', SESSION_SECRET).update(sessionId).digest('hex')
	const sigBuf = Buffer.from(signature)
	const expBuf = Buffer.from(expected)
	if (sigBuf.length !== expBuf.length) return null
	if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null
	return sessionId
}

export function getSessionFromRequest(req: express.Request): { id: string; session: SessionRecord } | null {
	const signedSession = req.cookies?.[SESSION_COOKIE] as string | undefined
	if (!signedSession) return null
	const sessionId = verifySessionValue(signedSession)
	if (!sessionId) return null
	const session = sessions.get(sessionId)
	if (!session) return null
	if (session.expiresAt < Date.now()) {
		sessions.delete(sessionId)
		return null
	}
	return { id: sessionId, session }
}

export function createSession(input: {
	accessToken: string
	refreshToken?: string
	expiresInSeconds: number
	user: SessionUser
}): string {
	const now = Date.now()
	const sessionId = crypto.randomUUID()
	sessions.set(sessionId, {
		createdAt: now,
		expiresAt: now + SESSION_TTL_MS,
		accessToken: input.accessToken,
		refreshToken: input.refreshToken,
		tokenExpiresAt: now + input.expiresInSeconds * 1000,
		user: input.user,
	})
	return sessionId
}

export function updateSession(id: string, next: SessionRecord): void {
	sessions.set(id, next)
}

export function getSession(id: string): SessionRecord | undefined {
	return sessions.get(id)
}

export function deleteSession(id: string): void {
	sessions.delete(id)
}

function sessionCookieBaseOptions() {
	if (IS_PROD) {
		return {
			httpOnly: true as const,
			sameSite: 'none' as const,
			secure: true as const,
			path: '/' as const,
		}
	}
	return {
		httpOnly: true as const,
		sameSite: 'lax' as const,
		secure: false as const,
		path: '/' as const,
	}
}

export function buildSessionCookieOptions() {
	return {
		...sessionCookieBaseOptions(),
		maxAge: SESSION_TTL_MS,
	}
}

export function clearSessionCookieOptions() {
	return sessionCookieBaseOptions()
}

export function cleanupExpiredSessions(): void {
	const now = Date.now()
	for (const [id, session] of sessions.entries()) {
		if (session.expiresAt < now) {
			sessions.delete(id)
		}
	}
}
