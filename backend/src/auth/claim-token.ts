import crypto from 'node:crypto'
import { CLAIM_TOKEN_SECRET } from '../config.js'
import type { ClaimTokenPayload } from './types.js'

const usedClaimTokenJtis = new Set<string>()

function base64UrlEncode(input: string): string {
	return Buffer.from(input).toString('base64url')
}

function base64UrlDecode(input: string): string {
	return Buffer.from(input, 'base64url').toString('utf8')
}

export function signClaimToken(payload: ClaimTokenPayload): string {
	const encodedPayload = base64UrlEncode(JSON.stringify(payload))
	const signature = crypto.createHmac('sha256', CLAIM_TOKEN_SECRET).update(encodedPayload).digest('base64url')
	return `${encodedPayload}.${signature}`
}

export function verifyClaimToken(token: string): ClaimTokenPayload | null {
	const parts = token.split('.')
	if (parts.length !== 2) return null
	const [encodedPayload, signature] = parts
	const expected = crypto.createHmac('sha256', CLAIM_TOKEN_SECRET).update(encodedPayload).digest('base64url')
	const sigBuf = Buffer.from(signature)
	const expBuf = Buffer.from(expected)
	if (sigBuf.length !== expBuf.length) return null
	if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null

	try {
		const payload = JSON.parse(base64UrlDecode(encodedPayload)) as ClaimTokenPayload
		if (!payload || typeof payload.sub !== 'string' || typeof payload.aud !== 'string' || typeof payload.jti !== 'string') {
			return null
		}
		if (!Number.isFinite(payload.iat) || !Number.isFinite(payload.exp)) return null
		if (payload.exp <= Math.floor(Date.now() / 1000)) return null
		return payload
	} catch {
		return null
	}
}

export function hasUsedClaimToken(jti: string): boolean {
	return usedClaimTokenJtis.has(jti)
}

export function markClaimTokenUsed(jti: string): void {
	usedClaimTokenJtis.add(jti)
}
