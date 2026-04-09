import 'dotenv/config'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

type HackClubMeResponse = {
	identity: {
		id: string
		username?: string
		display_name?: string
		first_name?: string
		last_name?: string
		primary_email?: string
		slack_id?: string
		verification_status?: string
	}
	scopes?: string[]
}

type OAuthTokenResponse = {
	access_token: string
	token_type: string
	expires_in: number
	refresh_token?: string
	scope?: string
}

type SessionRecord = {
	createdAt: number
	expiresAt: number
	accessToken: string
	refreshToken?: string
	tokenExpiresAt: number
	user: {
		id: string
		email?: string
		name?: string
		slackId?: string
		verificationStatus?: string
		isAdmin: boolean
	}
}

type CoinGrantRecord = {
	adminUserId: string
	targetUserId: string
	amount: number
	reason?: string
	createdAt: number
}

type RewardTicketRecord = {
	ticket: string
	userId: string
	puzzleId: string
	amount: number
	createdAt: number
	expiresAt: number
	usedAt?: number
}

type ClaimTokenPayload = {
	sub: string
	aud: string
	jti: string
	iat: number
	exp: number
}

const PORT = Number(process.env.PORT || 8787)
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
const HCAUTH_URL = 'https://auth.hackclub.com'
const CLIENT_ID = process.env.HCAUTH_CLIENT_ID || ''
const CLIENT_SECRET = process.env.HCAUTH_CLIENT_SECRET || ''
const REDIRECT_URI = process.env.HCAUTH_REDIRECT_URI || `http://localhost:${PORT}/auth/callback`
const SCOPES = process.env.HCAUTH_SCOPES || 'openid profile email name slack_id verification_status'
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me'
const isProd = process.env.NODE_ENV === 'production'
const ADMIN_HACKCLUB_IDS = new Set(
	(process.env.ADMIN_HACKCLUB_IDS || '')
		.split(',')
		.map((value) => value.trim())
		.filter(Boolean)
)
const ADMIN_EMAILS = new Set(
	(process.env.ADMIN_EMAILS || '')
		.split(',')
		.map((value) => value.trim().toLowerCase())
		.filter(Boolean)
)
const ADMIN_SLACK_IDS = new Set(
	(process.env.ADMIN_SLACK_IDS || '')
		.split(',')
		.map((value) => value.trim())
		.filter(Boolean)
)

const SESSION_COOKIE = 'jigsaw_session'
const OAUTH_STATE_COOKIE = 'jigsaw_oauth_state'
const OAUTH_RETURN_COOKIE = 'jigsaw_oauth_return'
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000
const REWARD_TICKET_TTL_MS = 5 * 60 * 1000
const REWARD_AMOUNT = 10
const GAME_ALLOWED_ORIGINS = (process.env.GAME_ALLOWED_ORIGINS || 'http://localhost:3000')
	.split(',')
	.map((value) => value.trim())
	.filter(Boolean)
const ALLOWED_CORS_ORIGINS = new Set([FRONTEND_URL, ...GAME_ALLOWED_ORIGINS])
const CLAIM_TOKEN_SECRET = process.env.CLAIM_TOKEN_SECRET || SESSION_SECRET
const CLAIM_TOKEN_TTL_SECONDS = Math.max(30, Number(process.env.CLAIM_TOKEN_TTL_SECONDS || 180))

const sessions = new Map<string, SessionRecord>()
const coinBalances = new Map<string, number>()
const coinGrantHistory: CoinGrantRecord[] = []
const rewardTickets = new Map<string, RewardTicketRecord>()
const puzzleClaims = new Set<string>()
const usedClaimTokenJtis = new Set<string>()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const coinLedgerPath = path.resolve(__dirname, '../data/coin-ledger.json')

function isAdminIdentity(identity: { id: string; email?: string; slackId?: string }): boolean {
	if (ADMIN_HACKCLUB_IDS.has(identity.id)) return true
	if (identity.email && ADMIN_EMAILS.has(identity.email.toLowerCase())) return true
	if (identity.slackId && ADMIN_SLACK_IDS.has(identity.slackId)) return true
	return false
}

function loadCoinLedger(): void {
	if (!fs.existsSync(coinLedgerPath)) return

	try {
		const raw = fs.readFileSync(coinLedgerPath, 'utf8')
		const parsed = JSON.parse(raw) as {
			balances?: Record<string, number>
			grants?: CoinGrantRecord[]
			puzzleClaims?: string[]
		}

		for (const [userId, balance] of Object.entries(parsed.balances || {})) {
			if (Number.isFinite(balance) && balance >= 0) {
				coinBalances.set(userId, Math.floor(balance))
			}
		}

		for (const grant of parsed.grants || []) {
			if (
				grant &&
				typeof grant.adminUserId === 'string' &&
				typeof grant.targetUserId === 'string' &&
				Number.isFinite(grant.amount) &&
				grant.amount > 0
			) {
				coinGrantHistory.push({
					adminUserId: grant.adminUserId,
					targetUserId: grant.targetUserId,
					amount: Math.floor(grant.amount),
					reason: grant.reason,
					createdAt: Number.isFinite(grant.createdAt) ? grant.createdAt : Date.now(),
				})
			}
		}

		for (const claim of parsed.puzzleClaims || []) {
			if (typeof claim === 'string' && claim.includes(':')) {
				puzzleClaims.add(claim)
			}
		}
	} catch (error) {
		console.error('[coins] failed to read coin ledger', error)
	}
}

function persistCoinLedger(): void {
	try {
		fs.mkdirSync(path.dirname(coinLedgerPath), { recursive: true })
		const balances = Object.fromEntries(coinBalances.entries())
		const payload = JSON.stringify(
			{
				balances,
				grants: coinGrantHistory,
				puzzleClaims: Array.from(puzzleClaims.values()),
				updatedAt: Date.now(),
			},
			null,
			2
		)
		fs.writeFileSync(coinLedgerPath, payload, 'utf8')
	} catch (error) {
		console.error('[coins] failed to persist coin ledger', error)
	}
}

function getUserCoinBalance(userId: string): number {
	return coinBalances.get(userId) || 0
}

function adjustUserCoins(targetUserId: string, delta: number): number {
	const safeDelta = Math.floor(delta)
	const current = getUserCoinBalance(targetUserId)
	const nextBalance = Math.max(0, current + safeDelta)
	coinBalances.set(targetUserId, nextBalance)
	persistCoinLedger()
	return nextBalance
}

function grantCoins(adminUserId: string, targetUserId: string, amount: number, reason?: string): number {
	const safeAmount = Math.floor(amount)
	const nextBalance = adjustUserCoins(targetUserId, safeAmount)
	coinGrantHistory.unshift({
		adminUserId,
		targetUserId,
		amount: safeAmount,
		reason,
		createdAt: Date.now(),
	})
	if (coinGrantHistory.length > 500) {
		coinGrantHistory.length = 500
	}
	return nextBalance
}

function makePuzzleClaimKey(userId: string, puzzleId: string): string {
	return `${userId}:${puzzleId}`
}

function hasPuzzleClaim(userId: string, puzzleId: string): boolean {
	return puzzleClaims.has(makePuzzleClaimKey(userId, puzzleId))
}

function markPuzzleClaimed(userId: string, puzzleId: string): void {
	puzzleClaims.add(makePuzzleClaimKey(userId, puzzleId))
	persistCoinLedger()
}

function base64UrlEncode(input: string): string {
	return Buffer.from(input).toString('base64url')
}

function base64UrlDecode(input: string): string {
	return Buffer.from(input, 'base64url').toString('utf8')
}

function signClaimToken(payload: ClaimTokenPayload): string {
	const encodedPayload = base64UrlEncode(JSON.stringify(payload))
	const signature = crypto.createHmac('sha256', CLAIM_TOKEN_SECRET).update(encodedPayload).digest('base64url')
	return `${encodedPayload}.${signature}`
}

function verifyClaimToken(token: string): ClaimTokenPayload | null {
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

function getRequestOrigin(req: express.Request): string {
	const proto = req.get('x-forwarded-proto') || req.protocol || 'http'
	return `${proto}://${req.get('host')}`
}

loadCoinLedger()

function signSessionValue(sessionId: string): string {
	const signature = crypto
		.createHmac('sha256', SESSION_SECRET)
		.update(sessionId)
		.digest('hex')
	return `${sessionId}.${signature}`
}

function verifySessionValue(raw: string): string | null {
	const parts = raw.split('.')
	if (parts.length !== 2) return null
	const [sessionId, signature] = parts
	const expected = crypto
		.createHmac('sha256', SESSION_SECRET)
		.update(sessionId)
		.digest('hex')
	const sigBuf = Buffer.from(signature)
	const expBuf = Buffer.from(expected)
	if (sigBuf.length !== expBuf.length) return null
	if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null
	return sessionId
}

function createAuthorizationUrl(state: string): string {
	const params = new URLSearchParams({
		client_id: CLIENT_ID,
		redirect_uri: REDIRECT_URI,
		response_type: 'code',
		scope: SCOPES,
		state,
	})
	return `${HCAUTH_URL}/oauth/authorize?${params.toString()}`
}

async function exchangeCodeForTokens(code: string): Promise<OAuthTokenResponse> {
	const response = await fetch(`${HCAUTH_URL}/oauth/token`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			client_id: CLIENT_ID,
			client_secret: CLIENT_SECRET,
			redirect_uri: REDIRECT_URI,
			code,
			grant_type: 'authorization_code',
		}),
	})

	if (!response.ok) {
		throw new Error(`Token exchange failed: ${response.status}`)
	}

	return (await response.json()) as OAuthTokenResponse
}

async function refreshAccessToken(refreshToken: string): Promise<OAuthTokenResponse> {
	const response = await fetch(`${HCAUTH_URL}/oauth/token`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			client_id: CLIENT_ID,
			client_secret: CLIENT_SECRET,
			refresh_token: refreshToken,
			grant_type: 'refresh_token',
		}),
	})

	if (!response.ok) {
		throw new Error(`Token refresh failed: ${response.status}`)
	}

	return (await response.json()) as OAuthTokenResponse
}

async function fetchCurrentUser(accessToken: string): Promise<HackClubMeResponse> {
	const response = await fetch(`${HCAUTH_URL}/api/v1/me`, {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	})

	if (!response.ok) {
		throw new Error(`Failed to fetch user: ${response.status}`)
	}

	return (await response.json()) as HackClubMeResponse
}

function getSessionFromRequest(req: express.Request): { id: string; session: SessionRecord } | null {
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

const app = express()
app.use(express.json())
app.use(cookieParser())
app.use(
	cors({
		origin: (origin, callback) => {
			if (!origin) {
				callback(null, true)
				return
			}
			if (ALLOWED_CORS_ORIGINS.has(origin)) {
				callback(null, true)
				return
			}
			callback(new Error('CORS origin not allowed'))
		},
		credentials: true,
	})
)

app.get('/health', (_req, res) => {
	res.json({ ok: true })
})

app.get('/games/sdk.js', (_req, res) => {
	const sdk = `(function () {
	const scriptEl = document.currentScript
	const apiOrigin = scriptEl && scriptEl.src ? new URL(scriptEl.src).origin : window.location.origin
	const API_BASE_URL = apiOrigin
	const DEFAULT_REDIRECT_URL = '${FRONTEND_URL}/arcade'
	const DEFAULT_SELECTOR = '[data-jigsaw-win]'
	const POPUP_TIMEOUT_MS = 90_000
	const statusColors = { ok: '#4b5563', error: '#b91c1c' }

	function asMessage(error) {
		if (error && typeof error.message === 'string' && error.message) return error.message
		return 'Unable to claim reward'
	}

	function setStatus(target, text, isError) {
		if (!target) return
		target.textContent = text
		target.style.color = isError ? statusColors.error : statusColors.ok
	}

	async function requestJson(url, options) {
		const response = await fetch(url, options)
		const payload = await response.json().catch(function () { return {} })
		if (!response.ok) throw new Error(payload && payload.error ? payload.error : 'Request failed')
		return payload
	}

	function waitForClaimToken(origin) {
		return new Promise(function (resolve, reject) {
			const popupUrl = API_BASE_URL + '/games/claim-popup?origin=' + encodeURIComponent(origin)
			const popup = window.open(popupUrl, 'jigsaw-claim-auth', 'width=520,height=720')
			if (!popup) {
				reject(new Error('Popup blocked. Please allow popups and try again.'))
				return
			}

			const timeoutId = window.setTimeout(function () {
				cleanup()
				try { popup.close() } catch (_) {}
				reject(new Error('Auth popup timed out'))
			}, POPUP_TIMEOUT_MS)

			function onMessage(event) {
				if (event.origin !== API_BASE_URL) return
				const data = event.data || {}
				if (data.type === 'jigsaw-claim-token') {
					cleanup()
					resolve(data.token)
					return
				}
				if (data.type === 'jigsaw-claim-error') {
					cleanup()
					reject(new Error(data.error || 'Could not authenticate claim'))
				}
			}

			function cleanup() {
				window.clearTimeout(timeoutId)
				window.removeEventListener('message', onMessage)
			}

			window.addEventListener('message', onMessage)
		})
	}

	async function claim(options) {
		var config = options || {}
		var puzzleId = (config.puzzleId || '').toString().trim()
		if (!puzzleId) throw new Error('puzzleId is required')
		var redirectUrl = (config.redirectUrl || DEFAULT_REDIRECT_URL).toString()
		var statusEl = config.statusEl || null
		var triggerEl = config.triggerEl || null
		if (triggerEl) triggerEl.disabled = true
		setStatus(statusEl, 'Authenticating...', false)

		try {
			var claimToken = await waitForClaimToken(window.location.origin)
			setStatus(statusEl, 'Crediting solve...', false)
			await requestJson(API_BASE_URL + '/games/redeem-token', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ token: claimToken, puzzleId: puzzleId })
			})
			setStatus(statusEl, 'Reward claimed. Redirecting...', false)
			window.location.href = redirectUrl
			return { ok: true }
		} catch (error) {
			setStatus(statusEl, asMessage(error), true)
			if (triggerEl) triggerEl.disabled = false
			throw error
		}
	}

	function bindButton(button) {
		if (!(button instanceof HTMLButtonElement)) return
		if (button.dataset.jigsawBound === 'true') return
		button.dataset.jigsawBound = 'true'
		button.addEventListener('click', function () {
			var puzzleId = button.getAttribute('data-puzzle-id') || ''
			var redirectUrl = button.getAttribute('data-redirect-url') || DEFAULT_REDIRECT_URL
			var statusSelector = button.getAttribute('data-status-target')
			var statusEl = statusSelector ? document.querySelector(statusSelector) : null
			claim({ puzzleId: puzzleId, redirectUrl: redirectUrl, statusEl: statusEl, triggerEl: button }).catch(function () {})
		})
	}

	function autoBind(selector) {
		document.querySelectorAll(selector || DEFAULT_SELECTOR).forEach(bindButton)
	}

	window.JigsawGames = { claim: claim, autoBind: autoBind }
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', function () { autoBind(DEFAULT_SELECTOR) })
	} else {
		autoBind(DEFAULT_SELECTOR)
	}
})()
`
	res.setHeader('content-type', 'application/javascript; charset=utf-8')
	res.send(sdk)
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

app.get('/auth/login', (req, res) => {
	if (!CLIENT_ID || !CLIENT_SECRET) {
		res.status(500).json({ error: 'OAuth is not configured on the backend' })
		return
	}

	const state = crypto.randomUUID()
	const returnTo = String(req.query.returnTo || '').trim()
	let safeReturnTo = ''
	if (returnTo) {
		try {
			const parsed = new URL(returnTo)
			if (parsed.origin === FRONTEND_URL || parsed.origin === getRequestOrigin(req)) {
				safeReturnTo = returnTo
			}
		} catch {
			safeReturnTo = ''
		}
	}

	res.cookie(OAUTH_STATE_COOKIE, state, {
		httpOnly: true,
		sameSite: 'lax',
		secure: isProd,
		path: '/',
		maxAge: OAUTH_STATE_TTL_MS,
	})
	if (safeReturnTo) {
		res.cookie(OAUTH_RETURN_COOKIE, safeReturnTo, {
			httpOnly: true,
			sameSite: 'lax',
			secure: isProd,
			path: '/',
			maxAge: OAUTH_STATE_TTL_MS,
		})
	} else {
		res.clearCookie(OAUTH_RETURN_COOKIE, { path: '/' })
	}

	res.redirect(createAuthorizationUrl(state))
})

app.get('/auth/callback', async (req, res) => {
	const code = req.query.code as string | undefined
	const state = req.query.state as string | undefined
	const storedState = req.cookies?.[OAUTH_STATE_COOKIE] as string | undefined
	const returnTo = (req.cookies?.[OAUTH_RETURN_COOKIE] as string | undefined) || ''

	if (!code || !state || !storedState || state !== storedState) {
		res.redirect(`${FRONTEND_URL}/?auth=error`)
		return
	}

	try {
		const tokens = await exchangeCodeForTokens(code)
		const me = await fetchCurrentUser(tokens.access_token)
		const identity = me.identity
		const fullName = [identity.first_name, identity.last_name].filter(Boolean).join(' ')
		const user = {
			id: identity.id,
			email: identity.primary_email,
			name: identity.display_name || identity.username || fullName || identity.primary_email,
			slackId: identity.slack_id,
			verificationStatus: identity.verification_status,
			isAdmin: isAdminIdentity({
				id: identity.id,
				email: identity.primary_email,
				slackId: identity.slack_id,
			}),
		}

		const sessionId = crypto.randomUUID()
		sessions.set(sessionId, {
			createdAt: Date.now(),
			expiresAt: Date.now() + SESSION_TTL_MS,
			accessToken: tokens.access_token,
			refreshToken: tokens.refresh_token,
			tokenExpiresAt: Date.now() + tokens.expires_in * 1000,
			user,
		})

		res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' })
		res.clearCookie(OAUTH_RETURN_COOKIE, { path: '/' })
		res.cookie(SESSION_COOKIE, signSessionValue(sessionId), {
			httpOnly: true,
			sameSite: 'lax',
			secure: isProd,
			path: '/',
			maxAge: SESSION_TTL_MS,
		})

		if (returnTo) {
			res.redirect(returnTo)
			return
		}
		res.redirect(`${FRONTEND_URL}/?auth=success`)
	} catch (error) {
		console.error('[oauth] callback error', error)
		res.redirect(`${FRONTEND_URL}/?auth=error`)
	}
})

app.get('/auth/me', async (req, res) => {
	const sessionData = getSessionFromRequest(req)
	if (!sessionData) {
		res.json({ authenticated: false })
		return
	}

	const { id, session } = sessionData
	if (Date.now() > session.tokenExpiresAt && session.refreshToken) {
		try {
			const refreshed = await refreshAccessToken(session.refreshToken)
			sessions.set(id, {
				...session,
				accessToken: refreshed.access_token,
				refreshToken: refreshed.refresh_token || session.refreshToken,
				tokenExpiresAt: Date.now() + refreshed.expires_in * 1000,
			})
		} catch (error) {
			console.error('[oauth] refresh failed', error)
			sessions.delete(id)
			res.clearCookie(SESSION_COOKIE, { path: '/' })
			res.json({ authenticated: false })
			return
		}
	}

	const updated = sessions.get(id) || session
	res.json({
		authenticated: true,
		user: {
			...updated.user,
			coins: getUserCoinBalance(updated.user.id),
		},
	})
})

app.post('/auth/logout', (req, res) => {
	const sessionData = getSessionFromRequest(req)
	if (sessionData) {
		sessions.delete(sessionData.id)
	}
	res.clearCookie(SESSION_COOKIE, { path: '/' })
	res.json({ success: true })
})

app.get('/coins/me', (req, res) => {
	const sessionData = getSessionFromRequest(req)
	if (!sessionData) {
		res.status(401).json({ error: 'Unauthorized' })
		return
	}

	res.json({
		coins: getUserCoinBalance(sessionData.session.user.id),
	})
})

app.post('/admin/coins/grant', (req, res) => {
	const sessionData = getSessionFromRequest(req)
	if (!sessionData) {
		res.status(401).json({ error: 'Unauthorized' })
		return
	}

	const actor = sessionData.session.user
	if (!actor.isAdmin) {
		res.status(403).json({ error: 'Forbidden' })
		return
	}

	const { userId, amount, reason } = (req.body || {}) as {
		userId?: string
		amount?: number
		reason?: string
	}

	if (!userId || typeof userId !== 'string') {
		res.status(400).json({ error: 'userId is required' })
		return
	}

	if (!Number.isFinite(amount) || Math.floor(Number(amount)) <= 0) {
		res.status(400).json({ error: 'amount must be a positive integer' })
		return
	}

	const normalizedUserId = userId.trim()
	if (!normalizedUserId) {
		res.status(400).json({ error: 'userId is required' })
		return
	}

	const normalizedAmount = Math.floor(Number(amount))
	const nextBalance = grantCoins(actor.id, normalizedUserId, normalizedAmount, reason?.trim() || undefined)

	res.json({
		success: true,
		userId: normalizedUserId,
		amount: normalizedAmount,
		coins: nextBalance,
	})
})

app.post('/coins/test-adjust', (req, res) => {
	if (isProd) {
		res.status(403).json({ error: 'Disabled in production' })
		return
	}

	const sessionData = getSessionFromRequest(req)
	if (!sessionData) {
		res.status(401).json({ error: 'Unauthorized' })
		return
	}

	const { amount } = (req.body || {}) as { amount?: number }
	if (!Number.isFinite(amount) || Math.floor(Number(amount)) === 0) {
		res.status(400).json({ error: 'amount must be a non-zero integer' })
		return
	}

	const delta = Math.floor(Number(amount))
	const userId = sessionData.session.user.id
	const nextBalance = adjustUserCoins(userId, delta)

	res.json({
		success: true,
		amount: delta,
		coins: nextBalance,
	})
})

app.post('/games/reward-ticket', (req, res) => {
	const sessionData = getSessionFromRequest(req)
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

	const ticket = crypto.randomUUID()
	const now = Date.now()
	const record: RewardTicketRecord = {
		ticket,
		userId,
		puzzleId: normalizedPuzzleId,
		amount: REWARD_AMOUNT,
		createdAt: now,
		expiresAt: now + REWARD_TICKET_TTL_MS,
	}
	rewardTickets.set(ticket, record)

	res.json({
		ticket,
		puzzleId: normalizedPuzzleId,
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

	const record = rewardTickets.get(normalizedTicket)
	if (!record) {
		res.status(404).json({ error: 'Invalid ticket' })
		return
	}

	if (record.usedAt) {
		res.status(409).json({ error: 'Ticket already used' })
		return
	}

	if (record.expiresAt < Date.now()) {
		rewardTickets.delete(normalizedTicket)
		res.status(410).json({ error: 'Ticket expired' })
		return
	}

	if (hasPuzzleClaim(record.userId, record.puzzleId)) {
		record.usedAt = Date.now()
		res.status(409).json({ error: 'Puzzle reward already claimed' })
		return
	}

	const nextBalance = grantCoins('game-of-gods', record.userId, record.amount, `Puzzle reward:${record.puzzleId}`)
	record.usedAt = Date.now()
	markPuzzleClaimed(record.userId, record.puzzleId)

	res.json({
		success: true,
		userId: record.userId,
		puzzleId: record.puzzleId,
		amount: record.amount,
		coins: nextBalance,
	})
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
	if (usedClaimTokenJtis.has(payload.jti)) {
		res.status(409).json({ error: 'Token already used' })
		return
	}
	if (hasPuzzleClaim(payload.sub, normalizedPuzzleId)) {
		usedClaimTokenJtis.add(payload.jti)
		res.status(409).json({ error: 'Puzzle reward already claimed' })
		return
	}

	usedClaimTokenJtis.add(payload.jti)
	const nextBalance = grantCoins('game-sdk', payload.sub, REWARD_AMOUNT, `Puzzle reward:${normalizedPuzzleId}`)
	markPuzzleClaimed(payload.sub, normalizedPuzzleId)
	res.json({
		success: true,
		userId: payload.sub,
		puzzleId: normalizedPuzzleId,
		amount: REWARD_AMOUNT,
		coins: nextBalance,
	})
})

setInterval(() => {
	const now = Date.now()
	for (const [id, session] of sessions.entries()) {
		if (session.expiresAt < now) {
			sessions.delete(id)
		}
	}
	for (const [ticket, record] of rewardTickets.entries()) {
		if (record.expiresAt < now || record.usedAt) {
			rewardTickets.delete(ticket)
		}
	}
}, 60_000)

app.listen(PORT, () => {
	console.log(`Jigsaw backend listening on http://localhost:${PORT}`)
})
