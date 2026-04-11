import crypto from 'node:crypto'
import type express from 'express'
import { IS_PROD, SESSION_SECRET, SESSION_TTL_MS } from '../config.js'
import type { SessionRecord, SessionUser } from './types.js'

export const SESSION_COOKIE = 'jigsaw_session'

function createSignature(payload: string): string {
	return crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url')
}

function signSessionValue(session: SessionRecord): string {
	const payload = Buffer.from(JSON.stringify(session)).toString('base64url')
	return `${payload}.${createSignature(payload)}`
}

function parseSessionValue(raw: string): SessionRecord | null {
	const parts = raw.split('.')
	if (parts.length !== 2) return null
	const [payload, signature] = parts
	const expected = createSignature(payload)
	const sigBuf = Buffer.from(signature)
	const expBuf = Buffer.from(expected)
	if (sigBuf.length !== expBuf.length) return null
	if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null
	try {
		const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as SessionRecord
		if (!parsed || typeof parsed !== 'object') return null
		if (typeof parsed.expiresAt !== 'number' || parsed.expiresAt < Date.now()) return null
		return parsed
	} catch {
		return null
	}
}

export function getSessionFromRequest(req: express.Request): { session: SessionRecord } | null {
	const signedSession = req.cookies?.[SESSION_COOKIE] as string | undefined
	if (!signedSession) return null
	const session = parseSessionValue(signedSession)
	if (!session) return null
	return { session }
}

export function createSignedSessionCookieValue(input: {
	accessToken: string
	refreshToken?: string
	expiresInSeconds: number
	user: SessionUser
}): string {
	const now = Date.now()
	const session: SessionRecord = {
		createdAt: now,
		expiresAt: now + SESSION_TTL_MS,
		accessToken: input.accessToken,
		refreshToken: input.refreshToken,
		tokenExpiresAt: now + input.expiresInSeconds * 1000,
		user: input.user,
	}
	return signSessionValue(session)
}

function sessionCookieBaseOptions() {
	if (IS_PROD) {
		return {
			httpOnly: true as const,
			sameSite: 'lax' as const,
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
