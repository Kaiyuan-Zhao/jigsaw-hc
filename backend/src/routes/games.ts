import crypto from 'node:crypto'
import type express from 'express'
import { CLAIM_TOKEN_TTL_SECONDS, FRONTEND_URL, GAME_ALLOWED_ORIGINS, REWARD_AMOUNT } from '../config.js'
import { signClaimToken, verifyClaimToken, hasUsedClaimToken, markClaimTokenUsed } from '../auth/claim-token.js'
import type { ClaimTokenPayload } from '../auth/types.js'
import { getRequestOrigin } from '../http/request-origin.js'
import { buildGamesSdk } from '../games/sdk-script.js'
import { claimPuzzleReward, hasPuzzleClaim } from '../piece-store.js'
import { createRewardTicket, deleteRewardTicket, getRewardTicket, markRewardTicketUsed } from '../games/reward-tickets.js'
import type { RouteContext } from './context.js'

export function registerGameRoutes(app: express.Express, context: RouteContext): void {
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

		const sessionData = context.getSessionFromRequest(req)
		if (!sessionData) {
			const returnTo = `${getRequestOrigin(req)}/games/claim-popup?origin=${encodeURIComponent(origin)}`
			res.redirect(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`)
			return
		}

		const nowSeconds = Math.floor(Date.now() / 1000)
		const payload: ClaimTokenPayload = {
			sub: sessionData.session.user.id,
			aud: origin,
			jti: crypto.randomUUID(),
			iat: nowSeconds,
			exp: nowSeconds + CLAIM_TOKEN_TTL_SECONDS,
		}
		const token = signClaimToken(payload)
		res.setHeader('content-type', 'text/html; charset=utf-8')
		res.send(`<!doctype html><html><body><script>
	(function(){
		try {
			if (window.opener) {
				window.opener.postMessage({ type: 'jigsaw-claim-token', token: ${JSON.stringify(token)} }, ${JSON.stringify(origin)})
			}
		} catch (_e) {}
		window.close()
	})()
	</script></body></html>`)
	})

	app.post('/games/reward-ticket', (req, res) => {
		const sessionData = context.getSessionFromRequest(req)
		if (!sessionData) {
			res.status(401).json({ error: 'Unauthorized' })
			return
		}

		const { puzzleId } = (req.body || {}) as { puzzleId?: string }
		const normalizedPuzzleId = String(puzzleId || '').trim()
		if (!normalizedPuzzleId) {
			res.status(400).json({ error: 'puzzleId is required' })
			return
		}

		const userId = sessionData.session.user.id
		if (hasPuzzleClaim(userId, normalizedPuzzleId)) {
			res.status(409).json({ error: 'Puzzle reward already claimed' })
			return
		}

		const record = createRewardTicket(userId, normalizedPuzzleId)
		res.json({
			ticket: record.ticket,
			puzzleId: record.puzzleId,
			amount: record.amount,
			expiresAt: record.expiresAt,
		})
	})

	app.post('/games/redeem-ticket', (req, res) => {
		const { ticket } = (req.body || {}) as { ticket?: string }
		const normalizedTicket = String(ticket || '').trim()
		if (!normalizedTicket) {
			res.status(400).json({ error: 'ticket is required' })
			return
		}

		const record = getRewardTicket(normalizedTicket)
		if (!record) {
			res.status(404).json({ error: 'Invalid ticket' })
			return
		}

		if (record.usedAt) {
			res.status(409).json({ error: 'Ticket already used' })
			return
		}

		if (record.expiresAt < Date.now()) {
			deleteRewardTicket(normalizedTicket)
			res.status(410).json({ error: 'Ticket expired' })
			return
		}

		if (hasPuzzleClaim(record.userId, record.puzzleId)) {
			markRewardTicketUsed(normalizedTicket)
			res.status(409).json({ error: 'Puzzle reward already claimed' })
			return
		}

		const nextBalance = claimPuzzleReward({
			targetUserId: record.userId,
			puzzleId: record.puzzleId,
			amount: record.amount,
			reason: `Puzzle reward:${record.puzzleId}`,
		})
		markRewardTicketUsed(normalizedTicket)
		if (nextBalance === null) {
			res.status(409).json({ error: 'Puzzle reward already claimed' })
			return
		}

		res.json({
			success: true,
			userId: record.userId,
			puzzleId: record.puzzleId,
			amount: record.amount,
			pieces: nextBalance,
		})
	})

	app.post('/games/claim-token', (req, res) => {
		const sessionData = context.getSessionFromRequest(req)
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

		const nowSeconds = Math.floor(Date.now() / 1000)
		const payload: ClaimTokenPayload = {
			sub: sessionData.session.user.id,
			aud: normalizedOrigin,
			jti: crypto.randomUUID(),
			iat: nowSeconds,
			exp: nowSeconds + CLAIM_TOKEN_TTL_SECONDS,
		}
		res.json({
			token: signClaimToken(payload),
			expiresAt: payload.exp,
		})
	})

	app.post('/games/redeem-token', (req, res) => {
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
		if (!GAME_ALLOWED_ORIGINS.includes(requestOrigin)) {
			res.status(403).json({ error: 'Origin not allowed' })
			return
		}
		if (hasUsedClaimToken(payload.jti)) {
			res.status(409).json({ error: 'Token already used' })
			return
		}
		if (hasPuzzleClaim(payload.sub, normalizedPuzzleId)) {
			markClaimTokenUsed(payload.jti)
			res.status(409).json({ error: 'Puzzle reward already claimed' })
			return
		}

		markClaimTokenUsed(payload.jti)
		const nextBalance = claimPuzzleReward({
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
	})
}
