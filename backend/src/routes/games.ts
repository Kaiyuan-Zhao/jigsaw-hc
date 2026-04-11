import crypto from 'node:crypto'
import type express from 'express'
import { CLAIM_TOKEN_TTL_SECONDS, FRONTEND_URL, GAME_ALLOWED_ORIGINS, REWARD_AMOUNT } from '../config.js'
import { signClaimToken, verifyClaimToken, hasUsedClaimToken, markClaimTokenUsed } from '../auth/claim-token.js'
import type { ClaimTokenPayload } from '../auth/types.js'
import { getSessionFromRequest } from '../auth/session.js'
import { getRequestOrigin } from '../http/request-origin.js'
import { buildGamesSdk } from '../games/sdk-script.js'
import { claimPuzzleReward, hasPuzzleClaim } from '../piece-store.js'

function createClaimToken(userId: string, origin: string): { token: string; expiresAt: number } {
	const nowSeconds = Math.floor(Date.now() / 1000)
	const payload: ClaimTokenPayload = {
		sub: userId,
		aud: origin,
		jti: crypto.randomUUID(),
		iat: nowSeconds,
		exp: nowSeconds + CLAIM_TOKEN_TTL_SECONDS,
	}
	return {
		token: signClaimToken(payload),
		expiresAt: payload.exp,
	}
}

export function registerGameRoutes(app: express.Express): void {
	app.get('/games/sdk.js', (_req, res) => {
		res.setHeader('content-type', 'application/javascript; charset=utf-8')
		res.send(buildGamesSdk(FRONTEND_URL))
	})

	app.get('/games/claim-popup', (req, res) => {
		const origin = String(req.query.origin || '').trim()
		if (!origin || !GAME_ALLOWED_ORIGINS.includes(origin)) {
			res.status(403).send('Origin not allowed')
			return
		}

		const sessionData = getSessionFromRequest(req)
		if (!sessionData) {
			const returnTo = `${getRequestOrigin(req)}/games/claim-popup?origin=${encodeURIComponent(origin)}`
			res.redirect(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`)
			return
		}

		const tokenResult = createClaimToken(sessionData.session.user.id, origin)
		res.setHeader('content-type', 'text/html; charset=utf-8')
		res.send(`<!doctype html><html><body><script>
	(function(){
		try {
			if (window.opener) {
				window.opener.postMessage({ type: 'jigsaw-claim-token', token: ${JSON.stringify(tokenResult.token)} }, ${JSON.stringify(origin)})
			}
		} catch (_e) {}
		window.close()
	})()
	</script></body></html>`)
	})

	app.post('/games/claim-token', (req, res) => {
		const sessionData = getSessionFromRequest(req)
		if (!sessionData) {
			res.status(401).json({ error: 'Unauthorized' })
			return
		}

		const { origin } = (req.body || {}) as { origin?: string }
		const normalizedOrigin = String(origin || '').trim()
		if (!normalizedOrigin) {
			res.status(400).json({ error: 'origin is required' })
			return
		}
		if (!GAME_ALLOWED_ORIGINS.includes(normalizedOrigin)) {
			res.status(403).json({ error: 'Origin not allowed' })
			return
		}

		const tokenResult = createClaimToken(sessionData.session.user.id, normalizedOrigin)
		res.json({
			token: tokenResult.token,
			expiresAt: tokenResult.expiresAt,
		})
	})

	app.post('/games/redeem-token', async (req, res) => {
		try {
			const { token, puzzleId } = (req.body || {}) as { token?: string; puzzleId?: string }
			const normalizedToken = String(token || '').trim()
			const normalizedPuzzleId = String(puzzleId || '').trim()
			if (!normalizedToken) {
				res.status(400).json({ error: 'token is required' })
				return
			}
			if (!normalizedPuzzleId) {
				res.status(400).json({ error: 'puzzleId is required' })
				return
			}

			const payload = verifyClaimToken(normalizedToken)
			if (!payload) {
				res.status(401).json({ error: 'Invalid or expired token' })
				return
			}

			const requestOrigin = String(req.get('origin') || '').trim()
			if (!requestOrigin || requestOrigin !== payload.aud) {
				res.status(403).json({ error: 'Origin mismatch' })
				return
			}
			if (hasUsedClaimToken(payload.jti)) {
				res.status(409).json({ error: 'Token already used' })
				return
			}
			if (await hasPuzzleClaim(payload.sub, normalizedPuzzleId)) {
				markClaimTokenUsed(payload.jti)
				res.status(409).json({ error: 'Puzzle reward already claimed' })
				return
			}

			markClaimTokenUsed(payload.jti)
			const nextBalance = await claimPuzzleReward({
				targetUserId: payload.sub,
				puzzleId: normalizedPuzzleId,
				amount: REWARD_AMOUNT,
				reason: `Puzzle reward:${normalizedPuzzleId}`,
			})
			if (nextBalance === null) {
				res.status(409).json({ error: 'Puzzle reward already claimed' })
				return
			}
			res.json({
				success: true,
				userId: payload.sub,
				puzzleId: normalizedPuzzleId,
				amount: REWARD_AMOUNT,
				pieces: nextBalance,
			})
		} catch (error) {
			console.error('[games] failed to redeem claim token', error)
			res.status(500).json({ error: 'Failed to redeem token' })
		}
	})
}
