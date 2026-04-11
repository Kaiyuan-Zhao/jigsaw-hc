import type express from 'express'
import {
	CLIENT_ID,
	CLIENT_SECRET,
	FRONTEND_URL,
} from '../config.js'
import {
	createAuthorizationUrl,
	exchangeCodeForTokens,
	fetchCurrentUser,
	refreshAccessToken,
} from '../auth/hackclub-oauth.js'
import {
	SESSION_COOKIE,
	buildSessionCookieOptions,
	createSession,
	deleteSession,
	getSession,
	updateSession,
} from '../auth/session.js'
import { signSessionValue } from '../auth/session.js'
import { getUserPieceBalance } from '../piece-store.js'
import type { RouteContext } from './context.js'

export function registerAuthRoutes(app: express.Express, context: RouteContext): void {
	app.get('/auth/login', (req, res) => {
		if (!CLIENT_ID || !CLIENT_SECRET) {
			res.status(500).json({ error: 'OAuth is not configured on the backend' })
			return
		}

		res.redirect(createAuthorizationUrl())
	})

	app.get('/auth/callback', async (req, res) => {
		const code = req.query.code as string | undefined

		if (!code) {
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
			}

			const sessionId = createSession({
				accessToken: tokens.access_token,
				refreshToken: tokens.refresh_token,
				expiresInSeconds: tokens.expires_in,
				user,
			})

			res.cookie(SESSION_COOKIE, signSessionValue(sessionId), buildSessionCookieOptions())
			res.redirect(`${FRONTEND_URL}/?auth=success`)
		} catch (error) {
			console.error('[oauth] callback error', error)
			res.redirect(`${FRONTEND_URL}/?auth=error`)
		}
	})

	app.get('/auth/me', async (req, res) => {
		const sessionData = context.getSessionFromRequest(req)
		if (!sessionData) {
			res.json({ authenticated: false })
			return
		}

		const { id, session } = sessionData
		if (Date.now() > session.tokenExpiresAt && session.refreshToken) {
			try {
				const refreshed = await refreshAccessToken(session.refreshToken)
				updateSession(id, {
					...session,
					accessToken: refreshed.access_token,
					refreshToken: refreshed.refresh_token || session.refreshToken,
					tokenExpiresAt: Date.now() + refreshed.expires_in * 1000,
				})
			} catch (error) {
				console.error('[oauth] refresh failed', error)
				deleteSession(id)
				res.clearCookie(SESSION_COOKIE, { path: '/' })
				res.json({ authenticated: false })
				return
			}
		}

		const updated = getSession(id) || session
		res.json({
			authenticated: true,
			user: {
				...updated.user,
				pieces: getUserPieceBalance(updated.user.id),
			},
		})
	})

	app.post('/auth/logout', (req, res) => {
		const sessionData = context.getSessionFromRequest(req)
		if (sessionData) {
			deleteSession(sessionData.id)
		}
		res.clearCookie(SESSION_COOKIE, { path: '/' })
		res.json({ success: true })
	})
}
